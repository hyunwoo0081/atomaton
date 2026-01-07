// apps/api/src/services/logCleanup.ts
import prisma from '@atomaton/db';

const LOG_RETENTION_DAYS = 3;
const MAX_LOGS_PER_WORKFLOW = 1000;

export const cleanupOldLogs = async () => {
  console.log('Starting old log cleanup job...');

  try {
    // 1. Delete logs older than retention period
    const retentionDate = new Date();
    retentionDate.setDate(retentionDate.getDate() - LOG_RETENTION_DAYS);

    const deletedByDate = await prisma.log.deleteMany({
      where: {
        created_at: {
          lt: retentionDate,
        },
      },
    });
    console.log(`Deleted ${deletedByDate.count} logs older than ${LOG_RETENTION_DAYS} days.`);

    // 2. For each workflow, keep only the most recent N logs
    const workflows = await prisma.workflow.findMany({
      select: {
        id: true,
      },
    });

    for (const workflow of workflows) {
      const logs = await prisma.log.findMany({
        where: { workflowId: workflow.id },
        orderBy: { created_at: 'desc' },
        select: { id: true },
      });

      if (logs.length > MAX_LOGS_PER_WORKFLOW) {
        const logsToDelete = logs.slice(MAX_LOGS_PER_WORKFLOW);
        const idsToDelete = logsToDelete.map(log => log.id);

        const deletedByCount = await prisma.log.deleteMany({
          where: {
            id: {
              in: idsToDelete,
            },
          },
        });
        console.log(`Trimmed ${deletedByCount.count} old logs for workflow ${workflow.id} to keep the most recent ${MAX_LOGS_PER_WORKFLOW}.`);
      }
    }
    console.log('Finished old log cleanup job.');
  } catch (error) {
    console.error('Error during log cleanup:', error);
  }
};
