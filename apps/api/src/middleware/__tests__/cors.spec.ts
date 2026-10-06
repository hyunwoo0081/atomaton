import { describe, it, expect } from 'vitest'
import { corsOptionsDelegate } from '../cors'
import { Request } from 'express'
import cors from 'cors'

describe('CORS Middleware - corsOptionsDelegate', () => {
  it('should allow full cross-origin POST and OPTIONS for webhook routes', async () => {
    const req = {
      path: '/webhook/user-123/trigger-456',
      headers: {
        origin: 'https://third-party-service.com',
      },
    } as unknown as Request

    let capturedOptions: cors.CorsOptions | undefined

    corsOptionsDelegate(req, (err, options) => {
      expect(err).toBeNull()
      capturedOptions = options
    })

    expect(capturedOptions).toBeDefined()
    expect(capturedOptions?.origin).toBe('*')
    expect(capturedOptions?.methods).toEqual(['POST', 'OPTIONS'])
    expect(capturedOptions?.optionsSuccessStatus).toBe(200)
  })

  it('should restrict cross-origin access to GET/HEAD only for non-webhook endpoints from arbitrary origins', async () => {
    const req = {
      path: '/workflows/wf-123',
      headers: {
        origin: 'https://arbitrary-third-party.com',
      },
    } as unknown as Request

    let capturedOptions: cors.CorsOptions | undefined

    corsOptionsDelegate(req, (err, options) => {
      expect(err).toBeNull()
      capturedOptions = options
    })

    expect(capturedOptions).toBeDefined()
    expect(capturedOptions?.origin).toBe('*')
    expect(capturedOptions?.methods).toEqual(['GET', 'HEAD'])
    expect(capturedOptions?.optionsSuccessStatus).toBe(200)
  })

  it('should grant full methods for official frontend dashboard origin', async () => {
    const req = {
      path: '/workflows/wf-123',
      headers: {
        origin: 'http://localhost:5173',
      },
    } as unknown as Request

    let capturedOptions: cors.CorsOptions | undefined

    corsOptionsDelegate(req, (err, options) => {
      expect(err).toBeNull()
      capturedOptions = options
    })

    expect(capturedOptions).toBeDefined()
    expect(capturedOptions?.origin).toBe(true)
    expect(capturedOptions?.methods).toContain('POST')
    expect(capturedOptions?.methods).toContain('PUT')
    expect(capturedOptions?.methods).toContain('DELETE')
  })
})
