import { Router } from 'express'
import {
  getSystemStats,
  getUsers,
  createUser,
  deleteUser,
} from '../controllers/admin'
import { authenticateToken, authorizeDeveloper } from '../middleware/auth'

const router = Router()

router.use(authenticateToken)
router.use(authorizeDeveloper)

router.get('/stats', getSystemStats)
router.get('/users', getUsers)
router.post('/users', createUser)
router.delete('/users/:id', deleteUser)

export default router
