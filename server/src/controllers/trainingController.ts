import type { Request, Response, NextFunction } from 'express'
import { query, transaction, queryC } from '../db/database'
import { createError } from '../middleware/errorHandler'
import type { WorkoutSession, Exercise, CreateSessionBody } from '../models'

// ── JSON-aggregated session row ───────────────────────────────

interface SessionRow {
  id: string
  date: string
  createdAt: string
  exercises: Exercise[] | null
}

type SessionResponse = { id: string; date: string; createdAt: string; exercises: Exercise[] }

const SESSION_QUERY = `
  SELECT
    ws.id,
    ws.date,
    ws.created_at AS "createdAt",
    COALESCE(
      json_agg(
        json_build_object(
          'id',          e.id,
          'name',        e.name,
          'sets',        e.sets,
          'reps',        e.reps,
          'weight',      e.weight,
          'duration',    e.duration,
          'muscleGroup', e.muscle_group,
          'isDone',      e.is_done,
          'pr',          e.pr
        ) ORDER BY e.ctid
      ) FILTER (WHERE e.id IS NOT NULL),
      '[]'
    ) AS exercises
  FROM workout_sessions ws
  LEFT JOIN exercises e ON e.session_id = ws.id
`

function formatSession(r: SessionRow): SessionResponse {
  return { id: r.id, date: r.date, createdAt: r.createdAt, exercises: r.exercises ?? [] }
}

// GET /api/training — sessions last 30 days with exercises
export async function getSessions(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rows = await query<SessionRow>(
      `${SESSION_QUERY}
       WHERE ws.user_id = $1 AND ws.date >= NOW() - INTERVAL '30 days'
       GROUP BY ws.id ORDER BY ws.date DESC`,
      [req.user!.id],
    )
    res.json(rows.map(formatSession))
  } catch (err) {
    next(err)
  }
}

// POST /api/training — create session + exercises
export async function createSession(
  req: Request<object, object, CreateSessionBody>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { date, exercises = [] } = req.body
    if (!date) { res.status(400).json({ error: 'date is required' }); return }
    const userId = req.user!.id

    const result = await transaction(async (client) => {
      const [session] = await queryC<WorkoutSession>(
        client,
        `INSERT INTO workout_sessions (user_id, date) VALUES ($1, $2)
         RETURNING id, date, created_at AS "createdAt"`,
        [userId, date],
      )

      const insertedExercises: Exercise[] = []
      for (const e of exercises) {
        const [ex] = await queryC<Exercise>(
          client,
          `INSERT INTO exercises (session_id, name, sets, reps, weight, duration, muscle_group, is_done, pr)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, false)
           RETURNING id, name, sets, reps, weight, duration,
                     muscle_group AS "muscleGroup", is_done AS "isDone", pr`,
          [session!.id, e.name, e.sets ?? 0, e.reps ?? 0, e.weight ?? 0,
           e.duration ?? 0, e.muscleGroup, e.isDone ?? false],
        )
        insertedExercises.push(ex!)
      }
      return { ...session!, exercises: insertedExercises }
    })

    res.status(201).json(result)
  } catch (err) {
    next(err)
  }
}

// PATCH /api/training/exercises/:id — mark done, update weight/pr
export async function updateExercise(
  req: Request<{ id: string }, object, { isDone?: boolean; weight?: number; pr?: boolean }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const { isDone, weight, pr } = req.body
    const sets: string[] = []
    const vals: unknown[] = []
    let i = 1

    if (isDone !== undefined) { sets.push(`is_done = $${i++}`); vals.push(isDone) }
    if (weight !== undefined) { sets.push(`weight = $${i++}`);  vals.push(weight) }
    if (pr     !== undefined) { sets.push(`pr = $${i++}`);      vals.push(pr) }

    if (sets.length === 0) { res.status(422).json({ error: 'No fields to update' }); return }

    // Verify ownership via session join
    const [owned] = await query<{ userId: string }>(
      `SELECT ws.user_id AS "userId" FROM exercises e
       JOIN workout_sessions ws ON ws.id = e.session_id
       WHERE e.id = $1`,
      [req.params.id],
    )
    if (!owned) { next(createError('Exercise not found', 404)); return }
    if (owned.userId !== req.user!.id) { next(createError('Forbidden', 403)); return }

    vals.push(req.params.id)
    const [ex] = await query<Exercise>(
      `UPDATE exercises SET ${sets.join(', ')} WHERE id = $${i}
       RETURNING id, name, sets, reps, weight, duration,
                 muscle_group AS "muscleGroup", is_done AS "isDone", pr`,
      vals,
    )
    res.json(ex)
  } catch (err) {
    next(err)
  }
}

// GET /api/training/pr/:name — personal record for an exercise
export async function getPersonalRecord(
  req: Request<{ name: string }>,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const rows = await query<{ name: string; weight: number; reps: number; sets: number; date: string }>(
      `SELECT e.name, e.weight::float AS weight, e.reps, e.sets, ws.date
       FROM exercises e
       JOIN workout_sessions ws ON ws.id = e.session_id
       WHERE ws.user_id = $1 AND e.name ILIKE $2 AND e.is_done = true AND e.weight > 0
       ORDER BY e.weight DESC
       LIMIT 1`,
      [req.user!.id, req.params.name],
    )
    if (rows.length === 0) {
      next(createError(`No record found for exercise "${req.params.name}"`, 404))
      return
    }
    res.json(rows[0])
  } catch (err) {
    next(err)
  }
}
