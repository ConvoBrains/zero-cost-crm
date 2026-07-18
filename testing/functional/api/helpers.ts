import type { AddressInfo } from 'node:net'
import type { Server } from 'node:http'

export type ApiResult<T = unknown> = { status: number; data: T }

let baseUrl = ''
let server: Server | undefined

export function getBaseUrl() {
  if (!baseUrl) throw new Error('API server not started')
  return baseUrl
}

export async function startApi() {
  if (server) return
  const { default: app } = await import('../../../server/app.js')
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => resolve())
    server.on('error', reject)
  })
  baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
}

export async function stopApi() {
  if (!server) return
  const { pool } = await import('../../../server/db.js')
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()))
  })
  await pool.end()
  server = undefined
  baseUrl = ''
}

export async function api<T = unknown>(
  path: string,
  opts: {
    method?: string
    body?: unknown
    token?: string
    headers?: Record<string, string>
  } = {},
): Promise<ApiResult<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  })
  const text = await res.text()
  let data: T
  try {
    data = text ? (JSON.parse(text) as T) : (null as T)
  } catch {
    data = text as T
  }
  return { status: res.status, data }
}

export async function loginAs(email: string, password = 'TestSeed123!') {
  const { status, data } = await api<{
    token?: string
    user?: { id: string; email: string; role: string; name: string }
    error?: string
  }>('/api/auth/login', { body: { email, password } })
  if (status !== 200 || !data.token || !data.user) {
    throw new Error(`Login failed (${status}): ${data.error ?? JSON.stringify(data)}`)
  }
  return { token: data.token, user: data.user }
}

export const SEED = {
  founder: 'founder.seed@convobrains.com',
  sdr: 'rahul.seed@convobrains.com',
} as const
