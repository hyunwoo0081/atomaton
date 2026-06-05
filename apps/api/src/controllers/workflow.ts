import { Request, Response } from 'express'
import prisma, { Prisma } from '@atomaton/db'
import { executeWorkflow } from '../executors/executor'
import { v4 as uuidv4 } from 'uuid'
import { GlobalSettings, WorkflowNode, WorkflowEdge } from '../executors/types'

export const createWorkflow = async (req: Request, res: Response) => {
  const { name } = req.body as { name: string }
  const userId = req.userId

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }
  if (!name) {
    return res.status(400).json({ message: 'Workflow name is required' })
  }

  try {
    const workflow = await prisma.workflow.create({
      data: {
        name,
        userId,
        ui_config: { nodes: [], edges: [] } as unknown as Prisma.InputJsonValue,
        settings: {
          enableFailureAlert: false,
          failureWebhookUrl: '',
        } as unknown as Prisma.InputJsonValue,
      },
    })
    res.status(201).json(workflow)
  } catch (error: unknown) {
    console.error('Error creating workflow:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getWorkflows = async (req: Request, res: Response) => {
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        trigger: { include: { rules: true } },
        actions: true,
      },
    })
    res.status(200).json(workflows)
  } catch (error: unknown) {
    console.error('Error fetching workflows:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getWorkflowById = async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
      include: {
        trigger: { include: { rules: true } },
        actions: true,
      },
    })
    if (!workflow)
      return res.status(440).json({ message: 'Workflow not found' })
    res.status(200).json(workflow)
  } catch (error: unknown) {
    console.error('Error fetching workflow:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

interface UpdateWorkflowBody {
  name?: string
  is_active?: boolean
  nodes?: WorkflowNode[]
  edges?: WorkflowEdge[]
  globalSettings?: GlobalSettings
}

export const updateWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const { name, is_active, nodes, edges, globalSettings } =
    req.body as UpdateWorkflowBody
  const userId = req.userId

  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  if (nodes) {
    const accountIds = new Set<string>()
    for (const node of nodes) {
      const config = node.data?.config as Record<string, unknown> | undefined
      if (
        config &&
        typeof config.accountId === 'string' &&
        config.accountId.trim() !== ''
      ) {
        accountIds.add(config.accountId)
      }
    }

    if (accountIds.size > 0) {
      const maxRetries = 5
      const retryDelays = [1000, 5000, 30000, 120000, 600000]
      let dbAccounts: { id: string; userId: string }[] = []

      try {
        for (let attempt = 0; attempt < maxRetries; attempt++) {
          try {
            if (attempt > 0) {
              await new Promise((resolve) =>
                setTimeout(resolve, retryDelays[attempt - 1])
              )
            }
            dbAccounts = await prisma.account.findMany({
              where: {
                id: { in: Array.from(accountIds) },
              },
              select: {
                id: true,
                userId: true,
              },
            })
            break
          } catch (error) {
            if (attempt < maxRetries - 1) continue
            throw error
          }
        }
      } catch (error) {
        console.error(
          'Error fetching integration accounts during validation:',
          error
        )
        return res.status(500).json({ message: 'Internal server error' })
      }

      if (dbAccounts.length !== accountIds.size) {
        return res
          .status(403)
          .json({ message: 'Forbidden: Invalid integration account' })
      }
      for (const acc of dbAccounts) {
        if (acc.userId !== userId) {
          return res.status(403).json({
            message: 'Forbidden: You do not own this integration account',
          })
        }
      }
    }
  }

  try {
    const updateData: Prisma.WorkflowUpdateInput = {}
    if (name) updateData.name = name
    if (is_active !== undefined) updateData.is_active = is_active
    if (nodes && edges)
      updateData.ui_config = {
        nodes,
        edges,
      } as unknown as Prisma.InputJsonValue
    if (globalSettings)
      updateData.settings = globalSettings as unknown as Prisma.InputJsonValue

    if (nodes && edges) {
      await prisma.$transaction(
        async (tx) => {
          const existingTrigger = await tx.trigger.findUnique({
            where: { workflowId: id },
          })

          const triggerNode = nodes.find((n) => n.type.startsWith('trigger'))
          if (triggerNode) {
            const config = triggerNode.data?.config as unknown as
              | {
                  accountId?: string
                }
              | undefined
            if (triggerNode.type === 'trigger-webhook' || config?.accountId) {
              const triggerData = {
                type:
                  triggerNode.type === 'trigger-webhook'
                    ? 'WEBHOOK'
                    : 'IMAP_POLLING',
                config: triggerNode.data
                  .config as unknown as Prisma.InputJsonValue,
              }

              if (existingTrigger) {
                await tx.trigger.update({
                  where: { id: existingTrigger.id },
                  data: triggerData,
                })
              } else {
                await tx.trigger.create({
                  data: {
                    ...triggerData,
                    workflowId: id,
                  },
                })
              }
            } else {
              if (existingTrigger) {
                await tx.trigger.delete({
                  where: { id: existingTrigger.id },
                })
              }
            }
          } else {
            if (existingTrigger) {
              await tx.trigger.delete({
                where: { id: existingTrigger.id },
              })
            }
          }

          // 1. Fetch existing actions in transaction
          const existingActions = await tx.action.findMany({
            where: { workflowId: id },
          })

          const actionNodes = nodes.filter(
            (n) => n.type.startsWith('action') || n.type === 'condition'
          )

          // Maps for comparison based on nodeId (stored inside config)
          const existingActionMap = new Map<
            string,
            (typeof existingActions)[0]
          >()
          for (const action of existingActions) {
            const actionConfig = action.config as Record<string, unknown> | null
            if (actionConfig && typeof actionConfig.nodeId === 'string') {
              existingActionMap.set(actionConfig.nodeId, action)
            }
          }

          const incomingNodeIds = new Set(actionNodes.map((n) => n.id))

          // Find actions to delete (exist in DB but not in incoming nodes)
          const deletedActionIds: string[] = []
          for (const action of existingActions) {
            const actionConfig = action.config as Record<string, unknown> | null
            const nodeId = actionConfig?.nodeId
            if (typeof nodeId !== 'string' || !incomingNodeIds.has(nodeId)) {
              deletedActionIds.push(action.id)
            }
          }

          if (deletedActionIds.length > 0) {
            await tx.action.deleteMany({
              where: { id: { in: deletedActionIds } },
            })
          }

          // Separate creation and updates
          const actionsToCreate: Prisma.ActionCreateManyInput[] = []

          for (let i = 0; i < actionNodes.length; i++) {
            const node = actionNodes[i]
            let type = 'DISCORD_WEBHOOK'
            if (node.type === 'action-notion') type = 'NOTION_PAGE'
            if (node.type === 'condition') type = 'CONDITION'
            if (node.type === 'action-http') type = 'HTTP_REQUEST'
            if (node.type === 'action-regex-replace') type = 'REGEX_REPLACE'
            if (node.type === 'action-google-bridge') type = 'GOOGLE_BRIDGE'
            if (node.type === 'action-url-decode') type = 'URL_DECODE'

            const newConfig = {
              ...node.data.config,
              nodeId: node.id,
            }

            const existingAction = existingActionMap.get(node.id)

            if (!existingAction) {
              // If action doesn't exist, collect for createMany
              actionsToCreate.push({
                workflowId: id,
                type,
                config: newConfig as unknown as Prisma.InputJsonValue,
                order: i,
              })
            } else {
              // Update only if type, order, or config has changed
              const isTypeChanged = existingAction.type !== type
              const isOrderChanged = existingAction.order !== i
              const isConfigChanged =
                JSON.stringify(existingAction.config) !==
                JSON.stringify(newConfig)

              if (isTypeChanged || isOrderChanged || isConfigChanged) {
                await tx.action.update({
                  where: { id: existingAction.id },
                  data: {
                    type,
                    config: newConfig as unknown as Prisma.InputJsonValue,
                    order: i,
                  },
                })
              }
            }
          }

          if (actionsToCreate.length > 0) {
            await tx.action.createMany({
              data: actionsToCreate,
            })
          }

          await tx.workflow.update({ where: { id, userId }, data: updateData })
        },
        {
          timeout: 15000,
        }
      )
    } else {
      await prisma.workflow.update({ where: { id, userId }, data: updateData })
    }

    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id, userId },
      include: { trigger: true, actions: true },
    })
    res.status(200).json(updatedWorkflow)
  } catch (error: unknown) {
    console.error('Error updating workflow:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        await prisma.workflow.delete({ where: { id, userId } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }
    res.status(204).send()
  } catch (error: unknown) {
    console.error('Error deleting workflow:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const duplicateWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let sourceWorkflow = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        sourceWorkflow = await prisma.workflow.findUnique({
          where: { id, userId },
          include: {
            trigger: { include: { rules: true } },
            actions: true,
          },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!sourceWorkflow) {
      return res.status(404).json({ message: 'Workflow not found' })
    }

    let newWorkflow = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }

        newWorkflow = await prisma.$transaction(async (tx) => {
          const workflowCopy = await tx.workflow.create({
            data: {
              name: `${sourceWorkflow.name} (Copy)`,
              userId,
              is_active: false,
              ui_config: sourceWorkflow.ui_config || Prisma.JsonNull,
              settings: sourceWorkflow.settings || Prisma.JsonNull,
            },
          })

          if (sourceWorkflow.trigger) {
            const triggerCopy = await tx.trigger.create({
              data: {
                workflowId: workflowCopy.id,
                type: sourceWorkflow.trigger.type,
                config: sourceWorkflow.trigger.config || Prisma.JsonNull,
              },
            })

            if (
              sourceWorkflow.trigger.rules &&
              sourceWorkflow.trigger.rules.length > 0
            ) {
              const rulesData = sourceWorkflow.trigger.rules.map((rule) => ({
                triggerId: triggerCopy.id,
                field: rule.field,
                operator: rule.operator,
                value: rule.value,
              }))
              await tx.rule.createMany({
                data: rulesData,
              })
            }
          }

          if (sourceWorkflow.actions && sourceWorkflow.actions.length > 0) {
            const actionsData = sourceWorkflow.actions.map((action) => ({
              workflowId: workflowCopy.id,
              type: action.type,
              config: action.config || Prisma.JsonNull,
              order: action.order,
            }))
            await tx.action.createMany({
              data: actionsData,
            })
          }

          return workflowCopy
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(201).json(newWorkflow)
  } catch (error: unknown) {
    console.error('Error duplicating workflow:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const testWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params
  const { nodes, edges, inputData } = req.body as {
    nodes: WorkflowNode[]
    edges: WorkflowEdge[]
    inputData: Record<string, unknown>
  }
  const userId = req.userId
  if (!userId) return res.status(401).json({ message: 'Unauthorized' })

  try {
    const executionId = uuidv4()
    const context = {
      workflowId: id,
      triggerId: 'test-trigger',
      executionId,
      data: inputData,
      results: {},
    }

    const logs = await executeWorkflow(context, { nodes, edges })
    res.status(200).json({ status: 'SUCCESS', logs })
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error'
    res.status(500).json({ status: 'FAILURE', message: errorMessage, logs: [] })
  }
}
