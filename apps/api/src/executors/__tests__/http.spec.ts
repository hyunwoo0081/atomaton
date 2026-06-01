// apps/api/src/executors/__tests__/http.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  Mock,
  MockInstance,
} from 'vitest'
import axios from 'axios'
import prisma, { Workflow } from '@atomaton/db'
import * as queue from '../queue'
import { resolvePath, executeWorkflow } from '../executor'
import { WorkflowContext, UIConfig, ActionConfig } from '../types'

// Mock axios correctly
vi.mock('axios', () => {
  const mockAxios = vi.fn()
  ;(mockAxios as unknown as { post: unknown }).post = vi.fn()
  ;(mockAxios as unknown as { get: unknown }).get = vi.fn()
  ;(mockAxios as unknown as { isAxiosError: unknown }).isAxiosError = vi.fn(
    (err: unknown) =>
      !!err &&
      typeof err === 'object' &&
      ('response' in err || 'isAxiosError' in err)
  )
  return {
    default: mockAxios,
    __esModule: true,
  }
})

const mockedAxios = axios as unknown as Mock & { post: Mock; get: Mock }

vi.mock('@atomaton/db', () => ({
  default: {
    workflow: { findUnique: vi.fn() },
    log: {
      create: vi.fn().mockResolvedValue({}),
      findMany: vi.fn().mockResolvedValue([]),
    },
  },
  LogStatus: { SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
}))

describe('HTTP Request Node & Path Resolution', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('resolvePath', () => {
    it('should resolve deep paths', () => {
      const data = { a: { b: [{ c: 'target' }] } }
      expect(
        resolvePath(data as unknown as Record<string, unknown>, 'a.b[0].c')
      ).toBe('target')
    })
  })

  describe('executeHttpRequestAction', () => {
    it('should extract variables and pass to next node', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex1',
        data: { msg: 'hello' },
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger-webhook',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'h1',
            type: 'action-http',
            data: {
              label: 'H',
              config: {
                method: 'POST',
                url: 'https://api.com',
                body: '{"m":"{{msg}}"}',
                responseMapping: [{ sourcePath: 'ans', targetVariable: 'res' }],
              } as unknown as ActionConfig,
            },
          },
          {
            id: 'd1',
            type: 'action',
            data: {
              label: 'D',
              config: {
                webhookUrl: 'https://disc.com',
                content: 'Result: {{res}}',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [
          { id: 'e1', source: 't1', target: 'h1' },
          { id: 'e2', source: 'h1', target: 'd1' },
        ],
      }

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { ans: 'AI-DONE' },
      })
      mockedAxios.post.mockResolvedValueOnce({ status: 204 })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      await promise

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.com',
          data: { m: 'hello' },
        })
      )

      expect(mockedAxios.post).toHaveBeenCalledWith(
        'https://disc.com',
        expect.objectContaining({
          content: 'Result: AI-DONE',
        })
      )
    })

    it('should retry on failure', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex2',
        data: {},
        results: {},
      }

      mockedAxios.mockRejectedValueOnce({ response: { status: 500 } })
      mockedAxios.mockResolvedValueOnce({ status: 200, data: { ok: true } })

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'h1',
            type: 'action-http',
            data: {
              label: 'H',
              config: {
                method: 'GET',
                url: 'https://api.example.com',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'h1' }],
      }

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      await promise

      expect(mockedAxios).toHaveBeenCalledTimes(2)
    })

    it('should securely handle JSON injection attempts in body template', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex-sec',
        data: {
          msg: 'hello", "isAdmin": true, "dummy": "',
        },
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger-webhook',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'h1',
            type: 'action-http',
            data: {
              label: 'H',
              config: {
                method: 'POST',
                url: 'https://api.com',
                body: '{"m":"{{msg}}"}',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'h1' }],
      }

      mockedAxios.mockResolvedValueOnce({
        status: 200,
        data: { ok: true },
      })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      await promise

      expect(mockedAxios).toHaveBeenCalledWith(
        expect.objectContaining({
          url: 'https://api.com',
          data: { m: 'hello", "isAdmin": true, "dummy": "' },
        })
      )
    })
  })

  describe('executeDiscordAction Retry Logic', () => {
    it('should retry Discord webhook on 500 or 429 error and then succeed if it eventually works', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex3',
        data: {},
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'd1',
            type: 'action',
            data: {
              label: 'Discord',
              config: {
                webhookUrl: 'https://discord-test.com',
                content: 'Test Message',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'd1' }],
      }

      // Mock first call fails with 500, second call succeeds
      mockedAxios.post.mockRejectedValueOnce({ response: { status: 500 } })
      mockedAxios.post.mockResolvedValueOnce({
        status: 200,
        data: { ok: true },
      })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      await promise

      expect(mockedAxios.post).toHaveBeenCalledTimes(2)
    })

    it('should retry Discord Webhook up to 5 times and then fail if error persists', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf1',
        triggerId: 'tr1',
        executionId: 'ex4',
        data: {},
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'd1',
            type: 'action',
            data: {
              label: 'Discord',
              config: {
                webhookUrl: 'https://discord-test.com',
                content: 'Test Message',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'd1' }],
      }

      // Mock all calls failing with 429
      mockedAxios.post.mockRejectedValue({ response: { status: 429 } })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      try {
        await promise
      } catch {
        // Expected to throw because workflow node failed
      }

      expect(mockedAxios.post).toHaveBeenCalledTimes(5)
    })
  })

  describe('Global Workflow Retry & Discord Statuspage Logic', () => {
    let enqueueSpy: MockInstance

    beforeEach(() => {
      enqueueSpy = vi
        .spyOn(queue, 'enqueueWithDelay')
        .mockImplementation(() => {})
    })

    afterEach(() => {
      enqueueSpy.mockRestore()
    })

    it('should query discordstatus.com and populate remarks on Discord webhook failure', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf-discord-fail',
        triggerId: 'tr1',
        executionId: 'ex-discord-fail',
        data: {},
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'd1',
            type: 'action',
            data: {
              label: 'Discord',
              config: {
                webhookUrl: 'https://discord-test.com',
                content: 'Failed Message',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'd1' }],
      }

      // Mock Discord status API response
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: {
            indicator: 'major',
            description: 'Major Outage',
          },
        },
      })

      // Mock all Discord post calls to fail (forces failure after 5 attempts)
      mockedAxios.post.mockRejectedValue({ response: { status: 500 } })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      try {
        await promise
      } catch {
        // expected failure
      }

      // 1. Verify that discord status API was called
      expect(mockedAxios.get).toHaveBeenCalledWith(
        'https://discordstatus.com/api/v2/status.json',
        expect.objectContaining({ timeout: 3000 })
      )

      // 2. Verify that prisma.log.create was called with the outage remarks
      expect(prisma.log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionId: 'ex-discord-fail',
            remarks:
              'Potential Discord Outage detected: Major Outage (indicator: major)',
          }),
        })
      )
    })

    it('should not populate remarks if discordstatus.com reports indicator "none"', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf-discord-ok',
        triggerId: 'tr1',
        executionId: 'ex-discord-ok',
        data: {},
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'd1',
            type: 'action',
            data: {
              label: 'Discord',
              config: {
                webhookUrl: 'https://discord-test.com',
                content: 'Failed Message',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'd1' }],
      }

      // Mock Discord status API to return "none"
      mockedAxios.get.mockResolvedValueOnce({
        data: {
          status: {
            indicator: 'none',
            description: 'All Systems Operational',
          },
        },
      })

      mockedAxios.post.mockRejectedValue({ response: { status: 500 } })

      const promise = executeWorkflow(context, workflow)
      await vi.runAllTimersAsync()
      try {
        await promise
      } catch {
        // expected failure
      }

      // Verify that prisma.log.create was called without outage remarks (remarks should be null)
      expect(prisma.log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionId: 'ex-discord-ok',
            remarks: null,
          }),
        })
      )
    })

    it('should schedule global retry with exponential backoff on workflow failure', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf-retry',
        triggerId: 'tr1',
        executionId: 'ex-retry',
        data: {},
        results: {},
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'h1',
            type: 'action-http',
            data: {
              label: 'HTTP',
              config: {
                method: 'GET',
                url: 'https://failing-api.com',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'h1' }],
      }

      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce({
        id: 'wf-retry',
        is_active: true,
        ui_config: workflow,
      } as unknown as Workflow)

      mockedAxios.mockRejectedValue({ response: { status: 500 } })

      const promise = executeWorkflow(context)
      await vi.runAllTimersAsync()
      try {
        await promise
      } catch {
        // expected
      }

      // Should schedule first retry (10s delay)
      expect(enqueueSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          executionId: 'ex-retry',
          retryCount: 1,
        }),
        10000
      )

      // Should have created an ENQUEUED log entry
      expect(prisma.log.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            executionId: 'ex-retry',
            status: 'ENQUEUED',
            message: 'Scheduled retry attempt 1 of 3',
            remarks: 'Will execute in 10 seconds',
          }),
        })
      )
    })

    it('should stop enqueuing retries once retryCount reaches 3', async () => {
      const context: WorkflowContext = {
        workflowId: 'wf-retry-max',
        triggerId: 'tr1',
        executionId: 'ex-retry-max',
        data: {},
        results: {},
        retryCount: 3,
      }

      const workflow: UIConfig = {
        nodes: [
          {
            id: 't1',
            type: 'trigger',
            data: { label: 'T', config: {} as unknown as ActionConfig },
          },
          {
            id: 'h1',
            type: 'action-http',
            data: {
              label: 'HTTP',
              config: {
                method: 'GET',
                url: 'https://failing-api.com',
              } as unknown as ActionConfig,
            },
          },
        ],
        edges: [{ id: 'e1', source: 't1', target: 'h1' }],
      }

      vi.mocked(prisma.workflow.findUnique).mockResolvedValueOnce({
        id: 'wf-retry-max',
        is_active: true,
        ui_config: workflow,
      } as unknown as Workflow)

      mockedAxios.mockRejectedValue({ response: { status: 500 } })

      const promise = executeWorkflow(context)
      await vi.runAllTimersAsync()
      try {
        await promise
      } catch {
        // expected
      }

      // enqueueSpy should NOT have been called because retryCount was already 3
      expect(enqueueSpy).not.toHaveBeenCalled()
    })
  })
})
