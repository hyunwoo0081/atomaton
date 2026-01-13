import { Router } from 'express';
import { getSystemStats } from '../controllers/admin';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken);

router.get('/stats', getSystemStats);

export default router;
