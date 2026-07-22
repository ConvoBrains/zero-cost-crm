import { STAGES } from '../types.js'
import type { ContactStatus, Stage } from '../types.js'

export const CHAMPION_STATUS_TO_STAGE: Record<ContactStatus, Stage | null> = {
  'Not Contacted': null,
  "Didn't Pick": null,
  'Connected - Got Referral': 'Follow-up',
  'Connected - Not Right Person': 'Follow-up',
  'Connected - Future Follow-up': 'Follow-up',
  'Interested': 'Discovery Call Done',
  'Called': 'Discovery Call Done',
  'No Answer': null,
  'Follow-up Required': 'Follow-up',
  'Rejected': 'Not Interested',
}

export function resolveAutoMoveStage(
  currentStage: Stage,
  championStatus: ContactStatus,
): Stage | null {
  if (currentStage === 'Closed Won' || currentStage === 'Closed Lost') return null
  const target = CHAMPION_STATUS_TO_STAGE[championStatus]
  if (target === null) return null
  if (STAGES.indexOf(target) <= STAGES.indexOf(currentStage)) return null
  return target
}
