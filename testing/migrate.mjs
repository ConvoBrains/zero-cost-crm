import { spawnSync } from 'node:child_process'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { assertSafeTestingDb } from './assert-safe-db.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const root = resolve(__dirname, '..')
const info = assertSafeTestingDb()

const env = {
  ...process.env,
  PGHOST: info.host,
  PGPORT: info.port,
  PGUSER: info.user,
  PGPASSWORD: info.password,
  PGDATABASE: info.database,
}

const schema = resolve(root, 'sql/schema.sql')
console.log(`Applying schema → ${info.user}@${info.host}:${info.port}/${info.database}`)
const r = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', schema], {
  env,
  encoding: 'utf8',
})
if (r.stdout) process.stdout.write(r.stdout)
if (r.stderr) process.stderr.write(r.stderr)
if (r.status !== 0) process.exit(r.status ?? 1)
console.log('Migrate complete.')
