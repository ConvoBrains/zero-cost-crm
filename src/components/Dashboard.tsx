import type { CrmStore } from '../hooks/useCrmStore'
import type { Page } from '../types'
import { btnPrimary, btnGhost } from './ui'
import { ConvobrainsBridge } from './ConvobrainsBridge'

interface DashboardProps {
  store: CrmStore
  onNavigate: (page: Page) => void
  canManageUsers?: boolean
}

export function Dashboard({ store, onNavigate, canManageUsers }: DashboardProps) {
  const { metrics } = store
  const today = new Date().toISOString().slice(0, 10)

  const summary = [
    { label: 'Total Companies', value: metrics.totalCompanies },
    { label: 'Total Contacts', value: metrics.totalContacts },
    { label: 'Active Opportunities', value: metrics.activeOpportunities },
    { label: 'Deals Won', value: metrics.closedWon },
    { label: 'Deals Lost', value: metrics.closedLost },
  ]

  const panels = [
    {
      title: 'New Leads',
      count: metrics.newLeads,
      blurb: 'Companies waiting for first outreach',
      action: () => onNavigate('pipeline'),
    },
    {
      title: 'Follow-ups Due Today',
      count: metrics.followUpsDueToday,
      blurb: 'Next follow-up date is today',
      action: () => onNavigate('pipeline'),
    },
    {
      title: 'Demo Scheduled',
      count: metrics.demoScheduled,
      blurb: 'Demos on the calendar',
      action: () => onNavigate('pipeline'),
    },
    {
      title: 'Active Opportunities',
      count: metrics.activeOpportunities,
      blurb: 'Open deals in motion',
      action: () => onNavigate('pipeline'),
    },
    {
      title: 'Closed Won',
      count: metrics.closedWon,
      blurb: 'Signed and celebrated',
      action: () => onNavigate('pipeline'),
    },
    {
      title: 'Closed Lost',
      count: metrics.closedLost,
      blurb: 'Where deals died — dig into why next',
      action: () => onNavigate('pipeline'),
    },
  ]

  const dueToday = store.companies.filter((c) => c.nextFollowUp === today)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Zero Cost CRM · Morning brief
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-5xl">
            SDR Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-stone-500">
            Start here each day. Clear follow-ups, work the pipeline, update contacts after
            every call — then coach from the activity board.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {canManageUsers ? (
            <button type="button" className={btnGhost} onClick={() => onNavigate('users')}>
              Add users
            </button>
          ) : null}
          <button type="button" className={btnGhost} onClick={() => onNavigate('import')}>
            Import leads
          </button>
          <button type="button" className={btnGhost} onClick={() => onNavigate('contacts')}>
            Open Contacts
          </button>
          <button type="button" className={btnPrimary} onClick={() => onNavigate('pipeline')}>
            Open Pipeline
          </button>
        </div>
      </header>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {summary.map((s) => (
          <div
            key={s.label}
            className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
          >
            <p className="text-[11px] font-medium tracking-wide text-stone-500 uppercase">
              {s.label}
            </p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900">
              {s.value}
            </p>
          </div>
        ))}
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {panels.map((p) => (
          <button
            key={p.title}
            type="button"
            onClick={p.action}
            className="group rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5 text-left transition hover:border-teal-700"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-stone-800">{p.title}</p>
                <p className="mt-1 text-xs text-stone-500">{p.blurb}</p>
              </div>
              <span className="font-[family-name:var(--font-display)] text-3xl text-teal-800 transition group-hover:scale-105">
                {p.count}
              </span>
            </div>
          </button>
        ))}
      </section>

      <section className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
            Follow-ups due today
          </h2>
          <span className="text-xs text-stone-400">{today}</span>
        </div>
        {dueToday.length === 0 ? (
          <p className="text-sm text-stone-500">Nothing due today — nice work.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)]">
            {dueToday.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold text-stone-800">{c.companyName}</p>
                  <p className="text-xs text-stone-500">
                    {c.stage}
                    {c.intent ? ` · ${c.intent}` : ''}
                  </p>
                </div>
                <button
                  type="button"
                  className="text-xs font-medium text-teal-700 hover:underline"
                  onClick={() => onNavigate('pipeline')}
                >
                  Open pipeline
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-none border border-dashed border-teal-700/30 bg-teal-50/50 p-5">
        <h2 className="text-sm font-semibold text-teal-900">Daily CRM ritual</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-teal-900/80">
          <li>Import or assign fresh companies into the pipeline.</li>
          <li>Add 5–10 contacts per company.</li>
          <li>Call, update Contact Status, set follow-ups immediately.</li>
          <li>When interested → mark Champion and Primary Contact.</li>
          <li>Move the company only when the real stage changed.</li>
          <li>Managers: review Activity alerts before noon.</li>
        </ol>
      </section>

      {metrics.closedLost > 0 ? <ConvobrainsBridge variant="lost" /> : <ConvobrainsBridge variant="panel" />}
    </div>
  )
}
