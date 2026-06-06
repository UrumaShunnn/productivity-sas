import { Router } from 'express'
import * as goals from '../controllers/goalsController'
import { requireAuth } from '../middleware/auth'
import { goalValidators, validate } from '../utils/validators'

const router = Router()

router.use(requireAuth)

router.get('/',       goals.getGoals)
router.post('/',      ...goalValidators.create, validate, goals.createGoal)
router.patch('/:id',  ...goalValidators.update, validate, goals.updateGoal)
router.delete('/:id', goals.deleteGoal)

export default router
