/**
 * Neutral product defaults. Instance overrides live in `app_settings` (DB)
 * and optional env (`BRAND_NAME`, `ALLOWED_EMAIL_DOMAIN`, etc.).
 */

export const DEFAULT_BRAND_NAME = 'Zero Cost CRM'

export const DEFAULT_BRAND_TAGLINE =
  'Track what happens. ConvoBrains explains why.'

export const DEFAULT_LOGO_URL = '/convobrains-logo.png'

export const DEFAULT_STAGES = [
  'Lead Added',
  'Discovery Call Done',
  'Follow-up',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Kickoff',
  'Client Data Received',
  'POC Delivered',
  'Final Negotiation',
  'Closed Won',
  'Closed Lost',
  'Not Interested',
] as const

export const DEFAULT_CONTACT_STATUSES = [
  'Not Contacted',
  "Didn't Pick",
  'Connected - Got Referral',
  'Connected - Not Right Person',
  'Connected - Future Follow-up',
  'Interested',
  'Called',
  'No Answer',
  'Follow-up Required',
  'Rejected',
] as const

/** Champion contact status → pipeline stage (forward-only auto-move). */
export const DEFAULT_CHAMPION_STATUS_TO_STAGE: Record<string, string | null> = {
  'Not Contacted': null,
  "Didn't Pick": null,
  'Connected - Got Referral': 'Follow-up',
  'Connected - Not Right Person': 'Follow-up',
  'Connected - Future Follow-up': 'Follow-up',
  Interested: 'Discovery Call Done',
  Called: 'Discovery Call Done',
  'No Answer': null,
  'Follow-up Required': 'Follow-up',
  Rejected: 'Not Interested',
}

/** Instance discovery questionnaire. Empty = hide Discovery section. */
export type DiscoveryInputType = 'text' | 'textarea' | 'number'

export interface DiscoveryQuestion {
  id: string
  section: string
  prompt: string
  input: DiscoveryInputType
}

export const DEFAULT_DISCOVERY_QUESTIONS: DiscoveryQuestion[] = []

