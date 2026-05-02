// apps/api/src/executors/__tests__/queue.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!';

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { enqueue, setProcessor, resetProcessor, getQueueSize, clearQueue } from '../queue';
import { WorkflowContext } from '../types';

describe('Execution Queue', () => {
  
  beforeEach(() => {
    clearQueue();
    resetProcessor();
    vi.clearAllMocks();
  });

  const mockContext = (id: string): WorkflowContext => ({
    workflowId: 'wf1',
    triggerId: 'tr1',
    executionId: id,
    data: {},
    results: {}
  });

  // --- Normal Cases ---

  it('should process items in FIFO order', async () => {
    const processedOrder: string[] = [];
    const processor = async (context: WorkflowContext) => {
      await new Promise(resolve => setTimeout(resolve, 10));
      processedOrder.push(context.executionId);
    };

    setProcessor(processor);

    enqueue(mockContext('1'));
    enqueue(mockContext('2'));
    enqueue(mockContext('3'));

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(processedOrder).toEqual(['1', '2', '3']);
    expect(getQueueSize()).toBe(0);
  });

  it('should not process multiple items simultaneously', async () => {
    let activeCount = 0;
    let maxActiveCount = 0;

    const processor = async () => {
      activeCount++;
      maxActiveCount = Math.max(maxActiveCount, activeCount);
      await new Promise(resolve => setTimeout(resolve, 20));
      activeCount--;
    };

    setProcessor(processor);

    enqueue(mockContext('A'));
    enqueue(mockContext('B'));
    enqueue(mockContext('C'));

    await new Promise(resolve => setTimeout(resolve, 200));

    expect(maxActiveCount).toBe(1);
  });

  // --- Edge Cases ---

  it('should continue processing the next item even if the current one fails', async () => {
    const processedIds: string[] = [];
    const processor = async (context: WorkflowContext) => {
      if (context.executionId === 'fail') {
        throw new Error('Simulation of task failure');
      }
      processedIds.push(context.executionId);
    };

    setProcessor(processor);

    enqueue(mockContext('success-1'));
    enqueue(mockContext('fail'));
    enqueue(mockContext('success-2'));

    await new Promise(resolve => setTimeout(resolve, 150));

    expect(processedIds).toContain('success-1');
    expect(processedIds).toContain('success-2');
    expect(getQueueSize()).toBe(0);
  });

  it('should handle enqueueing before a processor is set', async () => {
    const processedIds: string[] = [];
    
    enqueue(mockContext('early-bird'));
    expect(getQueueSize()).toBe(1);

    setProcessor(async (ctx) => {
      processedIds.push(ctx.executionId);
    });

    await new Promise(resolve => setTimeout(resolve, 100));
    expect(processedIds).toContain('early-bird');
    expect(getQueueSize()).toBe(0);
  });
});
