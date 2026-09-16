import { btnGhost, inputClass } from './ui';
import { unusedContactStatuses, type ChampionMapRow } from '../lib/championStatusMap';

interface ChampionMapEditorProps {
  rows: ChampionMapRow[];
  contactStatuses: string[];
  stages: string[];
  onChange: (rows: ChampionMapRow[]) => void;
}

export function ChampionMapEditor({
  rows,
  contactStatuses,
  stages,
  onChange,
}: ChampionMapEditorProps) {
  const unused = unusedContactStatuses(contactStatuses, rows);
  const canAdd = unused.length > 0 && stages.length > 0;

  const updateRow = (id: string, patch: Partial<ChampionMapRow>) => {
    onChange(rows.map((row) => (row.id === id ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    if (!canAdd) return;
    const status = unused[0] ?? '';
    const stage = stages[0] ?? '';
    onChange([...rows, { id: `champion-map-new-${rows.length}-${status}`, status, stage }]);
  };

  return (
    <section data-testid="champion-map-editor" aria-labelledby="champion-map-heading">
      <h2 id="champion-map-heading" className="text-sm font-medium text-stone-600">
        Champion status → pipeline stage
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        When a champion&apos;s contact status changes, the company can move forward to the mapped
        pipeline stage. Companies never move backward, and Closed Won / Closed Lost are never
        auto-moved. Statuses without a row stay put.
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500" data-testid="champion-map-empty">
          No auto-move mappings yet. Add a row to move a company when its champion hits a status.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {rows.map((row) => {
            const statusOptions = unusedContactStatuses(contactStatuses, rows, row.status);
            if (row.status && !statusOptions.includes(row.status)) {
              statusOptions.unshift(row.status);
            }
            const stageOptions =
              row.stage && !stages.includes(row.stage) ? [row.stage, ...stages] : stages;

            return (
              <li
                key={row.id}
                data-testid="champion-map-row"
                className="grid grid-cols-1 items-end gap-2 sm:grid-cols-[1fr_auto_1fr_auto]"
              >
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-stone-500">Contact status</span>
                  <select
                    className={inputClass}
                    value={row.status}
                    onChange={(e) => updateRow(row.id, { status: e.target.value })}
                    aria-label="Contact status"
                  >
                    {statusOptions.map((status) => (
                      <option key={status} value={status}>
                        {contactStatuses.includes(status) ? status : `${status} (not in list)`}
                      </option>
                    ))}
                  </select>
                </label>
                <span aria-hidden className="hidden pb-3 text-xs text-stone-400 sm:inline">
                  →
                </span>
                <label className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <span className="text-xs font-medium text-stone-500">Pipeline stage</span>
                  <select
                    className={inputClass}
                    value={row.stage}
                    onChange={(e) => updateRow(row.id, { stage: e.target.value })}
                    aria-label="Pipeline stage"
                  >
                    {stageOptions.map((stage) => (
                      <option key={stage} value={stage}>
                        {stages.includes(stage) ? stage : `${stage} (not in list)`}
                      </option>
                    ))}
                  </select>
                </label>
                <button
                  type="button"
                  className={btnGhost}
                  data-testid="champion-map-remove"
                  aria-label={`Remove mapping for ${row.status || 'this status'}`}
                  onClick={() => onChange(rows.filter((r) => r.id !== row.id))}
                >
                  Remove
                </button>
              </li>
            );
          })}
        </ul>
      )}

      <button
        type="button"
        className={`${btnGhost} mt-3`}
        data-testid="champion-map-add"
        disabled={!canAdd}
        onClick={addRow}
      >
        Add mapping
      </button>
    </section>
  );
}
