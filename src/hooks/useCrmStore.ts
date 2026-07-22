import { useCallback, useEffect, useState } from 'react'
import { api } from '../lib/api'
import { resolveAutoMoveStage } from '../lib/championSync'
import { canDeleteRecords } from '../types'
import type {
  Company,
  Contact,
  ContactStatus,
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

/**
 * Response of `PATCH /api/contacts/:id`: the updated contact plus an optional
 * champion auto-move annotation (issue #29). `movedCompanyStage` is the stage
 * the server moved the owning company to, `null` when it applied no move, and
 * absent on servers that predate the field.
 */
type UpdateContactResponse = Contact & { movedCompanyStage?: Stage | null }

interface ChampionMoveInput {
  contact: Pick<Contact, 'companyId' | 'champion' | 'contactStatus'>
  prevContactStatus: ContactStatus | undefined
  statusPatched: boolean
  movedCompanyStage: Stage | null | undefined
}

/**
 * Reconcile a company's Kanban stage after a champion's contact status changes
 * (issue #29), returning the next `companies` array.
 *
 * The server is the source of truth: when the PATCH response carries a non-null
 * `movedCompanyStage`, the owning company is moved to exactly that stage; when
 * it is `null`, the server applied no move and the stage is left untouched.
 * Local derivation from the (possibly stale) local stage is used only as a
 * fallback when the field is absent — an older server that predates it.
 */
export function applyChampionAutoMove(
  companies: Company[],
  { contact, prevContactStatus, statusPatched, movedCompanyStage }: ChampionMoveInput,
): Company[] {
  // Newer server: trust the returned stage (string) or explicit no-move (null).
  if (movedCompanyStage !== undefined) {
    if (typeof movedCompanyStage === 'string' && contact.companyId) {
      const companyId = contact.companyId
      const stage = movedCompanyStage
      return companies.map((c) => (c.id === companyId ? { ...c, stage } : c))
    }
    return companies
  }

  // Older server (field absent): derive the move from the local company stage.
  if (
    statusPatched &&
    prevContactStatus !== undefined &&
    prevContactStatus !== contact.contactStatus &&
    contact.champion &&
    contact.companyId
  ) {
    const company = companies.find((c) => c.id === contact.companyId)
    if (company) {
      const nextStage = resolveAutoMoveStage(company.stage, contact.contactStatus)
      if (nextStage) {
        return companies.map((c) =>
          c.id === company.id ? { ...c, stage: nextStage } : c,
        )
      }
    }
  }
  return companies
}

export function useCrmStore(enabled: boolean, userRole?: string) {
  const [state, setState] = useState<StoreState>({ companies: [], contacts: [] })
  const [metrics, setMetrics] = useState<Metrics>(emptyMetrics)
  const [loading, setLoading] = useState(enabled)
  const [error, setError] = useState<string | null>(null)

  const refreshMetrics = useCallback(async () => {
    setMetrics(await api<Metrics>('/api/metrics'))
  }, [])

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
      await refreshMetrics()
      return company
    },
    [refreshMetrics],
  )

  const updateCompany = useCallback(
    async (id: string, patch: Partial<Company>) => {
      const company = await api<Company>(`/api/companies/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(patch),
      })
      setState((s) => ({
        ...s,
        companies: s.companies.map((c) => (c.id === id ? company : c)),
      }))
      await refreshMetrics()
    },
    [refreshMetrics],
  )

  const deleteCompany = useCallback(
    async (id: string) => {
      await api(`/api/companies/${id}`, { method: 'DELETE' })
      setState((s) => ({
        companies: s.companies.filter((c) => c.id !== id),
        contacts: s.contacts.map((t) =>
          t.companyId === id ? { ...t, companyId: null } : t,
        ),
      }))
      await refreshMetrics()
    },
    [refreshMetrics],
  )

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
      await refreshMetrics()
      return contact
    },
    [refreshMetrics],
  )

  const updateContact = useCallback(
    async (id: string, patch: Partial<Contact>) => {
      const { movedCompanyStage, ...contact } = await api<UpdateContactResponse>(
        `/api/contacts/${id}`,
        { method: 'PATCH', body: JSON.stringify(patch) },
      )
      setState((s) => {
        const prev = s.contacts.find((t) => t.id === id)
        let companies = s.companies
        const contacts = s.contacts.map((t) => (t.id === id ? contact : t))
        if (patch.champion === true && contact.companyId) {
          companies = companies.map((c) =>
            c.id === contact.companyId ? { ...c, primaryContactId: contact.id } : c,
          )
        }
        // Mirror the server's champion auto-move (issue #29) so the board updates
        // without a refetch, preferring the server-returned stage as the source of
        // truth (local derivation stays only as a fallback for older servers).
        companies = applyChampionAutoMove(companies, {
          contact,
          prevContactStatus: prev?.contactStatus,
          statusPatched: patch.contactStatus !== undefined,
          movedCompanyStage,
        })
        return { companies, contacts }
      })
      await refreshMetrics()
    },
    [refreshMetrics],
  )

  const deleteContact = useCallback(
    async (id: string) => {
      await api(`/api/contacts/${id}`, { method: 'DELETE' })
      setState((s) => ({
        companies: s.companies.map((c) =>
          c.primaryContactId === id ? { ...c, primaryContactId: null } : c,
        ),
        contacts: s.contacts.filter((t) => t.id !== id),
      }))
      await refreshMetrics()
    },
    [refreshMetrics],
  )

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

  const canDelete = canDeleteRecords(userRole)

  return {
    companies: state.companies,
    contacts: state.contacts,
    metrics,
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
