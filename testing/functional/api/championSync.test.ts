import { describe, expect, it } from 'vitest'
import { api, loginAs, SEED } from './helpers'

/**
 * Issue #29 — a champion contact's status change auto-moves its company on the Kanban.
 *
 * Locked mapping (contract.md): a champion advancing to 'Interested' while the company
 * is at 'Lead Added' auto-advances the company to 'Discovery Call Done'. Non-champion
 * updates never move the company, and company `notes` are never touched by a contact patch.
 * Every test creates its own dedicated company + contacts — no reliance on shared seed rows.
 */

let seq = 0
const uniq = () => `${Date.now()}-${++seq}`

type CompanyRow = { id: string; stage: string; notes: string }

async function createCompany(
  token: string,
  fields: Record<string, unknown> = {},
): Promise<CompanyRow> {
  const res = await api<CompanyRow>('/api/companies', {
    body: {
      companyName: `Champion Co ${uniq()}`,
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
): Promise<{ id: string }> {
  const u = uniq()
  const res = await api<{ id: string }>('/api/contacts', {
    body: {
      companyId,
      contactName: `Contact ${u}`,
      email: `contact.${u}@champion.example`,
      contactStatus: 'Not Contacted',
      champion: false,
      ...fields,
    },
    token,
  })
  expect(res.status).toBe(201)
  return res.data
}

async function getCompany(token: string, companyId: string): Promise<CompanyRow | undefined> {
  const boot = await api<{ companies: CompanyRow[] }>('/api/bootstrap', { token })
  expect(boot.status).toBe(200)
  return boot.data.companies.find((c) => c.id === companyId)
}

describe('champion contact → company auto-move (issue #29)', () => {
  it('advances the company stage per the mapping when the champion status changes', async () => {
    const { token } = await loginAs(SEED.founder)
    const co = await createCompany(token)
    expect(co.stage).toBe('Lead Added')
    const contact = await createContact(token, co.id, { champion: true })

    const patched = await api<{ contactStatus: string }>(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { contactStatus: 'Interested' },
      token,
    })
    // Response shape is unchanged — a bare mapped contact, not the company.
    expect(patched.status).toBe(200)
    expect(patched.data.contactStatus).toBe('Interested')

    const after = await getCompany(token, co.id)
    expect(after?.stage).toBe('Discovery Call Done')

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })

  it('does not move the company when a NON-champion contact status changes', async () => {
    const { token } = await loginAs(SEED.founder)
    const co = await createCompany(token)
    const contact = await createContact(token, co.id, { champion: false })

    const patched = await api(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { contactStatus: 'Interested' },
      token,
    })
    expect(patched.status).toBe(200)

    const after = await getCompany(token, co.id)
    expect(after?.stage).toBe('Lead Added')

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })

  it('leaves companies.notes untouched when a contact note is patched', async () => {
    const { token } = await loginAs(SEED.founder)
    const originalNotes = `Company notes ${uniq()}`
    const co = await createCompany(token, { notes: originalNotes })
    expect(co.notes).toBe(originalNotes)
    const contact = await createContact(token, co.id, { champion: true })

    const patched = await api(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { notes: 'Champion-side note that must never leak onto the company' },
      token,
    })
    expect(patched.status).toBe(200)

    const after = await getCompany(token, co.id)
    expect(after?.notes).toBe(originalNotes)
    // A note-only patch carries no contactStatus change, so it never auto-moves either.
    expect(after?.stage).toBe('Lead Added')

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })

  it('logs a stage-change activity marked source=champion_contact on auto-move', async () => {
    const { token } = await loginAs(SEED.founder)
    const co = await createCompany(token)
    const contact = await createContact(token, co.id, { champion: true })

    await api(`/api/contacts/${contact.id}`, {
      method: 'PATCH',
      body: { contactStatus: 'Interested' },
      token,
    })

    const lead = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown> }>
    }>(`/api/activity/lead/company/${co.id}`, { token })
    expect(lead.status).toBe(200)

    const autoMove = lead.data.events.find(
      (e) => (e.payload as { source?: string })?.source === 'champion_contact',
    )
    expect(autoMove).toBeTruthy()
    expect(autoMove?.eventType).toBe('company.stage_changed')
    expect(autoMove?.payload.from).toBe('Lead Added')
    expect(autoMove?.payload.to).toBe('Discovery Call Done')

    await api(`/api/companies/${co.id}`, { method: 'DELETE', token })
  })
})
