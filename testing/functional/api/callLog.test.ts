import { describe, expect, it } from 'vitest';
import { api, loginAsCookie, SEED } from './helpers';

/** Contact call log keeps every day's outcome; bootstrap exposes past statuses. */

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

describe('contact call log', () => {
  it('keeps the first call after the status is overwritten, for SDRs too', async () => {
    const founder = await loginAsCookie(SEED.founder);
    const sdr = await loginAsCookie(SEED.sdr);
    const u = uniq();
    const created = await api<{ id: string }>('/api/contacts', {
      body: {
        contactName: `Call Log ${u}`,
        email: `call.log.${u}@example.test`,
        contactStatus: 'Not Contacted',
        champion: false,
      },
      session: founder,
    });
    expect(created.status).toBe(201);
    const id = created.data.id;

    const first = await api(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: {
        contactStatus: 'Connected - Future Follow-up',
        nextFollowUp: '2030-01-02',
        notes: 'Busy, call tomorrow',
      },
      session: sdr,
    });
    expect(first.status).toBe(200);
    const second = await api(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { contactStatus: "Didn't Pick" },
      session: sdr,
    });
    expect(second.status).toBe(200);

    const log = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown>; userName: string }>;
    }>(`/api/contacts/${id}/call-log`, { method: 'GET', session: sdr });
    expect(log.status).toBe(200);
    const statuses = log.data.events
      .filter((e) => e.eventType === 'contact.status_changed')
      .map((e) => e.payload.to);
    expect(statuses).toEqual(['Connected - Future Follow-up', "Didn't Pick"]);
    expect(log.data.events.some((e) => e.eventType === 'contact.note_added')).toBe(true);
    expect(log.data.events.some((e) => e.eventType === 'contact.follow_up_set')).toBe(true);

    const boot = await api<{
      contacts: Array<{ id: string; statusHistory?: string[]; firstContactedAt?: string | null }>;
    }>('/api/bootstrap', { method: 'GET', session: sdr });
    const row = boot.data.contacts.find((c) => c.id === id)!;
    expect(row.statusHistory).toEqual(
      expect.arrayContaining(['Not Contacted', 'Connected - Future Follow-up', "Didn't Pick"])
    );
    expect(row.firstContactedAt).toBeTruthy();

    await api(`/api/contacts/${id}`, { method: 'DELETE', session: founder });
  });

  it('404s for an unknown contact', async () => {
    const session = await loginAsCookie(SEED.founder);
    const res = await api('/api/contacts/00000000-0000-4000-8000-000000000000/call-log', {
      method: 'GET',
      session,
    });
    expect(res.status).toBe(404);
  });
});
