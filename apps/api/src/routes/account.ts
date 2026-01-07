import { Router } from 'express';
import {
  createAccount,
  getAccounts,
  getAccountById,
  updateAccount,
  deleteAccount,
} from '../controllers/account';
import { authenticateToken } from '../middleware/auth';

const router = Router();

router.use(authenticateToken); // All account routes require authentication

router.post('/', createAccount);
router.get('/', getAccounts);
router.get('/:id', getAccountById);
router.put('/:id', updateAccount);
router.delete('/:id', deleteAccount);

export default router;
