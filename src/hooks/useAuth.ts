import { useCallback, useEffect, useState } from 'react'
import type { AuthUser } from '../types'
import { api, getStoredToken, setAuthToken } from '../lib/api'

const USER_KEY = 'convobrains-crm-user'
const ALLOWED_DOMAIN = 'convobrains.com'

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function saveUser(user: AuthUser | null) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    /* ignore */
  }
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getStoredToken()
    if (token) setAuthToken(token)
    return loadUser()
  })
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const token = getStoredToken()
    if (!token) {
      setReady(true)
      return
    }
    setAuthToken(token)
    api<{ user: AuthUser }>('/api/auth/me')
      .then(({ user: u }) => {
        setUser(u)
        saveUser(u)
      })
      .catch(() => {
        setAuthToken(null)
        setUser(null)
        saveUser(null)
      })
      .finally(() => setReady(true))
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    setError(null)
    const normalized = email.trim().toLowerCase()
    if (!normalized.endsWith(`@${ALLOWED_DOMAIN}`)) {
      setError(`Only @${ALLOWED_DOMAIN} emails are allowed.`)
      return false
    }
    try {
      const { token, user: u } = await api<{ token: string; user: AuthUser }>(
        '/api/auth/login',
        {
          method: 'POST',
          body: JSON.stringify({ email: normalized, password }),
        },
      )
      setAuthToken(token)
      setUser(u)
      saveUser(u)
      return true
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Login failed.')
      return false
    }
  }, [])

  const logout = useCallback(() => {
    setAuthToken(null)
    setUser(null)
    saveUser(null)
    setError(null)
  }, [])

  return { user, error, login, logout, ready, clearError: () => setError(null) }
}
