import { Router } from 'express'
import * as tasks from '../controllers/tasksController'
import { requireAuth } from '../middleware/auth'
import { taskValidators, validate } from '../utils/validators'

const router = Router()

router.use(requireAuth)

router.get('/',                   tasks.getTasks)
router.post('/',                  ...taskValidators.create, validate, tasks.createTask)
router.patch('/:id',              ...taskValidators.update, validate, tasks.updateTask)
router.delete('/:id',             tasks.deleteTask)

export default router
