import { apiRequest } from './client'
import type { Task, Priority } from '../types'

const today = () => new Date().toISOString().split('T')[0]

export const getTasks = (date?: string) =>
  apiRequest<Task[]>('GET', `/tasks?date=${date ?? today()}`)

export const createTask = (body: { title: string; priority?: Priority }) =>
  apiRequest<Task>('POST', '/tasks', body)

export const updateTask = (id: string, patch: Partial<Pick<Task, 'title' | 'priority' | 'completed' | 'pomodoros'>>) =>
  apiRequest<Task>('PATCH', `/tasks/${id}`, patch)

export const deleteTask = (id: string) =>
  apiRequest<void>('DELETE', `/tasks/${id}`)
