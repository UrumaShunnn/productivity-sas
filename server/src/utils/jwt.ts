import jwt from 'jsonwebtoken'

// ─── Payload shapes ───────────────────────────────────────────

export interface AccessPayload {
  id: string
  email: string
  iat?: number
  exp?: number
}

export interface RefreshPayload {
  id: string
  iat?: number
  exp?: number
}

// ─── Secret helpers (fail-fast at call time) ──────────────────

function accessSecret(): string {
  const s = process.env.JWT_SECRET
  if (!s) throw new Error('JWT_SECRET environment variable is not set')
  return s
}

function refreshSecret(): string {
  const s = process.env.REFRESH_SECRET
  if (!s) throw new Error('REFRESH_SECRET environment variable is not set')
  return s
}

// ─── Token generation ─────────────────────────────────────────

export function generateAccessToken(userId: string, email: string): string {
  const payload: Omit<AccessPayload, 'iat' | 'exp'> = { id: userId, email }
  return jwt.sign(payload, accessSecret(), { expiresIn: '15m' })
}

export function generateRefreshToken(userId: string): string {
  const payload: Omit<RefreshPayload, 'iat' | 'exp'> = { id: userId }
  return jwt.sign(payload, refreshSecret(), { expiresIn: '7d' })
}

// ─── Token verification (throws on invalid / expired) ─────────

export function verifyAccessToken(token: string): AccessPayload {
  return jwt.verify(token, accessSecret()) as AccessPayload
}

export function verifyRefreshToken(token: string): RefreshPayload {
  return jwt.verify(token, refreshSecret()) as RefreshPayload
}
