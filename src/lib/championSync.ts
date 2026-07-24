import {
  DEFAULT_CHAMPION_STATUS_TO_STAGE,
  DEFAULT_STAGES,
} from '../defaults.js'
import type { ContactStatus, Stage } from '../types.js'

/** @deprecated Prefer settings.championStatusToStage from the API. */
export const CHAMPION_STATUS_TO_STAGE: Record<string, string | null> = {
  ...DEFAULT_CHAMPION_STATUS_TO_STAGE,
}

export function resolveAutoMoveStage(
  currentStage: Stage,
  championStatus: ContactStatus,
  stages: readonly string[] = DEFAULT_STAGES,
  statusToStage: Record<string, string | null> = DEFAULT_CHAMPION_STATUS_TO_STAGE,
): Stage | null {
  if (currentStage === 'Closed Won' || currentStage === 'Closed Lost') return null
  const target = Object.prototype.hasOwnProperty.call(statusToStage, championStatus)
    ? statusToStage[championStatus]
    : undefined
  if (target == null) return null
  const targetIdx = stages.indexOf(target)
  const currentIdx = stages.indexOf(currentStage)
  if (targetIdx < 0 || currentIdx < 0) return null
  if (targetIdx <= currentIdx) return null
  return target
}
