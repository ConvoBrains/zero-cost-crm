import { useMemo, useState } from 'react'
import type { CrmStore } from '../hooks/useCrmStore'
import { parseProspectPaste, previewByCompany } from '../lib/importProspects'
import { btnPrimary, btnGhost, inputClass } from './ui'

interface ImportLeadsProps {
  store: CrmStore
}

const EXAMPLE = `Company\tProspect Name\tJob Title\tEmail\tPhone\tLocation\tEmployees\tIndustry
Acme Bio Labs\tAlex Example\tHead of Operations\talex@acme-bio.example\t+1 555 010 1001\tAustin, USA\t180\tResearchBiotechnology
Northwind Health\tJordan Sample\tCo-Founder & CEO\tjordan@northwind-health.example\t+1 555 010 1002\tChicago, USA\t230\tHospital & Health Care`

export function ImportLeads({ store }: ImportLeadsProps) {
  const [text, setText] = useState('')
  const [lastResult, setLastResult] = useState<string | null>(null)

  const parsed = useMemo(() => {
    if (!text.trim()) return { rows: [], errors: [] as string[] }
    return parseProspectPaste(text)
  }, [text])
  const byCompany = useMemo(() => previewByCompany(parsed.rows), [parsed.rows])

  const runImport = async () => {
    if (parsed.rows.length === 0) {
      setLastResult('Nothing to import — paste rows first.')
      return
    }
    const result = await store.importProspects(parsed.rows)
    setLastResult(
      `Done. ${result.companiesCreated} new companies, ${result.companiesUpdated} existing companies updated, ${result.contactsCreated} contacts added, ${result.contactsSkipped} duplicates skipped.`,
    )
    setText('')
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
          Paste today&apos;s prospect table from Excel / Sheets / LinkedIn. Columns:{' '}
          <span className="font-medium text-stone-700">
            Company, Prospect Name, Job Title, Email, Phone, Location, Employees, Industry
          </span>
          . Existing companies are matched by name; duplicate emails are skipped.
        </p>
      </header>

      <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
        <label className="block text-sm font-medium text-stone-600">Paste table here</label>
        <textarea
          className={`${inputClass} mt-2 min-h-[220px] font-mono text-xs leading-relaxed`}
          value={text}
          onChange={(e) => {
            setText(e.target.value)
            setLastResult(null)
          }}
          placeholder={EXAMPLE}
          spellCheck={false}
        />

        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" className={btnPrimary} onClick={runImport}>
            Import {parsed.rows.length > 0 ? `${parsed.rows.length} rows` : ''}
          </button>
          <button type="button" className={btnGhost} onClick={() => setText('')}>
            Clear
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setText(EXAMPLE)
              setLastResult(null)
            }}
          >
            Load example format
          </button>
        </div>

        {parsed.errors.length > 0 ? (
          <ul className="mt-3 space-y-1 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {parsed.errors.slice(0, 8).map((err) => (
              <li key={err}>{err}</li>
            ))}
            {parsed.errors.length > 8 ? (
              <li>+{parsed.errors.length - 8} more…</li>
            ) : null}
          </ul>
        ) : null}

        {lastResult ? (
          <p className="mt-3 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            {lastResult}
          </p>
        ) : null}
      </div>

      {byCompany.length > 0 ? (
        <div className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
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
    </div>
  )
}
