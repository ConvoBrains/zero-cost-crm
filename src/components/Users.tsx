import { useCallback, useEffect, useState, type FormEvent } from 'react'
import type { CrmUser, UserRole } from '../types'
import { USER_ROLES } from '../types'
import { api } from '../lib/api'
import { Field, inputClass, btnPrimary, btnGhost } from './ui'

function roleLabel(role: string) {
  if (role === 'sdr') return 'SDR'
  return role.charAt(0).toUpperCase() + role.slice(1)
}

export function Users() {
  const [users, setUsers] = useState<CrmUser[]>([])
  const [roles, setRoles] = useState<readonly string[]>(USER_ROLES)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'sdr' as UserRole,
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [usersRes, rolesRes] = await Promise.all([
        api<{ users: CrmUser[] }>('/api/users'),
        api<{ roles: string[] }>('/api/users/roles'),
      ])
      setUsers(usersRes.users)
      if (rolesRes.roles?.length) setRoles(rolesRes.roles)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load users.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const set = (key: keyof typeof form, value: string) =>
    setForm((f) => ({ ...f, [key]: value }))

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    setSubmitting(true)
    setError(null)
    setSuccess(null)
    try {
      const { user } = await api<{ user: CrmUser }>('/api/users', {
        method: 'POST',
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim().toLowerCase(),
          password: form.password,
          role: form.role,
        }),
      })
      setUsers((prev) => [...prev, user].sort((a, b) => a.name.localeCompare(b.name)))
      setForm({ name: '', email: '', password: '', role: 'sdr' })
      setSuccess(`Created ${user.name} (${roleLabel(user.role)}).`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-semibold tracking-[0.14em] text-teal-700 uppercase">
          Team access
        </p>
        <h1 className="mt-1 font-[family-name:var(--font-display)] text-3xl text-stone-900 sm:text-5xl">
          Users
        </h1>
        <p className="mt-2 max-w-xl text-sm text-stone-500">
          Add teammates with a role from the database ({roles.map(roleLabel).join(', ')}).
        </p>
      </header>

      <section className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
          Add user
        </h2>
        <p className="mt-1 text-sm text-stone-500">
          Email domain rules are controlled by ALLOWED_EMAIL_DOMAIN on the server.
        </p>

        <form onSubmit={submit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input
              className={inputClass}
              value={form.name}
              onChange={(e) => set('name', e.target.value)}
              required
              autoComplete="off"
              placeholder="Full name"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              className={inputClass}
              value={form.email}
              onChange={(e) => set('email', e.target.value)}
              required
              autoComplete="off"
              placeholder="name@example.com"
            />
          </Field>
          <Field label="Temporary password">
            <input
              type="password"
              className={inputClass}
              value={form.password}
              onChange={(e) => set('password', e.target.value)}
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
            />
          </Field>
          <Field label="Role">
            <select
              className={inputClass}
              value={form.role}
              onChange={(e) => set('role', e.target.value)}
            >
              {roles.map((role) => (
                <option key={role} value={role}>
                  {roleLabel(role)}
                </option>
              ))}
            </select>
          </Field>

          <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
            <button type="submit" disabled={submitting} className={btnPrimary}>
              {submitting ? 'Creating…' : 'Create user'}
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={() => {
                setForm({ name: '', email: '', password: '', role: 'sdr' })
                setError(null)
                setSuccess(null)
              }}
            >
              Clear
            </button>
          </div>
        </form>

        {error ? (
          <p className="mt-4 rounded-none bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p>
        ) : null}
        {success ? (
          <p className="mt-4 rounded-none bg-teal-50 px-3 py-2 text-sm text-teal-800">{success}</p>
        ) : null}
      </section>

      <section className="rounded-none border border-[var(--color-line)] bg-[var(--color-panel)] p-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="font-[family-name:var(--font-display)] text-2xl text-stone-900">
            Team members
          </h2>
          <button type="button" className={btnGhost} onClick={() => void load()} disabled={loading}>
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        </div>

        {loading && users.length === 0 ? (
          <p className="text-sm text-stone-500">Loading users…</p>
        ) : users.length === 0 ? (
          <p className="text-sm text-stone-500">No users yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[28rem] text-left text-sm">
              <thead>
                <tr className="border-b border-[var(--color-line)] text-[11px] tracking-wide text-stone-500 uppercase">
                  <th className="px-2 py-2 font-medium">Name</th>
                  <th className="px-2 py-2 font-medium">Email</th>
                  <th className="px-2 py-2 font-medium">Role</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--color-line)]">
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="px-2 py-3 font-medium text-stone-800">{user.name}</td>
                    <td className="px-2 py-3 text-stone-600">{user.email}</td>
                    <td className="px-2 py-3">
                      <span className="rounded-none bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-700">
                        {roleLabel(user.role)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
