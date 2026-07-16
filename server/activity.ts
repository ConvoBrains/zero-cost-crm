import { pool } from './db.js'

export const IDLE_MS = 45 * 60 * 1000
export const ACTIVITY_TZ = 'Asia/Kolkata'

export type ActivityEntityType =
  | 'contact'
  | 'company'
  | 'conversation'
  | 'session'
  | 'system'

export interface LogActivityInput {
  userId: string
  sessionId?: string | null
  eventType: string
  entityType: ActivityEntityType
  entityId?: string | null
  summary: string
  payload?: Record<string, unknown>
  at?: Date
}

const CALL_OUTCOME_STATUSES = new Set([
  "Didn't Pick",
  'No Answer',
  'Connected - Got Referral',
  'Connected - Not Right Person',
  'Connected - Future Follow-up',
  'Interested',
  'Called',
  'Follow-up Required',
  'Rejected',
])

const CONNECTED_STATUSES = new Set([
  'Connected - Got Referral',
  'Connected - Not Right Person',
  'Connected - Future Follow-up',
  'Interested',
  'Called',
])

export function isCallOutcomeStatus(status: string): boolean {
  return CALL_OUTCOME_STATUSES.has(status)
}

export function isConnectedStatus(status: string): boolean {
  return CONNECTED_STATUSES.has(status)
}

export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await pool.query(
      `
      INSERT INTO activity_events (
        user_id, session_id, event_type, entity_type, entity_id, summary, payload, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, COALESCE($8::timestamptz, now()))
      `,
      [
        input.userId,
        input.sessionId ?? null,
        input.eventType,
        input.entityType,
        input.entityId ?? null,
        input.summary,
        JSON.stringify(input.payload ?? {}),
        input.at?.toISOString() ?? null,
      ],
    )
  } catch (e) {
    console.error('[activity] log failed', e)
  }
}

export async function closeOpenSessions(
  userId: string,
  reason: 'manual' | 'idle' | 'expired',
): Promise<void> {
  await pool.query(
    `
    UPDATE user_sessions
    SET ended_at = now(), end_reason = $2, last_active_at = now()
    WHERE user_id = $1 AND ended_at IS NULL
    `,
    [userId, reason],
  )
}

export async function createSession(userId: string): Promise<string> {
  await closeOpenSessions(userId, 'expired')
  const { rows } = await pool.query(
    `
    INSERT INTO user_sessions (user_id, started_at, last_active_at)
    VALUES ($1, now(), now())
    RETURNING id
    `,
    [userId],
  )
  return String(rows[0].id)
}

export async function getOpenSession(sessionId: string | undefined, userId: string) {
  if (!sessionId) return null
  const { rows } = await pool.query(
    `
    SELECT * FROM user_sessions
    WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
    `,
    [sessionId, userId],
  )
  return rows[0] ?? null
}

export async function touchSession(sessionId: string): Promise<void> {
  await pool.query(
    `UPDATE user_sessions SET last_active_at = now() WHERE id = $1 AND ended_at IS NULL`,
    [sessionId],
  )
}

export async function endSession(
  sessionId: string,
  userId: string,
  reason: 'manual' | 'idle' | 'expired',
): Promise<boolean> {
  const { rowCount } = await pool.query(
    `
    UPDATE user_sessions
    SET ended_at = now(), end_reason = $3, last_active_at = now()
    WHERE id = $1 AND user_id = $2 AND ended_at IS NULL
    `,
    [sessionId, userId, reason],
  )
  return (rowCount ?? 0) > 0
}

/** IST calendar day bounds as UTC Date objects. */
export function istDayRange(dateIso: string): { start: Date; end: Date } {
  // dateIso = YYYY-MM-DD in Asia/Kolkata
  const start = new Date(`${dateIso}T00:00:00+05:30`)
  const end = new Date(start.getTime() + 24 * 60 * 60_000)
  return { start, end }
}

export function todayIstIso(): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: ACTIVITY_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export function formatDuration(ms: number): string {
  if (ms < 0) ms = 0
  const totalMin = Math.floor(ms / 60_000)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  if (h <= 0) return `${m}m`
  return `${h}h ${m}m`
}

/**
 * Active = sum of gaps < IDLE_MS between activity timestamps (and session spans).
 * Idle = gaps >= IDLE_MS within the day window, plus explicit idle stretches.
 */
