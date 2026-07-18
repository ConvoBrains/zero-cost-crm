import { useState, type FormEvent } from 'react'
import type { Company } from '../types'
import { INDUSTRIES, INTENTS, STAGES } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import { Field, inputClass, btnPrimary, btnGhost } from './ui'

interface CompanyFormProps {
  store: CrmStore
  initial?: Company | null
  onDone: () => void
}

export function CompanyForm({ store, initial, onDone }: CompanyFormProps) {
  const contactOptions = initial
    ? store.contacts.filter((t) => t.companyId === initial.id)
    : []

  const [form, setForm] = useState({
    companyName: initial?.companyName ?? '',
    stage: initial?.stage ?? ('Lead Added' as const),
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

  const set = (key: string, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

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
    }

    if (initial) {
      await store.updateCompany(initial.id, payload)
    } else {
      await store.addCompany(payload)
    }
    onDone()
  }

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
            {STAGES.map((s) => (
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
          {initial ? (
            <div className={`${inputClass} flex items-center bg-[var(--color-muted,#f4f4f5)] text-[var(--color-fg-muted,#6b7280)] cursor-not-allowed`}>
              {initial.assignedTo || 'Unassigned'}
            </div>
          ) : (
            <div className={`${inputClass} flex items-center bg-[var(--color-muted,#f4f4f5)] text-[var(--color-fg-muted,#6b7280)] cursor-not-allowed`}>
              Will be assigned to you
            </div>
          )}
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
