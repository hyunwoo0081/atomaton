// apps/api/src/executors/executor.ts
import { 
  WorkflowContext, 
  WorkflowNode, 
  UIConfig, 
  HttpActionConfig, 
  DiscordActionConfig, 
  ConditionConfig, 
  ActionResult,
  LogEntry
} from './types';
import prisma, { LogStatus } from '@atomaton/db';
import axios, { AxiosError } from 'axios';

// --- Templating Utility ---
export const applyTemplate = (template: string, data: Record<string, string | number | boolean | null | unknown>): string => {
  let result = template;
  for (const key in data) {
    const value = data[key];
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value !== null && value !== undefined ? String(value) : '');
  }
  return result;
};

// --- Path Resolution Utility ---
export const resolvePath = (obj: Record<string, unknown> | unknown[], path: string): unknown => {
  if (!path) return undefined;
  const parts = path.replace(/\[(\d+)\]/g, '.$1').split('.');
  
  let current: unknown = obj;
  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    
    if (Array.isArray(current)) {
      const index = parseInt(part, 10);
      current = current[index];
    } else if (typeof current === 'object') {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return current;
};

// --- Action Execution Functions ---

export const executeHttpRequestAction = async (node: WorkflowNode, context: WorkflowContext): Promise<ActionResult> => {
  const config = node.data.config as HttpActionConfig;
  const { method, url, headers, body, responseMapping } = config;
  if (!url || !method) return { success: false, message: 'HTTP URL or Method missing' };

  const templatedUrl = applyTemplate(url, context.data);
  const templatedHeaders: Record<string, string> = {};
  if (headers) { 
    for (const key in headers) {
        templatedHeaders[key] = applyTemplate(headers[key], context.data); 
    }
  }
  const templatedBody = body ? applyTemplate(body, context.data) : undefined;

  const maxRetries = 5;
  const retryDelays = [100, 200, 300, 400, 500];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, retryDelays[attempt - 1]));
      
      const response = await axios({
        method, url: templatedUrl, headers: templatedHeaders,
        data: templatedBody ? JSON.parse(templatedBody) : undefined,
        timeout: 30000,
      });

      if (response.status >= 200 && response.status < 300) {
        const extractedVariables: Record<string, unknown> = {};
        if (responseMapping && Array.isArray(responseMapping)) {
          for (const mapping of responseMapping) {
            const value = resolvePath(response.data as Record<string, unknown>, mapping.sourcePath);
            if (value !== undefined) extractedVariables[mapping.targetVariable] = value;
          }
        }
        return { 
            success: true, 
            message: `HTTP ${method} successful`, 
            data: response.data as Record<string, unknown>, 
            extractedVariables 
        };
      } else {
        throw new Error(`HTTP failed with status: ${response.status}`);
      }
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      const isRetryable = (status && (status >= 500 || status === 429)) || !axiosError.response;
      
      if (isRetryable && attempt < maxRetries - 1) continue;
      
      const errorMessage = axiosError.response?.data 
        ? JSON.stringify(axiosError.response.data) 
        : (error instanceof Error ? error.message : 'Unknown error');
        
      return { success: false, message: `HTTP action failed: ${errorMessage}` };
    }
  }
  return { success: false, message: 'HTTP action failed after max retries' };
};

export const executeDiscordAction = async (node: WorkflowNode, context: WorkflowContext): Promise<ActionResult> => {
  const config = node.data.config as DiscordActionConfig;
  const { webhookUrl, content } = config;
  if (!webhookUrl || !content) return { success: false, message: 'Discord webhook URL or content missing' };

  const templatedContent = applyTemplate(content, context.data);
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      if (attempt > 0) await new Promise(resolve => setTimeout(resolve, 100));
      const response = await axios.post(webhookUrl, { content: templatedContent });
      return { success: true, message: 'Discord action successful', data: response.data as Record<string, unknown> };
    } catch (error: unknown) {
      const axiosError = error as AxiosError;
      const status = axiosError.response?.status;
      if ((status && (status >= 500 || status === 429)) || !axiosError.response) {
          if (attempt < 4) continue;
      }
      const errorMessage = axiosError.response?.data 
        ? JSON.stringify(axiosError.response.data) 
        : (error instanceof Error ? error.message : 'Unknown error');
      return { success: false, message: `Discord action failed: ${errorMessage}` };
    }
  }
  return { success: false, message: 'Discord action failed after max retries' };
};

