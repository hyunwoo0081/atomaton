// apps/api/src/executors/__tests__/http.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!';

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import axios from 'axios';
import { resolvePath, executeWorkflow } from '../executor';
import { WorkflowContext } from '../types';

// Mock everything
vi.mock('axios', () => {
  const mockAxios = vi.fn();
  (mockAxios as any).post = vi.fn();
  return { default: mockAxios };
});

vi.mock('@atomaton/db', () => ({
  default: {
    workflow: { findUnique: vi.fn() },
    log: { 
      create: vi.fn().mockResolvedValue({}), 
      findMany: vi.fn().mockResolvedValue([]) 
    },
  },
  LogStatus: { SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' }
}));

describe('HTTP Request Node & Path Resolution', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('resolvePath', () => {
    it('should resolve deep paths', () => {
      const data = { a: { b: [{ c: 'target' }] } };
      expect(resolvePath(data, 'a.b[0].c')).toBe('target');
    });
  });

  describe('executeHttpRequestAction', () => {
    
    it('should extract variables and pass to next node', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1', triggerId: 'tr1', executionId: 'ex1', 
        data: { msg: 'hello' }, results: {}
      };

      const workflow = {
        nodes: [
          { id: 't1', type: 'trigger', data: {} },
          { id: 'h1', type: 'action-http', data: { config: { 
            method: 'POST', url: 'https://api.com', body: '{"m":"{{msg}}"}',
            responseMapping: [{ sourcePath: 'ans', targetVariable: 'res' }]
          } } },
          { id: 'd1', type: 'action', data: { config: { 
            webhookUrl: 'https://disc.com', content: 'Result: {{res}}' 
          } } }
        ],
        edges: [{ source: 't1', target: 'h1' }, { source: 'h1', target: 'd1' }]
      };

      // Mock HTTP Node call (axios function)
      (axios as any).mockResolvedValueOnce({ status: 200, data: { ans: 'AI-DONE' } });
      // Mock Discord Node call (axios.post)
      (axios.post as any).mockResolvedValueOnce({ status: 204 });

      const promise = executeWorkflow(context, workflow);
      await vi.runAllTimersAsync();
      await promise;

      // Verify HTTP Node (1st call to axios function)
      expect(axios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://api.com',
        data: { m: 'hello' }
      }));

      // Verify Discord Node (1st call to axios.post)
      expect(axios.post).toHaveBeenCalledWith('https://disc.com', expect.objectContaining({
        content: 'Result: AI-DONE'
      }));
    });

    it('should retry on failure', async () => {
        const context: WorkflowContext = {
          workflowId: 'wf1', triggerId: 'tr1', executionId: 'ex2', data: {}, results: {}
        };
  
        (axios as any).mockRejectedValueOnce({ response: { status: 500 } });
        (axios as any).mockResolvedValueOnce({ status: 200, data: { ok: true } });
  
        const workflow = {
            nodes: [
                { id: 't1', type: 'trigger', data: {} },
                { id: 'h1', type: 'action-http', data: { config: { method: 'GET', url: 'https://api.com' } } }
            ],
            edges: [{ source: 't1', target: 'h1' }]
        };
  
        const promise = executeWorkflow(context, workflow);
        await vi.runAllTimersAsync();
        await promise;
  
        expect(axios).toHaveBeenCalledTimes(2);
      });
  });
});
