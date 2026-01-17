import Imap from 'node-imap';
import { inspect } from 'util';
import prisma from '@atomaton/db';
import { decrypt } from '@atomaton/db/crypto';
import { enqueue } from '../executors/queue'; // Import enqueue
import { WorkflowContext } from '../executors/types'; // Import WorkflowContext
import { v4 as uuidv4 } from 'uuid'; // For generating unique execution IDs

// Polling interval in minutes (default 30 min, min 1 min)
const DEFAULT_POLLING_INTERVAL_MIN = 30;
const MIN_POLLING_INTERVAL_MIN = 1;

// Store IMAP connections and polling intervals
const imapClients: Map<string, Imap> = new Map();
const pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

// Helper to get connection details (username and decrypted password)
const getImapConnectionDetails = async (accountId: string) => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account || account.type !== 'NAVER_IMAP') {
    throw new Error('IMAP account not found or invalid type.');
  }

  const credentials = account.credentials as any;
  const decryptedPassword = decrypt(credentials.password); // Use the crypto service

  return {
    user: credentials.username,
    password: decryptedPassword,
    host: credentials.host,
    port: credentials.port,
    tls: credentials.tls,
  };
};

// Function to start IMAP polling for a given account
export const startImapPolling = async (accountId: string, intervalMin: number, retryAttempt = 0) => {
  const maxRetries = 5; // As per planning doc (1s -> 5s -> 30s -> 2m -> 10m)
  const baseRetryDelayMs = 1000; // 1 second

  if (pollingIntervals.has(accountId) && retryAttempt === 0) {
    console.log(`Polling already active for account ${accountId}`);
    return;
  }

  const pollingInterval = Math.max(intervalMin, MIN_POLLING_INTERVAL_MIN);
  if (retryAttempt === 0) { // Only log this for the initial attempt
    console.log(`Starting IMAP polling for account ${accountId} every ${pollingInterval} minutes.`);
  }

  const poll = async () => {
    try {
      const details = await getImapConnectionDetails(accountId);

      const imap = new Imap(details);

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) throw err;

          // Search for new emails since the last processed one
          // For simplicity, we'll fetch all unseen emails here.
          // A more robust solution would track UIDs.
          imap.search(['UNSEEN'], async (err, uids) => {
            if (err) throw err;

            if (!uids || uids.length === 0) {
              console.log(`No new unseen emails for account ${accountId}`);
              imap.end();
              return;
            }

            console.log(`Found ${uids.length} new unseen emails for account ${accountId}`);

            const fetch = imap.fetch(uids, {
              bodies: ['HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)'],
              struct: true,
            });

            fetch.on('message', (msg, seqno) => {
              let uid: number;
              let headers: any;
              let buffer = '';

              msg.on('body', async (stream, info) => {
                stream.on('data', (chunk) => {
                  buffer += chunk.toString('utf8');
                });
                stream.once('end', () => {
                  headers = Imap.parseHeader(buffer);
                });
              });

              msg.once('attributes', (attrs) => {
                uid = attrs.uid;
              });

              msg.once('end', async () => {
                if (!uid || !headers) return;

                const messageId = headers['message-id'] ? headers['message-id'][0] : null;

                // Find the associated workflow and trigger
                // Simplified query to avoid complex JSON path issues
                const triggers = await prisma.trigger.findMany({
                  where: {
                    type: 'IMAP_POLLING'
                  },
                  select: {
                    id: true,
                    workflowId: true,
                    config: true
                  }
                });

                // Filter in memory
                const trigger = triggers.find(t => (t.config as any).accountId === accountId);

                if (!trigger) {
                  console.error(`No IMAP_POLLING trigger found for account ${accountId}. Skipping email processing.`);
                  imap.addFlags(uid, ['Seen'], (err) => {
                      if (err) console.error(`Error marking email ${uid} as seen:`, err);
                    });
                  return;
                }

                if (messageId) {
                  const existingLog = await prisma.log.findFirst({
                    where: { message: messageId, source: 'NAVER_IMAP' },
                  });

                  if (existingLog) {
                    console.log(`Email with Message-ID ${messageId} already processed. Skipping.`);
                    imap.addFlags(uid, ['Seen'], (err) => {
                      if (err) console.error(`Error marking email ${uid} as seen:`, err);
                    });
                    return;
                  }
                }

                const emailData = {
                  messageId: messageId,
                  uid: uid,
                  receivedAt: headers.date ? new Date(headers.date[0]).toISOString() : new Date().toISOString(),
                  source: 'NAVER_IMAP',
                  accountId: accountId,
                  subject: headers.subject ? headers.subject[0] : 'No Subject',
                  from: headers.from ? headers.from[0] : 'Unknown',
                };
                console.log('Processed email:', emailData);

                const executionId = uuidv4();
                const workflowContext: WorkflowContext = {
                  triggerId: trigger.id,
                  workflowId: trigger.workflowId,
                  executionId: executionId,
                  data: emailData,
                  results: {},
                };

                enqueue(workflowContext); // Enqueue for execution

                // Store a log entry for the processed email
                await prisma.log.create({
                  data: {
                    workflowId: trigger.workflowId,
                    triggerId: trigger.id,
                    status: 'ENQUEUED', // Initial status when added to queue
                    message: messageId || `Email UID: ${uid}`,
                    context: emailData,
                    source: 'NAVER_IMAP',
                    executionId: executionId,
                  },
                });
                // Mark email as seen (optional, depending on requirements)
                imap.addFlags(uid, ['Seen'], (err) => {
                  if (err) console.error(`Error marking email ${uid} as seen:`, err);
                });
              });
            });

            fetch.once('error', (err) => {
              console.error(`Fetch error for account ${accountId}:`, err);
              imap.end();
              // Do not retry here, as this is a fetch error not connection
            });
            fetch.once('end', () => {
              console.log(`Done fetching all messages for account ${accountId}`);
              imap.end();
            });
          });
        });
      });

      imap.once('error', (err) => {
        console.error(`IMAP connection error for account ${accountId}:`, err);
        imap.end(); // Ensure connection is closed on error
        if (retryAttempt < maxRetries) {
          const delay = baseRetryDelayMs * Math.pow(2, retryAttempt); // Exponential backoff: 1s, 2s, 4s, 8s, 16s
          console.log(`Retrying IMAP polling for account ${accountId} in ${delay / 1000} seconds...`);
          setTimeout(() => startImapPolling(accountId, intervalMin, retryAttempt + 1), delay);
        } else {
          console.error(`Max retries reached for account ${accountId}. Stopping polling.`);
          stopImapPolling(accountId);
        }
      });

      imap.once('end', () => {
        console.log(`IMAP connection ended for account ${accountId}`);
        // If the polling interval was running, clear it.
        // If this was a retry attempt that succeeded, then the interval should be re-established.
        if (pollingIntervals.has(accountId) && retryAttempt === 0) {
          clearInterval(pollingIntervals.get(accountId)!);
          pollingIntervals.delete(accountId);
        }
      });

      imap.connect();
    } catch (error) {
      console.error(`Error in IMAP polling for account ${accountId}:`, error);
      if (retryAttempt < maxRetries) {
        const delay = baseRetryDelayMs * Math.pow(2, retryAttempt); // Exponential backoff
        console.log(`Retrying IMAP polling for account ${accountId} in ${delay / 1000} seconds...`);
        setTimeout(() => startImapPolling(accountId, intervalMin, retryAttempt + 1), delay);
      } else {
        console.error(`Max retries reached for account ${accountId}. Stopping polling.`);
        stopImapPolling(accountId);
      }
    }
  };

  // Run immediately and then set interval
  if (retryAttempt === 0) { // Only set interval for the initial call
    poll();
    const intervalId = setInterval(poll, pollingInterval * 60 * 1000); // Convert minutes to milliseconds
    pollingIntervals.set(accountId, intervalId);
  } else {
    // For retries, just run poll once; the interval will be restarted on successful connection
    // or if max retries are reached, it will be stopped.
    poll();
  }
};

// Function to stop IMAP polling for a given account
export const stopImapPolling = (accountId: string) => {
  if (pollingIntervals.has(accountId)) {
    clearInterval(pollingIntervals.get(accountId)!);
    pollingIntervals.delete(accountId);
    console.log(`Stopped IMAP polling for account ${accountId}`);

    if (imapClients.has(accountId)) {
      imapClients.get(accountId)?.end();
      imapClients.delete(accountId);
    }
  } else {
    console.log(`No active polling found for account ${accountId}`);
  }
};

// Function to restart IMAP polling (e.g., if configuration changes)
export const restartImapPolling = async (accountId: string, intervalMin: number) => {
  stopImapPolling(accountId);
  await startImapPolling(accountId, intervalMin);
};

