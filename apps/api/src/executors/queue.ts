// apps/api/src/executors/queue.ts
import { WorkflowContext } from './types';

type QueueItem = WorkflowContext;

const queue: QueueItem[] = [];
let isProcessing = false;

type ProcessorFunction = (context: WorkflowContext) => Promise<void>;

let processor: ProcessorFunction | null = null;

export const setProcessor = (fn: ProcessorFunction) => {
  processor = fn;
  processQueue(); // Start processing if items are already in queue
};

export const enqueue = (item: QueueItem) => {
  queue.push(item);
  processQueue();
};

export const processQueue = async () => {
  if (isProcessing || queue.length === 0 || !processor) {
    return;
  }

  isProcessing = true;
  const item = queue.shift(); // Get the next item

  if (item) {
    try {
      console.log(`Processing workflow execution: ${item.executionId}`);
      await processor(item);
      console.log(`Finished processing workflow execution: ${item.executionId}`);
    } catch (error) {
      console.error(`Error processing workflow execution ${item.executionId}:`, error);
      // TODO: Implement retry logic for failed items if necessary
    } finally {
      isProcessing = false;
      processQueue(); // Process the next item
    }
  } else {
    isProcessing = false;
  }
};

export const getQueueSize = (): number => {
  return queue.length;
};

export const clearQueue = () => {
  queue.length = 0;
};
