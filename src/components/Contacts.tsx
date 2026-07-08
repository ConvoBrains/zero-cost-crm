import { useMemo, useState } from 'react'
import type { Contact, ContactView } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import { CONTACT_VIEWS, filterContacts, statusColor } from '../lib/views'
import { ContactForm } from './ContactForm'
import { Modal, btnPrimary } from './ui'

interface ContactsProps {
  store: CrmStore
}

export function Contacts({ store }: ContactsProps) {
  const [view, setView] = useState<ContactView>('All Contacts')
  const [editing, setEditing] = useState<Contact | null>(null)
  const [creating, setCreating] = useState(false)

  const filtered = useMemo(
    () => filterContacts(store.contacts, view),
    [store.contacts, view],
  )

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Database 2
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Each row is one person. Mark a Champion when someone is interested — they become
            Primary Contact on the company.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Add contact
        </button>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 kanban-scroll">
        {CONTACT_VIEWS.map((v) => (
          <button
            key={v}
            type="button"
            onClick={() => setView(v)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
              view === v
                ? 'bg-teal-700 text-white'
                : 'bg-white text-stone-600 ring-1 ring-[var(--color-line)] hover:bg-stone-50'
            }`}
          >
            {v}
            <span className="ml-1.5 opacity-70">
              ({filterContacts(store.contacts, v).length})
            </span>
          </button>
        ))}
      </div>

      <div className="space-y-3 md:hidden">
        {filtered.map((t) => {
          const company = store.getCompany(t.companyId)
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setEditing(t)}
              className="w-full rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-left transition active:bg-teal-50/40"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-stone-900">{t.contactName}</p>
                  {t.email ? (
                    <p className="truncate text-xs text-stone-400">{t.email}</p>
                  ) : null}
                </div>
                {t.champion ? (
                  <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                    ★
                  </span>
                ) : null}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
                <span>{company?.companyName ?? '—'}</span>
                {t.role ? <span>· {t.role}</span> : null}
              </div>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(t.contactStatus)}`}
                >
                  {t.contactStatus}
                </span>
                {t.phone ? <span className="text-xs text-stone-500">{t.phone}</span> : null}
              </div>
            </button>
          )
        })}
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400">No contacts in this view.</p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-stone-50/80 text-[11px] tracking-wide text-stone-500 uppercase">
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Last contacted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const company = store.getCompany(t.companyId)
                return (
                  <tr
                    key={t.id}
                    onClick={() => setEditing(t)}
                    className="cursor-pointer border-b border-[var(--color-line)]/70 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{t.contactName}</span>
                        {t.champion ? (
                          <span className="rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
                            ★ Champion
                          </span>
                        ) : null}
                      </div>
                      {t.email ? (
                        <p className="text-[11px] text-stone-400">{t.email}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {company?.companyName ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{t.role || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColor(t.contactStatus)}`}
                      >
                        {t.contactStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{t.lastContacted || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-sm text-stone-400">
                    No contacts in this view.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={creating} title="Add contact" onClose={() => setCreating(false)} wide>
        <ContactForm store={store} onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={!!editing}
        title={editing?.contactName ?? 'Edit contact'}
        onClose={() => setEditing(null)}
        wide
      >
        {editing ? (
          <ContactForm
            key={editing.id}
            store={store}
            initial={editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  )
}
