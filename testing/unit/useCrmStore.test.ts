import { describe, expect, it } from 'vitest'
import { applyChampionAutoMove } from '../../src/hooks/useCrmStore'
import type { Company, ContactStatus, Stage } from '../../src/types'

// A champion contact whose status just changed to 'Interested'. Locally that
// would derive a move Lead Added -> Discovery Call Done (see championSync), so
// tests can tell a server-driven move apart from a locally-derived one.
const champion = {
  companyId: 'co-1',
  champion: true,
  contactStatus: 'Interested' as ContactStatus,
}

function makeCompany(overrides: Partial<Company> = {}): Company {
  return {
    id: 'co-1',
    companyName: 'Acme',
    stage: 'Lead Added',
    industry: 'SaaS',
    location: '',
    estimatedCallVolume: null,
    employeeCount: null,
    intent: '',
    offeredPrice: null,
    primaryContactId: null,
    assignedTo: '',
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    sourceLink: '',
    companyWebsite: '',
    linkedInCompany: '',
    createdAt: '2026-01-01T00:00:00',
    ...overrides,
  }
}

function stageOf(companies: Company[], id: string): Stage | undefined {
  return companies.find((c) => c.id === id)?.stage
}

describe('applyChampionAutoMove', () => {
  it('moves the company to the server-returned stage (server is the source of truth)', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    // 'Demo Scheduled' is NOT what local derivation would pick ('Discovery Call
    // Done'), so a pass proves the server value wins over local derivation.
    const out = applyChampionAutoMove(companies, {
      contact: champion,
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: 'Demo Scheduled',
    })

    expect(stageOf(out, 'co-1')).toBe('Demo Scheduled')
    // Input is not mutated (pure transition).
    expect(out).not.toBe(companies)
    expect(stageOf(companies, 'co-1')).toBe('Lead Added')
  })

  it('leaves the stage unchanged when the server reports no move (null)', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    // Local derivation WOULD move ('Interested' => 'Discovery Call Done'); an
    // explicit null from the server must suppress that.
    const out = applyChampionAutoMove(companies, {
      contact: champion,
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: null,
    })

    expect(stageOf(out, 'co-1')).toBe('Lead Added')
  })

  it('falls back to local derivation when the field is absent (older server)', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    const out = applyChampionAutoMove(companies, {
      contact: champion,
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: undefined, // pre-field server omits it entirely
    })

    // resolveAutoMoveStage('Lead Added', 'Interested') === 'Discovery Call Done'
    expect(stageOf(out, 'co-1')).toBe('Discovery Call Done')
  })

  it('server-returned stage moves only the owning company, leaving others', () => {
    const companies = [
      makeCompany({ id: 'co-1', stage: 'Lead Added' }),
      makeCompany({ id: 'co-2', stage: 'Follow-up' }),
    ]

    const out = applyChampionAutoMove(companies, {
      contact: { ...champion, companyId: 'co-1' },
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: 'Demo Scheduled',
    })

    expect(stageOf(out, 'co-1')).toBe('Demo Scheduled')
    expect(stageOf(out, 'co-2')).toBe('Follow-up')
  })

  it('does not apply a server stage when the contact has no company', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    const out = applyChampionAutoMove(companies, {
      contact: { ...champion, companyId: null },
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: 'Demo Scheduled',
    })

    expect(stageOf(out, 'co-1')).toBe('Lead Added')
  })

  it('absent field + non-champion contact makes no local move (legacy gate preserved)', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    const out = applyChampionAutoMove(companies, {
      contact: { ...champion, champion: false },
      prevContactStatus: 'Not Contacted',
      statusPatched: true,
      movedCompanyStage: undefined,
    })

    expect(stageOf(out, 'co-1')).toBe('Lead Added')
  })

  it('absent field + status not part of this patch makes no local move', () => {
    const companies = [makeCompany({ id: 'co-1', stage: 'Lead Added' })]

    const out = applyChampionAutoMove(companies, {
      contact: champion,
      prevContactStatus: 'Not Contacted',
      statusPatched: false, // e.g. only notes were patched
      movedCompanyStage: undefined,
    })

    expect(stageOf(out, 'co-1')).toBe('Lead Added')
  })
})
