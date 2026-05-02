// apps/api/src/executors/__tests__/http.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!';

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import axios from 'axios';
import { resolvePath, executeWorkflow } from '../executor';
import { WorkflowContext, UIConfig } from '../types';

// Mock axios correctly
vi.mock('axios', () => {
  const mockAxios = vi.fn();
  (mockAxios as any).post = vi.fn();
  return { default: mockAxios };
});

const mockedAxios = axios as unknown as Mock & { post: Mock };

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

      const workflow: UIConfig = {
        nodes: [
          { id: 't1', type: 'trigger-webhook', data: { label: 'T', config: {} as any } },
          { id: 'h1', type: 'action-http', data: { 
            label: 'H',
            config: { 
              method: 'POST', url: 'https://api.com', body: '{"m":"{{msg}}"}',
              responseMapping: [{ sourcePath: 'ans', targetVariable: 'res' }]
            } as any
          } },
          { id: 'd1', type: 'action', data: { 
            label: 'D',
            config: { webhookUrl: 'https://disc.com', content: 'Result: {{res}}' } as any
          } }
        ],
        edges: [
            { id: 'e1', source: 't1', target: 'h1' }, 
            { id: 'e2', source: 'h1', target: 'd1' }
        ]
      };

      mockedAxios.mockResolvedValueOnce({ status: 200, data: { ans: 'AI-DONE' } });
      mockedAxios.post.mockResolvedValueOnce({ status: 204 });

      const promise = executeWorkflow(context, workflow);
      await vi.runAllTimersAsync();
      await promise;

      expect(mockedAxios).toHaveBeenCalledWith(expect.objectContaining({
        url: 'https://api.com',
        data: { m: 'hello' }
      }));

      expect(mockedAxios.post).toHaveBeenCalledWith('https://disc.com', expect.objectContaining({
        content: 'Result: AI-DONE'
      }));
    });

    it('should retry on failure', async () => {
        const context: WorkflowContext = {
          workflowId: 'wf1', triggerId: 'tr1', executionId: 'ex2', data: {}, results: {}
        };
  
        mockedAxios.mockRejectedValueOnce({ response: { status: 500 } });
        mockedAxios.mockResolvedValueOnce({ status: 200, data: { ok: true } });
  
        const workflow: UIConfig = {
            nodes: [
                { id: 't1', type: 'trigger', data: { label: 'T', config: {} as any } },
                { id: 'h1', type: 'action-http', data: { 
                    label: 'H',
                    config: { method: 'GET', url: 'https://api.example.com' } as any 
                } }
            ],
            edges: [{ id: 'e1', source: 't1', target: 'h1' }]
        };
  
        const promise = executeWorkflow(context, workflow);
        await vi.runAllTimersAsync();
        await promise;
  
        expect(mockedAxios).toHaveBeenCalledTimes(2);
      });
  });
});
