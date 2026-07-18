import pg from 'pg'
import { assertSafeTestingDb } from './assert-safe-db.mjs'

const info = assertSafeTestingDb()
const pool = new pg.Pool({ connectionString: info.connectionString, ssl: false })

const SDR_EMAILS = [
  'rahul.seed@convobrains.com',
  'neha.seed@convobrains.com',
  'aman.seed@convobrains.com',
]

try {
  const { rows: users } = await pool.query(
    `SELECT id, email, name FROM users WHERE email = ANY($1::text[])`,
    [SDR_EMAILS],
  )
  if (users.length < 3) {
    throw new Error('Run testing/functional/seed-users.mjs first')
  }
  const byEmail = Object.fromEntries(users.map((u) => [u.email, u]))

  // Wipe prior CRM seed data (cascade sessions/events via FKs as needed)
  await pool.query(`DELETE FROM conversations`)
  await pool.query(`DELETE FROM activity_events`)
  await pool.query(`DELETE FROM user_sessions`)
  await pool.query(`UPDATE companies SET primary_contact_id = NULL`)
  await pool.query(`DELETE FROM contacts`)
  await pool.query(`DELETE FROM companies`)
  await pool.query(`DELETE FROM lead_import_rows`)
  await pool.query(`DELETE FROM lead_imports`)

  const companies = [
    { name: 'ABC Pvt Ltd', stage: 'Lead Added', industry: 'SaaS', sdr: 'rahul.seed@convobrains.com' },
    { name: 'Nova Health', stage: 'Follow-up', industry: 'Healthcare', sdr: 'rahul.seed@convobrains.com' },
    { name: 'RetailMax', stage: 'Demo Scheduled', industry: 'Retail', sdr: 'neha.seed@convobrains.com' },
    { name: 'FinEdge', stage: 'Discovery Call Done', industry: 'BFSI', sdr: 'neha.seed@convobrains.com' },
    { name: 'LogiFleet', stage: 'Lead Added', industry: 'Logistics', sdr: 'aman.seed@convobrains.com' },
    { name: 'EduSpark', stage: 'Not Interested', industry: 'EdTech', sdr: 'aman.seed@convobrains.com' },
    { name: 'CloudNest', stage: 'Closed Won', industry: 'SaaS', sdr: 'rahul.seed@convobrains.com' },
    { name: 'BioLabs', stage: 'Lead Added', industry: 'Research / Biotech', sdr: 'neha.seed@convobrains.com' },
  ]

  const contactNames = [
    'Alex Example',
    'Jordan Sample',
    'Sam Fixture',
    'Riley Demo',
    'Casey Stub',
  ]

  for (const [idx, c] of companies.entries()) {
    const owner = byEmail[c.sdr]
    const { rows } = await pool.query(
      `
      INSERT INTO companies (
        company_name, stage, industry, location, assigned_to, notes, source_link
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id
      `,
      [
        c.name,
        c.stage,
        c.industry,
        'Bengaluru',
        owner.id,
        'testing fixture company',
        `seed:${c.name}`,
      ],
    )
    const companyId = rows[0].id
    const contactName = contactNames[idx % contactNames.length]
    await pool.query(
      `
      INSERT INTO contacts (
        contact_name, company_id, role, phone, email, contact_status, notes
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      `,
      [
        contactName,
        companyId,
        'VP Sales',
        `+91980000${String(1000 + idx)}`,
        `contact${idx}@seed.example`,
        'Not Contacted',
        'testing fixture contact',
      ],
    )
  }

  console.log(`testing/functional/seed-crm: ${companies.length} companies + contacts`)
} finally {
  await pool.end()
}
