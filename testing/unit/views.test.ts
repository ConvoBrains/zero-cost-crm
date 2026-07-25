import { describe, expect, it } from 'vitest'
import {
  applyContactFilters,
  applyPipelineFilters,
  buildContactInsights,
  buildPipelineInsights,
  dateRangeStartIso,
  filterCompanies,
  startOfMonthIso,
  startOfWeekIso,
  todayIso,
  yesterdayIso,
} from '../../src/lib/views'
import type { Company, Contact, ContactFilters, PipelineFilters } from '../../src/types'

function company(partial: Partial<Company> & Pick<Company, 'id' | 'companyName' | 'stage'>): Company {
  return {
    industry: 'SaaS',
    location: '',
    estimatedCallVolume: null,
    employeeCount: null,
    intent: 'Warm',
    offeredPrice: null,
    primaryContactId: null,
    assignedTo: 'x',
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    sourceLink: '',
    companyWebsite: '',
    linkedInCompany: '',
    discoveryAnswers: {},
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

function contact(
  partial: Partial<Contact> & Pick<Contact, 'id' | 'companyId' | 'contactName' | 'contactStatus'>,
): Contact {
  return {
    email: '',
    phone: '',
    role: '',
    linkedInProfile: '',
    champion: false,
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...partial,
  }
}

const baseFilters = (): ContactFilters => ({
  search: '',
  queue: 'all',
  statuses: [],
  companyId: null,
  stages: [],
  championOnly: false,
  dateRange: 'all',
})

describe('filterCompanies', () => {
  const companies = [
    company({ id: '1', companyName: 'A', stage: 'Lead Added' }),
    company({ id: '2', companyName: 'B', stage: 'Follow-up' }),
    company({ id: '3', companyName: 'C', stage: 'POC Kickoff' }),
    company({ id: '4', companyName: 'D', stage: 'Closed Won' }),
  ]

  it('filters by pipeline view', () => {
    expect(filterCompanies(companies, 'New Leads')).toHaveLength(1)
    expect(filterCompanies(companies, 'Follow-ups')[0]?.id).toBe('2')
    expect(filterCompanies(companies, 'POC Running')).toHaveLength(1)
    expect(filterCompanies(companies, 'Closed Won')[0]?.id).toBe('4')
    expect(filterCompanies(companies, 'All Companies')).toHaveLength(4)
  })
})

describe('applyContactFilters', () => {
  const companies = [
    company({ id: 'c1', companyName: 'Acme Health', stage: 'Lead Added' }),
    company({ id: 'c2', companyName: 'Beta Labs', stage: 'Demo Scheduled' }),
    company({ id: 'c3', companyName: 'Gamma Soft', stage: 'Follow-up' }),
  ]

  const contacts = [
    contact({
      id: '1',
      companyId: 'c1',
      contactName: 'Alice Fresh',
      contactStatus: 'Not Contacted',
      email: 'alice@acme.example',
      phone: '+1 555 0100',
      createdAt: '2026-07-20T10:00:00.000Z',
    }),
    contact({
      id: '2',
      companyId: 'c2',
      contactName: 'Bob Interested',
      contactStatus: 'Interested',
      email: 'bob@beta.example',
      champion: true,
      createdAt: '2026-07-22T10:00:00.000Z',
    }),
    contact({
      id: '3',
      companyId: 'c2',
      contactName: 'Cara Discovery',
      contactStatus: 'Connected - Booked a Discovery Call',
      createdAt: '2026-06-01T10:00:00.000Z',
    }),
    contact({
      id: '4',
      companyId: 'c3',
      contactName: 'Dan NoPick',
      contactStatus: "Didn't Pick",
      lastContacted: yesterdayIso(),
      createdAt: '2026-07-24T10:00:00.000Z',
    }),
  ]

  it('returns all contacts when filters are empty', () => {
    expect(applyContactFilters(contacts, companies, baseFilters())).toHaveLength(4)
  })

  it('searches contact name, email, phone, and company name', () => {
    expect(
      applyContactFilters(contacts, companies, { ...baseFilters(), search: 'alice' }).map(
        (c) => c.id,
      ),
    ).toEqual(['1'])
    expect(
      applyContactFilters(contacts, companies, { ...baseFilters(), search: 'beta labs' }).map(
        (c) => c.id,
      ),
    ).toEqual(['2', '3'])
    expect(
      applyContactFilters(contacts, companies, { ...baseFilters(), search: '555 0100' }).map(
        (c) => c.id,
      ),
    ).toEqual(['1'])
  })

  it('filters by queue, status, company, stage, and champion', () => {
    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        queue: 'to-call-today',
      }).map((c) => c.id),
    ).toContain('1')

    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        statuses: ['Interested'],
      }).map((c) => c.id),
    ).toEqual(['2'])

    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        companyId: 'c2',
      }).map((c) => c.id),
    ).toEqual(['2', '3'])

    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        stages: ['Demo Scheduled'],
      }).map((c) => c.id),
    ).toEqual(['2', '3'])

    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        championOnly: true,
      }).map((c) => c.id),
    ).toEqual(['2'])
  })

  it('composes multiple filters with AND logic', () => {
    expect(
      applyContactFilters(contacts, companies, {
        ...baseFilters(),
        companyId: 'c2',
        statuses: ['Interested'],
        championOnly: true,
      }).map((c) => c.id),
    ).toEqual(['2'])
  })

  it('filters by createdAt date range', () => {
    const now = new Date('2026-07-25T12:00:00')
    expect(dateRangeStartIso('this-week', now)).toBe(startOfWeekIso(now))
    expect(dateRangeStartIso('this-month', now)).toBe(startOfMonthIso(now))
    expect(dateRangeStartIso('last-30-days', now)).toBe('2026-06-25')
    expect(dateRangeStartIso('all', now)).toBeNull()

    // Patch dateRangeStartIso uses real "now" inside applyContactFilters —
    // so for a deterministic test, pick contacts relative to todayIso().
    const today = todayIso()
    const recent = contact({
      id: 'r1',
      companyId: 'c1',
      contactName: 'Recent',
      contactStatus: 'Not Contacted',
      createdAt: `${today}T08:00:00.000Z`,
    })
    const old = contact({
      id: 'o1',
      companyId: 'c1',
      contactName: 'Old',
      contactStatus: 'Not Contacted',
      createdAt: '2020-01-01T00:00:00.000Z',
    })
    const result = applyContactFilters([recent, old], companies, {
      ...baseFilters(),
      dateRange: 'last-30-days',
    })
    expect(result.map((c) => c.id)).toEqual(['r1'])
  })
})

