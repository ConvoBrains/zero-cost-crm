import { useCallback, useEffect, useState } from 'react'
import type { AuthUser } from '../types'
import { api, getStoredToken, setAuthToken } from '../lib/api'
import { useIdleSession } from './useIdleSession'
import { useAppConfig } from './useAppConfig'

const USER_KEY = 'zcrm-user'
const LEGACY_USER_KEY = 'convobrains-crm-user'

function loadUser(): AuthUser | null {
  try {
    const raw = localStorage.getItem(USER_KEY) ?? localStorage.getItem(LEGACY_USER_KEY)
    if (!raw) return null
    return JSON.parse(raw) as AuthUser
  } catch {
    return null
  }
}

function saveUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user))
      localStorage.removeItem(LEGACY_USER_KEY)
    } else {
      localStorage.removeItem(USER_KEY)
      localStorage.removeItem(LEGACY_USER_KEY)
    }
  } catch {
    /* ignore */
  }
}

export function useAuth() {
  const { config, ready: configReady, refresh: refreshConfig } = useAppConfig()
  const [user, setUser] = useState<AuthUser | null>(() => {
    const token = getStoredToken()
    if (token) setAuthToken(token)
    return loadUser()
  })
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  const clearLocal = useCallback(() => {
    setAuthToken(null)
    setUser(null)
    saveUser(null)
  }, [])

  useEffect(() => {
    if (!configReady) return
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
        clearLocal()
      })
      .finally(() => setReady(true))
  }, [clearLocal, configReady])

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null)
      const normalized = email.trim().toLowerCase()
      if (!config.allowAnyEmailDomain && config.allowedEmailDomain) {
        if (!normalized.endsWith(`@${config.allowedEmailDomain}`)) {
          setError(`Only @${config.allowedEmailDomain} emails are allowed.`)
          return false
        }
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
    },
    [config.allowAnyEmailDomain, config.allowedEmailDomain],
  )

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ reason: 'manual' }),
      })
    } catch {
      /* ignore */
    }
    clearLocal()
    setError(null)
  }, [clearLocal])

  const { warnSeconds } = useIdleSession({
    enabled: !!user,
    onIdleLogout: clearLocal,
  })

  return {
    user,
    error,
    login,
    logout,
    ready: ready && configReady,
    clearError: () => setError(null),
    idleWarnSeconds: warnSeconds,
    allowedEmailDomain: config.allowedEmailDomain,
    allowAnyEmailDomain: config.allowAnyEmailDomain,
    config,
    refreshConfig,
  }
}
