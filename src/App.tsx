import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import type { Page } from './types';
import { canManageUsers } from './types';
import { useAuth } from './hooks/useAuth';
import { useCrmStore } from './hooks/useCrmStore';
import { Sidebar } from './components/Sidebar';
import { MobileNav } from './components/MobileNav';
import { Dashboard } from './components/Dashboard';
import { Pipeline } from './components/Pipeline';
import { Contacts } from './components/Contacts';
import { ImportLeads } from './components/ImportLeads';
import { Users } from './components/Users';
import { SettingsPage } from './components/SettingsPage';
import { LoginPage } from './components/LoginPage';
import { Skeleton, SkeletonRows } from './components/ui';
import { PAGE_TITLE } from './lib/nav';

/** Admin-only — not in the SDR initial bundle. */
const SdrActivity = lazy(() =>
  import('./components/SdrActivity').then((m) => ({ default: m.SdrActivity }))
);

const ADMIN_ONLY_PAGES: Page[] = ['activity', 'users', 'settings'];
const ALL_PAGES: Page[] = [
  'dashboard',
  'import',
  'pipeline',
  'contacts',
  'activity',
  'users',
  'settings',
];

function readQuery(): { page: Page | null; companyId: string | null } {
  const params = new URLSearchParams(window.location.search);
  const rawPage = params.get('page');
  const page = rawPage && (ALL_PAGES as string[]).includes(rawPage) ? (rawPage as Page) : null;
  const companyId = params.get('companyId');
  return { page, companyId: companyId || null };
}

function writeQuery(page: Page, companyId: string | null) {
  const params = new URLSearchParams();
  params.set('page', page);
  if (companyId) params.set('companyId', companyId);
  const next = `${window.location.pathname}?${params.toString()}`;
  const current = `${window.location.pathname}${window.location.search}`;
  if (next !== current) {
    window.history.replaceState(null, '', next);
  }
}

// Page-shaped skeletons. Each mirrors the real page's layout so that when the
// store resolves the placeholder is filled in rather than swapped out (issue
// #116). They live here, not in ui.tsx, because each one is specific to a page
// that App owns — ui.tsx stays a generic toolbox.
function DashboardSkeleton() {
  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-4 w-full max-w-xl" />
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {Array.from({ length: 5 }, (_, i) => (
          <div
            key={i}
            className="space-y-2 border border-[var(--color-line)] bg-[var(--color-panel)] px-4 py-3"
          >
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-8 w-12" />
          </div>
        ))}
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div
            key={i}
            className="space-y-2 border border-[var(--color-line)] bg-[var(--color-panel)] p-5"
          >
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-44" />
          </div>
        ))}
      </div>
      <div className="space-y-3 border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
        <Skeleton className="h-6 w-56" />
        <SkeletonRows rows={3} />
      </div>
    </div>
  );
}

function ContactsSkeleton() {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-4 w-full max-w-md" />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Skeleton className="h-10 w-full sm:max-w-xs" />
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-8 w-40" />
      </div>
      <Skeleton className="h-4 w-40" />
      <div className="space-y-2 border border-[var(--color-line)] bg-[var(--color-panel)] p-4">
        {Array.from({ length: 8 }, (_, i) => (
          <div key={i} className="flex items-center gap-3">
            <Skeleton className="h-3 flex-1" />
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-20" />
          </div>
        ))}
      </div>
    </div>
  );
}

