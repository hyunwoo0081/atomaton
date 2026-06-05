import Imap from 'node-imap'
import prisma, { Prisma } from '@atomaton/db'
import { decrypt } from '@atomaton/db/crypto'
import { enqueue } from '../executors/queue'
import { WorkflowData } from '../executors/types'
import { v4 as uuidv4 } from 'uuid'

interface ImapCredentials {
  username: string
  password?: string
  host?: string
  port?: number
  tls?: boolean
}

interface TriggerConfig {
  accountId: string
  mailbox?: string
  interval?: number
}

interface ParsedMailHeaders {
  from?: string[]
  subject?: string[]
  date?: string[]
  'message-id'?: string[]
}

const MIN_POLLING_INTERVAL_MIN = 1
const pollingIntervals: Map<string, NodeJS.Timeout> = new Map()

const getImapConnectionDetails = async (
  accountId: string
): Promise<Imap.Config> => {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
  })

  if (!account || account.type !== 'NAVER_IMAP') {
    throw new Error('IMAP account not found or invalid type.')
  }

  const credentials = account.credentials as unknown as ImapCredentials
  if (!credentials.password) {
    throw new Error('IMAP password not found in credentials.')
  }

  const decryptedPassword = decrypt(credentials.password)

  return {
    user: credentials.username,
    password: decryptedPassword,
    host: credentials.host || 'imap.naver.com',
    port: credentials.port || 993,
    tls: credentials.tls !== undefined ? credentials.tls : true,
  }
}

export const startImapPolling = async (
  accountId: string,
  intervalMin: number,
  retryAttempt = 0
) => {
  const maxRetries = 5
  const baseRetryDelayMs = 1000

  if (pollingIntervals.has(accountId) && retryAttempt === 0) return

  const pollingInterval = Math.max(intervalMin, MIN_POLLING_INTERVAL_MIN)

  const poll = async () => {
    try {
      const details = await getImapConnectionDetails(accountId)
      const imap = new Imap(details)

      imap.once('ready', () => {
        imap.openBox('INBOX', false, (err) => {
          if (err) throw err

          imap.search(['UNSEEN'], async (searchErr, uids) => {
            if (searchErr) throw searchErr
            if (!uids || uids.length === 0) {
              imap.end()
              return
            }

            const fetch = imap.fetch(uids, {
              bodies: ['HEADER.FIELDS (FROM SUBJECT DATE MESSAGE-ID)'],
              struct: true,
            })

            fetch.on('message', (msg) => {
              let uid: number
              let headers: ParsedMailHeaders | undefined
              let buffer = ''

              msg.on('body', (stream) => {
                stream.on('data', (chunk: Buffer) => {
                  buffer += chunk.toString('utf8')
                })
                stream.once('end', () => {
                  headers = Imap.parseHeader(
                    buffer
                  ) as unknown as ParsedMailHeaders
                })
              })

              msg.once('attributes', (attrs) => {
                uid = attrs.uid
              })

              msg.once('end', async () => {
                if (!uid || !headers) return

                const messageId = headers['message-id']
                  ? headers['message-id'][0]
                  : null

                const triggers = await prisma.trigger.findMany({
                  where: {
                    type: 'IMAP_POLLING',
                    workflow: { is_active: true },
                  },
                  select: { id: true, workflowId: true, config: true },
                })

                const trigger = triggers.find(
                  (t) =>
                    (t.config as unknown as TriggerConfig).accountId ===
                    accountId
                )
                if (!trigger) {
                  imap.addFlags(uid, ['Seen'], () => {})
                  return
                }

                if (messageId) {
                  const existingLog = await prisma.log.findFirst({
                    where: { message: messageId, source: 'NAVER_IMAP' },
                  })
                  if (existingLog) {
                    imap.addFlags(uid, ['Seen'], () => {})
                    return
                  }
                }

                const emailData: WorkflowData = {
                  messageId: messageId,
                  uid: uid,
                  receivedAt: headers.date
                    ? new Date(headers.date[0]).toISOString()
                    : new Date().toISOString(),
                  source: 'NAVER_IMAP',
                  accountId: accountId,
                  subject: headers.subject ? headers.subject[0] : 'No Subject',
                  from: headers.from ? headers.from[0] : 'Unknown',
                }

                const executionId = uuidv4()
                enqueue({
                  triggerId: trigger.id,
                  workflowId: trigger.workflowId,
                  executionId: executionId,
                  data: emailData,
                  results: {},
                })

                await prisma.log.create({
                  data: {
                    workflowId: trigger.workflowId,
                    triggerId: trigger.id,
                    status: 'ENQUEUED',
                    message: messageId || `Email UID: ${uid}`,
                    context: emailData as unknown as Prisma.InputJsonValue,
                    source: 'NAVER_IMAP',
                    executionId: executionId,
                  },
                })
                imap.addFlags(uid, ['Seen'], () => {})
              })
            })

            fetch.once('error', () => imap.end())
            fetch.once('end', () => imap.end())
          })
        })
      })

      imap.once('error', () => {
        imap.end()
        if (retryAttempt < maxRetries) {
          const delay = baseRetryDelayMs * Math.pow(2, retryAttempt)
          setTimeout(
            () => startImapPolling(accountId, intervalMin, retryAttempt + 1),
            delay
          )
        } else stopImapPolling(accountId)
      })

      imap.connect()
    } catch {
      if (retryAttempt < maxRetries) {
        const delay = baseRetryDelayMs * Math.pow(2, retryAttempt)
        setTimeout(
          () => startImapPolling(accountId, intervalMin, retryAttempt + 1),
          delay
        )
      } else stopImapPolling(accountId)
    }
  }

  if (retryAttempt === 0) {
    poll()
    const intervalId = setInterval(poll, pollingInterval * 60 * 1000)
    pollingIntervals.set(accountId, intervalId)
  } else poll()
}

export const stopImapPolling = (accountId: string) => {
  const interval = pollingIntervals.get(accountId)
  if (interval) {
    clearInterval(interval)
    pollingIntervals.delete(accountId)
  }
}

export const restartImapPolling = async (
  accountId: string,
  intervalMin: number
) => {
  stopImapPolling(accountId)
  await startImapPolling(accountId, intervalMin)
}
