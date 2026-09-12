import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { Company, Contact, Page } from '../types';
import { navItemsForRole } from '../lib/nav';

type CommandKind = 'page' | 'company' | 'contact';

interface CommandItem {
  id: string;
  kind: CommandKind;
  label: string;
  detail: string;
  search: string;
  page?: Page;
  companyId?: string;
  contactId?: string;
}

interface CommandPaletteProps {
  open: boolean;
  companies: Company[];
  contacts: Contact[];
  userRole?: string;
  onClose: () => void;
  onNavigate: (page: Page) => void;
  onOpenCompany: (companyId: string) => void;
  onOpenContact: (contactId: string) => void;
}

const KIND_LABEL: Record<CommandKind, string> = {
  page: 'Page',
  company: 'Company',
  contact: 'Contact',
};

function normalize(value: string): string {
  return value.trim().toLowerCase();
}

function matches(item: CommandItem, query: string): boolean {
  return !query || item.search.includes(query);
}

export function CommandPalette({
  open,
  companies,
  contacts,
  userRole,
  onClose,
  onNavigate,
  onOpenCompany,
  onOpenContact,
}: CommandPaletteProps) {
  const titleId = useId();
  const listId = useId();
  const [query, setQuery] = useState('');
  const [highlight, setHighlight] = useState(0);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const companyNameById = useMemo(
    () => new Map(companies.map((company) => [company.id, company.companyName])),
    [companies]
  );

  const items = useMemo(() => {
    const q = normalize(query);
    const pageItems: CommandItem[] = navItemsForRole(userRole).map((item) => ({
      id: `page:${item.id}`,
      kind: 'page',
      label: item.label,
      detail: item.hint,
      search: normalize(`${item.label} ${item.hint} ${item.short}`),
      page: item.id,
    }));
    const companyItems: CommandItem[] = [...companies]
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .map((company) => ({
        id: `company:${company.id}`,
        kind: 'company',
        label: company.companyName,
        detail: [company.stage, company.industry, company.location].filter(Boolean).join(' · '),
        search: normalize(
          [
            company.companyName,
            company.stage,
            company.industry,
            company.location,
            company.companyWebsite,
            company.linkedInCompany,
          ].join(' ')
        ),
        companyId: company.id,
      }));
    const contactItems: CommandItem[] = [...contacts]
      .sort((a, b) => a.contactName.localeCompare(b.contactName))
      .map((contact) => {
        const companyName = companyNameById.get(contact.companyId ?? '') ?? '';
        return {
          id: `contact:${contact.id}`,
          kind: 'contact',
          label: contact.contactName,
          detail: [contact.email, companyName, contact.role].filter(Boolean).join(' · '),
          search: normalize(
            [
              contact.contactName,
              contact.email,
              contact.phone,
              contact.role,
              contact.contactStatus,
              companyName,
            ].join(' ')
          ),
          contactId: contact.id,
        };
      });

    return [
      ...companyItems.filter((item) => matches(item, q)).slice(0, 7),
      ...contactItems.filter((item) => matches(item, q)).slice(0, 7),
      ...pageItems.filter((item) => matches(item, q)).slice(0, 5),
    ];
  }, [companies, contacts, companyNameById, query, userRole]);

  useEffect(() => {
    if (!open) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const id = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(id);
      const previous = previousFocusRef.current;
      if (previous && document.contains(previous)) previous.focus();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery('');
      setHighlight(0);
      return;
    }
    setHighlight(0);
  }, [open, query]);

  useEffect(() => {
    if (highlight >= items.length) setHighlight(Math.max(0, items.length - 1));
  }, [highlight, items.length]);

  if (!open) return null;

  const activeItem = items[highlight] ?? null;

  const runItem = (item: CommandItem) => {
    if (item.kind === 'page' && item.page) onNavigate(item.page);
    if (item.kind === 'company' && item.companyId) onOpenCompany(item.companyId);
    if (item.kind === 'contact' && item.contactId) onOpenContact(item.contactId);
    onClose();
  };

  const trapFocus = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const root = panelRef.current;
    if (!root) return;
    const focusable = Array.from(
      root.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((node) => node.offsetParent !== null);
    if (focusable.length === 0) {
      e.preventDefault();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  const onInputKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (items.length === 0 ? 0 : (i + 1) % items.length));
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (items.length === 0 ? 0 : (i - 1 + items.length) % items.length));
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (activeItem) runItem(activeItem);
    }
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-3 pt-[14dvh]">
      <button
        type="button"
        className="absolute inset-0 bg-stone-900/35"
        aria-label="Dismiss command palette"
        onClick={onClose}
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onKeyDown={trapFocus}
        data-testid="command-palette"
        className="relative z-10 w-full max-w-2xl overflow-hidden rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] shadow-2xl"
      >
        <div className="border-b border-[var(--color-line)] bg-white px-4 py-3">
          <h2 id={titleId} className="sr-only">
            Command palette
          </h2>
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKeyDown}
            role="combobox"
            aria-expanded="true"
            aria-controls={listId}
            aria-activedescendant={activeItem ? activeItem.id : undefined}
            data-testid="command-palette-input"
            placeholder="Search companies, contacts, pages..."
            className="w-full border-0 bg-transparent px-0 py-2 text-base text-stone-900 outline-none placeholder:text-stone-400 sm:text-lg"
          />
        </div>
        <div id={listId} role="listbox" className="max-h-[min(62dvh,28rem)] overflow-y-auto py-2">
          {items.length === 0 ? (
            <p className="px-4 py-8 text-center text-sm text-stone-400">No matching results.</p>
          ) : (
            items.map((item, index) => (
              <button
                key={item.id}
                id={item.id}
                type="button"
                role="option"
                aria-selected={index === highlight}
                data-testid="command-palette-item"
                onMouseEnter={() => setHighlight(index)}
                onClick={() => runItem(item)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition ${
                  index === highlight ? 'bg-teal-50' : 'hover:bg-stone-50'
                }`}
              >
                <span
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-none text-xs font-bold ${
                    item.kind === 'company'
                      ? 'bg-teal-700 text-white'
                      : item.kind === 'contact'
                        ? 'bg-stone-900 text-white'
                        : 'bg-stone-100 text-stone-700'
                  }`}
                  aria-hidden="true"
                >
                  {KIND_LABEL[item.kind].charAt(0)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-stone-900">
                    {item.label}
                  </span>
                  <span className="block truncate text-xs text-stone-500">
                    {item.detail || KIND_LABEL[item.kind]}
                  </span>
                </span>
                <span className="shrink-0 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                  {KIND_LABEL[item.kind]}
                </span>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
