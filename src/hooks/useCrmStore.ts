import { useCallback, useEffect, useMemo, useState } from 'react'
import { api } from '../lib/api'
import { canDeleteRecords } from '../types'
import type {
  Company,
  Contact,
  ImportResult,
  ProspectRow,
  Stage,
} from '../types'

interface StoreState {
  companies: Company[]
  contacts: Contact[]
}

interface Metrics {
  totalCompanies: number
  totalContacts: number
  newLeads: number
  followUpsDueToday: number
  demoScheduled: number
  activeOpportunities: number
  closedWon: number
  closedLost: number
}

const emptyMetrics: Metrics = {
  totalCompanies: 0,
  totalContacts: 0,
  newLeads: 0,
  followUpsDueToday: 0,
  demoScheduled: 0,
  activeOpportunities: 0,
  closedWon: 0,
  closedLost: 0,
}

export function useCrmStore(enabled: boolean, userRole?: string) {
  const [state, setState] = useState<StoreState>({ companies: [], contacts: [] })
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const [boot, m] = await Promise.all([
      api<{ companies: Company[]; contacts: Contact[] }>('/api/bootstrap'),
      api<Metrics>('/api/metrics'),
    ])
    setState({ companies: boot.companies, contacts: boot.contacts })
    setMetrics(m)
  }, [])

  useEffect(() => {
    if (!enabled) {
      setState({ companies: [], contacts: [] })
      setMetrics(emptyMetrics)
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    refresh()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load data'))
      .finally(() => setLoading(false))
  }, [enabled, refresh])

  const addCompany = useCallback(
    async (partial: Partial<Company> & { companyName: string }) => {
      const company = await api<Company>('/api/companies', {
        method: 'POST',
        body: JSON.stringify(partial),
      })
      setState((s) => ({ ...s, companies: [company, ...s.companies] }))
      const m = await api<Metrics>('/api/metrics')
      setMetrics(m)
      return company
    },
    [],
  )

  const updateCompany = useCallback(async (id: string, patch: Partial<Company>) => {
    const company = await api<Company>(`/api/companies/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setState((s) => ({
      ...s,
      companies: s.companies.map((c) => (c.id === id ? company : c)),
    }))
    const m = await api<Metrics>('/api/metrics')
    setMetrics(m)
  }, [])

  const deleteCompany = useCallback(async (id: string) => {
    await api(`/api/companies/${id}`, { method: 'DELETE' })
    setState((s) => ({
      companies: s.companies.filter((c) => c.id !== id),
      contacts: s.contacts.map((t) =>
        t.companyId === id ? { ...t, companyId: null } : t,
      ),
    }))
    const m = await api<Metrics>('/api/metrics')
    setMetrics(m)
  }, [])

  const moveCompanyStage = useCallback(
    async (id: string, stage: Stage) => {
      await updateCompany(id, { stage })
    },
    [updateCompany],
  )

  const addContact = useCallback(
    async (partial: Partial<Contact> & { contactName: string }) => {
      const contact = await api<Contact>('/api/contacts', {
        method: 'POST',
        body: JSON.stringify(partial),
      })
      setState((s) => {
        let companies = s.companies
        if (contact.champion && contact.companyId) {
          companies = companies.map((c) =>
            c.id === contact.companyId ? { ...c, primaryContactId: contact.id } : c,
          )
        }
        return { companies, contacts: [contact, ...s.contacts] }
      })
      const m = await api<Metrics>('/api/metrics')
      setMetrics(m)
      return contact
    },
    [],
  )

  const updateContact = useCallback(async (id: string, patch: Partial<Contact>) => {
    const contact = await api<Contact>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(patch),
    })
    setState((s) => {
      let companies = s.companies
      const contacts = s.contacts.map((t) => (t.id === id ? contact : t))
      if (patch.champion === true && contact.companyId) {
        companies = companies.map((c) =>
          c.id === contact.companyId ? { ...c, primaryContactId: contact.id } : c,
        )
      }
      return { companies, contacts }
    })
    const m = await api<Metrics>('/api/metrics')
    setMetrics(m)
  }, [])

  const deleteContact = useCallback(async (id: string) => {
    await api(`/api/contacts/${id}`, { method: 'DELETE' })
    setState((s) => ({
      companies: s.companies.map((c) =>
        c.primaryContactId === id ? { ...c, primaryContactId: null } : c,
      ),
      contacts: s.contacts.filter((t) => t.id !== id),
    }))
    const m = await api<Metrics>('/api/metrics')
    setMetrics(m)
  }, [])

  const importProspects = useCallback(async (rows: ProspectRow[]): Promise<ImportResult> => {
    const result = await api<ImportResult>('/api/import/prospects', {
      method: 'POST',
      body: JSON.stringify({ rows }),
    })
    await refresh()
    return result
  }, [refresh])

  const getContact = useCallback(
    (id: string | null) =>
      id ? (state.contacts.find((t) => t.id === id) ?? null) : null,
    [state.contacts],
  )

  const getCompany = useCallback(
    (id: string | null) =>
      id ? (state.companies.find((c) => c.id === id) ?? null) : null,
    [state.companies],
  )

  const metricsMemo = useMemo(() => metrics, [metrics])
  const canDelete = canDeleteRecords(userRole)

  return {
    companies: state.companies,
    contacts: state.contacts,
    metrics: metricsMemo,
    loading,
    error,
    canDelete,
    addCompany,
    updateCompany,
    deleteCompany,
    moveCompanyStage,
    addContact,
    updateContact,
    deleteContact,
    importProspects,
    getContact,
    getCompany,
    refresh,
  }
}

export type CrmStore = ReturnType<typeof useCrmStore>
