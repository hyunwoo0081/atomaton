import Imap from 'node-imap';
import prisma from '@atomaton/db';
import { decrypt } from '@atomaton/db/crypto';
import { enqueue } from '../executors/queue';
import { WorkflowContext } from '../executors/types';
import { v4 as uuidv4 } from 'uuid';

// Define interfaces for type safety
interface ImapCredentials {
  username: string;
  password?: string;
  host?: string;
  port?: number;
  tls?: boolean;
}

interface TriggerConfig {
  accountId: string;
  mailbox?: string;
  interval?: number;
  // Add other trigger config properties as needed
}

// Polling interval in minutes (default 30 min, min 1 min)
const DEFAULT_POLLING_INTERVAL_MIN = 30;
const MIN_POLLING_INTERVAL_MIN = 1;

// Store IMAP connections and polling intervals
const imapClients: Map<string, Imap> = new Map();
const pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

// Helper to get connection details (username and decrypted password)
const getImapConnectionDetails = async (accountId: string): Promise<Imap.Config> => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  });

  if (!account || account.type !== 'NAVER_IMAP') {
    throw new Error('IMAP account not found or invalid type.');
  }

  const credentials = account.credentials as unknown as ImapCredentials;
  if (!credentials.password) {
    throw new Error('IMAP password not found in credentials.');
  }
  
  const decryptedPassword = decrypt(credentials.password);

  return {
    user: credentials.username,
    password: decryptedPassword,
    host: credentials.host || 'imap.naver.com',
    port: credentials.port || 993,
    tls: credentials.tls !== undefined ? credentials.tls : true,
  };
};

// Function to start IMAP polling for a given account
export const startImapPolling = async (accountId: string, intervalMin: number, retryAttempt = 0) => {
  const maxRetries = 5;
  const baseRetryDelayMs = 1000;

  if (pollingIntervals.has(accountId) && retryAttempt === 0) {
    console.log(`Polling already active for account ${accountId}`);
    return;
  }

  const pollingInterval = Math.max(intervalMin, MIN_POLLING_INTERVAL_MIN);
  if (retryAttempt === 0) {
    console.log(`Starting IMAP polling for account ${accountId} every ${pollingInterval} minutes.`);
  }

  const poll = async () => {
    try {
      const details = await getImapConnectionDetails(accountId);

      const imap = new Imap(details);

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err, box) => {
          if (err) throw err;

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

                const trigger = triggers.find(t => (t.config as unknown as TriggerConfig).accountId === accountId);

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

                enqueue(workflowContext);

                await prisma.log.create({
                  data: {
                    workflowId: trigger.workflowId,
                    triggerId: trigger.id,
                    status: 'ENQUEUED',
                    message: messageId || `Email UID: ${uid}`,
                    context: emailData,
                    source: 'NAVER_IMAP',
                    executionId: executionId,
                  },
                });
                
                imap.addFlags(uid, ['Seen'], (err) => {
                  if (err) console.error(`Error marking email ${uid} as seen:`, err);
                });
              });
            });

            fetch.once('error', (err) => {
              console.error(`Fetch error for account ${accountId}:`, err);
              imap.end();
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
        imap.end();
        if (retryAttempt < maxRetries) {
          const delay = baseRetryDelayMs * Math.pow(2, retryAttempt);
          console.log(`Retrying IMAP polling for account ${accountId} in ${delay / 1000} seconds...`);
          setTimeout(() => startImapPolling(accountId, intervalMin, retryAttempt + 1), delay);
        } else {
          console.error(`Max retries reached for account ${accountId}. Stopping polling.`);
          stopImapPolling(accountId);
        }
      });

      imap.once('end', () => {
        console.log(`IMAP connection ended for account ${accountId}`);
        if (pollingIntervals.has(accountId) && retryAttempt === 0) {
          clearInterval(pollingIntervals.get(accountId)!);
          pollingIntervals.delete(accountId);
        }
      });

      imap.connect();
    } catch (error) {
      console.error(`Error in IMAP polling for account ${accountId}:`, error);
      if (retryAttempt < maxRetries) {
        const delay = baseRetryDelayMs * Math.pow(2, retryAttempt);
        console.log(`Retrying IMAP polling for account ${accountId} in ${delay / 1000} seconds...`);
        setTimeout(() => startImapPolling(accountId, intervalMin, retryAttempt + 1), delay);
      } else {
        console.error(`Max retries reached for account ${accountId}. Stopping polling.`);
        stopImapPolling(accountId);
      }
    }
  };

  if (retryAttempt === 0) {
    poll();
    const intervalId = setInterval(poll, pollingInterval * 60 * 1000);
    pollingIntervals.set(accountId, intervalId);
  } else {
    poll();
  }
};

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

export const restartImapPolling = async (accountId: string, intervalMin: number) => {
  stopImapPolling(accountId);
  await startImapPolling(accountId, intervalMin);
};
