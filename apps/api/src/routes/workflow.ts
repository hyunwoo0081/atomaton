import { Router } from 'express';
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
} from '../controllers/workflow';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken); // All workflow routes require authentication

router.post('/', createWorkflow);
router.get('/', getWorkflows);
router.get('/:id', getWorkflowById);
router.put('/:id', updateWorkflow);
router.delete('/:id', deleteWorkflow);

export default router;
