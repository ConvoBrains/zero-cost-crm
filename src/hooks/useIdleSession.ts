import { useEffect, useRef, useState } from 'react'
import { api } from '../lib/api'

const IDLE_MS = 45 * 60 * 1000
const WARN_MS = 2 * 60 * 1000
const HEARTBEAT_MS = 60 * 1000

interface Options {
  enabled: boolean
  onIdleLogout: () => void
}

export function useIdleSession({ enabled, onIdleLogout }: Options) {
  const [warnSeconds, setWarnSeconds] = useState<number | null>(null)
  const lastActive = useRef(Date.now())
  const onIdleRef = useRef(onIdleLogout)
  onIdleRef.current = onIdleLogout

  useEffect(() => {
    if (!enabled) {
      setWarnSeconds(null)
      return
    }

    const bump = () => {
      lastActive.current = Date.now()
      setWarnSeconds(null)
    }

    const events = ['pointerdown', 'keydown', 'scroll', 'touchstart'] as const
    for (const ev of events) window.addEventListener(ev, bump, { passive: true })
    document.addEventListener('visibilitychange', bump)

    const tick = window.setInterval(() => {
      const idleFor = Date.now() - lastActive.current
      const remaining = IDLE_MS - idleFor
      if (remaining <= 0) {
        void api('/api/auth/logout', {
          method: 'POST',
          body: JSON.stringify({ reason: 'idle' }),
        })
          .catch(() => {})
          .finally(() => onIdleRef.current())
        return
      }
      if (remaining <= WARN_MS) {
        setWarnSeconds(Math.ceil(remaining / 1000))
      } else {
        setWarnSeconds(null)
      }
    }, 1000)

    const heartbeat = window.setInterval(() => {
      void api<{ ok: boolean }>('/api/auth/heartbeat', { method: 'POST' }).catch((e) => {
        if (e && typeof e === 'object' && 'status' in e && (e as { status: number }).status === 401) {
          onIdleRef.current()
        }
      })
    }, HEARTBEAT_MS)

    // initial heartbeat
    void api('/api/auth/heartbeat', { method: 'POST' }).catch(() => {})

    return () => {
      for (const ev of events) window.removeEventListener(ev, bump)
      document.removeEventListener('visibilitychange', bump)
      window.clearInterval(tick)
      window.clearInterval(heartbeat)
    }
  }, [enabled])

  return { warnSeconds }
}
