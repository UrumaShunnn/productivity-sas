import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as tasksApi   from '../api/tasks'
import * as goalsApi   from '../api/goals'
import * as trainingApi from '../api/training'
import * as financeApi  from '../api/finance'
import * as usersApi    from '../api/users'
import type {
  Task,
  Goal,
  Sale,
  ArchivedTask,
  DailyHistoryEntry,
  WorkoutSession,
  Exercise,
  AppState,
  ActiveTab,
  BackgroundPreset,
  Priority,
  GoalCategory,
  GoalType,
  MuscleGroup,
} from '../types'

function uid(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

// Sessions fetched from the API have UUID format; locally created ones use uid()
function isUUID(id: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)
}

// ─── Action Shapes ────────────────────────────────────────────

interface Actions {
  // Bulk hydration (used by data-loading hooks)
  setTasks:    (tasks: Task[]) => void
  setGoals:    (goals: Goal[]) => void
  setSessions: (sessions: WorkoutSession[]) => void

  // Tasks
  addTask: (title: string, priority?: Priority) => void
  toggleTask: (id: string) => void
  deleteTask: (id: string) => void
  updateTask: (id: string, patch: Partial<Pick<Task, 'title' | 'priority'>>) => void
  reorderTasks: (fromIndex: number, toIndex: number) => void

  // Goals
  addGoal: (title: string, type: GoalType, category: GoalCategory, deadline: string, initialProgress?: number) => void
  updateGoalProgress: (id: string, progress: number) => void
  incrementGoalStreak: (id: string) => void
  deleteGoal: (id: string) => void

  // Workout sessions
  addSession: (date?: string) => string
  addExerciseToSession: (
    sessionId: string,
    exercise: Omit<Exercise, 'id' | 'isDone' | 'pr'>
  ) => void
  toggleExerciseDone: (sessionId: string, exerciseId: string) => void
  markExercisePR: (sessionId: string, exerciseId: string) => void
  deleteSession: (id: string) => void

  // Daily reset
  performDailyReset: () => void

  // Settings
  setUserName: (name: string) => void
  setAccentColor: (color: string) => void
  setAnthropicApiKey: (key: string) => void

  // Experience
  setBackgroundPreset: (preset: BackgroundPreset) => void
  setSoundEnabled: (v: boolean) => void
  setOnboardingDone: () => void

  // Finance
  addSale: (data: Omit<Sale, 'id'>) => void
  deleteSale: (id: string) => void
  setMonthlyGoal: (goal: number) => void

  // Pomodoro
  incrementTaskPomodoros: (id: string) => void
  incrementTodayPomodoros: () => void

  // Navigation
  setActiveTab: (tab: ActiveTab) => void
  toggleFocusMode: () => void
  setFocusMode: (v: boolean) => void
}

// ─── CSS accent helper ────────────────────────────────────────

export function applyAccentColor(color: string): void {
  const root = document.documentElement
  root.style.setProperty('--accent',        color)
  root.style.setProperty('--glow-green',    `0 0 12px ${color}66, 0 0 40px ${color}22`)
  root.style.setProperty('--glow-green-lg', `0 0 20px ${color}88, 0 0 60px ${color}33, 0 0 100px ${color}11`)
}

// ─── Store ────────────────────────────────────────────────────

