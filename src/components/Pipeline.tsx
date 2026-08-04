import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  rectIntersection,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent } from 'react';
import type { Company, Contact, PipelineFilters, PipelineView, Stage } from '../types';
import type { CrmStore } from '../hooks/useCrmStore';
import {
  DEFAULT_PIPELINE_FILTERS,
  PIPELINE_DATE_RANGE_OPTIONS,
  PIPELINE_VIEWS,
  applyPipelineFilters,
  buildPipelineInsights,
  intentColor,
  pipelineFiltersAreActive,
  stageAccent,
  statusColor,
} from '../lib/views';
import { buildCardBadges, buildChampionTrail, findChampion, istToday } from '../lib/championCard';
import { logViewEvent } from '../lib/activity';
import { CompanyForm } from './CompanyForm';
import { FilterChip, FilterDropdown, Modal, SearchInput, btnPrimary, inputClass } from './ui';

interface PipelineProps {
  store: CrmStore;
  stages: string[];
  discoveryQuestions?: import('../types').DiscoveryQuestion[];
  openCompanyId?: string | null;
  onOpenCompanyIdConsumed?: () => void;
  onEditingCompanyChange?: (companyId: string | null) => void;
}

function resolveDropStage(
  overId: string | number,
  companies: Company[],
  stages: readonly string[]
): Stage | null {
  const id = String(overId);
  if (stages.includes(id)) return id;
  const target = companies.find((c) => c.id === id);
  return target?.stage ?? null;
}

