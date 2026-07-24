import { useCallback, useEffect, useState } from 'react'
import type { AppConfig } from '../types'
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  DEFAULT_CHAMPION_STATUS_TO_STAGE,
  DEFAULT_CONTACT_STATUSES,
  DEFAULT_LOGO_URL,
  DEFAULT_STAGES,
} from '../defaults'
import { api } from '../lib/api'

const FALLBACK: AppConfig = {
  brandName: DEFAULT_BRAND_NAME,
  brandTagline: DEFAULT_BRAND_TAGLINE,
  logoUrl: DEFAULT_LOGO_URL,
  stages: [...DEFAULT_STAGES],
  contactStatuses: [...DEFAULT_CONTACT_STATUSES],
  championStatusToStage: { ...DEFAULT_CHAMPION_STATUS_TO_STAGE },
  allowedEmailDomain: null,
  allowedEmailDomains: ['*'],
  allowAnyEmailDomain: true,
}

export function useAppConfig() {
  const [config, setConfig] = useState<AppConfig>(FALLBACK)
  const [ready, setReady] = useState(false)

  const refresh = useCallback(async () => {
    try {
      const cfg = await api<AppConfig>('/api/config')
      setConfig({
        brandName: cfg.brandName || DEFAULT_BRAND_NAME,
        brandTagline: cfg.brandTagline ?? DEFAULT_BRAND_TAGLINE,
        logoUrl: cfg.logoUrl || DEFAULT_LOGO_URL,
        stages: cfg.stages?.length ? cfg.stages : [...DEFAULT_STAGES],
        contactStatuses: cfg.contactStatuses?.length
          ? cfg.contactStatuses
          : [...DEFAULT_CONTACT_STATUSES],
        championStatusToStage: cfg.championStatusToStage ?? {
          ...DEFAULT_CHAMPION_STATUS_TO_STAGE,
        },
        allowedEmailDomain: cfg.allowedEmailDomain,
        allowedEmailDomains: cfg.allowedEmailDomains ?? ['*'],
        allowAnyEmailDomain: !!cfg.allowAnyEmailDomain,
      })
    } catch {
      /* keep fallback until API is up */
    } finally {
      setReady(true)
    }
  }, [])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { config, ready, refresh }
}
