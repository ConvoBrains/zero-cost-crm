import type { Express, Request, Response } from 'express'
import { requireAuth, requireAdmin } from './auth.js'
import { pool } from './db.js'
import {
  accumulateCallMetrics,
  buildAlerts,
  computeActiveIdleMs,
  emptyCallMetrics,
  formatDuration,
  istDayRange,
  logActivity,
  todayIstIso,
} from './activity.js'

/** Inclusive IST calendar range. Supports `from`/`to`, or legacy single `date`. */
function parseDateRange(req: Request): { from: string; to: string; start: Date; end: Date } {
  const fromRaw = String(req.query.from ?? '')
  const toRaw = String(req.query.to ?? '')
  const legacy = String(req.query.date ?? '')
  let from = /^\d{4}-\d{2}-\d{2}$/.test(fromRaw)
    ? fromRaw
    : /^\d{4}-\d{2}-\d{2}$/.test(legacy)
      ? legacy
      : todayIstIso()
  let to = /^\d{4}-\d{2}-\d{2}$/.test(toRaw) ? toRaw : from
  if (from > to) {
    const tmp = from
    from = to
    to = tmp
  }
  const start = istDayRange(from).start
  const end = istDayRange(to).end
  return { from, to, start, end }
}

function parseSearch(req: Request): string {
  return String(req.query.q ?? '').trim().slice(0, 200)
}

function parseUserFilter(req: Request): 'all' | string | null {
  const raw = String(req.query.userId ?? '')
  if (!raw) return null
  if (raw === 'all') return 'all'
  if (/^[0-9a-f-]{36}$/i.test(raw)) return raw
  return null
}

async function listSdrUsers() {
  const { rows } = await pool.query(
    `
    SELECT id, email, name, role
    FROM users
    WHERE role IN ('sdr', 'admin', 'founder')
    ORDER BY
      CASE role WHEN 'sdr' THEN 0 ELSE 1 END,
      name ASC
    `,
  )
  return rows.map((r) => ({
    id: String(r.id),
    email: String(r.email),
    name: String(r.name),
    role: String(r.role),
  }))
}

async function getTargets() {
  const { rows } = await pool.query(
    `SELECT calls_target, follow_ups_target, demos_target FROM sdr_daily_targets ORDER BY updated_at DESC LIMIT 1`,
  )
  const t = rows[0] ?? { calls_target: 80, follow_ups_target: 25, demos_target: 4 }
  return {
    calls: Number(t.calls_target),
    followUps: Number(t.follow_ups_target),
    demos: Number(t.demos_target),
  }
}

async function loadEvents(
  userIds: string[],
  start: Date,
  end: Date,
  search = '',
) {
  if (userIds.length === 0) return []
  const params: unknown[] = [userIds, start.toISOString(), end.toISOString()]
  let searchClause = ''
  if (search) {
    params.push(`%${search}%`)
    searchClause = `
      AND (
        ae.summary ILIKE $4
        OR ae.event_type ILIKE $4
        OR COALESCE(ae.payload->>'name', '') ILIKE $4
      )`
  }
  const { rows } = await pool.query(
    `
    SELECT ae.*, u.name AS user_name
    FROM activity_events ae
    JOIN users u ON u.id = ae.user_id
    WHERE ae.user_id = ANY($1::uuid[])
      AND ae.created_at >= $2 AND ae.created_at < $3
      ${searchClause}
    ORDER BY ae.created_at DESC
    `,
    params,
  )
  return rows
}

async function loadSessions(userIds: string[], start: Date, end: Date) {
  if (userIds.length === 0) return []
  const { rows } = await pool.query(
    `
    SELECT *
    FROM user_sessions
    WHERE user_id = ANY($1::uuid[])
      AND started_at < $3
      AND (ended_at IS NULL OR ended_at >= $2)
    ORDER BY started_at ASC
    `,
    [userIds, start.toISOString(), end.toISOString()],
  )
  return rows
}

