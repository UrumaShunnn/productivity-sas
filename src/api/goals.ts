import { apiRequest } from './client'
import type { Goal, GoalType, GoalCategory } from '../types'

export const getGoals = () =>
  apiRequest<Goal[]>('GET', '/goals')

export const createGoal = (body: { title: string; type?: GoalType; category?: GoalCategory; deadline?: string }) =>
  apiRequest<Goal>('POST', '/goals', body)

export const updateGoal = (id: string, patch: Partial<Pick<Goal, 'title' | 'progress' | 'deadline' | 'streak'>>) =>
  apiRequest<Goal>('PATCH', `/goals/${id}`, patch)

export const deleteGoal = (id: string) =>
  apiRequest<void>('DELETE', `/goals/${id}`)
