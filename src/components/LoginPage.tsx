import { useState, type FormEvent } from 'react'
import { Field, inputClass, btnPrimary } from './ui'

interface LoginPageProps {
  error: string | null
  onLogin: (email: string, password: string) => Promise<boolean>
}

export function LoginPage({ error, onLogin }: LoginPageProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    try {
      await onLogin(email, password)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(ellipse 70% 50% at 20% 10%, #99f6e4 0%, transparent 55%), radial-gradient(ellipse 50% 40% at 90% 80%, #fde68a44 0%, transparent 50%), #f7f4ef',
        }}
      />
      <div className="relative w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-700 text-sm font-bold text-teal-50 shadow-lg shadow-teal-900/20">
            CB
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-4xl text-stone-900">
            Convobrains
          </h1>
          <p className="mt-1 text-sm text-stone-500">Sales CRM · Founder&apos;s Office</p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-2xl border border-[var(--color-line)] bg-[var(--color-panel)] p-6 shadow-xl shadow-stone-900/5"
        >
          <h2 className="text-lg font-semibold text-stone-800">Welcome back</h2>
          <p className="mt-1 text-sm text-stone-500">Log in with your Convobrains account.</p>

          <div className="mt-5 space-y-4">
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder="name@convobrains.com"
              />
            </Field>
            <Field label="Password">
              <input
                type="password"
                className={inputClass}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                placeholder="••••••••"
              />
            </Field>
          </div>

          {error ? (
            <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button type="submit" disabled={submitting} className={`${btnPrimary} mt-5 w-full`}>
            {submitting ? 'Signing in…' : 'Log in'}
          </button>

          <p className="mt-4 text-center text-[11px] leading-relaxed text-stone-400">
            Only <span className="font-medium text-stone-500">@convobrains.com</span> accounts
            can sign in.
          </p>
        </form>
      </div>
    </div>
  )
}