export const useAppStore = create<AppState & Actions>()(
  persist(
    (set) => ({
      // ── Initial state ──
      tasks: [],
      goals: [],
      sessions: [],
      sales: [],
      monthlyGoal: 0,
      backgroundPreset: 'default',
      soundEnabled: true,
      onboardingDone: false,
      activeTab: 'dashboard',
      focusMode: false,
      archivedTasks: [],
      lastResetDate: '',
      dailyHistory: [],
      currentStreak: 0,
      bestStreak: 0,
      userName: 'Dylan',
      accentColor: '#ff6b00',
      todayPomodoros: 0,
      anthropicApiKey: '',

      // ── Bulk hydration ──
      setTasks:    (tasks)    => set({ tasks }),
      setGoals:    (goals)    => set({ goals }),
      setSessions: (sessions) => set({ sessions }),

      // ── Task actions ──
      addTask: (title, priority = 'MED') => {
        const tempId   = uid()
        const tempTask = { id: tempId, title, priority, completed: false, createdAt: new Date().toISOString() }
        set((s) => ({ tasks: [tempTask, ...s.tasks] }))
        tasksApi.createTask({ title, priority })
          .then((t) => set((s) => ({ tasks: s.tasks.map((x) => x.id === tempId ? t : x) })))
          .catch(() => { /* keep local task on API failure */ })
      },

      toggleTask: (id) => {
        set((s) => ({ tasks: s.tasks.map((t) => t.id === id ? { ...t, completed: !t.completed } : t) }))
        const task = useAppStore.getState().tasks.find((t) => t.id === id)
        if (task) {
          tasksApi.updateTask(id, { completed: task.completed }).catch(() => {})
        }
      },

      deleteTask: (id) => {
        const prev = useAppStore.getState().tasks
        set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
        tasksApi.deleteTask(id).catch(() => set({ tasks: prev }))
      },

      updateTask: (id, patch) => {
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) }))
        tasksApi.updateTask(id, patch).catch(() => {})
      },

      reorderTasks: (fromIndex, toIndex) =>
        set((s) => {
          const tasks = [...s.tasks]
          const [item] = tasks.splice(fromIndex, 1)
          if (item) tasks.splice(toIndex, 0, item)
          return { tasks }
        }),

      // ── Goal actions ──
      addGoal: (title, type, category, deadline, initialProgress = 0) => {
        const tempId   = uid()
        const tempGoal = {
          id: tempId, title, type, category,
          progress: Math.min(100, Math.max(0, initialProgress)),
          deadline, streak: 0,
        }
        set((s) => ({ goals: [tempGoal, ...s.goals] }))
        goalsApi.createGoal({ title, type, category, deadline })
          .then((g) => set((s) => ({ goals: s.goals.map((x) => x.id === tempId ? { ...g, progress: tempGoal.progress } : x) })))
          .catch(() => {})
      },

      updateGoalProgress: (id, progress) => {
        const clamped = Math.min(100, Math.max(0, progress))
        set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, progress: clamped } : g) }))
        goalsApi.updateGoal(id, { progress: clamped })
          .then((updated) => set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...updated, type: g.type } : g) })))
          .catch(() => {})
      },

      incrementGoalStreak: (id) => {
        set((s) => ({ goals: s.goals.map((g) => g.id === id ? { ...g, streak: g.streak + 1 } : g) }))
        const goal = useAppStore.getState().goals.find((g) => g.id === id)
        if (goal) goalsApi.updateGoal(id, { streak: goal.streak }).catch(() => {})
      },

      deleteGoal: (id) => {
        set((s) => ({ goals: s.goals.filter((g) => g.id !== id) }))
        goalsApi.deleteGoal(id).catch(() => {})
      },

      // ── Session actions ──
      addSession: (date) => {
        const id = uid()
        set((s) => ({
          sessions: [{ id, date: date ?? new Date().toISOString(), exercises: [] }, ...s.sessions],
        }))
        return id
      },

      addExerciseToSession: (sessionId, exercise) => {
        const newEx = { ...exercise, id: uid(), isDone: false, pr: false }
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, exercises: [...session.exercises, newEx] }
              : session
          ),
        }))

        // Only sync new (not-yet-persisted) sessions to the API
        if (!isUUID(sessionId)) {
          const session = useAppStore.getState().sessions.find((s) => s.id === sessionId)
          if (session) {
            trainingApi.createSession({
              date: session.date,
              exercises: session.exercises.map(({ pr: _, ...e }) => e),
            })
              .then((created) => set((s) => ({
                sessions: s.sessions.map((x) => x.id === sessionId ? created : x),
              })))
              .catch(() => {})
          }
        }
        // Exercises added to existing DB sessions are local-only until a sync endpoint is added
      },

      toggleExerciseDone: (sessionId, exerciseId) => {
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, exercises: session.exercises.map((e) => e.id === exerciseId ? { ...e, isDone: !e.isDone } : e) }
              : session
          ),
        }))
        const exercise = useAppStore.getState().sessions
          .find((s) => s.id === sessionId)?.exercises.find((e) => e.id === exerciseId)
        if (exercise && isUUID(exerciseId)) {
          trainingApi.updateExercise(exerciseId, { isDone: exercise.isDone }).catch(() => {})
        }
      },

      markExercisePR: (sessionId, exerciseId) => {
        set((s) => ({
          sessions: s.sessions.map((session) =>
            session.id === sessionId
              ? { ...session, exercises: session.exercises.map((e) => e.id === exerciseId ? { ...e, pr: true } : e) }
              : session
          ),
        }))
        if (isUUID(exerciseId)) {
          trainingApi.updateExercise(exerciseId, { pr: true }).catch(() => {})
        }
      },

      deleteSession: (id) =>
        set((s) => ({ sessions: s.sessions.filter((s2) => s2.id !== id) })),
      // Note: no DELETE /training/:id endpoint exists — deletion is local-only

      // ── Daily reset ──
      performDailyReset: () => {
        const today = new Date().toISOString().split('T')[0]
        set((s) => {
          if (s.lastResetDate === today) return {}

          const completed   = s.tasks.filter((t) => t.completed)
          const archiveDate = s.lastResetDate || today

          let newHistory = s.dailyHistory
          let newStreak  = s.currentStreak
          let newBest    = s.bestStreak

          if (s.lastResetDate) {
            const dayWorkouts = s.sessions.filter((sess) => sess.date.startsWith(archiveDate)).length
            const taskScore  = s.tasks.length === 0 ? 0 : (completed.length / s.tasks.length) * 40
            const goalScore  = s.goals.some((g) => g.progress > 0) ? 30 : 0
            const trainScore = dayWorkouts > 0 ? 30 : 0
            const dayScore   = Math.round(taskScore + goalScore + trainScore)

            newStreak = dayScore >= 70 ? s.currentStreak + 1 : 0
            newBest   = Math.max(s.bestStreak, newStreak)

            const entry: DailyHistoryEntry = {
              date:           archiveDate,
              tasksCompleted: completed.length,
              tasksTotal:     s.tasks.length,
              rate:           s.tasks.length === 0
                                ? 0
                                : Math.round((completed.length / s.tasks.length) * 100),
              goalsActive:    s.goals.filter((g) => g.progress < 100).length,
              workouts:       dayWorkouts,
            }
            newHistory = [entry, ...s.dailyHistory].slice(0, 30)
          }

          if (completed.length === 0) {
            return { lastResetDate: today, dailyHistory: newHistory, currentStreak: newStreak, bestStreak: newBest, todayPomodoros: 0 }
          }

          const newArchived: ArchivedTask[] = completed.map((t) => ({
            id:           t.id,
            title:        t.title,
            priority:     t.priority,
            archivedDate: archiveDate,
            createdAt:    t.createdAt,
          }))

          return {
            tasks:          s.tasks.filter((t) => !t.completed),
            archivedTasks:  [...newArchived, ...s.archivedTasks],
            lastResetDate:  today,
            dailyHistory:   newHistory,
            currentStreak:  newStreak,
            bestStreak:     newBest,
            todayPomodoros: 0,
          }
        })
      },

      // ── Settings ──
      setUserName: (name) => {
        set({ userName: name })
        usersApi.updateSettings({ username: name }).catch(() => {})
      },

      setAccentColor: (color) => {
        set({ accentColor: color })
        applyAccentColor(color)
        usersApi.updateSettings({ accentColor: color }).catch(() => {})
      },

      setAnthropicApiKey: (key) => set({ anthropicApiKey: key }),

      // ── Experience ──
      setBackgroundPreset: (preset) => {
        set({ backgroundPreset: preset })
        usersApi.updateSettings({ backgroundPreset: preset }).catch(() => {})
      },

      setSoundEnabled: (v) => {
        set({ soundEnabled: v })
        usersApi.updateSettings({ soundsEnabled: v }).catch(() => {})
      },

      setOnboardingDone: () => set({ onboardingDone: true }),

      // ── Finance ──
      addSale: (data) => {
        const tempId   = uid()
        const tempSale = { ...data, id: tempId }
        set((s) => ({ sales: [tempSale, ...s.sales] }))
        financeApi.createSale(data)
          .then((sale) => set((s) => ({ sales: s.sales.map((x) => x.id === tempId ? sale : x) })))
          .catch(() => {})
      },

      deleteSale: (id) => {
        const prev = useAppStore.getState().sales
        set((s) => ({ sales: s.sales.filter((x) => x.id !== id) }))
        financeApi.deleteSale(id).catch(() => set({ sales: prev }))
      },

      setMonthlyGoal: (goal) => {
        set({ monthlyGoal: goal })
        usersApi.updateSettings({ monthlyGoal: goal }).catch(() => {})
      },

      // ── Pomodoro ──
      incrementTaskPomodoros: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => t.id === id ? { ...t, pomodoros: (t.pomodoros ?? 0) + 1 } : t),
        })),

      incrementTodayPomodoros: () =>
        set((s) => ({ todayPomodoros: s.todayPomodoros + 1 })),

      // ── Navigation ──
      setActiveTab:    (tab) => set({ activeTab: tab }),
      toggleFocusMode: ()    => set((s) => ({ focusMode: !s.focusMode })),
      setFocusMode:    (v)   => set({ focusMode: v }),
    }),
    {
      name: 'zenith-store',
      partialize: (s) => ({
        tasks:            s.tasks,
        goals:            s.goals,
        sessions:         s.sessions,
        sales:            s.sales,
        monthlyGoal:      s.monthlyGoal,
        backgroundPreset: s.backgroundPreset,
        soundEnabled:     s.soundEnabled,
        onboardingDone:   s.onboardingDone,
        activeTab:        s.activeTab,
        archivedTasks:    s.archivedTasks,
        lastResetDate:    s.lastResetDate,
        dailyHistory:     s.dailyHistory,
        currentStreak:    s.currentStreak,
        bestStreak:       s.bestStreak,
        userName:         s.userName,
        accentColor:      s.accentColor,
        todayPomodoros:   s.todayPomodoros,
        anthropicApiKey:  s.anthropicApiKey,
      }),
    }
  )
)

// ─── Selectors ────────────────────────────────────────────────

export const selectTasks       = (s: AppState & Actions) => s.tasks
export const selectGoals       = (s: AppState & Actions) => s.goals
export const selectSessions    = (s: AppState & Actions) => s.sessions
export const selectActiveTab   = (s: AppState & Actions) => s.activeTab

export const selectPendingTasks    = (s: AppState & Actions) => s.tasks.filter((t) => !t.completed)
export const selectCompletedTasks  = (s: AppState & Actions) => s.tasks.filter((t) => t.completed)
export const selectLatestSession   = (s: AppState & Actions) => s.sessions[0] ?? null

export type { Priority, GoalCategory, GoalType, MuscleGroup, ActiveTab, BackgroundPreset, Goal, WorkoutSession, ArchivedTask, DailyHistoryEntry, AppState, Sale }
