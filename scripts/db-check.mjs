/**
 * Quick DB snapshot for e2e verification.
 * Usage: node scripts/db-check.mjs
 */
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import pg from 'pg'
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
  console.error('Missing DATABASE_URL or DB_URL_DEV')
  process.exit(1)
}

const url = parseDbUrl(raw)
const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false },
})

try {
  const companies = await pool.query(
    `SELECT company_name, stage, location, employee_count, industry
     FROM companies ORDER BY created_at DESC LIMIT 20`,
  )
  const contacts = await pool.query(
    `SELECT c.contact_name, c.email, c.role, co.company_name
     FROM contacts c
     LEFT JOIN companies co ON co.id = c.company_id
     ORDER BY c.created_at DESC LIMIT 20`,
  )
  const counts = await pool.query(
    `SELECT
       (SELECT COUNT(*)::int FROM companies) AS companies,
       (SELECT COUNT(*)::int FROM contacts) AS contacts`,
  )

  console.log('COUNTS', counts.rows[0])
  console.log('COMPANIES', JSON.stringify(companies.rows, null, 2))
  console.log('CONTACTS', JSON.stringify(contacts.rows, null, 2))
} finally {
  await pool.end()
}
