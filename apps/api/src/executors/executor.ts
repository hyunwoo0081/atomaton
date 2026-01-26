// apps/api/src/executors/executor.ts
import { WorkflowContext } from './types';
import prisma, { Action, Trigger, LogStatus } from '@atomaton/db';
import axios from 'axios';

// --- Templating Utility ---
const applyTemplate = (template: string, data: Record<string, any>): string => {
  let result = template;
  for (const key in data) {
    result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), data[key]);
  }
  return result;
};

// --- Action Execution Functions ---

const executeDiscordAction = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; data?: any }> => {
  const { webhookUrl, content } = action.config as any;
  const { data: contextData } = context;

  if (!webhookUrl || !content) {
    return { success: false, message: 'Discord webhook URL or content missing in action config' };
  }

  const templatedContent = applyTemplate(content, contextData);

  const maxRetries = 5;
  const retryDelays = [1000, 5000, 30000, 120000, 600000];

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      await new Promise(resolve => setTimeout(resolve, attempt > 0 ? retryDelays[attempt - 1] : 0));
      const response = await axios.post(webhookUrl, { content: templatedContent });

      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: 'Discord action successful', data: response.data };
      } else if (response.status >= 400 && response.status < 500) {
        console.error(`Discord action failed with 4xx status: ${response.status} - ${response.data?.message}`);
        return { success: false, message: `Discord action failed: ${response.data?.message || 'Client error'}` };
      } else {
        throw new Error(`Discord action failed with 5xx status: ${response.status}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        if (statusCode === 429) {
          const retryAfter = (error.response.headers['retry-after'] || 1) * 1000;
          console.warn(`Discord rate limited. Retrying after ${retryAfter / 1000}s. Attempt ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
        } else if (statusCode >= 400 && statusCode < 500) {
          return { success: false, message: `Discord action failed: ${error.response.data?.message || error.message}` };
        } else if (statusCode >= 500 && attempt < maxRetries - 1) {
          console.warn(`Discord action 5xx error (${statusCode}). Retrying in ${retryDelays[attempt] / 1000}s. Attempt ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
        } else {
          return { success: false, message: `Discord action failed: ${error.message}` };
        }
      } else if (attempt < maxRetries - 1) {
        console.warn(`Discord action network error. Retrying in ${retryDelays[attempt] / 1000}s. Attempt ${attempt + 1}/${maxRetries}`);
        await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
      } else {
        return { success: false, message: `Discord action failed: ${error.message}` };
      }
    }
  }
  return { success: false, message: 'Discord action failed after multiple retries' };
};

const executeNotionAction = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; data?: any }> => {
  console.log('Executing Notion action with config:', action.config, 'and context:', context);
  return { success: true, message: 'Notion action simulated' };
};

const executeCondition = async (action: Action, context: WorkflowContext): Promise<{ success: boolean; message: string; nextNodeId?: string; data?: any }> => {
  const { conditions } = action.config as any;
  const { data: contextData } = context;
  const logicType = (action.config as any).logicType || 'AND';

  if (!conditions || !Array.isArray(conditions)) {
    return { success: false, message: 'Invalid condition configuration' };
  }

  let result = logicType === 'AND'; // Default for AND is true, OR is false

  for (const condition of conditions) {
    const { field, operator, value } = condition;
    const dataValue = contextData[field];
    let conditionMet = false;

    if (dataValue !== undefined) {
      switch (operator) {
        case 'contains':
          conditionMet = String(dataValue).includes(value);
          break;
        case 'equals':
          conditionMet = String(dataValue) === value;
          break;
        default:
          conditionMet = false;
      }
    }

    if (logicType === 'AND') {
      if (!conditionMet) {
        result = false;
        break;
      }
    } else { // OR
      if (conditionMet) {
        result = true;
        break;
      }
    }
  }

  return { success: true, message: `Condition evaluated to ${result}`, data: { result } };
};

export const executeWorkflow = async (context: WorkflowContext, overrideWorkflowData?: { nodes: any[], edges: any[], settings?: any }) => {
  const { workflowId, triggerId, executionId, data } = context;

  console.log(`Executing workflow ${workflowId} (Execution ID: ${executionId})`);

  try {
    let uiConfig: any;
    let settings: any;
    let workflowName = 'Test Workflow';

    if (overrideWorkflowData) {
      // Use provided data for testing
      uiConfig = { nodes: overrideWorkflowData.nodes, edges: overrideWorkflowData.edges };
      settings = overrideWorkflowData.settings;
    } else {
      // Fetch from DB
      const workflow = await prisma.workflow.findUnique({
        where: { id: workflowId },
      });

      if (!workflow) {
        throw new Error(`Workflow ${workflowId} not found`);
      }
      if (!workflow.is_active) {
        console.log(`Workflow ${workflowId} is inactive. Skipping execution.`);
        return;
      }
      uiConfig = workflow.ui_config;
      settings = workflow.settings;
      workflowName = workflow.name;
    }

    if (!uiConfig || !uiConfig.nodes || !uiConfig.edges) {
      throw new Error('Workflow UI config is missing or invalid');
    }

    const { nodes, edges } = uiConfig;
    
    const triggerNode = nodes.find((n: any) => n.type.startsWith('trigger'));
    if (!triggerNode) {
      throw new Error('No trigger node found in workflow');
    }

    let startNodeId: string = triggerNode.id; // Changed variable name and type
    let currentContext: WorkflowContext = { ...context };

    const queue: string[] = [];
    
    const nextEdges = edges.filter((e: any) => e.source === startNodeId);
    nextEdges.forEach((e: any) => queue.push(e.target));

    const visited = new Set<string>();
    visited.add(startNodeId);

    // Logs for test execution return
    const executionLogs: any[] = [];

    while (queue.length > 0) {
      const nodeId = queue.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const node = nodes.find((n: any) => n.id === nodeId);
      if (!node) continue;

      console.log(`Processing node ${nodeId} (${node.type})`);

      let actionResult: { success: boolean; message: string; data?: any } = { success: true, message: 'Skipped' };
      let nextHandle: string | null = null;

      try {
        const actionModel = { ...node, config: node.data.config } as unknown as Action;

        switch (node.type) {
          case 'action':
            actionResult = await executeDiscordAction(actionModel, currentContext);
            break;
          case 'action-notion':
            actionResult = await executeNotionAction(actionModel, currentContext);
            break;
          case 'condition':
            const conditionResult = await executeCondition(actionModel, currentContext);
            actionResult = conditionResult;
            nextHandle = conditionResult.data?.result ? 'true' : 'false';
            break;
          default:
            console.warn(`Unknown node type: ${node.type}`);
            break;
        }

        const logEntry = {
          workflowId,
          triggerId,
          actionId: nodeId,
          status: actionResult.success ? LogStatus.SUCCESS : LogStatus.FAILURE,
          message: actionResult.message,
          context: actionResult.data,
          executionId,
        };

        // Save log to DB only if not testing (or if we want to log tests too, but usually tests are transient)
        // For now, we log everything to DB for simplicity and history
        await prisma.log.create({ data: logEntry });
        executionLogs.push(logEntry);

        if (!actionResult.success) {
          throw new Error(`Node ${nodeId} failed: ${actionResult.message}`);
        }

        if (actionResult.data) {
            currentContext.results[nodeId] = actionResult;
        }

        const outgoingEdges = edges.filter((e: any) => e.source === nodeId);
        
        if (node.type === 'condition') {
          const targetEdge = outgoingEdges.find((e: any) => e.sourceHandle === nextHandle);
          if (targetEdge) {
            queue.push(targetEdge.target);
          }
        } else {
          outgoingEdges.forEach((e: any) => queue.push(e.target));
        }

      } catch (nodeError: any) {
        console.error(`Error executing node ${nodeId}:`, nodeError);
        const errorLog = {
          workflowId,
          triggerId,
          actionId: nodeId,
          status: LogStatus.FAILURE,
          message: `Execution stopped: ${nodeError.message}`,
          context: currentContext.data,
          executionId,
        };
        await prisma.log.create({ data: errorLog });
        executionLogs.push(errorLog);
        throw nodeError;
      }
    }

    console.log(`Workflow ${workflowId} execution completed.`);
    const successLog = {
      workflowId,
      triggerId,
      status: LogStatus.SUCCESS,
      message: 'Workflow execution completed successfully.',
      context: currentContext.data,
      executionId,
    };
    await prisma.log.create({ data: successLog });
    executionLogs.push(successLog);

    return executionLogs; // Return logs for test API

  } catch (error: any) {
    console.error(`Workflow ${workflowId} failed:`, error);
    
    if (!overrideWorkflowData) { // Only send notification for real executions
        try {
            const workflow = await prisma.workflow.findUnique({ where: { id: workflowId } });
            const settings = workflow?.settings as any;
            if (settings?.enableFailureAlert && settings?.failureWebhookUrl) {
                await axios.post(settings.failureWebhookUrl, {
                    content: `🚨 **Workflow Failed**: ${workflow?.name}\n**Error**: ${error.message}\n**Execution ID**: ${executionId}`
                });
            }
        } catch (notifyError) {
            console.error('Failed to send failure notification:', notifyError);
        }
    }

    const failLog = {
      workflowId,
      triggerId,
      status: LogStatus.FAILURE,
      message: `Workflow failed: ${error.message}`,
      context: data,
      executionId,
    };
    await prisma.log.create({ data: failLog });
    
    // If testing, return logs including failure
    if (overrideWorkflowData) {
        return [...(await prisma.log.findMany({ where: { executionId } })), failLog];
    }
  }
};
