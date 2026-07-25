import type {
  PipelineView,
  Stage,
  ContactView,
  ContactStatus,
  ContactFilters,
  ContactDateRange,
  ContactSortKey,
  SortDirection,
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

const TERMINAL_STATUSES: ContactStatus[] = [
  'Rejected',
  'Wrong/Bad Number',
  'Connected - Information Gathered (Not ICP)',
  'Connected - DQ Prospect (Not ICP)',
  'Connected - DQ Company (Bad Fit)',
]

const NOT_ICP_DQ_STATUSES: ContactStatus[] = [
  'Connected - Information Gathered (Not ICP)',
  'Connected - DQ Prospect (Not ICP)',
  'Connected - DQ Company (Bad Fit)',
]

export function isoDateOffset(days: number, now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
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
  return !TERMINAL_STATUSES.includes(contact.contactStatus)
}

export const CONTACT_VIEW_GROUPS: { label: string; views: ContactView[] }[] = [
  {
    label: 'Today',
    views: ['To Call Today', 'Follow-up Today', 'Overdue', "Didn't Pick Yesterday"],
  },
  {
    label: 'Outreach',
    views: [
      'Not Contacted',
      "Didn't Pick",
      'Wrong/Bad Number',
      'Got Referral',
      'Wrong Person',
      'Send Email',
      'Send WhatsApp',
    ],
  },
  {
    label: 'Pipeline',
    views: [
      'Discovery Booked',
      'Interested',
      'Champions',
      'Future Follow-up',
      'Not ICP / DQ',
      'Rejected',
      'All Contacts',
    ],
  },
]

export const CONTACT_VIEWS: ContactView[] = CONTACT_VIEW_GROUPS.flatMap((g) => g.views)

export const CONTACT_VIEW_HINTS: Record<ContactView, string> = {
  'All Contacts': 'Everyone in the database.',
  'To Call Today':
    'Your call queue: fresh leads, follow-ups due, and retries from yesterday’s no-answers.',
  'Follow-up Today': 'Contacts with next follow-up scheduled for today.',
  Overdue: 'Follow-up date has passed — call these first.',
  "Didn't Pick Yesterday": 'No answer yesterday — try again today.',
  'Not Contacted': 'Never called yet.',
  "Didn't Pick": 'All no-answer contacts (any date).',
  'Wrong/Bad Number': 'Invalid or bad phone numbers — find a better number.',
  'Got Referral': 'They gave you another name — add the referral and call.',
  'Wrong Person': 'Wrong stakeholder — find the right contact at this company.',
  'Send Email': 'Connected — asked to be emailed.',
  'Send WhatsApp': 'Connected — asked for a WhatsApp message.',
  'Discovery Booked': 'Connected — discovery call booked.',
  'Not ICP / DQ': 'Connected but not ICP, or DQ’d prospect/company.',
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
    case 'Wrong/Bad Number':
      return contacts.filter((t) => t.contactStatus === 'Wrong/Bad Number')
    case 'Send Email':
      return contacts.filter((t) => t.contactStatus === 'Connected - Send Me an Email')
    case 'Send WhatsApp':
      return contacts.filter(
        (t) => t.contactStatus === 'Connected - Send Me a WhatsApp Message',
      )
    case 'Discovery Booked':
      return contacts.filter(
        (t) => t.contactStatus === 'Connected - Booked a Discovery Call',
      )
    case 'Not ICP / DQ':
      return contacts.filter((t) => NOT_ICP_DQ_STATUSES.includes(t.contactStatus))
    case 'Interested':
      return contacts.filter((t) => t.contactStatus === 'Interested')
    case 'Champions':
      return contacts.filter((t) => t.champion)
    case 'Future Follow-up':
      return contacts.filter(
        (t) =>
          t.contactStatus === 'Connected - Future Follow-up' ||
          t.contactStatus === 'Follow-up Required' ||
          t.contactStatus === 'Connected - Send Me an Email' ||
          t.contactStatus === 'Connected - Send Me a WhatsApp Message' ||
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

export const DEFAULT_CONTACT_FILTERS: ContactFilters = {
  search: '',
  queue: 'to-call-today',
  statuses: [],
  companyId: null,
  stages: [],
  championOnly: false,
  dateRange: 'all',
}

export const CONTACT_QUEUE_OPTIONS: { value: ContactFilters['queue']; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'to-call-today', label: 'To Call Today' },
  { value: 'follow-up-today', label: 'Follow-up Today' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'didnt-pick-yesterday', label: "Didn't Pick Yesterday" },
]

export const CONTACT_DATE_RANGE_OPTIONS: { value: ContactDateRange; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30-days', label: 'Last 30 Days' },
]

/** Monday 00:00 local of the current week as ISO date `YYYY-MM-DD`. */
export function startOfWeekIso(now = new Date()): string {
  const d = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const day = d.getDay()
  const mondayOffset = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + mondayOffset)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dayNum = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dayNum}`
}

/** First day of the current month as ISO date `YYYY-MM-DD`. */
export function startOfMonthIso(now = new Date()): string {
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}-01`
}