function PipelineSkeleton({ stages }: { stages: string[] }) {
  return (
    <div className="flex h-full min-h-0 flex-col gap-4">
      <div className="space-y-3 sm:flex-row sm:items-start">
        <div className="flex-1 space-y-2">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-9 w-64" />
        </div>
        <Skeleton className="h-10 w-full sm:max-w-xs" />
      </div>
      <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2 kanban-scroll">
        {stages.map((stage) => (
          <div
            key={stage}
            className="flex w-[min(72vw,16rem)] shrink-0 flex-col rounded-none border border-[var(--color-line)] border-t-4 border-stone-200 bg-[var(--color-panel)]/70 sm:w-64"
          >
            <div className="flex items-center justify-between px-3 py-2.5">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-4 w-6" />
            </div>
            <div className="flex flex-col gap-2 px-2.5 pb-3">
              {Array.from({ length: 2 }, (_, i) => (
                <div key={i} className="space-y-2 border border-[var(--color-line)] bg-white p-3">
                  <Skeleton className="h-3 w-32" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Fallback for pages with no bespoke placeholder (import, users, settings…). */
function PageSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="h-4 w-full max-w-md" />
      <SkeletonRows rows={6} />
    </div>
  );
}

function PageLoadingSkeleton({ page, stages }: { page: Page; stages: string[] }) {
  if (page === 'dashboard') return <DashboardSkeleton />;
  if (page === 'pipeline') return <PipelineSkeleton stages={stages} />;
  if (page === 'contacts') return <ContactsSkeleton />;
  return <PageSkeleton />;
}

export default function App() {
  const auth = useAuth();
  const store = useCrmStore(!!auth.user, auth.user?.role);
  const initialQuery = readQuery();
  const [page, setPage] = useState<Page>(initialQuery.page ?? 'dashboard');
  const [menuOpen, setMenuOpen] = useState(false);
  const [openCompanyId, setOpenCompanyId] = useState<string | null>(initialQuery.companyId);

  const manageUsers = canManageUsers(auth.user?.role);
  const config = auth.config;

  useEffect(() => {
    document.title = config.brandName;
  }, [config.brandName]);

  const navigate = useCallback(
    (next: Page) => {
      if (ADMIN_ONLY_PAGES.includes(next) && !canManageUsers(auth.user?.role)) {
        setPage('dashboard');
        setMenuOpen(false);
        writeQuery('dashboard', null);
        return;
      }
      setPage(next);
      setMenuOpen(false);
      writeQuery(next, next === 'pipeline' ? openCompanyId : null);
    },
    [auth.user?.role, openCompanyId]
  );

  useEffect(() => {
    if (!auth.user) return;
    if (ADMIN_ONLY_PAGES.includes(page) && !canManageUsers(auth.user.role)) {
      setPage('dashboard');
      writeQuery('dashboard', null);
    }
  }, [auth.user, page]);

  // Deep-link: ?page=pipeline&companyId=... (new tab from contact Open company)
  useEffect(() => {
    if (!auth.user || store.loading) return;
    const { page: qPage, companyId } = readQuery();
    if (qPage) {
      if (ADMIN_ONLY_PAGES.includes(qPage) && !canManageUsers(auth.user.role)) {
        setPage('dashboard');
        return;
      }
      setPage(qPage);
    }
    if (companyId) {
      setPage('pipeline');
      setOpenCompanyId(companyId);
    }
  }, [auth.user, store.loading]);

  useEffect(() => {
    const onPop = () => {
      const { page: qPage, companyId } = readQuery();
      if (qPage) setPage(qPage);
      setOpenCompanyId(companyId);
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  if (!auth.ready) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center text-sm text-stone-500">
        Loading…
      </div>
    );
  }

  if (!auth.user) {
    return (
      <LoginPage
        error={auth.error}
        onLogin={auth.login}
        allowedEmailDomain={auth.allowedEmailDomain}
        allowAnyEmailDomain={auth.allowAnyEmailDomain}
        brandName={config.brandName}
        brandTagline={config.brandTagline}
        logoUrl={config.logoUrl}
      />
    );
  }

  // NOTE: no `if (store.loading) return …` gate here. Blocking the whole app
  // while the store loads is what produced the blank flash described in issue
  // #116; the shell (sidebar, header, nav) now paints immediately and only the
  // data area below is swapped for a page-shaped skeleton.
  return (
    <div className="flex min-h-[100dvh] flex-col lg:flex-row">
      {auth.idleWarnSeconds != null ? (
        <div className="fixed inset-x-0 top-0 z-[60] bg-amber-600 px-4 py-2 text-center text-sm font-medium text-white">
          You will be signed out soon due to inactivity — move the mouse or press a key to stay
          signed in ({auth.idleWarnSeconds}s)
        </div>
      ) : null}
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
          src={config.logoUrl}
          alt={config.brandName}
          className="h-9 w-9 shrink-0 rounded-none object-cover"
        />
      </header>

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
              brandName={config.brandName}
              logoUrl={config.logoUrl}
              className="h-full w-full"
            />
          </div>
        </div>
      ) : null}

      <Sidebar
        page={page}
        onNavigate={navigate}
        userName={auth.user.name}
        userRole={auth.user.role}
        onLogout={() => void auth.logout()}
        brandName={config.brandName}
        logoUrl={config.logoUrl}
        className="sticky top-0 hidden h-[100dvh] lg:flex"
      />

      <main
        aria-busy={store.loading}
        className="min-w-0 flex-1 overflow-auto p-4 pb-24 sm:p-6 lg:p-8 lg:pb-8"
      >
        {store.loading ? (
          <p role="status" className="sr-only">
            Loading your CRM…
          </p>
        ) : null}
        {store.error ? (
          <p role="alert" className="mb-4 rounded-none bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {store.error}
          </p>
        ) : null}
        {store.loading ? (
          <div data-testid="page-skeleton">
            <PageLoadingSkeleton page={page} stages={config.stages} />
          </div>
        ) : (
          <>
            {page === 'dashboard' ? (
              <Dashboard
                store={store}
                onNavigate={navigate}
                canManageUsers={manageUsers}
                brandName={config.brandName}
              />
            ) : null}
            {page === 'import' ? <ImportLeads store={store} /> : null}
            {page === 'pipeline' ? (
              <Pipeline
                store={store}
                stages={config.stages}
                discoveryQuestions={config.discoveryQuestions}
                openCompanyId={openCompanyId}
                onOpenCompanyIdConsumed={() => setOpenCompanyId(null)}
                onEditingCompanyChange={(companyId) => {
                  writeQuery('pipeline', companyId);
                }}
              />
            ) : null}
            {page === 'contacts' ? (
              <Contacts
                store={store}
                contactStatuses={config.contactStatuses}
                stages={config.stages}
              />
            ) : null}
            {page === 'activity' && manageUsers ? (
              <Suspense fallback={<p className="text-sm text-stone-500">Loading…</p>}>
                <SdrActivity />
              </Suspense>
            ) : null}
            {page === 'users' && manageUsers ? <Users /> : null}
            {page === 'settings' && manageUsers ? (
              <SettingsPage config={config} onSaved={auth.refreshConfig} />
            ) : null}
          </>
        )}
      </main>

      <MobileNav page={page} onNavigate={navigate} userRole={auth.user.role} />
    </div>
  );
}
