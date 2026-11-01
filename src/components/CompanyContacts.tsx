import { useState } from 'react';
import type { Contact } from '../types';
import type { CrmStore } from '../hooks/useCrmStore';
import { statusColor } from '../lib/views';
import { companyContactSummary, isDialed, needsWhatsApp } from '../lib/progress';

/**
 * Every contact on a company with its latest state, so the company view answers
 * "who have we called, what happened, and did they get the WhatsApp message?" at a glance.
 */
export function CompanyContacts({
  store,
  companyId,
  onOpenContact,
}: {
  store: CrmStore;
  companyId: string;
  onOpenContact?: (contact: Contact) => void;
}) {
  const contacts = store.contacts.filter((t) => t.companyId === companyId);
  const summary = companyContactSummary(contacts);
  // The tick shows straight away; it reverts if the save fails.
  const [saving, setSaving] = useState<{ id: string; sent: boolean } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const toggleWhatsApp = async (contact: Contact, sent: boolean) => {
    setSaving({ id: contact.id, sent });
    setError(null);
    try {
      await store.updateContact(contact.id, { whatsappSent: sent });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update WhatsApp status');
    } finally {
      setSaving(null);
    }
  };

  return (
    <section
      className="space-y-2 border-t border-[var(--color-line)] pt-4"
      aria-label="Company contacts"
      data-testid="company-contacts"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold text-stone-800">Contacts ({contacts.length})</h3>
        {contacts.length > 0 ? (
          <p className="text-xs text-stone-500" data-testid="company-contacts-summary">
            {summary.dialed}/{summary.total} dialed · {summary.followUps} follow-up
            {summary.followUps === 1 ? '' : 's'} · WhatsApp {summary.whatsappSent}/
            {summary.whatsappDue} sent
            {summary.whatsappPending > 0 ? (
              <span className="font-semibold text-rose-700">
                {' '}
                ({summary.whatsappPending} pending)
              </span>
            ) : null}
          </p>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="text-xs text-rose-600">
          {error}
        </p>
      ) : null}
      {contacts.length === 0 ? (
        <p className="rounded-none border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500">
          No contacts on this company yet.
        </p>
      ) : (
        <div className="overflow-x-auto border border-stone-200">
          <table className="w-full min-w-[36rem] text-left text-xs">
            <thead className="bg-stone-50 text-[10px] tracking-wide text-stone-500 uppercase">
              <tr>
                <th className="px-2 py-1.5 font-semibold">Contact</th>
                <th className="px-2 py-1.5 font-semibold">Status</th>
                <th className="px-2 py-1.5 font-semibold">Last contacted</th>
                <th className="px-2 py-1.5 font-semibold">Follow-up</th>
                <th className="px-2 py-1.5 font-semibold">WhatsApp</th>
                <th className="px-2 py-1.5" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((t) => {
                const sent = saving?.id === t.id ? saving.sent : !!t.whatsappSentAt;
                const pending = needsWhatsApp(t) && !sent;
                return (
                  <tr
                    key={t.id}
                    className="border-t border-stone-100 align-top"
                    data-testid="company-contact-row"
                    data-contact-id={t.id}
                  >
                    <td className="px-2 py-1.5">
                      <p className="font-medium text-stone-900">
                        {t.champion ? <span className="text-teal-700">★ </span> : null}
                        {t.contactName}
                      </p>
                      {t.role ? <p className="text-[11px] text-stone-500">{t.role}</p> : null}
                    </td>
                    <td className="px-2 py-1.5">
                      <span
                        className={`rounded-none px-1.5 py-0.5 text-[10px] font-semibold ${statusColor(t.contactStatus)}`}
                      >
                        {t.contactStatus}
                      </span>
                    </td>
                    <td className="px-2 py-1.5 text-stone-600">{t.lastContacted ?? '—'}</td>
                    <td className="px-2 py-1.5 text-stone-600">{t.nextFollowUp ?? '—'}</td>
                    <td className="px-2 py-1.5">
                      <label
                        className={`flex items-center gap-1.5 ${pending ? 'font-semibold text-rose-700' : 'text-stone-600'}`}
                        title={
                          isDialed(t)
                            ? undefined
                            : 'Not dialed yet; the WhatsApp message is due once they are'
                        }
                      >
                        <input
                          type="checkbox"
                          data-testid="company-contact-whatsapp"
                          checked={sent}
                          disabled={saving?.id === t.id}
                          onChange={(e) => void toggleWhatsApp(t, e.target.checked)}
                          className="h-4 w-4 rounded-none border-stone-300 text-emerald-700 focus:ring-emerald-600"
                          aria-label={`WhatsApp sent to ${t.contactName}`}
                        />
                        {sent ? 'Sent' : pending ? 'Pending' : '—'}
                      </label>
                    </td>
                    <td className="px-2 py-1.5 text-right">
                      {onOpenContact ? (
                        <button
                          type="button"
                          data-testid="company-contact-open"
                          onClick={() => onOpenContact(t)}
                          className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
                        >
                          Open
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
