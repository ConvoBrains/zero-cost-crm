import { api } from './api'

export interface ActivitySdr {
  id: string
  email: string
  name: string
  role: string
}

export interface CallMetrics {
  callsMade: number
  connected: number
  didntPick: number
  wrongPerson: number
  interested: number
  followUps: number
  demo: number
  notInterested: number
  converted: number
}

export interface SessionBlock {
  loginTime: string | null
  logoutTime: string | null
  activeMs: number
  idleMs: number
  activeDuration: string
  idleDuration: string
  sessionCount: number
  firstLogin: string | null
  lastActivity: string | null
  endReasons: string[]
}

export interface ActivityAlert {
  code: string
  severity: 'warning' | 'critical'
  message: string
  userId: string
  userName: string
}

export interface ActivityOverview {
  date: string
  from?: string
  to?: string
  userId: string
  targets: { calls: number; followUps: number; demos: number }
  session: SessionBlock | null
  metrics: CallMetrics
  productivity: {
    contactsWorked: number
    companiesWorked: number
    callsPerHour: number
    avgMinutesPerLead: number
  }
  progress: { calls: number; followUps: number; demos: number }
  alerts: ActivityAlert[]
  agents: Array<{
    userId: string
    name: string
    email: string
    role: string
    session: SessionBlock
    metrics: CallMetrics
    productivity: ActivityOverview['productivity']
    progress: ActivityOverview['progress']
    alerts: ActivityAlert[]
  }>
}

export interface TimelineEvent {
  id: string
  userId: string
  userName: string
  sessionId: string | null
  eventType: string
  entityType: string
  entityId: string | null
  summary: string
  payload: Record<string, unknown>
  createdAt: string
}

export function todayIstIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export async function fetchSdrs() {
  return api<{ sdrs: ActivitySdr[] }>('/api/activity/sdrs')
}

export async function fetchOverview(opts: {
  from: string
  to: string
  userId: string
  q?: string
}) {
  const q = new URLSearchParams({ from: opts.from, to: opts.to, userId: opts.userId })
  if (opts.q?.trim()) q.set('q', opts.q.trim())
  return api<ActivityOverview>(`/api/activity/overview?${q}`)
}

export async function fetchTimeline(opts: {
  from: string
  to: string
  userId: string
  q?: string
}) {
  const q = new URLSearchParams({ from: opts.from, to: opts.to, userId: opts.userId })
  if (opts.q?.trim()) q.set('q', opts.q.trim())
  return api<{ events: TimelineEvent[]; from: string; to: string }>(
    `/api/activity/timeline?${q}`,
  )
}

export function logViewEvent(
  eventType: 'contact.opened' | 'company.opened',
  entityId: string,
  name: string,
) {
  void api('/api/activity/events', {
    method: 'POST',
    body: JSON.stringify({ eventType, entityId, name }),
  }).catch(() => {})
}

export function eventTypeLabel(eventType: string): string {
  const map: Record<string, string> = {
    'session.login': 'Login',
    'session.logout': 'Logout',
    'session.idle': 'Idle logout',
    'company.created': 'Company created',
    'company.deleted': 'Company deleted',
    'company.stage_changed': 'Stage changed',
    'company.follow_up_set': 'Company follow-up',
    'company.note_added': 'Company note',
    'company.updated': 'Company updated',
    'company.opened': 'Opened company',
    'contact.created': 'Contact created',
    'contact.deleted': 'Contact deleted',
    'contact.status_changed': 'Status changed',
    'contact.follow_up_set': 'Contact follow-up',
    'contact.note_added': 'Contact note',
    'contact.updated': 'Contact updated',
    'contact.opened': 'Opened contact',
    'conversation.uploaded': 'Call uploaded',
    'conversation.deleted': 'Recording deleted',
    'leads.imported': 'Leads imported',
  }
  return map[eventType] ?? eventType
}
