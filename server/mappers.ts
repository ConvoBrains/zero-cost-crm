import type { Company, Contact, Conversation } from '../src/types.js'

function pgDateToIso(val: unknown): string | null {
  if (val == null) return null
  if (val instanceof Date) {
    const y = val.getFullYear()
    const m = String(val.getMonth() + 1).padStart(2, '0')
    const d = String(val.getDate()).padStart(2, '0')
    return `${y}-${m}-${d}`
  }
  const s = String(val)
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10)
  return null
}

export function mapCompany(row: Record<string, unknown>): Company {
  return {
    id: String(row.id),
    companyName: String(row.company_name),
    stage: row.stage as Company['stage'],
    industry: (row.industry as Company['industry']) ?? '',
    location: String(row.location ?? ''),
    estimatedCallVolume:
      row.estimated_call_volume != null ? Number(row.estimated_call_volume) : null,
    employeeCount: row.employee_count != null ? Number(row.employee_count) : null,
    intent: (row.intent as Company['intent']) ?? '',
    offeredPrice: row.offered_price != null ? Number(row.offered_price) : null,
    primaryContactId: row.primary_contact_id ? String(row.primary_contact_id) : null,
    assignedTo: String(row.assigned_to_name ?? 'Team'),
    lastContacted: pgDateToIso(row.last_contacted),
    nextFollowUp: pgDateToIso(row.next_follow_up),
    notes: String(row.notes ?? ''),
    sourceLink: String(row.source_link ?? ''),
    companyWebsite: String(row.company_website ?? ''),
    linkedInCompany: String(row.linkedin_company ?? ''),
    createdAt: pgDateToIso(row.created_at) ?? '',
  }
}

export function mapContact(row: Record<string, unknown>): Contact {
  return {
    id: String(row.id),
    contactName: String(row.contact_name),
    companyId: row.company_id ? String(row.company_id) : null,
    role: String(row.role ?? ''),
    phone: String(row.phone ?? ''),
    email: String(row.email ?? ''),
    linkedInProfile: String(row.linkedin_profile ?? ''),
    contactStatus: row.contact_status as Contact['contactStatus'],
    champion: Boolean(row.champion),
    lastContacted: pgDateToIso(row.last_contacted),
    nextFollowUp: pgDateToIso(row.next_follow_up),
    notes: String(row.notes ?? ''),
    createdAt: pgDateToIso(row.created_at) ?? '',
  }
}

function pgTimestampToIso(val: unknown): string | null {
  if (val == null) return null
  if (val instanceof Date) return val.toISOString()
  const s = String(val)
  if (!s) return null
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d.toISOString()
}

export function mapConversation(row: Record<string, unknown>): Conversation {
  return {
    id: String(row.id),
    companyId: String(row.company_id),
    contactId: String(row.contact_id),
    companyName: String(row.company_name ?? ''),
    contactName: String(row.contact_name ?? ''),
    calledBy: String(row.called_by),
    calledByName: String(row.called_by_name ?? ''),
    stageAtCall: row.stage_at_call as Conversation['stageAtCall'],
    calledAt: pgTimestampToIso(row.called_at) ?? '',
    s3Url: String(row.s3_url ?? ''),
    notes: String(row.notes ?? ''),
  }
}
