import { describe, it, expect, vi, beforeEach } from 'vitest'
import { processWebhook, processWebhookByToken } from '../webhook'
import webhookRouter from '../../routes/webhook'
import { Request, Response } from 'express'

// Mock @atomaton/db
vi.mock('@atomaton/db', () => {
  return {
    default: {
      trigger: {
        findUnique: vi.fn(),
      },
      log: {
        create: vi.fn(),
      },
    },
    Prisma: {
      InputJsonValue: {},
    },
  }
})

// Mock queue
vi.mock('../../executors/queue', () => {
  return {
    enqueue: vi.fn(),
  }
})

import prisma, { Trigger, Log } from '@atomaton/db'
import { enqueue } from '../../executors/queue'

describe('Webhook Controller - processWebhook', () => {
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

  it('should return 401 if Authorization header is missing', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: {},
      body: { data: 'test' },
    }

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Authorization: Bearer {API_KEY} header is required',
    })
  })

  it('should return 401 if Authorization header does not start with Bearer', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Basic 12345' },
      body: { data: 'test' },
    }

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(401)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Authorization: Bearer {API_KEY} header is required',
    })
  })

  it('should return 404 if trigger is not found', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer valid-api-key' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce(null)

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Trigger not found or does not belong to account',
    })
  })

  it('should return 404 if trigger belongs to a different accountId/userId', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer valid-api-key' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      workflow: {
        userId: 'different-account',
      },
    } as unknown as Trigger & { workflow: { userId: string } })

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Trigger not found or does not belong to account',
    })
  })

  it('should return 403 if API key is invalid', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer wrong-api-key' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      config: { apiKey: 'correct-api-key' },
      workflow: {
        userId: 'acc-1',
      },
    } as unknown as Trigger & { workflow: { userId: string } })

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Invalid API Key',
    })
  })

  it('should return 200, enqueue execution, and log event on valid webhook', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer correct-api-key' },
      body: { payload: 'hello' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      config: { apiKey: 'correct-api-key' },
      workflow: {
        userId: 'acc-1',
      },
    } as unknown as Trigger & { workflow: { userId: string } })
    vi.mocked(prisma.log.create).mockResolvedValueOnce({} as unknown as Log)

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        data: { payload: 'hello' },
      })
    )
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          workflowId: 'wf-1',
          triggerId: 'trig-1',
          status: 'ENQUEUED',
          source: 'WEBHOOK',
        }),
      })
    )
    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Webhook received and processed',
    })
  })

  it('should return 403 and log failure if client IP is not in allowedIps', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: {
        authorization: 'Bearer correct-api-key',
        'x-forwarded-for': '203.0.113.55',
      },
      body: { payload: 'hello' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      config: {
        apiKey: 'correct-api-key',
        allowedIps: ['192.168.1.0/24'],
      },
      workflow: {
        userId: 'acc-1',
      },
    } as unknown as Trigger & { workflow: { userId: string } })
    vi.mocked(prisma.log.create).mockResolvedValueOnce({} as unknown as Log)

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Forbidden: Request source not allowed',
        clientIp: '203.0.113.55',
      })
    )
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILURE',
          source: 'WEBHOOK',
          remarks: 'Blocked by Webhook Source Filter',
        }),
      })
    )
  })

  it('should allow webhook if client IP matches allowedIps CIDR', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: {
        authorization: 'Bearer correct-api-key',
        'x-forwarded-for': '192.168.1.42',
      },
      body: { payload: 'hello' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      config: {
        apiKey: 'correct-api-key',
        allowedIps: ['192.168.1.0/24'],
      },
      workflow: {
        userId: 'acc-1',
      },
    } as unknown as Trigger & { workflow: { userId: string } })
    vi.mocked(prisma.log.create).mockResolvedValueOnce({} as unknown as Log)

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(enqueue).toHaveBeenCalled()
  })

  it('should return 500 if prisma throws an unexpected error', async () => {
    vi.useFakeTimers()
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer correct-api-key' },
      body: { payload: 'hello' },
    }

    vi.mocked(prisma.trigger.findUnique).mockRejectedValue(
      new Error('DB Connection Failed')
    )

    const promise = processWebhook(mockReq as Request, mockRes as Response)
    await vi.runAllTimersAsync()
    await promise

    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Internal server error',
    })
    vi.useRealTimers()
  })

  it('should return 500 immediately without retrying on non-retryable Prisma schema errors (P2022)', async () => {
    mockReq = {
      params: { accountId: 'acc-1', triggerId: 'trig-1' },
      headers: { authorization: 'Bearer correct-api-key' },
      body: { payload: 'hello' },
    }

    const schemaError = Object.assign(
      new Error(
        'The column `Trigger.nodeId` does not exist in the current database.'
      ),
      { code: 'P2022' }
    )
    vi.mocked(prisma.trigger.findUnique).mockRejectedValue(schemaError)

    await processWebhook(mockReq as Request, mockRes as Response)

    expect(prisma.trigger.findUnique).toHaveBeenCalledTimes(1)
    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Internal server error',
    })
  })
})

