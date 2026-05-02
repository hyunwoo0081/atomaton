// apps/api/src/executors/executor.ts
import { WorkflowContext } from './types';
import prisma, { Action, Trigger, LogStatus } from '@atomaton/db';
import axios from 'axios';

// --- Templating Utility ---
export const applyTemplate = (template: string, data: Record<string, any>): string => {
  let result = template;
  for (const key in data) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), data[key]);
  }
  return result;
};

// --- Path Resolution Utility ---
export const resolvePath = (obj: any, path: string): any => {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  let current = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }
  return current;
};

// --- Action Execution Functions ---

export const executeHttpRequestAction = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; data?: any }> => {
  const config = action.config as any;
  const { method, url, headers, body, responseMapping } = config;
  if (!url || !method) return { success: false, message: 'HTTP URL or Method missing' };

  const templatedUrl = applyTemplate(url, context.data);
  const templatedHeaders: Record<string, string> = {};
  if (headers) { for (const key in headers) templatedHeaders[key] = applyTemplate(headers[key], context.data); }
  const templatedBody = body ? applyTemplate(body, context.data) : undefined;

  const maxRetries = 5;
  const retryDelays = [100, 200, 300, 400, 500]; // Shortened for engine logic but test will use fake timers

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
      
      const response = await axios({
        method, url: templatedUrl, headers: templatedHeaders,
        data: templatedBody ? JSON.parse(templatedBody) : undefined,
        timeout: 30000,
      });

      if (response.status >= 200 && response.status < 300) {
        const extractedVariables: Record<string, any> = {};
        if (responseMapping && Array.isArray(responseMapping)) {
          for (const mapping of responseMapping) {
            const value = resolvePath(response.data, mapping.sourcePath);
            if (value !== undefined) extractedVariables[mapping.targetVariable] = value;
          }
        }
        return { success: true, message: `HTTP ${method} successful`, data: { response: response.data, extractedVariables } };
      } else {
        throw new Error(`HTTP failed with status: ${response.status}`);
      }
    } catch (error: any) {
      const status = error.response?.status;
      const isRetryable = status >= 500 || status === 429 || !error.response;
      if (isRetryable && attempt < maxRetries - 1) continue;
      return { success: false, message: `HTTP action failed: ${error.response?.data?.message || error.message}` };
    }
  }
  return { success: false, message: 'HTTP action failed after max retries' };
};

export const executeDiscordAction = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; data?: any }> => {
  const { webhookUrl, content } = action.config as any;
  if (!webhookUrl || !content) return { success: false, message: 'Discord webhook URL or content missing' };

  const templatedContent = applyTemplate(content, context.data);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 100));
      const response = await axios.post(webhookUrl, { content: templatedContent });
      return { success: true, message: 'Discord action successful', data: response.data };
    } catch (error: any) {
      const status = error.response?.status;
      if ((status >= 500 || status === 429 || !error.response) && attempt < 4) continue;
      return { success: false, message: `Discord action failed: ${error.response?.data?.message || error.message}` };
    }
  }
  return { success: false, message: 'Discord action failed after max retries' };
};

export const executeNotionAction = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; data?: any }> => {
  return { success: true, message: 'Notion action simulated' };
};

export const executeCondition = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; nextNodeId?: string; data?: any }> => {
  const { conditions } = action.config as any;
  const logicType = (action.config as any).logicType || 'AND';
  if (!conditions || !Array.isArray(conditions)) return { success: false, message: 'Invalid condition configuration' };

  let result = logicType === 'AND';
  for (const condition of conditions) {
    const { field, operator, value } = condition;
    const dataValue = context.data[field];
    let conditionMet = false;
    if (dataValue !== undefined) {
      switch (operator) {
        case 'contains': conditionMet = String(dataValue).includes(value); break;
        case 'equals': conditionMet = String(dataValue) === value; break;
      }
    }
    if (logicType === 'AND') { if (!conditionMet) { result = false; break; } } 
    else { if (conditionMet) { result = true; break; } }
  }
  return { success: true, message: `Condition evaluated to ${result}`, data: { result } };
};

export const executeWorkflow = async (context: WorkflowContext, overrideWorkflowData?: { nodes: any[], edges: any[], settings?: any }) => {
  const { workflowId, triggerId, executionId, data } = context;
  try {
    let uiConfig: any;
    if (overrideWorkflowData) uiConfig = { nodes: overrideWorkflowData.nodes, edges: overrideWorkflowData.edges };
    else {
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow || !workflow.is_active) return;
      uiConfig = workflow.ui_config;
    }

    const { nodes, edges } = uiConfig;
    const triggerNode = nodes.find((n: any) => n.type.startsWith('trigger'));
    if (!triggerNode) throw new Error('No trigger node found');

    let currentContext: WorkflowContext = { ...context };
    const queue: string[] = [];
    edges.filter((e: any) => e.source === triggerNode.id).forEach((e: any) => queue.push(e.target));
    const visited = new Set<string>([triggerNode.id]);
    const executionLogs: any[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      let actionResult: any = { success: true, message: 'Skipped' };
      let nextHandle: string | null = null;
      try {
        const actionModel = { ...node, config: node.data.config } as unknown as Action;
        switch (node.type) {
          case 'action': actionResult = await executeDiscordAction(actionModel, currentContext); break;
          case 'action-notion': actionResult = await executeNotionAction(actionModel, currentContext); break;
          case 'action-http': 
            actionResult = await executeHttpRequestAction(actionModel, currentContext); 
            if (actionResult.success && actionResult.data?.extractedVariables) {
              currentContext.data = { ...currentContext.data, ...actionResult.data.extractedVariables };
            }
            break;
          case 'condition': 
            const conditionResult = await executeCondition(actionModel, currentContext);
            actionResult = conditionResult;
            nextHandle = conditionResult.data?.result ? 'true' : 'false';
            break;
        }
        const logEntry = { workflowId, triggerId, actionId: nodeId, status: actionResult.success ? LogStatus.SUCCESS : LogStatus.FAILURE, message: actionResult.message, context: actionResult.data, executionId };
        await prisma.log.create({ data: logEntry });
        executionLogs.push(logEntry);
        if (!actionResult.success) throw new Error(`Node ${nodeId} failed: ${actionResult.message}`);
        
        const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
        if (node.type === 'condition') {
          const targetEdge = outgoingEdges.find((e: any) => e.sourceHandle === nextHandle);
          if (targetEdge) queue.push(targetEdge.target);
        } else outgoingEdges.forEach((e: any) => queue.push(e.target));
      } catch (e) { throw e; }
    }
    return executionLogs;
  } catch (error: any) {
    const failLog = { workflowId, triggerId, status: LogStatus.FAILURE, message: `Workflow failed: ${error.message}`, context: data, executionId };
    await prisma.log.create({ data: failLog });
    if (overrideWorkflowData) return [...(await prisma.log.findMany({ where: { executionId } })), failLog];
  }
};
