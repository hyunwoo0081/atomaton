import { Request, Response } from 'express'
import prisma from '@atomaton/db'

export const getHealth = async (req: Request, res: Response): Promise<void> => {
  let dbStatus = 'UP'
  try {
    await prisma.$queryRaw`SELECT 1`
  } catch (error: unknown) {
    console.error('Database health check failed:', error)
    dbStatus = 'DOWN'
  }

  const status = dbStatus === 'UP' ? 'OK' : 'DEGRADED'
  const statusCode = dbStatus === 'UP' ? 200 : 503

  res.status(statusCode).json({
    status,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    memoryUsage: process.memoryUsage(),
    services: {
      database: dbStatus,
    },
  })
}
