import type {
  PipelineView,
  Stage,
  ContactView,
  ContactStatus,
  Company,
  Contact,
} from '../types'

const POC_STAGES: Stage[] = ['POC Kickoff', 'Client Data Received', 'POC Delivered']

export const PIPELINE_VIEWS: PipelineView[] = [
  'All Companies',
  'New Leads',
  'Discovery Calls',
  'Follow-ups',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Running',
  'Final Negotiation',
  'Closed Won',
  'Closed Lost',
  'Not Interested',
]

const DIDNT_PICK_STATUSES: ContactStatus[] = ["Didn't Pick", 'No Answer']

export function isoDateOffset(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayIso(): string {
  return isoDateOffset(0)
}

export function yesterdayIso(): string {
  return isoDateOffset(-1)
}

function isDidntPick(status: ContactStatus): boolean {
  return DIDNT_PICK_STATUSES.includes(status)
}

function isActiveContact(contact: Contact): boolean {
  return contact.contactStatus !== 'Rejected'
}

export const CONTACT_VIEW_GROUPS: { label: string; views: ContactView[] }[] = [
  {
    label: 'Today',
    views: ['To Call Today', 'Follow-up Today', 'Overdue', "Didn't Pick Yesterday"],
  },
  {
    label: 'Outreach',
    views: ['Not Contacted', "Didn't Pick", 'Got Referral', 'Wrong Person'],
  },
  {
    label: 'Pipeline',
    views: ['Interested', 'Champions', 'Future Follow-up', 'Rejected', 'All Contacts'],
  },
]

export const CONTACT_VIEW_HINTS: Record<ContactView, string> = {
  'All Contacts': 'Everyone in the database.',
  'To Call Today':
    'Your call queue: fresh leads, follow-ups due, and retries from yesterday’s no-answers.',
  'Follow-up Today': 'Contacts with next follow-up scheduled for today.',
  Overdue: 'Follow-up date has passed — call these first.',
  "Didn't Pick Yesterday": 'No answer yesterday — try again today.',
  'Not Contacted': 'Never called yet.',
  "Didn't Pick": 'All no-answer contacts (any date).',
  'Got Referral': 'They gave you another name — add the referral and call.',
  'Wrong Person': 'Wrong stakeholder — find the right contact at this company.',
  Interested: 'Showed interest — push toward champion / discovery.',
  Champions: 'Primary buyers marked as champion on their company.',
  'Future Follow-up': 'Scheduled for a later call — check the follow-up date.',
  Rejected: 'Not interested — skip unless re-engaging.',
}

export function filterCompanies(companies: Company[], view: PipelineView): Company[] {
  switch (view) {
    case 'All Companies':
      return companies
    case 'New Leads':
      return companies.filter((c) => c.stage === 'Lead Added')
    case 'Discovery Calls':
      return companies.filter((c) => c.stage === 'Discovery Call Done')
    case 'Follow-ups':
      return companies.filter((c) => c.stage === 'Follow-up')
    case 'Demo Scheduled':
      return companies.filter((c) => c.stage === 'Demo Scheduled')
    case 'Demo Delivered':
      return companies.filter((c) => c.stage === 'Demo Delivered')
    case 'Commercial Proposal Shared':
      return companies.filter((c) => c.stage === 'Commercial Proposal Shared')
    case 'POC Running':
      return companies.filter((c) => POC_STAGES.includes(c.stage))
    case 'Final Negotiation':
      return companies.filter((c) => c.stage === 'Final Negotiation')
    case 'Closed Won':
      return companies.filter((c) => c.stage === 'Closed Won')
    case 'Closed Lost':
      return companies.filter((c) => c.stage === 'Closed Lost')
    case 'Not Interested':
      return companies.filter((c) => c.stage === 'Not Interested')
    default:
      return companies
  }
}

export function filterContacts(contacts: Contact[], view: ContactView): Contact[] {
  const today = todayIso()
  const yesterday = yesterdayIso()

  switch (view) {
    case 'All Contacts':
      return contacts
    case 'To Call Today':
      return contacts.filter((t) => {
        if (!isActiveContact(t)) return false
        if (t.contactStatus === 'Not Contacted') return true
        if (t.nextFollowUp && t.nextFollowUp <= today) return true
        if (isDidntPick(t.contactStatus) && t.lastContacted && t.lastContacted <= yesterday) {
          return true
        }
        return false
      })
    case 'Follow-up Today':
      return contacts.filter((t) => isActiveContact(t) && t.nextFollowUp === today)
    case 'Overdue':
      return contacts.filter(
        (t) => isActiveContact(t) && !!t.nextFollowUp && t.nextFollowUp < today,
      )
    case "Didn't Pick Yesterday":
      return contacts.filter(
        (t) => isDidntPick(t.contactStatus) && t.lastContacted === yesterday,
      )
    case 'Not Contacted':
      return contacts.filter((t) => t.contactStatus === 'Not Contacted')
    case "Didn't Pick":
      return contacts.filter((t) => isDidntPick(t.contactStatus))
    case 'Got Referral':
      return contacts.filter((t) => t.contactStatus === 'Connected - Got Referral')
    case 'Wrong Person':
      return contacts.filter((t) => t.contactStatus === 'Connected - Not Right Person')
    case 'Interested':
      return contacts.filter((t) => t.contactStatus === 'Interested')
    case 'Champions':
      return contacts.filter((t) => t.champion)
    case 'Future Follow-up':
      return contacts.filter(
        (t) =>
          t.contactStatus === 'Connected - Future Follow-up' ||
          t.contactStatus === 'Follow-up Required' ||
          (isActiveContact(t) && !!t.nextFollowUp && t.nextFollowUp > today),
      )
    case 'Rejected':
      return contacts.filter((t) => t.contactStatus === 'Rejected')
    default:
      return contacts
  }
}

export function sortContactsForView(contacts: Contact[], view: ContactView): Contact[] {
  const sorted = [...contacts]
  const byFollowUp = (a: Contact, b: Contact) => {
    const af = a.nextFollowUp ?? '9999-12-31'
    const bf = b.nextFollowUp ?? '9999-12-31'
    if (af !== bf) return af.localeCompare(bf)
    return a.contactName.localeCompare(b.contactName)
  }
  const byLastContacted = (a: Contact, b: Contact) => {
    const af = a.lastContacted ?? ''
    const bf = b.lastContacted ?? ''
    if (af !== bf) return bf.localeCompare(af)
    return a.contactName.localeCompare(b.contactName)
  }

  switch (view) {
    case 'To Call Today':
    case 'Follow-up Today':
    case 'Overdue':
      return sorted.sort(byFollowUp)
    case "Didn't Pick Yesterday":
    case "Didn't Pick":
      return sorted.sort(byLastContacted)
    default:
      return sorted.sort((a, b) => a.contactName.localeCompare(b.contactName))
  }
}

export function intentColor(intent: string): string {
  switch (intent) {
    case 'Hot':
      return 'bg-rose-100 text-rose-800'
    case 'Warm':
      return 'bg-amber-100 text-amber-800'
    case 'Cold':
      return 'bg-sky-100 text-sky-800'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

export function statusColor(status: ContactStatus): string {
  switch (status) {
    case 'Interested':
      return 'bg-emerald-100 text-emerald-800'
    case 'Connected - Got Referral':
      return 'bg-violet-100 text-violet-800'
    case 'Connected - Future Follow-up':
    case 'Follow-up Required':
      return 'bg-amber-100 text-amber-800'
    case 'Connected - Not Right Person':
      return 'bg-orange-100 text-orange-800'
    case 'Called':
      return 'bg-sky-100 text-sky-800'
    case "Didn't Pick":
    case 'No Answer':
      return 'bg-stone-200 text-stone-700'
    case 'Rejected':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

export function stageAccent(stage: Stage): string {
  if (stage === 'Closed Won') return 'border-t-emerald-500'
  if (stage === 'Closed Lost' || stage === 'Not Interested') return 'border-t-stone-400'
  if (stage.includes('Demo') || stage.includes('POC')) return 'border-t-teal-500'
  if (stage === 'Lead Added') return 'border-t-sky-400'
  if (stage === 'Follow-up') return 'border-t-amber-500'
  return 'border-t-teal-600'
}
