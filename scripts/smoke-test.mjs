/**
 * Headless smoke tests for daily prospect paste parser.
 * Run: node scripts/smoke-test.mjs
 */
import assert from 'node:assert/strict'

function cleanEmail(raw) {
  return raw.trim().replace(/\+1$/, '').replace(/\+\d+$/, '').toLowerCase()
}

function cleanPhone(raw) {
  return raw.trim().replace(/\s+/g, ' ')
}

function mapIndustry(raw) {
  const s = raw.toLowerCase().replace(/[^a-z0-9\s&]/g, ' ')
  if (/hospital|health|care|medical|pharma/.test(s)) return 'Healthcare'
  if (/biotech|research|genome|lab/.test(s)) return 'Research / Biotech'
  if (/retail|cosmetic|wholesale|shop/.test(s)) return 'Retail'
  if (!raw.trim()) return ''
  return 'Other'
}

function splitLine(line) {
  if (line.includes('\t')) return line.split('\t').map((c) => c.trim())
  return line.split(',').map((c) => c.trim())
}

function isHeaderRow(cells) {
  const joined = cells.join(' ').toLowerCase()
  return joined.includes('company') && (joined.includes('prospect') || joined.includes('email'))
}

function parseEmployees(raw) {
  const n = Number(String(raw).replace(/[^0-9]/g, ''))
  return Number.isFinite(n) && n > 0 ? n : null
}

function parseProspectPaste(text) {
  const errors = []
  const rows = []
  const lines = text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)
  if (!lines.length) return { rows, errors: ['Paste is empty.'] }
  let start = 0
  if (isHeaderRow(splitLine(lines[0]))) start = 1
  for (let i = start; i < lines.length; i++) {
    const cells = splitLine(lines[i])
    if (cells.length < 4) {
      errors.push(`Line ${i + 1}: too few columns`)
      continue
    }
    rows.push({
      company: cells[0].trim(),
      prospectName: cells[1].trim(),
      jobTitle: cells[2].trim(),
      email: cleanEmail(cells[3] ?? ''),
      phone: cleanPhone(cells[4] ?? ''),
      location: (cells[5] ?? '').trim(),
      employees: parseEmployees(cells[6] ?? ''),
      industry: (cells[7] ?? '').trim(),
    })
  }
  return { rows, errors }
}

const sample = `Company\tProspect Name\tJob Title\tEmail\tPhone\tLocation\tEmployees\tIndustry
4baseCare\tChristina Joseph\tHead of Ops\tchristina@4basecare.com+1\t+91 99805 26456\tBengaluru, India\t180\tResearchBiotechnology
4baseCare\tHitesh Goswami\tCEO\thitesh@4basecare.com+1\t+91 78921 38638\tBengaluru, India\t180\tResearchBiotechnology
Hexahealth\tAnkur Gigras\tCEO\tankur@hexahealth.com+1\t+91 90047 87187\tNew Delhi, India\t230\tHospital & Health Care`

const { rows, errors } = parseProspectPaste(sample)
assert.equal(errors.length, 0)
assert.equal(rows.length, 3)
assert.equal(rows[0].email, 'christina@4basecare.com')
assert.equal(mapIndustry(rows[0].industry), 'Research / Biotech')
assert.equal(mapIndustry(rows[2].industry), 'Healthcare')
assert.equal(rows[0].employees, 180)

const emailSet = new Set()
let created = 0
let skipped = 0
for (const r of rows) {
  if (r.email && emailSet.has(r.email)) {
    skipped++
    continue
  }
  emailSet.add(r.email)
  created++
}
assert.equal(created, 3)
assert.equal(skipped, 0)

for (const r of rows) {
  if (r.email && emailSet.has(r.email)) skipped++
}
assert.equal(skipped, 3)

console.log('OK: parse + email clean + industry map + duplicate skip')
