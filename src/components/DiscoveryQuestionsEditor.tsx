import { btnGhost, inputClass } from './ui';
import { DISCOVERY_INPUT_TYPES, type DiscoveryQuestionRow } from '../lib/discoveryQuestions';
import type { DiscoveryInputType } from '../defaults';

interface DiscoveryQuestionsEditorProps {
  rows: DiscoveryQuestionRow[];
  onChange: (rows: DiscoveryQuestionRow[]) => void;
}

export function DiscoveryQuestionsEditor({ rows, onChange }: DiscoveryQuestionsEditorProps) {
  const updateRow = (rowKey: string, patch: Partial<DiscoveryQuestionRow>) => {
    onChange(rows.map((row) => (row.rowKey === rowKey ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    const nextIndex = rows.length + 1;
    const newRow: DiscoveryQuestionRow = {
      rowKey: `discovery-q-new-${Date.now()}-${nextIndex}`,
      id: `question_${nextIndex}`,
      section: 'Discovery',
      prompt: '',
      input: 'text',
    };
    onChange([...rows, newRow]);
  };

  const removeRow = (rowKey: string) => {
    onChange(rows.filter((r) => r.rowKey !== rowKey));
  };

  return (
    <section data-testid="discovery-questions-editor" aria-labelledby="discovery-questions-heading">
      <h2 id="discovery-questions-heading" className="text-sm font-medium text-stone-600">
        Discovery questions
      </h2>
      <p className="mt-1 text-xs text-stone-500">
        Custom discovery questions shown on the company form grouped by section. Each question needs
        a unique ID (used for answers), section header, prompt label, and input type (text,
        textarea, or number).
      </p>

      {rows.length === 0 ? (
        <p className="mt-3 text-sm text-stone-500" data-testid="discovery-questions-empty">
          No discovery questions configured. When empty, the Discovery section on company forms is
          hidden.
        </p>
      ) : (
        <ul className="mt-3 space-y-3">
          {rows.map((row, index) => (
            <li
              key={row.rowKey}
              data-testid="discovery-question-row"
              className="space-y-2 rounded border border-stone-200 bg-stone-50/50 p-3"
            >
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <label className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-stone-500">ID (unique key)</span>
                  <input
                    className={inputClass}
                    value={row.id}
                    placeholder="e.g. annual_budget"
                    onChange={(e) => updateRow(row.rowKey, { id: e.target.value })}
                    aria-label={`Question ${index + 1} ID`}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-stone-500">Section</span>
                  <input
                    className={inputClass}
                    value={row.section}
                    placeholder="e.g. Budget & Timeline"
                    onChange={(e) => updateRow(row.rowKey, { section: e.target.value })}
                    aria-label={`Question ${index + 1} Section`}
                  />
                </label>
                <label className="flex min-w-0 flex-col gap-1 text-sm">
                  <span className="text-xs font-medium text-stone-500">Input type</span>
                  <select
                    className={inputClass}
                    value={row.input}
                    onChange={(e) =>
                      updateRow(row.rowKey, {
                        input: e.target.value as DiscoveryInputType,
                      })
                    }
                    aria-label={`Question ${index + 1} Input type`}
                  >
                    {DISCOVERY_INPUT_TYPES.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              <div className="flex flex-col items-end gap-2 sm:flex-row sm:items-end">
                <label className="flex min-w-0 flex-1 flex-col gap-1 text-sm w-full">
                  <span className="text-xs font-medium text-stone-500">
                    Prompt (question label)
                  </span>
                  <input
                    className={inputClass}
                    value={row.prompt}
                    placeholder="e.g. What is your estimated annual budget?"
                    onChange={(e) => updateRow(row.rowKey, { prompt: e.target.value })}
                    aria-label={`Question ${index + 1} Prompt`}
                  />
                </label>
                <button
                  type="button"
                  className={btnGhost}
                  data-testid="discovery-question-remove"
                  aria-label={`Remove question ${row.id || index + 1}`}
                  onClick={() => removeRow(row.rowKey)}
                >
                  Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <button
        type="button"
        className={`${btnGhost} mt-3`}
        data-testid="discovery-questions-add"
        onClick={addRow}
      >
        Add question
      </button>
    </section>
  );
}
