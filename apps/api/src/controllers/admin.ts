import { Request, Response } from 'express';
import prisma from '@atomaton/db';

export const getSystemStats = async (req: Request, res: Response) => {
  // Check if user is developer (middleware should handle this, but double check)
  if (!req.isDeveloper) {
    return res.status(403).json({ message: 'Access denied. Developer privileges required.' });
  }

  try {
    const totalUsers = await prisma.user.count();
    const totalWorkflows = await prisma.workflow.count();
    const activeWorkflows = await prisma.workflow.count({ where: { is_active: true } });
    
    // Calculate success rate from logs (last 1000 logs)
    const recentLogs = await prisma.log.findMany({
      take: 1000,
      orderBy: { created_at: 'desc' },
      select: { status: true }
    });

    const successCount = recentLogs.filter(log => log.status === 'SUCCESS').length;
    const failureCount = recentLogs.filter(log => log.status === 'FAILURE').length;
    const totalExecutions = successCount + failureCount;
    const successRate = totalExecutions > 0 ? ((successCount / totalExecutions) * 100).toFixed(1) + '%' : '0%';

    // Get workflow performance stats (slowest workflows)
    // This is a simplified approximation. Ideally, we'd track execution duration in the Log model.
    // For now, we'll just return the workflows with the most failures.
    const failureStats = await prisma.log.groupBy({
      by: ['workflowId'],
      where: { status: 'FAILURE' },
      _count: {
        status: true
      },
      orderBy: {
        _count: {
          status: 'desc'
        }
      },
      take: 5
    });

    const problematicWorkflows = await Promise.all(failureStats.map(async (stat) => {
      const workflow = await prisma.workflow.findUnique({
        where: { id: stat.workflowId },
        select: { name: true }
      });
      return {
        id: stat.workflowId,
        name: workflow?.name || 'Unknown',
        failureCount: stat._count.status
      };
    }));

    res.status(200).json({
      overview: {
        totalUsers,
        totalWorkflows,
        activeWorkflows,
        successRate,
      },
      problematicWorkflows
    });

  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};
