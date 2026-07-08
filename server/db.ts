import pg from 'pg'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

function loadEnvFile(path: string) {
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

import { getDbUrlRaw, parseDbUrl } from './dbUrl.js'

function poolSsl(): false | { rejectUnauthorized: boolean } {
  if (process.env.DB_SSL === 'false') return false
  return { rejectUnauthorized: false }
}

const connectionString = parseDbUrl(getDbUrlRaw())

export const pool = new pg.Pool({
  connectionString,
  ssl: poolSsl(),
  max: process.env.VERCEL ? 2 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
})
