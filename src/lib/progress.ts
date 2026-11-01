import type { Company, CompanyProgress, Contact, ContactStatus } from '../types';

export type { CompanyProgress };

export const COMPANY_PROGRESS_OPTIONS: { value: CompanyProgress; label: string; hint: string }[] = [
  { value: 'not_started', label: 'Not started', hint: 'No contact dialed yet' },
  { value: 'didnt_pick', label: "Didn't pick", hint: 'Dialed, nobody reached yet' },
  { value: 'connected', label: 'Connected', hint: 'Reached someone, no follow-up date' },
  { value: 'follow_up', label: 'Follow-up set', hint: 'A follow-up date is set' },
  { value: 'demo_scheduled', label: 'Demo scheduled', hint: 'Stage: Demo Scheduled' },
  { value: 'demo_delivered', label: 'Demo delivered', hint: 'Stage: Demo Delivered' },
  { value: 'later', label: 'Later / closed', hint: 'Any stage after Demo Delivered' },
];

export function companyProgressLabel(progress: CompanyProgress): string {
  return COMPANY_PROGRESS_OPTIONS.find((o) => o.value === progress)?.label ?? progress;
}

const NOT_CONTACTED: ContactStatus = 'Not Contacted';
const DEMO_SCHEDULED = 'Demo Scheduled';
const DEMO_DELIVERED = 'Demo Delivered';

/** Dialed, but nobody useful answered. */
const NOT_REACHABLE_STATUSES = new Set<ContactStatus>([
  "Didn't Pick",
  'No Answer',
  'Wrong/Bad Number',
]);

/** Dialed contacts that should not get the follow-up WhatsApp message. */
const NO_WHATSAPP_STATUSES = new Set<ContactStatus>([
  'Wrong/Bad Number',
  'Connected - Information Gathered (Not ICP)',
  'Connected - DQ Prospect (Not ICP)',
  'Connected - DQ Company (Bad Fit)',
]);

/** True once anyone has called this contact (status moved, or a last-contacted date exists). */
export function isDialed(contact: Contact): boolean {
  if (contact.contactStatus !== NOT_CONTACTED) return true;
  if (contact.lastContacted) return true;
  return (contact.statusHistory ?? []).some((s) => s !== NOT_CONTACTED);
}

/** Dialed and actually spoke to someone. */
export function isReached(contact: Contact): boolean {
  return (
    isDialed(contact) &&
    contact.contactStatus !== NOT_CONTACTED &&
    !NOT_REACHABLE_STATUSES.has(contact.contactStatus)
  );
}

/** Every dialed contact should get the WhatsApp message, except bad numbers and disqualified ones. */
export function needsWhatsApp(contact: Contact): boolean {
  return isDialed(contact) && !NO_WHATSAPP_STATUSES.has(contact.contactStatus);
}

export function whatsAppPending(contact: Contact): boolean {
  return needsWhatsApp(contact) && !contact.whatsappSentAt;
}

export function groupContactsByCompany(contacts: Contact[]): Map<string, Contact[]> {
  const map = new Map<string, Contact[]>();
  for (const t of contacts) {
    if (!t.companyId) continue;
    const list = map.get(t.companyId);
    if (list) list.push(t);
    else map.set(t.companyId, [t]);
  }
  return map;
}

/**
 * First matching rule wins: later stages, demo stages, follow-up date, connected,
 * dialed-but-unreachable, otherwise not started. Stage rules use the configured stage
 * order, so a custom stage placed after "Demo Delivered" counts as later.
 */
export function companyProgress(
  company: Company,
  contacts: Contact[],
  stages: readonly string[]
): CompanyProgress {
  const deliveredIdx = stages.indexOf(DEMO_DELIVERED);
  const stageIdx = stages.indexOf(company.stage);
  if (deliveredIdx >= 0 && stageIdx > deliveredIdx) return 'later';
  if (company.stage === DEMO_DELIVERED) return 'demo_delivered';
  if (company.stage === DEMO_SCHEDULED) return 'demo_scheduled';

  const dialed = contacts.filter(isDialed);
  if (contacts.some((t) => t.nextFollowUp) || (company.nextFollowUp && dialed.length > 0)) {
    return 'follow_up';
  }
  if (dialed.some(isReached)) return 'connected';
  if (dialed.length > 0) return 'didnt_pick';
  return 'not_started';
}

export interface CompanyContactSummary {
  total: number;
  dialed: number;
  followUps: number;
  /** Contacts that should get the WhatsApp message (dialed, not excluded). */
  whatsappDue: number;
  whatsappSent: number;
  whatsappPending: number;
}

export function companyContactSummary(contacts: Contact[]): CompanyContactSummary {
  let dialed = 0;
  let followUps = 0;
  let whatsappDue = 0;
  let whatsappSent = 0;
  let pending = 0;
  for (const t of contacts) {
    if (isDialed(t)) dialed += 1;
    if (t.nextFollowUp) followUps += 1;
    if (needsWhatsApp(t)) {
      whatsappDue += 1;
      if (t.whatsappSentAt) whatsappSent += 1;
      else pending += 1;
    }
  }
  return {
    total: contacts.length,
    dialed,
    followUps,
    whatsappDue,
    whatsappSent,
    whatsappPending: pending,
  };
}

export function countCompanyProgress(
  companies: Company[],
  byCompany: Map<string, Contact[]>,
  stages: readonly string[]
): Record<CompanyProgress, number> {
  const counts = Object.fromEntries(COMPANY_PROGRESS_OPTIONS.map((o) => [o.value, 0])) as Record<
    CompanyProgress,
    number
  >;
  for (const c of companies) {
    counts[companyProgress(c, byCompany.get(c.id) ?? [], stages)] += 1;
  }
  return counts;
}
