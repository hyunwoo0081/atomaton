import { Request, Response } from 'express';
import prisma from '@atomaton/db';

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
      return res.status(404).json({ message: 'Workflow not found' });
    }

    res.status(200).json(workflow);
  } catch (error) {
    console.error('Error fetching workflow:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};

export const updateWorkflow = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, is_active } = req.body;
  const userId = req.userId;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const workflow = await prisma.workflow.update({
      where: { id, userId },
      data: { name, is_active },
    });
    res.status(200).json(workflow);
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
