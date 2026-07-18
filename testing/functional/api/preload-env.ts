import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { assertSafeTestingDb } from '../assert-safe-db.mjs'

/**
 * Functional API suite env bootstrap.
 * Prefer testing/functional/.env.testing for DB keys so a shell DATABASE_URL
 * (tunnel/prod) cannot silently redirect the suite.
 */
const envPath = resolve(process.cwd(), 'testing/functional/.env.testing')
const FORCE_FROM_FILE = new Set([
  'DATABASE_URL',
  'DB_URL_DEV',
  'ALLOW_ACTIVITY_SEED',
  'JWT_SECRET',
  'DB_SSL',
  'ALLOWED_EMAIL_DOMAIN',
  'CORS_ORIGINS',
  'PORT',
])

if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    if (FORCE_FROM_FILE.has(key) || !(key in process.env)) {
      process.env[key] = val
    }
  }
}

process.env.NODE_ENV = 'test'
process.env.ALLOW_ACTIVITY_SEED ??= '1'
process.env.JWT_SECRET ??= 'testing-jwt-secret-not-for-prod'
process.env.DB_SSL ??= 'false'
process.env.ALLOWED_EMAIL_DOMAIN ??= 'convobrains.com'
process.env.DATABASE_URL ??=
  'postgresql://crm_test:crm_test_local_only@127.0.0.1:5434/brains_crm_test'
process.env.DB_URL_DEV = process.env.DATABASE_URL

assertSafeTestingDb()
