import { Router } from 'express'
import {
  createWorkflow,
  getWorkflows,
  getWorkflowById,
  updateWorkflow,
  deleteWorkflow,
  testWorkflow,
  duplicateWorkflow,
} from '../controllers/workflow'
import { authenticateToken, validateWorkflowOwner } from '../middleware/auth'

const router = Router()

router.use(authenticateToken) // All workflow routes require authentication

router.post('/', createWorkflow)
router.get('/', getWorkflows)
router.get('/:id', validateWorkflowOwner, getWorkflowById)
router.put('/:id', validateWorkflowOwner, updateWorkflow)
router.delete('/:id', validateWorkflowOwner, deleteWorkflow)
router.post('/:id/test', validateWorkflowOwner, testWorkflow) // Add test route
router.post('/:id/duplicate', validateWorkflowOwner, duplicateWorkflow)

export default router
