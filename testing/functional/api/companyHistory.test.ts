import { describe, expect, it } from 'vitest'
import { api, loginAs, SEED } from './helpers'

/**
 * Company pipeline stage from contact context + company progress history rollup.
 */

let seq = 0
const uniq = () => `${Date.now()}-${++seq}`

type CompanyRow = { id: string; stage: string; companyName?: string }

async function createCompany(
  token: string,
  fields: Record<string, unknown> = {},
): Promise<CompanyRow> {
  const res = await api<CompanyRow>('/api/companies', {
    body: {
      companyName: `History Co ${uniq()}`,
      stage: 'Lead Added',
      industry: 'SaaS',
      location: 'Remote',
      intent: 'Warm',
      ...fields,
    },
    token,
  })
  expect(res.status).toBe(201)
  return res.data
}

async function createContact(
  token: string,
  companyId: string,
  fields: Record<string, unknown> = {},
): Promise<{ id: string; contactName?: string }> {
  const u = uniq()
  const res = await api<{ id: string; contactName?: string }>('/api/contacts', {
    body: {
      companyId,
      contactName: `Lead ${u}`,
      email: `lead.${u}@history.example`,
      contactStatus: 'Not Contacted',
      champion: false,
      ...fields,
    },
    token,
  })
  expect(res.status).toBe(201)
  return res.data
}

describe('company stage from contact + company history', () => {
  it('PATCH company stage with stageChangeSource=contact_form updates company and logs source', async () => {
    const { token } = await loginAs(SEED.founder)
    const co = await createCompany(token)
    await createContact(token, co.id)

    const patched = await api<CompanyRow>(`/api/companies/${co.id}`, {
      method: 'PATCH',
      body: { stage: 'Follow-up', stageChangeSource: 'contact_form' },
      token,
    })
    expect(patched.status).toBe(200)
    expect(patched.data.stage).toBe('Follow-up')

    const history = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown> }>
    }>(`/api/activity/company/${co.id}/history`, { token })
    expect(history.status).toBe(200)

    const stageEv = [...history.data.events]
      .reverse()
      .find((e) => e.eventType === 'company.stage_changed')
    expect(stageEv).toBeTruthy()
    expect(stageEv?.payload.from).toBe('Lead Added')
    expect(stageEv?.payload.to).toBe('Follow-up')
    expect(stageEv?.payload.source).toBe('contact_form')

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })

  it('GET company history returns company + linked contact events in chronological order', async () => {
    const { token } = await loginAs(SEED.sdr)
    const co = await createCompany(token)
    const contact = await createContact(token, co.id)

    await api(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { notes: `Note ${uniq()}`, phone: '9999999999', email: `upd.${uniq()}@history.example` },
      token,
    })
    await api(`/api/companies/${co.id}`, {
      method: 'PATCH',
      body: { stage: 'Discovery Call Done' },
      token,
    })

    const history = await api<{
      companyId: string
      events: Array<{
        eventType: string
        entityType: string
        createdAt: string
        contactName: string | null
        summary: string
        payload: Record<string, unknown>
      }>
    }>(`/api/activity/company/${co.id}/history`, { token })

    expect(history.status).toBe(200)
    expect(history.data.companyId).toBe(co.id)

    const types = history.data.events.map((e) => e.eventType)
    expect(types).toContain('company.created')
    expect(types).toContain('contact.created')
    expect(types).toContain('contact.note_added')
    expect(types).toContain('contact.updated')
    expect(types).toContain('company.stage_changed')

    const times = history.data.events.map((e) => Date.parse(e.createdAt))
    for (let i = 1; i < times.length; i++) {
      expect(times[i]).toBeGreaterThanOrEqual(times[i - 1]!)
    }

    const noteEv = history.data.events.find((e) => e.eventType === 'contact.note_added')
    expect(noteEv?.entityType).toBe('contact')
    expect(noteEv?.contactName).toBeTruthy()
    expect(String(noteEv?.payload.note ?? '')).toMatch(/^Note /)
    expect(noteEv?.summary).toMatch(/Note updated/)

    const fieldEv = history.data.events.find((e) => e.eventType === 'contact.updated')
    expect(Array.isArray(fieldEv?.payload.changes)).toBe(true)
    const changeFields = ((fieldEv?.payload.changes as Array<{ field: string }>) ?? []).map(
      (c) => c.field,
    )
    expect(changeFields).toEqual(expect.arrayContaining(['phone', 'email']))

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })

  it('returns 404 for unknown company history', async () => {
    const { token } = await loginAs(SEED.founder)
    const res = await api('/api/activity/company/00000000-0000-0000-0000-000000000000/history', {
      token,
    })
    expect(res.status).toBe(404)
  })
})
