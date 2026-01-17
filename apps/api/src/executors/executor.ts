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
  const { webhookUrl, content } = action.config as any; // Assuming config contains webhookUrl and content
  const { data: contextData } = context;

  if (!webhookUrl || !content) {
    return { success: false, message: 'Discord webhook URL or content missing in action config' };
  }

  const templatedContent = applyTemplate(content, contextData);

  // --- Retry and Rate Limit Logic for Discord (Phase 2.4 / 2.5) ---
  const maxRetries = 5;
  const retryDelays = [1000, 5000, 30000, 120000, 600000]; // 1s, 5s, 30s, 2m, 10m

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // Basic rate limiting: Discord webhook limits are around 50 req/s per webhook URL globally.
      // This simple approach doesn't handle global limits, but avoids immediate retries
      // This can be improved with a more sophisticated rate limiter if needed.
      await new Promise(resolve => setTimeout(resolve, attempt > 0 ? retryDelays[attempt - 1] : 0));

      const response = await axios.post(webhookUrl, { content: templatedContent });

      if (response.status >= 200 && response.status < 300) {
        return { success: true, message: 'Discord action successful', data: response.data };
      } else if (response.status >= 400 && response.status < 500) {
        // 4xx errors - immediate failure, no retry
        console.error(`Discord action failed with 4xx status: ${response.status} - ${response.data?.message}`);
        return { success: false, message: `Discord action failed: ${response.data?.message || 'Client error'}` };
      } else {
        // 5xx errors - retry
        throw new Error(`Discord action failed with 5xx status: ${response.status}`);
      }
    } catch (error: any) {
      if (axios.isAxiosError(error) && error.response) {
        const statusCode = error.response.status;
        if (statusCode === 429) { // Rate limited
          const retryAfter = (error.response.headers['retry-after'] || 1) * 1000; // seconds to ms
          console.warn(`Discord rate limited. Retrying after ${retryAfter / 1000}s. Attempt ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryAfter));
          // Continue to next attempt
        } else if (statusCode >= 400 && statusCode < 500) {
          // Other 4xx errors, fail immediately
          return { success: false, message: `Discord action failed: ${error.response.data?.message || error.message}` };
        } else if (statusCode >= 500 && attempt < maxRetries - 1) {
          // 5xx errors, retry
          console.warn(`Discord action 5xx error (${statusCode}). Retrying in ${retryDelays[attempt] / 1000}s. Attempt ${attempt + 1}/${maxRetries}`);
          await new Promise(resolve => setTimeout(resolve, retryDelays[attempt]));
          // Continue to next attempt
        } else {
          // Non-retryable error or max retries reached for 5xx
          return { success: false, message: `Discord action failed: ${error.message}` };
        }
      } else if (attempt < maxRetries - 1) {
        // Network errors or other non-Axios errors, retry
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
  // TODO: Implement actual Notion API call
  return { success: true, message: 'Notion action simulated' };
};

export const executeWorkflow = async (context: WorkflowContext) => {
  const { workflowId, triggerId, executionId, data } = context;

  console.log(`Executing workflow ${workflowId} (Execution ID: ${executionId})`);

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id: workflowId },
      include: {
        trigger: {
          include: {
            rules: true,
          },
        },
        actions: {
          orderBy: {
            order: 'asc', // Execute actions in defined order
          },
        },
      },
    });

    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }
    if (!workflow.is_active) {
      console.log(`Workflow ${workflowId} is inactive. Skipping execution.`);
      return;
    }

    // --- Rule Evaluation (for Trigger) ---
    // For now, only for IMAP triggers based on email data
    let rulesPassed = true;
    if (workflow.trigger && workflow.trigger.type === 'IMAP_POLLING' && workflow.trigger.rules.length > 0) {
      for (const rule of workflow.trigger.rules) {
        const valueToEvaluate = data[rule.field]; // e.g., data.subject
        if (!valueToEvaluate) {
          rulesPassed = false; // Field not present in data
          break;
        }

        switch (rule.operator) {
          case 'contains':
            if (!String(valueToEvaluate).includes(rule.value)) {
              rulesPassed = false;
            }
            break;
          case 'equals':
            if (String(valueToEvaluate) !== rule.value) {
              rulesPassed = false;
            }
            break;
          default:
            console.warn(`Unknown rule operator: ${rule.operator}`);
            rulesPassed = false; // Treat unknown operator as failed
            break;
        }
        if (!rulesPassed) break; // If any rule fails, break
      }
    }

    if (!rulesPassed) {
      console.log(`Rules failed for workflow ${workflowId}. Skipping actions.`);
      await prisma.log.create({
        data: {
          workflowId,
          triggerId,
          status: LogStatus.SKIPPED,
          message: 'Workflow rules not met.',
          context: data,
          executionId,
        },
      });
      return;
    }

    // --- Action Execution ---
    let currentContext: WorkflowContext = { ...context }; // Pass context to actions
    for (const action of workflow.actions) {
      let actionResult;
      try {
        switch (action.type) {
          case 'DISCORD_WEBHOOK':
            actionResult = await executeDiscordAction(action, currentContext);
            break;
          case 'NOTION_PAGE':
            actionResult = await executeNotionAction(action, currentContext);
            break;
          default:
            console.warn(`Unknown action type: ${action.type}. Skipping.`);
            actionResult = { success: false, message: `Unknown action type: ${action.type}` };
            break;
        }

        if (!actionResult.success) {
          // If action fails, stop subsequent actions as per planning
          throw new Error(`Action ${action.id} failed: ${actionResult.message}`);
        }
        currentContext.results[action.id] = actionResult; // Store result for next actions

        await prisma.log.create({
          data: {
            workflowId,
            triggerId,
            actionId: action.id,
            status: LogStatus.SUCCESS,
            message: `Action ${action.id} executed successfully.`,
            context: actionResult,
            executionId,
          },
        });
      } catch (actionError: any) {
        console.error(`Error executing action ${action.id} for workflow ${workflowId}:`, actionError);
        // Log failure and stop workflow execution
        await prisma.log.create({
          data: {
            workflowId,
            triggerId,
            actionId: action.id,
            status: LogStatus.FAILURE,
            message: `Action ${action.id} failed: ${actionError.message}`,
            context: currentContext.data,
            executionId,
          },
        });
        throw actionError; // Re-throw to stop further actions and mark workflow as failed
      }
    }

    console.log(`Workflow ${workflowId} (Execution ID: ${executionId}) completed successfully.`);
    await prisma.log.create({
      data: {
        workflowId,
        triggerId,
        status: LogStatus.SUCCESS,
        message: 'Workflow completed successfully.',
        context: currentContext.data,
        executionId,
      },
    });

  } catch (error: any) {
    console.error(`Workflow ${workflowId} (Execution ID: ${executionId}) failed:`, error);
    await prisma.log.create({
      data: {
        workflowId,
        triggerId,
        status: LogStatus.FAILURE,
        message: `Workflow failed: ${error.message}`,
        context: data,
        executionId,
      },
    });
  }
};

