import { useCallback, useEffect, useState } from 'react';
import type { AuthUser } from '../types';
import { api } from '../lib/api';
import { useIdleSession } from './useIdleSession';
import { useAppConfig } from './useAppConfig';



export function useAuth() {
  const { config, ready: configReady, refresh: refreshConfig } = useAppConfig();
  const [user, setUser] = useState<AuthUser | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!configReady) return;
    api<{ user: AuthUser }>('/api/auth/me')
      .then(({ user: u }) => {
        setUser(u);
      })
      .catch(() => {
      })
      .finally(() => setReady(true));
  }, [configReady]);

  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      const normalized = email.trim().toLowerCase();
      if (!config.allowAnyEmailDomain && config.allowedEmailDomain) {
        if (!normalized.endsWith(`@${config.allowedEmailDomain}`)) {
          setError(`Only @${config.allowedEmailDomain} emails are allowed.`);
          return false;
        }
      }
      try {
        const { user: u } = await api<{ user: AuthUser }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email: normalized, password }),
        });
        setUser(u);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Login failed.');
        return false;
      }
    },
    [config.allowAnyEmailDomain, config.allowedEmailDomain]
  );

  const logout = useCallback(async () => {
    try {
      await api('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ reason: 'manual' }),
      });
    } catch {
      /* ignore */
    }
    setUser(null);
    setError(null);
  }, []);

  const { warnSeconds } = useIdleSession({
    enabled: !!user,
    onIdleLogout: () => { setUser(null) },
  });

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
  };
}
