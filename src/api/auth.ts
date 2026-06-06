import { apiRequest } from './client'
import type { AuthUser } from '../types'

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api'

export interface AuthResponse {
  accessToken: string
  refreshToken: string
  user: AuthUser
}

async function unauthPost<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({})) as T & { error?: string }
  if (!res.ok) throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  return data
}

export const register = (body: { email: string; password: string; username: string }) =>
  unauthPost<AuthResponse>('/auth/register', body)

export const login = (body: { email: string; password: string }) =>
  unauthPost<AuthResponse>('/auth/login', body)

export const logout = (refreshToken: string) =>
  fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => {})

export const getMe = () =>
  apiRequest<{ user: AuthUser }>('GET', '/auth/me')
