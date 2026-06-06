export type Priority = 'HIGH' | 'MED' | 'LOW'

export type GoalCategory = 'Business' | 'Finance' | 'Personal' | 'Health'

export type GoalType = 'weekly' | 'longterm'

export type MuscleGroup =
  | 'Chest'
  | 'Back'
  | 'Shoulders'
  | 'Arms'
  | 'Legs'
  | 'Core'
  | 'Full Body'
  | 'Cardio'

export type ActiveTab = 'dashboard' | 'tasks' | 'goals' | 'finance' | 'workout' | 'stats'

export type BackgroundPreset = 'default' | 'matrix' | 'particles' | 'gradient' | 'minimal'

export interface AuthUser {
  id: string
  email: string
  username: string
  accentColor: string
  backgroundPreset: string
  soundsEnabled: boolean
  monthlyGoal: number
  currentStreak: number
  bestStreak: number
  createdAt: string
  updatedAt: string
}

export interface Sale {
  id: string
  amount: number
  source: 'Vinted' | 'Autre'
  description: string
  date: string  // YYYY-MM-DD
}

export interface Task {
  id: string
  title: string
  priority: Priority
  completed: boolean
  createdAt: string
  date?: string
  pomodoros?: number
}

export interface Goal {
  id: string
  title: string
  type: GoalType
  category: GoalCategory
  progress: number // 0–100
  deadline: string // ISO date string (YYYY-MM-DD)
  streak: number   // consecutive days updated
}

export interface Exercise {
  id: string
  name: string
  sets: number
  reps: number
  weight: number   // kg
  duration: number // seconds; 0 if sets/reps based
  muscleGroup: MuscleGroup
  isDone: boolean
  pr: boolean      // personal record flag
}

export interface WorkoutSession {
  id: string
  date: string // ISO date string
  exercises: Exercise[]
}

export interface DailyHistoryEntry {
  date: string           // YYYY-MM-DD of the day that was closed
  tasksCompleted: number
  tasksTotal: number
  rate: number           // 0-100
  goalsActive: number
  workouts: number
}

export interface ArchivedTask {
  id: string
  title: string
  priority: Priority
  archivedDate: string  // YYYY-MM-DD — the day the reset ran
  createdAt: string
}

export interface AppState {
  tasks: Task[]
  goals: Goal[]
  sessions: WorkoutSession[]
  sales: Sale[]
  monthlyGoal: number
  activeTab: ActiveTab
  focusMode: boolean
  archivedTasks: ArchivedTask[]
  lastResetDate: string       // YYYY-MM-DD — '' on first run
  dailyHistory: DailyHistoryEntry[]
  currentStreak: number
  bestStreak: number
  userName: string
  accentColor: string
  todayPomodoros: number
  backgroundPreset: BackgroundPreset
  soundEnabled: boolean
  onboardingDone: boolean
  anthropicApiKey: string
}
