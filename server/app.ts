import express from 'express'
import cors from 'cors'
import bcrypt from 'bcrypt'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { pool } from './db.js'
import {
  ALLOWED_EMAIL_DOMAIN,
  isConvobrainsEmail,
  isUserRole,
  requireAuth,
  requireAdmin,
  signToken,
  USER_ROLES,
} from './auth.js'
import { mapCompany, mapContact } from './mappers.js'
import { registerConversationRoutes } from './conversations.js'

const app = express()
app.use(cors())
app.use(express.json({ limit: '2mb' }))

const COMPANY_SELECT = `
  SELECT c.*, u.name AS assigned_to_name
  FROM companies c
  LEFT JOIN users u ON u.id = c.assigned_to
`

function todayIso() {
  return new Date().toISOString().slice(0, 10)
}

function cleanEmail(raw: string): string {
  return raw
    .trim()
    .replace(/\+1$/, '')
    .replace(/\+\d+$/, '')
    .toLowerCase()
}

function mapIndustry(raw: string): string | null {
  const s = raw.toLowerCase().replace(/[^a-z0-9\s&]/g, ' ')
  if (/hospital|health|care|medical|pharma/.test(s)) return 'Healthcare'
  if (/biotech|research|genome|lab/.test(s)) return 'Research / Biotech'
  if (/retail|cosmetic|wholesale|shop/.test(s)) return 'Retail'
  if (/bank|fintech|insurance|bfsi/.test(s)) return 'BFSI'
  if (/saas|software|tech/.test(s)) return 'SaaS'
  if (/edu|edtech/.test(s)) return 'EdTech'
  if (/telecom/.test(s)) return 'Telecom'
  if (/logistics|fleet|shipping/.test(s)) return 'Logistics'
  if (!raw.trim()) return null
  return 'Other'
}

function emptyToNull<T>(v: T | '' | null | undefined): T | null {
  if (v === '' || v === undefined) return null
  return v
}

// ─── Auth ───────────────────────────────────────────────────────────────────

app.post('/api/auth/login', async (req, res) => {
  const email = String(req.body.email ?? '')
    .trim()
    .toLowerCase()
  const password = String(req.body.password ?? '')

  if (!isConvobrainsEmail(email)) {
    res.status(400).json({ error: `Only @${ALLOWED_EMAIL_DOMAIN} emails are allowed.` })
    return
  }

  const { rows } = await pool.query(
    'SELECT id, email, password_hash, name, role FROM users WHERE LOWER(email) = $1',
    [email],
  )
  const user = rows[0]
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password.' })
    return
  }

  const ok = await bcrypt.compare(password, user.password_hash)
  if (!ok) {
    res.status(401).json({ error: 'Invalid email or password.' })
    return
  }

  const token = signToken({
    sub: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  })

  res.json({
    token,
    user: { id: user.id, email: user.email, name: user.name, role: user.role },
  })
})

app.get('/api/auth/me', requireAuth, async (req, res) => {
  res.json({
    user: {
      id: req.user!.sub,
      email: req.user!.email,
      name: req.user!.name,
      role: req.user!.role,
    },
  })
})

// ─── Users (admin / founder) ────────────────────────────────────────────────

app.get('/api/users/roles', requireAuth, requireAdmin, (_req, res) => {
  res.json({ roles: USER_ROLES })
})

