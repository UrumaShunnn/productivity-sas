import bcrypt from 'bcryptjs'
import { createHash } from 'crypto'
import type { Request, Response, NextFunction } from 'express'
import { query } from '../db/database'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../utils/jwt'
import { createError } from '../middleware/errorHandler'
import type { User, PublicUser } from '../models'

// ─── Helpers ─────────────────────────────────────────────────

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

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

async function storeRefreshToken(userId: string, token: string): Promise<void> {
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
    [userId, hashToken(token)],
  )
}

// ─── POST /api/auth/register ──────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, username } = req.body as { email: string; password: string; username: string }

    const existing = await query<{ id: string }>('SELECT id FROM users WHERE email = $1', [email.toLowerCase()])
    if (existing.length > 0) {
      next(createError('Email already in use', 409))
      return
    }

    const passwordHash = await bcrypt.hash(password, 12)
    const [user] = await query<PublicUser>(
      `INSERT INTO users (email, password_hash, username)
       VALUES ($1, $2, $3)
       RETURNING ${PUBLIC_COLS}`,
      [email.toLowerCase().trim(), passwordHash, username.trim()],
    )

    const accessToken  = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, refreshToken)

    res.status(201).json({ accessToken, refreshToken, user })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/login ─────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password } = req.body as { email: string; password: string }

    // Fetch password hash separately so it's never part of the returned user object
    const [row] = await query<Pick<User, 'id' | 'email' | 'passwordHash'>>(
      `SELECT id, email, password_hash AS "passwordHash" FROM users WHERE email = $1`,
      [email.toLowerCase().trim()],
    )

    const valid = row && await bcrypt.compare(password, row.passwordHash)
    if (!valid) {
      next(createError('Invalid credentials', 401))
      return
    }

    const [user] = await query<PublicUser>(`SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`, [row.id])

    const accessToken  = generateAccessToken(user.id, user.email)
    const refreshToken = generateRefreshToken(user.id)
    await storeRefreshToken(user.id, refreshToken)

    res.json({ accessToken, refreshToken, user })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/refresh ───────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string }
    if (!refreshToken) {
      next(createError('refreshToken is required', 400))
      return
    }

    // 1. Verify signature + expiry
    let payload: { id: string }
    try {
      payload = verifyRefreshToken(refreshToken)
    } catch {
      next(createError('Invalid or expired refresh token', 401))
      return
    }

    // 2. Check it exists in DB and hasn't been revoked
    const [record] = await query<{ id: string }>(
      `SELECT id FROM refresh_tokens
       WHERE token_hash = $1
         AND revoked    = false
         AND expires_at > NOW()`,
      [hashToken(refreshToken)],
    )
    if (!record) {
      next(createError('Refresh token revoked or expired', 401))
      return
    }

    // 3. Fetch current email (may have changed since token was issued)
    const [user] = await query<{ id: string; email: string }>(
      'SELECT id, email FROM users WHERE id = $1',
      [payload.id],
    )
    if (!user) {
      next(createError('User not found', 401))
      return
    }

    res.json({ accessToken: generateAccessToken(user.id, user.email) })
  } catch (err) {
    next(err)
  }
}

// ─── POST /api/auth/logout ────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { refreshToken } = req.body as { refreshToken?: string }

    if (refreshToken) {
      await query(
        'UPDATE refresh_tokens SET revoked = true WHERE token_hash = $1',
        [hashToken(refreshToken)],
      )
    }

    res.status(204).send()
  } catch (err) {
    next(err)
  }
}

// ─── GET /api/auth/me ─────────────────────────────────────────

export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [user] = await query<PublicUser>(
      `SELECT ${PUBLIC_COLS} FROM users WHERE id = $1`,
      [req.user!.id],
    )
    if (!user) { next(createError('User not found', 404)); return }
    res.json({ user })
  } catch (err) {
    next(err)
  }
}

// ─── PATCH /api/auth/username ─────────────────────────────────

export async function updateUsername(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { username } = req.body as { username: string }
    const [user] = await query<PublicUser>(
      `UPDATE users SET username = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING ${PUBLIC_COLS}`,
      [username.trim(), req.user!.id],
    )
    res.json({ user })
  } catch (err) {
    next(err)
  }
}
