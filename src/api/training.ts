import { apiRequest } from './client'
import type { WorkoutSession, Exercise } from '../types'

export const getSessions = () =>
  apiRequest<WorkoutSession[]>('GET', '/training')

export const createSession = (body: { date: string; exercises: Omit<Exercise, 'id' | 'pr'>[] }) =>
  apiRequest<WorkoutSession>('POST', '/training', body)

export const updateExercise = (id: string, patch: { isDone?: boolean; weight?: number; pr?: boolean }) =>
  apiRequest<Exercise>('PATCH', `/training/exercises/${id}`, patch)

export const getPersonalRecord = (name: string) =>
  apiRequest<{ name: string; weight: number; reps: number; sets: number; date: string }>(
    'GET', `/training/pr/${encodeURIComponent(name)}`,
  )
