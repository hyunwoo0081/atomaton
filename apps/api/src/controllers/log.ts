// apps/api/src/controllers/log.ts
import { Request, Response } from 'express';
import prisma from '@atomaton/db';

export const getLogs = async (req: Request, res: Response) => {
  const userId = req.userId;
  const { workflowId, page = '1', limit = '25' } = req.query;

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  try {
    const whereClause: any = {
      workflow: {
        userId: userId,
      },
    };

    if (workflowId) {
      whereClause.workflowId = workflowId as string;
    }

    const logs = await prisma.log.findMany({
      where: whereClause,
      orderBy: { created_at: 'desc' },
      skip: skip,
      take: limitNum,
    });

    const totalLogs = await prisma.log.count({ where: whereClause });

    res.status(200).json({
      logs,
      pagination: {
        total: totalLogs,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(totalLogs / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
