// apps/api/src/executors/types.ts

export interface WorkflowContext {
  triggerId: string;
  workflowId: string;
  executionId: string; // Unique ID for each workflow run
  data: Record<string, any>; // Data passed through the workflow (e.g., email data, webhook payload)
  results: Record<string, any>; // Results from previous actions
  // Add other context-specific properties as needed
}

// --- Config Interfaces ---

export interface DiscordActionConfig {
  webhookUrl: string;
  content: string;
  username?: string;
}

export interface NotionActionConfig {
  accountId: string;
  databaseId: string;
  properties: any; // JSON object
}

export interface ConditionRule {
  field: string;
  operator: string;
  value: string;
}

export interface ConditionConfig {
  logicType?: 'AND' | 'OR';
  conditions: ConditionRule[];
}

export type ActionConfig = DiscordActionConfig | NotionActionConfig | ConditionConfig;

export interface GlobalSettings {
  enableFailureAlert: boolean;
  failureWebhookUrl: string;
}

export interface UIConfig {
  nodes: any[]; // Can be more specific if we share types with frontend
  edges: any[];
}
