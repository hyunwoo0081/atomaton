// apps/api/src/executors/__tests__/notion-integration.spec.ts
process.env.MASTER_KEY = 'this_is_a_32_byte_test_key_!!!!'

import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest'
import { executeWorkflow } from '../executor'
import { WorkflowContext, UIConfig } from '../types'
import { encrypt } from '@atomaton/db'

// Mock Notion Client
const createMock = vi.fn()
vi.mock('@notionhq/client', () => {
  return {
    Client: vi.fn().mockImplementation(function () {
      return {
        pages: {
          create: createMock,
        },
      }
    }),
  }
})

// Mock Database
vi.mock('@atomaton/db', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>
  return {
    ...actual,
    default: {
      workflow: { findUnique: vi.fn() },
      account: { findUnique: vi.fn() },
      log: {
        create: vi.fn().mockResolvedValue({}),
        findMany: vi.fn().mockResolvedValue([]),
      },
    },
    LogStatus: { SUCCESS: 'SUCCESS', FAILURE: 'FAILURE' },
  }
})

import prisma from '@atomaton/db'

describe('Notion Integration (Email -> Notion)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('should successfully execute Workflow: Email Trigger -> Notion Action', async () => {
    const encryptedToken = encrypt('secret-notion-token')

    ;(prisma.account.findUnique as Mock).mockResolvedValue({
      id: 'acc-1',
      credentials: { token: encryptedToken },
    })

    createMock.mockResolvedValue({ id: 'new-page-id' })

    const context: WorkflowContext = {
      workflowId: 'wf-1',
      triggerId: 'tr-1',
      executionId: 'ex-1',
      data: {
        from: 'boss@company.com',
        subject: 'Monthly Report',
        content: 'Please review the attached document.',
      },
      results: {},
    }

    const workflow: UIConfig = {
      nodes: [
        {
          id: 't1',
          type: 'trigger-imap',
          data: { label: 'Email', config: {} },
        },
        {
          id: 'n1',
          type: 'action-notion',
          data: {
            label: 'Save to Notion',
            config: {
              accountId: 'acc-1',
              databaseId: 'db-1',
              properties: {
                Name: { title: [{ text: { content: 'Email from {{from}}' } }] },
                Subject: { rich_text: [{ text: { content: '{{subject}}' } }] },
              },
            },
          },
        },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'n1' }],
    }

    const promise = executeWorkflow(context, workflow)
    await vi.runAllTimersAsync()
    const logs = await promise

    expect(logs).toBeDefined()
    expect(logs?.[0].status).toBe('SUCCESS')
    expect(createMock).toHaveBeenCalledWith({
      parent: { database_id: 'db-1' },
      properties: {
        Name: { title: [{ text: { content: 'Email from boss@company.com' } }] },
        Subject: { rich_text: [{ text: { content: 'Monthly Report' } }] },
      },
    })
  })

  it('should log FAILURE after max retries when Notion API returns 500', async () => {
    ;(prisma.account.findUnique as Mock).mockResolvedValue({
      id: 'acc-1',
      credentials: { token: 'raw-token' }, // Test fallback (not encrypted)
    })

    // Mock Notion failure
    const notionError = new Error('Internal Server Error')
    ;(notionError as Record<string, unknown>).status = 500
    createMock.mockRejectedValue(notionError)

    const context: WorkflowContext = {
      workflowId: 'wf-1',
      triggerId: 'tr-1',
      executionId: 'ex-2',
      data: { from: 'test' },
      results: {},
    }

    const workflow: UIConfig = {
      nodes: [
        { id: 't1', type: 'trigger', data: { label: 'T', config: {} } },
        {
          id: 'n1',
          type: 'action-notion',
          data: {
            label: 'N',
            config: { accountId: 'acc-1', databaseId: 'db-1', properties: {} },
          },
        },
      ],
      edges: [{ id: 'e1', source: 't1', target: 'n1' }],
    }

    const promise = executeWorkflow(context, workflow)
    await vi.runAllTimersAsync()
    await promise

    // We expect 5 attempts
    expect(createMock).toHaveBeenCalledTimes(5)

    // The last log (or the one thrown in executeWorkflow) should be FAILURE
    // executeWorkflow catches the error and creates a final FAILURE log
    expect(prisma.log.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: 'FAILURE',
          message: expect.stringContaining('Workflow failed'),
        }),
      })
    )
  })
})