export function computeActiveIdleMs(
  points: Date[],
  dayStart: Date,
  dayEnd: Date,
  now = new Date(),
  opts?: { openSession?: boolean },
): { activeMs: number; idleMs: number } {
  // Past days: use full day. Today: only up to now (no future minutes).
  const isToday = now >= dayStart && now < dayEnd
  const endCap = isToday ? now : dayEnd
  const sorted = [...points]
    .map((d) => d.getTime())
    .filter((t) => t >= dayStart.getTime() && t <= endCap.getTime())
    .sort((a, b) => a - b)

  if (sorted.length === 0) return { activeMs: 0, idleMs: 0 }

  let activeMs = 0
  let idleMs = 0
  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i] - sorted[i - 1]
    if (gap >= IDLE_MS) idleMs += gap
    else activeMs += gap
  }
  // Only extend past the last event while a session is still open today.
  if (opts?.openSession && isToday) {
    const trailing = endCap.getTime() - sorted[sorted.length - 1]
    if (trailing > 0 && trailing < IDLE_MS) activeMs += trailing
    else if (trailing >= IDLE_MS) idleMs += trailing
  }

  return { activeMs, idleMs }
}

export function emptyCallMetrics() {
  return {
    callsMade: 0,
    connected: 0,
    didntPick: 0,
    wrongPerson: 0,
    interested: 0,
    followUps: 0,
    demo: 0,
    notInterested: 0,
    converted: 0,
  }
}

export function accumulateCallMetrics(
  metrics: ReturnType<typeof emptyCallMetrics>,
  eventType: string,
  payload: Record<string, unknown>,
) {
  if (eventType === 'contact.status_changed') {
    const to = String(payload.to ?? '')
    if (isCallOutcomeStatus(to)) metrics.callsMade += 1
    if (to === "Didn't Pick" || to === 'No Answer') metrics.didntPick += 1
    if (isConnectedStatus(to)) metrics.connected += 1
    if (to === 'Connected - Not Right Person') metrics.wrongPerson += 1
    if (to === 'Interested') metrics.interested += 1
    if (to === 'Follow-up Required' || to === 'Connected - Future Follow-up') {
      metrics.followUps += 1
    }
    if (to === 'Rejected') metrics.notInterested += 1
  }
  if (eventType === 'contact.follow_up_set') metrics.followUps += 1
  if (eventType === 'company.stage_changed') {
    const to = String(payload.to ?? '')
    if (to === 'Demo Scheduled') metrics.demo += 1
    if (to === 'Closed Won') metrics.converted += 1
    if (to === 'Not Interested') metrics.notInterested += 1
  }
  if (eventType === 'conversation.uploaded') metrics.callsMade += 1
}

export function buildAlerts(input: {
  userId: string
  userName: string
  dateIso: string
  firstLogin: Date | null
  lastActivity: Date | null
  metrics: ReturnType<typeof emptyCallMetrics>
  opens: number
  statusChanges: number
  connectedWithoutFollowUp: number
  targets: { calls: number; followUps: number; demos: number }
  loggedOutIncomplete: boolean
  now?: Date
}): Array<{ code: string; severity: 'warning' | 'critical'; message: string; userId: string; userName: string }> {
  const now = input.now ?? new Date()
  const alerts: ReturnType<typeof buildAlerts> = []
  const deadline = new Date(`${input.dateIso}T10:30:00+05:30`)
  const isToday = input.dateIso === todayIstIso()

  if (isToday && now > deadline && !input.firstLogin) {
    alerts.push({
      code: 'no_login',
      severity: 'critical',
      message: 'No login by 10:30 AM',
      userId: input.userId,
      userName: input.userName,
    })
  }

  if (input.firstLogin && input.lastActivity) {
    const quiet = now.getTime() - input.lastActivity.getTime()
    if (isToday && quiet >= 60 * 60_000) {
      alerts.push({
        code: 'inactive_60m',
        severity: 'warning',
        message: 'Logged in but no CRM activity for 60+ minutes',
        userId: input.userId,
        userName: input.userName,
      })
    }
  }

  if (input.metrics.callsMade >= 30 && input.metrics.connected === 0) {
    alerts.push({
      code: 'zero_connects',
      severity: 'critical',
      message: `${input.metrics.callsMade} calls with zero connections`,
      userId: input.userId,
      userName: input.userName,
    })
  }

  if (input.connectedWithoutFollowUp > 0) {
    alerts.push({
      code: 'missing_followups',
      severity: 'warning',
      message: `${input.connectedWithoutFollowUp} connected call(s) without follow-up`,
      userId: input.userId,
      userName: input.userName,
    })
  }

  if (input.loggedOutIncomplete) {
    const incomplete =
      input.metrics.callsMade < input.targets.calls ||
      input.metrics.followUps < input.targets.followUps ||
      input.metrics.demo < input.targets.demos
    if (incomplete) {
      alerts.push({
        code: 'targets_incomplete',
        severity: 'warning',
        message: 'Logged out before daily targets completed',
        userId: input.userId,
        userName: input.userName,
      })
    }
  }

  if (input.opens >= 15 && input.statusChanges === 0) {
    alerts.push({
      code: 'opens_no_status',
      severity: 'warning',
      message: `${input.opens} contacts/companies opened with no status updates`,
      userId: input.userId,
      userName: input.userName,
    })
  }

  return alerts
}