/** Inclusive lower bound for `contact.createdAt` comparisons, or null when unrestricted. */
export function dateRangeStartIso(range: ContactDateRange, now = new Date()): string | null {
  switch (range) {
    case 'all':
      return null
    case 'this-week':
      return startOfWeekIso(now)
    case 'this-month':
      return startOfMonthIso(now)
    case 'last-30-days':
      return isoDateOffset(-30, now)
    default:
      return null
  }
}

function createdAtDate(iso: string): string {
  return iso.slice(0, 10)
}

function matchesQueue(contact: Contact, queue: ContactFilters['queue']): boolean {
  if (queue === 'all') return true
  const today = todayIso()
  const yesterday = yesterdayIso()
  switch (queue) {
    case 'to-call-today':
      if (!isActiveContact(contact)) return false
      if (contact.contactStatus === 'Not Contacted') return true
      if (contact.nextFollowUp && contact.nextFollowUp <= today) return true
      if (
        isDidntPick(contact.contactStatus) &&
        contact.lastContacted &&
        contact.lastContacted <= yesterday
      ) {
        return true
      }
      return false
    case 'follow-up-today':
      return isActiveContact(contact) && contact.nextFollowUp === today
    case 'overdue':
      return isActiveContact(contact) && !!contact.nextFollowUp && contact.nextFollowUp < today
    case 'didnt-pick-yesterday':
      return isDidntPick(contact.contactStatus) && contact.lastContacted === yesterday
    default:
      return true
  }
}

/**
 * Composable Contacts-page filter (search + queue + status + company + stage +
 * champion + createdAt date range). Companies are required for search/stage joins.
 */
export function applyContactFilters(
  contacts: Contact[],
  companies: Company[],
  filters: ContactFilters,
): Contact[] {
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const search = filters.search.trim().toLowerCase()
  const dateStart = dateRangeStartIso(filters.dateRange)

  return contacts.filter((contact) => {
    if (!matchesQueue(contact, filters.queue)) return false

    if (filters.statuses.length > 0 && !filters.statuses.includes(contact.contactStatus)) {
      return false
    }

    if (filters.companyId && contact.companyId !== filters.companyId) return false

    if (filters.championOnly && !contact.champion) return false

    if (dateStart && createdAtDate(contact.createdAt) < dateStart) return false

    const company = contact.companyId ? companyById.get(contact.companyId) : undefined

    if (filters.stages.length > 0) {
      if (!company || !filters.stages.includes(company.stage)) return false
    }

    if (search) {
      const haystack = [
        contact.contactName,
        contact.email,
        contact.phone,
        company?.companyName ?? '',
      ]
        .join(' ')
        .toLowerCase()
      if (!haystack.includes(search)) return false
    }

    return true
  })
}

export function sortContactsByKey(
  contacts: Contact[],
  companies: Company[],
  key: ContactSortKey,
  direction: SortDirection,
): Contact[] {
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const mul = direction === 'asc' ? 1 : -1
  const sorted = [...contacts]

  sorted.sort((a, b) => {
    let cmp = 0
    switch (key) {
      case 'contactName':
        cmp = a.contactName.localeCompare(b.contactName)
        break
      case 'companyName': {
        const an = companyById.get(a.companyId ?? '')?.companyName ?? ''
        const bn = companyById.get(b.companyId ?? '')?.companyName ?? ''
        cmp = an.localeCompare(bn)
        break
      }
      case 'contactStatus':
        cmp = a.contactStatus.localeCompare(b.contactStatus)
        break
      case 'stage': {
        const as = companyById.get(a.companyId ?? '')?.stage ?? ''
        const bs = companyById.get(b.companyId ?? '')?.stage ?? ''
        cmp = as.localeCompare(bs)
        break
      }
      case 'nextFollowUp':
        cmp = (a.nextFollowUp ?? '9999-12-31').localeCompare(b.nextFollowUp ?? '9999-12-31')
        break
      case 'lastContacted':
        cmp = (a.lastContacted ?? '').localeCompare(b.lastContacted ?? '')
        break
      case 'createdAt':
        cmp = a.createdAt.localeCompare(b.createdAt)
        break
      default:
        cmp = a.contactName.localeCompare(b.contactName)
    }
    if (cmp !== 0) return cmp * mul
    return a.contactName.localeCompare(b.contactName)
  })

  return sorted
}

