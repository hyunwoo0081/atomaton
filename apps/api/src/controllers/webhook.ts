import { Request, Response } from 'express';
import prisma from '@atomaton/db';
import { enqueue } from '../executors/queue';
import { WorkflowContext } from '../executors/types';
import { v4 as uuidv4 } from 'uuid'; // For generating unique execution IDs

export const processWebhook = async (req: Request, res: Response) => {
  const { accountId, triggerId } = req.params;
  const { body } = req;
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Authorization: Bearer {API_KEY} header is required' });
  }

  const apiKey = authHeader.split(' ')[1];

  try {
    const trigger = await prisma.trigger.findUnique({
      where: { id: triggerId },
      include: { workflow: true },
    });

    if (!trigger || trigger.workflow.userId !== accountId) { // Basic validation
      return res.status(404).json({ message: 'Trigger not found or does not belong to account' });
    }

    // Assuming a simple API key stored directly in the trigger config for now.
    const storedApiKey = (trigger.config as any)?.apiKey;

    if (!storedApiKey || storedApiKey !== apiKey) {
      return res.status(403).json({ message: 'Invalid API Key' });
    }

    console.log(`Webhook received for account ${accountId}, trigger ${triggerId}:`, body);

    const executionId = uuidv4();
    const workflowContext: WorkflowContext = {
      triggerId: trigger.id,
      workflowId: trigger.workflowId,
      executionId: executionId,
      data: body, // Webhook payload as data
      results: {},
    };

    enqueue(workflowContext); // Enqueue for execution

    await prisma.log.create({
      data: {
        workflowId: trigger.workflowId,
        triggerId: trigger.id,
        status: 'ENQUEUED', // Initial status
        message: `Webhook received for trigger ${triggerId}`,
        context: body,
        source: 'WEBHOOK',
        executionId: executionId,
      },
    });

    res.status(200).json({ message: 'Webhook received and processed' });
  } catch (error) {
    console.error('Error processing webhook:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

