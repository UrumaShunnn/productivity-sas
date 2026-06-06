import pool from './database'

const SQL = `
  CREATE TABLE IF NOT EXISTS users (
    id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    email             TEXT        UNIQUE NOT NULL,
    password_hash     TEXT        NOT NULL,
    username          TEXT        NOT NULL,
    accent_color      TEXT        NOT NULL DEFAULT '#ff6b00',
    background_preset TEXT        NOT NULL DEFAULT 'default',
    sounds_enabled    BOOLEAN     NOT NULL DEFAULT true,
    monthly_goal      NUMERIC     NOT NULL DEFAULT 0,
    current_streak    INTEGER     NOT NULL DEFAULT 0,
    best_streak       INTEGER     NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title       TEXT        NOT NULL,
    priority    TEXT        NOT NULL DEFAULT 'MED'
                              CHECK (priority IN ('HIGH', 'MED', 'LOW')),
    completed   BOOLEAN     NOT NULL DEFAULT false,
    pomodoros   INTEGER     NOT NULL DEFAULT 0,
    date        DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS goals (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title        TEXT    NOT NULL,
    category     TEXT    NOT NULL,
    type         TEXT    NOT NULL CHECK (type IN ('weekly', 'longterm')),
    progress     INTEGER NOT NULL DEFAULT 0
                           CHECK (progress >= 0 AND progress <= 100),
    deadline     DATE,
    streak       INTEGER NOT NULL DEFAULT 0,
    last_updated DATE,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS workout_sessions (
    id               UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date             DATE        NOT NULL DEFAULT CURRENT_DATE,
    duration_seconds INTEGER     NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS exercises (
    id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id   UUID    NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
    name         TEXT    NOT NULL,
    muscle_group TEXT    NOT NULL,
    sets         INTEGER,
    reps         INTEGER,
    weight       NUMERIC,
    duration     INTEGER,
    is_done      BOOLEAN NOT NULL DEFAULT false,
    pr           BOOLEAN NOT NULL DEFAULT false
  );

  CREATE TABLE IF NOT EXISTS sales (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount      NUMERIC     NOT NULL,
    source      TEXT        NOT NULL DEFAULT 'Vinted',
    description TEXT,
    date        DATE        NOT NULL DEFAULT CURRENT_DATE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS daily_history (
    id               UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id          UUID    NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date             DATE    NOT NULL,
    tasks_completed  INTEGER NOT NULL DEFAULT 0,
    tasks_total      INTEGER NOT NULL DEFAULT 0,
    rate             NUMERIC NOT NULL DEFAULT 0,
    score            INTEGER NOT NULL DEFAULT 0,
    workouts         INTEGER NOT NULL DEFAULT 0,
    UNIQUE (user_id, date)
  );

  CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id     UUID        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT        NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN     NOT NULL DEFAULT false,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );

  -- Backfill columns that may be missing in existing installs
  ALTER TABLE goals     ADD COLUMN IF NOT EXISTS last_updated DATE;
  ALTER TABLE exercises ADD COLUMN IF NOT EXISTS pr BOOLEAN NOT NULL DEFAULT false;

  -- Indexes for common query patterns
  CREATE INDEX IF NOT EXISTS idx_tasks_user_date       ON tasks(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_tasks_user_created    ON tasks(user_id, created_at DESC);
  CREATE INDEX IF NOT EXISTS idx_goals_user            ON goals(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_user_date    ON workout_sessions(user_id, date);
  CREATE INDEX IF NOT EXISTS idx_exercises_session     ON exercises(session_id);
  CREATE INDEX IF NOT EXISTS idx_sales_user_date       ON sales(user_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_history_user_date     ON daily_history(user_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_hash   ON refresh_tokens(token_hash);
  CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user   ON refresh_tokens(user_id);
`

export async function runMigrations(): Promise<void> {
  console.log('[db] Running migrations…')
  try {
    await pool.query(SQL)
    console.log('[db] ✅  Migrations complete')
  } catch (err) {
    console.error('[db] ❌  Migration failed:', err)
    throw err
  }
}

// Allow direct execution: npm run migrate
if (require.main === module) {
  runMigrations()
    .then(() => process.exit(0))
    .catch(() => process.exit(1))
}
