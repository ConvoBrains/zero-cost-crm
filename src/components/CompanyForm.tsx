import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react'
import type { Company, DiscoveryQuestion } from '../types'
import { INDUSTRIES, INTENTS } from '../types'
import { DEFAULT_STAGES } from '../defaults'
import type { CrmStore } from '../hooks/useCrmStore'
import { Field, inputClass, btnPrimary, btnGhost } from './ui'
import {
  activityDetailLines,
  eventTypeLabel,
  fetchCompanyHistory,
  type CompanyHistoryEvent,
} from '../lib/activity'

interface CompanyFormProps {
  store: CrmStore
  stages?: string[]
  discoveryQuestions?: DiscoveryQuestion[]
  initial?: Company | null
  onDone: () => void
}

function formatEventTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso))
  } catch {
    return iso
  }
}

function groupQuestions(questions: DiscoveryQuestion[]) {
  const sections: Array<{ section: string; items: DiscoveryQuestion[] }> = []
  const index = new Map<string, number>()
  for (const q of questions) {
    const existing = index.get(q.section)
    if (existing == null) {
      index.set(q.section, sections.length)
      sections.push({ section: q.section, items: [q] })
    } else {
      sections[existing]!.items.push(q)
    }
  }
  return sections
}

export function CompanyForm({
  store,
  stages = [...DEFAULT_STAGES],
  discoveryQuestions = [],
  initial,
  onDone,
}: CompanyFormProps) {
  const contactOptions = initial
    ? store.contacts.filter((t) => t.companyId === initial.id)
    : []

  const [form, setForm] = useState({
    companyName: initial?.companyName ?? '',
    stage: initial?.stage ?? stages[0] ?? 'Lead Added',
    industry: initial?.industry ?? '',
    location: initial?.location ?? '',
    estimatedCallVolume: initial?.estimatedCallVolume?.toString() ?? '',
    employeeCount: initial?.employeeCount?.toString() ?? '',
    intent: initial?.intent ?? '',
    offeredPrice: initial?.offeredPrice?.toString() ?? '',
    primaryContactId: initial?.primaryContactId ?? '',
    lastContacted: initial?.lastContacted ?? '',
    nextFollowUp: initial?.nextFollowUp ?? '',
    notes: initial?.notes ?? '',
    sourceLink: initial?.sourceLink ?? '',
    companyWebsite: initial?.companyWebsite ?? '',
    linkedInCompany: initial?.linkedInCompany ?? '',
  })
  const [discoveryAnswers, setDiscoveryAnswers] = useState<Record<string, string>>(
    () => ({ ...(initial?.discoveryAnswers ?? {}) }),
  )

  const [history, setHistory] = useState<CompanyHistoryEvent[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const historyEndRef = useRef<HTMLDivElement | null>(null)

  const discoverySections = useMemo(
    () => groupQuestions(discoveryQuestions),
    [discoveryQuestions],
  )

  useEffect(() => {
    if (!initial?.id) return
    let cancelled = false
    setHistoryLoading(true)
    setHistoryError(null)
    void fetchCompanyHistory(initial.id)
      .then((data) => {
        if (cancelled) return
        setHistory(data.events)
      })
      .catch((err: unknown) => {
        if (cancelled) return
        setHistoryError(err instanceof Error ? err.message : 'Failed to load history')
      })
      .finally(() => {
        if (!cancelled) setHistoryLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [initial?.id])

  useEffect(() => {
    if (!history.length) return
    historyEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [history])

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const setAnswer = (id: string, value: string) =>
    setDiscoveryAnswers((prev) => ({ ...prev, [id]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.companyName.trim()) return

    const payload = {
      companyName: form.companyName.trim(),
      stage: form.stage,
      industry: form.industry as Company['industry'],
      location: form.location,
      estimatedCallVolume: form.estimatedCallVolume
        ? Number(form.estimatedCallVolume)
        : null,
      employeeCount: form.employeeCount ? Number(form.employeeCount) : null,
      intent: form.intent as Company['intent'],
      offeredPrice: form.offeredPrice ? Number(form.offeredPrice) : null,
      primaryContactId: form.primaryContactId || null,
      lastContacted: form.lastContacted || null,
      nextFollowUp: form.nextFollowUp || null,
      notes: form.notes,
      sourceLink: form.sourceLink,
      companyWebsite: form.companyWebsite,
      linkedInCompany: form.linkedInCompany,
      discoveryAnswers,
    }

    if (initial) {
      await store.updateCompany(initial.id, payload)
    } else {
      await store.addCompany(payload)
    }
    onDone()
  }

  const assignedToDisplay = initial
    ? initial.assignedTo || 'Unassigned'
    : 'Will be assigned to you'

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Company Name *" className="sm:col-span-2">
          <input
            className={inputClass}
            value={form.companyName}
            onChange={(e) => set('companyName', e.target.value)}
            required
            placeholder="e.g. Horizon Bank"
          />
        </Field>

        <Field label="Stage">
          <select
            className={inputClass}
            value={form.stage}
            onChange={(e) => set('stage', e.target.value)}
          >
            {stages.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Intent">
          <select
            className={inputClass}
            value={form.intent}
            onChange={(e) => set('intent', e.target.value)}
          >
            <option value="">—</option>
            {INTENTS.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Industry">
          <select
            className={inputClass}
            value={form.industry}
            onChange={(e) => set('industry', e.target.value)}
          >
            <option value="">—</option>
            {INDUSTRIES.map((i) => (
              <option key={i} value={i}>
                {i}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Location">
          <input
            className={inputClass}
            value={form.location}
            onChange={(e) => set('location', e.target.value)}
            placeholder="City"
          />
        </Field>

        <Field label="Estimated Call Volume">
          <input
            type="number"
            className={inputClass}
            value={form.estimatedCallVolume}
            onChange={(e) => set('estimatedCallVolume', e.target.value)}
          />
        </Field>

        <Field label="Employees">
          <input
            type="number"
            className={inputClass}
            value={form.employeeCount}
            onChange={(e) => set('employeeCount', e.target.value)}
          />
        </Field>

        <Field label="Offered Price">
          <input
            type="number"
            className={inputClass}
            value={form.offeredPrice}
            onChange={(e) => set('offeredPrice', e.target.value)}
          />
        </Field>

        <Field label="Primary Contact">
          <select
            className={inputClass}
            value={form.primaryContactId}
            onChange={(e) => set('primaryContactId', e.target.value)}
          >
            <option value="">— None —</option>
            {contactOptions.map((t) => (
              <option key={t.id} value={t.id}>
                {t.contactName}
                {t.champion ? ' ★' : ''}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Assigned To">
          <input
            className={`${inputClass} bg-stone-100 text-stone-500 cursor-not-allowed`}
            value={assignedToDisplay}
            readOnly
            disabled
          />
        </Field>

        <Field label="Last Contacted">
          <input
            type="date"
            className={inputClass}
            value={form.lastContacted}
            onChange={(e) => set('lastContacted', e.target.value)}
          />
        </Field>

        <Field label="Next Follow-up">
          <input
            type="date"
            className={inputClass}
            value={form.nextFollowUp}
            onChange={(e) => set('nextFollowUp', e.target.value)}
          />
        </Field>

        <Field label="Company Website">
          <input
            type="url"
            className={inputClass}
            value={form.companyWebsite}
            onChange={(e) => set('companyWebsite', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <Field label="LinkedIn Company">
          <input
            type="url"
            className={inputClass}
            value={form.linkedInCompany}
            onChange={(e) => set('linkedInCompany', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <Field label="Source Link" className="sm:col-span-2">
          <input
            type="url"
            className={inputClass}
            value={form.sourceLink}
            onChange={(e) => set('sourceLink', e.target.value)}
            placeholder="https://"
          />
        </Field>

        <Field label="Notes" className="sm:col-span-2">
          <textarea
            className={`${inputClass} min-h-[80px] resize-y`}
            value={form.notes}
            onChange={(e) => set('notes', e.target.value)}
          />
        </Field>
      </div>

      {discoverySections.length > 0 ? (
        <section
          className="space-y-4 border-t border-[var(--color-line)] pt-4"
          aria-label="Discovery questions"
        >
          <div>
            <h3 className="text-sm font-semibold text-stone-800">Discovery questions</h3>
            <p className="text-xs text-stone-500">
              Quick discovery answers for demo prep. Saved with this company.
            </p>
          </div>
          {discoverySections.map(({ section, items }) => (
            <div key={section} className="space-y-3">
              <h4 className="text-xs font-semibold tracking-[0.12em] text-teal-800 uppercase">
                {section}
              </h4>
              <div className="grid gap-3">
                {items.map((q) => (
                  <Field key={q.id} label={q.prompt}>
                    {q.input === 'textarea' ? (
                      <textarea
                        className={`${inputClass} min-h-[72px] resize-y`}
                        value={discoveryAnswers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                    ) : (
                      <input
                        type={q.input === 'number' ? 'number' : 'text'}
                        className={inputClass}
                        value={discoveryAnswers[q.id] ?? ''}
                        onChange={(e) => setAnswer(q.id, e.target.value)}
                      />
                    )}
                  </Field>
                ))}
              </div>
            </div>
          ))}
        </section>
      ) : null}

      {initial ? (
        <section
          className="space-y-2 border-t border-[var(--color-line)] pt-4"
          aria-label="Company progress history"
        >
          <h3 className="text-sm font-semibold text-stone-800">Progress</h3>
          <p className="text-xs text-stone-500">
            Chronological activity for this company and its contacts.
          </p>
          {historyLoading ? (
            <p className="text-sm text-stone-500">Loading history…</p>
          ) : historyError ? (
            <p className="text-sm text-rose-600">{historyError}</p>
          ) : history.length === 0 ? (
            <p className="rounded-none border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500">
              No activity yet.
            </p>
          ) : (
            <ol className="max-h-64 space-y-2 overflow-y-auto border border-stone-200 bg-stone-50/80 p-3">
              {history.map((ev) => {
                const details = activityDetailLines(ev)
                return (
                  <li key={ev.id} className="text-sm text-stone-700">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <time
                        className="shrink-0 font-mono text-xs text-stone-500"
                        dateTime={ev.createdAt}
                      >
                        {formatEventTime(ev.createdAt)}
                      </time>
                      <span className="font-medium text-stone-800">
                        {eventTypeLabel(ev.eventType)}
                      </span>
                      <span className="text-xs text-stone-500">{ev.userName}</span>
                      {ev.contactName ? (
                        <span className="text-xs text-teal-800">· {ev.contactName}</span>
                      ) : null}
                    </div>
                    <div className="mt-0.5 space-y-0.5 text-xs text-stone-600">
                      {details.map((line) => (
                        <p key={line}>{line}</p>
                      ))}
                    </div>
                  </li>
                )
              })}
              <div ref={historyEndRef} />
            </ol>
          )}
        </section>
      ) : null}

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        {initial && store.canDelete ? (
          <button
            type="button"
            className="text-sm text-rose-600 hover:underline"
            onClick={async () => {
              if (confirm(`Delete ${initial.companyName}?`)) {
                await store.deleteCompany(initial.id)
                onDone()
              }
            }}
          >
            Delete company
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            {initial ? 'Save changes' : 'Add company'}
          </button>
        </div>
      </div>
    </form>
  )
}
