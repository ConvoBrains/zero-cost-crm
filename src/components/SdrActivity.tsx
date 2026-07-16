import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  eventTypeLabel,
  fetchOverview,
  fetchSdrs,
  fetchTimeline,
  todayIstIso,
  type ActivityOverview,
  type ActivitySdr,
  type TimelineEvent,
} from '../lib/activity'
import { DayActivityStrip } from './DayActivityStrip'
import { btnGhost, inputClass } from './ui'

function fmtTime(iso: string | null) {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(iso))
}

function fmtDay(iso: string) {
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(iso))
}

function dayKeyIst(iso: string) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso))
}

function ProgressBar({ value, max, label }: { value: number; max: number; label: string }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div>
      <div className="mb-1 flex justify-between text-sm">
        <span className="font-medium text-stone-700">{label}</span>
        <span className="text-stone-500">
          {value} / {max}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-stone-100">
        <div className="h-full rounded-full bg-teal-700 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-xl border border-[var(--color-line)] bg-white px-3 py-3">
      <p className="text-[11px] font-semibold tracking-wide text-stone-500 uppercase">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl text-stone-900">{value}</p>
    </div>
  )
}

function ActivityFeed({ events, multiDay }: { events: TimelineEvent[]; multiDay: boolean }) {
  const groups = useMemo(() => {
    if (!multiDay) return [{ key: 'all', label: null as string | null, events }]
    const map = new Map<string, TimelineEvent[]>()
    for (const e of events) {
      const key = dayKeyIst(e.createdAt)
      const list = map.get(key) ?? []
      list.push(e)
      map.set(key, list)
    }
    return [...map.entries()].map(([key, evs]) => ({
      key,
      label: fmtDay(`${key}T12:00:00+05:30`),
      events: evs,
    }))
  }, [events, multiDay])

  if (events.length === 0) {
    return (
      <p className="rounded-lg border border-dashed border-[var(--color-line)] bg-stone-50 px-4 py-8 text-center text-sm text-stone-500">
        No activity logged for this user / date range.
      </p>
    )
  }

  return (
    <div className="space-y-4">
      {groups.map((g) => (
        <div key={g.key}>
          {g.label ? (
            <h3 className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
              {g.label}
            </h3>
          ) : null}
          <ul className="divide-y divide-[var(--color-line)] overflow-hidden rounded-xl border border-[var(--color-line)] bg-white">
            {g.events.map((e) => (
              <li key={e.id} className="flex flex-wrap items-start gap-3 px-3 py-2.5 sm:px-4">
                <time className="w-20 shrink-0 text-xs font-medium text-stone-500 tabular-nums">
                  {fmtTime(e.createdAt)}
                </time>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-md bg-teal-50 px-1.5 py-0.5 text-[11px] font-medium text-teal-800">
                      {eventTypeLabel(e.eventType)}
                    </span>
                    <span className="text-xs text-stone-500">{e.userName}</span>
                  </div>
                  <p className="mt-0.5 text-sm text-stone-800">{e.summary || e.eventType}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

export function SdrActivity() {
  const [sdrs, setSdrs] = useState<ActivitySdr[]>([])
  const [userId, setUserId] = useState('all')
  const today = todayIstIso()
  const [from, setFrom] = useState(today)
  const [to, setTo] = useState(today)
  const [search, setSearch] = useState('')
  const [searchApplied, setSearchApplied] = useState('')
  const [overview, setOverview] = useState<ActivityOverview | null>(null)
  const [events, setEvents] = useState<TimelineEvent[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    void fetchSdrs()
      .then(({ sdrs: list }) => setSdrs(list.filter((s) => s.role === 'sdr')))
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load agents'))
  }, [])

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const opts = { from, to, userId, q: searchApplied }
      const [ov, tl] = await Promise.all([fetchOverview(opts), fetchTimeline(opts)])
      setOverview(ov)
      setEvents(tl.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity')
      setOverview(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [from, to, userId, searchApplied])

  useEffect(() => {
    void load()
  }, [load])

  const m = overview?.metrics
  const session = overview?.session
  const progress = overview?.progress
  const targets = overview?.targets
  const single = userId !== 'all'
  const singleDay = from === to
  const stripEvents = useMemo(
    () => (singleDay ? [...events].reverse() : []),
    [events, singleDay],
  )

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            SDR Activity
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Every CRM action by agents — filter by user, date range, and search.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            Agent
            <select
              className={inputClass}
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            >
              <option value="all">All SDRs</option>
              {sdrs.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            From
            <input
              type="date"
              className={inputClass}
              value={from}
              onChange={(e) => {
                const v = e.target.value
                setFrom(v)
                if (v > to) setTo(v)
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-stone-500">
            To
            <input
              type="date"
              className={inputClass}
              value={to}
              onChange={(e) => {
                const v = e.target.value
                setTo(v)
                if (v < from) setFrom(v)
              }}
            />
          </label>
          <label className="flex min-w-[10rem] flex-col gap-1 text-xs text-stone-500">
            Search
            <input
              type="search"
              className={inputClass}
              placeholder="Status, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') setSearchApplied(search.trim())
              }}
            />
          </label>
          <button
            type="button"
            className={btnGhost}
            onClick={() => setSearchApplied(search.trim())}
            disabled={loading}
          >
            Search
          </button>
          <button type="button" className={btnGhost} onClick={() => void load()} disabled={loading}>
            Refresh
          </button>
        </div>
      </header>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
      ) : null}
      {loading && !overview ? (
        <p className="text-sm text-stone-500">Loading…</p>
      ) : null}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-stone-800">Activity feed</h2>
          <span className="text-xs text-stone-500">
            {events.length} event{events.length === 1 ? '' : 's'}
            {loading ? ' · refreshing…' : ''}
          </span>
        </div>
        <ActivityFeed events={events} multiDay={!singleDay} />
      </section>

      {overview && m && session && progress && targets ? (
        <>
          {overview.alerts.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-stone-800">Alerts</h2>
              <ul className="space-y-1.5">
                {overview.alerts.map((a, i) => (
                  <li
                    key={`${a.code}-${a.userId}-${i}`}
                    className={`rounded-lg px-3 py-2 text-sm ${
                      a.severity === 'critical'
                        ? 'bg-rose-50 text-rose-800'
                        : 'bg-amber-50 text-amber-900'
                    }`}
                  >
                    <span className="font-medium">{a.userName}:</span> {a.message}
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Session</h2>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {single ? (
                <>
                  <Metric label="Login" value={fmtTime(session.loginTime)} />
                  <Metric label="Logout" value={fmtTime(session.logoutTime)} />
                </>
              ) : null}
              <Metric label="Active" value={session.activeDuration} />
              <Metric label="Idle" value={session.idleDuration} />
              <Metric label="Sessions" value={session.sessionCount} />
            </div>
          </section>

          {singleDay ? (
            <DayActivityStrip
              dateIso={from}
              events={stripEvents}
              agents={
                userId === 'all'
                  ? overview.agents.map((a) => ({ userId: a.userId, name: a.name }))
                  : undefined
              }
            />
          ) : null}

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Calls</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
              <Metric label="Made" value={m.callsMade} />
              <Metric label="Connected" value={m.connected} />
              <Metric label="Didn't pick" value={m.didntPick} />
              <Metric label="Interested" value={m.interested} />
              <Metric label="Follow-ups" value={m.followUps} />
              <Metric label="Demo" value={m.demo} />
            </div>
          </section>

          <section className="space-y-3">
            <h2 className="text-sm font-semibold text-stone-800">Targets</h2>
            <div className="space-y-3 rounded-xl border border-[var(--color-line)] bg-white p-4">
              <ProgressBar label="Calls" value={progress.calls} max={targets.calls} />
              <ProgressBar label="Follow-ups" value={progress.followUps} max={targets.followUps} />
              <ProgressBar label="Demos" value={progress.demos} max={targets.demos} />
            </div>
          </section>

          {userId === 'all' && overview.agents.length > 0 ? (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-stone-800">By agent</h2>
              <div className="overflow-x-auto rounded-xl border border-[var(--color-line)]">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-stone-50 text-xs text-stone-500 uppercase">
                    <tr>
                      <th className="px-3 py-2 font-semibold">SDR</th>
                      <th className="px-3 py-2 font-semibold">Calls</th>
                      <th className="px-3 py-2 font-semibold">Connected</th>
                      <th className="px-3 py-2 font-semibold">Interested</th>
                      <th className="px-3 py-2 font-semibold">Demo</th>
                      <th className="px-3 py-2 font-semibold">Active</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overview.agents.map((a) => (
                      <tr
                        key={a.userId}
                        className="cursor-pointer border-t border-[var(--color-line)] hover:bg-stone-50"
                        onClick={() => setUserId(a.userId)}
                      >
                        <td className="px-3 py-2 font-medium text-teal-800">{a.name}</td>
                        <td className="px-3 py-2">{a.metrics.callsMade}</td>
                        <td className="px-3 py-2">{a.metrics.connected}</td>
                        <td className="px-3 py-2">{a.metrics.interested}</td>
                        <td className="px-3 py-2">{a.metrics.demo}</td>
                        <td className="px-3 py-2">{a.session.activeDuration}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
