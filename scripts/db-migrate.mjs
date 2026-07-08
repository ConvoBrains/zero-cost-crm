/**
 * Apply sql/schema.sql (and optionally sql/seed_users.sql) using DB_URL_DEV.
 *
 * Expects PostgreSQL URL like:
 *   postgresql+asyncpg://user:pass@localhost:5433/brains_crm
 * or standard:
 *   postgresql://user:pass@localhost:5433/brains_crm
 *
 * Usage:
 *   npm run db:migrate
 *   npm run db:seed
 */
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { getDbUrlRaw, parseDbUrl } from './lib/dbUrl.mjs'

function loadEnvFile(path) {
  if (!existsSync(path)) return
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
    if (!(key in process.env)) process.env[key] = val
  }
}

loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

let raw
try {
  raw = getDbUrlRaw()
} catch {
  console.error('Missing DATABASE_URL or DB_URL_DEV. Copy .env.example → .env.local and set the URL.')
  process.exit(1)
}

const url = new URL(parseDbUrl(raw))
const env = {
  ...process.env,
  PGHOST: url.hostname,
  PGPORT: url.port || '5432',
  PGUSER: decodeURIComponent(url.username),
  PGPASSWORD: decodeURIComponent(url.password),
  PGDATABASE: url.pathname.replace(/^\//, ''),
}

function runSql(file) {
  const abs = resolve(process.cwd(), file)
  console.log(`Applying ${file} → ${env.PGUSER}@${env.PGHOST}:${env.PGPORT}/${env.PGDATABASE}`)
  const r = spawnSync(
    'psql',
    ['-v', 'ON_ERROR_STOP=1', '-f', abs],
    { env, encoding: 'utf8' },
  )
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) process.exit(r.status ?? 1)
}

runSql('sql/schema.sql')
if (process.argv.includes('--seed')) {
  const r = spawnSync('node', ['scripts/seed-users.mjs'], {
    env,
    encoding: 'utf8',
    stdio: 'inherit',
  })
  if (r.status !== 0) process.exit(r.status ?? 1)
}
console.log('Done.')
