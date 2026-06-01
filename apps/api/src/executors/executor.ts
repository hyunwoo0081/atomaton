// apps/api/src/executors/executor.ts
import {
  WorkflowContext,
  WorkflowNode,
  UIConfig,
  HttpActionConfig,
  DiscordActionConfig,
  NotionActionConfig,
  ConditionConfig,
  ActionResult,
  LogEntry,
  WorkflowData,
} from './types'
import prisma, { Prisma, decrypt } from '@atomaton/db'
import axios, { AxiosError } from 'axios'
import { Client } from '@notionhq/client'

// --- Utility Functions ---

const getErrorMessage = (error: unknown): string => {
  if (error instanceof Error) return error.message
  if (axios.isAxiosError(error) && error.response?.data) {
    return typeof error.response.data === 'string'
      ? error.response.data
      : JSON.stringify(error.response.data)
  }
  return String(error)
}

export const applyTemplate = (template: string, data: WorkflowData): string => {
  if (!template) return ''
  return template.replace(/\{\{([^}]+)\}\}/g, (match, path) => {
    const trimmedPath = path.trim()
    const value = resolvePath(data as Record<string, unknown>, trimmedPath)
    if (value === null || value === undefined) {
      return match
    }
    if (typeof value === 'object') {
      try {
        return JSON.stringify(value)
      } catch {
        return match
      }
    }
    return String(value)
  })
}

export const resolvePath = (
  obj: Record<string, unknown> | unknown[],
  path: string
): unknown => {
  if (!path) return undefined
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.')

  let current: unknown = obj
  for (const part of parts) {
    if (current === null || current === undefined) return undefined

    if (Array.isArray(current)) {
      const index = parseInt(part, 10)
      current = current[index]
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part]
    } else {
      return undefined
    }
  }
  return current
}

// --- Action Execution Functions ---

export const executeHttpRequestAction = async (
  node: WorkflowNode,
  context: WorkflowContext
): Promise<ActionResult> => {
  const config = node.data.config as HttpActionConfig
  const { method, url, headers, body, responseMapping } = config
  if (!url || !method)
    return { success: false, message: 'HTTP URL or Method missing' }

  const templatedUrl = applyTemplate(url, context.data)
  const templatedHeaders: Record<string, string> = {}
  if (headers) {
    for (const key in headers) {
      templatedHeaders[key] = applyTemplate(headers[key], context.data)
    }
  }
  const templatedBody = body ? applyTemplate(body, context.data) : undefined

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0)
        await new Promise((resolve) =>
          setTimeout(resolve, retryDelays[attempt - 1])
        )

      const response = await axios({
        method,
        url: templatedUrl,
        headers: templatedHeaders,
        data: templatedBody ? JSON.parse(templatedBody) : undefined,
        timeout: 30000,
      })

      if (response.status >= 200 && response.status < 300) {
        const extractedVariables: WorkflowData = {}
        if (responseMapping && Array.isArray(responseMapping)) {
          for (const mapping of responseMapping) {
            const value = resolvePath(
              response.data as Record<string, unknown>,
              mapping.sourcePath
            )
            if (value !== undefined) {
              extractedVariables[mapping.targetVariable] = value
            }
          }
        }
        return {
          success: true,
          message: `HTTP ${method} successful`,
          data: response.data as Record<string, unknown>,
          extractedVariables,
        }
      } else {
        throw new Error(`HTTP failed with status: ${response.status}`)
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      const isRetryable =
        (status && (status >= 500 || status === 429)) || !axiosError.response

      if (isRetryable && attempt < maxRetries - 1) continue
      return {
        success: false,
        message: `HTTP action failed: ${getErrorMessage(error)}`,
      }
    }
  }
  return { success: false, message: 'HTTP action failed after max retries' }
}

export const executeDiscordAction = async (
  node: WorkflowNode,
  context: WorkflowContext
): Promise<ActionResult> => {
  const config = node.data.config as DiscordActionConfig
  const { webhookUrl, content } = config
  if (!webhookUrl || !content)
    return { success: false, message: 'Discord webhook URL or content missing' }

  const templatedContent = applyTemplate(content, context.data)
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (attempt > 0) await new Promise((resolve) => setTimeout(resolve, 1000))
      const response = await axios.post(webhookUrl, {
        content: templatedContent,
      })
      return {
        success: true,
        message: 'Discord action successful',
        data: response.data as Record<string, unknown>,
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError
      const status = axiosError.response?.status
      if (
        ((status && (status >= 500 || status === 429)) ||
          !axiosError.response) &&
        attempt < 4
      )
        continue
      return {
        success: false,
        message: `Discord action failed: ${getErrorMessage(error)}`,
      }
    }
  }
  return { success: false, message: 'Discord action failed after max retries' }
}

