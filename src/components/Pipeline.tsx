import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  useDraggable,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { useMemo, useState } from 'react'
import type { Company, PipelineView, Stage } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import {
  PIPELINE_VIEWS,
  filterCompanies,
  stagesForView,
  intentColor,
  stageAccent,
} from '../lib/views'
import { CompanyForm } from './CompanyForm'
import { Modal, btnPrimary } from './ui'

interface PipelineProps {
  store: CrmStore
}

function CompanyCard({
  company,
  primaryName,
  dragging,
  dragHandleProps,
  onOpen,
}: {
  company: Company
  primaryName?: string
  dragging?: boolean
  dragHandleProps?: Record<string, unknown>
  onOpen?: () => void
}) {
  return (
    <div
      className={`rounded-xl border border-[var(--color-line)] bg-white p-3 text-left shadow-sm transition hover:border-teal-600/40 hover:shadow ${
        dragging ? 'opacity-40' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <button
          type="button"
          onClick={onOpen}
          className="min-w-0 flex-1 text-left"
        >
          <p className="text-sm font-semibold text-stone-900">{company.companyName}</p>
          <p className="mt-1 text-[11px] text-stone-500">
            {[company.industry, company.location].filter(Boolean).join(' · ') || '—'}
          </p>
          {primaryName ? (
            <p className="mt-2 text-[11px] font-medium text-teal-800">★ {primaryName}</p>
          ) : null}
          {company.nextFollowUp ? (
            <p className="mt-1.5 text-[10px] text-stone-400">Follow-up {company.nextFollowUp}</p>
          ) : null}
        </button>
        <div className="flex shrink-0 flex-col items-end gap-1">
          {company.intent ? (
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${intentColor(company.intent)}`}
            >
              {company.intent}
            </span>
          ) : null}
          <button
            type="button"
            className="cursor-grab rounded px-1.5 py-0.5 text-[10px] font-medium text-stone-400 hover:bg-stone-100 hover:text-stone-600 active:cursor-grabbing"
            title="Drag to move stage"
            aria-label={`Drag ${company.companyName}`}
            {...dragHandleProps}
          >
            ⠿
          </button>
        </div>
      </div>
    </div>
  )
}

function DraggableCard({
  company,
  primaryName,
  onOpen,
}: {
  company: Company
  primaryName?: string
  onOpen: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: company.id,
    data: { company },
  })

  const style = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` }
    : undefined

  return (
    <div ref={setNodeRef} style={style}>
      <CompanyCard
        company={company}
        primaryName={primaryName}
        dragging={isDragging}
        onOpen={onOpen}
        dragHandleProps={{ ...listeners, ...attributes }}
      />
    </div>
  )
}

function KanbanColumn({
  stage,
  companies,
  store,
  onOpen,
}: {
  stage: Stage
  companies: Company[]
  store: CrmStore
  onOpen: (c: Company) => void
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage })

  return (
    <div
      ref={setNodeRef}
      className={`flex w-[min(72vw,16rem)] shrink-0 flex-col rounded-2xl border border-[var(--color-line)] border-t-4 bg-[var(--color-panel)]/70 sm:w-64 ${stageAccent(stage)} ${
        isOver ? 'ring-2 ring-teal-600/30' : ''
      }`}
    >
      <div className="flex items-center justify-between px-3 py-2.5">
        <h3 className="text-xs font-semibold tracking-wide text-stone-700 uppercase">
          {stage}
        </h3>
        <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-semibold text-stone-500">
          {companies.length}
        </span>
      </div>
      <div className="flex max-h-[min(52dvh,28rem)] flex-col gap-2 overflow-y-auto px-2.5 pb-3 kanban-scroll sm:max-h-[calc(100vh-14rem)]">
        {companies.map((c) => (
          <DraggableCard
            key={c.id}
            company={c}
            primaryName={store.getContact(c.primaryContactId)?.contactName}
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 6 } }),
  )

  const filtered = useMemo(
    () => filterCompanies(store.companies, view),
    [store.companies, view],
  )
  const columns = stagesForView(view)

  const byStage = useMemo(() => {
    const map = new Map<Stage, Company[]>()
    for (const s of columns) map.set(s, [])
    for (const c of filtered) {
      const list = map.get(c.stage)
      if (list) list.push(c)
    }
    return map
  }, [filtered, columns])

  const activeCompany = activeId
    ? store.companies.find((c) => c.id === activeId) ?? null
    : null

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id))

  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null)
    const { active, over } = e
    if (!over) return
    const companyId = String(active.id)
    let stage = String(over.id) as Stage

    // If dropped on another card, find that card's stage
    if (!columns.includes(stage)) {
      const target = store.companies.find((c) => c.id === stage)
      if (target) stage = target.stage
      else return
    }

    const company = store.companies.find((c) => c.id === companyId)
    if (company && company.stage !== stage) {
      store.moveCompanyStage(companyId, stage)
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Database 1
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
            Sales Pipeline
          </h1>
          <p className="mt-1 text-sm text-stone-500">
            Swipe columns on mobile. Drag ⠿ or tap a card to edit.
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
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition ${
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
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
      >
        <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 kanban-scroll">
          {columns.map((stage) => (
            <KanbanColumn
              key={stage}
              stage={stage}
              companies={byStage.get(stage) ?? []}
              store={store}
              onOpen={setEditing}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCompany ? (
            <div className="w-[min(72vw,16rem)] rotate-1 sm:w-64">
              <CompanyCard
                company={activeCompany}
                primaryName={store.getContact(activeCompany.primaryContactId)?.contactName}
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
