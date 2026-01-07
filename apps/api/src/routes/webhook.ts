import { Router } from 'express';
import { processWebhook } from '../controllers/webhook';

const router = Router();

router.post('/:accountId/:triggerId', processWebhook);

export default router;
