import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import prisma, { Prisma, User } from '@atomaton/db'

// This should ideally come from environment variables
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkey'
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h'

export const register = async (req: Request, res: Response) => {
  const { email, password, is_developer } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    const hashedPassword = await bcrypt.hash(password, 10)

    let user: User | null = null
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
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    const dbUser = user
    if (!dbUser) {
      return res.status(500).json({ message: 'Internal server error' })
    }

    res
      .status(201)
      .json({ message: 'User registered successfully', userId: dbUser.id })
  } catch (error: unknown) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === 'P2002') {
        // Unique constraint failed for email
        return res.status(409).json({ message: 'Email already registered' })
      }
    }
    console.error('Registration error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let user: User | null = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        user = await prisma.user.findUnique({ where: { email } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    const dbUser = user
    if (!dbUser) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, dbUser.password)

    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid credentials' })
    }

    const token = jwt.sign(
      { userId: dbUser.id, isDeveloper: dbUser.is_developer },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] }
    )

    res.status(200).json({
      token,
      user: {
        id: dbUser.id,
        email: dbUser.email,
        is_developer: dbUser.is_developer,
      },
    })
  } catch (error) {
    console.error('Login error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const changePassword = async (req: Request, res: Response) => {
  const { currentPassword, newPassword } = req.body
  const userId = req.userId // Extracted by authenticateToken middleware

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  if (!currentPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: 'Current password and new password are required' })
  }

  if (newPassword.length < 8) {
    return res
      .status(400)
      .json({ message: 'New password must be at least 8 characters long' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let user: User | null = null

    // Retrieve user from DB with retry logic
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        user = await prisma.user.findUnique({ where: { id: userId } })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    const dbUser = user
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, dbUser.password)
    if (!isMatch) {
      return res.status(400).json({ message: 'Invalid current password' })
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Update password in DB with retry logic
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        await prisma.user.update({
          where: { id: userId },
          data: { password: hashedPassword },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    res.status(200).json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Change password error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}

export const getMe = async (req: Request, res: Response) => {
  const userId = req.userId

  if (!userId) {
    return res.status(401).json({ message: 'Unauthorized' })
  }

  const maxRetries = 5
  const retryDelays = [1000, 5000, 30000, 120000, 600000]

  try {
    let user: { id: string; email: string; is_developer: boolean } | null = null
    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        if (attempt > 0) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelays[attempt - 1])
          )
        }
        user = await prisma.user.findUnique({
          where: { id: userId },
          select: { id: true, email: true, is_developer: true },
        })
        break
      } catch (error) {
        if (attempt < maxRetries - 1) continue
        throw error
      }
    }

    const dbUser = user
    if (!dbUser) {
      return res.status(404).json({ message: 'User not found' })
    }

    res.status(200).json(dbUser)
  } catch (error) {
    console.error('Get profile error:', error)
    res.status(500).json({ message: 'Internal server error' })
  }
}
