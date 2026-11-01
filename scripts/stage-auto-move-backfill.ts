/**
 * Move existing companies to the furthest stage their contacts have reached, using the
 * instance's contact status → stage map and auto-move scope (Settings).
 *
 * Usage:
 *   npm run stage:backfill                 # dry run: prints the moves, changes nothing
 *   npm run stage:backfill -- --apply      # applies them in one transaction
 *   npm run stage:backfill -- --apply --as founder@example.com
 *
 * Moves are logged as company.stage_changed (source: backfill) by the --as user, or the
 * first founder/admin when --as is not given.
 */
import { pool } from '../server/db.js';
import { getAppSettings } from '../server/settings.js';
import { applyStageBackfill, planStageBackfill } from '../server/stageBackfill.js';

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const asIdx = args.indexOf('--as');
const asEmail = asIdx >= 0 ? args[asIdx + 1] : undefined;

async function main() {
  const db = (await pool.query('SELECT current_database() AS db')).rows[0].db;
  const settings = await getAppSettings();
  console.log(`Database: ${db} · scope: ${settings.stageAutoMoveScope}`);

  const moves = await planStageBackfill(pool, settings);
  const groups = new Map<string, typeof moves>();
  for (const m of moves) {
    const key = `${m.from} → ${m.to}`;
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  for (const [key, list] of groups) {
    console.log(`\n${key}: ${list.length}`);
    for (const m of list) {
      console.log(`  ${m.companyName}  (${m.contactName}: ${m.contactStatus})`);
    }
  }
  console.log(`\nTotal companies to move: ${moves.length}`);

  if (!apply) {
    console.log('Dry run. Nothing changed. Re-run with --apply to move them.');
    return;
  }

  const user = (
    await pool.query(
      asEmail
        ? 'SELECT id, email FROM users WHERE lower(email) = lower($1)'
        : "SELECT id, email FROM users WHERE role IN ('founder', 'admin') ORDER BY created_at LIMIT 1",
      asEmail ? [asEmail] : []
    )
  ).rows[0];
  if (!user) throw new Error(asEmail ? `No user ${asEmail}` : 'No founder/admin user found');

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const moved = await applyStageBackfill(client, moves, String(user.id));
    await client.query('COMMIT');
    console.log(`Applied: ${moved} companies moved, logged as ${user.email}.`);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => void pool.end());
