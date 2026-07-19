import type { Company, Contact } from '../types.js'

export const NOTE_PREVIEW_MAX = 60

export function findChampion(contacts: Contact[], companyId: string): Contact | null {
  return contacts.find((c) => c.companyId === companyId && c.champion) ?? null
}

export function buildCardBadges(
  company: Company,
  contacts: Contact[],
  todayIso: string,
): { contactCount: number; hasChampion: boolean; followUpDueToday: boolean } {
  const companyContacts = contacts.filter((c) => c.companyId === company.id)
  const champion = findChampion(contacts, company.id)
  return {
    contactCount: companyContacts.length,
    hasChampion: champion !== null,
    followUpDueToday: company.nextFollowUp === todayIso || champion?.nextFollowUp === todayIso,
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
        timeZone: 'Asia/Kolkata',
        day: 'numeric',
        month: 'short',
      }).format(new Date(champion.nextFollowUp))}`
    : null
  return { header, note, followUp }
}
