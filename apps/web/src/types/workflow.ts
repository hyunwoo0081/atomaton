// apps/web/src/types/workflow.ts

import type { Node, Edge } from 'reactflow'

// --- Global Settings ---
export interface GlobalSettings {
  enableFailureAlert: boolean
  failureWebhookUrl: string
}

// --- Condition Rule ---
export interface ConditionRule {
  field: string
  operator: string
  value: string
}

// --- Node Config Interfaces ---

export interface BaseNodeConfig {
  nodeId?: string // Add a property to avoid empty interface lint error
}

export interface TriggerNodeConfig extends BaseNodeConfig {
  accountId?: string
  mailbox?: string
  interval?: number
  rules?: ConditionRule[]
}

export interface WebhookTriggerNodeConfig extends BaseNodeConfig {
  webhookUrl?: string
  apiKey?: string
  samplePayload?: string
}

export interface DiscordActionConfig extends BaseNodeConfig {
  webhookUrl?: string
  content?: string
  username?: string
}

export interface NotionActionConfig extends BaseNodeConfig {
  accountId?: string
  databaseId?: string
  properties?: string | Record<string, unknown>
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  logicType?: 'AND' | 'OR'
  conditions?: ConditionRule[]
}

export interface HttpResponseMapping {
  sourcePath: string
  targetVariable: string
}

export interface HttpActionConfig extends BaseNodeConfig {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  url?: string
  headers?: Record<string, string>
  body?: string
  responseMapping?: HttpResponseMapping[]
}

export interface RegexReplaceRule {
  pattern: string
  replacement: string
  flags?: string
}

export interface RegexReplaceActionConfig extends BaseNodeConfig {
  inputText?: string
  rules?: RegexReplaceRule[]
  outputVariable?: string
}

export interface GoogleBridgeActionConfig extends BaseNodeConfig {
  webAppUrl?: string
  action?: string
  payload?: string | Record<string, unknown>
}

export type NodeConfig =
  | TriggerNodeConfig
  | WebhookTriggerNodeConfig
  | DiscordActionConfig
  | NotionActionConfig
  | ConditionNodeConfig
  | HttpActionConfig
  | RegexReplaceActionConfig
  | GoogleBridgeActionConfig

// --- Custom Node Data for React Flow ---
export interface CustomNodeData {
  label: string
  config: NodeConfig
  isValid: boolean
  originalData?: Record<string, unknown>
}

// --- Test & Log Interfaces ---
export interface LogEntry {
  workflowId: string
  triggerId?: string
  actionId?: string
  status: 'SUCCESS' | 'FAILURE' | 'SKIPPED' | 'ENQUEUED'
  message: string
  context?: Record<string, unknown>
  executionId?: string
  remarks?: string | null
  created_at?: string
}

export interface TestResult {
  status?: string
  logs?: LogEntry[]
  error?: string
}

// --- Account Interfaces ---
export interface NaverImapAccountConfig {
  username: string
  password?: string
  host?: string
  port?: number
}

export interface NotionAccountConfig {
  token: string
}

export type AccountPayloadConfig = NaverImapAccountConfig | NotionAccountConfig

export interface AccountResponse {
  id: string
  userId: string
  type: 'NAVER_IMAP' | 'NOTION'
  name: string
  credentials: {
    username?: string
  }
  created_at: string
  updated_at: string
}

// --- Workflow Data for Backend ---
export interface WorkflowBackendData {
  id: string
  name: string
  is_active: boolean
  userId: string
  trigger?: {
    id: string
    type: string
    config: NodeConfig
  } | null
  actions: {
    id: string
    type: string
    config: NodeConfig
    order: number
  }[]
  ui_config?: { nodes: Node<CustomNodeData>[]; edges: Edge[] } | null
  settings?: GlobalSettings | null
  created_at: string
  updated_at: string
}