describe('buildContactInsights', () => {
  it('aggregates contacted, unreachable, discoveries, demos, and company stages', () => {
    const companies = [
      company({ id: 'c1', companyName: 'A', stage: 'Lead Added' }),
      company({ id: 'c2', companyName: 'B', stage: 'Demo Scheduled' }),
    ]
    const contacts = [
      contact({
        id: '1',
        companyId: 'c1',
        contactName: 'A',
        contactStatus: 'Not Contacted',
      }),
      contact({
        id: '2',
        companyId: 'c1',
        contactName: 'B',
        contactStatus: "Didn't Pick",
      }),
      contact({
        id: '3',
        companyId: 'c2',
        contactName: 'C',
        contactStatus: 'Connected - Booked a Discovery Call',
      }),
      contact({
        id: '4',
        companyId: 'c2',
        contactName: 'D',
        contactStatus: 'Interested',
      }),
    ]

    const insights = buildContactInsights(contacts, companies)
    expect(insights.total).toBe(4)
    expect(insights.notContacted).toBe(1)
    expect(insights.contacted).toBe(3)
    expect(insights.notReachable).toBe(1)
    expect(insights.discoveriesBooked).toBe(1)
    expect(insights.demos).toBe(1)
    expect(insights.uniqueCompanies).toBe(2)
    expect(insights.companyStageCounts).toEqual(
      expect.arrayContaining([
        { stage: 'Lead Added', count: 1 },
        { stage: 'Demo Scheduled', count: 1 },
      ]),
    )
    expect(insights.statusCounts[0]?.count).toBeGreaterThanOrEqual(1)
  })
})

