import { useEffect, useId, useRef } from 'react'
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
