import { Router } from 'express'
import cors from 'cors'
import { processWebhook } from '../controllers/webhook'

const router = Router()

// Explicitly enable CORS and preflight handling for external webhooks
router.use(
  cors({
    origin: '*',
    methods: ['POST', 'OPTIONS'],
    optionsSuccessStatus: 200,
  })
)

router.post('/:accountId/:triggerId', processWebhook)

export default router
