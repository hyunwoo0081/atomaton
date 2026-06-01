// apps/api/src/executors/__tests__/executor.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect } from 'vitest'
import {
  applyTemplate,
  executeCondition,
  splitDiscordMessage,
  resolveTemplates,
} from '../executor'
import {
  WorkflowContext,
  WorkflowNode,
  ConditionConfig,
  ActionConfig,
} from '../types'

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
  })
})
