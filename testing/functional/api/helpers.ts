import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';

export type ApiResult<T = unknown> = { status: number; data: T };

let baseUrl = '';
let server: Server | undefined;

export function getBaseUrl() {
  if (!baseUrl) throw new Error('API server not started');
  return baseUrl;
}

export async function startApi() {
  if (server) return;
  const { default: app } = await import('../../../server/app.js');
  await new Promise<void>((resolve, reject) => {
    server = app.listen(0, '127.0.0.1', () => resolve());
    server.on('error', reject);
  });
  baseUrl = `http://127.0.0.1:${(server!.address() as AddressInfo).port}`;
}

export async function stopApi() {
  if (!server) return;
  const { pool } = await import('../../../server/db.js');
  await new Promise<void>((resolve, reject) => {
    server!.close((err) => (err ? reject(err) : resolve()));
  });
  await pool.end();
  server = undefined;
  baseUrl = '';
}

export async function api<T = unknown>(
  path: string,
  opts: {
    method?: string;
    body?: unknown;
    token?: string;
    session?: TestSession;
    headers?: Record<string, string>;
  } = {}
): Promise<ApiResult<T>> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method: opts.method ?? (opts.body !== undefined ? 'POST' : 'GET'),
    headers: {
      ...(opts.body !== undefined ? { 'content-type': 'application/json' } : {}),
      ...(opts.token ? { authorization: `Bearer ${opts.token}` } : {}),
      ...(opts.session ? { cookie: opts.session.cookieHeader } : {}),
      ...(opts.session?.csrfToken ? { 'x-csrf-token': opts.session.csrfToken } : {}),
      ...opts.headers,
    },
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  let data: T;
  try {
    data = text ? (JSON.parse(text) as T) : (null as T);
  } catch {
    data = text as T;
  }
  return { status: res.status, data };
}

/** Logs in via the httpOnly-cookie flow and returns the raw Cookie header + CSRF token for follow-up requests. */
export async function loginAsCookie(email: string, password = 'TestSeed123!') {
  const res = await fetch(`${getBaseUrl()}/api/auth/login`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = (await res.json()) as {
    user?: { id: string; email: string; role: string; name: string };
    error?: string;
  };
  if (res.status !== 200 || !data.user) {
    throw new Error(`Login failed (${res.status}): ${data.error ?? JSON.stringify(data)}`);
  }
  const cookieJar: Record<string, string> = {};
  for (const raw of res.headers.getSetCookie()) {
    const [pair] = raw.split(';');
    const i = pair.indexOf('=');
    cookieJar[pair.slice(0, i)] = pair.slice(i + 1);
  }
  const cookieHeader = Object.entries(cookieJar)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return {
    cookieHeader,
    token: cookieJar.token,
    csrfToken: cookieJar.csrfToken,
    user: data.user,
  };
}

/** Logs in and returns the JWT (read from the Set-Cookie header, since the body no longer includes it) for Bearer-header tests. */
export async function loginAs(email: string, password = 'TestSeed123!') {
  const { token, user } = await loginAsCookie(email, password);
  if (!token) throw new Error('Login succeeded but no token cookie was set');
  return { token, user };
}

export const SEED = {
  founder: 'founder.seed@convobrains.com',
  sdr: 'rahul.seed@convobrains.com',
} as const;

export type TestSession = {
  cookieHeader: string;
  csrfToken: string;
  user: {
    id: string;
    email: string;
    role: string;
    name: string;
  };
};
