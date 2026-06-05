import { describe, it, expect, vi, beforeEach } from 'vitest'
import { updateWorkflow, deleteWorkflow, duplicateWorkflow } from '../workflow'
import { Request, Response } from 'express'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      workflow: {
        update: vi.fn(),
        findUnique: vi.fn(),
        delete: vi.fn(),
        create: vi.fn(),
      },
      account: {
        findMany: vi.fn(),
      },
      action: {
        deleteMany: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        createMany: vi.fn(),
        update: vi.fn(),
      },
      trigger: {
        findUnique: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
        delete: vi.fn(),
      },
      rule: {
        createMany: vi.fn(),
      },
      $transaction: vi.fn(),
    },
    Prisma: {
      JsonNull: 'JsonNull',
    },
  }
})

// Stub transaction object mocks
const txMock = {
  action: {
    deleteMany: vi.fn(),
    create: vi.fn(),
    findMany: vi.fn(),
    createMany: vi.fn(),
    update: vi.fn(),
  },
  trigger: {
    findUnique: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  },
  rule: {
    createMany: vi.fn(),
  },
  workflow: {
    update: vi.fn(),
    create: vi.fn(),
  },
}

import prisma, { Workflow, Account, Prisma } from '@atomaton/db'

describe('Workflow Controller - updateWorkflow (accountId validation)', () => {
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

    // Reset transaction mocks
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(txMock as unknown as Prisma.TransactionClient)
    })
  })

  it('should return 401 if userId is missing', async () => {
    mockReq = {
      params: { id: 'wf-1' },
      body: {},
    }

    await updateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('should return 403 if nodes contain accountId that does not exist in DB', async () => {
    mockReq = {
      userId: 'user-1',
      params: { id: 'wf-1' },
      body: {
        name: 'Updated Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-imap',
            data: {
              config: {
                accountId: 'non-existent-account-id',
              },
            },
          },
        ],
        edges: [],
      },
    }

    vi.mocked(prisma.account.findMany).mockResolvedValueOnce([])

    await updateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Forbidden: Invalid integration account',
    })
  })

  it('should return 403 if nodes contain accountId belonging to another user', async () => {
    mockReq = {
      userId: 'user-1',
      params: { id: 'wf-1' },
      body: {
        name: 'Updated Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-imap',
            data: {
              config: {
                accountId: 'account-2',
              },
            },
          },
        ],
        edges: [],
      },
    }

    const mockAccounts = [
      {
        id: 'account-2',
        userId: 'user-2', // belongs to another user
      },
    ]
    vi.mocked(prisma.account.findMany).mockResolvedValueOnce(
      mockAccounts as unknown as Account[]
    )

    await updateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Forbidden: You do not own this integration account',
    })
  })

  it('should proceed and return 200 if accountId belongs to the same user', async () => {
    mockReq = {
      userId: 'user-1',
      params: { id: 'wf-1' },
      body: {
        name: 'Updated Workflow',
        nodes: [
          {
            id: 'node-1',
            type: 'trigger-imap',
            data: {
              config: {
                accountId: 'account-1',
              },
            },
          },
        ],
        edges: [],
      },
    }

    const mockAccounts = [
      {
        id: 'account-1',
        userId: 'user-1', // belongs to the current user
      },
    ]
    vi.mocked(prisma.account.findMany).mockResolvedValueOnce(
      mockAccounts as unknown as Account[]
    )

    // Transaction mocks setup
    txMock.action.findMany.mockResolvedValueOnce([])
    txMock.action.deleteMany.mockResolvedValueOnce({ count: 0 })
    txMock.action.createMany.mockResolvedValueOnce({ count: 1 })
    txMock.trigger.findUnique.mockResolvedValueOnce(null)
    txMock.trigger.create.mockResolvedValueOnce({})
    txMock.workflow.update.mockResolvedValueOnce({})

    // Final findUnique mock for response
    const mockUpdatedWorkflow = {
      id: 'wf-1',
      name: 'Updated Workflow',
      userId: 'user-1',
      trigger: {},
      actions: [],
    }
    vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(
      mockUpdatedWorkflow as unknown as Workflow
    )

    await updateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(mockUpdatedWorkflow)
  })
})

describe('Workflow Controller - deleteWorkflow', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let statusMock: ReturnType<typeof vi.fn>
  let sendMock: ReturnType<typeof vi.fn>
  let jsonMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    sendMock = vi.fn()
    jsonMock = vi.fn()
    statusMock = vi.fn().mockImplementation(() => ({
      send: sendMock,
      json: jsonMock,
    }))
    mockRes = {
      status: statusMock as unknown as Response['status'],
      send: sendMock as unknown as Response['send'],
      json: jsonMock as unknown as Response['json'],
    }
  })

  it('should return 401 if userId is missing', async () => {
    mockReq = { params: { id: 'wf-1' } }
    await deleteWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('should delete workflow successfully', async () => {
    mockReq = { userId: 'user-1', params: { id: 'wf-1' } }
    vi.mocked(prisma.workflow.delete).mockResolvedValueOnce(
      {} as unknown as Workflow
    )

    await deleteWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(204)
    expect(sendMock).toHaveBeenCalled()
  })
})

describe('Workflow Controller - duplicateWorkflow', () => {
  let mockReq: Partial<Request>
  let mockRes: Partial<Response>
  let statusMock: ReturnType<typeof vi.fn>
  let jsonMock: ReturnType<typeof vi.fn>

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

  it('should return 401 if userId is missing', async () => {
    mockReq = { params: { id: 'wf-1' } }
    await duplicateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Unauthorized' })
  })

  it('should return 404 if source workflow is not found', async () => {
    mockReq = { userId: 'user-1', params: { id: 'wf-1' } }
    vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(null)

    await duplicateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({ message: 'Workflow not found' })
  })

  it('should duplicate workflow successfully', async () => {
    mockReq = { userId: 'user-1', params: { id: 'wf-1' } }

    const mockSourceWorkflow = {
      id: 'wf-1',
      name: 'Source Workflow',
      userId: 'user-1',
      ui_config: { nodes: [], edges: [] },
      settings: { enableFailureAlert: false, failureWebhookUrl: '' },
      trigger: {
        id: 'tr-1',
        type: 'WEBHOOK',
        config: {},
        rules: [
          {
            id: 'ru-1',
            field: 'subject',
            operator: 'contains',
            value: 'urgent',
          },
        ],
      },
      actions: [{ id: 'ac-1', type: 'DISCORD_WEBHOOK', config: {}, order: 0 }],
    }

    vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce(
      mockSourceWorkflow as unknown as Workflow
    )

    // Stub transaction callback execution
    vi.mocked(prisma.$transaction).mockImplementation(async (callback) => {
      return callback(txMock as unknown as Prisma.TransactionClient)
    })

    const mockCopiedWorkflow = {
      id: 'wf-2',
      name: 'Source Workflow (Copy)',
      userId: 'user-1',
      is_active: false,
    }

    txMock.workflow.create.mockResolvedValueOnce(mockCopiedWorkflow)
    txMock.trigger.create.mockResolvedValueOnce({ id: 'tr-2' })
    txMock.rule.createMany.mockResolvedValueOnce({ count: 1 })
    txMock.action.createMany.mockResolvedValueOnce({ count: 1 })

    await duplicateWorkflow(mockReq as Request, mockRes as Response)
    expect(statusMock).toHaveBeenCalledWith(201)
    expect(jsonMock).toHaveBeenCalledWith(mockCopiedWorkflow)
  })
})
