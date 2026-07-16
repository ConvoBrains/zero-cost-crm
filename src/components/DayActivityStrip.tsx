import { useMemo, useState } from 'react'
import type { TimelineEvent } from '../lib/activity'

const SLOT_MIN = 15
const SLOTS = (24 * 60) / SLOT_MIN // 96
const DAY_MS = 24 * 60 * 60_000

function dayStartMs(dateIso: string) {
  return new Date(`${dateIso}T00:00:00+05:30`).getTime()
}

function slotLabel(dateIso: string, index: number) {
  const t = dayStartMs(dateIso) + index * SLOT_MIN * 60_000
  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(new Date(t))
}

function slotColor(count: number): string {
  if (count <= 0) return 'bg-stone-100'
  if (count === 1) return 'bg-teal-200'
  if (count <= 3) return 'bg-teal-400'
  if (count <= 6) return 'bg-teal-600'
  return 'bg-teal-800'
}

interface SlotInfo {
  index: number
  count: number
  events: TimelineEvent[]
}

function buildSlots(events: TimelineEvent[], dateIso: string): SlotInfo[] {
  const start = dayStartMs(dateIso)
  const buckets: TimelineEvent[][] = Array.from({ length: SLOTS }, () => [])
  for (const e of events) {
    const t = new Date(e.createdAt).getTime()
    const idx = Math.floor((t - start) / (SLOT_MIN * 60_000))
    if (idx >= 0 && idx < SLOTS) buckets[idx].push(e)
  }
  return buckets.map((evs, index) => ({ index, count: evs.length, events: evs }))
}

function nowSlotIndex(dateIso: string): number | null {
  const now = Date.now()
  const start = dayStartMs(dateIso)
  if (now < start || now >= start + DAY_MS) return null
  return Math.floor((now - start) / (SLOT_MIN * 60_000))
}

const HOUR_TICKS = [0, 6, 9, 12, 15, 18, 21, 24]

interface DayActivityStripProps {
  dateIso: string
  events: TimelineEvent[]
  /** When set, one row per agent */
  agents?: Array<{ userId: string; name: string }>
}

export function DayActivityStrip({ dateIso, events, agents }: DayActivityStripProps) {
  const [hover, setHover] = useState<{
    label: string
    userName?: string
    count: number
    samples: string[]
  } | null>(null)

  const rows = useMemo(() => {
    if (agents && agents.length > 0) {
      return agents.map((a) => ({
        key: a.userId,
        name: a.name,
        slots: buildSlots(
          events.filter((e) => e.userId === a.userId),
          dateIso,
        ),
      }))
    }
    return [{ key: 'all', name: null as string | null, slots: buildSlots(events, dateIso) }]
  }, [agents, dateIso, events])

  const nowIdx = nowSlotIndex(dateIso)
  const totalActiveSlots = rows.reduce(
    (n, r) => n + r.slots.filter((s) => s.count > 0).length,
    0,
  )

  return (
    <div className="space-y-3 rounded-none border border-[var(--color-line)] bg-white p-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-stone-800">Day movement</h2>
          <p className="text-xs text-stone-500">
            Full IST day · darker = more CRM activity · empty = quiet
          </p>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-stone-500">
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-none bg-stone-100 ring-1 ring-stone-200" /> Quiet
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-none bg-teal-200" /> Light
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="h-2.5 w-4 rounded-none bg-teal-600" /> Busy
          </span>
          <span>
            {totalActiveSlots} active / {SLOTS} slots
          </span>
        </div>
      </div>

      {/* Hour axis */}
      <div className={agents?.length ? 'ml-16' : ''}>
        <div className="mb-1 flex justify-between text-[10px] text-stone-400">
          {HOUR_TICKS.map((h) => {
            const label =
              h === 0 || h === 24 ? '12am' : h === 12 ? '12pm' : h < 12 ? `${h}am` : `${h - 12}pm`
            return (
              <span key={h} className="w-0 -translate-x-1/2 first:translate-x-0 last:translate-x-full">
                {label}
              </span>
            )
          })}
        </div>
      </div>

      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row.key} className="flex items-center gap-2">
            {row.name ? (
              <span className="w-14 shrink-0 truncate text-xs font-medium text-stone-600">
                {row.name}
              </span>
            ) : null}
            <div className="relative flex h-8 min-w-0 flex-1 overflow-hidden rounded-none ring-1 ring-stone-200">
              {row.slots.map((slot) => (
                <button
                  key={slot.index}
                  type="button"
                  title={`${slotLabel(dateIso, slot.index)} · ${slot.count} events`}
                  className={`h-full flex-1 border-r border-white/40 last:border-r-0 ${slotColor(slot.count)} transition hover:brightness-95`}
                  onMouseEnter={() =>
                    setHover({
                      label: `${slotLabel(dateIso, slot.index)} – ${slotLabel(dateIso, Math.min(slot.index + 1, SLOTS - 1))}`,
                      userName: row.name ?? undefined,
                      count: slot.count,
                      samples: slot.events.slice(0, 4).map((e) => e.summary),
                    })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              ))}
              {nowIdx != null ? (
                <div
                  className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-rose-500"
                  style={{ left: `${(nowIdx / SLOTS) * 100}%` }}
                  title="Now"
                />
              ) : null}
            </div>
          </div>
        ))}
      </div>

      {hover ? (
        <div className="rounded-none bg-stone-50 px-3 py-2 text-xs text-stone-600">
          <p className="font-medium text-stone-800">
            {hover.userName ? `${hover.userName} · ` : null}
            {hover.label}
            <span className="ml-2 font-normal text-stone-500">
              {hover.count === 0 ? 'quiet' : `${hover.count} event${hover.count === 1 ? '' : 's'}`}
            </span>
          </p>
          {hover.samples.length > 0 ? (
            <ul className="mt-1 space-y-0.5">
              {hover.samples.map((s, i) => (
                <li key={i}>· {s}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p className="text-xs text-stone-400">Hover a segment to see what happened in that window.</p>
      )}
    </div>
  )
}
