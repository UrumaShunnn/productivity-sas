import { Router } from 'express'
import * as users from '../controllers/usersController'
import { requireAuth } from '../middleware/auth'
import { userValidators, validate } from '../utils/validators'

const router = Router()

router.use(requireAuth)

router.patch('/settings', ...userValidators.settings, validate, users.updateSettings)
router.get('/history',    users.getHistory)
router.post('/history',   ...userValidators.history,  validate, users.upsertHistory)

export default router
