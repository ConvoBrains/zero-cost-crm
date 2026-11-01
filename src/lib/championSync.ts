import { DEFAULT_CHAMPION_STATUS_TO_STAGE, DEFAULT_STAGES } from '../defaults.js';
import type { ContactStatus, Stage } from '../types.js';

/** @deprecated Prefer settings.championStatusToStage from the API. */
export const CHAMPION_STATUS_TO_STAGE: Record<string, string | null> = {
  ...DEFAULT_CHAMPION_STATUS_TO_STAGE,
};

/** From this stage on the deal is worked by hand; contact statuses no longer move it. */
const MANUAL_FROM_STAGE = 'Demo Scheduled';

/**
 * Where a contact's new status moves its company, or null for no move. Moves only go
 * forward in the configured stage order, so the company ends up at the furthest stage
 * any contact has reached, and never once it is at "Demo Scheduled" or later.
 */
export function resolveAutoMoveStage(
  currentStage: Stage,
  championStatus: ContactStatus,
  stages: readonly string[] = DEFAULT_STAGES,
  statusToStage: Record<string, string | null> = DEFAULT_CHAMPION_STATUS_TO_STAGE
): Stage | null {
  if (currentStage === 'Closed Won' || currentStage === 'Closed Lost') return null;
  const manualIdx = stages.indexOf(MANUAL_FROM_STAGE);
  if (manualIdx >= 0 && stages.indexOf(currentStage) >= manualIdx) return null;
  const target = Object.prototype.hasOwnProperty.call(statusToStage, championStatus)
    ? statusToStage[championStatus]
    : undefined;
  if (target == null) return null;
  const targetIdx = stages.indexOf(target);
  const currentIdx = stages.indexOf(currentStage);
  if (targetIdx < 0 || currentIdx < 0) return null;
  if (targetIdx <= currentIdx) return null;
  return target;
}
