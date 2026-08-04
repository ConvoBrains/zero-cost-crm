import { useEffect, useMemo, useState } from 'react';
import type { Contact, ContactFilters, ContactSortKey, SortDirection } from '../types';
import type { CrmStore } from '../hooks/useCrmStore';
import {
  CONTACT_DATE_RANGE_OPTIONS,
  CONTACT_QUEUE_OPTIONS,
  DEFAULT_CONTACT_FILTERS,
  applyContactFilters,
  buildContactInsights,
  contactFiltersAreActive,
  statusColor,
} from '../lib/views';
import { logViewEvent } from '../lib/activity';
import { ContactForm } from './ContactForm';
import { FilterChip, FilterDropdown, Modal, SearchInput, btnPrimary } from './ui';

interface ContactsProps {
  store: CrmStore;
  contactStatuses?: string[];
  stages?: string[];
}

function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  return iso.slice(0, 10) || '—';
}

function ContactRow({
  contact,
  companyName,
  stage,
  onEdit,
}: {
  contact: Contact;
  companyName: string;
  stage: string;
  onEdit: () => void;
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
            <span aria-hidden="true">★</span>
            <span className="sr-only">Champion</span>
          </span>
        ) : null}
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-xs text-stone-600">
        <span>{companyName}</span>
        {contact.role ? <span>· {contact.role}</span> : null}
        {stage ? <span>· {stage}</span> : null}
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
          <span className="text-xs text-stone-500">
            Last {formatIsoDate(contact.lastContacted)}
          </span>
        ) : null}
        <span className="text-xs text-stone-400">Added {formatIsoDate(contact.createdAt)}</span>
      </div>
    </button>
  );
}

function SortHeader({
  label,
  sortKey,
  activeKey,
  direction,
  onSort,
}: {
  label: string;
  sortKey: ContactSortKey;
  activeKey: ContactSortKey;
  direction: SortDirection;
  onSort: (key: ContactSortKey) => void;
}) {
  const active = activeKey === sortKey;
  return (
    <th className="px-4 py-3 font-semibold">
      <button
        type="button"
        onClick={() => onSort(sortKey)}
        className="inline-flex items-center gap-1 uppercase transition hover:text-stone-800"
      >
        {label}
        {active ? <span aria-hidden>{direction === 'asc' ? '↑' : '↓'}</span> : null}
      </button>
    </th>
  );
}

