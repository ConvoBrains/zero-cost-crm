import { describe, expect, it } from 'vitest'
import { api, loginAs, SEED } from './helpers'

describe('health & config', () => {
  it('GET /api/health', async () => {
    const { status, data } = await api<{ ok: boolean }>('/api/health')
    expect(status).toBe(200)
    expect(data.ok).toBe(true)
  })

  it('GET /api/config exposes email policy', async () => {
    const { status, data } = await api<{
      allowAnyEmailDomain: boolean
      allowedEmailDomains: string[]
    }>('/api/config')
    expect(status).toBe(200)
    expect(data.allowAnyEmailDomain).toBe(false)
    expect(data.allowedEmailDomains).toContain('convobrains.com')
  })
})

describe('auth', () => {
  it('logs in founder with seed credentials', async () => {
    const { token, user } = await loginAs(SEED.founder)
    expect(token.length).toBeGreaterThan(20)
    expect(user.role).toBe('founder')
    expect(user.email).toBe(SEED.founder)
  })

  it('rejects bad password', async () => {
    const { status, data } = await api<{ error: string }>('/api/auth/login', {
      body: { email: SEED.founder, password: 'wrong-password' },
    })
    expect(status).toBe(401)
    expect(data.error).toMatch(/invalid/i)
  })

  it('rejects disallowed email domain', async () => {
    const { status, data } = await api<{ error: string }>('/api/auth/login', {
      body: { email: 'someone@gmail.com', password: 'x' },
    })
    expect(status).toBe(400)
    expect(data.error).toMatch(/@convobrains\.com|allowed/i)
  })

  it('GET /api/auth/me restores session', async () => {
    const { token } = await loginAs(SEED.sdr)
    const me = await api<{ user: { email: string; role: string } }>('/api/auth/me', { token })
    expect(me.status).toBe(200)
    expect(me.data.user.email).toBe(SEED.sdr)
    expect(me.data.user.role).toBe('sdr')
  })

  it('logout ends server session (heartbeat fails)', async () => {
    const { token } = await loginAs(SEED.sdr)
    const out = await api('/api/auth/logout', { method: 'POST', token, body: { reason: 'manual' } })
    expect(out.status).toBe(204)
    const hb = await api('/api/auth/heartbeat', { method: 'POST', token, body: {} })
    expect(hb.status).toBe(401)
  })

  it('heartbeat keeps session alive', async () => {
    const { token } = await loginAs(SEED.founder)
    const hb = await api('/api/auth/heartbeat', { method: 'POST', token, body: {} })
    expect(hb.status).toBe(200)
  })
})

describe('RBAC', () => {
  it('SDR cannot list users; founder can', async () => {
    const sdr = await loginAs(SEED.sdr)
    expect((await api('/api/users', { token: sdr.token })).status).toBe(403)

    const founder = await loginAs(SEED.founder)
    const res = await api<{ users: { email: string }[] }>('/api/users', { token: founder.token })
    expect(res.status).toBe(200)
    expect(res.data.users.some((u) => u.email === SEED.founder)).toBe(true)
  })

  it('SDR cannot access activity overview', async () => {
    const { token } = await loginAs(SEED.sdr)
    expect((await api('/api/activity/overview?userId=all', { token })).status).toBe(403)
  })

  it('SDR cannot delete companies', async () => {
    const { token: founderToken } = await loginAs(SEED.founder)
    const boot = await api<{ companies: { id: string }[] }>('/api/bootstrap', {
      token: founderToken,
    })
    const companyId = boot.data.companies[0]?.id
    expect(companyId).toBeTruthy()

    const { token: sdrToken } = await loginAs(SEED.sdr)
    expect(
      (await api(`/api/companies/${companyId}`, { method: 'DELETE', token: sdrToken })).status,
    ).toBe(403)
  })
})