function metricsForEvents(events: Array<Record<string, unknown>>) {
  const metrics = emptyCallMetrics()
  let opens = 0
  let statusChanges = 0
  const connectedContactIds = new Set<string>()
  const followUpContactIds = new Set<string>()

  for (const e of events) {
    const type = String(e.event_type)
    const payload = (e.payload ?? {}) as Record<string, unknown>
    accumulateCallMetrics(metrics, type, payload)
    if (type === 'contact.opened' || type === 'company.opened') opens += 1
    if (type === 'contact.status_changed') {
      statusChanges += 1
      const to = String(payload.to ?? '')
      if (
        to.startsWith('Connected') ||
        to === 'Interested' ||
        to === 'Called'
      ) {
        if (e.entity_id) connectedContactIds.add(String(e.entity_id))
      }
    }
    if (type === 'contact.follow_up_set' && e.entity_id) {
      followUpContactIds.add(String(e.entity_id))
    }
  }

  let connectedWithoutFollowUp = 0
  for (const id of connectedContactIds) {
    if (!followUpContactIds.has(id)) connectedWithoutFollowUp += 1
  }

  const contactIds = new Set<string>()
  const companyIds = new Set<string>()
  for (const e of events) {
    if (e.entity_type === 'contact' && e.entity_id) contactIds.add(String(e.entity_id))
    if (e.entity_type === 'company' && e.entity_id) companyIds.add(String(e.entity_id))
  }

  return {
    metrics,
    opens,
    statusChanges,
    connectedWithoutFollowUp,
    contactsWorked: contactIds.size,
    companiesWorked: companyIds.size,
  }
}

function sessionSummary(
  sessions: Array<Record<string, unknown>>,
  events: Array<Record<string, unknown>>,
  dayStart: Date,
  dayEnd: Date,
) {
  const points: Date[] = []
  for (const s of sessions) {
    points.push(new Date(String(s.started_at)))
    points.push(new Date(String(s.last_active_at)))
    if (s.ended_at) points.push(new Date(String(s.ended_at)))
  }
  for (const e of events) {
    points.push(new Date(String(e.created_at)))
  }
  const openSession = sessions.some((s) => !s.ended_at)
  const { activeMs, idleMs } = computeActiveIdleMs(points, dayStart, dayEnd, new Date(), {
    openSession,
  })
  const firstLogin = sessions[0] ? new Date(String(sessions[0].started_at)) : null
  const lastActivityDates = [
    ...sessions.map((s) => new Date(String(s.last_active_at))),
    ...events.map((e) => new Date(String(e.created_at))),
  ].sort((a, b) => b.getTime() - a.getTime())
  const lastActivity = lastActivityDates[0] ?? null
  const lastSession = sessions[sessions.length - 1]
  const logoutTime = lastSession?.ended_at ? new Date(String(lastSession.ended_at)) : null
  const endReasons = sessions
    .map((s) => s.end_reason)
    .filter(Boolean)
    .map(String)

  return {
    loginTime: firstLogin?.toISOString() ?? null,
    logoutTime: logoutTime?.toISOString() ?? null,
    activeMs,
    idleMs,
    activeDuration: formatDuration(activeMs),
    idleDuration: formatDuration(idleMs),
    sessionCount: sessions.length,
    firstLogin: firstLogin?.toISOString() ?? null,
    lastActivity: lastActivity?.toISOString() ?? null,
    endReasons,
    loggedOutIncomplete: Boolean(lastSession?.ended_at),
  }
}

