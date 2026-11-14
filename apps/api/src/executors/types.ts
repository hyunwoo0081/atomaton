// apps/api/src/executors/types.ts
import { Prisma } from '@atomaton/db'

/**
 * Common data structure for each trigger or action output.
 * Uses 'unknown' to enforce strict type checking and narrowing.
 */
export type WorkflowData = Record<string, unknown>

export interface WorkflowContext {
  triggerId: string
  workflowId: string
  executionId: string
  data: WorkflowData
  results: Record<string, ActionResult>
  retryCount?: number
  startNodeId?: string
}

export interface ActionResult {
  success: boolean
  message: string
  data?: Record<string, unknown>
  extractedVariables?: WorkflowData
  nextNodeId?: string
}

export interface LogEntry {
  workflowId: string
  triggerId?: string
  actionId?: string
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'ENQUEUED'
  message: string
  context: Prisma.InputJsonValue
  executionId: string
  source?: string
  remarks?: string | null
  created_at?: Date | string
}

// --- Configuration Types ---

export interface DiscordActionConfig {
  webhookUrl: string
  content: string
  username?: string
}

export interface NotionActionConfig {
  accountId: string
  databaseId: string
  properties: Record<string, unknown>
}

export interface ConditionRule {
  field: string
  operator:
    | 'contains'
    | 'equals'
    | 'startsWith'
    | 'endsWith'
    | 'regex'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'isEmpty'
    | 'isNotEmpty'
  value?: string
}

export interface ConditionConfig {
  logicType?: 'AND' | 'OR'
  conditions: ConditionRule[]
}

export interface HttpResponseMapping {
  sourcePath: string
  targetVariable: string
}

export interface HttpActionConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url: string
  headers?: Record<string, string>
  body?: string
  responseMapping?: HttpResponseMapping[]
}

export interface RegexReplaceRule {
  pattern: string
  replacement: string
  flags?: string
}

export interface RegexReplaceActionConfig {
  inputText: string
  rules: RegexReplaceRule[]
  outputVariable: string
}

export interface GoogleBridgeActionConfig {
  webAppUrl: string
  action: string
  payload?: Record<string, unknown>
}

export interface UrlDecodeActionConfig {
  inputText: string
  outputVariable: string
}

export interface AiGenerateActionConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  systemPrompt?: string
  prompt: string
  temperature?: number
  responseFormat?: 'text' | 'json'
  outputVariable: string
  customHeaders?: Record<string, string>
}

export interface AiConditionConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  systemPrompt?: string
  inputText: string
  criteria: string
  reasoningVariable?: string
  customHeaders?: Record<string, string>
}

export interface TriggerNodeConfig {
  nodeId?: string
  accountId?: string
  mailbox?: string
  interval?: number
  rules?: ConditionRule[]
  samplePayload?: string
}

export interface WebhookTriggerNodeConfig {
  nodeId?: string
  webhookUrl?: string
  webhookToken?: string
  apiKey?: string
  samplePayload?: string
  allowedIps?: string[]
  allowedOrigins?: string[]
}

export type ActionConfig =
  | DiscordActionConfig
  | NotionActionConfig
  | ConditionConfig
  | HttpActionConfig
  | RegexReplaceActionConfig
  | GoogleBridgeActionConfig
  | UrlDecodeActionConfig
  | AiGenerateActionConfig
  | AiConditionConfig
  | TriggerNodeConfig
  | WebhookTriggerNodeConfig
  | Record<string, unknown>

export interface GlobalSettings {
  enableFailureAlert: boolean
  failureWebhookUrl: string
}

// --- UI / React Flow Types ---

export interface WorkflowNode {
  id: string
  type:
    | 'action'
    | 'action-notion'
    | 'action-http'
    | 'action-regex-replace'
    | 'action-google-bridge'
    | 'action-url-decode'
    | 'action-ai'
    | 'condition'
    | 'condition-ai'
    | 'trigger'
    | 'trigger-webhook'
    | string
  data: {
    label: string
    config: ActionConfig
  }
}

export interface WorkflowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: 'true' | 'false' | null
}

export interface UIConfig {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}
