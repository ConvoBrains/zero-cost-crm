import { useEffect, useState } from 'react';
import { buildCallLog, fetchContactCallLog, type CallLogSummary } from '../lib/callLog';
import { IST_TZ } from '../lib/championCard';

function formatDay(isoDate: string): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return new Date(y!, (m ?? 1) - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('en-IN', {
    timeZone: IST_TZ,
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * Date-wise call log for a contact. Each day keeps its own status, follow-up and note,
 * so the first call's outcome is still visible after later calls overwrite the status.
 */
export function ContactCallLog({ contactId }: { contactId: string }) {
  const [log, setLog] = useState<CallLogSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    void fetchContactCallLog(contactId)
      .then((data) => {
        if (!cancelled) setLog(buildCallLog(data.events));
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Failed to load call log');
      });
    return () => {
      cancelled = true;
    };
  }, [contactId]);

  return (
    <section
      className="space-y-2 border-t border-[var(--color-line)] pt-4"
      aria-label="Contact call log"
      data-testid="contact-call-log"
    >
      <h3 className="text-sm font-semibold text-stone-800">Call log</h3>
      {error ? (
        <p role="alert" className="text-sm text-rose-600">
          {error}
        </p>
      ) : !log ? (
        <p className="text-sm text-stone-500">Loading call log…</p>
      ) : log.days.length === 0 ? (
        <p className="rounded-none border border-dashed border-stone-300 px-3 py-2 text-xs text-stone-500">
          No calls logged yet.
        </p>
      ) : (
        <>
          <p className="text-xs text-stone-600" data-testid="call-log-summary">
            {log.firstContactedDate
              ? `First contacted ${formatDay(log.firstContactedDate)}`
              : 'Not contacted yet'}
            {' · '}
            {log.callDays} call {log.callDays === 1 ? 'day' : 'days'}
          </p>
          <ol className="max-h-64 space-y-2 overflow-y-auto border border-stone-200 bg-stone-50/80 p-3">
            {log.days.map((day) => (
              <li key={day.date} className="text-sm text-stone-700" data-testid="call-log-day">
                <div className="flex flex-wrap items-baseline gap-x-2">
                  <time className="font-mono text-xs text-stone-500" dateTime={day.date}>
                    {formatDay(day.date)}
                  </time>
                  {day.date === log.firstContactedDate ? (
                    <span className="bg-teal-50 px-1.5 text-[10px] font-semibold text-teal-800 ring-1 ring-teal-200">
                      First call
                    </span>
                  ) : null}
                  <span className="text-xs text-stone-500">{day.people.join(', ')}</span>
                </div>
                <div className="mt-0.5 space-y-0.5 text-xs text-stone-600">
                  {day.created ? (
                    <p>Added{day.createdStatus ? ` as ${day.createdStatus}` : ''}</p>
                  ) : null}
                  {day.statusChanges.map((change, i) => (
                    <p key={`${change.at}-${i}`}>
                      <span className="font-mono text-stone-500">{formatTime(change.at)}</span>{' '}
                      {change.from ? `${change.from} → ` : ''}
                      <span className="font-medium text-stone-800">{change.to ?? '—'}</span>
                    </p>
                  ))}
                  {day.followUp ? <p>Next follow-up: {formatDay(day.followUp)}</p> : null}
                  {day.whatsappSent !== null ? (
                    <p>{day.whatsappSent ? 'WhatsApp sent' : 'WhatsApp unmarked'}</p>
                  ) : null}
                  {day.recordings > 0 ? (
                    <p>
                      {day.recordings} recording{day.recordings === 1 ? '' : 's'} uploaded
                    </p>
                  ) : null}
                  {day.notes.map((note, i) => (
                    <p key={i} className="whitespace-pre-wrap">
                      Note: {note}
                    </p>
                  ))}
                </div>
              </li>
            ))}
          </ol>
        </>
      )}
    </section>
  );
}