app.get('/api/users', requireAuth, requireAdmin, async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT id, email, name, role, created_at
     FROM users
     ORDER BY name ASC`,
  )
  res.json({
    users: rows.map((row) => ({
      id: row.id,
      email: row.email,
      name: row.name,
      role: row.role,
      createdAt: row.created_at,
    })),
  })
})

app.post('/api/users', requireAuth, requireAdmin, async (req, res) => {
  const email = String(req.body.email ?? '')
    .trim()
    .toLowerCase()
  const name = String(req.body.name ?? '').trim()
  const password = String(req.body.password ?? '')
  const role = String(req.body.role ?? 'sdr').trim().toLowerCase()

  if (!isConvobrainsEmail(email)) {
    res.status(400).json({ error: `Only @${ALLOWED_EMAIL_DOMAIN} emails are allowed.` })
    return
  }
  if (!name) {
    res.status(400).json({ error: 'Name is required.' })
    return
  }
  if (password.length < 8) {
    res.status(400).json({ error: 'Password must be at least 8 characters.' })
    return
  }
  if (!isUserRole(role)) {
    res.status(400).json({
      error: `Invalid role. Allowed: ${USER_ROLES.join(', ')}.`,
    })
    return
  }

  const passwordHash = await bcrypt.hash(password, 10)

  try {
    const { rows } = await pool.query(
      `INSERT INTO users (email, password_hash, name, role)
       VALUES ($1, $2, $3, $4)
       RETURNING id, email, name, role, created_at`,
      [email, passwordHash, name, role],
    )
    const row = rows[0]
    res.status(201).json({
      user: {
        id: row.id,
        email: row.email,
        name: row.name,
        role: row.role,
        createdAt: row.created_at,
      },
    })
  } catch (e) {
    const err = e as { code?: string }
    if (err.code === '23505') {
      res.status(409).json({ error: 'A user with that email already exists.' })
      return
    }
    throw e
  }
})

// ─── Bootstrap ──────────────────────────────────────────────────────────────

app.get('/api/bootstrap', requireAuth, async (_req, res) => {
  const [companies, contacts] = await Promise.all([
    pool.query(`${COMPANY_SELECT} ORDER BY c.created_at DESC`),
    pool.query('SELECT * FROM contacts ORDER BY created_at DESC'),
  ])
  res.json({
    companies: companies.rows.map(mapCompany),
    contacts: contacts.rows.map(mapContact),
  })
})

app.get('/api/metrics', requireAuth, async (_req, res) => {
  const activeStages = [
    'Discovery Call Done',
    'Follow-up',
    'Demo Scheduled',
    'Demo Delivered',
    'Commercial Proposal Shared',
    'POC Kickoff',
    'Client Data Received',
    'POC Delivered',
    'Final Negotiation',
  ]
  const today = todayIso()
  const { rows } = await pool.query(
    `
    SELECT
      COUNT(*)::int AS total_companies,
      COUNT(*) FILTER (WHERE stage = 'Lead Added')::int AS new_leads,
      COUNT(*) FILTER (WHERE next_follow_up = $1::date)::int AS follow_ups_due_today,
      COUNT(*) FILTER (WHERE stage = 'Demo Scheduled')::int AS demo_scheduled,
      COUNT(*) FILTER (WHERE stage = ANY($2::text[]))::int AS active_opportunities,
      COUNT(*) FILTER (WHERE stage = 'Closed Won')::int AS closed_won,
      COUNT(*) FILTER (WHERE stage = 'Closed Lost')::int AS closed_lost
    FROM companies
    `,
    [today, activeStages],
  )
  const { rows: contactRows } = await pool.query('SELECT COUNT(*)::int AS n FROM contacts')
  const m = rows[0]
  res.json({
    totalCompanies: m.total_companies,
    totalContacts: contactRows[0].n,
    newLeads: m.new_leads,
    followUpsDueToday: m.follow_ups_due_today,
    demoScheduled: m.demo_scheduled,
    activeOpportunities: m.active_opportunities,
    closedWon: m.closed_won,
    closedLost: m.closed_lost,
  })
})

// ─── Companies ─────────────────────────────────────────────────────────────

app.post('/api/companies', requireAuth, async (req, res) => {
  const b = req.body
  const { rows } = await pool.query(
    `
    INSERT INTO companies (
      company_name, stage, industry, location, estimated_call_volume, employee_count,
      intent, offered_price, primary_contact_id, assigned_to, last_contacted,
      next_follow_up, notes, source_link, company_website, linkedin_company
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16
    )
    RETURNING id
    `,
    [
      b.companyName,
      b.stage ?? 'Lead Added',
      emptyToNull(b.industry),
      b.location ?? '',
      b.estimatedCallVolume ?? null,
      b.employeeCount ?? null,
      emptyToNull(b.intent),
      b.offeredPrice ?? null,
      b.primaryContactId ?? null,
      req.user!.sub,
      b.lastContacted ?? null,
      b.nextFollowUp ?? null,
      b.notes ?? '',
      b.sourceLink ?? '',
      b.companyWebsite ?? '',
      b.linkedInCompany ?? '',
    ],
  )
  const { rows: full } = await pool.query(`${COMPANY_SELECT} WHERE c.id = $1`, [rows[0].id])
  res.status(201).json(mapCompany(full[0]))
})

app.patch('/api/companies/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const b = req.body
  const fields: string[] = []
  const values: unknown[] = []
  let i = 1

  const set = (col: string, val: unknown) => {
    fields.push(`${col} = $${i++}`)
    values.push(val)
  }

  if (b.companyName !== undefined) set('company_name', b.companyName)
  if (b.stage !== undefined) set('stage', b.stage)
  if (b.industry !== undefined) set('industry', emptyToNull(b.industry))
  if (b.location !== undefined) set('location', b.location)
  if (b.estimatedCallVolume !== undefined) set('estimated_call_volume', b.estimatedCallVolume)
  if (b.employeeCount !== undefined) set('employee_count', b.employeeCount)
  if (b.intent !== undefined) set('intent', emptyToNull(b.intent))
  if (b.offeredPrice !== undefined) set('offered_price', b.offeredPrice)
  if (b.primaryContactId !== undefined) set('primary_contact_id', b.primaryContactId)
  if (b.lastContacted !== undefined) set('last_contacted', b.lastContacted)
  if (b.nextFollowUp !== undefined) set('next_follow_up', b.nextFollowUp)
  if (b.notes !== undefined) set('notes', b.notes)
  if (b.sourceLink !== undefined) set('source_link', b.sourceLink)
  if (b.companyWebsite !== undefined) set('company_website', b.companyWebsite)
  if (b.linkedInCompany !== undefined) set('linkedin_company', b.linkedInCompany)

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  fields.push('updated_at = now()')
  values.push(id)

  await pool.query(
    `UPDATE companies SET ${fields.join(', ')} WHERE id = $${i}`,
    values,
  )

  const { rows: full } = await pool.query(`${COMPANY_SELECT} WHERE c.id = $1`, [id])
  if (!full[0]) {
    res.status(404).json({ error: 'Company not found' })
    return
  }
  res.json(mapCompany(full[0]))
})

app.delete('/api/companies/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  await pool.query('UPDATE contacts SET company_id = NULL WHERE company_id = $1', [id])
  const r = await pool.query('DELETE FROM companies WHERE id = $1', [id])
  if (r.rowCount === 0) {
    res.status(404).json({ error: 'Company not found' })
    return
  }
  res.status(204).end()
})

// ─── Contacts ────────────────────────────────────────────────────────────────

app.post('/api/contacts', requireAuth, async (req, res) => {
  const b = req.body
  const { rows } = await pool.query(
    `
    INSERT INTO contacts (
      contact_name, company_id, role, phone, email, linkedin_profile,
      contact_status, champion, last_contacted, next_follow_up, notes
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING *
    `,
    [
      b.contactName,
      b.companyId ?? null,
      b.role ?? '',
      b.phone ?? '',
      b.email ?? '',
      b.linkedInProfile ?? '',
      b.contactStatus ?? 'Not Contacted',
      b.champion ?? false,
      b.lastContacted ?? null,
      b.nextFollowUp ?? null,
      b.notes ?? '',
    ],
  )
  const contact = rows[0]
  if (contact.champion && contact.company_id) {
    await pool.query('UPDATE companies SET primary_contact_id = $1 WHERE id = $2', [
      contact.id,
      contact.company_id,
    ])
  }
  res.status(201).json(mapContact(contact))
})

app.patch('/api/contacts/:id', requireAuth, async (req, res) => {
  const { id } = req.params
  const b = req.body
  const fields: string[] = []
  const values: unknown[] = []
  let i = 1

  const set = (col: string, val: unknown) => {
    fields.push(`${col} = $${i++}`)
    values.push(val)
  }

  if (b.contactName !== undefined) set('contact_name', b.contactName)
  if (b.companyId !== undefined) set('company_id', b.companyId)
  if (b.role !== undefined) set('role', b.role)
  if (b.phone !== undefined) set('phone', b.phone)
  if (b.email !== undefined) set('email', b.email)
  if (b.linkedInProfile !== undefined) set('linkedin_profile', b.linkedInProfile)
  if (b.contactStatus !== undefined) set('contact_status', b.contactStatus)
  if (b.champion !== undefined) set('champion', b.champion)
  if (b.lastContacted !== undefined) set('last_contacted', b.lastContacted)
  if (b.nextFollowUp !== undefined) set('next_follow_up', b.nextFollowUp)
  if (b.notes !== undefined) set('notes', b.notes)

  if (fields.length === 0) {
    res.status(400).json({ error: 'No fields to update' })
    return
  }

  fields.push('updated_at = now()')
  values.push(id)

  const { rows } = await pool.query(
    `UPDATE contacts SET ${fields.join(', ')} WHERE id = $${i} RETURNING *`,
    values,
  )
  if (!rows[0]) {
    res.status(404).json({ error: 'Contact not found' })
    return
  }

  const contact = rows[0]
  if (b.champion === true && contact.company_id) {
    await pool.query('UPDATE companies SET primary_contact_id = $1 WHERE id = $2', [
      contact.id,
      contact.company_id,
    ])
  }

  res.json(mapContact(contact))
})

app.delete('/api/contacts/:id', requireAuth, requireAdmin, async (req, res) => {
  const { id } = req.params
  await pool.query(
    'UPDATE companies SET primary_contact_id = NULL WHERE primary_contact_id = $1',
    [id],
  )
  const r = await pool.query('DELETE FROM contacts WHERE id = $1', [id])
  if (r.rowCount === 0) {
    res.status(404).json({ error: 'Contact not found' })
    return
  }
  res.status(204).end()
})

// ─── Import ──────────────────────────────────────────────────────────────────

app.post('/api/import/prospects', requireAuth, async (req, res) => {
  const rows = req.body.rows as Array<{
    company: string
    prospectName: string
    jobTitle: string
    email: string
    phone: string
    location: string
    employees: number | null
    industry: string
  }>

  if (!Array.isArray(rows) || rows.length === 0) {
    res.status(400).json({ error: 'No rows to import' })
    return
  }

  const client = await pool.connect()
  const result = {
    companiesCreated: 0,
    companiesUpdated: 0,
    contactsCreated: 0,
    contactsSkipped: 0,
  }

  try {
    await client.query('BEGIN')

    const { rows: companyRows } = await client.query(`${COMPANY_SELECT}`)
    const { rows: contactRows } = await client.query('SELECT * FROM contacts')

    const companyByName = new Map(
      companyRows.map((c) => [String(c.company_name).toLowerCase(), c]),
    )
    const emailSet = new Set(
      contactRows
        .map((t) => cleanEmail(String(t.email ?? '')))
        .filter((e) => e.length > 0),
    )
    const touchedCompanies = new Set<string>()

    for (const row of rows) {
      const key = row.company.toLowerCase()
      let company = companyByName.get(key)

      if (!company) {
        const ins = await client.query(
          `
          INSERT INTO companies (
            company_name, stage, industry, location, employee_count,
            assigned_to, next_follow_up, notes
          ) VALUES ($1, 'Lead Added', $2, $3, $4, $5, $6, $7)
          RETURNING *
          `,
          [
            row.company,
            mapIndustry(row.industry),
            row.location ?? '',
            row.employees,
            req.user!.sub,
            todayIso(),
            `Imported ${todayIso()}`,
          ],
        )
        company = ins.rows[0]
        company.assigned_to_name = req.user!.name
        companyByName.set(key, company)
        result.companiesCreated += 1
      } else if (!touchedCompanies.has(String(company.id))) {
        const patch: string[] = []
        const vals: unknown[] = []
        let n = 1
        if (row.location) {
          patch.push(`location = $${n++}`)
          vals.push(row.location)
        }
        if (row.employees != null) {
          patch.push(`employee_count = $${n++}`)
          vals.push(row.employees)
        }
        if (row.industry) {
          patch.push(`industry = $${n++}`)
          vals.push(mapIndustry(row.industry))
        }
        if (patch.length > 0) {
          patch.push('updated_at = now()')
          vals.push(company.id)
          const upd = await client.query(
            `UPDATE companies SET ${patch.join(', ')} WHERE id = $${n} RETURNING *`,
            vals,
          )
          company = { ...upd.rows[0], assigned_to_name: company.assigned_to_name }
          companyByName.set(key, company)
          result.companiesUpdated += 1
        }
        touchedCompanies.add(String(company.id))
      } else {
        company = companyByName.get(key)!
      }

      const email = cleanEmail(row.email)
      if (email && emailSet.has(email)) {
        result.contactsSkipped += 1
        continue
      }

      if (!email) {
        const dup = contactRows.some(
          (t) =>
            t.company_id === company!.id &&
            String(t.contact_name).toLowerCase() === row.prospectName.toLowerCase(),
        )
        if (dup) {
          result.contactsSkipped += 1
          continue
        }
      }

      try {
        const ins = await client.query(
          `
          INSERT INTO contacts (
            contact_name, company_id, role, phone, email, contact_status
          ) VALUES ($1, $2, $3, $4, $5, 'Not Contacted')
          RETURNING *
          `,
          [row.prospectName, company.id, row.jobTitle ?? '', row.phone ?? '', email],
        )
        contactRows.unshift(ins.rows[0])
        if (email) emailSet.add(email)
        result.contactsCreated += 1
      } catch (e: unknown) {
        const err = e as { code?: string }
        if (err.code === '23505') {
          result.contactsSkipped += 1
        } else {
          throw e
        }
      }
    }

    await client.query('COMMIT')
    res.json(result)
  } catch (e) {
    await client.query('ROLLBACK')
    throw e
  } finally {
    client.release()
  }
})

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

registerConversationRoutes(app, pool)

if (process.env.NODE_ENV === 'production') {
  const distPath = join(dirname(fileURLToPath(import.meta.url)), '..', 'dist')
  app.use(express.static(distPath))
  app.use((req, res, next) => {
    if (req.path.startsWith('/api')) return next()
    res.sendFile(join(distPath, 'index.html'))
  })
}

app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error(err)
  res.status(500).json({ error: 'Internal server error' })
})

export default app
