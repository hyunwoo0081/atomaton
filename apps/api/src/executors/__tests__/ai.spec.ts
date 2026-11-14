// apps/api/src/executors/__tests__/ai.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import {
  executeAiGenerateAction,
  executeAiCondition,
  executeWorkflow,
} from '../executor'
import {
  WorkflowContext,
  WorkflowNode,
  AiGenerateActionConfig,
  AiConditionConfig,
  UIConfig,
} from '../types'

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
      get: vi.fn(),
      isAxiosError: vi.fn((err) => !!err?.isAxiosError),
    },
  }
})

vi.mock('@atomaton/db', () => ({
  default: {
    workflow: { findUnique: vi.fn() },
    log: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  LogStatus: { SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
}))

describe('AI Action and Condition Executors', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('executeAiGenerateAction', () => {
    it('should fail if prompt is missing', async () => {
      const node: WorkflowNode = {
        id: 'ai-gen-1',
        type: 'action-ai',
        data: {
          label: 'AI Generate',
          config: {
            outputVariable: 'summary',
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const result = await executeAiGenerateAction(node, context)
      expect(result.success).toBe(false)
      expect(result.message).toContain('prompt is missing')
    })

    it('should fail if outputVariable is missing', async () => {
      const node: WorkflowNode = {
        id: 'ai-gen-1',
        type: 'action-ai',
        data: {
          label: 'AI Generate',
          config: {
            prompt: 'Summarize {{body}}',
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: { body: 'Hello world' },
        results: {},
      }

      const result = await executeAiGenerateAction(node, context)
      expect(result.success).toBe(false)
      expect(result.message).toContain('outputVariable is missing')
    })

    it('should generate text using default OpenAI endpoint and extract variable', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content: 'This is a concise summary.',
              },
            },
          ],
        },
      })

      const node: WorkflowNode = {
        id: 'ai-gen-1',
        type: 'action-ai',
        data: {
          label: 'AI Generate',
          config: {
            prompt: 'Summarize: {{trigger.text}}',
            apiKey: 'sk-test-key',
            outputVariable: 'ai_summary',
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: { trigger: { text: 'Long email content here' } },
        results: {},
      }

      const result = await executeAiGenerateAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.ai_summary).toBe(
        'This is a concise summary.'
      )
      expect(mockPost).toHaveBeenCalledWith(
        'https://api.openai.com/v1/chat/completions',
        expect.objectContaining({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'user',
              content: 'Summarize: Long email content here',
            },
          ],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            Authorization: 'Bearer sk-test-key',
          }),
        })
      )
    })

    it('should support custom AGY baseUrl and customHeaders with template resolution', async () => {
      const mockPost = vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content: 'AGY custom model response',
              },
            },
          ],
        },
      })

      const node: WorkflowNode = {
        id: 'ai-gen-custom',
        type: 'action-ai',
        data: {
          label: 'AGY Custom AI',
          config: {
            baseUrl: 'http://localhost:8080/v1',
            model: 'agy-reasoner-v1',
            systemPrompt: 'You are {{botName}}',
            prompt: 'Process {{item}}',
            outputVariable: 'agy_result',
            customHeaders: {
              'X-AGY-Token': 'agy-secret-{{token}}',
            },
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {
          botName: 'AtomatonBot',
          item: 'task-42',
          token: '12345',
        },
        results: {},
      }

      const result = await executeAiGenerateAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.agy_result).toBe(
        'AGY custom model response'
      )
      expect(mockPost).toHaveBeenCalledWith(
        'http://localhost:8080/v1/chat/completions',
        expect.objectContaining({
          model: 'agy-reasoner-v1',
          messages: [
            { role: 'system', content: 'You are AtomatonBot' },
            { role: 'user', content: 'Process task-42' },
          ],
        }),
        expect.objectContaining({
          headers: expect.objectContaining({
            'X-AGY-Token': 'agy-secret-12345',
          }),
        })
      )
    })

    it('should parse JSON output when responseFormat is json', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content: '{"sentiment": "positive", "score": 95}',
              },
            },
          ],
        },
      })

      const node: WorkflowNode = {
        id: 'ai-gen-json',
        type: 'action-ai',
        data: {
          label: 'AI JSON',
          config: {
            prompt: 'Analyze sentiment',
            responseFormat: 'json',
            outputVariable: 'parsed_data',
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const result = await executeAiGenerateAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.parsed_data).toEqual({
        sentiment: 'positive',
        score: 95,
      })
    })

    it('should retry on 500 error and succeed on second attempt', async () => {
      vi.useFakeTimers()
      const mockPost = vi
        .mocked(axios.post)
        .mockRejectedValueOnce({
          isAxiosError: true,
          response: { status: 500, data: 'Internal Server Error' },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: {
            choices: [{ message: { content: 'Success after retry' } }],
          },
        })

      const node: WorkflowNode = {
        id: 'ai-gen-retry',
        type: 'action-ai',
        data: {
          label: 'AI Generate',
          config: {
            prompt: 'Test retry',
            outputVariable: 'retry_output',
          } as AiGenerateActionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const promise = executeAiGenerateAction(node, context)
      await vi.advanceTimersByTimeAsync(1500)
      const result = await promise

      expect(result.success).toBe(true)
      expect(result.extractedVariables?.retry_output).toBe(
        'Success after retry'
      )
      expect(mockPost).toHaveBeenCalledTimes(2)
      vi.useRealTimers()
    })
  })

  describe('executeAiCondition', () => {
    it('should fail if inputText or criteria is missing', async () => {
      const node: WorkflowNode = {
        id: 'ai-cond-1',
        type: 'condition-ai',
        data: {
          label: 'AI Condition',
          config: {
            inputText: 'Some text',
          } as AiConditionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const result = await executeAiCondition(node, context)
      expect(result.success).toBe(false)
      expect(result.message).toContain('criteria is missing')
    })

    it('should evaluate true and extract reasoning variable with markdown stripped', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content:
                  '```json\n{"result": true, "reason": "Customer requests immediate server restart"}\n```',
              },
            },
          ],
        },
      })

      const node: WorkflowNode = {
        id: 'ai-cond-2',
        type: 'condition-ai',
        data: {
          label: 'AI Condition',
          config: {
            inputText: 'Server down! Restart immediately please.',
            criteria: 'Is this an urgent server incident?',
            reasoningVariable: 'ai_reason',
          } as AiConditionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const result = await executeAiCondition(node, context)
      expect(result.success).toBe(true)
      expect(result.data?.result).toBe(true)
      expect(result.data?.reason).toBe(
        'Customer requests immediate server restart'
      )
      expect(result.extractedVariables?.ai_reason).toBe(
        'Customer requests immediate server restart'
      )
    })

    it('should evaluate false when criteria is not met', async () => {
      vi.mocked(axios.post).mockResolvedValueOnce({
        status: 200,
        data: {
          choices: [
            {
              message: {
                content:
                  '{"result": false, "reason": "General billing question, not a bug"}',
              },
            },
          ],
        },
      })

      const node: WorkflowNode = {
        id: 'ai-cond-false',
        type: 'condition-ai',
        data: {
          label: 'AI Condition',
          config: {
            inputText: 'Where can I see my monthly invoice receipt?',
            criteria: 'Does the message report a technical bug?',
          } as AiConditionConfig,
        },
      }
      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-1',
        data: {},
        results: {},
      }

      const result = await executeAiCondition(node, context)
      expect(result.success).toBe(true)
      expect(result.data?.result).toBe(false)
    })
  })

  describe('Workflow Integration with AI Nodes', () => {
    it('should execute action-ai and pass generated variable to downstream node', async () => {
      vi.mocked(axios.post)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            choices: [
              {
                message: { content: 'Urgent notice summarized' },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { message_id: 'discord-msg-123' },
        })

      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-node',
            type: 'trigger-webhook',
            data: { label: 'Webhook', config: {} },
          },
          {
            id: 'ai-gen-node',
            type: 'action-ai',
            data: {
              label: 'AI Summarize',
              config: {
                prompt: 'Summarize: {{payload.body}}',
                outputVariable: 'ai_summary',
              } as AiGenerateActionConfig,
            },
          },
          {
            id: 'discord-node',
            type: 'action',
            data: {
              label: 'Discord Send',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/test',
                content: 'Summary: {{ai_summary}}',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-node', target: 'ai-gen-node' },
          { id: 'e2', source: 'ai-gen-node', target: 'discord-node' },
        ],
      }

      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-ai-flow',
        data: {
          payload: { body: 'Disk usage reached 98%' },
        },
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)
      expect(logs).toBeDefined()
      expect(logs?.length).toBe(2)
      expect(logs?.[0]?.status).toBe('SUCCESS')
      expect(logs?.[1]?.status).toBe('SUCCESS')

      expect(axios.post).toHaveBeenLastCalledWith(
        'https://discord.com/api/webhooks/test',
        {
          content: 'Summary: Urgent notice summarized',
        }
      )
    })

    it('should branch down true handle when condition-ai evaluates true', async () => {
      vi.mocked(axios.post)
        .mockResolvedValueOnce({
          status: 200,
          data: {
            choices: [
              {
                message: {
                  content: '{"result": true, "reason": "Refund requested"}',
                },
              },
            ],
          },
        })
        .mockResolvedValueOnce({
          status: 200,
          data: { ok: true },
        })

      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-node',
            type: 'trigger-webhook',
            data: { label: 'Webhook', config: {} },
          },
          {
            id: 'ai-cond-node',
            type: 'condition-ai',
            data: {
              label: 'Is Refund Request',
              config: {
                inputText: '{{message}}',
                criteria: 'Is this requesting a refund?',
              } as AiConditionConfig,
            },
          },
          {
            id: 'refund-action',
            type: 'action',
            data: {
              label: 'Refund Alert',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/refund',
                content: 'Refund branch reached',
              },
            },
          },
          {
            id: 'normal-action',
            type: 'action',
            data: {
              label: 'Normal Alert',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/normal',
                content: 'Normal branch reached',
              },
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-node', target: 'ai-cond-node' },
          {
            id: 'e-true',
            source: 'ai-cond-node',
            target: 'refund-action',
            sourceHandle: 'true',
          },
          {
            id: 'e-false',
            source: 'ai-cond-node',
            target: 'normal-action',
            sourceHandle: 'false',
          },
        ],
      }

      const context: WorkflowContext = {
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        executionId: 'exec-ai-cond-flow',
        data: {
          message: 'I want my money back please',
        },
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)
      expect(logs).toBeDefined()
      // ai-cond-node then refund-action only
      expect(logs?.length).toBe(2)
      expect(logs?.[0]?.actionId).toBe('ai-cond-node')
      expect(logs?.[1]?.actionId).toBe('refund-action')
    })
  })
})
