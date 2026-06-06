const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001/api'

// Zustand persist key for the auth store (must match useAuthStore's `name`)
const AUTH_KEY = 'zenith-auth'

interface StoredAuth {
  state: { accessToken?: string | null; refreshToken?: string | null }
}

function getStoredTokens(): { accessToken: string | null; refreshToken: string | null } {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return { accessToken: null, refreshToken: null }
    const { state } = JSON.parse(raw) as StoredAuth
    return { accessToken: state.accessToken ?? null, refreshToken: state.refreshToken ?? null }
  } catch {
    return { accessToken: null, refreshToken: null }
  }
}

function patchStoredAccessToken(token: string): void {
  try {
    const raw = localStorage.getItem(AUTH_KEY)
    if (!raw) return
    const parsed = JSON.parse(raw) as { state: Record<string, unknown> }
    parsed.state.accessToken = token
    localStorage.setItem(AUTH_KEY, JSON.stringify(parsed))
  } catch { /* ignore */ }
}

function clearStoredAuth(): void {
  localStorage.removeItem(AUTH_KEY)
}

async function attemptRefresh(): Promise<string | null> {
  const { refreshToken } = getStoredTokens()
  if (!refreshToken) return null
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    })
    if (!res.ok) return null
    const data = await res.json() as { accessToken: string }
    patchStoredAccessToken(data.accessToken)
    return data.accessToken
  } catch {
    return null
  }
}

export async function apiRequest<T>(
  method: string,
  path: string,
  body?: unknown,
): Promise<T> {
  const { accessToken } = getStoredTokens()

  const doFetch = (token: string | null) =>
    fetch(`${BASE}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    })

  let res = await doFetch(accessToken)

  if (res.status === 401) {
    const newToken = await attemptRefresh()
    if (!newToken) {
      clearStoredAuth()
      window.dispatchEvent(new Event('auth:logout'))
      throw new Error('Session expirée — veuillez vous reconnecter')
    }
    res = await doFetch(newToken)
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({})) as { error?: string }
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}
