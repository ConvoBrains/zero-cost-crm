import { describe, it, expect } from 'vitest';
import { formatRelativeTime, formatAbsoluteDate } from '../../src/lib/relativeTime';

const NOW = new Date('2026-08-12T12:00:00Z');

describe('formatRelativeTime', () => {
  it('returns em-dash for null/undefined', () => {
    expect(formatRelativeTime(null, NOW)).toBe('—');
    expect(formatRelativeTime(undefined, NOW)).toBe('—');
  });

  it('returns em-dash for invalid date', () => {
    expect(formatRelativeTime('not-a-date', NOW)).toBe('—');
  });

  it('returns "just now" for current time', () => {
    expect(formatRelativeTime(NOW.toISOString(), NOW)).toBe('just now');
  });

  it('returns "just now" for within 1 minute', () => {
    const d = new Date(NOW.getTime() - 30_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('just now');
  });

  it('shows minutes ago', () => {
    const d = new Date(NOW.getTime() - 5 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('5m ago');
  });

  it('shows hours ago', () => {
    const d = new Date(NOW.getTime() - 3 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('3h ago');
  });

  it('shows yesterday', () => {
    const d = new Date(NOW.getTime() - 25 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('yesterday');
  });

  it('shows days ago', () => {
    const d = new Date(NOW.getTime() - 4 * 24 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('4d ago');
  });

  it('shows "in Xh" for future hours', () => {
    const d = new Date(NOW.getTime() + 2 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('in 2h');
  });

  it('shows "tomorrow" for next day', () => {
    const d = new Date(NOW.getTime() + 26 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('tomorrow');
  });

  it('shows "in Xd" for future days', () => {
    const d = new Date(NOW.getTime() + 3 * 24 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('in 3d');
  });

  it('handles older dates (> 7 days) as Xd ago', () => {
    const d = new Date(NOW.getTime() - 30 * 24 * 60 * 60_000);
    expect(formatRelativeTime(d.toISOString(), NOW)).toBe('30d ago');
  });
});

describe('formatAbsoluteDate', () => {
  it('returns em-dash for null', () => {
    expect(formatAbsoluteDate(null)).toBe('—');
  });

  it('returns localized date string', () => {
    const result = formatAbsoluteDate('2026-08-12T12:00:00Z');
    expect(result).not.toBe('—');
    expect(result.length).toBeGreaterThan(5);
  });
});