import { Request, Response } from 'express'
import prisma from '@atomaton/db'
import bcrypt from 'bcryptjs'

export const getSystemStats = async (req: Request, res: Response) => {
  if (!req.isDeveloper) {
    return res
      .status(403)
      .json({ message: 'Access denied. Developer privileges required.' })
  }

  try {
    const totalUsers = await prisma.user.count()
    const totalWorkflows = await prisma.workflow.count()
    const activeWorkflows = await prisma.workflow.count({
      where: { is_active: true },
    })

    const recentLogs = await prisma.log.findMany({
      take: 1000,
      orderBy: { created_at: 'desc' },
      select: { status: true },
    })

    const successCount = recentLogs.filter(
      (log) => log.status === 'SUCCESS'
    ).length
    const failureCount = recentLogs.filter(
      (log) => log.status === 'FAILURE'
    ).length
    const totalExecutions = successCount + failureCount
    const successRate =
      totalExecutions > 0
        ? ((successCount / totalExecutions) * 100).toFixed(1) + '%'
        : '0%'

    const failureStats = await prisma.log.groupBy({
      by: ['workflowId'],
      where: { status: 'FAILURE' },
      _count: {
        status: true,
      },
      orderBy: {
        _count: {
          status: 'desc',
        },
      },
      take: 5,
    })

    const problematicWorkflows = await Promise.all(
      failureStats.map(async (stat) => {
        const workflow = await prisma.workflow.findUnique({
          where: { id: stat.workflowId },
          select: { name: true },
        })
        return {
          id: stat.workflowId,
          name: workflow?.name || 'Unknown',
          failureCount: stat._count.status,
        }
      })
    )

    res.status(200).json({
      overview: {
        totalUsers,
        totalWorkflows,
        activeWorkflows,
        successRate,
      },
      problematicWorkflows,
    })
  } catch (error: unknown) {
    console.error('Error fetching system stats:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getUsers = async (req: Request, res: Response) => {
  if (!req.isDeveloper) {
    return res
      .status(403)
      .json({ message: 'Access denied. Developer privileges required.' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let users: unknown[] = []
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        users = await prisma.user.findMany({
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            email: true,
            is_developer: true,
            created_at: true,
            updated_at: true,
          },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(200).json(users)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const createUser = async (req: Request, res: Response) => {
  if (!req.isDeveloper) {
    return res
      .status(403)
      .json({ message: 'Access denied. Developer privileges required.' })
  }

  const { email, password, is_developer } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  if (password.length < 8) {
    return res
      .status(400)
      .json({ message: 'Password must be at least 8 characters long' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let existingUser = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        existingUser = await prisma.user.findUnique({ where: { email } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' })
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    let user = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        user = await prisma.user.create({
          data: {
            email,
            password: hashedPassword,
            is_developer: is_developer || false,
          },
          select: {
            id: true,
            email: true,
            is_developer: true,
            created_at: true,
          },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(201).json({ message: 'User created successfully', user })
  } catch (error) {
    console.error('Error creating user:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const deleteUser = async (req: Request, res: Response) => {
  if (!req.isDeveloper) {
    return res
      .status(403)
      .json({ message: 'Access denied. Developer privileges required.' })
  }

  const { id } = req.params

  if (req.userId === id) {
    return res
      .status(400)
      .json({ message: 'You cannot delete your own account' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let user = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        user = await prisma.user.findUnique({ where: { id } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        await prisma.user.delete({ where: { id } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(200).json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
