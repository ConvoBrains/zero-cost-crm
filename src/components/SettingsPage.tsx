import { useEffect, useMemo, useState, type FormEvent } from 'react';
import type { AppConfig } from '../types';
import { api } from '../lib/api';
import {
  championMapToRows,
  championRowsToMap,
  validateChampionMapRows,
  type ChampionMapRow,
} from '../lib/championStatusMap';
import {
  questionsToRows,
  rowsToQuestions,
  validateDiscoveryQuestionRows,
  type DiscoveryQuestionRow,
} from '../lib/discoveryQuestions';
import { ChampionMapEditor } from './ChampionMapEditor';
import { DiscoveryQuestionsEditor } from './DiscoveryQuestionsEditor';
import { Field, inputClass, btnPrimary, btnGhost } from './ui';

interface SettingsPageProps {
  config: AppConfig;
  onSaved: () => Promise<void> | void;
}

function linesToList(text: string): string[] {
  return text
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function SettingsPage({ config, onSaved }: SettingsPageProps) {
  const [brandName, setBrandName] = useState(config.brandName);
  const [brandTagline, setBrandTagline] = useState(config.brandTagline);
  const [logoUrl, setLogoUrl] = useState(config.logoUrl);
  const [stagesText, setStagesText] = useState(config.stages.join('\n'));
  const [statusesText, setStatusesText] = useState(config.contactStatuses.join('\n'));
  const [mapRows, setMapRows] = useState<ChampionMapRow[]>(() =>
    championMapToRows(config.championStatusToStage)
  );
  const [discoveryRows, setDiscoveryRows] = useState<DiscoveryQuestionRow[]>(() =>
    questionsToRows(config.discoveryQuestions ?? [])
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setBrandName(config.brandName);
    setBrandTagline(config.brandTagline);
    setLogoUrl(config.logoUrl);
    setStagesText(config.stages.join('\n'));
    setStatusesText(config.contactStatuses.join('\n'));
    setMapRows(championMapToRows(config.championStatusToStage));
    setDiscoveryRows(questionsToRows(config.discoveryQuestions ?? []));
  }, [config]);

  const domainHint = useMemo(() => {
    if (config.allowAnyEmailDomain) return 'Any email domain (env ALLOWED_EMAIL_DOMAIN=*)';
    if (config.allowedEmailDomain) return `@${config.allowedEmailDomain} (from env)`;
    return 'Configured via env ALLOWED_EMAIL_DOMAIN';
  }, [config]);

  const liveStatuses = linesToList(statusesText);
  const liveStages = linesToList(stagesText);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const mapError = validateChampionMapRows(mapRows, liveStatuses, liveStages);
      if (mapError) {
        setError(mapError);
        return;
      }
      const discoveryError = validateDiscoveryQuestionRows(discoveryRows);
      if (discoveryError) {
        setError(discoveryError);
        return;
      }
      await api('/api/settings', {
        method: 'PATCH',
        body: JSON.stringify({
          brandName,
          brandTagline,
          logoUrl,
          stages: liveStages,
          contactStatuses: liveStatuses,
          championStatusToStage: championRowsToMap(mapRows),
          discoveryQuestions: rowsToQuestions(discoveryRows),
        }),
      });
      await onSaved();
      setMessage('Settings saved. Pipeline and forms will use the new lists.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-stone-900">Instance settings</h1>
        <p className="mt-1 text-sm text-stone-500">
          Branding, pipeline lists, champion auto-move mappings, and discovery questions are stored
          in the database so Zero Cost CRM stays generic. Email domain and database URL stay in
          server env.
        </p>
      </div>

      <form
        onSubmit={submit}
        className="space-y-5 border border-[var(--color-line)] bg-[var(--color-panel)] p-5"
      >
        <Field label="Brand name">
          <input
            className={inputClass}
            value={brandName}
            onChange={(e) => setBrandName(e.target.value)}
            required
          />
        </Field>
        <Field label="Tagline">
          <input
            className={inputClass}
            value={brandTagline}
            onChange={(e) => setBrandTagline(e.target.value)}
          />
        </Field>
        <Field label="Logo URL">
          <input
            className={inputClass}
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            placeholder="/convobrains-logo.png"
          />
        </Field>
        <Field label="Pipeline stages (one per line, top → bottom)">
          <textarea
            className={`${inputClass} min-h-48 font-mono text-xs`}
            value={stagesText}
            onChange={(e) => setStagesText(e.target.value)}
            required
          />
        </Field>
        <Field label="Contact statuses (one per line)">
          <textarea
            className={`${inputClass} min-h-48 font-mono text-xs`}
            value={statusesText}
            onChange={(e) => setStatusesText(e.target.value)}
            required
          />
        </Field>

        <ChampionMapEditor
          rows={mapRows}
          contactStatuses={liveStatuses}
          stages={liveStages}
          onChange={setMapRows}
        />

        <DiscoveryQuestionsEditor rows={discoveryRows} onChange={setDiscoveryRows} />

        <p className="text-xs text-stone-500">Login email policy: {domainHint}</p>

        {error ? (
          <p className="text-sm text-rose-700" role="alert">
            {error}
          </p>
        ) : null}
        {message ? <p className="text-sm text-teal-800">{message}</p> : null}

        <div className="flex gap-2">
          <button type="submit" className={btnPrimary} disabled={saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
          <button
            type="button"
            className={btnGhost}
            onClick={() => {
              setBrandName(config.brandName);
              setBrandTagline(config.brandTagline);
              setLogoUrl(config.logoUrl);
              setStagesText(config.stages.join('\n'));
              setStatusesText(config.contactStatuses.join('\n'));
              setMapRows(championMapToRows(config.championStatusToStage));
              setDiscoveryRows(questionsToRows(config.discoveryQuestions ?? []));
              setError(null);
              setMessage(null);
            }}
          >
            Reset
          </button>
        </div>
      </form>
    </div>
  );
}
