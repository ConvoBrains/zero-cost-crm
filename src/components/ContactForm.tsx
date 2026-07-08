import { useState, type FormEvent } from 'react'
import type { Contact } from '../types'
import { CONTACT_STATUSES } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import { Field, inputClass, btnPrimary, btnGhost } from './ui'

interface ContactFormProps {
  store: CrmStore
  initial?: Contact | null
  defaultCompanyId?: string | null
  onDone: () => void
}

export function ContactForm({
  store,
  initial,
  defaultCompanyId,
  onDone,
}: ContactFormProps) {
  const [form, setForm] = useState({
    contactName: initial?.contactName ?? '',
    companyId: initial?.companyId ?? defaultCompanyId ?? '',
    role: initial?.role ?? '',
    phone: initial?.phone ?? '',
    email: initial?.email ?? '',
    linkedInProfile: initial?.linkedInProfile ?? '',
    contactStatus: initial?.contactStatus ?? ('Not Contacted' as const),
    champion: initial?.champion ?? false,
    lastContacted: initial?.lastContacted ?? '',
    notes: initial?.notes ?? '',
  })

  const set = (key: string, value: string | boolean) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    if (!form.contactName.trim()) return

    const payload = {
      contactName: form.contactName.trim(),
      companyId: form.companyId || null,
      role: form.role,
      phone: form.phone,
      email: form.email,
      linkedInProfile: form.linkedInProfile,
      contactStatus: form.contactStatus,
      champion: form.champion,
      lastContacted: form.lastContacted || null,
      notes: form.notes,
    }

    if (initial) {
      await store.updateContact(initial.id, payload)
    } else {
      await store.addContact(payload)
    }
    onDone()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Contact Name *" className="sm:col-span-2">
          <input
            className={inputClass}
            value={form.contactName}
            onChange={(e) => set('contactName', e.target.value)}
            required
            placeholder="Full name"
          />
        </Field>

        <Field label="Company">
          <select
            className={inputClass}
            value={form.companyId}
            onChange={(e) => set('companyId', e.target.value)}
          >
            <option value="">— None —</option>
            {store.companies.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Role / Designation">
          <input
            className={inputClass}
            value={form.role}
            onChange={(e) => set('role', e.target.value)}
            placeholder="e.g. VP Operations"
          />
        </Field>

        <Field label="Phone Number">
          <input
            className={inputClass}
            value={form.phone}
            onChange={(e) => set('phone', e.target.value)}
          />
        </Field>

        <Field label="Email">
          <input
            type="email"
            className={inputClass}
            value={form.email}
            onChange={(e) => set('email', e.target.value)}
          />
        </Field>

        <Field label="Contact Status">
          <select
            className={inputClass}
            value={form.contactStatus}
            onChange={(e) => set('contactStatus', e.target.value)}
          >
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Last Contacted">
          <input
            type="date"
            className={inputClass}
            value={form.lastContacted}
            onChange={(e) => set('lastContacted', e.target.value)}
          />
        </Field>

        <Field label="LinkedIn Profile" className="sm:col-span-2">
          <input
            type="url"
            className={inputClass}
            value={form.linkedInProfile}
            onChange={(e) => set('linkedInProfile', e.target.value)}
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

        <label className="flex items-center gap-2 text-sm sm:col-span-2">
          <input
            type="checkbox"
            checked={form.champion}
            onChange={(e) => set('champion', e.target.checked)}
            className="h-4 w-4 rounded border-stone-300 text-teal-700 focus:ring-teal-600"
          />
          <span className="font-medium text-stone-700">
            Champion{' '}
            <span className="font-normal text-stone-500">
              (auto-sets as Primary Contact on the company)
            </span>
          </span>
        </label>
      </div>

      <div className="flex items-center justify-between gap-3 border-t border-[var(--color-line)] pt-4">
        {initial && store.canDelete ? (
          <button
            type="button"
            className="text-sm text-rose-600 hover:underline"
            onClick={async () => {
              if (confirm(`Delete ${initial.contactName}?`)) {
                await store.deleteContact(initial.id)
                onDone()
              }
            }}
          >
            Delete contact
          </button>
        ) : (
          <span />
        )}
        <div className="flex gap-2">
          <button type="button" className={btnGhost} onClick={onDone}>
            Cancel
          </button>
          <button type="submit" className={btnPrimary}>
            {initial ? 'Save changes' : 'Add contact'}
          </button>
        </div>
      </div>
    </form>
  )
}
