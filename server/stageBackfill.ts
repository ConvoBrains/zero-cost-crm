/**
 * One-time catch-up for the contact status → company stage auto-move: puts each company at
 * the furthest stage any of its contacts has ever reached, as if the current rules had been
 * live all along. Same rules as a live edit (map, scope, forward-only, manual from Demo).
 */

import { logActivity, type ActivityExecutor } from './activity.js';
import type { AppSettings } from './settings.js';
import { resolveAutoMoveStage } from '../src/lib/championSync.js';

export interface StageBackfillMove {
  companyId: string;
  companyName: string;
  from: string;
  to: string;
  /** The contact and status that earned the move. */
  contactId: string;
  contactName: string;
  contactStatus: string;
}

export async function planStageBackfill(
  executor: ActivityExecutor,
  settings: AppSettings
): Promise<StageBackfillMove[]> {
  const [companies, contacts, history] = await Promise.all([
    executor.query('SELECT id, company_name, stage FROM companies'),
    executor.query(
      'SELECT id, company_id, contact_name, contact_status, champion FROM contacts WHERE company_id IS NOT NULL'
    ),
    executor.query(`
      SELECT entity_id::text AS id, array_agg(DISTINCT s.status) AS statuses
      FROM activity_events ae
      CROSS JOIN LATERAL (
        VALUES (ae.payload->>'from'), (ae.payload->>'to'), (ae.payload->>'status')
      ) AS s(status)
      WHERE ae.entity_type = 'contact'
        AND ae.entity_id IS NOT NULL
        AND ae.event_type IN ('contact.status_changed', 'contact.created')
        AND s.status IS NOT NULL AND s.status <> ''
      GROUP BY ae.entity_id
    `),
  ]);

  const historyById = new Map<string, string[]>(
    history.rows.map((r) => [String(r.id), (r.statuses ?? []) as string[]])
  );
  const contactsByCompany = new Map<string, Array<Record<string, unknown>>>();
  for (const row of contacts.rows) {
    if (settings.stageAutoMoveScope !== 'any_contact' && !row.champion) continue;
    const key = String(row.company_id);
    const list = contactsByCompany.get(key);
    if (list) list.push(row);
    else contactsByCompany.set(key, [row]);
  }

  const moves: StageBackfillMove[] = [];
  for (const company of companies.rows) {
    const from = String(company.stage);
    let best: StageBackfillMove | null = null;
    for (const contact of contactsByCompany.get(String(company.id)) ?? []) {
      const statuses = new Set([
        String(contact.contact_status),
        ...(historyById.get(String(contact.id)) ?? []),
      ]);
      for (const status of statuses) {
        const to = resolveAutoMoveStage(
          from,
          status,
          settings.stages,
          settings.championStatusToStage
        );
        if (!to) continue;
        if (best && settings.stages.indexOf(to) <= settings.stages.indexOf(best.to)) continue;
        best = {
          companyId: String(company.id),
          companyName: String(company.company_name),
          from,
          to,
          contactId: String(contact.id),
          contactName: String(contact.contact_name),
          contactStatus: status,
        };
      }
    }
    if (best) moves.push(best);
  }
  return moves.sort(
    (a, b) =>
      a.from.localeCompare(b.from) ||
      a.to.localeCompare(b.to) ||
      a.companyName.localeCompare(b.companyName)
  );
}

/** Applies planned moves and logs each as company.stage_changed (source backfill). */
export async function applyStageBackfill(
  executor: ActivityExecutor,
  moves: StageBackfillMove[],
  userId: string
): Promise<number> {
  let moved = 0;
  for (const m of moves) {
    // Only move a company that is still where the plan found it.
    const { rowCount } = await executor.query(
      'UPDATE companies SET stage = $1, updated_at = now() WHERE id = $2 AND stage = $3',
      [m.to, m.companyId, m.from]
    );
    if (!rowCount) continue;
    moved += 1;
    await logActivity(
      {
        userId,
        eventType: 'company.stage_changed',
        entityType: 'company',
        entityId: m.companyId,
        summary: `Stage → ${m.to} (${m.companyName}), from ${m.contactName}: ${m.contactStatus}`,
        payload: {
          from: m.from,
          to: m.to,
          name: m.companyName,
          source: 'backfill',
          contactId: m.contactId,
          contactName: m.contactName,
          contactStatus: m.contactStatus,
        },
      },
      executor
    );
  }
  return moved;
}
