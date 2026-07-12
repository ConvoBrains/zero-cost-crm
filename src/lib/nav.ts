import type { Page } from '../types'

export const NAV_ITEMS: { id: Page; label: string; hint: string; short: string; adminOnly?: boolean }[] = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Today at a glance', short: 'Home' },
  { id: 'import', label: 'Import Leads', hint: 'Paste daily table', short: 'Import' },
  { id: 'pipeline', label: 'Sales Pipeline', hint: 'Companies · Kanban', short: 'Pipeline' },
  { id: 'contacts', label: 'Contacts', hint: 'People at companies', short: 'Contacts' },
  { id: 'users', label: 'Users', hint: 'Add team accounts', short: 'Users', adminOnly: true },
]

export const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard',
  import: 'Import Leads',
  pipeline: 'Sales Pipeline',
  contacts: 'Contacts',
  users: 'Users',
}

export function navItemsForRole(role?: string) {
  return NAV_ITEMS.filter((item) => !item.adminOnly || role === 'admin' || role === 'founder')
}
