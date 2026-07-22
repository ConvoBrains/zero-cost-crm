import { describe, expect, it } from 'vitest'
import { CHAMPION_STATUS_TO_STAGE, resolveAutoMoveStage } from '../../src/lib/championSync'
import { CONTACT_STATUSES } from '../../src/types'
import type { ContactStatus, Stage } from '../../src/types'

// Locked mapping from contract.md (issue #29).
const EXPECTED: Record<ContactStatus, Stage | null> = {
  'Not Contacted': null,
  "Didn't Pick": null,
  'No Answer': null,
  Called: 'Discovery Call Done',
  Interested: 'Discovery Call Done',
  'Follow-up Required': 'Follow-up',
  'Connected - Future Follow-up': 'Follow-up',
  'Connected - Got Referral': 'Follow-up',
  'Connected - Not Right Person': 'Follow-up',
  Rejected: 'Not Interested',
}

describe('CHAMPION_STATUS_TO_STAGE', () => {
  it('maps every champion status exactly as the contract specifies', () => {
    expect(CHAMPION_STATUS_TO_STAGE).toEqual(EXPECTED)
  })

  it('has an entry for every ContactStatus (no missing keys)', () => {
    for (const status of CONTACT_STATUSES) {
      expect(status in CHAMPION_STATUS_TO_STAGE).toBe(true)
    }
  })
})

describe('resolveAutoMoveStage', () => {
  it('returns null for the no-move statuses regardless of current stage', () => {
    for (const status of ['Not Contacted', "Didn't Pick", 'No Answer'] as ContactStatus[]) {
      expect(resolveAutoMoveStage('Lead Added', status)).toBeNull()
    }
  })

  it('moves forward to the mapped stage', () => {
    expect(resolveAutoMoveStage('Lead Added', 'Interested')).toBe('Discovery Call Done')
    expect(resolveAutoMoveStage('Lead Added', 'Called')).toBe('Discovery Call Done')
    expect(resolveAutoMoveStage('Lead Added', 'Follow-up Required')).toBe('Follow-up')
    expect(resolveAutoMoveStage('Lead Added', 'Connected - Future Follow-up')).toBe('Follow-up')
    expect(resolveAutoMoveStage('Lead Added', 'Connected - Got Referral')).toBe('Follow-up')
    expect(resolveAutoMoveStage('Lead Added', 'Connected - Not Right Person')).toBe('Follow-up')
    expect(resolveAutoMoveStage('Lead Added', 'Rejected')).toBe('Not Interested')
  })

  it('never moves backward (mapped target behind current stage)', () => {
    // 'Discovery Call Done' sits behind 'Follow-up' in STAGES order.
    expect(resolveAutoMoveStage('Follow-up', 'Interested')).toBeNull()
    // 'Follow-up' sits behind 'Demo Scheduled'.
    expect(resolveAutoMoveStage('Demo Scheduled', 'Follow-up Required')).toBeNull()
  })

  it('does not move when the mapped target equals the current stage (strictly forward only)', () => {
    expect(resolveAutoMoveStage('Discovery Call Done', 'Interested')).toBeNull()
    expect(resolveAutoMoveStage('Follow-up', 'Follow-up Required')).toBeNull()
  })

  it('never auto-moves a closed company', () => {
    expect(resolveAutoMoveStage('Closed Won', 'Interested')).toBeNull()
    // Rejected → Not Interested is forward of Closed Lost in STAGES order,
    // but the closed-company guard takes precedence.
    expect(resolveAutoMoveStage('Closed Lost', 'Rejected')).toBeNull()
  })

  it('moves Rejected → Not Interested from an active mid stage', () => {
    expect(resolveAutoMoveStage('Follow-up', 'Rejected')).toBe('Not Interested')
  })
})
