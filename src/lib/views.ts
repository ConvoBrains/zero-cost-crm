import type {
  PipelineView,
  Stage,
  ContactStatus,
  ContactFilters,
  ContactDateRange,
  PipelineFilters,
  PipelineDateRange,
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

export const DEFAULT_PIPELINE_FILTERS: PipelineFilters = {
  dateRange: 'all',
  customFrom: null,
  customTo: null,
}

export const PIPELINE_DATE_RANGE_OPTIONS: { value: PipelineDateRange; label: string }[] = [
  { value: 'all', label: 'All Time' },
  { value: 'this-week', label: 'This Week' },
  { value: 'this-month', label: 'This Month' },
  { value: 'last-30-days', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom' },
]

/** Inclusive createdAt date bounds for pipeline filtering. */
export function pipelineDateBounds(
  filters: PipelineFilters,
  now = new Date(),
): { start: string | null; end: string | null } {
  if (filters.dateRange === 'custom') {
    const start = filters.customFrom?.trim() || null
    const end = filters.customTo?.trim() || null
    // No bounds set yet → do not restrict (show all until the user picks dates).
    if (!start && !end) return { start: null, end: null }
    return { start, end }
  }
  return { start: dateRangeStartIso(filters.dateRange, now), end: null }
}

function companyInDateBounds(
  company: Company,
  bounds: { start: string | null; end: string | null },
): boolean {
  const created = createdAtDate(company.createdAt)
  if (bounds.start && created < bounds.start) return false
  if (bounds.end && created > bounds.end) return false
  return true
}

/** Pipeline view filter ∩ company.createdAt date window. */
export function applyPipelineFilters(
  companies: Company[],
  view: PipelineView,
  filters: PipelineFilters,
  now = new Date(),
): Company[] {
  const byView = filterCompanies(companies, view)
  const bounds = pipelineDateBounds(filters, now)
  if (!bounds.start && !bounds.end) return byView
  return byView.filter((c) => companyInDateBounds(c, bounds))
}

export interface PipelineInsights {
  total: number
  contacted: number
  discoveryDone: number
  demosScheduled: number
  demosDelivered: number
  proposalsShared: number
  closedWon: number
  closedLost: number
  stageCounts: { stage: string; count: number }[]
  /** Percent of cohort that reached each milestone (0–100). */
  conversion: {
    toDiscovery: number
    toDemo: number
    toWon: number
  }
  contactTotal: number
  champions: number
  statusCounts: { status: string; count: number }[]
}

function pct(part: number, whole: number): number {
  if (whole <= 0) return 0
  return Math.round((part / whole) * 100)
}

const DISCOVERY_OR_LATER = new Set([
  'Discovery Call Done',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Kickoff',
  'Client Data Received',
  'POC Delivered',
  'Final Negotiation',
  'Closed Won',
])

const DEMO_OR_LATER = new Set([
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Kickoff',
  'Client Data Received',
  'POC Delivered',
  'Final Negotiation',
  'Closed Won',
])

/** Aggregate pipeline progress for the (already filtered) company cohort. */
export function buildPipelineInsights(
  companies: Company[],
  contacts: Contact[],
  stageOrder: readonly string[] = [],
): PipelineInsights {
  const companyIds = new Set(companies.map((c) => c.id))
  const stageMap = new Map<string, number>()

  let contacted = 0
  let discoveryDone = 0
  let demosScheduled = 0
  let demosDelivered = 0
  let proposalsShared = 0
  let closedWon = 0
  let closedLost = 0
  let reachedDiscovery = 0
  let reachedDemo = 0

  for (const c of companies) {
    stageMap.set(c.stage, (stageMap.get(c.stage) ?? 0) + 1)
    if (c.lastContacted) contacted += 1
    if (c.stage === 'Discovery Call Done') discoveryDone += 1
    if (c.stage === 'Demo Scheduled') demosScheduled += 1
    if (c.stage === 'Demo Delivered') demosDelivered += 1
    if (c.stage === 'Commercial Proposal Shared') proposalsShared += 1
    if (c.stage === 'Closed Won') closedWon += 1
    if (c.stage === 'Closed Lost' || c.stage === 'Not Interested') closedLost += 1
    if (DISCOVERY_OR_LATER.has(c.stage)) reachedDiscovery += 1
    if (DEMO_OR_LATER.has(c.stage)) reachedDemo += 1
  }

  const orderedStages =
    stageOrder.length > 0
      ? [
          ...stageOrder.filter((s) => stageMap.has(s)),
          ...[...stageMap.keys()].filter((s) => !stageOrder.includes(s)),
        ]
      : [...stageMap.keys()].sort()

  const stageCounts = orderedStages.map((stage) => ({
    stage,
    count: stageMap.get(stage) ?? 0,
  }))

  const statusMap = new Map<string, number>()
  let contactTotal = 0
  let champions = 0
  for (const t of contacts) {
    if (!t.companyId || !companyIds.has(t.companyId)) continue
    contactTotal += 1
    if (t.champion) champions += 1
    statusMap.set(t.contactStatus, (statusMap.get(t.contactStatus) ?? 0) + 1)
  }

  const statusCounts = [...statusMap.entries()]
    .map(([status, count]) => ({ status, count }))
    .sort((a, b) => b.count - a.count)

  const total = companies.length
  return {
    total,
    contacted,
    discoveryDone,
    demosScheduled,
    demosDelivered,
    proposalsShared,
    closedWon,
    closedLost,
    stageCounts,
    conversion: {
      toDiscovery: pct(reachedDiscovery, total),
      toDemo: pct(reachedDemo, total),
      toWon: pct(closedWon, total),
    },
    contactTotal,
    champions,
    statusCounts,
  }
}

export function pipelineFiltersAreActive(filters: PipelineFilters): boolean {
  if (filters.dateRange === 'all') return false
  if (filters.dateRange === 'custom') {
    return !!(filters.customFrom?.trim() || filters.customTo?.trim())
  }
  return true
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
