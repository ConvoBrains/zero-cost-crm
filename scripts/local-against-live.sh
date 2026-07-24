#!/usr/bin/env bash
# Prepare local Zero Cost CRM against the live Convobrains RDS (via SSH tunnel).
# Does NOT seed/overwrite users — only schema + instance settings.
#
# Prerequisites:
#   1. SSH tunnel forwarding RDS → localhost:5433  (see docs/LOCAL_LIVE.md)
#   2. zero-cost-crm/.env.local pointed at that tunnel (gitignored)
#
# Usage (from repo root):
#   ./scripts/local-against-live.sh

set -euo pipefail
cd "$(dirname "$0")/.."

if [[ ! -f .env.local ]]; then
  echo "ERROR: .env.local missing. Copy from ConvobrainsIntCRM tunnel URL first."
  exit 1
fi

if ! nc -z -w 2 127.0.0.1 5433 2>/dev/null; then
  echo "ERROR: nothing listening on localhost:5433."
  echo "Open your SSH tunnel to RDS first, then re-run this script."
  echo "See docs/LOCAL_LIVE.md"
  exit 1
fi

echo "==> Applying live cutover SQL (crm-role safe; does not wipe users/companies)"
node --input-type=module <<'NODE'
import { readFileSync, existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { resolve } from 'node:path'
import { getDbUrlRaw, parseDbUrl } from './scripts/lib/dbUrl.mjs'

function loadEnvFile(path) {
  if (!existsSync(path)) return
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#') || !t.includes('=')) continue
    const i = t.indexOf('=')
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!(key in process.env)) process.env[key] = val
  }
}
loadEnvFile(resolve(process.cwd(), '.env.local'))
loadEnvFile(resolve(process.cwd(), '.env'))

const url = new URL(parseDbUrl(getDbUrlRaw()))
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
  const r = spawnSync('psql', ['-v', 'ON_ERROR_STOP=1', '-f', abs], { env, encoding: 'utf8' })
  if (r.stdout) process.stdout.write(r.stdout)
  if (r.stderr) process.stderr.write(r.stderr)
  if (r.status !== 0) process.exit(r.status ?? 1)
}

runSql('sql/examples/live-rds-cutover.sql')
runSql('sql/examples/convobrains-settings.sql')

const q = spawnSync(
  'psql',
  [
    '-v',
    'ON_ERROR_STOP=1',
    '-t',
    '-A',
    '-c',
    `SELECT 'users=' || COUNT(*)::text FROM users;
     SELECT 'companies=' || COUNT(*)::text FROM companies;
     SELECT 'contacts=' || COUNT(*)::text FROM contacts;
     SELECT 'brand=' || brand_name FROM app_settings WHERE id = 1;
     SELECT 'statuses=' || jsonb_array_length(contact_statuses)::text FROM app_settings WHERE id = 1;
     SELECT 'stage_check=' || EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'companies_stage_check'
     )::text;
     SELECT 'status_check=' || EXISTS (
       SELECT 1 FROM pg_constraint WHERE conname = 'contacts_contact_status_check'
     )::text;`,
  ],
  { env, encoding: 'utf8' },
)
if (q.stdout) process.stdout.write(q.stdout)
if (q.stderr) process.stderr.write(q.stderr)
if (q.status !== 0) process.exit(q.status ?? 1)
NODE

echo ""
echo "==> Done. Start the app:"
echo "    npm run dev"
echo "    open http://localhost:5173"
echo "Log in with your existing @convobrains.com users (unchanged in RDS)."
