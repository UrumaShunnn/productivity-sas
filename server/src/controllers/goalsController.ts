import type { Request, Response, NextFunction } from 'express'
import { query } from '../db/database'
import { createError } from '../middleware/errorHandler'
import type { Goal, CreateGoalBody, UpdateGoalBody } from '../models'

const COLS = `id, title, type, category, progress, deadline, streak,
              last_updated AS "lastUpdated", created_at AS "createdAt"`

function today(): string { return new Date().toISOString().split('T')[0] as string }

function calcStreak(current: number, lastUpdated: string | null): number {
  if (!lastUpdated) return 1
  const diffDays = Math.round(
    (new Date(today()).getTime() - new Date(lastUpdated).getTime()) / 86_400_000,
  )
  if (diffDays === 0) return current
  if (diffDays === 1) return current + 1
  return 1
}

// GET /api/goals
export async function getGoals(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const goals = await query<Goal>(
      `SELECT ${COLS} FROM goals WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user!.id],
    )
    res.json(goals.map(({ lastUpdated: _lu, ...g }) => g))
  } catch (err) {
    next(err)
  }
}

// POST /api/goals
export async function createGoal(
  req: Request<object, object, CreateGoalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, type = 'longterm', category = 'Personal', deadline = '' } = req.body
    const [goal] = await query<Goal>(
      `INSERT INTO goals (user_id, title, type, category, deadline) VALUES ($1,$2,$3,$4,$5) RETURNING ${COLS}`,
      [req.user!.id, title.trim(), type, category, deadline],
    )
    const { lastUpdated: _lu, ...response } = goal
    res.status(201).json(response)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/goals/:id
export async function updateGoal(
  req: Request<{ id: string }, object, UpdateGoalBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const existing = await query<Goal>(
      `SELECT ${COLS} FROM goals WHERE id = $1 AND user_id = $2`,
      [req.params.id, req.user!.id],
    )
    if (existing.length === 0) { next(createError('Goal not found', 404)); return }
    const current = existing[0]!

    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1

    const { title, progress, deadline, streak } = req.body

    if (title    !== undefined) { sets.push(`title = $${i++}`);    vals.push(title.trim()) }
    if (deadline !== undefined) { sets.push(`deadline = $${i++}`); vals.push(deadline) }

    if (progress !== undefined && progress !== current.progress) {
      const clamped = Math.min(100, Math.max(0, progress))
      sets.push(`progress = $${i++}`)
      vals.push(clamped)

      const newStreak = streak !== undefined ? streak : calcStreak(current.streak, current.lastUpdated)
      sets.push(`streak = $${i++}`)
      vals.push(newStreak)
      sets.push(`last_updated = $${i++}`)
      vals.push(today())
    } else if (streak !== undefined) {
      sets.push(`streak = $${i++}`)
      vals.push(streak)
    }

    if (sets.length === 0) { res.status(422).json({ error: 'No fields to update' }); return }
    vals.push(req.params.id, req.user!.id)

    const [goal] = await query<Goal>(
      `UPDATE goals SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING ${COLS}`,
      vals,
    )
    const { lastUpdated: _lu, ...response } = goal
    res.json(response)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/goals/:id
export async function deleteGoal(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await query(
      'DELETE FROM goals WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id],
    )
    if (rows.length === 0) { next(createError('Goal not found', 404)); return }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
