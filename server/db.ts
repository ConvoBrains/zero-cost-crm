import pg from 'pg';
import './loadEnv.js';
import { getDbUrlRaw, parseDbUrl } from './dbUrl.js';

function poolSsl(): false | { rejectUnauthorized: boolean } {
  if (process.env.DB_SSL === 'false') return false;
  return { rejectUnauthorized: false };
}

const connectionString = parseDbUrl(getDbUrlRaw());

export const pool = new pg.Pool({
  connectionString,
  ssl: poolSsl(),
  max: process.env.VERCEL ? 2 : 10,
  idleTimeoutMillis: process.env.VERCEL ? 5_000 : 30_000,
});

/** Cached: live RDS cutovers may lack `companies.discovery_answers` until migrated. */
let companiesDiscoveryAnswersCol: boolean | null = null;

export async function companiesHaveDiscoveryAnswers(): Promise<boolean> {
  if (companiesDiscoveryAnswersCol != null) return companiesDiscoveryAnswersCol;
  const { rows } = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = current_schema()
      AND table_name = 'companies'
      AND column_name = 'discovery_answers'
    LIMIT 1
    `
  );
  companiesDiscoveryAnswersCol = rows.length > 0;
  return companiesDiscoveryAnswersCol;
}

/** Test helper — reset column cache between functional cases. */
export function resetSchemaFeatureCache(): void {
  companiesDiscoveryAnswersCol = null;
}
