import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import type { Page } from './types'
import { canManageUsers } from './types'
import { useAuth } from './hooks/useAuth'
import { useCrmStore } from './hooks/useCrmStore'
import { Sidebar } from './components/Sidebar'
import { MobileNav } from './components/MobileNav'
import { Dashboard } from './components/Dashboard'
import { Pipeline } from './components/Pipeline'
import { Contacts } from './components/Contacts'
import { ImportLeads } from './components/ImportLeads'
import { Users } from './components/Users'
import { LoginPage } from './components/LoginPage'
import { PAGE_TITLE } from './lib/nav'

/** Admin-only — not in the SDR initial bundle. */
const SdrActivity = lazy(() =>
  import('./components/SdrActivity').then((m) => ({ default: m.SdrActivity })),
)

const ADMIN_ONLY_PAGES: Page[] = ['activity', 'users']

export default function App() {
  const auth = useAuth()
  const store = useCrmStore(!!auth.user, auth.user?.role)
  const [page, setPage] = useState<Page>('dashboard')
  const [menuOpen, setMenuOpen] = useState(false)

  const manageUsers = canManageUsers(auth.user?.role)

  const navigate = useCallback(
    (next: Page) => {
      if (ADMIN_ONLY_PAGES.includes(next) && !canManageUsers(auth.user?.role)) {
        setPage('dashboard')
        setMenuOpen(false)
        return
      }
      setPage(next)
      setMenuOpen(false)
    },
    [auth.user?.role],
  )

  // Never leave SDRs on admin-only pages (no Activity UI, no "access denied" messaging).
  useEffect(() => {
    if (!auth.user) return
    if (ADMIN_ONLY_PAGES.includes(page) && !canManageUsers(auth.user.role)) {
      setPage('dashboard')
    }
  }, [auth.user, page])

  if (!auth.ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-stone-500">
        Loading…
      </div>
    )
  }

  if (!auth.user) {
    return <LoginPage error={auth.error} onLogin={auth.login} />
  }

  if (store.loading) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-stone-500">
        Loading pipeline…
      </div>
    )
  }

  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {auth.idleWarnSeconds != null ? (
        <div className="fixed inset-x-0 top-0 z-[60] bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white">
          You will be signed out soon due to inactivity — move the mouse or press a key to stay signed in ({auth.idleWarnSeconds}s)
        </div>
      ) : null}
      {/* Mobile top bar */}
      <header
        className="sticky top-0 z-30 flex items-center gap-3 border-b border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3 lg:hidden"
        style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
      >
        <button
          type="button"
          onClick={() => setMenuOpen(true)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-none border border-[var(--color-line)] bg-white text-stone-700"
          aria-label="Open menu"
        >
          <span className="text-lg leading-none">☰</span>
        </button>
        <div className="min-w-0 flex-1">
          <p className="truncate font-[family-name:var(--font-display)] text-lg text-stone-900">
            {PAGE_TITLE[page]}
          </p>
          <p className="truncate text-[11px] text-stone-500">{auth.user.name}</p>
        </div>
        <img
          src="/convobrains-mark.png"
          alt="ConvoBrains"
          className="h-9 w-9 shrink-0 rounded-none object-cover"
        />
      </header>

      {/* Mobile drawer */}
      {menuOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-stone-900/40"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[min(85vw,14rem)] overflow-hidden border-r border-[var(--color-line)]">
            <Sidebar
              page={page}
              onNavigate={navigate}
              userName={auth.user.name}
              userRole={auth.user.role}
              onLogout={() => void auth.logout()}
              className="h-full w-full"
            />
          </div>
        </div>
      ) : null}

      {/* Desktop sidebar */}
      <Sidebar
        page={page}
        onNavigate={navigate}
        userName={auth.user.name}
        userRole={auth.user.role}
        onLogout={() => void auth.logout()}
        className="sticky top-0 hidden h-[100dvh] lg:flex"
      />

      <main className="min-w-0 flex-1 overflow-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8">
        {store.error ? (
          <p className="mb-4 rounded-none bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {store.error}
          </p>
        ) : null}
        {page === 'dashboard' ? (
          <Dashboard store={store} onNavigate={navigate} canManageUsers={manageUsers} />
        ) : null}
        {page === 'import' ? <ImportLeads store={store} /> : null}
        {page === 'pipeline' ? <Pipeline store={store} /> : null}
        {page === 'contacts' ? <Contacts store={store} /> : null}
        {page === 'activity' && manageUsers ? (
          <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
            <SdrActivity />
          </Suspense>
        ) : null}
        {page === 'users' && manageUsers ? <Users /> : null}
      </main>

      <MobileNav page={page} onNavigate={navigate} userRole={auth.user.role} />
    </div>
  )
}
