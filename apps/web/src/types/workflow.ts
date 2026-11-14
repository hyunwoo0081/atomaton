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
  nodeId?: string
  description?: string
}

export interface TriggerNodeConfig extends BaseNodeConfig {
  accountId?: string
  mailbox?: string
  interval?: number
  rules?: ConditionRule[]
  samplePayload?: string
}

export interface TriggerSamplePreset {
  id: string
  label: string
  buildPayload: () => Record<string, unknown>
}

export const EMAIL_SAMPLE_PRESETS: TriggerSamplePreset[] = [
  {
    id: 'email-default',
    label: '기본 이메일',
    buildPayload: () => ({
      subject: 'Test Email Subject',
      from: 'test@example.com',
      date: new Date().toISOString(),
      body: 'This is a test email body.',
      messageId: '<sample-msg-001@mail.naver.com>',
      source: 'NAVER_IMAP',
    }),
  },
  {
    id: 'email-payment',
    label: '결제/청구서 알림',
    buildPayload: () => ({
      subject: '[결제 완료] 25,000원 자동결제 안내',
      from: 'billing@service.com',
      date: new Date().toISOString(),
      body: '고객님, 25,000원이 정상 결제되었습니다. 주문번호: ORD-20260101',
      messageId: '<billing-msg-001@service.com>',
      source: 'NAVER_IMAP',
    }),
  },
  {
    id: 'email-inquiry',
    label: '문의 접수',
    buildPayload: () => ({
      subject: '[고객문의] API 연동 관련 질문드립니다',
      from: 'customer@company.co.kr',
      date: new Date().toISOString(),
      body: '안녕하세요, 웹훅 연동 테스트 중 문의사항이 있어 연락드립니다.',
      messageId: '<inquiry-msg-001@company.co.kr>',
      source: 'NAVER_IMAP',
    }),
  },
]

export const WEBHOOK_SAMPLE_PRESETS: TriggerSamplePreset[] = [
  {
    id: 'webhook-default',
    label: '기본 웹훅',
    buildPayload: () => ({
      event: 'test_webhook_event',
      timestamp: new Date().toISOString(),
      payload: {
        id: 'test-123',
        status: 'success',
        message: 'Hello from test webhook',
      },
    }),
  },
  {
    id: 'webhook-payment',
    label: '결제 이벤트',
    buildPayload: () => ({
      event: 'payment.completed',
      timestamp: new Date().toISOString(),
      subject: 'Payment Received',
      amount: 25000,
      status: 'success',
      orderId: 'ORD-20260101',
    }),
  },
  {
    id: 'webhook-gmail',
    label: 'Gmail 동기화',
    buildPayload: () => ({
      subject: '[Gmail] 새 메일이 도착했습니다',
      from: 'sender@gmail.com',
      date: new Date().toISOString(),
      body: 'Google Apps Script Gmail Sync 샘플 본문입니다.',
    }),
  },
]

/**
 * Returns built-in sample payload presets for the given trigger node type.
 */
export const getTriggerSamplePresets = (
  nodeType?: string
): TriggerSamplePreset[] => {
  if (nodeType === 'trigger-webhook') {
    return WEBHOOK_SAMPLE_PRESETS
  }
  return EMAIL_SAMPLE_PRESETS
}

export interface WebhookTriggerNodeConfig extends BaseNodeConfig {
  webhookUrl?: string
  webhookToken?: string
  apiKey?: string
  samplePayload?: string
  allowedIps?: string[]
  allowedOrigins?: string[]
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

export interface UrlDecodeActionConfig extends BaseNodeConfig {
  inputText?: string
  outputVariable?: string
}

export interface AiGenerateActionConfig extends BaseNodeConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  systemPrompt?: string
  prompt?: string
  temperature?: number
  responseFormat?: 'text' | 'json'
  outputVariable?: string
  customHeaders?: Record<string, string>
}

export interface AiConditionConfig extends BaseNodeConfig {
  baseUrl?: string
  apiKey?: string
  model?: string
  systemPrompt?: string
  inputText?: string
  criteria?: string
  reasoningVariable?: string
  customHeaders?: Record<string, string>
}

export type ActionConfig =
  | DiscordActionConfig
  | NotionActionConfig
  | ConditionNodeConfig
  | HttpActionConfig
  | RegexReplaceActionConfig
  | GoogleBridgeActionConfig
  | UrlDecodeActionConfig
  | AiGenerateActionConfig
  | AiConditionConfig

export type NodeConfig =
  | TriggerNodeConfig
  | WebhookTriggerNodeConfig
  | DiscordActionConfig
  | NotionActionConfig
  | ConditionNodeConfig
  | HttpActionConfig
  | RegexReplaceActionConfig
  | GoogleBridgeActionConfig
  | UrlDecodeActionConfig
  | AiGenerateActionConfig
  | AiConditionConfig

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
  triggers?: {
    id: string
    nodeId?: string
    webhookToken?: string
    type: string
    config: NodeConfig
  }[]
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
