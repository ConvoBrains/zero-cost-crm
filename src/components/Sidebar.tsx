import type { Page } from '../types'
import { navItemsForRole } from '../lib/nav'
import { ConvobrainsBridge } from './ConvobrainsBridge'

interface SidebarProps {
  page: Page
  onNavigate: (page: Page) => void
  onLogout: () => void
  userName: string
  userRole?: string
  className?: string
}

export function Sidebar({
  page,
  onNavigate,
  onLogout,
  userName,
  userRole,
  className = '',
}: SidebarProps) {
  const items = navItemsForRole(userRole)

  return (
    <aside
      className={`flex min-h-0 w-56 shrink-0 flex-col overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-panel)] ${className}`}
    >
      <div className="shrink-0 border-b border-[var(--color-line)] px-5 py-4">
        <img
          src="/convobrains-logo.png"
          alt="ConvoBrains SDR War Room"
          className="h-16 w-full object-contain"
        />
        <p className="mt-2 text-center text-[10px] font-semibold tracking-[0.14em] text-stone-500 uppercase">
          SDR War Room
        </p>
      </div>

      <nav className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto overscroll-contain p-3">
        {items.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`rounded-none px-3 py-2.5 text-left transition ${
                active
                  ? 'bg-teal-700 text-white'
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

      <div className="shrink-0 space-y-3 border-t border-[var(--color-line)] p-4">
        <ConvobrainsBridge />
        <p className="text-[11px] text-stone-500">
          Signed in as <span className="font-medium text-stone-700">{userName}</span>
        </p>
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
