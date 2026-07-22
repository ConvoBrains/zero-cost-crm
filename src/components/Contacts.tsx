import { useMemo, useState } from 'react'
import type { Contact, ContactView } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import {
  CONTACT_VIEW_GROUPS,
  CONTACT_VIEW_HINTS,
  filterContacts,
  sortContactsForView,
  statusColor,
} from '../lib/views'
import { logViewEvent } from '../lib/activity'
import { ContactForm } from './ContactForm'
import { Modal, btnPrimary } from './ui'

interface ContactsProps {
  store: CrmStore
}

function ContactRow({
  contact,
  companyName,
  onEdit,
}: {
  contact: Contact
  companyName: string
  onEdit: () => void
}) {
  return (
    <button
      type="button"
      onClick={onEdit}
      className="w-full rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-4 text-left transition active:bg-teal-50/40"
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="font-semibold text-stone-900">{contact.contactName}</p>
          {contact.email ? (
            <p className="truncate text-xs text-stone-400">{contact.email}</p>
          ) : null}
        </div>
        {contact.champion ? (
          <span className="shrink-0 rounded-none bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
            ★
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
        <span>{companyName}</span>
        {contact.role ? <span>· {contact.role}</span> : null}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${statusColor(contact.contactStatus)}`}
        >
          {contact.contactStatus}
        </span>
        {contact.phone ? <span className="text-xs text-stone-500">{contact.phone}</span> : null}
        {contact.nextFollowUp ? (
          <span className="text-xs text-amber-700">Follow-up {contact.nextFollowUp}</span>
        ) : null}
        {contact.lastContacted ? (
          <span className="text-xs text-stone-400">Last {contact.lastContacted}</span>
        ) : null}
      </div>
    </button>
  )
}

export function Contacts({ store }: ContactsProps) {
  const [view, setView] = useState<ContactView>('To Call Today')
  const [editing, setEditing] = useState<Contact | null>(null)
  const [creating, setCreating] = useState(false)

  const openContact = (c: Contact) => {
    setEditing(c)
    logViewEvent('contact.opened', c.id, c.contactName)
  }

  const filtered = useMemo(() => {
    const list = filterContacts(store.contacts, view)
    return sortContactsForView(list, view)
  }, [store.contacts, view])

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Contacts
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            Contacts
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Work your call queue. Update status and follow-up date after every dial.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Add contact
        </button>
      </header>

      <div className="space-y-3">
        {CONTACT_VIEW_GROUPS.map((group) => (
          <div key={group.label}>
            <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
              {group.label}
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 kanban-scroll">
              {group.views.map((v) => {
                const count = filterContacts(store.contacts, v).length
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    className={`shrink-0 rounded-none px-3 py-1.5 text-xs font-medium transition ${
                      view === v
                        ? 'bg-teal-700 text-white'
                        : 'bg-white text-stone-600 ring-1 ring-[var(--color-line)] hover:bg-stone-50'
                    }`}
                  >
                    {v}
                    <span className="ml-1.5 opacity-70">({count})</span>
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      <p className="rounded-none bg-teal-50/80 px-3 py-2 text-xs text-teal-900/80">
        <span className="font-semibold">{view}</span>
        {' — '}
        {CONTACT_VIEW_HINTS[view]}
        {filtered.length > 0 ? (
          <span className="text-teal-700"> · {filtered.length} contact{filtered.length === 1 ? '' : 's'}</span>
        ) : null}
      </p>

      <div className="space-y-3 md:hidden">
        {filtered.map((t) => (
          <ContactRow
            key={t.id}
            contact={t}
            companyName={store.getCompany(t.companyId)?.companyName ?? '—'}
            onEdit={() => openContact(t)}
          />
        ))}
        {filtered.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400">No contacts in this view.</p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-stone-50/80 text-[11px] tracking-wide text-stone-500 uppercase">
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Company</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Follow-up</th>
                <th className="px-4 py-3 font-semibold">Last contacted</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((t) => {
                const company = store.getCompany(t.companyId)
                return (
                  <tr
                    key={t.id}
                    onClick={() => openContact(t)}
                    className="cursor-pointer border-b border-[var(--color-line)]/70 transition hover:bg-teal-50/40"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-stone-900">{t.contactName}</span>
                        {t.champion ? (
                          <span className="rounded-none bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-800">
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
                        className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${statusColor(t.contactStatus)}`}
                      >
                        {t.contactStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{t.nextFollowUp || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{t.lastContacted || '—'}</td>
                  </tr>
                )
              })}
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-sm text-stone-400">
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
