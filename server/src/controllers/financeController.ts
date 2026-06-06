import type { Request, Response, NextFunction } from 'express'
import { query } from '../db/database'
import { createError } from '../middleware/errorHandler'
import type { Sale, CreateSaleBody } from '../models'

function currentMonth(): string { return new Date().toISOString().slice(0, 7) }

// GET /api/finance?month=YYYY-MM
export async function listSales(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.user!.id
    const month  = typeof req.query.month === 'string' ? req.query.month : currentMonth()

    const [sales, userRow] = await Promise.all([
      query<Sale>(
        `SELECT id, amount::float, source, description, date, created_at AS "createdAt"
         FROM sales
         WHERE user_id = $1 AND TO_CHAR(date, 'YYYY-MM') = $2
         ORDER BY date DESC, created_at DESC`,
        [userId, month],
      ),
      query<{ monthlyGoal: number }>(
        'SELECT monthly_goal::float AS "monthlyGoal" FROM users WHERE id = $1',
        [userId],
      ),
    ])

    res.json({ sales, monthlyGoal: userRow[0]?.monthlyGoal ?? 0 })
  } catch (err) {
    next(err)
  }
}

// POST /api/finance
export async function createSale(
  req: Request<object, object, CreateSaleBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { amount, source, description = '', date } = req.body
    const [sale] = await query<Sale>(
      `INSERT INTO sales (user_id, amount, source, description, date)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, amount::float, source, description, date, created_at AS "createdAt"`,
      [req.user!.id, amount, source, description.trim(), date],
    )
    res.status(201).json(sale)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/finance/:id
export async function deleteSale(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await query(
      'DELETE FROM sales WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id],
    )
    if (rows.length === 0) { next(createError('Sale not found', 404)); return }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// GET /api/finance/stats — monthly totals for the last 12 months
export async function getStats(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query<{ month: string; total: number; count: number }>(
      `SELECT
         TO_CHAR(DATE_TRUNC('month', date), 'YYYY-MM') AS month,
         SUM(amount)::float AS total,
         COUNT(*)::int AS count
       FROM sales
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '12 months'
       GROUP BY DATE_TRUNC('month', date)
       ORDER BY DATE_TRUNC('month', date) DESC`,
      [req.user!.id],
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}
