import { describe, it, expect, vi, beforeEach } from 'vitest'
import { changePassword, getMe } from '../auth'
import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      user: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    },
  }
})

import prisma, { User } from '@atomaton/db'

describe('Auth Controller', () => {
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

  describe('getMe', () => {
    it('should return 401 if userId is missing', async () => {
      mockReq = {}
      await getMe(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
    })

    it('should return 404 if user is not found', async () => {
      mockReq = { userId: 'user-1' }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(null)

      await getMe(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'User not found' })
    })

    it('should return profile details on success', async () => {
      mockReq = { userId: 'user-1' }
      const userProfile = {
        id: 'user-1',
        email: 'test@example.com',
        is_developer: true,
      }
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce(
        userProfile as unknown as User
      )

      await getMe(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith(userProfile)
    })
  })

  describe('changePassword', () => {
    it('should return 401 if userId is missing', async () => {
      mockReq = { body: {} }
      await changePassword(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(401)
    })

    it('should return 400 if currentPassword or newPassword is missing', async () => {
      mockReq = { userId: 'user-1', body: { currentPassword: 'old' } }
      await changePassword(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Current password and new password are required',
      })
    })

    it('should return 400 if newPassword is less than 8 characters', async () => {
      mockReq = {
        userId: 'user-1',
        body: { currentPassword: 'old', newPassword: 'short' },
      }
      await changePassword(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'New password must be at least 8 characters long',
      })
    })

    it('should return 400 if currentPassword is wrong', async () => {
      mockReq = {
        userId: 'user-1',
        body: { currentPassword: 'wrong', newPassword: 'newpassword123' },
      }
      const hashedOldPassword = await bcrypt.hash('correct', 10)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        password: hashedOldPassword,
      } as unknown as User)

      await changePassword(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(400)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Invalid current password',
      })
    })

    it('should hash new password and update database on success', async () => {
      mockReq = {
        userId: 'user-1',
        body: { currentPassword: 'correct', newPassword: 'newpassword123' },
      }
      const hashedOldPassword = await bcrypt.hash('correct', 10)
      vi.mocked(prisma.user.findUnique).mockResolvedValueOnce({
        id: 'user-1',
        password: hashedOldPassword,
      } as unknown as User)
      vi.mocked(prisma.user.update).mockResolvedValueOnce({} as unknown as User)

      await changePassword(mockReq as Request, mockRes as Response)
      expect(statusMock).toHaveBeenCalledWith(200)
      expect(jsonMock).toHaveBeenCalledWith({
        message: 'Password updated successfully',
      })
      expect(prisma.user.update).toHaveBeenCalled()
    })
  })
})
