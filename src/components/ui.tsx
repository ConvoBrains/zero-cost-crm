import { useEffect, useId, useRef, useState } from 'react'
import type { ReactNode } from 'react'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: ReactNode
  wide?: boolean
}

export function Modal({ open, title, onClose, children, wide }: ModalProps) {
  const titleId = useId()
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCloseRef.current()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [open])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center overflow-y-auto sm:items-start sm:p-8">
      <button
        type="button"
        className="fixed inset-0 z-0 bg-stone-900/40"
        aria-label="Dismiss dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative z-10 my-0 w-full rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] sm:my-4 ${
          wide ? 'max-w-3xl' : 'max-w-xl'
        }`}
      >
        <div className="flex items-center justify-between border-b border-[var(--color-line)] px-4 py-3 sm:px-5 sm:py-4">
          <h2
            id={titleId}
            className="font-[family-name:var(--font-display)] text-xl text-stone-900 sm:text-2xl"
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-none px-3 py-2 text-sm text-stone-500 transition hover:bg-stone-100 hover:text-stone-800"
          >
            Close
          </button>
        </div>
        <div className="max-h-[min(85dvh,40rem)] overflow-y-auto px-4 py-4 sm:px-5">{children}</div>
      </div>
    </div>
  )
}

interface FieldProps {
  label: string
  children: ReactNode
  className?: string
}

export function Field({ label, children, className = '' }: FieldProps) {
  return (
    <label className={`flex flex-col gap-1.5 text-sm ${className}`}>
      <span className="font-medium text-stone-600">{label}</span>
      {children}
    </label>
  )
}

export const inputClass =
  'w-full rounded-none border border-[var(--color-line)] bg-white px-3 py-2.5 text-base text-stone-900 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-600/15 sm:text-sm'

export const btnPrimary =
  'inline-flex items-center justify-center rounded-none bg-teal-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-teal-800 disabled:opacity-50'

export const btnGhost =
  'inline-flex items-center justify-center rounded-none border border-[var(--color-line)] bg-white px-3 py-2 text-sm font-medium text-stone-700 transition hover:bg-stone-50'

interface SearchInputProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  'data-testid'?: string
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
  'data-testid': testId,
}: SearchInputProps) {
  return (
    <div className="relative min-w-0 flex-1">
      <span
        aria-hidden
        className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-stone-400"
      >
        ⌕
      </span>
      <input
        type="search"
        data-testid={testId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape') onChange('')
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputClass} pl-9`}
      />
    </div>
  )
}

interface FilterOption {
  value: string
  label: string
}

interface FilterDropdownProps {
  label: string
  value: string | string[]
  options: FilterOption[]
  multi?: boolean
  searchable?: boolean
  active?: boolean
  onChange: (value: string | string[]) => void
  'data-testid'?: string
}

export function FilterDropdown({
  label,
  value,
  options,
  multi = false,
  searchable = false,
  active = false,
  onChange,
  'data-testid': testId,
}: FilterDropdownProps) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const rootRef = useRef<HTMLDivElement>(null)
  const selected = Array.isArray(value) ? value : [String(value)]

  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDoc)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  const filtered = searchable
    ? options.filter((o) => o.label.toLowerCase().includes(query.trim().toLowerCase()))
    : options

  const summary = (() => {
    if (multi) {
      if (selected.length === 0) return 'All'
      if (selected.length === 1) {
        return options.find((o) => o.value === selected[0])?.label ?? '1 selected'
      }
      return `${selected.length} selected`
    }
    return options.find((o) => o.value === (value as string))?.label ?? 'All'
  })()

  const toggle = (optValue: string) => {
    if (multi) {
      const next = selected.includes(optValue)
        ? selected.filter((v) => v !== optValue)
        : [...selected, optValue]
      onChange(next)
      return
    }
    onChange(optValue)
    setOpen(false)
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        data-testid={testId}
        aria-expanded={open}
        aria-haspopup="listbox"
        onClick={() => setOpen((v) => !v)}
        className={`inline-flex items-center gap-1.5 rounded-none px-3 py-1.5 text-xs font-medium transition ${
          active
            ? 'bg-teal-700 text-white'
            : 'bg-white text-stone-600 ring-1 ring-[var(--color-line)] hover:bg-stone-50'
        }`}
      >
        <span className="opacity-70">{label}:</span>
        <span>{summary}</span>
        <span aria-hidden className="opacity-60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="listbox"
          aria-multiselectable={multi || undefined}
          className="absolute top-full left-0 z-30 mt-1 max-h-64 w-64 overflow-auto border border-[var(--color-line)] bg-white shadow-sm"
        >
          {searchable ? (
            <div className="sticky top-0 border-b border-[var(--color-line)] bg-white p-2">
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search…"
                className={`${inputClass} py-1.5 text-xs`}
                autoFocus
              />
            </div>
          ) : null}
          {filtered.length === 0 ? (
            <p className="px-3 py-2 text-xs text-stone-400">No matches</p>
          ) : (
            filtered.map((opt) => {
              const isOn = selected.includes(opt.value)
              return (
                <button
                  key={opt.value}
                  type="button"
                  role="option"
                  aria-selected={isOn}
                  onClick={() => toggle(opt.value)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition hover:bg-teal-50 ${
                    isOn ? 'bg-teal-50/80 font-medium text-teal-900' : 'text-stone-700'
                  }`}
                >
                  {multi ? (
                    <span
                      aria-hidden
                      className={`inline-flex h-3.5 w-3.5 items-center justify-center border text-[9px] ${
                        isOn
                          ? 'border-teal-700 bg-teal-700 text-white'
                          : 'border-stone-300 bg-white'
                      }`}
                    >
                      {isOn ? '✓' : ''}
                    </span>
                  ) : null}
                  <span className="min-w-0 truncate">{opt.label}</span>
                </button>
              )
            })
          )}
        </div>
      ) : null}
    </div>
  )
}

interface FilterChipProps {
  label: string
  onClear: () => void
}

export function FilterChip({ label, onClear }: FilterChipProps) {
  return (
    <span className="inline-flex items-center gap-1 rounded-none bg-teal-50 px-2 py-1 text-[11px] font-medium text-teal-900 ring-1 ring-teal-200">
      {label}
      <button
        type="button"
        onClick={onClear}
        aria-label={`Clear ${label}`}
        className="text-teal-700 hover:text-teal-950"
      >
        ×
      </button>
    </span>
  )
}
