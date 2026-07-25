/** Pure activity field helpers — no DB imports (safe for unit tests). */

export interface FieldChange {
  field: string
  label: string
  from: string | null
  to: string | null
}

/** Normalize DB/API values for equality + display in activity payloads. */
export function normalizeActivityValue(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value === 'boolean') return value ? 'true' : 'false'
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  const s = String(value).trim()
  return s === '' ? null : s
}

export function collectFieldChanges(
  specs: Array<{
    field: string
    label: string
    before: unknown
    after: unknown
    provided: boolean
  }>,
): FieldChange[] {
  const changes: FieldChange[] = []
  for (const spec of specs) {
    if (!spec.provided) continue
    const from = normalizeActivityValue(spec.before)
    const to = normalizeActivityValue(spec.after)
    if (from === to) continue
    changes.push({ field: spec.field, label: spec.label, from, to })
  }
  return changes
}

export function formatFieldChangeSummary(name: string, changes: FieldChange[]): string {
  if (changes.length === 1) {
    const c = changes[0]!
    return `${c.label}: ${c.from ?? '—'} → ${c.to ?? '—'} (${name})`
  }
  const labels = changes.map((c) => c.label).join(', ')
  return `Updated ${labels} on ${name}`
}

export function noteSnippet(text: string | null, max = 160): string | null {
  if (!text) return null
  const oneLine = text.replace(/\s+/g, ' ').trim()
  if (!oneLine) return null
  return oneLine.length > max ? `${oneLine.slice(0, max - 1)}…` : oneLine
}
