import { useMemo, useState, type ChangeEvent, type FormEvent } from 'react'
import * as XLSX from 'xlsx'
import type { CrmStore } from '../hooks/useCrmStore'
import type { ProspectRow } from '../types'
import {
  PROSPECT_TEMPLATE_CSV,
  parseProspectMatrix,
  parseProspectPaste,
  previewByCompany,
} from '../lib/importProspects'
import { Field, btnPrimary, btnGhost, inputClass } from './ui'

interface ImportLeadsProps {
  store: CrmStore
}

const EXAMPLE = `Company\tProspect Name\tJob Title\tEmail\tPhone\tLocation\tEmployees\tIndustry
Acme Bio Labs\tAlex Example\tHead of Operations\talex@acme-bio.example\t+1 555 010 1001\tAustin, USA\t180\tResearchBiotechnology
Northwind Health\tJordan Sample\tCo-Founder & CEO\tjordan@northwind-health.example\t+1 555 010 1002\tChicago, USA\t230\tHospital & Health Care`

type Mode = 'single' | 'bulk'

const emptySingle = {
  company: '',
  prospectName: '',
  jobTitle: '',
  email: '',
  phone: '',
  location: '',
  employees: '',
  industry: '',
}

function formatResult(result: {
  companiesCreated: number
  companiesUpdated: number
  contactsCreated: number
  contactsSkipped: number
}) {
  return `Done. ${result.companiesCreated} new companies, ${result.companiesUpdated} existing companies updated, ${result.contactsCreated} contacts added, ${result.contactsSkipped} duplicates skipped.`
}

