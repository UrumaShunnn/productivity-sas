import type { Request, Response, NextFunction } from 'express'
import { verifyAccessToken } from '../utils/jwt'

// ─── Request augmentation ─────────────────────────────────────

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: { id: string; email: string }
    }
  }
}

// ─── Middleware ───────────────────────────────────────────────

export function authenticateToken(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid authorization header' })
    return
  }

  const token = header.slice(7)
  try {
    const payload = verifyAccessToken(token)   // throws if invalid / expired
    req.user = { id: payload.id, email: payload.email }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

// Backward-compat alias used by data routes
export const requireAuth = authenticateToken
