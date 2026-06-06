import 'dotenv/config'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import morgan from 'morgan'
import compression from 'compression'

import { runMigrations } from './db/migrations'
import authRouter     from './routes/auth'
import tasksRouter    from './routes/tasks'
import goalsRouter    from './routes/goals'
import trainingRouter from './routes/training'
import financeRouter  from './routes/finance'
import usersRouter    from './routes/users'
import { errorHandler, notFound } from './middleware/errorHandler'
import { globalRateLimit } from './middleware/rateLimit'

const app     = express()
const PORT    = Number(process.env.PORT) || 3001
const VERSION = '1.0.0'

// ── Compression ───────────────────────────────────────────────
app.use(compression())

// ── Security ──────────────────────────────────────────────────
app.use(helmet())
app.use(cors({
  origin: process.env.FRONTEND_URL ?? 'http://localhost:7777',
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

// ── Logging & parsing ─────────────────────────────────────────
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// ── Health (before rate limit — must respond even under load) ─
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: VERSION })
})

// ── Rate limit (global) ───────────────────────────────────────
app.use(globalRateLimit)

// ── Routes ────────────────────────────────────────────────────
app.use('/api/auth',     authRouter)
app.use('/api/tasks',    tasksRouter)
app.use('/api/goals',    goalsRouter)
app.use('/api/training', trainingRouter)
app.use('/api/finance',  financeRouter)
app.use('/api/users',    usersRouter)

// ── 404 + error handler (must be last) ───────────────────────
app.use(notFound)
app.use(errorHandler)

runMigrations()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`[server] http://localhost:${PORT}  (${process.env.NODE_ENV ?? 'development'})`)
    })
  })
  .catch((err) => {
    console.error('[server] Startup aborted — migration error:', err)
    process.exit(1)
  })

export default app
