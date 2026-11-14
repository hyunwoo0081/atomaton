import { Request, Response } from 'express'
import prisma, { Prisma } from '@atomaton/db'
import { enqueue } from '../executors/queue'
import { WorkflowContext } from '../executors/types'
import { v4 as uuidv4 } from 'uuid'
import {
  checkWebhookAccess,
  WebhookSecurityConfig,
  WebhookAccessResult,
} from '../utils/webhookSecurity'

interface WebhookConfig extends WebhookSecurityConfig {
  apiKey?: string
}

const logBlockedWebhook = async (
  workflowId: string,
  triggerId: string,
  access: WebhookAccessResult,
  body: unknown
) => {
  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelays[attempt - 1])
        )
      }
      await prisma.log.create({
        data: {
          workflowId,
          triggerId,
          status: 'FAILURE',
          message: `Webhook blocked: ${access.reason || 'Source IP/Origin not allowed'}`,
          context: {
            clientIp: access.sourceInfo.ip,
            origin: access.sourceInfo.origin || null,
            referer: access.sourceInfo.referer || null,
            body: body as unknown as Prisma.InputJsonValue,
          } as unknown as Prisma.InputJsonValue,
          source: 'WEBHOOK',
          remarks: 'Blocked by Webhook Source Filter',
          executionId: uuidv4(),
        },
      })
      break
    } catch (error) {
      if (attempt < maxRetries - 1) continue
      console.error('Failed to log blocked webhook event:', error)
    }
  }
}

export const processWebhook = async (req: Request, res: Response) => {
  const { accountId, triggerId } = req.params
  const { body } = req
  const authHeader = req.headers['authorization']

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res
      .status(401)
      .json({ message: 'Authorization: Bearer {API_KEY} header is required' })
  }

  const apiKey = authHeader.split(' ')[1]

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let trigger = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        trigger = await prisma.trigger.findUnique({
          where: { id: triggerId },
          include: { workflow: true },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!trigger || trigger.workflow.userId !== accountId) {
      return res
        .status(404)
        .json({ message: 'Trigger not found or does not belong to account' })
    }

    const config = trigger.config as unknown as WebhookConfig

    // Check request source (IP / Origin Whitelist)
    const access = checkWebhookAccess(req, config)
    if (!access.allowed) {
      console.warn(
        `Webhook request blocked for trigger ${triggerId}: ${access.reason}`
      )
      await logBlockedWebhook(trigger.workflowId, trigger.id, access, body)
      return res.status(403).json({
        message: 'Forbidden: Request source not allowed',
        clientIp: access.sourceInfo.ip,
      })
    }

    const storedApiKey = config?.apiKey

    if (!storedApiKey || storedApiKey !== apiKey) {
      return res.status(403).json({ message: 'Invalid API Key' })
    }

    console.log(
      `Webhook received for account ${accountId}, trigger ${triggerId}:`,
      body
    )

    const executionId = uuidv4()
    const workflowContext: WorkflowContext = {
      triggerId: trigger.id,
      workflowId: trigger.workflowId,
      startNodeId: trigger.nodeId || undefined,
      executionId: executionId,
      data: body as Record<string, unknown>,
      results: {},
    }

    enqueue(workflowContext)

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        await prisma.log.create({
          data: {
            workflowId: trigger.workflowId,
            triggerId: trigger.id,
            status: 'ENQUEUED',
            message: `Webhook received for trigger ${triggerId}`,
            context: body as unknown as Prisma.InputJsonValue,
            source: 'WEBHOOK',
            executionId: executionId,
          },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(200).json({ message: 'Webhook received and processed' })
  } catch (error: unknown) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const processWebhookByToken = async (req: Request, res: Response) => {
  const { webhookToken } = req.params
  const { body } = req

  if (!webhookToken) {
    return res.status(400).json({ message: 'Webhook token is required' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let trigger = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        trigger = await prisma.trigger.findUnique({
          where: { webhookToken },
          include: { workflow: true },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!trigger || !trigger.workflow || !trigger.workflow.is_active) {
      return res
        .status(404)
        .json({ message: 'Webhook endpoint not found or workflow is inactive' })
    }

    const config = trigger.config as unknown as WebhookConfig

    // Check request source (IP / Origin Whitelist)
    const access = checkWebhookAccess(req, config)
    if (!access.allowed) {
      console.warn(
        `Webhook request blocked for token ${webhookToken}: ${access.reason}`
      )
      await logBlockedWebhook(trigger.workflowId, trigger.id, access, body)
      return res.status(403).json({
        message: 'Forbidden: Request source not allowed',
        clientIp: access.sourceInfo.ip,
      })
    }

    const executionId = uuidv4()
    const workflowContext: WorkflowContext = {
      triggerId: trigger.id,
      workflowId: trigger.workflowId,
      startNodeId: trigger.nodeId || undefined,
      executionId: executionId,
      data: body as Record<string, unknown>,
      results: {},
    }

    enqueue(workflowContext)

    // Fast 202 response to external caller
    res.status(202).json({
      message: 'Webhook received and enqueued',
      executionId,
    })

    // Async background logging with 5-attempt retry logic
    ;(async () => {
      for (let attempt = 0; attempt < maxRetries; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise((resolve) =>
              setTimeout(resolve, retryDelays[attempt - 1])
            )
          }
          await prisma.log.create({
            data: {
              workflowId: trigger.workflowId,
              triggerId: trigger.id,
              status: 'ENQUEUED',
              message: `Webhook received via token`,
              context: body as unknown as Prisma.InputJsonValue,
              source: 'WEBHOOK',
              executionId: executionId,
            },
          })
          break
        } catch (error) {
          if (attempt < maxRetries - 1) continue
          console.error('Failed to log webhook event:', error)
        }
      }
    })().catch((err) => {
      console.error('Unhandled error in webhook logging:', err)
    })
  } catch (error: unknown) {
    console.error('Error processing webhook by token:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
