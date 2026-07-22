import type { Company, Contact } from '../types.js'

export const NOTE_PREVIEW_MAX = 60

/**
 * The single calendar-day policy shared by the "Due today" badge and the champion
 * follow-up line. Both must agree on what "today" is, or near midnight a follow-up
 * dated for the IST day could render "Due today" while the trail line shows a
 * different day (or vice versa).
 */
export const IST_TZ = 'Asia/Kolkata'

/**
 * Today's calendar day in the {@link IST_TZ} timezone, as a `YYYY-MM-DD` string.
 *
 * Follow-up dates are stored as bare `YYYY-MM-DD` values and the trail formats them
 * in Asia/Kolkata, so "today" must be resolved with the same calendar to compare
 * correctly. `now` is injectable for deterministic tests.
 */
export function istToday(now: Date = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: IST_TZ,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now)
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

export function findChampion(contacts: Contact[], companyId: string): Contact | null {
  return contacts.find((c) => c.companyId === companyId && c.champion) ?? null
}

export function buildCardBadges(
  company: Company,
  contacts: Contact[],
  today: string = istToday(),
): { contactCount: number; hasChampion: boolean; followUpDueToday: boolean } {
  const companyContacts = contacts.filter((c) => c.companyId === company.id)
  const champion = findChampion(contacts, company.id)
  return {
    contactCount: companyContacts.length,
    hasChampion: champion !== null,
    followUpDueToday: company.nextFollowUp === today || champion?.nextFollowUp === today,
  }
}

export function buildChampionTrail(
  champion: Contact | null,
): { header: string; note: string | null; followUp: string | null } | null {
  if (!champion) return null
  const header = `★ ${champion.contactName} · ${champion.contactStatus}`
  const note = champion.notes
    ? `Note: ${
        champion.notes.length > NOTE_PREVIEW_MAX
          ? `${champion.notes.slice(0, NOTE_PREVIEW_MAX)}…`
          : champion.notes
      }`
    : null
  const followUp = champion.nextFollowUp
    ? `FU ${new Intl.DateTimeFormat('en-IN', {
        timeZone: IST_TZ,
        day: 'numeric',
        month: 'short',
      }).format(new Date(champion.nextFollowUp))}`
    : null
  return { header, note, followUp }
}
