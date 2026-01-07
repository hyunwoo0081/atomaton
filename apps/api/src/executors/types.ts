// apps/api/src/executors/types.ts

export interface WorkflowContext {
  triggerId: string;
  workflowId: string;
  executionId: string; // Unique ID for each workflow run
  data: Record<string, any>; // Data passed through the workflow (e.g., email data, webhook payload)
  results: Record<string, any>; // Results from previous actions
  // Add other context-specific properties as needed
}