describe('applyPipelineFilters', () => {
  const base: PipelineFilters = {
    dateRange: 'all',
    customFrom: null,
    customTo: null,
  }

  const companies = [
    company({
      id: '1',
      companyName: 'Fresh Lead',
      stage: 'Lead Added',
      createdAt: `${todayIso()}T10:00:00.000Z`,
    }),
    company({
      id: '2',
      companyName: 'Old Demo',
      stage: 'Demo Scheduled',
      createdAt: '2020-01-01T00:00:00.000Z',
    }),
    company({
      id: '3',
      companyName: 'Mid Follow',
      stage: 'Follow-up',
      createdAt: '2026-07-01T00:00:00.000Z',
    }),
  ]

  it('applies pipeline view then date presets', () => {
    expect(applyPipelineFilters(companies, 'All Companies', base)).toHaveLength(3)
    expect(applyPipelineFilters(companies, 'New Leads', base).map((c) => c.id)).toEqual(['1'])
    expect(
      applyPipelineFilters(companies, 'All Companies', {
        ...base,
        dateRange: 'last-30-days',
      }).map((c) => c.id),
    ).toEqual(['1', '3'])
  })

  it('applies custom inclusive date bounds', () => {
    expect(
      applyPipelineFilters(companies, 'All Companies', {
        dateRange: 'custom',
        customFrom: '2026-07-01',
        customTo: '2026-07-01',
      }).map((c) => c.id),
    ).toEqual(['3'])

    // Custom with no dates yet → unrestricted
    expect(
      applyPipelineFilters(companies, 'All Companies', {
        dateRange: 'custom',
        customFrom: null,
        customTo: null,
      }),
    ).toHaveLength(3)
  })
})

describe('buildPipelineInsights', () => {
  it('aggregates stage funnel, outcomes, conversions, and contacts', () => {
    const companies = [
      company({
        id: 'c1',
        companyName: 'A',
        stage: 'Lead Added',
        lastContacted: null,
      }),
      company({
        id: 'c2',
        companyName: 'B',
        stage: 'Discovery Call Done',
        lastContacted: '2026-07-20',
      }),
      company({
        id: 'c3',
        companyName: 'C',
        stage: 'Demo Scheduled',
        lastContacted: '2026-07-21',
      }),
      company({
        id: 'c4',
        companyName: 'D',
        stage: 'Closed Won',
        lastContacted: '2026-07-22',
      }),
    ]
    const contacts = [
      contact({
        id: 't1',
        companyId: 'c2',
        contactName: 'Champ',
        contactStatus: 'Interested',
        champion: true,
      }),
      contact({
        id: 't2',
        companyId: 'c3',
        contactName: 'Other',
        contactStatus: "Didn't Pick",
      }),
      contact({
        id: 't3',
        companyId: 'orphan',
        contactName: 'Skip',
        contactStatus: 'Not Contacted',
      }),
    ]

    const insights = buildPipelineInsights(companies, contacts, [
      'Lead Added',
      'Discovery Call Done',
      'Demo Scheduled',
      'Closed Won',
    ])
    expect(insights.total).toBe(4)
    expect(insights.contacted).toBe(3)
    expect(insights.discoveryDone).toBe(1)
    expect(insights.demosScheduled).toBe(1)
    expect(insights.closedWon).toBe(1)
    expect(insights.conversion.toWon).toBe(25)
    expect(insights.contactTotal).toBe(2)
    expect(insights.champions).toBe(1)
    expect(insights.stageCounts[0]).toEqual({ stage: 'Lead Added', count: 1 })
  })
})
