import { useState, type FormEvent } from 'react';
import { Field, inputClass, btnPrimary } from './ui';
import { DEFAULT_BRAND_NAME, DEFAULT_BRAND_TAGLINE, DEFAULT_LOGO_URL } from '../defaults';

interface LoginPageProps {
  error: string | null;
  onLogin: (email: string, password: string) => Promise<boolean>;
  allowedEmailDomain?: string | null;
  allowAnyEmailDomain?: boolean;
  brandName?: string;
  brandTagline?: string;
  logoUrl?: string;
}

export function LoginPage({
  error,
  onLogin,
  allowedEmailDomain = null,
  allowAnyEmailDomain = true,
  brandName = DEFAULT_BRAND_NAME,
  brandTagline = DEFAULT_BRAND_TAGLINE,
  logoUrl = DEFAULT_LOGO_URL,
}: LoginPageProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await onLogin(email, password);
    } finally {
      setSubmitting(false);
    }
  };

  const emailHint = allowAnyEmailDomain
    ? 'Work email'
    : allowedEmailDomain
      ? `@${allowedEmailDomain} email`
      : 'Work email';

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-canvas)] px-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <img src={logoUrl} alt={brandName} className="mx-auto mb-3 w-56" />
          <p className="mt-1 text-sm text-stone-500">{brandName}</p>
          {brandTagline ? <p className="mt-2 text-xs text-stone-400">{brandTagline}</p> : null}
        </div>

        <form
          onSubmit={submit}
          className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-6"
        >
          <h2 className="text-lg font-semibold text-stone-800">Welcome back</h2>
          <p className="mt-1 text-sm text-stone-500">Sign in to {brandName}.</p>

          <div className="mt-5 space-y-4">
            <Field label="Email">
              <input
                type="email"
                className={inputClass}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="username"
                placeholder={emailHint}
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
              />
            </Field>
          </div>

          {error ? (
            <p className="mt-4 rounded-none bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
          ) : null}

          <button type="submit" className={`${btnPrimary} mt-5 w-full`} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
