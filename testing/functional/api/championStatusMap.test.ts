import { afterEach, describe, expect, it } from 'vitest';
import { api, loginAs, SEED } from './helpers';

type SettingsBody = {
  championStatusToStage: Record<string, string | null>;
  stages: string[];
  contactStatuses: string[];
  error?: string;
};

async function readMap(token: string) {
  const res = await api<SettingsBody>('/api/config');
  expect(res.status).toBe(200);
  return {
    token,
    map: res.data.championStatusToStage,
    stages: res.data.stages,
    contactStatuses: res.data.contactStatuses,
  };
}

describe('championStatusToStage settings', () => {
  let restore: Record<string, string | null> | null = null;
  let token = '';

  afterEach(async () => {
    if (restore && token) {
      await api('/api/settings', {
        method: 'PATCH',
        token,
        body: { championStatusToStage: restore },
      });
    }
    restore = null;
    token = '';
  });

  it('saves and reloads a valid mapping', async () => {
    const auth = await loginAs(SEED.founder);
    const current = await readMap(auth.token);
    token = auth.token;
    restore = current.map;

    const next = {
      ...current.map,
      'Not Contacted': 'Follow-up',
    };
    const patched = await api<SettingsBody>('/api/settings', {
      method: 'PATCH',
      token,
      body: { championStatusToStage: next },
    });
    expect(patched.status).toBe(200);
    expect(patched.data.championStatusToStage['Not Contacted']).toBe('Follow-up');
    expect(patched.data.championStatusToStage.Interested).toBe(current.map.Interested);

    const reloaded = await api<SettingsBody>('/api/config');
    expect(reloaded.status).toBe(200);
    expect(reloaded.data.championStatusToStage['Not Contacted']).toBe('Follow-up');
  });

  it('rejects a status that is not in contactStatuses', async () => {
    const auth = await loginAs(SEED.founder);
    const current = await readMap(auth.token);
    token = auth.token;
    restore = current.map;

    const res = await api<SettingsBody>('/api/settings', {
      method: 'PATCH',
      token,
      body: { championStatusToStage: { Engaged: 'Follow-up' } },
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('not a configured contact status');

    const unchanged = await api<SettingsBody>('/api/config');
    expect(unchanged.data.championStatusToStage).toEqual(current.map);
  });

  it('rejects a stage that is not in stages', async () => {
    const auth = await loginAs(SEED.founder);
    const current = await readMap(auth.token);
    token = auth.token;
    restore = current.map;

    const res = await api<SettingsBody>('/api/settings', {
      method: 'PATCH',
      token,
      body: { championStatusToStage: { Interested: 'Outreach Positive' } },
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('unknown stage');

    const unchanged = await api<SettingsBody>('/api/config');
    expect(unchanged.data.championStatusToStage).toEqual(current.map);
  });

  it('rejects a non-object championStatusToStage payload', async () => {
    const auth = await loginAs(SEED.founder);
    token = auth.token;
    const res = await api<SettingsBody>('/api/settings', {
      method: 'PATCH',
      token,
      body: { championStatusToStage: ['Interested', 'Follow-up'] },
    });
    expect(res.status).toBe(400);
    expect(res.data.error).toContain('object map');
  });
});
