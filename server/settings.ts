/**
 * Instance settings (branding, pipeline stages, contact statuses, discovery Qs).
 * Stored in `app_settings` so Zero Cost CRM stays generic across deploys.
 */

import { pool } from './db.js'
import {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  DEFAULT_CHAMPION_STATUS_TO_STAGE,
  DEFAULT_CONTACT_STATUSES,
  DEFAULT_DISCOVERY_QUESTIONS,
  DEFAULT_LOGO_URL,
  DEFAULT_STAGES,
  type DiscoveryInputType,
  type DiscoveryQuestion,
} from '../src/defaults.js'

export interface AppSettings {
  brandName: string
  brandTagline: string
  logoUrl: string
  stages: string[]
  contactStatuses: string[]
  championStatusToStage: Record<string, string | null>
  discoveryQuestions: DiscoveryQuestion[]
  updatedAt: string | null
}

function readEnv(name: string): string | undefined {
  const v = process.env[name]
  if (v == null) return undefined
  const trimmed = v.trim()
  return trimmed.length ? trimmed : undefined
}

function asStringArray(value: unknown, fallback: readonly string[]): string[] {
  if (!Array.isArray(value)) return [...fallback]
  const out = value
    .filter((x): x is string => typeof x === 'string')
    .map((s) => s.trim())
    .filter(Boolean)
  return out.length ? out : [...fallback]
}

function asChampionMap(
  value: unknown,
): Record<string, string | null> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return { ...DEFAULT_CHAMPION_STATUS_TO_STAGE }
  }
  const out: Record<string, string | null> = {}
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (v === null) out[k] = null
    else if (typeof v === 'string') out[k] = v
  }
  return Object.keys(out).length ? out : { ...DEFAULT_CHAMPION_STATUS_TO_STAGE }
}

const INPUT_TYPES = new Set<DiscoveryInputType>(['text', 'textarea', 'number'])

export function asDiscoveryQuestions(value: unknown): DiscoveryQuestion[] {
  if (!Array.isArray(value)) return [...DEFAULT_DISCOVERY_QUESTIONS]
  const out: DiscoveryQuestion[] = []
  const seen = new Set<string>()
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue
    const row = raw as Record<string, unknown>
    const id = typeof row.id === 'string' ? row.id.trim() : ''
    const section = typeof row.section === 'string' ? row.section.trim() : ''
    const prompt = typeof row.prompt === 'string' ? row.prompt.trim() : ''
    const inputRaw = typeof row.input === 'string' ? row.input.trim() : 'text'
    const input = (INPUT_TYPES.has(inputRaw as DiscoveryInputType)
      ? inputRaw
      : 'text') as DiscoveryInputType
    if (!id || !section || !prompt || seen.has(id)) continue
    seen.add(id)
    out.push({ id, section, prompt, input })
  }
  return out
}

function rowToSettings(row: Record<string, unknown>): AppSettings {
  return {
    brandName: String(row.brand_name ?? DEFAULT_BRAND_NAME),
    brandTagline: String(row.brand_tagline ?? DEFAULT_BRAND_TAGLINE),
    logoUrl: String(row.logo_url ?? DEFAULT_LOGO_URL),
    stages: asStringArray(row.stages, DEFAULT_STAGES),
    contactStatuses: asStringArray(row.contact_statuses, DEFAULT_CONTACT_STATUSES),
    championStatusToStage: asChampionMap(row.champion_status_to_stage),
    discoveryQuestions: asDiscoveryQuestions(row.discovery_questions),
    updatedAt: row.updated_at ? String(row.updated_at) : null,
  }
}

function defaultSettingsFromEnv(): AppSettings {
  return {
    brandName: readEnv('BRAND_NAME') ?? DEFAULT_BRAND_NAME,
    brandTagline: readEnv('BRAND_TAGLINE') ?? DEFAULT_BRAND_TAGLINE,
    logoUrl: readEnv('BRAND_LOGO_URL') ?? DEFAULT_LOGO_URL,
    stages: [...DEFAULT_STAGES],
    contactStatuses: [...DEFAULT_CONTACT_STATUSES],
    championStatusToStage: { ...DEFAULT_CHAMPION_STATUS_TO_STAGE },
    discoveryQuestions: [...DEFAULT_DISCOVERY_QUESTIONS],
    updatedAt: null,
  }
}

let cache: AppSettings | null = null
let cacheAt = 0
const CACHE_MS = 5_000

