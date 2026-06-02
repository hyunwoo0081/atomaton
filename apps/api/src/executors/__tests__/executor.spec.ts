// apps/api/src/executors/__tests__/executor.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect, vi } from 'vitest'
import axios from 'axios'
import {
  applyTemplate,
  executeCondition,
  splitDiscordMessage,
  resolveTemplates,
  executeRegexReplaceAction,
  executeGoogleBridgeAction,
} from '../executor'
import {
  WorkflowContext,
  WorkflowNode,
  ConditionConfig,
  ActionConfig,
  RegexReplaceActionConfig,
  GoogleBridgeActionConfig,
} from '../types'

vi.mock('axios', () => {
  return {
    default: {
      post: vi.fn(),
    },
  }
})

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

    it('should slice extremely long single lines without breaks', () => {
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
})
