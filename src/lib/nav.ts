import type { Page } from '../types'

export const NAV_ITEMS: { id: Page; label: string; hint: string; short: string }[] = [
  { id: 'dashboard', label: 'Dashboard', hint: 'Today at a glance', short: 'Home' },
  { id: 'import', label: 'Import Leads', hint: 'Paste daily table', short: 'Import' },
  { id: 'pipeline', label: 'Sales Pipeline', hint: 'Companies · Kanban', short: 'Pipeline' },
  { id: 'contacts', label: 'Contacts', hint: 'People at companies', short: 'Contacts' },
]

export const PAGE_TITLE: Record<Page, string> = {
  dashboard: 'Dashboard',
  import: 'Import Leads',
  pipeline: 'Sales Pipeline',
  contacts: 'Contacts',
}