export function invalidateSettingsCache() {
  cache = null
  cacheAt = 0
}

export async function ensureAppSettings(): Promise<AppSettings> {
  const existing = await pool.query('SELECT * FROM app_settings WHERE id = 1')
  if (existing.rows[0]) {
    return rowToSettings(existing.rows[0] as Record<string, unknown>)
  }

  const seed = defaultSettingsFromEnv()
  await pool.query(
    `
    INSERT INTO app_settings (
      id, brand_name, brand_tagline, logo_url,
      stages, contact_statuses, champion_status_to_stage, discovery_questions
    ) VALUES (
      1, $1, $2, $3,
      $4::jsonb, $5::jsonb, $6::jsonb, $7::jsonb
    )
    ON CONFLICT (id) DO NOTHING
    `,
    [
      seed.brandName,
      seed.brandTagline,
      seed.logoUrl,
      JSON.stringify(seed.stages),
      JSON.stringify(seed.contactStatuses),
      JSON.stringify(seed.championStatusToStage),
      JSON.stringify(seed.discoveryQuestions),
    ],
  )

  const { rows } = await pool.query('SELECT * FROM app_settings WHERE id = 1')
  return rowToSettings((rows[0] ?? seed) as Record<string, unknown>)
}

export async function getAppSettings(): Promise<AppSettings> {
  const now = Date.now()
  if (cache && now - cacheAt < CACHE_MS) return cache
  cache = await ensureAppSettings()
  cacheAt = now
  return cache
}

export interface SettingsPatch {
  brandName?: string
  brandTagline?: string
  logoUrl?: string
  stages?: string[]
  contactStatuses?: string[]
  championStatusToStage?: Record<string, string | null>
  discoveryQuestions?: DiscoveryQuestion[]
}

function validateNonEmptyStrings(label: string, values: string[]): string | null {
  if (!values.length) return `${label} must contain at least one value.`
  if (values.some((v) => !v.trim())) return `${label} entries must be non-empty.`
  if (new Set(values).size !== values.length) return `${label} must be unique.`
  return null
}

export async function updateAppSettings(patch: SettingsPatch): Promise<AppSettings> {
  const current = await getAppSettings()
  const next: AppSettings = {
    ...current,
    brandName: patch.brandName?.trim() || current.brandName,
    brandTagline:
      patch.brandTagline !== undefined ? patch.brandTagline.trim() : current.brandTagline,
    logoUrl: patch.logoUrl?.trim() || current.logoUrl,
    stages: patch.stages ?? current.stages,
    contactStatuses: patch.contactStatuses ?? current.contactStatuses,
    championStatusToStage: patch.championStatusToStage ?? current.championStatusToStage,
    discoveryQuestions: patch.discoveryQuestions ?? current.discoveryQuestions,
    updatedAt: current.updatedAt,
  }

  const stageErr = validateNonEmptyStrings('stages', next.stages)
  if (stageErr) throw new Error(stageErr)
  const statusErr = validateNonEmptyStrings('contactStatuses', next.contactStatuses)
  if (statusErr) throw new Error(statusErr)

  for (const [status, stage] of Object.entries(next.championStatusToStage)) {
    if (stage != null && !next.stages.includes(stage)) {
      throw new Error(
        `championStatusToStage["${status}"] targets unknown stage "${stage}".`,
      )
    }
  }

  await ensureAppSettings()
  const { rows } = await pool.query(
    `
    UPDATE app_settings SET
      brand_name = $1,
      brand_tagline = $2,
      logo_url = $3,
      stages = $4::jsonb,
      contact_statuses = $5::jsonb,
      champion_status_to_stage = $6::jsonb,
      discovery_questions = $7::jsonb,
      updated_at = now()
    WHERE id = 1
    RETURNING *
    `,
    [
      next.brandName,
      next.brandTagline,
      next.logoUrl,
      JSON.stringify(next.stages),
      JSON.stringify(next.contactStatuses),
      JSON.stringify(next.championStatusToStage),
      JSON.stringify(next.discoveryQuestions),
    ],
  )

  invalidateSettingsCache()
  cache = rowToSettings(rows[0] as Record<string, unknown>)
  cacheAt = Date.now()
  return cache
}

export function isAllowedStage(settings: AppSettings, stage: string): boolean {
  return settings.stages.includes(stage)
}

export function isAllowedContactStatus(settings: AppSettings, status: string): boolean {
  return settings.contactStatuses.includes(status)
}
