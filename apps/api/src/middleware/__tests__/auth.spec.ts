import { describe, it, expect, vi, beforeEach } from 'vitest'
import { Request, Response, NextFunction } from 'express'
import { validateWorkflowOwner, validateAccountOwner } from '../auth'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      workflow: {
        findUnique: vi.fn(),
      },
      account: {
        findUnique: vi.fn(),
      },
    },
  }
})

import prisma, { Workflow, Account } from '@atomaton/db'

describe('Auth & Authorization Middleware', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let nextMock: NextFunction
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
    nextMock = vi.fn() as unknown as NextFunction
  })

  describe('validateWorkflowOwner', () => {
    it('should return 401 if userId is missing', async () => {
      mockReq = { params: { id: 'workflow-1' } }
      await validateWorkflowOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should call next if workflowId is missing', async () => {
      mockReq = { userId: 'user-1', params: {}, body: {}, query: {} }
      await validateWorkflowOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(nextMock).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should return 404 if workflow does not exist', async () => {
      mockReq = { userId: 'user-1', params: { id: 'workflow-1' } }
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(null)

      await validateWorkflowOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(prisma.workflow.findUnique).toHaveBeenCalledWith({
        where: { id: 'workflow-1' },
      })
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Workflow not found' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should return 403 if user does not own the workflow', async () => {
      mockReq = { userId: 'user-1', params: { id: 'workflow-1' } }
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce({
        id: 'workflow-1',
        userId: 'user-2', // different owner
      } as unknown as Workflow)

      await validateWorkflowOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should call next on success when user owns the workflow', async () => {
      mockReq = { userId: 'user-1', params: { id: 'workflow-1' } }
      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce({
        id: 'workflow-1',
        userId: 'user-1', // same owner
      } as unknown as Workflow)

      await validateWorkflowOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(nextMock).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })
  })

  describe('validateAccountOwner', () => {
    it('should return 401 if userId is missing', async () => {
      mockReq = { params: { id: 'account-1' } }
      await validateAccountOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(statusMock).toHaveBeenCalledWith(401)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should call next if accountId is missing', async () => {
      mockReq = { userId: 'user-1', params: {}, body: {}, query: {} }
      await validateAccountOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(nextMock).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })

    it('should return 404 if account does not exist', async () => {
      mockReq = { userId: 'user-1', params: { id: 'account-1' } }
      vi.mocked(prisma.account.findUnique).mockResolvedValueOnce(null)

      await validateAccountOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(prisma.account.findUnique).toHaveBeenCalledWith({
        where: { id: 'account-1' },
      })
      expect(statusMock).toHaveBeenCalledWith(404)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Account not found' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should return 403 if user does not own the account', async () => {
      mockReq = { userId: 'user-1', params: { id: 'account-1' } }
      vi.mocked(prisma.account.findUnique).mockResolvedValueOnce({
        id: 'account-1',
        userId: 'user-2', // different owner
      } as unknown as Account)

      await validateAccountOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(statusMock).toHaveBeenCalledWith(403)
      expect(jsonMock).toHaveBeenCalledWith({ message: 'Forbidden' })
      expect(nextMock).not.toHaveBeenCalled()
    })

    it('should call next on success when user owns the account', async () => {
      mockReq = { userId: 'user-1', params: { id: 'account-1' } }
      vi.mocked(prisma.account.findUnique).mockResolvedValueOnce({
        id: 'account-1',
        userId: 'user-1', // same owner
      } as unknown as Account)

      await validateAccountOwner(
        mockReq as Request,
        mockRes as Response,
        nextMock
      )
      expect(nextMock).toHaveBeenCalled()
      expect(statusMock).not.toHaveBeenCalled()
    })
  })
})