export function registerActivityRoutes(app: Express) {
  app.get('/api/activity/sdrs', requireAuth, requireAdmin, async (_req, res) => {
    res.json({ sdrs: await listSdrUsers() })
  })

  app.get('/api/activity/targets', requireAuth, requireAdmin, async (_req, res) => {
    res.json({ targets: await getTargets() })
  })

  app.patch('/api/activity/targets', requireAuth, requireAdmin, async (req, res) => {
    const calls = Number(req.body.calls ?? req.body.callsTarget)
    const followUps = Number(req.body.followUps ?? req.body.followUpsTarget)
    const demos = Number(req.body.demos ?? req.body.demosTarget)
    if (![calls, followUps, demos].every((n) => Number.isFinite(n) && n >= 0)) {
      res.status(400).json({ error: 'Invalid targets' })
      return
    }
    const { rows } = await pool.query(`SELECT id FROM sdr_daily_targets ORDER BY updated_at DESC LIMIT 1`)
    if (rows[0]) {
      await pool.query(
        `
        UPDATE sdr_daily_targets
        SET calls_target = $1, follow_ups_target = $2, demos_target = $3, updated_at = now()
        WHERE id = $4
        `,
        [calls, followUps, demos, rows[0].id],
      )
    } else {
      await pool.query(
        `INSERT INTO sdr_daily_targets (calls_target, follow_ups_target, demos_target) VALUES ($1, $2, $3)`,
        [calls, followUps, demos],
      )
    }
    res.json({ targets: await getTargets() })
  })

  app.post('/api/activity/events', requireAuth, async (req, res) => {
    const eventType = String(req.body.eventType ?? '')
    const allowed = new Set(['contact.opened', 'company.opened'])
    if (!allowed.has(eventType)) {
      res.status(400).json({ error: 'Unsupported client event type' })
      return
    }
    const entityType = eventType.startsWith('contact') ? 'contact' : 'company'
    const entityId = String(req.body.entityId ?? '')
    if (!entityId) {
      res.status(400).json({ error: 'entityId required' })
      return
    }
    const name = String(req.body.name ?? 'record')
    await logActivity({
      userId: req.user!.sub,
      sessionId: req.user!.sid ?? null,
      eventType,
      entityType,
      entityId,
      summary: eventType === 'contact.opened' ? `Opened ${name}` : `Opened ${name}`,
      payload: { name },
    })
    res.status(204).end()
  })

  app.get('/api/activity/overview', requireAuth, requireAdmin, async (req, res) => {
    const userFilter = parseUserFilter(req)
    if (!userFilter) {
      res.status(400).json({ error: 'userId query required (uuid or all)' })
      return
    }
    const { from, to, start, end } = parseDateRange(req)
    const search = parseSearch(req)
    const targets = await getTargets()
    const allUsers = await listSdrUsers()
    const selected =
      userFilter === 'all' ? allUsers.filter((u) => u.role === 'sdr') : allUsers.filter((u) => u.id === userFilter)

    if (userFilter !== 'all' && selected.length === 0) {
      res.status(404).json({ error: 'User not found' })
      return
    }

    const userIds = selected.map((u) => u.id)
    const events = await loadEvents(userIds, start, end, search)
    const sessions = await loadSessions(userIds, start, end)
    const alertDate = from === to ? from : to

    const agents = []
    const allAlerts = []

    for (const user of selected) {
      const uEvents = events.filter((e) => String(e.user_id) === user.id)
      const uSessions = sessions.filter((s) => String(s.user_id) === user.id)
      const session = sessionSummary(uSessions, uEvents, start, end)
      const stats = metricsForEvents(uEvents)
      const hoursActive = session.activeMs / 3_600_000
      const callsPerHour = hoursActive > 0 ? Math.round((stats.metrics.callsMade / hoursActive) * 10) / 10 : 0
      const alerts =
        from === to
          ? buildAlerts({
              userId: user.id,
              userName: user.name,
              dateIso: alertDate,
              firstLogin: session.firstLogin ? new Date(session.firstLogin) : null,
              lastActivity: session.lastActivity ? new Date(session.lastActivity) : null,
              metrics: stats.metrics,
              opens: stats.opens,
              statusChanges: stats.statusChanges,
              connectedWithoutFollowUp: stats.connectedWithoutFollowUp,
              targets,
              loggedOutIncomplete: session.loggedOutIncomplete,
            })
          : []
      allAlerts.push(...alerts)
      agents.push({
        userId: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        session,
        metrics: stats.metrics,
        productivity: {
          contactsWorked: stats.contactsWorked,
          companiesWorked: stats.companiesWorked,
          callsPerHour,
          avgMinutesPerLead:
            stats.contactsWorked > 0
              ? Math.round(session.activeMs / stats.contactsWorked / 60_000)
              : 0,
        },
        targets,
        progress: {
          calls: stats.metrics.callsMade,
          followUps: stats.metrics.followUps,
          demos: stats.metrics.demo,
        },
        alerts,
      })
    }

    const teamMetrics = emptyCallMetrics()
    let teamActiveMs = 0
    let teamIdleMs = 0
    let teamSessions = 0
    let contactsWorked = 0
    let companiesWorked = 0
    for (const a of agents) {
      for (const k of Object.keys(teamMetrics) as (keyof typeof teamMetrics)[]) {
        teamMetrics[k] += a.metrics[k]
      }
      teamActiveMs += a.session.activeMs
      teamIdleMs += a.session.idleMs
      teamSessions += a.session.sessionCount
      contactsWorked += a.productivity.contactsWorked
      companiesWorked += a.productivity.companiesWorked
    }

    res.json({
      date: from,
      from,
      to,
      userId: userFilter,
      targets,
      session:
        userFilter === 'all'
          ? {
              loginTime: null,
              logoutTime: null,
              activeMs: teamActiveMs,
              idleMs: teamIdleMs,
              activeDuration: formatDuration(teamActiveMs),
              idleDuration: formatDuration(teamIdleMs),
              sessionCount: teamSessions,
              firstLogin: null,
              lastActivity: null,
              endReasons: [],
            }
          : agents[0]?.session ?? null,
      metrics: userFilter === 'all' ? teamMetrics : agents[0]?.metrics ?? emptyCallMetrics(),
      productivity:
        userFilter === 'all'
          ? {
              contactsWorked,
              companiesWorked,
              callsPerHour:
                teamActiveMs > 0
                  ? Math.round((teamMetrics.callsMade / (teamActiveMs / 3_600_000)) * 10) / 10
                  : 0,
              avgMinutesPerLead:
                contactsWorked > 0 ? Math.round(teamActiveMs / contactsWorked / 60_000) : 0,
            }
          : agents[0]?.productivity,
      progress:
        userFilter === 'all'
          ? {
              calls: teamMetrics.callsMade,
              followUps: teamMetrics.followUps,
              demos: teamMetrics.demo,
            }
          : agents[0]?.progress,
      alerts: allAlerts,
      agents,
    })
  })

  app.get('/api/activity/timeline', requireAuth, requireAdmin, async (req, res) => {
    const userFilter = parseUserFilter(req)
    if (!userFilter) {
      res.status(400).json({ error: 'userId query required (uuid or all)' })
      return
    }
    const { from, to, start, end } = parseDateRange(req)
    const search = parseSearch(req)
    const allUsers = await listSdrUsers()
    const selected =
      userFilter === 'all' ? allUsers.filter((u) => u.role === 'sdr') : allUsers.filter((u) => u.id === userFilter)
    const userIds = selected.map((u) => u.id)
    const events = await loadEvents(userIds, start, end, search)
    res.json({
      date: from,
      from,
      to,
      userId: userFilter,
      events: events.map((e) => ({
        id: String(e.id),
        userId: String(e.user_id),
        userName: String(e.user_name),
        sessionId: e.session_id ? String(e.session_id) : null,
        eventType: String(e.event_type),
        entityType: String(e.entity_type),
        entityId: e.entity_id ? String(e.entity_id) : null,
        summary: String(e.summary),
        payload: e.payload ?? {},
        createdAt: new Date(String(e.created_at)).toISOString(),
      })),
    })
  })

  app.get(
    '/api/activity/lead/:entityType/:id',
    requireAuth,
    requireAdmin,
    async (req: Request, res: Response) => {
      const entityType = String(req.params.entityType)
      if (entityType !== 'contact' && entityType !== 'company') {
        res.status(400).json({ error: 'entityType must be contact or company' })
        return
      }
      const id = String(req.params.id)
      const { rows } = await pool.query(
        `
        SELECT ae.*, u.name AS user_name
        FROM activity_events ae
        JOIN users u ON u.id = ae.user_id
        WHERE ae.entity_type = $1 AND ae.entity_id = $2
        ORDER BY ae.created_at ASC
        LIMIT 500
        `,
        [entityType, id],
      )
      res.json({
        entityType,
        entityId: id,
        events: rows.map((e) => ({
          id: String(e.id),
          userId: String(e.user_id),
          userName: String(e.user_name),
          eventType: String(e.event_type),
          summary: String(e.summary),
          payload: e.payload ?? {},
          createdAt: new Date(String(e.created_at)).toISOString(),
        })),
      })
    },
  )
}
