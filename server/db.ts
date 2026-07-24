import pg from 'pg'
import './loadEnv.js'
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
