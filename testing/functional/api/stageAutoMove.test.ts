import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { api, loginAsCookie, SEED, type TestSession } from './helpers';
import { pool } from '../../../server/db';
import { getAppSettings, invalidateSettingsCache } from '../../../server/settings';
import { applyStageBackfill, planStageBackfill } from '../../../server/stageBackfill';

/**
 * Any contact's status moves the company (scope any_contact): the company sits at the
 * furthest stage any of its contacts has reached, never moves back, and is left alone from
 * Demo Scheduled on. Champion scope keeps the issue #29 behaviour.
 */

const DIALED = "Dialed - Didn't Pick";
let seq = 0;
const uniq = () => `${Date.now()}-${++seq}`;

type Config = {
  stages: string[];
  championStatusToStage: Record<string, string | null>;
  stageAutoMoveScope: 'champion' | 'any_contact';
};

let session: TestSession;
let original: Config;

async function setScope(stageAutoMoveScope: Config['stageAutoMoveScope']) {
  const res = await api('/api/settings', {
    method: 'PATCH',
    session,
    body: { stageAutoMoveScope },
  });
  expect(res.status).toBe(200);
}

async function createCompany(stage = 'Lead Added') {
  const res = await api<{ id: string; stage: string }>('/api/companies', {
    body: { companyName: `Auto Move Co ${uniq()}`, stage, industry: 'SaaS', intent: 'Warm' },
    session,
  });
  expect(res.status).toBe(201);
  return res.data;
}

async function createContact(companyId: string) {
  const u = uniq();
  const res = await api<{ id: string }>('/api/contacts', {
    body: {
      companyId,
      contactName: `Lead ${u}`,
      email: `lead.${u}@automove.example`,
      contactStatus: 'Not Contacted',
    },
    session,
  });
  expect(res.status).toBe(201);
  return res.data.id;
}

async function setStatus(contactId: string, contactStatus: string) {
  const res = await api<{ movedCompanyStage: string | null }>(`/api/contacts/${contactId}`, {
    method: 'PATCH',
    body: { contactStatus },
    session,
  });
  expect(res.status).toBe(200);
  return res.data.movedCompanyStage;
}

async function stageOf(companyId: string) {
  const boot = await api<{ companies: Array<{ id: string; stage: string }> }>('/api/bootstrap', {
    session,
  });
  return boot.data.companies.find((c) => c.id === companyId)?.stage;
}

beforeAll(async () => {
  session = await loginAsCookie(SEED.founder);
  const cfg = await api<Config>('/api/config');
  original = {
    stages: cfg.data.stages,
    championStatusToStage: cfg.data.championStatusToStage,
    stageAutoMoveScope: cfg.data.stageAutoMoveScope,
  };
  const stages = [...original.stages];
  stages.splice(stages.indexOf('Lead Added') + 1, 0, DIALED);
  const res = await api('/api/settings', {
    method: 'PATCH',
    session,
    body: {
      stages,
      championStatusToStage: {
        ...original.championStatusToStage,
        "Didn't Pick": DIALED,
        'Follow-up Required': 'Follow-up',
        Rejected: null,
      },
      stageAutoMoveScope: 'any_contact',
    },
  });
  expect(res.status).toBe(200);
});

afterAll(async () => {
  await api('/api/settings', { method: 'PATCH', session, body: original });
});

describe('stage auto-move from any contact', () => {
  it('moves to the furthest stage reached and never back', async () => {
    const co = await createCompany();
    const a = await createContact(co.id);
    const b = await createContact(co.id);

    expect(await setStatus(b, "Didn't Pick")).toBe(DIALED);
    expect(await setStatus(a, 'Follow-up Required')).toBe('Follow-up');
    // Another no-answer, or the same lead later not picking up, leaves it in Follow-up.
    expect(await setStatus(a, "Didn't Pick")).toBeNull();
    expect(await stageOf(co.id)).toBe('Follow-up');

    const history = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown> }>;
    }>(`/api/activity/company/${co.id}/history`, { session });
    const moves = history.data.events.filter((e) => e.eventType === 'company.stage_changed');
    expect(moves.map((e) => e.payload.to)).toEqual([DIALED, 'Follow-up']);
    expect(moves.every((e) => e.payload.source === 'contact_status')).toBe(true);
  });

  it('gives the same result in the other order', async () => {
    const co = await createCompany();
    const a = await createContact(co.id);
    const b = await createContact(co.id);
    await setStatus(a, 'Follow-up Required');
    expect(await setStatus(b, "Didn't Pick")).toBeNull();
    expect(await stageOf(co.id)).toBe('Follow-up');
  });

  it('leaves companies at Demo Scheduled or later alone', async () => {
    const co = await createCompany('Demo Scheduled');
    const a = await createContact(co.id);
    expect(await setStatus(a, 'Follow-up Required')).toBeNull();
    expect(await stageOf(co.id)).toBe('Demo Scheduled');
  });

  it('does not move on a status mapped to nothing (Rejected)', async () => {
    const co = await createCompany();
    const a = await createContact(co.id);
    expect(await setStatus(a, 'Rejected')).toBeNull();
    expect(await stageOf(co.id)).toBe('Lead Added');
  });

  it('bulk status update moves each company', async () => {
    const one = await createCompany();
    const two = await createCompany();
    const ids = [await createContact(one.id), await createContact(two.id)];
    const res = await api<{ movedCompanies: Array<{ companyId: string; stage: string }> }>(
      '/api/contacts/bulk-status',
      { body: { contactIds: ids, contactStatus: "Didn't Pick" }, session }
    );
    expect(res.status).toBe(200);
    expect(res.data.movedCompanies).toEqual(
      expect.arrayContaining([
        { companyId: one.id, stage: DIALED },
        { companyId: two.id, stage: DIALED },
      ])
    );
    expect(await stageOf(two.id)).toBe(DIALED);
  });

  it('with champion scope, a non-champion change does not move the company', async () => {
    await setScope('champion');
    try {
      const co = await createCompany();
      const a = await createContact(co.id);
      expect(await setStatus(a, 'Follow-up Required')).toBeNull();
      expect(await stageOf(co.id)).toBe('Lead Added');
    } finally {
      await setScope('any_contact');
    }
  });

  it('backfill puts existing companies at the furthest stage from status history', async () => {
    // Work done while only the champion counted: the company did not move.
    await setScope('champion');
    const co = await createCompany();
    const a = await createContact(co.id);
    await setStatus(a, 'Follow-up Required');
    await setStatus(a, "Didn't Pick");
    await setScope('any_contact');
    expect(await stageOf(co.id)).toBe('Lead Added');

    invalidateSettingsCache();
    const plan = (await planStageBackfill(pool, await getAppSettings())).filter(
      (m) => m.companyId === co.id
    );
    // Follow-up Required was held once, so it wins over the current Didn't Pick.
    expect(plan).toEqual([
      expect.objectContaining({
        from: 'Lead Added',
        to: 'Follow-up',
        contactStatus: 'Follow-up Required',
      }),
    ]);
    expect(await stageOf(co.id)).toBe('Lead Added');

    const user = (await pool.query('SELECT id FROM users WHERE email = $1', [SEED.founder]))
      .rows[0];
    expect(await applyStageBackfill(pool, plan, String(user.id))).toBe(1);
    expect(await stageOf(co.id)).toBe('Follow-up');
    // Re-running finds nothing left to do for this company.
    const again = (await planStageBackfill(pool, await getAppSettings())).filter(
      (m) => m.companyId === co.id
    );
    expect(again).toEqual([]);
  });
});
