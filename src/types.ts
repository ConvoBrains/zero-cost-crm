export {
  DEFAULT_BRAND_NAME,
  DEFAULT_BRAND_TAGLINE,
  DEFAULT_CONTACT_STATUSES,
  DEFAULT_LOGO_URL,
  DEFAULT_STAGES,
} from './defaults.js'

/** @deprecated Prefer instance settings from GET /api/config — kept as default lists. */
export { DEFAULT_STAGES as STAGES, DEFAULT_CONTACT_STATUSES as CONTACT_STATUSES } from './defaults.js'

export type Stage = string
export type ContactStatus = string

export const INTENTS = ['Hot', 'Warm', 'Cold'] as const
export type Intent = (typeof INTENTS)[number]

export const INDUSTRIES = [
  'BFSI',
  'Healthcare',
  'Retail',
  'EdTech',
  'Telecom',
  'SaaS',
  'Logistics',
  'Research / Biotech',
  'Other',
] as const
export type Industry = (typeof INDUSTRIES)[number]

export interface Company {
  id: string
  companyName: string
  stage: Stage
  industry: Industry | ''
  location: string
  estimatedCallVolume: number | null
  employeeCount: number | null
  intent: Intent | ''
  offeredPrice: number | null
  primaryContactId: string | null
  assignedTo: string
  lastContacted: string | null
  nextFollowUp: string | null
  notes: string
  sourceLink: string
  companyWebsite: string
  linkedInCompany: string
  createdAt: string
}

export interface Contact {
  id: string
  contactName: string
  companyId: string | null
  role: string
  phone: string
  email: string
  linkedInProfile: string
  contactStatus: ContactStatus
  champion: boolean
  lastContacted: string | null
  nextFollowUp: string | null
  notes: string
  createdAt: string
}

export type Page =
  | 'dashboard'
  | 'pipeline'
  | 'contacts'
  | 'import'
  | 'users'
  | 'activity'
  | 'settings'

export type PipelineView =
  | 'All Companies'
  | 'New Leads'
  | 'Discovery Calls'
  | 'Follow-ups'
  | 'Demo Scheduled'
  | 'Demo Delivered'
  | 'Commercial Proposal Shared'
  | 'POC Running'
  | 'Final Negotiation'
  | 'Closed Won'
  | 'Closed Lost'
  | 'Not Interested'

export type ContactView =
  | 'All Contacts'
  | 'To Call Today'
  | 'Follow-up Today'
  | 'Overdue'
  | "Didn't Pick Yesterday"
  | 'Not Contacted'
  | "Didn't Pick"
  | 'Wrong/Bad Number'
  | 'Got Referral'
  | 'Wrong Person'
  | 'Send Email'
  | 'Send WhatsApp'
  | 'Discovery Booked'
  | 'Not ICP / DQ'
  | 'Interested'
  | 'Champions'
  | 'Future Follow-up'
  | 'Rejected'

/** One row from the daily prospect paste (Excel / Sheets / LinkedIn export). */
export interface ProspectRow {
  company: string
  prospectName: string
  jobTitle: string
  email: string
  phone: string
  location: string
  employees: number | null
  industry: string
}

export interface ImportResult {
  companiesCreated: number
  companiesUpdated: number
  contactsCreated: number
  contactsSkipped: number
}

export interface AuthUser {
  id: string
  email: string
  name: string
  role?: string
}

export const USER_ROLES = ['founder', 'sdr', 'admin'] as const
export type UserRole = (typeof USER_ROLES)[number]

export interface CrmUser {
  id: string
  email: string
  name: string
  role: UserRole | string
  createdAt: string
}

export function canDeleteRecords(role?: string): boolean {
  return role === 'admin' || role === 'founder'
}

export function canManageUsers(role?: string): boolean {
  return role === 'admin' || role === 'founder'
}

export interface Conversation {
  id: string
  companyId: string
  contactId: string
  companyName: string
  contactName: string
  calledBy: string
  calledByName: string
  stageAtCall: Stage
  calledAt: string
  s3Url: string
  notes: string
}

/** Public + authenticated instance config from GET /api/config */
export interface AppConfig {
  brandName: string
  brandTagline: string
  logoUrl: string
  stages: string[]
  contactStatuses: string[]
  championStatusToStage: Record<string, string | null>
  allowedEmailDomain: string | null
  allowedEmailDomains: string[]
  allowAnyEmailDomain: boolean
}
