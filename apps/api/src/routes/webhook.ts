import { Router } from 'express'
import cors from 'cors'
import { processWebhook, processWebhookByToken } from '../controllers/webhook'

const router = Router()

// Explicitly enable CORS and preflight handling for external webhooks
router.use(
  cors({
    origin: '*',
    methods: ['POST', 'OPTIONS'],
    optionsSuccessStatus: 200,
  })
)

// Legacy endpoint (Account ID & Trigger ID with Bearer header)
router.post('/:accountId/:triggerId', processWebhook)

// Modern standard endpoint (Single Capability Token)
router.post('/:webhookToken', processWebhookByToken)

export default router
