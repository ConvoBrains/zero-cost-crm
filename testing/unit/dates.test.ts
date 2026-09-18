import { describe, expect, it } from 'vitest';
import { formatFullDateTime, formatRelativeTime, parseDate } from '../../src/lib/dates';

describe('parseDate', () => {
  it('returns null for null, undefined, empty string, or whitespace', () => {
    expect(parseDate(null)).toBeNull();
    expect(parseDate(undefined)).toBeNull();
    expect(parseDate('')).toBeNull();
    expect(parseDate('   ')).toBeNull();
  });

  it('returns null for invalid date strings', () => {
    expect(parseDate('not-a-date')).toBeNull();
    expect(parseDate('2026-99-99')).toBeNull();
  });

  it('parses valid Date instances', () => {
    const d = new Date(2026, 8, 19, 10, 0, 0);
    expect(parseDate(d)?.getTime()).toBe(d.getTime());
  });

  it('returns null for invalid Date instances', () => {
    expect(parseDate(new Date('invalid'))).toBeNull();
  });

  it('parses YYYY-MM-DD date-only strings into local date without UTC shift', () => {
    const d = parseDate('2026-09-18');
    expect(d).not.toBeNull();
    expect(d?.getFullYear()).toBe(2026);
    expect(d?.getMonth()).toBe(8); // 0-indexed: September is 8
    expect(d?.getDate()).toBe(18);
  });

  it('parses ISO timestamp strings', () => {
    const d = parseDate('2026-09-19T12:30:00.000Z');
    expect(d).not.toBeNull();
    expect(d?.toISOString()).toBe('2026-09-19T12:30:00.000Z');
  });
});

describe('formatRelativeTime', () => {
  const BASE_ISO = '2026-09-19T12:00:00.000Z';
  const now = new Date(BASE_ISO);

  it('handles null, undefined, empty, and invalid inputs gracefully', () => {
    expect(formatRelativeTime(null, now)).toBe('—');
    expect(formatRelativeTime(undefined, now)).toBe('—');
    expect(formatRelativeTime('', now)).toBe('—');
    expect(formatRelativeTime('invalid-date', now)).toBe('—');
  });

  it('formats recent timestamps (< 60s) as "just now"', () => {
    expect(formatRelativeTime(now, now)).toBe('just now');
    expect(formatRelativeTime('2026-09-19T11:59:45.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-09-19T11:59:01.000Z', now)).toBe('just now');
  });

  it('formats minute ranges (1m to 59m)', () => {
    expect(formatRelativeTime('2026-09-19T11:59:00.000Z', now)).toBe('1m ago');
    expect(formatRelativeTime('2026-09-19T11:55:00.000Z', now)).toBe('5m ago');
    expect(formatRelativeTime('2026-09-19T11:01:00.000Z', now)).toBe('59m ago');
  });

  it('formats hour ranges (1h to 23h)', () => {
    expect(formatRelativeTime('2026-09-19T11:00:00.000Z', now)).toBe('1h ago');
    expect(formatRelativeTime('2026-09-19T10:00:00.000Z', now)).toBe('2h ago');
    expect(formatRelativeTime('2026-09-18T13:00:00.000Z', now)).toBe('23h ago');
  });

  it('formats yesterday / calendar boundary', () => {
    // 25 hours ago on previous calendar day
    expect(formatRelativeTime('2026-09-18T11:00:00.000Z', now)).toBe('yesterday');
    // 36 hours ago
    expect(formatRelativeTime('2026-09-18T00:00:00.000Z', now)).toBe('yesterday');
  });

  it('formats days ranges (2d to 6d)', () => {
    expect(formatRelativeTime('2026-09-17T12:00:00.000Z', now)).toBe('2d ago');
    expect(formatRelativeTime('2026-09-16T12:00:00.000Z', now)).toBe('3d ago');
    expect(formatRelativeTime('2026-09-13T12:00:00.000Z', now)).toBe('6d ago');
  });

  it('formats week ranges (1w to 4w)', () => {
    expect(formatRelativeTime('2026-09-12T12:00:00.000Z', now)).toBe('1w ago');
    expect(formatRelativeTime('2026-09-05T12:00:00.000Z', now)).toBe('2w ago');
    expect(formatRelativeTime('2026-08-22T12:00:00.000Z', now)).toBe('4w ago');
  });

  it('formats month ranges (1mo to 11mo)', () => {
    expect(formatRelativeTime('2026-08-19T12:00:00.000Z', now)).toBe('1mo ago');
    expect(formatRelativeTime('2026-06-19T12:00:00.000Z', now)).toBe('3mo ago');
    expect(formatRelativeTime('2025-11-19T12:00:00.000Z', now)).toBe('10mo ago');
  });

  it('formats year ranges (1y+)', () => {
    expect(formatRelativeTime('2025-09-19T12:00:00.000Z', now)).toBe('1y ago');
    expect(formatRelativeTime('2023-09-19T12:00:00.000Z', now)).toBe('3y ago');
  });

  it('handles clock skew (< 60s in future) as "just now"', () => {
    expect(formatRelativeTime('2026-09-19T12:00:15.000Z', now)).toBe('just now');
    expect(formatRelativeTime('2026-09-19T12:00:59.000Z', now)).toBe('just now');
  });

  it('handles future timestamps gracefully', () => {
    expect(formatRelativeTime('2026-09-19T12:05:00.000Z', now)).toBe('in 5m');
    expect(formatRelativeTime('2026-09-19T14:00:00.000Z', now)).toBe('in 2h');
    expect(formatRelativeTime('2026-09-20T12:00:00.000Z', now)).toBe('tomorrow');
    expect(formatRelativeTime('2026-09-22T12:00:00.000Z', now)).toBe('in 3d');
  });

  describe('date-only YYYY-MM-DD values', () => {
    const localNow = new Date(2026, 8, 19, 15, 30, 0); // Sep 19, 2026

    it('formats today, yesterday, past days, weeks, months, and years for date-only inputs', () => {
      expect(formatRelativeTime('2026-09-19', localNow)).toBe('today');
      expect(formatRelativeTime('2026-09-18', localNow)).toBe('yesterday');
      expect(formatRelativeTime('2026-09-16', localNow)).toBe('3d ago');
      expect(formatRelativeTime('2026-09-05', localNow)).toBe('2w ago');
      expect(formatRelativeTime('2026-06-19', localNow)).toBe('3mo ago');
      expect(formatRelativeTime('2025-09-19', localNow)).toBe('1y ago');
    });

    it('formats future date-only inputs gracefully', () => {
      expect(formatRelativeTime('2026-09-20', localNow)).toBe('tomorrow');
      expect(formatRelativeTime('2026-09-22', localNow)).toBe('in 3d');
    });
  });
});

describe('formatFullDateTime', () => {
  it('returns empty string for null, undefined, empty, or invalid input', () => {
    expect(formatFullDateTime(null)).toBe('');
    expect(formatFullDateTime(undefined)).toBe('');
    expect(formatFullDateTime('')).toBe('');
    expect(formatFullDateTime('invalid-date')).toBe('');
  });

  it('formats full date and time for ISO strings', () => {
    const result = formatFullDateTime('2026-09-19T14:30:00.000Z', 'en-US');
    expect(result).toContain('2026');
    expect(result).toContain('Sep');
  });

  it('formats date-only string without arbitrary time-of-day', () => {
    const result = formatFullDateTime('2026-09-18', 'en-US');
    expect(result).toBe('Sep 18, 2026');
  });
});
