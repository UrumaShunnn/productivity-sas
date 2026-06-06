import { apiRequest } from './client'
import type { AuthUser } from '../types'

interface SettingsPatch {
  accentColor?: string
  backgroundPreset?: string
  username?: string
  soundsEnabled?: boolean
  monthlyGoal?: number
}

interface HistoryEntry {
  date: string
  tasksCompleted: number
  tasksTotal: number
  rate: number
  score: number
  workouts: number
}

export const updateSettings = (patch: SettingsPatch) =>
  apiRequest<{ user: AuthUser }>('PATCH', '/users/settings', patch)

export const getHistory = () =>
  apiRequest<HistoryEntry[]>('GET', '/users/history')

export const upsertHistory = (data: Omit<HistoryEntry, 'date'>) =>
  apiRequest<HistoryEntry>('POST', '/users/history', data)