export const executeNotionAction = async (_node: WorkflowNode, _context: WorkflowContext): Promise<ActionResult> => {
  return { success: true, message: 'Notion action simulated' };
};

export const executeCondition = async (node: WorkflowNode, context: WorkflowContext): Promise<ActionResult> => {
  const config = node.data.config as ConditionConfig;
  const { conditions, logicType = 'AND' } = config;
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

export const executeWorkflow = async (
    context: WorkflowContext, 
    overrideWorkflowData?: UIConfig
): Promise<LogEntry[] | undefined> => {
  const { workflowId, triggerId, executionId, data } = context;
  try {
    let uiConfig: UIConfig;
    if (overrideWorkflowData) uiConfig = overrideWorkflowData;
    else {
      const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
      if (!workflow || !workflow.is_active || !workflow.ui_config) return;
      uiConfig = workflow.ui_config as unknown as UIConfig;
    }

    const { nodes, edges } = uiConfig;
    const triggerNode = nodes.find((n) => n.type.startsWith('trigger'));
    if (!triggerNode) throw new Error('No trigger node found');

    const currentContext: WorkflowContext = { ...context };
    const executionQueue: string[] = [];
    edges.filter((e) => e.source === triggerNode.id).forEach((e) => executionQueue.push(e.target));
    const visited = new Set<string>([triggerNode.id]);
    const executionLogs: LogEntry[] = [];

    while (executionQueue.length > 0) {
      const nodeId = executionQueue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      let actionResult: ActionResult = { success: true, message: 'Skipped' };
      let nextHandle: 'true' | 'false' | null = null;

      try {
        switch (node.type) {
          case 'action': actionResult = await executeDiscordAction(node, currentContext); break;
          case 'action-notion': actionResult = await executeNotionAction(node, currentContext); break;
          case 'action-http': 
            actionResult = await executeHttpRequestAction(node, currentContext); 
            if (actionResult.success && actionResult.extractedVariables) {
              currentContext.data = { ...currentContext.data, ...actionResult.extractedVariables };
            }
            break;
          case 'condition': 
            const conditionResult = await executeCondition(node, currentContext);
            actionResult = conditionResult;
            nextHandle = conditionResult.data?.result ? 'true' : 'false';
            break;
        }
        const logEntry: LogEntry = { workflowId, triggerId, actionId: nodeId, status: actionResult.success ? LogStatus.SUCCESS : LogStatus.FAILURE, message: actionResult.message, context: actionResult.data || {}, executionId };
        await prisma.log.create({ data: logEntry as any });
        executionLogs.push(logEntry);
        if (!actionResult.success) throw new Error(`Node ${nodeId} failed: ${actionResult.message}`);
        if (actionResult.data) currentContext.results[nodeId] = actionResult;
        const outgoingEdges = edges.filter((e) => e.source === nodeId);
        if (node.type === 'condition') {
          const targetEdge = outgoingEdges.find((e) => e.sourceHandle === nextHandle);
          if (targetEdge) executionQueue.push(targetEdge.target);
        } else outgoingEdges.forEach((e) => executionQueue.push(e.target));
      } catch (e: unknown) { throw e; }
    }
    return executionLogs;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown workflow error';
    const failLog: LogEntry = { workflowId, triggerId, status: LogStatus.FAILURE, message: `Workflow failed: ${errorMessage}`, context: data as Record<string, unknown>, executionId };
    await prisma.log.create({ data: failLog as any });
    if (overrideWorkflowData) {
        const history = await prisma.log.findMany({ where: { executionId } });
        return [...(history as unknown as LogEntry[]), failLog];
    }
  }
};
