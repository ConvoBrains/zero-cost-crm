import { describe, expect, it } from 'vitest';
import { api, loginAsCookie, SEED } from './helpers';

describe('bootstrap & metrics', () => {
  it('returns seeded companies, contacts, and metrics', async () => {
    const session = await loginAsCookie(SEED.founder);
    const boot = await api<{ companies: unknown[]; contacts: unknown[] }>('/api/bootstrap', {
      session,
    });
    expect(boot.status).toBe(200);
    expect(boot.data.companies.length).toBeGreaterThan(0);
    expect(boot.data.contacts.length).toBeGreaterThan(0);

    const metrics = await api('/api/metrics', { session });
    expect(metrics.status).toBe(200);
    expect(metrics.data).toBeTruthy();
  });
});

describe('companies CRUD', () => {
  it('creates, patches stage, and admin deletes', async () => {
    const session = await loginAsCookie(SEED.founder);
    const suffix = Date.now();

    const created = await api<{ id: string; stage: string }>('/api/companies', {
      body: {
        companyName: `API Test Co ${suffix}`,
        stage: 'Lead Added',
        industry: 'SaaS',
        location: 'Remote',
        intent: 'Warm',
      },
      session,
    });
    expect(created.status).toBe(201);
    expect(created.data.stage).toBe('Lead Added');

    const patched = await api<{ stage: string }>(`/api/companies/${created.data.id}`, {
      method: 'PATCH',
      body: { stage: 'Follow-up' },
      session,
    });
    expect(patched.status).toBe(200);
    expect(patched.data.stage).toBe('Follow-up');

    expect(
      (await api(`/api/companies/${created.data.id}`, { method: 'DELETE', session })).status
    ).toBe(204);
  });
});

describe('contacts CRUD', () => {
  it('creates and updates contact status', async () => {
    const session = await loginAsCookie(SEED.founder);
    const boot = await api<{ companies: { id: string }[] }>('/api/bootstrap', { session });
    const companyId = boot.data.companies[0]?.id;
    expect(companyId).toBeTruthy();

    const suffix = Date.now();
    const created = await api<{ id: string }>('/api/contacts', {
      body: {
        companyId,
        contactName: `Pat Example ${suffix}`,
        email: `pat.${suffix}@acme.example`,
        contactStatus: 'Not Contacted',
      },
      session,
    });
    expect(created.status).toBe(201);

    const patched = await api<{ contactStatus: string }>(`/api/contacts/${created.data.id}`, {
      method: 'PATCH',
      body: { contactStatus: 'Interested' },
      session,
    });
    expect(patched.status).toBe(200);
    expect(patched.data.contactStatus).toBe('Interested');
  });
});

describe('import prospects', () => {
  it('creates rows and skips duplicate emails', async () => {
    const session = await loginAsCookie(SEED.founder);
    const suffix = Date.now();
    const email = `import.${suffix}@northwind.example`;
    const row = {
      company: `Import Co ${suffix}`,
      prospectName: 'Jordan Sample',
      jobTitle: 'CEO',
      email,
      phone: '+1 555 0100',
      location: 'Chicago',
      employees: 100,
      industry: 'Hospital & Health Care',
    };

    const first = await api<{
      companiesCreated: number;
      contactsCreated: number;
      contactsSkipped: number;
    }>('/api/import/prospects', { body: { rows: [row] }, session });
    expect(first.status).toBe(200);
    expect(first.data.companiesCreated).toBeGreaterThanOrEqual(1);
    expect(first.data.contactsCreated).toBe(1);
    expect(first.data.contactsSkipped).toBe(0);

    const second = await api<{ contactsCreated: number; contactsSkipped: number }>(
      '/api/import/prospects',
      { body: { rows: [row] }, session }
    );
    expect(second.status).toBe(200);
    expect(second.data.contactsCreated).toBe(0);
    expect(second.data.contactsSkipped).toBe(1);
  });
});

describe('activity', () => {
  it('founder loads SDR roster, overview, timeline', async () => {
    const session = await loginAsCookie(SEED.founder);
    const sdrs = await api<{ sdrs: unknown[] }>('/api/activity/sdrs', { session });
    expect(sdrs.status).toBe(200);
    expect(Array.isArray(sdrs.data.sdrs)).toBe(true);

    expect((await api('/api/activity/overview?userId=all', { session })).status).toBe(200);
    expect((await api('/api/activity/timeline?userId=all', { session })).status).toBe(200);
  });

  it('SDR can post company.opened event', async () => {
    const session = await loginAsCookie(SEED.sdr);
    const boot = await api<{ companies: { id: string }[] }>('/api/bootstrap', { session });
    const companyId = boot.data.companies[0]?.id;
    expect(companyId).toBeTruthy();

    const ev = await api('/api/activity/events', {
      body: { eventType: 'company.opened', entityId: companyId, name: 'Test Co' },
      session,
    });
    expect(ev.status).toBe(204);
  });
});
