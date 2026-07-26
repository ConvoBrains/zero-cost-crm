import { describe, expect, it } from 'vitest'
import { api, loginAs, SEED } from './helpers'

describe('activity export', () => {
  it('admin can export CSV', async () => {
    const { token } = await loginAs(SEED.founder)
    const res = await api<string>(
      '/api/activity/export?format=csv&from=2026-01-01&to=2026-12-31&userId=all',
      { token, headers: { accept: 'text/csv' } },
    )
    expect(res.status).toBe(200)
    expect(typeof res.data).toBe('string')
    // CSV header
    expect(res.data).toContain('id,user_id,user_name,event_type')
  })

  it('admin can export JSON', async () => {
    const { token } = await loginAs(SEED.founder)
    const res = await api<{
      from: string
      to: string
      exportedAt: string
      events: unknown[]
    }>('/api/activity/export?format=json&from=2026-01-01&to=2026-12-31&userId=all', {
      token,
    })
    expect(res.status).toBe(200)
    expect(res.data.from).toBe('2026-01-01')
    expect(res.data.to).toBe('2026-12-31')
    expect(Array.isArray(res.data.events)).toBe(true)
  })

  it('SDR cannot export (403)', async () => {
    const { token } = await loginAs(SEED.sdr)
    const res = await api(
      '/api/activity/export?format=json&from=2026-01-01&to=2026-12-31&userId=all',
      { token },
    )
    expect(res.status).toBe(403)
  })

  it('rejects invalid format', async () => {
    const { token } = await loginAs(SEED.founder)
    const res = await api(
      '/api/activity/export?format=xml&from=2026-01-01&to=2026-12-31&userId=all',
      { token },
    )
    expect(res.status).toBe(400)
    expect(res.data).toHaveProperty('error')
  })

  it('rejects missing userId', async () => {
    const { token } = await loginAs(SEED.founder)
    const res = await api(
      '/api/activity/export?format=json&from=2026-01-01&to=2026-12-31',
      { token },
    )
    expect(res.status).toBe(400)
  })
})