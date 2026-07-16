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
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img
            src="/convobrains-logo.png"
            alt="ConvoBrains"
            className="mx-auto mb-3 w-56"
          />
          <p className="mt-1 text-sm text-stone-500">Open-Source SDR War Room</p>
          <p className="mt-2 text-xs text-stone-400">
            Track what happens.{' '}
            <a
              href="https://www.convobrains.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium text-stone-700 underline-offset-2 hover:underline"
            >
              ConvoBrains
            </a>{' '}
            explains why.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-6"
        >
          <h2 className="text-lg font-semibold text-stone-800">Welcome back</h2>
          <p className="mt-1 text-sm text-stone-500">Sign in to your War Room.</p>

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
            <p className="mt-3 rounded-none bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
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
