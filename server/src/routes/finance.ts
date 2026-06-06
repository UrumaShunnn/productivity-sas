import { Router } from 'express'
import * as finance from '../controllers/financeController'
import { requireAuth } from '../middleware/auth'
import { saleValidators, validate } from '../utils/validators'

const router = Router()

router.use(requireAuth)

router.get('/stats', finance.getStats)
router.get('/',      finance.listSales)
router.post('/',     ...saleValidators.create, validate, finance.createSale)
router.delete('/:id', finance.deleteSale)

export default router
