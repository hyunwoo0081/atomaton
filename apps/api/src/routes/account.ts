import { Router } from 'express'
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} from '../controllers/account'
import { authenticateToken, validateAccountOwner } from '../middleware/auth'

const router = Router()

router.use(authenticateToken) // All account routes require authentication

router.post('/', createAccount)
router.get('/', getAccounts)
router.get('/:id', validateAccountOwner, getAccountById)
router.put('/:id', validateAccountOwner, updateAccount)
router.delete('/:id', validateAccountOwner, deleteAccount)

export default router
