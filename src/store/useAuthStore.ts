import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import * as authApi from '../api/auth'
import type { AuthUser } from '../types'

interface AuthState {
  accessToken:     string | null
  refreshToken:    string | null
  user:            AuthUser | null
  isAuthenticated: boolean
}

interface AuthActions {
  login:     (creds: { email: string; password: string }) => Promise<void>
  register:  (creds: { email: string; password: string; username: string }) => Promise<void>
  logout:    () => void
  setTokens: (accessToken: string, refreshToken: string, user: AuthUser) => void
  setUser:   (user: AuthUser) => void
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      accessToken:     null,
      refreshToken:    null,
      user:            null,
      isAuthenticated: false,

      login: async (creds) => {
        const { accessToken, refreshToken, user } = await authApi.login(creds)
        set({ accessToken, refreshToken, user, isAuthenticated: true })
      },

      register: async (creds) => {
        const { accessToken, refreshToken, user } = await authApi.register(creds)
        set({ accessToken, refreshToken, user, isAuthenticated: true })
      },

      logout: () => {
        const { refreshToken } = get()
        if (refreshToken) authApi.logout(refreshToken)
        set({ accessToken: null, refreshToken: null, user: null, isAuthenticated: false })
      },

      setTokens: (accessToken, refreshToken, user) =>
        set({ accessToken, refreshToken, user, isAuthenticated: true }),

      setUser: (user) => set({ user }),
    }),
    { name: 'zenith-auth' },
  ),
)
