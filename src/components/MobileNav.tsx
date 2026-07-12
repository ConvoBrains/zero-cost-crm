import type { Page } from '../types'
import { navItemsForRole } from '../lib/nav'

interface MobileNavProps {
  page: Page
  onNavigate: (page: Page) => void
  userRole?: string
}

export function MobileNav({ page, onNavigate, userRole }: MobileNavProps) {
  const items = navItemsForRole(userRole)

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-panel)]/95 backdrop-blur-md lg:hidden"
      style={{ paddingBottom: 'max(0.5rem, env(safe-area-inset-bottom))' }}
    >
      <div className="mx-auto flex max-w-lg">
        {items.map((item) => {
          const active = page === item.id
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => onNavigate(item.id)}
              className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 px-1 py-2 text-[10px] font-semibold transition ${
                active ? 'text-teal-700' : 'text-stone-500'
              }`}
            >
              <span
                className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-bold ${
                  active ? 'bg-teal-700 text-white' : 'bg-stone-100 text-stone-600'
                }`}
              >
                {item.short.charAt(0)}
              </span>
              {item.short}
            </button>
          )
        })}
      </div>
    </nav>
  )
}
