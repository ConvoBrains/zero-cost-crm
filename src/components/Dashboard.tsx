import type { CrmStore } from '../hooks/useCrmStore'
import type { Page } from '../types'
import { btnPrimary, btnGhost } from './ui'

interface DashboardProps {
  store: CrmStore
  onNavigate: (page: Page) => void
}

export function Dashboard({ store, onNavigate }: DashboardProps) {
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
      blurb: 'Parked for learning',
      action: () => onNavigate('pipeline'),
    },
  ]

  const dueToday = store.companies.filter((c) => c.nextFollowUp === today)

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
            Morning brief
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-5xl">
            Sales Dashboard
          </h1>
          <p className="mt-2 max-w-xl text-sm text-stone-500">
            Start here each day. Check follow-ups, then work the pipeline and update contacts
            after every call.
          </p>
        </div>
        <div className="flex gap-2">
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
            className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
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
            className="group rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5 text-left transition hover:border-teal-600/40 hover:shadow-md hover:shadow-teal-900/5"
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

      <section className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
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
                  Open pipeline →
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-2xl border border-dashed border-teal-700/30 bg-teal-50/50 p-5">
        <h2 className="text-sm font-semibold text-teal-900">Daily workflow (simple)</h2>
        <ol className="mt-3 list-decimal space-y-1.5 pl-5 text-sm text-teal-900/80">
          <li>Founder imports new companies into Sales Pipeline.</li>
          <li>Add 5–10 contacts per company.</li>
          <li>Call contacts and update each Contact Status.</li>
          <li>
            When someone is interested → check Champion, set them as Primary Contact.
          </li>
          <li>Move the company card across stages until Closed Won / Lost / Not Interested.</li>
        </ol>
      </section>
    </div>
  )
}
