import { describe, expect, it } from 'vitest'
import { filterCompanies, filterContacts, todayIso, yesterdayIso } from '../../src/lib/views'
import type { Company, Contact } from '../../src/types'

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

describe('filterContacts', () => {
  const today = todayIso()
  const yesterday = yesterdayIso()
  const companyId = 'c1'

  const contacts = [
    contact({
      id: '1',
      companyId,
      contactName: 'Fresh',
      contactStatus: 'Not Contacted',
    }),
    contact({
      id: '2',
      companyId,
      contactName: 'Due',
      contactStatus: 'Follow-up Required',
      nextFollowUp: today,
    }),
    contact({
      id: '3',
      companyId,
      contactName: 'Late',
      contactStatus: 'Interested',
      nextFollowUp: '2000-01-01',
    }),
    contact({
      id: '4',
      companyId,
      contactName: 'NoAns',
      contactStatus: "Didn't Pick",
      lastContacted: yesterday,
    }),
    contact({
      id: '5',
      companyId,
      contactName: 'Champ',
      contactStatus: 'Interested',
      champion: true,
    }),
  ]

  it('builds call queues and status views', () => {
    expect(filterContacts(contacts, 'Not Contacted').map((c) => c.id)).toEqual(['1'])
    expect(filterContacts(contacts, 'Follow-up Today').map((c) => c.id)).toEqual(['2'])
    expect(filterContacts(contacts, 'Overdue').map((c) => c.id)).toEqual(['3'])
    expect(filterContacts(contacts, "Didn't Pick Yesterday").map((c) => c.id)).toEqual(['4'])
    expect(filterContacts(contacts, 'Champions').map((c) => c.id)).toEqual(['5'])
    expect(filterContacts(contacts, 'To Call Today').length).toBeGreaterThanOrEqual(3)
  })
})
