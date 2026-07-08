export function getDbUrlRaw() {
  const raw = process.env.DATABASE_URL || process.env.DB_URL_DEV
  if (!raw) {
    throw new Error('Missing DATABASE_URL or DB_URL_DEV')
  }
  return raw
}

export function parseDbUrl(raw) {
  return raw.replace(/^postgresql\+asyncpg:/, 'postgresql:')
}