describe('Webhook Controller - processWebhookByToken', () => {
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

  it('should return 400 if webhookToken parameter is missing', async () => {
    mockReq = {
      params: { webhookToken: '' },
      body: { data: 'test' },
    }

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(400)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Webhook token is required',
    })
  })

  it('should return 404 if trigger is not found by token', async () => {
    mockReq = {
      params: { webhookToken: 'wh_nonexistent' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce(null)

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Webhook endpoint not found or workflow is inactive',
    })
  })

  it('should return 404 if workflow is inactive', async () => {
    mockReq = {
      params: { webhookToken: 'wh_inactive' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce({
      id: 'trig-1',
      workflowId: 'wf-1',
      nodeId: 'node-wh-1',
      webhookToken: 'wh_inactive',
      workflow: {
        id: 'wf-1',
        is_active: false,
      },
    } as unknown as Trigger)

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(404)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Webhook endpoint not found or workflow is inactive',
    })
  })

  it('should return 202, enqueue execution with startNodeId, and respond fast on valid token', async () => {
    mockReq = {
      params: { webhookToken: 'wh_valid_token' },
      body: { event: 'user_created', email: 'test@example.com' },
    }

    const mockTrigger = {
      id: 'trig-1',
      workflowId: 'wf-1',
      nodeId: 'node-wh-1',
      webhookToken: 'wh_valid_token',
      workflow: {
        id: 'wf-1',
        is_active: true,
      },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce(
      mockTrigger as unknown as Trigger
    )
    vi.mocked(prisma.log.create).mockResolvedValueOnce({} as unknown as Log)

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(202)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Webhook received and enqueued',
        executionId: expect.any(String),
      })
    )

    expect(enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        triggerId: 'trig-1',
        workflowId: 'wf-1',
        startNodeId: 'node-wh-1',
        data: { event: 'user_created', email: 'test@example.com' },
      })
    )
  })

  it('should return 403 and block webhook by token if client IP is not in allowedIps', async () => {
    mockReq = {
      params: { webhookToken: 'wh_valid_token' },
      headers: {
        'x-forwarded-for': '10.0.0.99',
      },
      body: { event: 'test' },
    }

    const mockTrigger = {
      id: 'trig-1',
      workflowId: 'wf-1',
      nodeId: 'node-wh-1',
      webhookToken: 'wh_valid_token',
      config: {
        allowedIps: ['192.168.1.1', '127.0.0.1'],
      },
      workflow: {
        id: 'wf-1',
        is_active: true,
      },
    }

    vi.mocked(prisma.trigger.findUnique).mockResolvedValueOnce(
      mockTrigger as unknown as Trigger
    )
    vi.mocked(prisma.log.create).mockResolvedValueOnce({} as unknown as Log)

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(statusMock).toHaveBeenCalledWith(403)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Forbidden: Request source not allowed',
        clientIp: '10.0.0.99',
      })
    )
    expect(enqueue).not.toHaveBeenCalled()
  })

  it('should return 500 if prisma throws error', async () => {
    vi.useFakeTimers()
    mockReq = {
      params: { webhookToken: 'wh_error' },
      body: { data: 'test' },
    }

    vi.mocked(prisma.trigger.findUnique).mockRejectedValue(
      new Error('DB Connection Failed')
    )

    const promise = processWebhookByToken(
      mockReq as Request,
      mockRes as Response
    )
    await vi.runAllTimersAsync()
    await promise

    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Internal server error',
    })
    vi.useRealTimers()
  })

  it('should return 500 immediately without retrying on non-retryable Prisma schema errors (P2022)', async () => {
    mockReq = {
      params: { webhookToken: 'wh_error' },
      body: { data: 'test' },
    }

    const schemaError = Object.assign(
      new Error(
        'The column `Trigger.webhookToken` does not exist in the current database.'
      ),
      { code: 'P2022' }
    )
    vi.mocked(prisma.trigger.findUnique).mockRejectedValue(schemaError)

    await processWebhookByToken(mockReq as Request, mockRes as Response)

    expect(prisma.trigger.findUnique).toHaveBeenCalledTimes(1)
    expect(statusMock).toHaveBeenCalledWith(500)
    expect(jsonMock).toHaveBeenCalledWith({
      message: 'Internal server error',
    })
  })
})

describe('Webhook Router - CORS Preflight Handling', () => {
  it('should handle OPTIONS preflight request with 200 and set CORS headers', async () => {
    const headers: Record<string, string> = {}
    const statusCode = 0
    let ended = false

    const req = {
      method: 'OPTIONS',
      url: '/acc-1/trig-1',
      headers: {
        origin: 'https://external-client.com',
        'access-control-request-method': 'POST',
        'access-control-request-headers': 'authorization,content-type',
      },
    } as unknown as Request

    const res = {
      setHeader: (name: string, value: string) => {
        headers[name.toLowerCase()] = value
      },
      getHeader: (name: string) => headers[name.toLowerCase()],
      statusCode: 200,
      end: () => {
        ended = true
      },
    } as unknown as Response

    // Run request through webhook router
    await new Promise<void>((resolve) => {
      webhookRouter(req, res, () => {
        resolve()
      })
      if (ended) resolve()
    })

    expect(headers['access-control-allow-origin']).toBe('*')
    expect(headers['access-control-allow-methods']).toContain('POST')
    expect(headers['access-control-allow-headers']).toContain('authorization')
  })
})