export function ImportLeads({ store }: ImportLeadsProps) {
  const [mode, setMode] = useState<Mode>('bulk')
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState<string | null>(null)
  const [fileRows, setFileRows] = useState<ProspectRow[]>([])
  const [fileErrors, setFileErrors] = useState<string[]>([])
  const [single, setSingle] = useState(emptySingle)
  const [lastResult, setLastResult] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const pasted = useMemo(() => {
    if (!text.trim()) return { rows: [] as ProspectRow[], errors: [] as string[] }
    return parseProspectPaste(text)
  }, [text])

  const bulkRows = fileRows.length > 0 ? fileRows : pasted.rows
  const bulkErrors = fileRows.length > 0 ? fileErrors : pasted.errors
  const byCompany = useMemo(() => previewByCompany(bulkRows), [bulkRows])

  const runBulkImport = async () => {
    if (bulkRows.length === 0) {
      setLastResult('Nothing to import — paste rows or upload a file first.')
      return
    }
    setBusy(true)
    try {
      const result = await store.importProspects(bulkRows)
      setLastResult(formatResult(result))
      setText('')
      setFileName(null)
      setFileRows([])
      setFileErrors([])
    } catch (e) {
      setLastResult(e instanceof Error ? e.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const runSingleImport = async (e: FormEvent) => {
    e.preventDefault()
    if (!single.company.trim() || !single.prospectName.trim()) return
    setBusy(true)
    setLastResult(null)
    try {
      const row: ProspectRow = {
        company: single.company.trim(),
        prospectName: single.prospectName.trim(),
        jobTitle: single.jobTitle.trim(),
        email: single.email.trim().toLowerCase(),
        phone: single.phone.trim(),
        location: single.location.trim(),
        employees: single.employees ? Number(single.employees.replace(/[^0-9]/g, '')) || null : null,
        industry: single.industry.trim(),
      }
      const result = await store.importProspects([row])
      setLastResult(formatResult(result))
      setSingle(emptySingle)
    } catch (err) {
      setLastResult(err instanceof Error ? err.message : 'Import failed')
    } finally {
      setBusy(false)
    }
  }

  const onFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setLastResult(null)
    setText('')
    try {
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const sheet = wb.Sheets[wb.SheetNames[0]]
      if (!sheet) {
        setFileRows([])
        setFileErrors(['No sheet found in file.'])
        setFileName(file.name)
        return
      }
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
        header: 1,
        defval: '',
        raw: false,
      })
      const parsed = parseProspectMatrix(matrix)
      setFileRows(parsed.rows)
      setFileErrors(parsed.errors)
      setFileName(file.name)
    } catch {
      setFileRows([])
      setFileErrors(['Could not read file. Use .csv or .xlsx.'])
      setFileName(file.name)
    }
  }

  const downloadTemplate = () => {
    const blob = new Blob([PROSPECT_TEMPLATE_CSV], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'leads-template.csv'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
          Morning import
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-4xl">
          Import leads
        </h1>
        <p className="mt-2 text-sm text-stone-500">
          Add one lead or import many. Columns:{' '}
          <span className="font-medium text-stone-700">
            Company, Prospect Name, Job Title, Email, Phone, Location, Employees, Industry
          </span>
          . Existing companies are matched by name; duplicate emails are skipped.
        </p>
      </header>

      <div className="flex gap-1 rounded-none border border-[var(--color-line)] bg-stone-50 p-1">
        <button
          type="button"
          className={`flex-1 rounded-none px-3 py-2 text-sm font-medium transition ${
            mode === 'single'
              ? 'bg-white text-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
          onClick={() => setMode('single')}
        >
          Single lead
        </button>
        <button
          type="button"
          className={`flex-1 rounded-none px-3 py-2 text-sm font-medium transition ${
            mode === 'bulk'
              ? 'bg-white text-stone-900'
              : 'text-stone-500 hover:text-stone-800'
          }`}
          onClick={() => setMode('bulk')}
        >
          Bulk import
        </button>
      </div>

      {mode === 'single' ? (
        <form
          onSubmit={runSingleImport}
          className="space-y-4 rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5"
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Company *" className="sm:col-span-2">
              <input
                className={inputClass}
                value={single.company}
                onChange={(e) => setSingle((s) => ({ ...s, company: e.target.value }))}
                required
              />
            </Field>
            <Field label="Prospect name *">
              <input
                className={inputClass}
                value={single.prospectName}
                onChange={(e) => setSingle((s) => ({ ...s, prospectName: e.target.value }))}
                required
              />
            </Field>
            <Field label="Job title">
              <input
                className={inputClass}
                value={single.jobTitle}
                onChange={(e) => setSingle((s) => ({ ...s, jobTitle: e.target.value }))}
              />
            </Field>
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={single.email}
                onChange={(e) => setSingle((s) => ({ ...s, email: e.target.value }))}
              />
            </Field>
            <Field label="Phone">
              <input
                className={inputClass}
                value={single.phone}
                onChange={(e) => setSingle((s) => ({ ...s, phone: e.target.value }))}
              />
            </Field>
            <Field label="Location">
              <input
                className={inputClass}
                value={single.location}
                onChange={(e) => setSingle((s) => ({ ...s, location: e.target.value }))}
              />
            </Field>
            <Field label="Employees">
              <input
                className={inputClass}
                inputMode="numeric"
                value={single.employees}
                onChange={(e) => setSingle((s) => ({ ...s, employees: e.target.value }))}
              />
            </Field>
            <Field label="Industry" className="sm:col-span-2">
              <input
                className={inputClass}
                value={single.industry}
                onChange={(e) => setSingle((s) => ({ ...s, industry: e.target.value }))}
                placeholder="Healthcare, SaaS, …"
              />
            </Field>
          </div>
          <button type="submit" className={btnPrimary} disabled={busy}>
            {busy ? 'Saving…' : 'Add lead'}
          </button>
          {lastResult && mode === 'single' ? (
            <p className="rounded-none bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
              {lastResult}
            </p>
          ) : null}
        </form>
      ) : (
        <>
          <div className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
            <div className="flex flex-wrap items-center gap-2">
              <label className={`${btnGhost} cursor-pointer`}>
                Upload CSV / Excel
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
                  className="hidden"
                  onChange={onFile}
                />
              </label>
              <button type="button" className={btnGhost} onClick={downloadTemplate}>
                Download template
              </button>
              {fileName ? (
                <span className="text-xs text-stone-500">
                  Loaded: {fileName} ({fileRows.length} rows)
                </span>
              ) : null}
            </div>

            <label className="mt-4 block text-sm font-medium text-stone-600">
              Or paste table here
            </label>
            <textarea
              className={`${inputClass} mt-2 min-h-[220px] font-mono text-xs leading-relaxed`}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                setFileName(null)
                setFileRows([])
                setFileErrors([])
                setLastResult(null)
              }}
              placeholder={EXAMPLE}
              spellCheck={false}
            />

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                className={btnPrimary}
                onClick={() => void runBulkImport()}
                disabled={busy}
              >
                {busy
                  ? 'Importing…'
                  : `Import ${bulkRows.length > 0 ? `${bulkRows.length} rows` : ''}`}
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setText('')
                  setFileName(null)
                  setFileRows([])
                  setFileErrors([])
                  setLastResult(null)
                }}
              >
                Clear
              </button>
              <button
                type="button"
                className={btnGhost}
                onClick={() => {
                  setText(EXAMPLE)
                  setFileName(null)
                  setFileRows([])
                  setFileErrors([])
                  setLastResult(null)
                }}
              >
                Load example format
              </button>
            </div>

            {bulkErrors.length > 0 ? (
              <ul className="mt-3 space-y-1 rounded-none bg-amber-50 px-3 py-2 text-xs text-amber-800">
                {bulkErrors.slice(0, 8).map((err) => (
                  <li key={err}>{err}</li>
                ))}
                {bulkErrors.length > 8 ? <li>+{bulkErrors.length - 8} more…</li> : null}
              </ul>
            ) : null}

            {lastResult && mode === 'bulk' ? (
              <p className="mt-3 rounded-none bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                {lastResult}
              </p>
            ) : null}
          </div>

          {byCompany.length > 0 ? (
            <div className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
              <h2 className="text-sm font-semibold text-stone-800">Preview by company</h2>
              <ul className="mt-3 divide-y divide-[var(--color-line)]">
                {byCompany.map((c) => (
                  <li key={c.company} className="flex items-center justify-between py-2 text-sm">
                    <span className="font-medium text-stone-800">{c.company}</span>
                    <span className="text-stone-500">{c.count} contacts</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
    </div>
  )
}
