/**
 * Parse daily prospect paste from Excel / Sheets / clipboard.
 *
 * Expected columns (header optional):
 * Company | Prospect Name | Job Title | Email | Phone | Location | Employees | Industry
 *
 * Accepts tab-separated (paste from Sheets) or comma-separated CSV.
 */

import type { Industry, ProspectRow } from '../types'

export function cleanEmail(raw: string): string {
  return raw
    .trim()
    .replace(/\+1$/, '')
    .replace(/\+\d+$/, '')
    .toLowerCase()
}

export function cleanPhone(raw: string): string {
  return raw.trim().replace(/\s+/g, ' ')
}

export function mapIndustry(raw: string): Industry | '' {
  const s = raw.toLowerCase().replace(/[^a-z0-9\s&]/g, ' ')
  if (/hospital|health|care|medical|pharma/.test(s)) return 'Healthcare'
  if (/biotech|research|genome|lab/.test(s)) return 'Research / Biotech'
  if (/retail|cosmetic|wholesale|shop/.test(s)) return 'Retail'
  if (/bank|fintech|insurance|bfsi/.test(s)) return 'BFSI'
  if (/saas|software|tech/.test(s)) return 'SaaS'
  if (/edu|edtech/.test(s)) return 'EdTech'
  if (/telecom/.test(s)) return 'Telecom'
  if (/logistics|fleet|shipping/.test(s)) return 'Logistics'
  if (!raw.trim()) return ''
  return 'Other'
}

function splitLine(line: string): string[] {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  // naive CSV: only split on commas not inside quotes
  const cells: string[] = []
  let cur = ''
  let inQ = false
  for (let i = 0; i < line.length; i++) {
    const ch = line[i]
    if (ch === '"') {
      inQ = !inQ
      continue
    }
    if (ch === ',' && !inQ) {
      cells.push(cur.trim())
      cur = ''
      continue
    }
    cur += ch
  }
  cells.push(cur.trim())
  return cells
}

function isHeaderRow(cells: string[]): boolean {
  const joined = cells.join(' ').toLowerCase()
  return (
    joined.includes('company') &&
    (joined.includes('prospect') || joined.includes('email') || joined.includes('job'))
  )
}

function parseEmployees(raw: string): number | null {
  const n = Number(String(raw).replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

export function parseProspectPaste(text: string): { rows: ProspectRow[]; errors: string[] } {
  const errors: string[] = []
  const rows: ProspectRow[] = []
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.length > 0)

  if (lines.length === 0) {
    return { rows, errors: ['Paste is empty.'] }
  }

  let start = 0
  const first = splitLine(lines[0])
  if (isHeaderRow(first)) start = 1

  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i])
    if (cells.length < 4) {
      errors.push(`Line ${i + 1}: too few columns — skipped.`)
      continue
    }

    // Flexible column order: Company, Prospect Name, Job Title, Email, Phone, Location, Employees, Industry
    const company = cells[0] ?? ''
    const prospectName = cells[1] ?? ''
    const jobTitle = cells[2] ?? ''
    const email = cleanEmail(cells[3] ?? '')
    const phone = cleanPhone(cells[4] ?? '')
    const location = cells[5] ?? ''
    const employees = parseEmployees(cells[6] ?? '')
    const industry = cells[7] ?? ''

    if (!company.trim() || !prospectName.trim()) {
      errors.push(`Line ${i + 1}: missing company or prospect name — skipped.`)
      continue
    }

    rows.push({
      company: company.trim(),
      prospectName: prospectName.trim(),
      jobTitle: jobTitle.trim(),
      email,
      phone,
      location: location.trim(),
      employees,
      industry: industry.trim(),
    })
  }

  return { rows, errors }
}

export function previewByCompany(rows: ProspectRow[]): { company: string; count: number }[] {
  const map = new Map<string, number>()
  for (const r of rows) {
    map.set(r.company, (map.get(r.company) ?? 0) + 1)
  }
  return [...map.entries()]
    .map(([company, count]) => ({ company, count }))
    .sort((a, b) => a.company.localeCompare(b.company))
}