export const executeNotionAction = async (
  node: WorkflowNode,
  context: WorkflowContext
): Promise<ActionResult> => {
  const config = node.data.config as NotionActionConfig
  const { accountId, databaseId, properties } = config
  if (!accountId || !databaseId || !properties) {
    return {
      success: false,
      message: 'Notion config missing (accountId, databaseId, or properties)',
    }
  }

  try {
    const account = await prisma.account.findUnique({
      where: { id: accountId },
    })
    if (!account) return { success: false, message: 'Notion account not found' }

    const creds = account.credentials as Record<string, string>
    const encryptedToken = creds.token || creds.accessToken
    if (!encryptedToken)
      return {
        success: false,
        message: 'Notion token not found in account credentials',
      }

    // Attempt to decrypt; if it fails (not encrypted), use as is for compatibility
    let token: string
    try {
      token = decrypt(encryptedToken)
    } catch {
      token = encryptedToken
    }

    const notion = new Client({ auth: token })

    // Recursive template application using JSON stringify/parse
    const templatedProperties = JSON.parse(
      applyTemplate(JSON.stringify(properties), context.data)
    )

    const maxRetries = 5
    const retryDelays = [1000, 5000, 30000, 120000, 600000]

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0)
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )

        const response = await notion.pages.create({
          parent: { database_id: databaseId },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          properties: templatedProperties as any,
        })

        return {
          success: true,
          message: 'Notion page created',
          data: response as unknown as Record<string, unknown>,
        }
      } catch (error: unknown) {
        // Notion API error structure: error.status
        const notionError = error as { status?: number }
        const isRetryable =
          (notionError.status &&
            (notionError.status >= 500 || notionError.status === 429)) ||
          !notionError.status

        if (isRetryable && attempt < maxRetries - 1) continue
        return {
          success: false,
          message: `Notion action failed: ${getErrorMessage(error)}`,
        }
      }
    }
  } catch (error: unknown) {
    return {
      success: false,
      message: `Notion action failed: ${getErrorMessage(error)}`,
    }
  }
  return { success: false, message: 'Notion action failed after max retries' }
}

export const executeCondition = async (
  node: WorkflowNode,
  context: WorkflowContext
): Promise<ActionResult> => {
  const config = node.data.config as ConditionConfig
  const { conditions, logicType = 'AND' } = config
  if (!conditions || !Array.isArray(conditions))
    return { success: false, message: 'Invalid condition configuration' }

  let result = logicType === 'AND'
  for (const condition of conditions) {
    const { field, operator, value } = condition
    const dataValue = context.data[field]
    let conditionMet = false
    if (dataValue !== undefined) {
      switch (operator) {
        case 'contains':
          conditionMet = String(dataValue).includes(value)
          break
        case 'equals':
          conditionMet = String(dataValue) === value
          break
      }
    }
    if (logicType === 'AND') {
      if (!conditionMet) {
        result = false
        break
      }
    } else {
      if (conditionMet) {
        result = true
        break
      }
    }
  }
  return {
    success: true,
    message: `Condition evaluated to ${result}`,
    data: { result },
  }
}

export const executeWorkflow = async (
  context: WorkflowContext,
  overrideWorkflowData?: UIConfig
): Promise<LogEntry[] | undefined> => {
  const { workflowId, triggerId, executionId, data } = context
  try {
    let uiConfig: UIConfig
    if (overrideWorkflowData) {
      uiConfig = overrideWorkflowData
    } else {
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      })
      if (!workflow || !workflow.is_active || !workflow.ui_config) return
      uiConfig = workflow.ui_config as unknown as UIConfig
    }

    const { nodes, edges } = uiConfig
    const triggerNode = nodes.find((n) => n.type.startsWith('trigger'))
    if (!triggerNode) throw new Error('No trigger node found')

    const currentContext: WorkflowContext = { ...context }
    const executionQueue: string[] = []
    edges
      .filter((e) => e.source === triggerNode.id)
      .forEach((e) => executionQueue.push(e.target))
    const visited = new Set<string>([triggerNode.id])
    const executionLogs: LogEntry[] = []

    while (executionQueue.length > 0) {
      const nodeId = executionQueue.shift()!
      if (visited.has(nodeId)) continue
      visited.add(nodeId)
      const node = nodes.find((n) => n.id === nodeId)
      if (!node) continue

      let actionResult: ActionResult = { success: true, message: 'Skipped' }
      let nextHandle: 'true' | 'false' | null = null

      switch (node.type) {
        case 'action': {
          actionResult = await executeDiscordAction(node, currentContext)
          break
        }
        case 'action-notion': {
          actionResult = await executeNotionAction(node, currentContext)
          break
        }
        case 'action-http': {
          actionResult = await executeHttpRequestAction(node, currentContext)
          if (actionResult.success && actionResult.extractedVariables) {
            currentContext.data = {
              ...currentContext.data,
              ...actionResult.extractedVariables,
            }
          }
          break
        }
        case 'condition': {
          const conditionResult = await executeCondition(node, currentContext)
          actionResult = conditionResult
          nextHandle = conditionResult.data?.result ? 'true' : 'false'
          break
        }
      }

      const logEntry: LogEntry = {
        workflowId,
        triggerId,
        actionId: nodeId,
        status: actionResult.success ? 'SUCCESS' : 'FAILURE',
        message: actionResult.message,
        context: (actionResult.data || {}) as unknown as Prisma.InputJsonValue,
        executionId,
      }

      await prisma.log.create({
        data: logEntry as unknown as Prisma.LogCreateInput,
      })
      executionLogs.push(logEntry)

      if (!actionResult.success)
        throw new Error(`Node ${nodeId} failed: ${actionResult.message}`)
      if (actionResult.data) currentContext.results[nodeId] = actionResult

      const outgoingEdges = edges.filter((e) => e.source === nodeId)
      if (node.type === 'condition') {
        const targetEdge = outgoingEdges.find(
          (e) => e.sourceHandle === nextHandle
        )
        if (targetEdge) executionQueue.push(targetEdge.target)
      } else {
        outgoingEdges.forEach((e) => executionQueue.push(e.target))
      }
    }
    return executionLogs
  } catch (error: unknown) {
    const errorMessage = getErrorMessage(error)
    const failLog: LogEntry = {
      workflowId,
      triggerId,
      status: 'FAILURE',
      message: `Workflow failed: ${errorMessage}`,
      context: data as unknown as Prisma.InputJsonValue,
      executionId,
    }
    await prisma.log.create({
      data: failLog as unknown as Prisma.LogCreateInput,
    })
    if (overrideWorkflowData) {
      const history = await prisma.log.findMany({ where: { executionId } })
      return [...(history as unknown as LogEntry[]), failLog]
    }
  }
}