export function Contacts({ store, contactStatuses, stages }: ContactsProps) {
  const [filters, setFilters] = useState<ContactFilters>(DEFAULT_CONTACT_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [editing, setEditing] = useState<Contact | null>(null);
  const [creating, setCreating] = useState(false);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [sortKey, setSortKey] = useState<ContactSortKey>('contactName');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  useEffect(() => {
    const id = window.setTimeout(() => {
      setFilters((f) => (f.search === searchDraft ? f : { ...f, search: searchDraft }));
    }, 200);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  const openContact = (c: Contact) => {
    setEditing(c);
    logViewEvent('contact.opened', c.id, c.contactName);
  };

  const patchFilters = (patch: Partial<ContactFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
  };

  const clearFilters = () => {
    setSearchDraft('');
    setFilters({ ...DEFAULT_CONTACT_FILTERS, queue: 'all' });
  };

  const statusOptions = useMemo(
    () => (contactStatuses ?? []).map((s) => ({ value: s, label: s })),
    [contactStatuses]
  );

  const stageOptions = useMemo(() => (stages ?? []).map((s) => ({ value: s, label: s })), [stages]);

  const companyOptions = useMemo(
    () =>
      [...store.companies]
        .sort((a, b) => a.companyName.localeCompare(b.companyName))
        .map((c) => ({ value: c.id, label: c.companyName })),
    [store.companies]
  );

  const filtered = useMemo(
    () => applyContactFilters(store.contacts, store.companies, filters),
    [store.contacts, store.companies, filters]
  );

  const sorted = useMemo(() => {
    const list = [...filtered];
    const mul = sortDir === 'asc' ? 1 : -1;
    list.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case 'contactName':
          cmp = a.contactName.localeCompare(b.contactName);
          break;
        case 'companyName': {
          const an = store.getCompany(a.companyId)?.companyName ?? '';
          const bn = store.getCompany(b.companyId)?.companyName ?? '';
          cmp = an.localeCompare(bn);
          break;
        }
        case 'contactStatus':
          cmp = a.contactStatus.localeCompare(b.contactStatus);
          break;
        case 'stage': {
          const as = store.getCompany(a.companyId)?.stage ?? '';
          const bs = store.getCompany(b.companyId)?.stage ?? '';
          cmp = as.localeCompare(bs);
          break;
        }
        case 'nextFollowUp':
          cmp = (a.nextFollowUp ?? '9999-12-31').localeCompare(b.nextFollowUp ?? '9999-12-31');
          break;
        case 'lastContacted':
          cmp = (a.lastContacted ?? '0000-01-01').localeCompare(b.lastContacted ?? '0000-01-01');
          break;
        case 'createdAt':
          cmp = a.createdAt.localeCompare(b.createdAt);
          break;
        default:
          cmp = a.contactName.localeCompare(b.contactName);
      }
      if (cmp !== 0) return cmp * mul;
      return a.contactName.localeCompare(b.contactName);
    });
    return list;
  }, [filtered, sortKey, sortDir, store]);

  const insights = useMemo(
    () => buildContactInsights(filtered, store.companies),
    [filtered, store.companies]
  );

  const filtersActive = contactFiltersAreActive(filters);

  const onSort = (key: ContactSortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'createdAt' || key === 'lastContacted' ? 'desc' : 'asc');
    }
  };

  const queueLabel = CONTACT_QUEUE_OPTIONS.find((o) => o.value === filters.queue)?.label ?? 'All';
  const dateLabel =
    CONTACT_DATE_RANGE_OPTIONS.find((o) => o.value === filters.dateRange)?.label ?? 'All Time';
  const lastContactedLabel =
    CONTACT_DATE_RANGE_OPTIONS.find((o) => o.value === filters.lastContactedRange)?.label ??
    'All Time';
  const companyLabel = companyOptions.find((o) => o.value === filters.companyId)?.label ?? null;

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
            Search and filter your call queue. Track how new leads progress by period.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Add contact
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          data-testid="contact-search"
          value={searchDraft}
          onChange={setSearchDraft}
          placeholder="Search contacts, companies, emails…"
        />
        <FilterDropdown
          data-testid="contact-date-range"
          label="Added"
          value={filters.dateRange}
          options={CONTACT_DATE_RANGE_OPTIONS}
          active={filters.dateRange !== 'all'}
          onChange={(v) => patchFilters({ dateRange: v as ContactFilters['dateRange'] })}
        />
        <FilterDropdown
          data-testid="contact-last-contacted-range"
          label="Last contacted"
          value={filters.lastContactedRange}
          options={CONTACT_DATE_RANGE_OPTIONS}
          active={filters.lastContactedRange !== 'all'}
          onChange={(v) =>
            patchFilters({ lastContactedRange: v as ContactFilters['lastContactedRange'] })
          }
        />
      </div>

      <div className="flex flex-wrap gap-1.5 pb-1">
        <FilterDropdown
          data-testid="contact-filter-queue"
          label="Queue"
          value={filters.queue}
          options={CONTACT_QUEUE_OPTIONS}
          active={filters.queue !== 'all'}
          onChange={(v) => patchFilters({ queue: v as ContactFilters['queue'] })}
        />
        <FilterDropdown
          data-testid="contact-filter-status"
          label="Status"
          value={filters.statuses}
          options={statusOptions}
          multi
          active={filters.statuses.length > 0}
          onChange={(v) => patchFilters({ statuses: v as string[] })}
        />
        <FilterDropdown
          data-testid="contact-filter-company"
          label="Company"
          value={filters.companyId ?? ''}
          options={[{ value: '', label: 'All companies' }, ...companyOptions]}
          searchable
          active={!!filters.companyId}
          onChange={(v) => patchFilters({ companyId: !v || v === '' ? null : (v as string) })}
        />
        <FilterDropdown
          data-testid="contact-filter-stage"
          label="Stage"
          value={filters.stages}
          options={stageOptions}
          multi
          active={filters.stages.length > 0}
          onChange={(v) => patchFilters({ stages: v as string[] })}
        />
        <button
          type="button"
          data-testid="contact-filter-champion"
          onClick={() => patchFilters({ championOnly: !filters.championOnly })}
          className={`shrink-0 rounded-none px-3 py-1.5 text-xs font-medium transition ${
            filters.championOnly
              ? 'bg-teal-700 text-white'
              : 'bg-white text-stone-600 ring-1 ring-[var(--color-line)] hover:bg-stone-50'
          }`}
        >
          Champion only
        </button>
      </div>

      {filtersActive ? (
        <div className="flex flex-wrap items-center gap-2">
          {filters.search.trim() ? (
            <FilterChip
              label={`Search: ${filters.search.trim()}`}
              onClear={() => {
                setSearchDraft('');
                patchFilters({ search: '' });
              }}
            />
          ) : null}
          {filters.queue !== 'all' ? (
            <FilterChip
              label={`Queue: ${queueLabel}`}
              onClear={() => patchFilters({ queue: 'all' })}
            />
          ) : null}
          {filters.statuses.map((s) => (
            <FilterChip
              key={s}
              label={`Status: ${s}`}
              onClear={() => patchFilters({ statuses: filters.statuses.filter((x) => x !== s) })}
            />
          ))}
          {companyLabel ? (
            <FilterChip
              label={`Company: ${companyLabel}`}
              onClear={() => patchFilters({ companyId: null })}
            />
          ) : null}
          {filters.stages.map((s) => (
            <FilterChip
              key={s}
              label={`Stage: ${s}`}
              onClear={() => patchFilters({ stages: filters.stages.filter((x) => x !== s) })}
            />
          ))}
          {filters.championOnly ? (
            <FilterChip
              label="Champion only"
              onClear={() => patchFilters({ championOnly: false })}
            />
          ) : null}
          {filters.dateRange !== 'all' ? (
            <FilterChip
              label={`Added: ${dateLabel}`}
              onClear={() => patchFilters({ dateRange: 'all' })}
            />
          ) : null}
          {filters.lastContactedRange !== 'all' ? (
            <FilterChip
              label={`Last contacted: ${lastContactedLabel}`}
              onClear={() => patchFilters({ lastContactedRange: 'all' })}
            />
          ) : null}
          <button
            type="button"
            data-testid="contact-clear-filters"
            onClick={clearFilters}
            className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            Clear all filters
          </button>
        </div>
      ) : null}

      <section
        data-testid="lead-insights"
        className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-3 py-2">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
              Lead insights
            </p>
            <p className="text-xs text-stone-600">
              {dateLabel}
              {filters.queue !== 'all' ? ` · ${queueLabel}` : ''}
              {' · '}
              {insights.total} contact{insights.total === 1 ? '' : 's'}
            </p>
          </div>
          <button
            type="button"
            data-testid="lead-insights-toggle"
            onClick={() => setInsightsOpen((v) => !v)}
            className="text-xs font-medium text-stone-500 hover:text-stone-800"
          >
            {insightsOpen ? 'Collapse' : 'Expand'}
          </button>
        </div>
        {insightsOpen ? (
          <div className="space-y-3 px-3 py-3">
            <div className="flex flex-wrap gap-2">
              <span
                data-testid="insight-total"
                className="rounded-none bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-800"
              >
                {insights.total} leads
              </span>
              <span
                data-testid="insight-contacted"
                className="rounded-none bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800"
              >
                {insights.contacted} contacted
              </span>
              <span
                data-testid="insight-not-contacted"
                className="rounded-none bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800"
              >
                {insights.notContacted} not contacted
              </span>
              <span
                data-testid="insight-not-reachable"
                className="rounded-none bg-stone-200 px-2 py-1 text-[11px] font-medium text-stone-700"
              >
                {insights.notReachable} not reachable
              </span>
              <span
                data-testid="insight-discoveries"
                className="rounded-none bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-800"
              >
                {insights.discoveriesBooked} discoveries booked
              </span>
              <span
                data-testid="insight-demos"
                className="rounded-none bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-800"
              >
                {insights.demos} demos
              </span>
            </div>

            {insights.statusCounts.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                  Contact status
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.statusCounts.slice(0, 6).map(({ status, count }) => (
                    <span
                      key={status}
                      className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${statusColor(status)}`}
                    >
                      {count} {status}
                    </span>
                  ))}
                  {insights.statusCounts.length > 6 ? (
                    <span className="text-[11px] text-stone-400">
                      +{insights.statusCounts.length - 6} more
                    </span>
                  ) : null}
                </div>
              </div>
            ) : null}

            {insights.companyStageCounts.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                  Company stages ({insights.uniqueCompanies} companies)
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.companyStageCounts.map(({ stage, count }) => (
                    <span
                      key={stage}
                      className="rounded-none bg-white px-2 py-0.5 text-[11px] font-medium text-stone-700 ring-1 ring-[var(--color-line)]"
                    >
                      {count} {stage}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </section>

      <p className="text-xs text-stone-500">
        Showing <span className="font-semibold text-stone-700">{sorted.length}</span> contact
        {sorted.length === 1 ? '' : 's'}
      </p>

      <div className="space-y-3 md:hidden">
        {sorted.map((t) => {
          const company = store.getCompany(t.companyId);
          return (
            <ContactRow
              key={t.id}
              contact={t}
              companyName={company?.companyName ?? '—'}
              stage={company?.stage ?? ''}
              onEdit={() => openContact(t)}
            />
          );
        })}
        {sorted.length === 0 ? (
          <p className="py-10 text-center text-sm text-stone-400">
            No contacts match these filters.
          </p>
        ) : null}
      </div>

      <div className="hidden overflow-hidden rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] md:block">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1080px] text-left text-sm">
            <thead>
              <tr className="border-b border-[var(--color-line)] bg-stone-50/80 text-[11px] tracking-wide text-stone-500">
                <SortHeader
                  label="Contact"
                  sortKey="contactName"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Company"
                  sortKey="companyName"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <th className="px-4 py-3 font-semibold uppercase">Role</th>
                <SortHeader
                  label="Status"
                  sortKey="contactStatus"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Stage"
                  sortKey="stage"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <th className="px-4 py-3 font-semibold uppercase">Phone</th>
                <SortHeader
                  label="Follow-up"
                  sortKey="nextFollowUp"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Last contacted"
                  sortKey="lastContacted"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
                <SortHeader
                  label="Added"
                  sortKey="createdAt"
                  activeKey={sortKey}
                  direction={sortDir}
                  onSort={onSort}
                />
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => {
                const company = store.getCompany(t.companyId);
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
                      {t.email ? <p className="text-[11px] text-stone-400">{t.email}</p> : null}
                    </td>
                    <td className="px-4 py-3 text-stone-600">{company?.companyName ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{t.role || '—'}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${statusColor(t.contactStatus)}`}
                      >
                        {t.contactStatus}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-stone-600">{company?.stage ?? '—'}</td>
                    <td className="px-4 py-3 text-stone-600">{t.phone || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{t.nextFollowUp || '—'}</td>
                    <td className="px-4 py-3 text-stone-500">{formatIsoDate(t.lastContacted)}</td>
                    <td className="px-4 py-3 text-stone-500">{formatIsoDate(t.createdAt)}</td>
                  </tr>
                );
              })}
              {sorted.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-sm text-stone-400">
                    No contacts match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <Modal open={creating} title="Add contact" onClose={() => setCreating(false)} wide>
        <ContactForm
          store={store}
          contactStatuses={contactStatuses}
          stages={stages}
          onDone={() => setCreating(false)}
        />
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
            contactStatuses={contactStatuses}
            stages={stages}
            initial={editing}
            onDone={() => setEditing(null)}
          />
        ) : null}
      </Modal>
    </div>
  );
}
