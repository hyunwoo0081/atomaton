import { Request, Response } from 'express'
import prisma, { Prisma } from '@atomaton/db'
import { enqueue } from '../executors/queue'
import { WorkflowContext } from '../executors/types'
import { v4 as uuidv4 } from 'uuid'

interface WebhookConfig {
  apiKey?: string
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
