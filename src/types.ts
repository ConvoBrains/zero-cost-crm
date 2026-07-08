export const STAGES = [
  'Lead Added',
  'Discovery Call Done',
  'Follow-up',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Kickoff',
  'Client Data Received',
  'POC Delivered',
  'Final Negotiation',
  'Closed Won',
  'Closed Lost',
  'Not Interested',
] as const

export type Stage = (typeof STAGES)[number]

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

export const CONTACT_STATUSES = [
  'Not Contacted',
  'Called',
  'No Answer',
  'Interested',
  'Follow-up Required',
  'Rejected',
] as const
export type ContactStatus = (typeof CONTACT_STATUSES)[number]

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
  notes: string
  createdAt: string
}

export type Page = 'dashboard' | 'pipeline' | 'contacts' | 'import'

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
  | 'Champions'
  | 'Pending Calls'
  | 'Follow-up Required'

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

export function canDeleteRecords(role?: string): boolean {
  return role === 'admin' || role === 'founder'
}
