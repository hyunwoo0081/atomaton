// apps/web/src/types/workflow.ts

import type { Node, Edge } from 'reactflow';

// --- Global Settings ---
export interface GlobalSettings {
  enableFailureAlert: boolean;
  failureWebhookUrl: string;
}

// --- Condition Rule ---
export interface ConditionRule {
  field: string;
  operator: string;
  value: string;
}

// --- Node Config Interfaces ---

export interface BaseNodeConfig {
  // Common config properties if any
}

export interface TriggerNodeConfig extends BaseNodeConfig {
  accountId?: string;
  mailbox?: string;
  interval?: number;
  rules?: ConditionRule[]; // For IMAP trigger rules
}

export interface WebhookTriggerNodeConfig extends BaseNodeConfig {
  // Webhook specific config, e.g., generated URL, API Key
  webhookUrl?: string;
  apiKey?: string;
}

export interface DiscordActionConfig extends BaseNodeConfig {
  webhookUrl?: string;
  content?: string;
  username?: string; // Bot name
}

export interface NotionActionConfig extends BaseNodeConfig {
  accountId?: string;
  databaseId?: string;
  properties?: string | object; // JSON string or object
}

export interface ConditionNodeConfig extends BaseNodeConfig {
  logicType?: 'AND' | 'OR';
  conditions?: ConditionRule[];
}

export type NodeConfig = TriggerNodeConfig | WebhookTriggerNodeConfig | DiscordActionConfig | NotionActionConfig | ConditionNodeConfig;

// --- Custom Node Data for React Flow ---
export interface CustomNodeData {
  label: string;
  config: NodeConfig;
  isValid: boolean;
  originalData?: any; // Original data from backend, can be more specific later if needed
}

// --- Account Interfaces ---
export interface NaverImapAccountConfig {
  username: string;
  password?: string; // Password is sent only on creation, not returned
  host?: string;
  port?: number;
}

export interface NotionAccountConfig {
  token: string;
}

export type AccountPayloadConfig = NaverImapAccountConfig | NotionAccountConfig;

export interface AccountResponse {
  id: string;
  userId: string;
  type: 'NAVER_IMAP' | 'NOTION';
  name: string;
  credentials: {
    username?: string; // Only username is returned for IMAP, password is encrypted
    // token is not returned for Notion
  };
  created_at: string;
  updated_at: string;
}

// --- Workflow Data for Backend ---
export interface WorkflowBackendData {
  id: string;
  name: string;
  is_active: boolean;
  userId: string;
  trigger?: any; // Specific Trigger model from Prisma
  actions: any[]; // Specific Action model from Prisma
  ui_config?: { nodes: Node<CustomNodeData>[]; edges: Edge[] };
  settings?: GlobalSettings;
  created_at: string;
  updated_at: string;
}
