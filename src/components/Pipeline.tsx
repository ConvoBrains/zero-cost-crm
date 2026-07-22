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
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import type { Company, Contact, PipelineView, Stage } from '../types'
import { STAGES } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import { PIPELINE_VIEWS, filterCompanies, intentColor, stageAccent } from '../lib/views'
import { buildCardBadges, buildChampionTrail, findChampion, istToday } from '../lib/championCard'
import { logViewEvent } from '../lib/activity'
import { CompanyForm } from './CompanyForm'
import { Modal, btnPrimary } from './ui'

interface PipelineProps {
  store: CrmStore
}

const ALL_STAGES = [...STAGES]

function resolveDropStage(overId: string | number, companies: Company[]): Stage | null {
  const id = String(overId)
  if ((STAGES as readonly string[]).includes(id)) return id as Stage
  const target = companies.find((c) => c.id === id)
  return target?.stage ?? null
}

function CompanyCard({
  company,
  contacts,
  today,
  dragging,
  onOpen,
}: {
  company: Company
  contacts: Contact[]
  today: string
  dragging?: boolean
  onOpen?: () => void
}) {
  const badges = buildCardBadges(company, contacts, today)
  const trail = buildChampionTrail(findChampion(contacts, company.id))

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
              {trail.note ? (
                <p className="text-[10px] text-stone-500">{trail.note}</p>
              ) : null}
              {trail.followUp ? (
                <p className="text-[10px] text-stone-400">{trail.followUp}</p>
              ) : null}
            </div>
          ) : null}
          {company.nextFollowUp ? (
            <p className="mt-1.5 text-[10px] text-stone-400">Follow-up {company.nextFollowUp}</p>
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
  )
}

function DraggableCard({
  company,
  contacts,
  today,
  onOpen,
}: {
  company: Company
  contacts: Contact[]
  today: string
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data: { type: 'company', company },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

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
  )
}

function KanbanColumn({
  stage,
  companies,
  store,
  today,
  onOpen,
}: {
  stage: Stage
  companies: Company[]
  store: CrmStore
  today: string
  onOpen: (c: Company) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage, data: { type: 'column', stage } })

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(72vw,16rem)] shrink-0 flex-col rounded-none border border-[var(--color-line)] border-t-4 bg-[var(--color-panel)]/70 sm:w-64 ${stageAccent(stage)} ${
        isOver ? 'ring-2 ring-teal-600/30' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-stone-700 uppercase">
          {stage}
        </h3>
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
  )
}

export function Pipeline({ store }: PipelineProps) {
  const [view, setView] = useState<PipelineView>('All Companies')
  const [editing, setEditing] = useState<Company | null>(null)
  const [creating, setCreating] = useState(false)
  const [activeId, setActiveId] = useState<string | null>(null)

  const openCompany = (c: Company) => {
    setEditing(c)
    logViewEvent('company.opened', c.id, c.companyName)
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 8 } }),
  )

  const filtered = useMemo(
    () => filterCompanies(store.companies, view),
    [store.companies, view],
  )

  const byStage = useMemo(() => {
    const map = new Map<Stage, Company[]>()
    for (const s of ALL_STAGES) map.set(s, [])
    for (const c of filtered) {
      const list = map.get(c.stage)
      if (list) list.push(c)
    }
    return map
  }, [filtered])

  const activeCompany = activeId
    ? store.companies.find((c) => c.id === activeId) ?? null
    : null

  // Compute once per board render so every card's badges share one reference date.
  // Uses the Asia/Kolkata calendar day so the "Due today" badge and the champion
  // follow-up line (also IST-formatted) agree near midnight.
  const today = istToday()

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const companyId = String(active.id)
    const stage = resolveDropStage(over.id, store.companies)
    if (!stage) return

    const company = store.companies.find((c) => c.id === companyId)
    if (company && company.stage !== stage) {
      void store.moveCompanyStage(companyId, stage)
    }
  }

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
            Drag a card to any column to change stage. Tap the company name to edit.
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={() => setCreating(true)}>
          + Add company
        </button>
      </header>

      <div className="flex gap-1.5 overflow-x-auto pb-1 kanban-scroll">
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
          </button>
        ))}
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 kanban-scroll">
          {ALL_STAGES.map((stage) => (
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
              <CompanyCard
                company={activeCompany}
                contacts={store.contacts}
                today={today}
              />
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      <Modal open={creating} title="Add company" onClose={() => setCreating(false)} wide>
        <CompanyForm store={store} onDone={() => setCreating(false)} />
      </Modal>

      <Modal
        open={!!editing}
        title={editing?.companyName ?? 'Edit company'}
        onClose={() => setEditing(null)}
        wide
      >
        {editing ? (
          <CompanyForm
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
