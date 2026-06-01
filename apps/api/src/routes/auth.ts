import { Router } from 'express'
import { register, login, changePassword, getMe } from '../controllers/auth'
import { authenticateToken } from '../middleware/auth'

const router = Router()

router.post('/register', register)
router.post('/login', login)
router.post('/change-password', authenticateToken, changePassword)
router.get('/me', authenticateToken, getMe)

export default router
