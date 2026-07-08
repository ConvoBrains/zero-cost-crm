import type { Page } from '../types'
import { NAV_ITEMS } from '../lib/nav'

interface SidebarProps {
  page: Page
  onNavigate: (page: Page) => void
  onLogout: () => void
  userName: string
  className?: string
}

export function Sidebar({ page, onNavigate, onLogout, userName, className = '' }: SidebarProps) {
  return (
    <aside
      className={`flex w-56 shrink-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-panel)]/80 backdrop-blur-sm ${className}`}
    >
      <div className="border-b border-[var(--color-line)] px-5 py-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-teal-700 text-sm font-bold text-teal-50">
            CB
          </div>
          <div>
            <p className="font-[family-name:var(--font-display)] text-xl leading-none text-stone-900">
              Convobrains
            </p>
            <p className="mt-0.5 text-[11px] font-medium tracking-wide text-stone-500 uppercase">
              Sales CRM
            </p>
          </div>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV_ITEMS.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-xl px-3 py-2.5 text-left transition ${
                active
                  ? 'bg-teal-700 text-white shadow-sm'
                  : 'text-stone-700 hover:bg-stone-100'
              }`}
            >
              <span className="block text-sm font-semibold">{item.label}</span>
              <span
                className={`block text-[11px] ${active ? 'text-teal-100' : 'text-stone-400'}`}
              >
                {item.hint}
              </span>
            </button>
          )
        })}
      </nav>

      <div className="space-y-2 border-t border-[var(--color-line)] p-4">
        <p className="text-[11px] text-stone-500">
          Signed in as <span className="font-medium text-stone-700">{userName}</span>
        </p>
        <p className="text-[11px] text-stone-400">Connected to PostgreSQL</p>
        <button
          type="button"
          onClick={onLogout}
          className="block text-xs font-medium text-stone-500 underline-offset-2 hover:text-rose-700 hover:underline"
        >
          Log out
        </button>
      </div>
    </aside>
  )
}
