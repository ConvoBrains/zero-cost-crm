import { describe, expect, it } from 'vitest';
import { buildCallLog, carryStatusHistory, type CallLogEvent } from '../../src/lib/callLog';
import type { Contact } from '../../src/types';

let n = 0;
const ev = (
  createdAt: string,
  eventType: string,
  payload: Record<string, unknown> = {}
): CallLogEvent => ({
  id: String(++n),
  userName: 'SDR One',
  eventType,
  payload,
  createdAt,
});

describe('buildCallLog', () => {
  it('records the WhatsApp message on the day it was marked', () => {
    const log = buildCallLog([
      ev('2026-10-29T06:00:00Z', 'contact.status_changed', {
        from: 'Not Contacted',
        to: "Didn't Pick",
      }),
      ev('2026-10-29T06:05:00Z', 'contact.whatsapp_sent', { sent: true }),
      ev('2026-10-30T06:05:00Z', 'contact.whatsapp_sent', { sent: false }),
    ]);
    expect(log.days.map((d) => d.whatsappSent)).toEqual([true, false]);
    // Marking WhatsApp alone is not a call.
    expect(log.callDays).toBe(1);
  });

  it('keeps each day separate so the first call survives a later status', () => {
    const log = buildCallLog([
      ev('2026-10-28T05:00:00Z', 'contact.created', { status: 'Not Contacted' }),
      // Day 1 (IST): connected, asked to call tomorrow.
      ev('2026-10-29T06:00:00Z', 'contact.status_changed', {
        from: 'Not Contacted',
        to: 'Connected',
      }),
      ev('2026-10-29T06:00:01Z', 'contact.follow_up_set', { to: '2026-10-30' }),
      ev('2026-10-29T06:00:02Z', 'contact.note_added', { note: 'Busy, call tomorrow' }),
      // Day 2: did not pick.
      ev('2026-10-30T07:00:00Z', 'contact.status_changed', {
        from: 'Connected',
        to: "Didn't Pick",
      }),
    ]);

    expect(log.firstContactedDate).toBe('2026-10-29');
    expect(log.callDays).toBe(2);
    expect(log.days.map((d) => d.date)).toEqual(['2026-10-28', '2026-10-29', '2026-10-30']);
    expect(log.days[1]).toMatchObject({
      statusChanges: [{ from: 'Not Contacted', to: 'Connected' }],
      followUp: '2026-10-30',
      notes: ['Busy, call tomorrow'],
      called: true,
    });
    expect(log.days[2]!.statusChanges).toMatchObject([{ from: 'Connected', to: "Didn't Pick" }]);
    expect(log.days[0]).toMatchObject({
      created: true,
      createdStatus: 'Not Contacted',
      called: false,
    });
  });

  it('keeps every status change within the same day', () => {
    const log = buildCallLog([
      ev('2026-10-29T04:00:00Z', 'contact.status_changed', {
        from: 'Not Contacted',
        to: 'Connected',
      }),
      ev('2026-10-29T10:00:00Z', 'contact.status_changed', {
        from: 'Connected',
        to: "Didn't Pick",
      }),
    ]);
    expect(log.days).toHaveLength(1);
    expect(log.days[0]!.statusChanges.map((c) => c.to)).toEqual(['Connected', "Didn't Pick"]);
  });

  it('groups by IST calendar day, not UTC', () => {
    // 20:00 UTC on the 29th is 01:30 IST on the 30th.
    const log = buildCallLog([
      ev('2026-10-29T20:00:00Z', 'contact.status_changed', {
        from: 'Not Contacted',
        to: 'Connected',
      }),
    ]);
    expect(log.days[0]!.date).toBe('2026-10-30');
  });

  it('counts recordings as call days', () => {
    const log = buildCallLog([ev('2026-10-29T06:00:00Z', 'conversation.uploaded', {})]);
    expect(log.callDays).toBe(1);
    expect(log.firstContactedDate).toBeNull();
  });
});

describe('carryStatusHistory', () => {
  const base: Contact = {
    id: 'c',
    contactName: 'X',
    companyId: null,
    role: '',
    phone: '',
    email: '',
    linkedInProfile: '',
    contactStatus: 'Connected',
    champion: false,
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    createdAt: '2026-10-01',
    statusHistory: ['Not Contacted', 'Connected'],
    firstContactedAt: '2026-10-29T06:00:00.000Z',
  };

  it('keeps earlier statuses and the first-contacted time across an update', () => {
    const next = carryStatusHistory(base, {
      ...base,
      contactStatus: "Didn't Pick",
      statusHistory: undefined,
      firstContactedAt: undefined,
    });
    expect(next.statusHistory).toEqual(['Not Contacted', 'Connected', "Didn't Pick"]);
    expect(next.firstContactedAt).toBe('2026-10-29T06:00:00.000Z');
  });

  it('stamps firstContactedAt on the first status change', () => {
    const fresh = {
      ...base,
      contactStatus: 'Not Contacted',
      statusHistory: [],
      firstContactedAt: null,
    };
    const now = new Date('2026-11-01T04:00:00Z');
    const next = carryStatusHistory(fresh, { ...fresh, contactStatus: 'Connected' }, now);
    expect(next.firstContactedAt).toBe(now.toISOString());
  });
});
