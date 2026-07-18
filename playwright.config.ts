import { defineConfig, devices } from '@playwright/test'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

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

/** Load testing/functional/.env.testing for the API webServer (DB keys win over shell). */
function loadTestingEnv(): Record<string, string> {
  const env: Record<string, string> = {}
  for (const [k, v] of Object.entries(process.env)) {
    if (typeof v === 'string') env[k] = v
  }

  const path = resolve(process.cwd(), 'testing/functional/.env.testing')
  if (existsSync(path)) {
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
      if (FORCE_FROM_FILE.has(key) || !env[key]) env[key] = val
    }
  }

  env.NODE_ENV = 'test'
  env.ALLOW_ACTIVITY_SEED ??= '1'
  env.JWT_SECRET ??= 'testing-jwt-secret-not-for-prod'
  env.DB_SSL ??= 'false'
  env.ALLOWED_EMAIL_DOMAIN ??= 'convobrains.com'
  env.PORT ??= '4000'
  env.DATABASE_URL ??=
    'postgresql://crm_test:crm_test_local_only@127.0.0.1:5434/brains_crm_test'
  env.DB_URL_DEV = env.DATABASE_URL
  env.CORS_ORIGINS ??=
    'http://127.0.0.1:5173,http://localhost:5173,http://localhost:4000'

  // Fail closed: never point Playwright API at a non-test DB
  const url = new URL(env.DATABASE_URL.replace(/^postgresql\+asyncpg:/, 'postgresql:'))
  const host = url.hostname
  const db = url.pathname.replace(/^\//, '')
  const allowedHosts = new Set(['localhost', '127.0.0.1', 'crm-test-db'])
  if (!allowedHosts.has(host) || !db.includes('_test')) {
    throw new Error(
      `playwright: refusing DATABASE_URL host=${host} db=${db} (must be local *_test)`,
    )
  }

  return env
}

const testingEnv = loadTestingEnv()

export default defineConfig({
  testDir: './testing/e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 15_000 },
  reporter: [['list']],
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
    ...devices['Desktop Chrome'],
    viewport: { width: 1280, height: 800 },
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  // Always boot our own API/Vite with the test env — never reuse a random local server.
  webServer: [
    {
      command: 'npx tsx server/index.ts',
      url: 'http://127.0.0.1:4000/api/health',
      reuseExistingServer: false,
      timeout: 120_000,
      env: testingEnv,
    },
    {
      command: 'npx vite --host 127.0.0.1 --port 5173',
      url: 'http://127.0.0.1:5173',
      reuseExistingServer: false,
      timeout: 120_000,
    },
  ],
})
