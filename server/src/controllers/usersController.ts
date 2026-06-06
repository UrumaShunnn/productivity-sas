import type { Request, Response, NextFunction } from 'express'
import { query } from '../db/database'
import { createError } from '../middleware/errorHandler'
import type { PublicUser, DailyHistory, UpdateUserSettingsBody, UpsertHistoryBody } from '../models'

const PUBLIC_COLS = `
  id, email, username,
  accent_color      AS "accentColor",
  background_preset AS "backgroundPreset",
  sounds_enabled    AS "soundsEnabled",
  monthly_goal      AS "monthlyGoal",
  current_streak    AS "currentStreak",
  best_streak       AS "bestStreak",
  created_at        AS "createdAt",
  updated_at        AS "updatedAt"
`

const ALLOWED_FIELDS: Record<string, string> = {
  accentColor:      'accent_color',
  backgroundPreset: 'background_preset',
  username:         'username',
  soundsEnabled:    'sounds_enabled',
  monthlyGoal:      'monthly_goal',
}

// PATCH /api/users/settings
export async function updateSettings(
  req: Request<object, object, UpdateUserSettingsBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const body = req.body as Record<string, unknown>
    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1

    for (const [key, col] of Object.entries(ALLOWED_FIELDS)) {
      const val = body[key]
      if (val !== undefined) {
        sets.push(`${col} = $${i++}`)
        vals.push(typeof val === 'string' ? val.trim() : val)
      }
    }

    if (sets.length === 0) { res.status(422).json({ error: 'No fields to update' }); return }
    sets.push('updated_at = now()')
    vals.push(req.user!.id)

    const [user] = await query<PublicUser>(
      `UPDATE users SET ${sets.join(', ')} WHERE id = $${i} RETURNING ${PUBLIC_COLS}`,
      vals,
    )
    if (!user) { next(createError('User not found', 404)); return }
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// GET /api/users/history — last 30 days
export async function getHistory(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query<DailyHistory>(
      `SELECT
         date,
         tasks_completed AS "tasksCompleted",
         tasks_total     AS "tasksTotal",
         rate::float,
         score,
         workouts
       FROM daily_history
       WHERE user_id = $1 AND date >= NOW() - INTERVAL '30 days'
       ORDER BY date DESC`,
      [req.user!.id],
    )
    res.json(rows)
  } catch (err) {
    next(err)
  }
}

// POST /api/users/history — upsert today's stats
export async function upsertHistory(
  req: Request<object, object, UpsertHistoryBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { tasksCompleted, tasksTotal, rate, score, workouts } = req.body
    const [row] = await query<DailyHistory>(
      `INSERT INTO daily_history (user_id, date, tasks_completed, tasks_total, rate, score, workouts)
       VALUES ($1, CURRENT_DATE, $2, $3, $4, $5, $6)
       ON CONFLICT (user_id, date) DO UPDATE SET
         tasks_completed = EXCLUDED.tasks_completed,
         tasks_total     = EXCLUDED.tasks_total,
         rate            = EXCLUDED.rate,
         score           = EXCLUDED.score,
         workouts        = EXCLUDED.workouts
       RETURNING
         date,
         tasks_completed AS "tasksCompleted",
         tasks_total     AS "tasksTotal",
         rate::float,
         score,
         workouts`,
      [req.user!.id, tasksCompleted, tasksTotal, rate, score, workouts],
    )
    res.json(row)
  } catch (err) {
    next(err)
  }
}