export interface ContactInsights {
  total: number
  contacted: number
  notContacted: number
  notReachable: number
  discoveriesBooked: number
  demos: number
  statusCounts: { status: string; count: number }[]
  uniqueCompanies: number
  companyStageCounts: { stage: string; count: number }[]
}

const NOT_REACHABLE_STATUSES = new Set<ContactStatus>(["Didn't Pick", 'No Answer', 'Wrong/Bad Number'])
const DISCOVERY_BOOKED_STATUS = 'Connected - Booked a Discovery Call'
const DEMO_STAGES = new Set(['Demo Scheduled', 'Demo Delivered'])

/** Aggregate lead insights for the (already filtered) contact list. */
export function buildContactInsights(
  contacts: Contact[],
  companies: Company[],
): ContactInsights {
  const companyById = new Map(companies.map((c) => [c.id, c]))
  const statusMap = new Map<string, number>()
  const stageMap = new Map<string, number>()
  const seenCompanies = new Set<string>()

  let contacted = 0
  let notContacted = 0
  let notReachable = 0
  let discoveriesBooked = 0
  let demos = 0

  for (const c of contacts) {
    statusMap.set(c.contactStatus, (statusMap.get(c.contactStatus) ?? 0) + 1)

    if (c.contactStatus === 'Not Contacted') notContacted += 1
    else contacted += 1

    if (NOT_REACHABLE_STATUSES.has(c.contactStatus)) notReachable += 1
    if (c.contactStatus === DISCOVERY_BOOKED_STATUS) discoveriesBooked += 1

    if (c.companyId && !seenCompanies.has(c.companyId)) {
      seenCompanies.add(c.companyId)
      const company = companyById.get(c.companyId)
      if (company) {
        stageMap.set(company.stage, (stageMap.get(company.stage) ?? 0) + 1)
        if (DEMO_STAGES.has(company.stage)) demos += 1
      }
    }
  }

  const statusCounts = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const companyStageCounts = [...stageMap.entries()]
    .map(([stage, count]) => ({ stage, count }))
    .sort((a, b) => b.count - a.count)

  return {
    total: contacts.length,
    contacted,
    notContacted,
    notReachable,
    discoveriesBooked,
    demos,
    statusCounts,
    uniqueCompanies: seenCompanies.size,
    companyStageCounts,
  }
}

export function contactFiltersAreActive(filters: ContactFilters): boolean {
  return (
    filters.search.trim() !== '' ||
    filters.queue !== 'all' ||
    filters.statuses.length > 0 ||
    filters.companyId !== null ||
    filters.stages.length > 0 ||
    filters.championOnly ||
    filters.dateRange !== 'all'
  )
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
    case 'Connected - Booked a Discovery Call':
      return 'bg-emerald-100 text-emerald-800'
    case 'Connected - Got Referral':
      return 'bg-violet-100 text-violet-800'
    case 'Connected - Future Follow-up':
    case 'Follow-up Required':
    case 'Connected - Send Me an Email':
    case 'Connected - Send Me a WhatsApp Message':
      return 'bg-amber-100 text-amber-800'
    case 'Connected - Not Right Person':
    case 'Wrong/Bad Number':
      return 'bg-orange-100 text-orange-800'
    case 'Called':
      return 'bg-sky-100 text-sky-800'
    case "Didn't Pick":
    case 'No Answer':
      return 'bg-stone-200 text-stone-700'
    case 'Rejected':
    case 'Connected - Information Gathered (Not ICP)':
    case 'Connected - DQ Prospect (Not ICP)':
    case 'Connected - DQ Company (Bad Fit)':
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
