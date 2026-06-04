import { describe, it, expect, vi, beforeEach } from 'vitest'
import { getHealth } from '../health'
import { Request, Response } from 'express'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      $queryRaw: vi.fn(),
    },
  }
})

import prisma from '@atomaton/db'

describe('Health Controller - getHealth', () => {
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
    mockReq = {}
  })

  it('should return 200 OK and database UP when query succeeds', async () => {
    vi.mocked(prisma.$queryRaw).mockResolvedValueOnce([1])

    await getHealth(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'OK',
        services: {
          database: 'UP',
        },
      })
    )
  })

  it('should return 503 Service Unavailable and database DOWN when query throws error', async () => {
    vi.mocked(prisma.$queryRaw).mockRejectedValueOnce(
      new Error('Connection error')
    )

    await getHealth(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(503)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'DEGRADED',
        services: {
          database: 'DOWN',
        },
      })
    )
  })
})
