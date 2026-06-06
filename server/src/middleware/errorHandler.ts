import type { Request, Response, NextFunction } from 'express'

export interface AppError extends Error {
  statusCode?: number
  isOperational?: boolean
}

export function createError(message: string, statusCode: number): AppError {
  const err: AppError = new Error(message)
  err.statusCode    = statusCode
  err.isOperational = true
  return err
}

export function errorHandler(
  err: AppError,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status  = err.statusCode ?? 500
  const message = err.isOperational ? err.message : 'Internal server error'

  console.error(`[${new Date().toISOString()}] ${status} — ${err.message}`)

  res.status(status).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && !err.isOperational && { detail: err.message }),
  })
}

export function notFound(_req: Request, _res: Response, next: NextFunction): void {
  next(createError('Route not found', 404))
}
