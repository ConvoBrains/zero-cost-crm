import { describe, expect, it } from 'vitest';
import { api, loginAsCookie, SEED } from './helpers';

/** Per-contact "WhatsApp sent" flag: PATCH, bulk, call log and SDR metric. */

const uniq = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

type ContactRow = { id: string; whatsappSentAt?: string | null };

async function createContact(session: Awaited<ReturnType<typeof loginAsCookie>>, label: string) {
  const u = uniq();
  const res = await api<ContactRow>('/api/contacts', {
    body: {
      contactName: `${label} ${u}`,
      email: `wa.${label.toLowerCase()}.${u}@example.test`,
      contactStatus: "Didn't Pick",
    },
    session,
  });
  expect(res.status).toBe(201);
  expect(res.data.whatsappSentAt ?? null).toBeNull();
  return res.data.id;
}

describe('contact WhatsApp flag', () => {
  it('sets, keeps the first time on re-set, clears, and logs each change', async () => {
    const founder = await loginAsCookie(SEED.founder);
    const sdr = await loginAsCookie(SEED.sdr);
    const id = await createContact(founder, 'Patch');

    const sent = await api<ContactRow>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { whatsappSent: true },
      session: sdr,
    });
    expect(sent.status).toBe(200);
    const firstSentAt = sent.data.whatsappSentAt;
    expect(firstSentAt).toBeTruthy();

    // Saving the contact form again with the box still ticked keeps the first time and logs nothing.
    const again = await api<ContactRow>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { whatsappSent: true, notes: 'Sent the demo video' },
      session: sdr,
    });
    expect(again.status).toBe(200);
    expect(again.data.whatsappSentAt).toBe(firstSentAt);

    const cleared = await api<ContactRow>(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { whatsappSent: false },
      session: sdr,
    });
    expect(cleared.data.whatsappSentAt).toBeNull();

    const log = await api<{ events: Array<{ eventType: string; payload: { sent?: boolean } }> }>(
      `/api/contacts/${id}/call-log`,
      { method: 'GET', session: sdr }
    );
    expect(
      log.data.events
        .filter((e) => e.eventType === 'contact.whatsapp_sent')
        .map((e) => e.payload.sent)
    ).toEqual([true, false]);

    const boot = await api<{ contacts: ContactRow[] }>('/api/bootstrap', {
      method: 'GET',
      session: sdr,
    });
    expect(boot.data.contacts.find((c) => c.id === id)?.whatsappSentAt).toBeNull();

    await api(`/api/contacts/${id}`, { method: 'DELETE', session: founder });
  });

  it('rejects a non-boolean value', async () => {
    const founder = await loginAsCookie(SEED.founder);
    const id = await createContact(founder, 'Invalid');
    const res = await api(`/api/contacts/${id}`, {
      method: 'PATCH',
      body: { whatsappSent: 'yes' },
      session: founder,
    });
    expect(res.status).toBe(400);
    await api(`/api/contacts/${id}`, { method: 'DELETE', session: founder });
  });

  it('bulk-marks only contacts not already sent', async () => {
    const founder = await loginAsCookie(SEED.founder);
    const a = await createContact(founder, 'BulkA');
    const b = await createContact(founder, 'BulkB');
    await api(`/api/contacts/${a}`, {
      method: 'PATCH',
      body: { whatsappSent: true },
      session: founder,
    });

    const bulk = await api<{ updatedCount: number }>('/api/contacts/bulk-whatsapp', {
      body: { contactIds: [a, b], sent: true },
      session: founder,
    });
    expect(bulk.status).toBe(200);
    expect(bulk.data.updatedCount).toBe(1);

    const boot = await api<{ contacts: ContactRow[] }>('/api/bootstrap', {
      method: 'GET',
      session: founder,
    });
    for (const id of [a, b]) {
      expect(boot.data.contacts.find((c) => c.id === id)?.whatsappSentAt).toBeTruthy();
    }

    const empty = await api('/api/contacts/bulk-whatsapp', {
      body: { contactIds: [], sent: true },
      session: founder,
    });
    expect(empty.status).toBe(400);

    for (const id of [a, b]) {
      await api(`/api/contacts/${id}`, { method: 'DELETE', session: founder });
    }
  });
});
