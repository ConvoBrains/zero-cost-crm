import { useCallback, useEffect, useState } from 'react'
import {
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

export function SdrActivity() {
  const [sdrs, setSdrs] = useState<ActivitySdr[]>([])
  const [userId, setUserId] = useState('all')
  const [date, setDate] = useState(todayIstIso)
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
      const [ov, tl] = await Promise.all([fetchOverview(date, userId), fetchTimeline(date, userId)])
      setOverview(ov)
      setEvents(tl.events)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load activity')
      setOverview(null)
      setEvents([])
    } finally {
      setLoading(false)
    }
  }, [date, userId])

  useEffect(() => {
    void load()
  }, [load])

  const m = overview?.metrics
  const session = overview?.session
  const progress = overview?.progress
  const targets = overview?.targets
  const single = userId !== 'all'

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            SDR Activity
          </h1>
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
            Date
            <input
              type="date"
              className={inputClass}
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
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

          <DayActivityStrip
            dateIso={date}
            events={events}
            agents={
              userId === 'all'
                ? overview.agents.map((a) => ({ userId: a.userId, name: a.name }))
                : undefined
            }
          />

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
