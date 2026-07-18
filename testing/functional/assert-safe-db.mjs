/**
 * Guard: testing scripts may only talk to the Docker test DB.
 * Loads testing/functional/.env.testing only (never root .env).
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const ENV_PATH = resolve(__dirname, '.env.testing')

function loadEnvFile(path) {
  if (!existsSync(path)) {
    throw new Error(
      `Missing ${path}. Copy testing/functional/.env.testing.example → testing/functional/.env.testing`,
    )
  }
  for (const line of readFileSync(path, 'utf8').split('\n')) {
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
    process.env[key] = val
  }
}

export function assertSafeTestingDb() {
  loadEnvFile(ENV_PATH)

  if (process.env.ALLOW_ACTIVITY_SEED !== '1') {
    throw new Error(
      'Refusing to run: ALLOW_ACTIVITY_SEED must be 1 in testing/functional/.env.testing',
    )
  }

  const raw = process.env.DATABASE_URL || process.env.DB_URL_DEV
  if (!raw) {
    throw new Error('Refusing to run: DATABASE_URL missing in testing/functional/.env.testing')
  }

  const url = new URL(raw.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
  const host = url.hostname
  const db = url.pathname.replace(/^\//, '')

  const allowedHosts = new Set(['localhost', '127.0.0.1', 'crm-test-db'])
  if (!allowedHosts.has(host)) {
    throw new Error(`Refusing to run: not a testing database (host=${host})`)
  }
  if (!db.includes('_test')) {
    throw new Error(`Refusing to run: not a testing database (db=${db}; must contain _test)`)
  }

  return {
    connectionString: url.toString(),
    host,
    port: url.port || '5432',
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: db,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    const info = assertSafeTestingDb()
    console.log(`OK testing DB → ${info.user}@${info.host}:${info.port}/${info.database}`)
  } catch (e) {
    console.error(e.message)
    process.exit(1)
  }
}
