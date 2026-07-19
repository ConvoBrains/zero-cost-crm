import { describe, expect, it } from 'vitest'
import {
  NOTE_PREVIEW_MAX,
  buildCardBadges,
  buildChampionTrail,
  findChampion,
} from '../../src/lib/championCard'
import type { Company, Contact } from '../../src/types'

function contact(partial: Partial<Contact> & Pick<Contact, 'id'>): Contact {
  return {
    contactName: 'Test Contact',
    companyId: 'co-1',
    role: '',
    phone: '',
    email: '',
    linkedInProfile: '',
    contactStatus: 'Not Contacted',
    champion: false,
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function company(partial: Partial<Company> & Pick<Company, 'id'>): Company {
  return {
    companyName: 'Test Co',
    stage: 'Lead Added',
    industry: 'SaaS',
    location: '',
    estimatedCallVolume: null,
    employeeCount: null,
    intent: 'Warm',
    offeredPrice: null,
    primaryContactId: null,
    assignedTo: 'u1',
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    sourceLink: '',
    companyWebsite: '',
    linkedInCompany: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const TODAY = '2026-07-19'

describe('findChampion', () => {
  it('returns the champion contact for the company', () => {
    const contacts = [
      contact({ id: 'c1', companyId: 'co-1', champion: false }),
      contact({ id: 'c2', companyId: 'co-1', champion: true }),
    ]
    expect(findChampion(contacts, 'co-1')?.id).toBe('c2')
  })

  it('returns null when the company has no champion', () => {
    const contacts = [contact({ id: 'c1', companyId: 'co-1', champion: false })]
    expect(findChampion(contacts, 'co-1')).toBeNull()
  })

  it('excludes champions belonging to other companies', () => {
    const contacts = [contact({ id: 'c1', companyId: 'co-2', champion: true })]
    expect(findChampion(contacts, 'co-1')).toBeNull()
  })

  it('returns the first champion when a company has several', () => {
    const contacts = [
      contact({ id: 'c1', companyId: 'co-1', champion: true, contactName: 'First' }),
      contact({ id: 'c2', companyId: 'co-1', champion: true, contactName: 'Second' }),
    ]
    expect(findChampion(contacts, 'co-1')?.id).toBe('c1')
  })
})

describe('buildCardBadges', () => {
  const co = company({ id: 'co-1' })

  it('counts only the company own contacts and flags the champion', () => {
    const contacts = [
      contact({ id: 'c1', companyId: 'co-1', champion: true }),
      contact({ id: 'c2', companyId: 'co-1' }),
      contact({ id: 'c3', companyId: 'co-2' }), // different company — must not be counted
    ]
    const badges = buildCardBadges(co, contacts, TODAY)
    expect(badges.contactCount).toBe(2)
    expect(badges.hasChampion).toBe(true)
    expect(badges.followUpDueToday).toBe(false)
  })

  it('reports no champion when none is flagged', () => {
    const contacts = [contact({ id: 'c1', companyId: 'co-1', champion: false })]
    expect(buildCardBadges(co, contacts, TODAY).hasChampion).toBe(false)
  })

  it('flags follow-up-due-today when the company follow-up is today', () => {
    const badges = buildCardBadges(company({ id: 'co-1', nextFollowUp: TODAY }), [], TODAY)
    expect(badges.followUpDueToday).toBe(true)
  })

  it('flags follow-up-due-today when the champion follow-up is today', () => {
    const contacts = [
      contact({ id: 'c1', companyId: 'co-1', champion: true, nextFollowUp: TODAY }),
    ]
    expect(buildCardBadges(co, contacts, TODAY).followUpDueToday).toBe(true)
  })

  it('does not flag follow-up-due-today for a non-champion contact follow-up', () => {
    const contacts = [
      contact({ id: 'c1', companyId: 'co-1', champion: false, nextFollowUp: TODAY }),
    ]
    expect(buildCardBadges(co, contacts, TODAY).followUpDueToday).toBe(false)
  })
})

describe('buildChampionTrail', () => {
  it('returns null when there is no champion', () => {
    expect(buildChampionTrail(null)).toBeNull()
  })

  it('builds the header from the champion name and status', () => {
    const trail = buildChampionTrail(
      contact({
        id: 'c1',
        champion: true,
        contactName: 'Priya Sharma',
        contactStatus: 'Interested',
      }),
    )
    expect(trail?.header).toBe('★ Priya Sharma · Interested')
  })

  it('returns a null note when the champion has no notes', () => {
    const trail = buildChampionTrail(contact({ id: 'c1', champion: true, notes: '' }))
    expect(trail?.note).toBeNull()
  })

  it('shows a short note verbatim behind a Note: prefix', () => {
    const trail = buildChampionTrail(contact({ id: 'c1', champion: true, notes: 'Quick call' }))
    expect(trail?.note).toBe('Note: Quick call')
  })

  it('keeps a note of exactly NOTE_PREVIEW_MAX chars without truncation', () => {
    const exact = 'a'.repeat(NOTE_PREVIEW_MAX)
    const trail = buildChampionTrail(contact({ id: 'c1', champion: true, notes: exact }))
    expect(trail?.note).toBe(`Note: ${exact}`)
  })

  it('truncates a long note to NOTE_PREVIEW_MAX chars with an ellipsis', () => {
    const long = 'a'.repeat(NOTE_PREVIEW_MAX) + 'b'.repeat(20)
    const trail = buildChampionTrail(contact({ id: 'c1', champion: true, notes: long }))
    expect(trail?.note).toBe(`Note: ${'a'.repeat(NOTE_PREVIEW_MAX)}…`)
    expect(trail?.note).not.toContain('b')
  })

  it('formats the follow-up when present and is null when absent', () => {
    const withFu = buildChampionTrail(
      contact({ id: 'c1', champion: true, nextFollowUp: '2026-07-22' }),
    )
    expect(withFu?.followUp).toMatch(/^FU /)
    expect(withFu?.followUp).toContain('22')

    const noFu = buildChampionTrail(contact({ id: 'c1', champion: true, nextFollowUp: null }))
    expect(noFu?.followUp).toBeNull()
  })

  it('exposes NOTE_PREVIEW_MAX as 60', () => {
    expect(NOTE_PREVIEW_MAX).toBe(60)
  })
})
