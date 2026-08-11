/**
 * Tiny dependency-free relative-time formatter.
 *
 * Renders an ISO date as human-friendly relative text for recent dates
 * ("2h ago", "yesterday", "in 3 days") while keeping the absolute value
 * available for tooltips / accessible text.
 */

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

/** Human-friendly relative label for an ISO date string. */
export function formatRelativeTime(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return '—';
  const asDate = new Date(iso);
  if (Number.isNaN(asDate.getTime())) return '—';

  const diffMs = asDate.getTime() - now.getTime();
  const absMs = Math.abs(diffMs);

  if (absMs < MINUTE) return diffMs >= 0 ? 'just now' : 'just now';
  if (absMs < HOUR) {
    const mins = Math.floor(absMs / MINUTE);
    return diffMs >= 0 ? `in ${mins}m` : `${mins}m ago`;
  }
  if (absMs < DAY) {
    const hours = Math.floor(absMs / HOUR);
    return diffMs >= 0 ? `in ${hours}h` : `${hours}h ago`;
  }

  // Calendar-day boundaries for "yesterday" / "tomorrow"
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfTarget = new Date(
    asDate.getFullYear(),
    asDate.getMonth(),
    asDate.getDate(),
  );
  const dayDiff = Math.round(
    (startOfTarget.getTime() - startOfToday.getTime()) / DAY,
  );

  if (dayDiff === -1) return 'yesterday';
  if (dayDiff === 1) return 'tomorrow';

  if (absMs < 7 * DAY) {
    return diffMs >= 0 ? `in ${dayDiff}d` : `${-dayDiff}d ago`;
  }

  // Older dates: keep it compact but unambiguous.
  if (diffMs >= 0) {
    return `in ${Math.floor(absMs / DAY)}d`;
  }
  return `${Math.floor(absMs / DAY)}d ago`;
}

/** Absolute date for tooltips (title) — e.g. "2026-08-12" or "Aug 12, 2026". */
export function formatAbsoluteDate(
  iso: string | null | undefined,
  now: Date = new Date(),
): string {
  if (!iso) return '—';
  const asDate = new Date(iso);
  if (Number.isNaN(asDate.getTime())) return '—';
  return asDate.toLocaleDateString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}