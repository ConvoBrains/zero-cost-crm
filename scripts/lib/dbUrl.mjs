export function getDbUrlRaw() {
  const raw = process.env.DB_URL_DEV || process.env.DATABASE_URL
  if (!raw) {
    throw new Error('Missing DATABASE_URL or DB_URL_DEV')
  }
  return raw
}

export function parseDbUrl(raw) {
  return raw.replace(/^postgresql\+asyncpg:/, 'postgresql:')
}
