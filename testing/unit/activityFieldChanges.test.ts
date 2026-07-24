import { describe, expect, it } from 'vitest'
import {
  collectFieldChanges,
  formatFieldChangeSummary,
  noteSnippet,
  normalizeActivityValue,
} from '../../server/activity'

describe('activity field change helpers', () => {
  it('normalizes empty and dates', () => {
    expect(normalizeActivityValue('')).toBeNull()
    expect(normalizeActivityValue(null)).toBeNull()
    expect(normalizeActivityValue(true)).toBe('true')
    expect(normalizeActivityValue(new Date('2026-07-21T00:00:00.000Z'))).toBe('2026-07-21')
  })

  it('collects only provided changed fields', () => {
    const changes = collectFieldChanges([
      {
        field: 'phone',
        label: 'Phone',
        before: '111',
        after: '222',
        provided: true,
      },
      {
        field: 'email',
        label: 'Email',
        before: 'a@x.com',
        after: 'a@x.com',
        provided: true,
      },
      {
        field: 'role',
        label: 'Role',
        before: 'VP',
        after: 'CEO',
        provided: false,
      },
    ])
    expect(changes).toEqual([{ field: 'phone', label: 'Phone', from: '111', to: '222' }])
  })

  it('formats note snippets', () => {
    expect(noteSnippet('Hello, testing notes')).toBe('Hello, testing notes')
    expect(noteSnippet('x'.repeat(200))?.endsWith('…')).toBe(true)
  })

  it('formats single vs multi field summaries', () => {
    expect(
      formatFieldChangeSummary('Subodh', [
        { field: 'phone', label: 'Phone', from: '1', to: '2' },
      ]),
    ).toBe('Phone: 1 → 2 (Subodh)')
    expect(
      formatFieldChangeSummary('Subodh', [
        { field: 'phone', label: 'Phone', from: '1', to: '2' },
        { field: 'email', label: 'Email', from: 'a', to: 'b' },
      ]),
    ).toBe('Updated Phone, Email on Subodh')
  })
})
