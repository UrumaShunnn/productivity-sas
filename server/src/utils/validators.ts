import { body, param } from 'express-validator'
import { validationResult } from 'express-validator'
import type { Request, Response, NextFunction } from 'express'

export function validate(req: Request, res: Response, next: NextFunction): void {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    res.status(422).json({ errors: errors.array() })
    return
  }
  next()
}

export const authValidators = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 8 }).withMessage('Password must be ≥ 8 characters'),
    body('username').trim().isLength({ min: 2, max: 50 }).withMessage('Username must be ≥ 2 characters'),
  ],
  login: [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  updateUsername: [
    body('username').trim().isLength({ min: 1, max: 50 }),
  ],
}

export const taskValidators = {
  create: [
    body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title required'),
    body('priority').optional().isIn(['HIGH', 'MED', 'LOW']),
  ],
  update: [
    param('id').isUUID(),
    body('title').optional().trim().isLength({ min: 1, max: 500 }),
    body('priority').optional().isIn(['HIGH', 'MED', 'LOW']),
    body('completed').optional().isBoolean(),
  ],
}

export const goalValidators = {
  create: [
    body('title').trim().isLength({ min: 1, max: 500 }).withMessage('Title required'),
    body('type').optional().isIn(['weekly', 'longterm']),
    body('category').optional().isIn(['Business', 'Finance', 'Personal', 'Health']),
    body('deadline').optional().isString(),
  ],
  update: [
    param('id').isUUID(),
    body('progress').optional().isInt({ min: 0, max: 100 }),
    body('streak').optional().isInt({ min: 0 }),
    body('deadline').optional().isString(),
  ],
}

export const saleValidators = {
  create: [
    body('amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
    body('source').isIn(['Vinted', 'Autre']),
    body('description').optional().trim().isLength({ max: 500 }),
    body('date').isISO8601().withMessage('Valid ISO date required'),
  ],
}

export const userValidators = {
  settings: [
    body('accentColor').optional().isString().isLength({ min: 1, max: 20 }),
    body('backgroundPreset').optional().isString().isLength({ min: 1, max: 50 }),
    body('username').optional().trim().isLength({ min: 2, max: 50 }),
    body('soundsEnabled').optional().isBoolean(),
    body('monthlyGoal').optional().isFloat({ min: 0 }),
  ],
  history: [
    body('tasksCompleted').isInt({ min: 0 }),
    body('tasksTotal').isInt({ min: 0 }),
    body('rate').isFloat({ min: 0, max: 100 }),
    body('score').isInt({ min: 0 }),
    body('workouts').isInt({ min: 0 }),
  ],
}
