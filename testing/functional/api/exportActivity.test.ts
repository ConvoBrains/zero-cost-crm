import { describe, expect, it, beforeAll } from 'vitest';
import { getBaseUrl, api, loginAsCookie, SEED, type TestSession } from './helpers';

describe('GET /api/activity/export', () => {
  let founderSession: TestSession;
  let sdrSession: TestSession;

  beforeAll(async () => {
    founderSession = await loginAsCookie(SEED.founder);
    sdrSession = await loginAsCookie(SEED.sdr);
  });

  it('rejects export if user is SDR', async () => {
    const res = await api('/api/activity/export?format=json', { session: sdrSession });
    expect(res.status).toBe(403);
  });

  it('allows founder to export JSON', async () => {
    const res = await fetch(`${getBaseUrl()}/api/activity/export?format=json`, {
      headers: { cookie: founderSession.cookieHeader },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('application/json');
    const data = await res.json();
    expect(Array.isArray(data)).toBe(true);
  });

  it('allows founder to export CSV', async () => {
    const res = await fetch(`${getBaseUrl()}/api/activity/export?format=csv`, {
      headers: { cookie: founderSession.cookieHeader },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get('content-type')).toContain('text/csv');
    const text = await res.text();
    expect(text).toContain('created_at,user_name,event_type');
  });
});
