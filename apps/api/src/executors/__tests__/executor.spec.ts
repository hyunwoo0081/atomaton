// apps/api/src/executors/__tests__/executor.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect, vi, beforeEach } from 'vitest'
import axios from 'axios'
import {
  applyTemplate,
  executeCondition,
  splitDiscordMessage,
  resolveTemplates,
  executeRegexReplaceAction,
  executeGoogleBridgeAction,
  executeUrlDecodeAction,
  executeWorkflow,
} from '../executor'
import {
  WorkflowContext,
  WorkflowNode,
  ConditionConfig,
  DiscordActionConfig,
  HttpActionConfig,
  ActionConfig,
  RegexReplaceActionConfig,
  GoogleBridgeActionConfig,
  UrlDecodeActionConfig,
  UIConfig,
} from '../types'

vi.mock('axios', () => {
  const mockAxios = Object.assign(vi.fn(), {
    post: vi.fn(),
    isAxiosError: vi.fn(() => false),
  })
  return {
    default: mockAxios,
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

describe('Executor Utilities', () => {
  describe('applyTemplate', () => {
    it('should replace a single variable correctly', () => {
      const template = 'Hello {{name}}!'
      const data = { name: 'World' }
      expect(applyTemplate(template, data)).toBe('Hello World!')
    })

    it('should replace multiple different variables', () => {
      const template = '{{greeting}}, {{name}}!'
      const data = { greeting: 'Hi', name: 'Atomaton' }
      expect(applyTemplate(template, data)).toBe('Hi, Atomaton!')
    })

    it('should replace the same variable multiple times', () => {
      const template = '{{a}} + {{a}} = 2{{a}}'
      const data = { a: 'x' }
      expect(applyTemplate(template, data)).toBe('x + x = 2x')
    })

    it('should leave the placeholder if the key is missing in data', () => {
      const template = 'Value: {{missing}}'
      const data = { other: 'value' }
      expect(applyTemplate(template, data)).toBe('Value: {{missing}}')
    })

    it('should resolve nested paths correctly', () => {
      const template =
        'User: {{user.name}} ({{user.role}}), Post: {{posts[0].title}}'
      const data = {
        user: { name: 'Alice', role: 'admin' },
        posts: [{ title: 'First Post' }],
      }
      expect(applyTemplate(template, data)).toBe(
        'User: Alice (admin), Post: First Post'
      )
    })

    it('should handle special characters in data values correctly', () => {
      const template = 'Payload: {{json}}'
      const data = { json: '{"status": "ok"}' }
      expect(applyTemplate(template, data)).toBe('Payload: {"status": "ok"}')
    })
  })

  describe('resolveTemplates', () => {
    it('should recursively resolve string templates in objects', () => {
      const template = {
        title: 'Issue: {{subject}}',
        meta: {
          author: '{{user.name}}',
          active: true,
        },
      }
      const data = {
        subject: 'Database connection failed',
        user: { name: 'Alice' },
      }
      const result = resolveTemplates(template, data)
      expect(result).toEqual({
        title: 'Issue: Database connection failed',
        meta: {
          author: 'Alice',
          active: true,
        },
      })
    })

    it('should recursively resolve string templates in arrays', () => {
      const template = ['Hello {{name}}', { msg: 'System check: {{status}}' }]
      const data = {
        name: 'Bob',
        status: 'Green',
      }
      const result = resolveTemplates(template, data)
      expect(result).toEqual(['Hello Bob', { msg: 'System check: Green' }])
    })

    it('should prevent JSON injection by keeping injected quotes as literal string characters', () => {
      const template = {
        message: '{{input}}',
      }
      // Payload designed to inject new keys/values if string-replaced raw
      const data = {
        input: 'test", "isAdmin": true, "dummy": "',
      }
      const result = resolveTemplates(template, data) as Record<string, unknown>

      // Expect that it does NOT add 'isAdmin' as a key to the object
      expect(result.isAdmin).toBeUndefined()
      // Expect that 'message' contains the literal injected quote string
      expect(result.message).toBe('test", "isAdmin": true, "dummy": "')
    })
  })

  describe('splitDiscordMessage', () => {
    it('should not split if content is under the limit', () => {
      const content = 'Short message'
      const result = splitDiscordMessage(content, 20)
      expect(result).toEqual(['Short message'])
    })

    it('should split content by line breaks when exceeding limit', () => {
      const content = 'Line 1\nLine 2\nLine 3'
      const result = splitDiscordMessage(content, 10)
      expect(result).toEqual(['Line 1', 'Line 2', 'Line 3'])
    })

    it('should split intelligently by double newlines, newlines, sentence ends, and spaces', () => {
      const content =
        'First Paragraph.\n\nSecond paragraph that is slightly longer. It has multiple sentences. And some words.'
      const result = splitDiscordMessage(content, 50)
      expect(result[0]).toBe('First Paragraph.')
      expect(result[1]).toBe('Second paragraph that is slightly longer.')
      expect(result[2]).toBe('It has multiple sentences. And some words.')
    })

    it('should slice extremely long single words/lines as a fallback', () => {
      const content = '12345678901234567890'
      const result = splitDiscordMessage(content, 5)
      expect(result).toEqual(['12345', '67890', '12345', '67890'])
    })
  })

  describe('executeCondition', () => {
    const mockContext: WorkflowContext = {
      workflowId: 'wf1',
      triggerId: 'tr1',
      executionId: 'ex1',
      data: {
        subject: 'Urgent Payment',
        amount: 50000,
        status: 'pending',
      },
      results: {},
    }

    const createConditionNode = (config: ConditionConfig): WorkflowNode => ({
      id: 'cond-1',
      type: 'condition',
      data: {
        label: 'Test Condition',
        config: config as unknown as ActionConfig,
      },
    })

    it('should return true for valid "contains" condition', async () => {
      const node = createConditionNode({
        conditions: [
          { field: 'subject', operator: 'contains', value: 'Payment' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(true)
    })

    it('should return true for valid "equals" condition', async () => {
      const node = createConditionNode({
        conditions: [{ field: 'status', operator: 'equals', value: 'pending' }],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(true)
    })

    it('should return false if AND condition is not met', async () => {
      const node = createConditionNode({
        conditions: [
          { field: 'subject', operator: 'contains', value: 'Payment' },
          { field: 'status', operator: 'equals', value: 'completed' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(false)
    })

    it('should handle numeric comparison by converting to string', async () => {
      const node = createConditionNode({
        conditions: [{ field: 'amount', operator: 'equals', value: '50000' }],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(true)
    })

    it('should return false (default) if the field does not exist in context data', async () => {
      const node = createConditionNode({
        conditions: [
          { field: 'unknown_field', operator: 'equals', value: 'anything' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(false)
    })

    it('should resolve nested paths inside results or data correctly', async () => {
      const contextWithResults: WorkflowContext = {
        ...mockContext,
        results: {
          node1: {
            success: true,
            message: 'Done',
            data: { status: 'approved', count: 123 },
          },
        },
      }
      const node = createConditionNode({
        conditions: [
          {
            field: 'results.node1.data.status',
            operator: 'equals',
            value: 'approved',
          },
          { field: 'data.status', operator: 'equals', value: 'pending' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, contextWithResults)
      expect(result.data?.result).toBe(true)
    })

    it('should check startsWith and endsWith operators correctly', async () => {
      const node = createConditionNode({
        conditions: [
          { field: 'subject', operator: 'startsWith', value: 'Urgent' },
          { field: 'subject', operator: 'endsWith', value: 'Payment' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(true)
    })

    it('should check regex operator correctly', async () => {
      const node = createConditionNode({
        conditions: [
          { field: 'subject', operator: 'regex', value: 'Urgent\\s\\w+' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, mockContext)
      expect(result.data?.result).toBe(true)
    })

    it('should check numeric gt, gte, lt, lte operators correctly', async () => {
      const nodeGt = createConditionNode({
        conditions: [{ field: 'amount', operator: 'gt', value: '49999' }],
      })
      const nodeLt = createConditionNode({
        conditions: [{ field: 'amount', operator: 'lt', value: '50001' }],
      })
      const resultGt = await executeCondition(nodeGt, mockContext)
      const resultLt = await executeCondition(nodeLt, mockContext)
      expect(resultGt.data?.result).toBe(true)
      expect(resultLt.data?.result).toBe(true)
    })

    it('should check isEmpty and isNotEmpty operators correctly', async () => {
      const contextWithEmpty: WorkflowContext = {
        ...mockContext,
        data: {
          emptyStr: '',
          nonEmptyStr: 'hello',
          emptyArr: [],
          emptyObj: {},
          nullVal: null,
        },
      }
      const node = createConditionNode({
        conditions: [
          { field: 'emptyStr', operator: 'isEmpty' },
          { field: 'nonEmptyStr', operator: 'isNotEmpty' },
          { field: 'emptyArr', operator: 'isEmpty' },
          { field: 'emptyObj', operator: 'isEmpty' },
          { field: 'nullVal', operator: 'isEmpty' },
          { field: 'nonExistent', operator: 'isEmpty' },
        ],
        logicType: 'AND',
      })
      const result = await executeCondition(node, contextWithEmpty)
      expect(result.data?.result).toBe(true)
    })

    it('should support dynamic templated comparison values', async () => {
      const contextDynamic: WorkflowContext = {
        ...mockContext,
        data: {
          username: 'alice',
          expectedUser: 'alice',
        },
      }
      const node = createConditionNode({
        conditions: [
          {
            field: 'username',
            operator: 'equals',
            value: '{{data.expectedUser}}',
          },
        ],
      })
      const result = await executeCondition(node, contextDynamic)
      expect(result.data?.result).toBe(true)
    })
  })

  describe('executeRegexReplaceAction', () => {
    it('should perform sequential regex replacement', async () => {
      const node: WorkflowNode = {
        id: 'regex-1',
        type: 'action-regex-replace',
        data: {
          label: 'Test Regex',
          config: {
            inputText: 'Error: Database connection failed. Please retry.',
            rules: [
              { pattern: 'Error:\\s', replacement: '' },
              { pattern: 'failed', replacement: 'succeeded' },
            ],
            outputVariable: 'cleanMsg',
          } as RegexReplaceActionConfig,
        },
      }

      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex1',
        data: {},
        results: {},
      }

      const result = await executeRegexReplaceAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.cleanMsg).toBe(
        'Database connection succeeded. Please retry.'
      )
    })

    it('should support templates inside input and replacement', async () => {
      const node: WorkflowNode = {
        id: 'regex-1',
        type: 'action-regex-replace',
        data: {
          label: 'Test Regex',
          config: {
            inputText: 'Hello {{data.name}}',
            rules: [
              { pattern: 'Hello', replacement: 'Goodbye {{data.prefix}}' },
            ],
            outputVariable: 'greeting',
          } as RegexReplaceActionConfig,
        },
      }

      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex1',
        data: { name: 'Alice', prefix: 'Dr.' },
        results: {},
      }

      const result = await executeRegexReplaceAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.greeting).toBe('Goodbye Dr. Alice')
    })
  })

  describe('executeGoogleBridgeAction', () => {
    it('should call the GAS web app with correct action and payload', async () => {
      const node: WorkflowNode = {
        id: 'bridge-1',
        type: 'action-google-bridge',
        data: {
          label: 'Test Google Bridge',
          config: {
            webAppUrl: 'https://script.google.com/macros/s/123/exec',
            action: 'APPEND_ROW',
            payload: {
              spreadsheetId: 'sheet123',
              rowValues: ['{{data.val1}}', '{{data.val2}}'],
            },
          } as GoogleBridgeActionConfig,
        },
      }

      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex1',
        data: { val1: 'foo', val2: 'bar' },
        results: {},
      }

      const mockResponse = {
        status: 200,
        data: { success: true, message: 'Done' },
      }
      vi.mocked(axios.post).mockResolvedValueOnce(mockResponse)

      const result = await executeGoogleBridgeAction(node, context)
      expect(result.success).toBe(true)
      expect(result.data).toEqual({ success: true, message: 'Done' })
      expect(axios.post).toHaveBeenCalledWith(
        'https://script.google.com/macros/s/123/exec',
        {
          action: 'APPEND_ROW',
          payload: {
            spreadsheetId: 'sheet123',
            rowValues: ['foo', 'bar'],
          },
        },
        expect.any(Object)
      )
    })
  })

  describe('executeUrlDecodeAction', () => {
    it('should find and decode URL-encoded links in text', async () => {
      const node: WorkflowNode = {
        id: 'url-1',
        type: 'action-url-decode',
        data: {
          label: 'Test URL Decode',
          config: {
            inputText:
              'Link 1: https://example.com/search?q=%EB%B0%A9%EA%B2%BD and Link 2: http://test.com/path%20to%20file',
            outputVariable: 'decodedText',
          } as UrlDecodeActionConfig,
        },
      }

      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex1',
        data: {},
        results: {},
      }

      const result = await executeUrlDecodeAction(node, context)
      expect(result.success).toBe(true)
      expect(result.extractedVariables?.decodedText).toBe(
        'Link 1: https://example.com/search?q=방경 and Link 2: http://test.com/path to file'
      )
    })
  })

  describe('executeWorkflow with startNodeId (Multi-trigger support)', () => {
    it('should start execution specifically from startNodeId when provided', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-1',
            type: 'trigger-webhook',
            data: { label: 'Webhook 1', config: {} },
          },
          {
            id: 'trig-2',
            type: 'trigger-webhook',
            data: { label: 'Webhook 2', config: {} },
          },
          {
            id: 'action-1',
            type: 'action-url-decode',
            data: {
              label: 'Action 1',
              config: {
                inputText: 'http://test.com/%ED%95%9C%EA%B8%80',
                outputVariable: 'res1',
              } as UrlDecodeActionConfig,
            },
          },
          {
            id: 'action-2',
            type: 'action-url-decode',
            data: {
              label: 'Action 2',
              config: {
                inputText: 'http://test.com/%EC%84%B1%EA%B3%B5',
                outputVariable: 'res2',
              } as UrlDecodeActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-1', target: 'action-1' },
          { id: 'e2', source: 'trig-2', target: 'action-2' },
        ],
      }

      const context: WorkflowContext = {
        workflowId: 'wf-multi',
        triggerId: 'trig-db-2',
        executionId: 'ex-2',
        startNodeId: 'trig-2',
        data: {},
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)
      expect(logs).toBeDefined()

      // Only action-2 should have been executed, action-1 should NOT be executed
      const actionIds = logs?.map((l) => l.actionId)
      expect(actionIds).toContain('action-2')
      expect(actionIds).not.toContain('action-1')
    })
  })

  describe('Trigger sample injection ({{trigger.xxx}} template & condition resolution)', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should resolve {{trigger.subject}}, {{trigger.from}}, and custom injected fields across conditions, regex, HTTP, and Discord actions', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'imap-trig-1',
            type: 'trigger',
            data: {
              label: 'IMAP Email',
              config: {
                accountId: 'acc-1',
                samplePayload: JSON.stringify({
                  subject: 'Urgent Invoice',
                  from: 'billing@example.com',
                  customTag: 'VIP',
                }),
              },
            },
          },
          {
            id: 'cond-1',
            type: 'condition',
            data: {
              label: 'Check Trigger Fields',
              config: {
                logicType: 'AND',
                conditions: [
                  {
                    field: 'trigger.subject',
                    operator: 'contains',
                    value: 'Invoice',
                  },
                  {
                    field: 'trigger.from',
                    operator: 'equals',
                    value: '{{trigger.expectedSender}}',
                  },
                ],
              } as ConditionConfig,
            },
          },
          {
            id: 'regex-1',
            type: 'action-regex-replace',
            data: {
              label: 'Format Subject',
              config: {
                inputText: '[{{trigger.customTag}}] {{trigger.subject}}',
                rules: [{ pattern: 'Urgent', replacement: 'Priority' }],
                outputVariable: 'formattedSubject',
              } as RegexReplaceActionConfig,
            },
          },
          {
            id: 'http-1',
            type: 'action-http',
            data: {
              label: 'Forward via HTTP',
              config: {
                method: 'POST',
                url: 'https://api.example.com/notify?sender={{trigger.from}}',
                body: JSON.stringify({
                  subject: '{{formattedSubject}}',
                  sender: '{{trigger.from}}',
                }),
              } as HttpActionConfig,
            },
          },
          {
            id: 'discord-1',
            type: 'action',
            data: {
              label: 'Send Discord Alert',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/test',
                content:
                  'Mail from {{trigger.from}}: {{formattedSubject}} ({{trigger.customTag}})',
              } as DiscordActionConfig,
            },
          },
          {
            id: 'discord-false',
            type: 'action',
            data: {
              label: 'Fallback False Branch',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/false',
                content: 'Should not run',
              } as DiscordActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'imap-trig-1', target: 'cond-1' },
          {
            id: 'e2',
            source: 'cond-1',
            sourceHandle: 'true',
            target: 'regex-1',
          },
          {
            id: 'e3',
            source: 'cond-1',
            sourceHandle: 'false',
            target: 'discord-false',
          },
          { id: 'e4', source: 'regex-1', target: 'http-1' },
          { id: 'e5', source: 'http-1', target: 'discord-1' },
        ],
      }

      const mockedAxios = vi.mocked(axios) as unknown as ReturnType<
        typeof vi.fn
      >
      mockedAxios.mockResolvedValueOnce({ status: 200, data: { ok: true } })
      vi.mocked(axios.post).mockResolvedValueOnce({ status: 204, data: {} })

      const context: WorkflowContext = {
        workflowId: 'wf-sim-1',
        triggerId: 'test-trigger',
        startNodeId: 'imap-trig-1',
        executionId: 'ex-sim-1',
        data: {
          subject: 'Urgent Invoice #42',
          from: 'billing@example.com',
          expectedSender: 'billing@example.com',
          customTag: 'VIP',
          body: 'Please review invoice #42.',
        },
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)

      expect(logs).toBeDefined()
      expect(logs?.every((l) => l.status === 'SUCCESS')).toBe(true)

      const executedIds = logs?.map((l) => l.actionId)
      expect(executedIds).toEqual(['cond-1', 'regex-1', 'http-1', 'discord-1'])
      expect(executedIds).not.toContain('discord-false')

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          method: 'POST',
          url: 'https://api.example.com/notify?sender=billing@example.com',
          data: {
            subject: '[VIP] Priority Invoice #42',
            sender: 'billing@example.com',
          },
        })
      )

      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/test',
        {
          content:
            'Mail from billing@example.com: [VIP] Priority Invoice #42 (VIP)',
        }
      )
    })

    it('should route to false branch when injected trigger sample fails condition on trigger.xxx', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'wh-trig-1',
            type: 'trigger-webhook',
            data: { label: 'Webhook', config: {} },
          },
          {
            id: 'cond-1',
            type: 'condition',
            data: {
              label: 'Amount Check',
              config: {
                logicType: 'AND',
                conditions: [
                  { field: 'trigger.amount', operator: 'gt', value: '50000' },
                ],
              } as ConditionConfig,
            },
          },
          {
            id: 'discord-true',
            type: 'action',
            data: {
              label: 'High Amount',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/true',
                content: 'High',
              } as DiscordActionConfig,
            },
          },
          {
            id: 'discord-false',
            type: 'action',
            data: {
              label: 'Normal Amount',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/false',
                content: 'Normal amount: {{trigger.amount}}',
              } as DiscordActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'wh-trig-1', target: 'cond-1' },
          {
            id: 'e2',
            source: 'cond-1',
            sourceHandle: 'true',
            target: 'discord-true',
          },
          {
            id: 'e3',
            source: 'cond-1',
            sourceHandle: 'false',
            target: 'discord-false',
          },
        ],
      }

      vi.mocked(axios.post).mockResolvedValueOnce({ status: 204, data: {} })

      const context: WorkflowContext = {
        workflowId: 'wf-sim-2',
        triggerId: 'test-trigger',
        startNodeId: 'wh-trig-1',
        executionId: 'ex-sim-2',
        data: { amount: 25000 },
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)

      expect(logs).toBeDefined()
      const executedIds = logs?.map((l) => l.actionId)
      expect(executedIds).toEqual(['cond-1', 'discord-false'])
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/false',
        { content: 'Normal amount: 25000' }
      )
    })
  })

  describe('1:N Fan-Out, Diamond Merge, and {{var}} Condition Normalization', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should execute multiple branches from condition true handle and normalize {{variable}} in condition field', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-1',
            type: 'trigger-webhook',
            data: { label: 'Webhook', config: {} },
          },
          {
            id: 'cond-1',
            type: 'condition',
            data: {
              label: 'Status Check',
              config: {
                logicType: 'AND',
                conditions: [
                  { field: '{{status}}', operator: 'equals', value: 'paid' },
                ],
              } as ConditionConfig,
            },
          },
          {
            id: 'act-true-1',
            type: 'action-url-decode',
            data: {
              label: 'True Branch 1',
              config: {
                inputText: 'https://example.com/%ED%95%9C%EA%B8%80',
                outputVariable: 'var1',
              } as UrlDecodeActionConfig,
            },
          },
          {
            id: 'act-true-2',
            type: 'action-regex-replace',
            data: {
              label: 'True Branch 2',
              config: {
                inputText: 'paid_order',
                rules: [{ pattern: 'paid', replacement: 'ok' }],
                outputVariable: 'var2',
              } as RegexReplaceActionConfig,
            },
          },
          {
            id: 'act-false-1',
            type: 'action-regex-replace',
            data: {
              label: 'False Branch',
              config: {
                inputText: 'fail',
                rules: [],
                outputVariable: 'var3',
              } as RegexReplaceActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-1', target: 'cond-1' },
          {
            id: 'e2',
            source: 'cond-1',
            sourceHandle: 'true',
            target: 'act-true-1',
          },
          {
            id: 'e3',
            source: 'cond-1',
            sourceHandle: 'true',
            target: 'act-true-2',
          },
          {
            id: 'e4',
            source: 'cond-1',
            sourceHandle: 'false',
            target: 'act-false-1',
          },
        ],
      }

      const context: WorkflowContext = {
        workflowId: 'wf-fanout',
        triggerId: 'tr-1',
        executionId: 'ex-fanout',
        data: { status: 'paid' },
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)
      const executedIds = logs?.map((l) => l.actionId)
      expect(executedIds).toContain('cond-1')
      expect(executedIds).toContain('act-true-1')
      expect(executedIds).toContain('act-true-2')
      expect(executedIds).not.toContain('act-false-1')
    })

    it('should wait for all active upstream branches on parallel diamond merge', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-1',
            type: 'trigger-webhook',
            data: { label: 'Trigger', config: {} },
          },
          {
            id: 'branch-b',
            type: 'action-regex-replace',
            data: {
              label: 'Branch B',
              config: {
                inputText: 'B_DONE',
                rules: [],
                outputVariable: 'resB',
              } as RegexReplaceActionConfig,
            },
          },
          {
            id: 'branch-c',
            type: 'action-url-decode',
            data: {
              label: 'Branch C',
              config: {
                inputText: 'C%20DONE',
                outputVariable: 'resC',
              } as UrlDecodeActionConfig,
            },
          },
          {
            id: 'merge-d',
            type: 'action',
            data: {
              label: 'Discord Merge',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/merge',
                content: 'Merged: {{resB}} & {{resC}}',
              } as DiscordActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-1', target: 'branch-b' },
          { id: 'e2', source: 'trig-1', target: 'branch-c' },
          { id: 'e3', source: 'branch-b', target: 'merge-d' },
          { id: 'e4', source: 'branch-c', target: 'merge-d' },
        ],
      }

      vi.mocked(axios.post).mockResolvedValueOnce({ status: 204, data: {} })

      const context: WorkflowContext = {
        workflowId: 'wf-diamond',
        triggerId: 'tr-1',
        executionId: 'ex-diamond',
        data: {},
        results: {},
      }

      const logs = await executeWorkflow(context, uiConfig)
      const executedIds = logs?.map((l) => l.actionId)

      expect(executedIds).toHaveLength(3)
      expect(executedIds?.[2]).toBe('merge-d')
      expect(axios.post).toHaveBeenCalledTimes(1)
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/merge',
        { content: 'Merged: B_DONE & C%20DONE' }
      )
    })

    it('should execute merge node once when conditional sibling branch is skipped', async () => {
      const uiConfig: UIConfig = {
        nodes: [
          {
            id: 'trig-1',
            type: 'trigger-webhook',
            data: { label: 'Trigger', config: {} },
          },
          {
            id: 'cond-1',
            type: 'condition',
            data: {
              label: 'Cond',
              config: {
                conditions: [
                  { field: 'flag', operator: 'equals', value: 'yes' },
                ],
              } as ConditionConfig,
            },
          },
          {
            id: 'branch-true',
            type: 'action-regex-replace',
            data: {
              label: 'True Path',
              config: {
                inputText: 'FROM_TRUE',
                rules: [],
                outputVariable: 'pathResult',
              } as RegexReplaceActionConfig,
            },
          },
          {
            id: 'branch-false',
            type: 'action-regex-replace',
            data: {
              label: 'False Path',
              config: {
                inputText: 'FROM_FALSE',
                rules: [],
                outputVariable: 'pathResult',
              } as RegexReplaceActionConfig,
            },
          },
          {
            id: 'merge-d',
            type: 'action',
            data: {
              label: 'Merge Action',
              config: {
                webhookUrl: 'https://discord.com/api/webhooks/cond-merge',
                content: 'Result={{pathResult}}',
              } as DiscordActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 'trig-1', target: 'cond-1' },
          {
            id: 'e2',
            source: 'cond-1',
            sourceHandle: 'true',
            target: 'branch-true',
          },
          {
            id: 'e3',
            source: 'cond-1',
            sourceHandle: 'false',
            target: 'branch-false',
          },
          { id: 'e4', source: 'branch-true', target: 'merge-d' },
          { id: 'e5', source: 'branch-false', target: 'merge-d' },
        ],
      }

      vi.mocked(axios.post).mockResolvedValueOnce({ status: 204, data: {} })

      const logs = await executeWorkflow(
        {
          workflowId: 'wf-cond-diamond',
          triggerId: 'tr-1',
          executionId: 'ex-cond-diamond',
          data: { flag: 'yes' },
          results: {},
        },
        uiConfig
      )

      const executedIds = logs?.map((l) => l.actionId)
      expect(executedIds).toEqual(['cond-1', 'branch-true', 'merge-d'])
      expect(axios.post).toHaveBeenCalledTimes(1)
      expect(axios.post).toHaveBeenCalledWith(
        'https://discord.com/api/webhooks/cond-merge',
        { content: 'Result=FROM_TRUE' }
      )
    })
  })
})
