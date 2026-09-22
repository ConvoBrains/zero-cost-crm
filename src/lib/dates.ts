/**
 * Date and relative time formatting helpers for Zero Cost CRM.
 * Pure TypeScript functions with zero external dependencies.
 */

/**
 * Parses an ISO timestamp string, Date instance, or YYYY-MM-DD date-only string.
 * For YYYY-MM-DD, constructs a Date in local midnight to avoid UTC date-shift issues.
 */
export function parseDate(value: string | Date | null | undefined): Date | null {
  if (!value) return null;
  if (value instanceof Date) {
    return isNaN(value.getTime()) ? null : value;
  }
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;

  const dateOnlyMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(trimmed);
  if (dateOnlyMatch) {
    const year = Number(dateOnlyMatch[1]);
    const month = Number(dateOnlyMatch[2]) - 1;
    const day = Number(dateOnlyMatch[3]);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d;
    }
    return null;
  }

  const d = new Date(trimmed);
  return isNaN(d.getTime()) ? null : d;
}

/**
 * Formats a timestamp into a compact relative string (e.g. "just now", "5m ago", "2h ago",
 * "yesterday", "3d ago", "2w ago", "3mo ago", "1y ago").
 *
 * Accepts an optional `now` parameter for deterministic testing.
 */
export function formatRelativeTime(
  value: string | Date | null | undefined,
  now: Date = new Date()
): string {
  const date = parseDate(value);
  if (!date) return '—';

  const isDateOnly = typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim());

  if (isDateOnly) {
    const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const diffDays = Math.round((nowMidnight.getTime() - dateMidnight.getTime()) / 86_400_000);

    if (diffDays === 0) return 'today';
    if (diffDays === 1) return 'yesterday';
    if (diffDays === -1) return 'tomorrow';
    if (diffDays > 1) {
      if (diffDays < 7) return `${diffDays}d ago`;
      if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;
      if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`;
      return `${Math.floor(diffDays / 365)}y ago`;
    }
    const absDays = -diffDays;
    if (absDays < 7) return `in ${absDays}d`;
    if (absDays < 30) return `in ${Math.floor(absDays / 7)}w`;
    if (absDays < 365) return `in ${Math.floor(absDays / 30)}mo`;
    return `in ${Math.floor(absDays / 365)}y`;
  }

  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  // Future or clock skew (< 60s in future is treated as "just now")
  if (diffSec < 0) {
    if (diffSec >= -60) return 'just now';
    const futureSec = -diffSec;
    if (futureSec < 3600) return `in ${Math.floor(futureSec / 60)}m`;
    if (futureSec < 86_400) return `in ${Math.floor(futureSec / 3600)}h`;
    const futureDays = Math.floor(futureSec / 86_400);
    if (futureDays === 1) return 'tomorrow';
    if (futureDays < 7) return `in ${futureDays}d`;
    if (futureDays < 30) return `in ${Math.floor(futureDays / 7)}w`;
    if (futureDays < 365) return `in ${Math.floor(futureDays / 30)}mo`;
    return `in ${Math.floor(futureDays / 365)}y`;
  }

  if (diffSec < 60) return 'just now';
  if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
  if (diffSec < 86_400) return `${Math.floor(diffSec / 3600)}h ago`;

  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dateMidnight = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const calDays = Math.round((nowMidnight.getTime() - dateMidnight.getTime()) / 86_400_000);
  const days = Math.floor(diffSec / 86_400);

  if (calDays === 1 || days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;

  const months = Math.floor(days / 30);
  if (months < 12) return `${months}mo ago`;

  const years = Math.floor(days / 365) || 1;
  return `${years}y ago`;
}

/**
 * Formats a full date/time string suitable for hover tooltips.
 * Returns empty string if value is missing or invalid.
 */
export function formatFullDateTime(
  value: string | Date | null | undefined,
  locale?: string
): string {
  if (!value) return '';

  const isDateOnly = typeof value === 'string' && /^(\d{4})-(\d{2})-(\d{2})$/.test(value.trim());
  if (isDateOnly) {
    const d = parseDate(value);
    if (!d) return '';
    try {
      return new Intl.DateTimeFormat(locale, {
        dateStyle: 'medium',
      }).format(d);
    } catch {
      return '';
    }
  }

  const d = value instanceof Date ? value : parseDate(value);
  if (!d) return '';
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return '';
  }
}
