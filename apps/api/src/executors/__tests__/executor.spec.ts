// apps/api/src/executors/__tests__/executor.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!';

import { describe, it, expect } from 'vitest';
import { applyTemplate, executeCondition } from '../executor';
import { WorkflowContext, WorkflowNode, ConditionConfig } from '../types';

describe('Executor Utilities', () => {

  describe('applyTemplate', () => {
    it('should replace a single variable correctly', () => {
      const template = 'Hello {{name}}!';
      const data = { name: 'World' };
      expect(applyTemplate(template, data)).toBe('Hello World!');
    });

    it('should replace multiple different variables', () => {
      const template = '{{greeting}}, {{name}}!';
      const data = { greeting: 'Hi', name: 'Atomaton' };
      expect(applyTemplate(template, data)).toBe('Hi, Atomaton!');
    });

    it('should replace the same variable multiple times', () => {
      const template = '{{a}} + {{a}} = 2{{a}}';
      const data = { a: 'x' };
      expect(applyTemplate(template, data)).toBe('x + x = 2x');
    });

    it('should leave the placeholder if the key is missing in data', () => {
      const template = 'Value: {{missing}}';
      const data = { other: 'value' };
      expect(applyTemplate(template, data)).toBe('Value: {{missing}}');
    });

    it('should handle special characters in data values correctly', () => {
      const template = 'Payload: {{json}}';
      const data = { json: '{"status": "ok"}' };
      expect(applyTemplate(template, data)).toBe('Payload: {"status": "ok"}');
    });
  });

  describe('executeCondition', () => {
    const mockContext: WorkflowContext = {
      workflowId: 'wf1',
      triggerId: 'tr1',
      executionId: 'ex1',
      data: {
        subject: 'Urgent Payment',
        amount: 50000,
        status: 'pending'
      },
      results: {}
    };

    const createConditionNode = (config: ConditionConfig): WorkflowNode => ({
      id: 'cond-1',
      type: 'condition',
      data: { label: 'Test Condition', config: config as any } // Casting config to ActionConfig
    });

    it('should return true for valid "contains" condition', async () => {
      const node = createConditionNode({
          conditions: [{ field: 'subject', operator: 'contains', value: 'Payment' }],
          logicType: 'AND'
      });
      const result = await executeCondition(node, mockContext);
      expect(result.data?.result).toBe(true);
    });

    it('should return true for valid "equals" condition', async () => {
      const node = createConditionNode({
          conditions: [{ field: 'status', operator: 'equals', value: 'pending' }],
          logicType: 'AND'
      });
      const result = await executeCondition(node, mockContext);
      expect(result.data?.result).toBe(true);
    });

    it('should return false if AND condition is not met', async () => {
      const node = createConditionNode({
          conditions: [
            { field: 'subject', operator: 'contains', value: 'Payment' },
            { field: 'status', operator: 'equals', value: 'completed' }
          ],
          logicType: 'AND'
      });
      const result = await executeCondition(node, mockContext);
      expect(result.data?.result).toBe(false);
    });

    it('should handle numeric comparison by converting to string', async () => {
      const node = createConditionNode({
          conditions: [{ field: 'amount', operator: 'equals', value: '50000' }],
          logicType: 'AND'
      });
      const result = await executeCondition(node, mockContext);
      expect(result.data?.result).toBe(true);
    });

    it('should return false (default) if the field does not exist in context data', async () => {
      const node = createConditionNode({
          conditions: [{ field: 'unknown_field', operator: 'equals', value: 'anything' }],
          logicType: 'AND'
      });
      const result = await executeCondition(node, mockContext);
      expect(result.data?.result).toBe(false);
    });
  });
});
