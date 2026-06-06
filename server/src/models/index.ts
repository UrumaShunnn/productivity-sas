// ─── Domain types ─────────────────────────────────────────────

export type Priority     = 'HIGH' | 'MED' | 'LOW'
export type GoalCategory = 'Business' | 'Finance' | 'Personal' | 'Health'
export type GoalType     = 'weekly' | 'longterm'
export type MuscleGroup  = 'Chest' | 'Back' | 'Shoulders' | 'Arms' | 'Legs' | 'Core' | 'Full Body' | 'Cardio'
export type SaleSource   = 'Vinted' | 'Autre'

// ─── DB row shapes ────────────────────────────────────────────

export interface User {
  id: string
  email: string
  username: string
  passwordHash: string
  accentColor: string
  backgroundPreset: string
  soundsEnabled: boolean
  monthlyGoal: number
  currentStreak: number
  bestStreak: number
  createdAt: string
  updatedAt: string
}

export type PublicUser = Omit<User, 'passwordHash'>

export interface Task {
  id: string
  userId: string
  title: string
  priority: Priority
  completed: boolean
  pomodoros: number
  date: string
  createdAt: string
}

export interface Goal {
  id: string
  userId: string
  title: string
  type: GoalType
  category: GoalCategory
  progress: number
  deadline: string
  streak: number
  lastUpdated: string | null
  createdAt: string
}

export interface WorkoutSession {
  id: string
  userId: string
  date: string
  durationSeconds: number
  createdAt: string
}

export interface Exercise {
  id: string
  sessionId: string
  name: string
  muscleGroup: MuscleGroup
  sets: number | null
  reps: number | null
  weight: number | null
  duration: number | null
  isDone: boolean
  pr: boolean
}

export interface Sale {
  id: string
  userId: string
  amount: number
  source: SaleSource
  description: string | null
  date: string
  createdAt: string
}

export interface DailyHistory {
  id: string
  userId: string
  date: string
  tasksCompleted: number
  tasksTotal: number
  rate: number
  score: number
  workouts: number
}

export interface RefreshToken {
  id: string
  userId: string
  tokenHash: string
  expiresAt: string
  revoked: boolean
}

// ─── Auth ─────────────────────────────────────────────────────

export interface AuthPayload {
  id: string
  email: string
}

// ─── Request body shapes ──────────────────────────────────────

export interface CreateTaskBody    { title: string; priority?: Priority }
export interface UpdateTaskBody    { title?: string; priority?: Priority; completed?: boolean; pomodoros?: number }
export interface CreateGoalBody    { title: string; type?: GoalType; category?: GoalCategory; deadline?: string }
export interface UpdateGoalBody    { title?: string; progress?: number; deadline?: string; streak?: number }
export interface CreateSessionBody { date: string; exercises: Omit<Exercise, 'id' | 'sessionId'>[] }
export interface CreateSaleBody    { amount: number; source: SaleSource; description?: string; date: string }

export interface UpdateUserSettingsBody {
  accentColor?: string
  backgroundPreset?: string
  username?: string
  soundsEnabled?: boolean
  monthlyGoal?: number
}

export interface UpsertHistoryBody {
  tasksCompleted: number
  tasksTotal: number
  rate: number
  score: number
  workouts: number
}
