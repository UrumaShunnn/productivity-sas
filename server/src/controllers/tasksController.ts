import type { Request, Response, NextFunction } from 'express'
import { query } from '../db/database'
import { createError } from '../middleware/errorHandler'
import type { Task, CreateTaskBody, UpdateTaskBody } from '../models'

const COLS = `id, title, priority, completed, pomodoros, date, created_at AS "createdAt"`

function today(): string { return new Date().toISOString().split('T')[0] as string }

// GET /api/tasks?date=YYYY-MM-DD
export async function getTasks(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const date = typeof req.query.date === 'string' ? req.query.date : today()
    const tasks = await query<Task>(
      `SELECT ${COLS} FROM tasks WHERE user_id = $1 AND date = $2::date ORDER BY created_at DESC`,
      [req.user!.id, date],
    )
    res.json(tasks)
  } catch (err) {
    next(err)
  }
}

// POST /api/tasks
export async function createTask(
  req: Request<object, object, CreateTaskBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, priority = 'MED' } = req.body
    const [task] = await query<Task>(
      `INSERT INTO tasks (user_id, title, priority) VALUES ($1, $2, $3) RETURNING ${COLS}`,
      [req.user!.id, title.trim(), priority],
    )
    res.status(201).json(task)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/tasks/:id
export async function updateTask(
  req: Request<{ id: string }, object, UpdateTaskBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { title, priority, completed, pomodoros } = req.body
    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1

    if (title     !== undefined) { sets.push(`title = $${i++}`);     vals.push(title.trim()) }
    if (priority  !== undefined) { sets.push(`priority = $${i++}`);  vals.push(priority) }
    if (completed !== undefined) { sets.push(`completed = $${i++}`); vals.push(completed) }
    if (pomodoros !== undefined) { sets.push(`pomodoros = $${i++}`); vals.push(pomodoros) }

    if (sets.length === 0) { res.status(422).json({ error: 'No fields to update' }); return }
    vals.push(req.params.id, req.user!.id)

    const [task] = await query<Task>(
      `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${i} AND user_id = $${i + 1} RETURNING ${COLS}`,
      vals,
    )
    if (!task) { next(createError('Task not found', 404)); return }
    res.json(task)
  } catch (err) {
    next(err)
  }
}

// DELETE /api/tasks/:id
export async function deleteTask(
  req: Request<{ id: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await query(
      'DELETE FROM tasks WHERE id = $1 AND user_id = $2 RETURNING id',
      [req.params.id, req.user!.id],
    )
    if (rows.length === 0) { next(createError('Task not found', 404)); return }
    res.status(204).send()
  } catch (err) {
    next(err)
  }
}
