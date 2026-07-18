import { describe, expect, it } from 'vitest'
import {
  cleanEmail,
  cleanPhone,
  mapIndustry,
  parseProspectPaste,
  parseProspectMatrix,
  previewByCompany,
} from '../../src/lib/importProspects'

describe('cleanEmail', () => {
  it('lowercases and strips trailing +digits', () => {
    expect(cleanEmail('Alex@Acme-Bio.example+1')).toBe('alex@acme-bio.example')
    expect(cleanEmail('  sam@acme.example+12  ')).toBe('sam@acme.example')
  })
})

describe('cleanPhone', () => {
  it('collapses whitespace', () => {
    expect(cleanPhone('  +1   555  010  ')).toBe('+1 555 010')
  })
})

describe('mapIndustry', () => {
  it('maps known industries', () => {
    expect(mapIndustry('Hospital & Health Care')).toBe('Healthcare')
    expect(mapIndustry('ResearchBiotechnology')).toBe('Research / Biotech')
    expect(mapIndustry('Retail Cosmetics')).toBe('Retail')
    expect(mapIndustry('Fintech Bank')).toBe('BFSI')
    expect(mapIndustry('SaaS Software')).toBe('SaaS')
  })

  it('returns empty for blank and Other for unknown', () => {
    expect(mapIndustry('')).toBe('')
    expect(mapIndustry('  ')).toBe('')
    expect(mapIndustry('Mining Corp')).toBe('Other')
  })
})

describe('parseProspectPaste', () => {
  const sample = `Company\tProspect Name\tJob Title\tEmail\tPhone\tLocation\tEmployees\tIndustry
Acme Bio Labs\tAlex Example\tHead of Ops\talex@acme-bio.example+1\t+1 555 010 1001\tAustin, USA\t180\tResearchBiotechnology
Acme Bio Labs\tSam Fixture\tCEO\tsam@acme-bio.example+1\t+1 555 010 1003\tAustin, USA\t180\tResearchBiotechnology
Northwind Health\tJordan Sample\tCEO\tjordan@northwind-health.example+1\t+1 555 010 1002\tChicago, USA\t230\tHospital & Health Care`

  it('returns empty-paste error', () => {
    const { rows, errors } = parseProspectPaste('   ')
    expect(rows).toEqual([])
    expect(errors).toEqual(['Paste is empty.'])
  })

  it('parses TSV with header and cleans emails', () => {
    const { rows, errors } = parseProspectPaste(sample)
    expect(errors).toEqual([])
    expect(rows).toHaveLength(3)
    expect(rows[0]?.email).toBe('alex@acme-bio.example')
    expect(rows[0]?.employees).toBe(180)
    expect(mapIndustry(rows[0]?.industry ?? '')).toBe('Research / Biotech')
    expect(mapIndustry(rows[2]?.industry ?? '')).toBe('Healthcare')
  })

  it('skips rows with too few columns', () => {
    const { rows, errors } = parseProspectPaste('Only,Two,Cols\n')
    expect(rows).toEqual([])
    expect(errors.some((e) => e.includes('too few columns'))).toBe(true)
  })
})

describe('parseProspectMatrix', () => {
  it('parses matrix with header row', () => {
    const { rows, errors } = parseProspectMatrix([
      ['Company', 'Prospect Name', 'Job Title', 'Email', 'Phone', 'Location', 'Employees', 'Industry'],
      ['Acme', 'Pat Example', 'CEO', 'pat@acme.example', '', 'NYC', '50', 'SaaS'],
    ])
    expect(errors).toEqual([])
    expect(rows).toHaveLength(1)
    expect(rows[0]?.prospectName).toBe('Pat Example')
  })

  it('errors on empty file', () => {
    expect(parseProspectMatrix([])).toEqual({ rows: [], errors: ['File is empty.'] })
  })
})

describe('previewByCompany', () => {
  it('groups counts by company', () => {
    const preview = previewByCompany([
      {
        company: 'Beta',
        prospectName: 'A',
        jobTitle: '',
        email: 'a@b.example',
        phone: '',
        location: '',
        employees: null,
        industry: '',
      },
      {
        company: 'Acme',
        prospectName: 'B',
        jobTitle: '',
        email: 'b@b.example',
        phone: '',
        location: '',
        employees: null,
        industry: '',
      },
      {
        company: 'Acme',
        prospectName: 'C',
        jobTitle: '',
        email: 'c@b.example',
        phone: '',
        location: '',
        employees: null,
        industry: '',
      },
    ])
    expect(preview).toEqual([
      { company: 'Acme', count: 2 },
      { company: 'Beta', count: 1 },
    ])
  })
})