function CompanyCard({
  company,
  contacts,
  today,
  dragging,
  onOpen,
}: {
  company: Company;
  contacts: Contact[];
  today: string;
  dragging?: boolean;
  onOpen?: () => void;
}) {
  const badges = buildCardBadges(company, contacts, today);
  const trail = buildChampionTrail(findChampion(contacts, company.id));

  return (
    <div
      data-testid="company-card"
      data-company-id={company.id}
      className={`rounded-none border border-[var(--color-line)] bg-white p-3 text-left transition hover:border-teal-600/40 ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          onPointerDown={(e) => e.stopPropagation()}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-stone-900">{company.companyName}</p>
          <p className="mt-1 text-[11px] text-stone-500">
            {[company.industry, company.location].filter(Boolean).join(' · ') || '—'}
          </p>
          <div
            data-testid="card-badges"
            data-company-id={company.id}
            className="mt-2 flex flex-wrap items-center gap-1"
          >
            <span className="rounded-none bg-stone-100 px-1.5 py-0.5 text-[10px] font-semibold text-stone-500">
              {badges.contactCount} {badges.contactCount === 1 ? 'contact' : 'contacts'}
            </span>
            {badges.hasChampion ? (
              <span
                className="rounded-none bg-teal-100 px-1.5 py-0.5 text-[10px] font-semibold text-teal-800"
                title="Has champion"
              >
                ★ Champion
              </span>
            ) : null}
            {badges.followUpDueToday ? (
              <span className="rounded-none bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                Due today
              </span>
            ) : null}
          </div>
          {trail ? (
            <div
              data-testid="champion-trail"
              data-company-id={company.id}
              className="mt-2 space-y-0.5"
            >
              <p className="text-[11px] font-medium text-teal-800">{trail.header}</p>
              {trail.note ? <p className="text-[10px] text-stone-500">{trail.note}</p> : null}
              {trail.followUp ? (
                <p className="text-[10px] text-stone-400">{trail.followUp}</p>
              ) : null}
            </div>
          ) : null}
          {company.nextFollowUp ? (
            <p className="mt-1.5 text-[10px] text-stone-400">Follow-up {company.nextFollowUp}</p>
          ) : null}
          {company.createdAt ? (
            <p className="mt-1 text-[10px] text-stone-400">
              Added {company.createdAt.slice(0, 10)}
            </p>
          ) : null}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {company.intent ? (
            <span
              className={`rounded-none px-2 py-0.5 text-[10px] font-semibold ${intentColor(company.intent)}`}
            >
              {company.intent}
            </span>
          ) : null}
          <span
            className="rounded-none px-1.5 py-0.5 text-[10px] font-medium text-stone-400"
            title="Drag card to move stage"
          >
            ⠿
          </span>
        </div>
      </div>
    </div>
  );
}

function DraggableCard({
  company,
  contacts,
  today,
  onOpen,
}: {
  company: Company;
  contacts: Contact[];
  today: string;
  onOpen: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data: { type: 'company', company },
  });

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="touch-manipulation cursor-grab active:cursor-grabbing"
      {...listeners}
      {...attributes}
    >
      <CompanyCard
        company={company}
        contacts={contacts}
        today={today}
        dragging={isDragging}
        onOpen={onOpen}
      />
    </div>
  );
}

function KanbanColumn({
  stage,
  companies,
  store,
  today,
  onOpen,
}: {
  stage: Stage;
  companies: Company[];
  store: CrmStore;
  today: string;
  onOpen: (c: Company) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } });

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(72vw,16rem)] shrink-0 flex-col rounded-none border border-[var(--color-line)] border-t-4 bg-[var(--color-panel)]/70 sm:w-64 ${stageAccent(stage)} ${
        isOver ? 'ring-2 ring-teal-600/30' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-stone-700 uppercase">{stage}</h3>
        <span className="rounded-none bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
          {companies.length}
        </span>
      </div>
      <div className="flex min-h-[8rem] max-h-[min(52dvh,28rem)] flex-col gap-2 overflow-y-auto px-2.5 pb-3 kanban-scroll sm:max-h-[calc(100vh-14rem)]">
        {companies.map((c) => (
          <DraggableCard
            key={c.id}
            company={c}
            contacts={store.contacts}
            today={today}
            onOpen={() => onOpen(c)}
          />
        ))}
        {companies.length === 0 ? (
          <p className="px-1 py-6 text-center text-[11px] text-stone-400">Drop cards here</p>
        ) : null}
      </div>
    </div>
  );
}

export function Pipeline({
  store,
  stages,
  discoveryQuestions = [],
  openCompanyId = null,
  onOpenCompanyIdConsumed,
  onEditingCompanyChange,
}: PipelineProps) {
  const [view, setView] = useState<PipelineView>('All Companies');
  const [filters, setFilters] = useState<PipelineFilters>(DEFAULT_PIPELINE_FILTERS);
  const [searchDraft, setSearchDraft] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestOpen, setSuggestOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const [insightsOpen, setInsightsOpen] = useState(true);
  const [editing, setEditing] = useState<Company | null>(null);
  const [creating, setCreating] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const searchWrapRef = useRef<HTMLDivElement>(null);

  const openCompany = (c: Company) => {
    setEditing(c);
    onEditingCompanyChange?.(c.id);
    logViewEvent('company.opened', c.id, c.companyName);
    setSuggestOpen(false);
    setSearchDraft('');
    setSearchQuery('');
  };

  const closeEditing = () => {
    setEditing(null);
    onEditingCompanyChange?.(null);
  };

  useEffect(() => {
    if (!openCompanyId) return;
    const company = store.companies.find((c) => c.id === openCompanyId);
    if (company) {
      setEditing(company);
      logViewEvent('company.opened', company.id, company.companyName);
    }
    onOpenCompanyIdConsumed?.();
  }, [openCompanyId, store.companies, onOpenCompanyIdConsumed]);

  useEffect(() => {
    const id = window.setTimeout(() => setSearchQuery(searchDraft), 200);
    return () => window.clearTimeout(id);
  }, [searchDraft]);

  useEffect(() => {
    if (!suggestOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!searchWrapRef.current?.contains(e.target as Node)) setSuggestOpen(false);
    };
    const timer = window.setTimeout(() => document.addEventListener('mousedown', onDoc), 0);
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('mousedown', onDoc);
    };
  }, [suggestOpen]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } })
  );

  const filtered = useMemo(
    () => applyPipelineFilters(store.companies, view, filters),
    [store.companies, view, filters]
  );

  const suggestions = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return filtered
      .filter((c) => c.companyName.toLowerCase().includes(q))
      .sort((a, b) => a.companyName.localeCompare(b.companyName))
      .slice(0, 12);
  }, [filtered, searchQuery]);

  useEffect(() => {
    setHighlight(0);
  }, [searchQuery]);

  const byStage = useMemo(() => {
    const map = new Map<Stage, Company[]>();
    for (const s of stages) map.set(s, []);
    for (const c of filtered) {
      const list = map.get(c.stage);
      if (list) list.push(c);
      else {
        map.set(c.stage, [c]);
      }
    }
    return map;
  }, [filtered, stages]);

  const boardStages = useMemo(() => {
    const extra = [...byStage.keys()].filter((s) => !stages.includes(s));
    return [...stages, ...extra];
  }, [byStage, stages]);

  const insights = useMemo(
    () => buildPipelineInsights(filtered, store.contacts, stages),
    [filtered, store.contacts, stages]
  );

  const activeCompany = activeId ? (store.companies.find((c) => c.id === activeId) ?? null) : null;

  const today = istToday();
  const filtersActive = pipelineFiltersAreActive(filters);
  const dateLabel =
    PIPELINE_DATE_RANGE_OPTIONS.find((o) => o.value === filters.dateRange)?.label ?? 'All Time';

  const viewCounts = useMemo(() => {
    const map = new Map<PipelineView, number>();
    for (const v of PIPELINE_VIEWS) {
      map.set(v, applyPipelineFilters(store.companies, v, filters).length);
    }
    return map;
  }, [store.companies, filters]);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = e;
    if (!over) return;
    const companyId = String(active.id);
    const stage = resolveDropStage(over.id, store.companies, boardStages);
    if (!stage) return;

    const company = store.companies.find((c) => c.id === companyId);
    if (company && company.stage !== stage) {
      void store.moveCompanyStage(companyId, stage);
    }
  };

  const pickSuggestion = (company: Company) => {
    openCompany(company);
  };

  const onSearchKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Escape') {
      setSuggestOpen(false);
      setSearchDraft('');
      setSearchQuery('');
      return;
    }
    if (!suggestOpen || suggestions.length === 0) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlight((i) => (i + 1) % suggestions.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlight((i) => (i - 1 + suggestions.length) % suggestions.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const pick = suggestions[highlight];
      if (pick) pickSuggestion(pick);
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Pipeline
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            Sales Pipeline
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Search companies, filter by when they were added, and track pipeline progress.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Add company
        </button>
      </header>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
        <div ref={searchWrapRef} className="relative min-w-0 flex-1">
          <SearchInput
            data-testid="pipeline-search"
            value={searchDraft}
            onChange={(v) => {
              setSearchDraft(v);
              setSuggestOpen(true);
            }}
            onFocus={() => setSuggestOpen(true)}
            onKeyDown={onSearchKeyDown}
            placeholder="Search companies…"
          />
          {suggestOpen && searchQuery.trim() ? (
            <div
              data-testid="pipeline-search-suggestions"
              className="absolute top-full right-0 left-0 z-40 mt-1 max-h-64 overflow-auto border border-[var(--color-line)] bg-white shadow-lg"
            >
              {suggestions.length === 0 ? (
                <p className="px-3 py-2 text-xs text-stone-400">No companies found</p>
              ) : (
                suggestions.map((c, i) => (
                  <button
                    key={c.id}
                    type="button"
                    data-testid="pipeline-search-suggestion"
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => pickSuggestion(c)}
                    className={`flex w-full flex-col gap-0.5 px-3 py-2 text-left text-xs transition ${
                      i === highlight ? 'bg-teal-50' : 'hover:bg-stone-50'
                    }`}
                  >
                    <span className="font-medium text-stone-900">{c.companyName}</span>
                    <span className="text-stone-500">
                      {c.stage}
                      {c.createdAt ? ` · Added ${c.createdAt.slice(0, 10)}` : ''}
                    </span>
                  </button>
                ))
              )}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            data-testid="pipeline-date-range"
            label="Added"
            value={filters.dateRange}
            options={PIPELINE_DATE_RANGE_OPTIONS}
            active={filters.dateRange !== 'all'}
            onChange={(v) =>
              setFilters((f) => ({
                ...f,
                dateRange: v as PipelineFilters['dateRange'],
                ...(v !== 'custom' ? { customFrom: null, customTo: null } : {}),
              }))
            }
          />
          {filters.dateRange === 'custom' ? (
            <>
              <label className="flex items-center gap-1.5 text-xs text-stone-600">
                From
                <input
                  data-testid="pipeline-custom-from"
                  type="date"
                  value={filters.customFrom ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      customFrom: e.target.value || null,
                    }))
                  }
                  className={`${inputClass} w-auto py-1.5 text-xs`}
                />
              </label>
              <label className="flex items-center gap-1.5 text-xs text-stone-600">
                To
                <input
                  data-testid="pipeline-custom-to"
                  type="date"
                  value={filters.customTo ?? ''}
                  onChange={(e) =>
                    setFilters((f) => ({
                      ...f,
                      customTo: e.target.value || null,
                    }))
                  }
                  className={`${inputClass} w-auto py-1.5 text-xs`}
                />
              </label>
            </>
          ) : null}
        </div>
      </div>

      {filtersActive ? (
        <div className="flex flex-wrap items-center gap-2">
          <FilterChip
            label={`Added: ${dateLabel}${
              filters.dateRange === 'custom'
                ? ` ${filters.customFrom ?? '…'} → ${filters.customTo ?? '…'}`
                : ''
            }`}
            onClear={() => setFilters(DEFAULT_PIPELINE_FILTERS)}
          />
          <button
            type="button"
            data-testid="pipeline-clear-filters"
            onClick={() => setFilters(DEFAULT_PIPELINE_FILTERS)}
            className="text-xs font-medium text-teal-800 underline-offset-2 hover:underline"
          >
            Clear date filter
          </button>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-1.5 pb-1">
        {PIPELINE_VIEWS.map((v) => (
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
            <span className="ml-1.5 opacity-70">({viewCounts.get(v) ?? 0})</span>
          </button>
        ))}
      </div>

      <section
        data-testid="pipeline-insights"
        className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)]"
      >
        <div className="flex items-center justify-between gap-3 border-b border-[var(--color-line)] px-3 py-2">
          <div>
            <p className="text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
              Pipeline progress
            </p>
            <p className="text-xs text-stone-600">
              {dateLabel}
              {view !== 'All Companies' ? ` · ${view}` : ''}
              {' · '}
              {insights.total} compan{insights.total === 1 ? 'y' : 'ies'}
            </p>
          </div>
          <button
            type="button"
            data-testid="pipeline-insights-toggle"
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
                data-testid="pipeline-insight-total"
                className="rounded-none bg-stone-100 px-2 py-1 text-[11px] font-medium text-stone-800"
              >
                {insights.total} added
              </span>
              <span className="rounded-none bg-sky-50 px-2 py-1 text-[11px] font-medium text-sky-800">
                {insights.contacted} contacted
              </span>
              <span className="rounded-none bg-violet-50 px-2 py-1 text-[11px] font-medium text-violet-800">
                {insights.discoveryDone} discovery done
              </span>
              <span className="rounded-none bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-800">
                {insights.demosScheduled + insights.demosDelivered} demos
              </span>
              <span className="rounded-none bg-amber-50 px-2 py-1 text-[11px] font-medium text-amber-800">
                {insights.proposalsShared} proposals
              </span>
              <span className="rounded-none bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-800">
                {insights.closedWon} won
              </span>
              <span className="rounded-none bg-rose-50 px-2 py-1 text-[11px] font-medium text-rose-800">
                {insights.closedLost} lost
              </span>
            </div>

            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                Conversion
              </p>
              <p className="text-xs text-stone-600">
                Discovery {insights.conversion.toDiscovery}% · Demo {insights.conversion.toDemo}% ·
                Won {insights.conversion.toWon}%
              </p>
            </div>

            {insights.stageCounts.length > 0 ? (
              <div>
                <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                  Stage funnel
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {insights.stageCounts.map(({ stage, count }) => (
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

            <div>
              <p className="mb-1.5 text-[10px] font-semibold tracking-wide text-stone-400 uppercase">
                Contacts on these companies
              </p>
              <div className="flex flex-wrap gap-1.5">
                <span className="rounded-none bg-stone-100 px-2 py-0.5 text-[11px] font-medium text-stone-700">
                  {insights.contactTotal} contacts
                </span>
                <span className="rounded-none bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
                  {insights.champions} champions
                </span>
                {insights.statusCounts.slice(0, 5).map(({ status, count }) => (
                  <span
                    key={status}
                    className={`rounded-none px-2 py-0.5 text-[11px] font-medium ${statusColor(status)}`}
                  >
                    {count} {status}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 kanban-scroll">
          {boardStages.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              companies={byStage.get(stage) ?? []}
              store={store}
              today={today}
              onOpen={openCompany}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCompany ? (
            <div className="w-[min(72vw,16rem)] rotate-1 sm:w-64">
              <CompanyCard company={activeCompany} contacts={store.contacts} today={today} />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal open={creating} title="Add company" onClose={() => setCreating(false)} wide>
        <CompanyForm
          store={store}
          stages={stages}
          discoveryQuestions={discoveryQuestions}
          onDone={() => setCreating(false)}
        />
      </Modal>

      <Modal
        open={!!editing}
        title={editing?.companyName ?? 'Edit company'}
        onClose={closeEditing}
        wide
      >
        {editing ? (
          <CompanyForm
            key={editing.id}
            store={store}
            stages={stages}
            discoveryQuestions={discoveryQuestions}
            initial={editing}
            onDone={closeEditing}
          />
        ) : null}
      </Modal>
    </div>
  );
}
