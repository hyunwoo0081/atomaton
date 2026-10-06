import cors from 'cors'
import { Request } from 'express'

export const corsOptionsDelegate: cors.CorsOptionsDelegate<Request> = (
  req,
  callback
) => {
  const origin = req.headers.origin
  const isWebhook =
    req.path?.startsWith('/webhook') || req.originalUrl?.startsWith('/webhook')

  if (isWebhook) {
    // Webhook endpoints are open to all origins for POST and preflight OPTIONS
    callback(null, {
      origin: '*',
      methods: ['POST', 'OPTIONS'],
      optionsSuccessStatus: 200,
    })
    return
  }

  const allowedDashboardOrigins = [
    'http://localhost:5173',
    'http://localhost:3000',
    process.env.FRONTEND_URL,
  ].filter(Boolean) as string[]

  if (origin && allowedDashboardOrigins.includes(origin)) {
    // Official frontend dashboard has full access
    callback(null, {
      origin: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      optionsSuccessStatus: 200,
    })
    return
  }

  // All other external origins are restricted to GET only
  callback(null, {
    origin: '*',
    methods: ['GET', 'HEAD'],
    optionsSuccessStatus: 200,
  })
}

export const corsMiddleware = cors(corsOptionsDelegate)
