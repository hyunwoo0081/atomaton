import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import prisma from '@atomaton/db'

/* eslint-disable @typescript-eslint/no-namespace */
declare global {
  namespace Express {
    interface Request {
      userId?: string
      isDeveloper?: boolean
    }
  }
}

interface JwtPayload {
  userId: string
  isDeveloper: boolean
}

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'
const maxRetries = 5
const retryDelays = [1000, 5000, 30000, 120000, 600000]

export const authenticateToken = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers['authorization']
  const token = authHeader && authHeader.split(' ')[1]

  if (token == null)
    return res.status(401).json({ message: 'Authentication token required' })

  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err || !decoded)
      return res.status(403).json({ message: 'Invalid or expired token' })

    const user = decoded as unknown as JwtPayload
    req.userId = user.userId
    req.isDeveloper = user.isDeveloper
    next()
  })
}

export const authorizeDeveloper = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!req.isDeveloper) {
    return res.status(403).json({ message: 'Developer access required' })
  }
  next()
}

export const validateWorkflowOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const workflowId =
    req.params.id || req.body.workflowId || req.query.workflowId
  const userId = req.userId

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!workflowId) {
    return next()
  }

  try {
    let workflow = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        workflow = await prisma.workflow.findUnique({
          where: { id: workflowId as string },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!workflow) {
      return res.status(404).json({ message: 'Workflow not found' })
    }

    if (workflow.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  } catch (error) {
    console.error('Error validating workflow owner:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const validateAccountOwner = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const accountId = req.params.id || req.body.accountId || req.query.accountId
  const userId = req.userId

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!accountId) {
    return next()
  }

  try {
    let account = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        account = await prisma.account.findUnique({
          where: { id: accountId as string },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    if (!account) {
      return res.status(404).json({ message: 'Account not found' })
    }

    if (account.userId !== userId) {
      return res.status(403).json({ message: 'Forbidden' })
    }

    next()
  } catch (error) {
    console.error('Error validating account owner:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
