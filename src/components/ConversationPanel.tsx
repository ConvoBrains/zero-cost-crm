import { useCallback, useEffect, useState } from 'react'
import type { Conversation, Stage } from '../types'
import { STAGES } from '../types'
import type { CrmStore } from '../hooks/useCrmStore'
import {
  deleteConversation,
  getPlayUrl,
  listConversations,
  uploadConversationRecording,
} from '../lib/conversations'
import { Field, inputClass, btnGhost, btnPrimary } from './ui'

interface ConversationPanelProps {
  store: CrmStore
  contactId: string
  companyId: string | null
}

function formatCalledAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    })
  } catch {
    return iso
  }
}

export function ConversationPanel({ store, contactId, companyId }: ConversationPanelProps) {
  const company = companyId ? store.getCompany(companyId) : null
  const [stageAtCall, setStageAtCall] = useState<Stage>(company?.stage ?? 'Lead Added')
  const [notes, setNotes] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Conversation[]>([])
  const [loading, setLoading] = useState(true)
  const [playingId, setPlayingId] = useState<string | null>(null)
  const [playUrl, setPlayUrl] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const rows = await listConversations({ contactId })
      setItems(rows)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load recordings')
    } finally {
      setLoading(false)
    }
  }, [contactId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  useEffect(() => {
    if (company?.stage) setStageAtCall(company.stage)
  }, [company?.stage])

  const upload = async () => {
    if (!file) {
      setError('Choose an audio file first')
      return
    }
    setUploading(true)
    setError(null)
    try {
      await uploadConversationRecording(contactId, stageAtCall, file, notes || undefined)
      setFile(null)
      setNotes('')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Upload failed')
    } finally {
      setUploading(false)
    }
  }

  const play = async (id: string) => {
    try {
      const url = await getPlayUrl(id)
      setPlayingId(id)
      setPlayUrl(url)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Playback failed')
    }
  }

  const remove = async (id: string) => {
    if (!confirm('Delete this recording?')) return
    try {
      await deleteConversation(id)
      if (playingId === id) {
        setPlayingId(null)
        setPlayUrl(null)
      }
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    }
  }

  return (
    <div className="space-y-4 rounded-2xl border border-[var(--color-line)] bg-stone-50/50 p-4">
      <div>
        <h3 className="text-sm font-semibold text-stone-800">Call recordings</h3>
        <p className="mt-1 text-xs text-stone-500">
          Set the company stage for this call before uploading. Time is saved automatically when
          the file reaches storage.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Stage at call">
          <select
            className={inputClass}
            value={stageAtCall}
            onChange={(e) => setStageAtCall(e.target.value as Stage)}
          >
            {STAGES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Audio file (mp3, m4a, wav, webm)">
          <input
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.webm,.ogg,.aac,.mp4"
            className={inputClass}
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </Field>
        <Field label="Notes (optional)" className="sm:col-span-2">
          <input
            className={inputClass}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Quick call summary"
          />
        </Field>
      </div>

      <button
        type="button"
        className={btnPrimary}
        disabled={uploading || !file}
        onClick={() => void upload()}
      >
        {uploading ? 'Uploading…' : 'Upload recording'}
      </button>

      {error ? (
        <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">{error}</p>
      ) : null}

      {playUrl ? (
        <audio controls className="w-full" src={playUrl} autoPlay>
          <track kind="captions" />
        </audio>
      ) : null}

      <div>
        <p className="mb-2 text-xs font-semibold tracking-wide text-stone-500 uppercase">
          History ({items.length})
        </p>
        {loading ? (
          <p className="text-xs text-stone-400">Loading…</p>
        ) : items.length === 0 ? (
          <p className="text-xs text-stone-400">No recordings yet.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-line)] rounded-xl border border-[var(--color-line)] bg-white">
            {items.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5">
                <div className="min-w-0 text-xs">
                  <p className="font-medium text-stone-800">{formatCalledAt(c.calledAt)}</p>
                  <p className="text-stone-500">
                    {c.calledByName} · stage: {c.stageAtCall}
                  </p>
                  {c.notes ? <p className="mt-0.5 text-stone-400">{c.notes}</p> : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  <button type="button" className={btnGhost} onClick={() => void play(c.id)}>
                    Play
                  </button>
                  {store.canDelete ? (
                    <button
                      type="button"
                      className="text-xs text-rose-600 hover:underline"
                      onClick={() => void remove(c.id)}
                    >
                      Delete
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
