import { Router } from 'express'
import * as training from '../controllers/trainingController'
import { requireAuth } from '../middleware/auth'

const router = Router()

router.use(requireAuth)

router.get('/',                training.getSessions)
router.post('/',               training.createSession)
router.patch('/exercises/:id', training.updateExercise)
router.get('/pr/:name',        training.getPersonalRecord)

export default router
