import { Router } from 'express'
import * as auth from '../controllers/authController'
import { requireAuth } from '../middleware/auth'
import { authRateLimit, loginRateLimit } from '../middleware/rateLimit'
import { authValidators, validate } from '../utils/validators'

const router = Router()

router.post('/register', authRateLimit,  ...authValidators.register, validate, auth.register)
router.post('/login',    loginRateLimit, ...authValidators.login,    validate, auth.login)
router.post('/refresh',  authRateLimit,  auth.refresh)
router.post('/logout',   authRateLimit,  auth.logout)
router.get('/me',        requireAuth,    auth.me)
router.patch('/username', requireAuth, ...authValidators.updateUsername, validate, auth.updateUsername)

export default router
