import { Request, Response } from 'express';
import prisma, { Prisma } from '@atomaton/db';
import { executeWorkflow } from '../executors/executor';
import { v4 as uuidv4 } from 'uuid';
import { GlobalSettings, UIConfig } from '../executors/types';

export const createWorkflow = async (req: Request, res: Response) => {
  const { name } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  if (!name) {
    return res.status(400).json({ message: 'Workflow name is required' });
  }

  try {
    const workflow = await prisma.workflow.create({
      data: {
        name,
        userId,
        ui_config: { nodes: [], edges: [] },
        settings: { enableFailureAlert: false, failureWebhookUrl: '' },
      },
    });
    res.status(201).json(workflow);
  } catch (error) {
    console.error('Error creating workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkflows = async (req: Request, res: Response) => {
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const workflows = await prisma.workflow.findMany({
      where: { userId },
      include: {
        trigger: {
          include: {
            rules: true
          }
        },
        actions: true,
      },
    });
    res.status(200).json(workflows);
  } catch (error) {
    console.error('Error fetching workflows:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const getWorkflowById = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const workflow = await prisma.workflow.findUnique({
      where: { id, userId },
      include: {
        trigger: {
          include: {
            rules: true
          }
        },
        actions: true,
      },
    });

    if (!workflow) {
      return res.status(440).json({ message: 'Workflow not found' });
    }

    res.status(200).json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

interface UpdateWorkflowBody {
  name?: string;
  is_active?: boolean;
  nodes?: any[]; // React Flow nodes
  edges?: any[]; // React Flow edges
  globalSettings?: GlobalSettings;
}

export const updateWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, is_active, nodes, edges, globalSettings } = req.body as UpdateWorkflowBody;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    // 1. Update basic info and UI config
    const updateData: Prisma.WorkflowUpdateInput = {};
    if (name) updateData.name = name;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (nodes && edges) updateData.ui_config = { nodes, edges };
    if (globalSettings) updateData.settings = globalSettings as any; // Prisma Json type workaround

    // 2. Parse nodes/edges to update Trigger and Actions
    if (nodes && edges) {
      await prisma.$transaction(async (tx) => {
        // Delete existing
        await tx.trigger.deleteMany({ where: { workflowId: id } });
        await tx.action.deleteMany({ where: { workflowId: id } });

        // Create Trigger
        const triggerNode = nodes.find((n) => n.type.startsWith('trigger'));
        if (triggerNode && triggerNode.data.config.accountId) {
          await tx.trigger.create({
            data: {
              workflowId: id,
              type: triggerNode.type === 'trigger-webhook' ? 'WEBHOOK' : 'IMAP_POLLING',
              config: triggerNode.data.config,
            }
          });
        }

        // Create Actions
        const actionNodes = nodes.filter((n) => n.type.startsWith('action') || n.type === 'condition');
        
        for (let i = 0; i < actionNodes.length; i++) {
          const node = actionNodes[i];
          let type = 'DISCORD_WEBHOOK';
          if (node.type === 'action-notion') type = 'NOTION_PAGE';
          if (node.type === 'condition') type = 'CONDITION';

          await tx.action.create({
            data: {
              workflowId: id,
              type,
              config: { ...node.data.config, nodeId: node.id },
              order: i,
            }
          });
        }

        // Update Workflow itself
        await tx.workflow.update({
          where: { id, userId },
          data: updateData,
        });
      });
    } else {
      // Just update basic info if no nodes provided
      await prisma.workflow.update({
        where: { id, userId },
        data: updateData,
      });
    }

    const updatedWorkflow = await prisma.workflow.findUnique({
      where: { id, userId },
      include: { trigger: true, actions: true }
    });

    res.status(200).json(updatedWorkflow);
  } catch (error) {
    console.error('Error updating workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const deleteWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    await prisma.workflow.delete({
      where: { id, userId },
    });
    res.status(204).send();
  } catch (error) {
    console.error('Error deleting workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const testWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { nodes, edges, inputData } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const executionId = uuidv4();
    const context = {
      workflowId: id,
      triggerId: 'test-trigger',
      executionId,
      data: inputData,
      results: {},
    };

    const logs = await executeWorkflow(context, { nodes, edges });

    res.status(200).json({
      status: 'SUCCESS',
      logs,
    });

  } catch (error: any) {
    console.error('Error testing workflow:', error);
    res.status(500).json({ 
      status: 'FAILURE',
      message: error.message,
      logs: [] 
    });
  }
};
