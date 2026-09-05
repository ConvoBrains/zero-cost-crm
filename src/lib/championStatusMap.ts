/** Champion contact status → pipeline stage auto-move map helpers. */

export type ChampionStatusToStage = Record<string, string | null>;

export interface ChampionMapRow {
  id: string;
  status: string;
  stage: string;
}

let rowSeq = 0;

function nextRowId(status: string): string {
  rowSeq += 1;
  return `champion-map-${rowSeq}-${status || 'new'}`;
}

/** Visible editor rows: only statuses that actually auto-move (non-null stage). */
export function championMapToRows(map: ChampionStatusToStage): ChampionMapRow[] {
  const rows: ChampionMapRow[] = [];
  for (const [status, stage] of Object.entries(map)) {
    if (typeof stage !== 'string' || !stage.trim()) continue;
    rows.push({ id: nextRowId(status), status, stage });
  }
  return rows;
}

export function championRowsToMap(rows: ChampionMapRow[]): ChampionStatusToStage {
  const map: ChampionStatusToStage = {};
  for (const row of rows) {
    const status = row.status.trim();
    const stage = row.stage.trim();
    if (!status || !stage) continue;
    map[status] = stage;
  }
  return map;
}

export function unusedContactStatuses(
  contactStatuses: readonly string[],
  rows: ChampionMapRow[],
  currentStatus = ''
): string[] {
  const used = new Set(rows.map((row) => row.status).filter((status) => status !== currentStatus));
  return contactStatuses.filter((status) => !used.has(status));
}

/**
 * Reject maps whose keys/values are not in the configured lists.
 * Null targets are allowed (explicit no auto-move).
 */
export function validateChampionStatusToStage(
  map: ChampionStatusToStage,
  contactStatuses: readonly string[],
  stages: readonly string[]
): string | null {
  const statusSet = new Set(contactStatuses);
  const stageSet = new Set(stages);

  for (const [rawStatus, stage] of Object.entries(map)) {
    const status = rawStatus.trim();
    if (!status) {
      return 'championStatusToStage keys must be non-empty.';
    }
    if (!statusSet.has(rawStatus) && !statusSet.has(status)) {
      return `championStatusToStage key "${rawStatus}" is not a configured contact status.`;
    }
    if (stage == null) continue;
    if (typeof stage !== 'string' || !stage.trim()) {
      return `championStatusToStage["${rawStatus}"] must be a pipeline stage or null.`;
    }
    if (!stageSet.has(stage) && !stageSet.has(stage.trim())) {
      return `championStatusToStage["${rawStatus}"] targets unknown stage "${stage}".`;
    }
  }
  return null;
}

export function validateChampionMapRows(
  rows: ChampionMapRow[],
  contactStatuses: readonly string[],
  stages: readonly string[]
): string | null {
  const seen = new Set<string>();
  for (const row of rows) {
    const status = row.status.trim();
    const stage = row.stage.trim();
    if (!status) return 'Each mapping needs a contact status.';
    if (!stage) return 'Each mapping needs a pipeline stage.';
    if (seen.has(status)) {
      return `Contact status "${status}" is mapped more than once.`;
    }
    seen.add(status);
  }
  return validateChampionStatusToStage(championRowsToMap(rows), contactStatuses, stages);
}
