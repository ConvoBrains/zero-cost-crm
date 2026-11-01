import type { Contact } from '../types';
import { api } from './api';
import { IST_TZ } from './championCard';

export interface CallLogEvent {
  id: string;
  userName: string;
  eventType: string;
  payload: Record<string, unknown>;
  createdAt: string;
}

export interface CallLogStatusChange {
  at: string;
  from: string | null;
  to: string | null;
}

/** One calendar day (IST) of work on a contact. Every status change that day is kept. */
export interface CallLogDay {
  date: string;
  /** Status the contact was added with, when it was created that day. */
  createdStatus: string | null;
  statusChanges: CallLogStatusChange[];
  followUp: string | null;
  /** Each distinct note text saved that day, in order. */
  notes: string[];
  recordings: number;
  /** True / false when the WhatsApp message was marked sent / unmarked that day; null otherwise. */
  whatsappSent: boolean | null;
  created: boolean;
  /** True when the status changed or a recording was uploaded that day. */
  called: boolean;
  people: string[];
}

export interface CallLogSummary {
  firstContactedDate: string | null;
  callDays: number;
  days: CallLogDay[];
}

export async function fetchContactCallLog(contactId: string) {
  return api<{ contactId: string; contactName: string; events: CallLogEvent[] }>(
    `/api/contacts/${contactId}/call-log`
  );
}

function istDate(iso: string): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(iso));
}

function str(value: unknown): string | null {
  return typeof value === 'string' && value.trim() !== '' ? value.trim() : null;
}

/**
 * Group a contact's activity events into one row per IST day, oldest first.
 * A day counts as a call day when the status changed or a recording was uploaded.
 */
export function buildCallLog(events: CallLogEvent[]): CallLogSummary {
  const byDate = new Map<string, CallLogDay>();
  const sorted = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  for (const ev of sorted) {
    const date = istDate(ev.createdAt);
    let day = byDate.get(date);
    if (!day) {
      day = {
        date,
        createdStatus: null,
        statusChanges: [],
        followUp: null,
        notes: [],
        recordings: 0,
        whatsappSent: null,
        created: false,
        called: false,
        people: [],
      };
      byDate.set(date, day);
    }
    if (!day.people.includes(ev.userName)) day.people.push(ev.userName);

    switch (ev.eventType) {
      case 'contact.created':
        day.created = true;
        day.createdStatus = str(ev.payload.status);
        break;
      case 'contact.status_changed':
        day.statusChanges.push({
          at: ev.createdAt,
          from: str(ev.payload.from),
          to: str(ev.payload.to),
        });
        day.called = true;
        break;
      case 'contact.follow_up_set':
        day.followUp = str(ev.payload.to);
        break;
      case 'contact.note_added':
        {
          const note = str(ev.payload.note) ?? str(ev.payload.to);
          if (note && day.notes.at(-1) !== note) day.notes.push(note);
        }
        break;
      case 'contact.whatsapp_sent':
        day.whatsappSent = ev.payload.sent === true;
        break;
      case 'conversation.uploaded':
        day.recordings += 1;
        day.called = true;
        break;
    }
  }

  const days = [...byDate.values()];
  const firstStatusChange = sorted.find((e) => e.eventType === 'contact.status_changed');
  return {
    firstContactedDate: firstStatusChange ? istDate(firstStatusChange.createdAt) : null,
    callDays: days.filter((d) => d.called).length,
    days,
  };
}

/**
 * PATCH / bulk responses carry no history; keep what bootstrap loaded and add the new status
 * so "current or past status" filters stay right without a refetch.
 */
export function carryStatusHistory(
  prev: Contact | undefined,
  next: Contact,
  now = new Date()
): Contact {
  const statuses = new Set(prev?.statusHistory ?? []);
  if (prev) statuses.add(prev.contactStatus);
  statuses.add(next.contactStatus);
  const statusChanged = !!prev && prev.contactStatus !== next.contactStatus;
  return {
    ...next,
    statusHistory: [...statuses],
    firstContactedAt: prev?.firstContactedAt ?? (statusChanged ? now.toISOString() : null),
  };
}
