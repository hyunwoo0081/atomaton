// apps/api/src/routes/log.ts
import { Router } from 'express';
import { getLogs } from '../controllers/log';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/', getLogs);

export default router;
