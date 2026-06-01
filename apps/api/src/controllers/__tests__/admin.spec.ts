import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getSystemStats, getUsers, createUser, deleteUser } from '../admin'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      user: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
        count: vi.fn(),
      },
      workflow: {
        count: vi.fn(),
        findUnique: vi.fn(),
      },
      log: {
        findMany: vi.fn(),
        groupBy: vi.fn(),
      },
    },
  }
})

import prisma, { User } from '@atomaton/db'

describe('Admin Controller', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let jsonMock: ReturnType<typeof vi.fn>
  let statusMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    jsonMock = vi.fn()
    statusMock = vi.fn().mockImplementation(() => ({
      json: jsonMock,
    }))
    mockRes = {
      status: statusMock as unknown as Response['status'],
      json: jsonMock as unknown as Response['json'],
    }
  })

  describe('getUsers', () => {
    it('should return 403 if user is not a developer', async () => {
      mockReq = { isDeveloper: false }
      await getUsers(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Access denied. Developer privileges required.',
      })
    })

    it('should return users list on success', async () => {
      mockReq = { isDeveloper: true }
      const usersList = [
        {
          id: 'u1',
          email: 'admin@test.com',
          is_developer: true,
          created_at: new Date(),
        },
        {
          id: 'u2',
          email: 'user@test.com',
          is_developer: false,
          created_at: new Date(),
        },
      ]
      vi.mocked(prisma.user.findMany).mockResolvedValueOnce(
        usersList as unknown as User[]
      )

      await getUsers(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(usersList)
    })
  })

  describe('createUser', () => {
    it('should return 403 if user is not a developer', async () => {
      mockReq = { isDeveloper: false, body: {} }
      await createUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 400 if email or password is missing', async () => {
      mockReq = { isDeveloper: true, body: { email: 'test@example.com' } }
      await createUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email and password are required',
      })
    })

    it('should return 400 if password is less than 8 characters', async () => {
      mockReq = {
        isDeveloper: true,
        body: { email: 'test@example.com', password: 'short' },
      }
      await createUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Password must be at least 8 characters long',
      })
    })

    it('should return 409 if email is already registered', async () => {
      mockReq = {
        isDeveloper: true,
        body: { email: 'exists@test.com', password: 'password123' },
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'u1',
        email: 'exists@test.com',
      } as unknown as User)

      await createUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(409)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Email already registered',
      })
    })

    it('should hash password and create user successfully', async () => {
      mockReq = {
        isDeveloper: true,
        body: {
          email: 'new@test.com',
          password: 'password123',
          is_developer: false,
        },
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      const createdUser = {
        id: 'u2',
        email: 'new@test.com',
        is_developer: false,
        created_at: new Date(),
      }
      vi.mocked(prisma.user.create).mockResolvedValueOnce(
        createdUser as unknown as User
      )

      await createUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(201)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User created successfully',
        user: createdUser,
      })
      expect(prisma.user.create).toHaveBeenCalled()
    })
  })

  describe('deleteUser', () => {
    it('should return 403 if user is not a developer', async () => {
      mockReq = { isDeveloper: false, params: { id: 'u2' } }
      await deleteUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(403)
    })

    it('should return 400 if user tries to delete their own account', async () => {
      mockReq = {
        isDeveloper: true,
        userId: 'admin-1',
        params: { id: 'admin-1' },
      }
      await deleteUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'You cannot delete your own account',
      })
    })

    it('should return 404 if user to delete is not found', async () => {
      mockReq = {
        isDeveloper: true,
        userId: 'admin-1',
        params: { id: 'u-missing' },
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await deleteUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' })
    })

    it('should delete user and return 200 on success', async () => {
      mockReq = {
        isDeveloper: true,
        userId: 'admin-1',
        params: { id: 'user-2' },
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-2',
        email: 'delete@test.com',
      } as unknown as User)
      vi.mocked(prisma.user.delete).mockResolvedValueOnce({} as unknown as User)

      await deleteUser(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'User deleted successfully',
      })
      expect(prisma.user.delete).toHaveBeenCalled()
    })
  })
})
