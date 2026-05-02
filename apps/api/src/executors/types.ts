// apps/api/src/executors/types.ts

export interface WorkflowContext {
  triggerId: string;
  workflowId: string;
  executionId: string;
  data: Record<string, string | number | boolean | null | any>; // Still need dynamic data but with stricter values
  results: Record<string, ActionResult>;
}

export interface ActionResult {
  success: boolean;
  message: string;
  data?: Record<string, any>;
  extractedVariables?: Record<string, any>;
  nextNodeId?: string;
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
  properties: Record<string, any>;
}

export interface ConditionRule {
  field: string;
  operator: 'contains' | 'equals';
  value: string;
}

export interface ConditionConfig {
  logicType?: 'AND' | 'OR';
  conditions: ConditionRule[];
}

export interface HttpResponseMapping {
  sourcePath: string;
  targetVariable: string;
}

export interface HttpActionConfig {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: string;
  responseMapping?: HttpResponseMapping[];
}

export type ActionConfig = DiscordActionConfig | NotionActionConfig | ConditionConfig | HttpActionConfig;

export interface GlobalSettings {
  enableFailureAlert: boolean;
  failureWebhookUrl: string;
}

// --- UI / React Flow Types ---

export interface WorkflowNode {
  id: string;
  type: 'action' | 'action-notion' | 'action-http' | 'condition' | 'trigger-webhook' | string;
  data: {
    label: string;
    config: ActionConfig;
  };
}

export interface WorkflowEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: 'true' | 'false' | null;
}

export interface UIConfig {
  nodes: WorkflowNode[];
  edges: WorkflowEdge[];
}
