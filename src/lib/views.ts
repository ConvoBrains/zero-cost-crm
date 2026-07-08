import type {
  PipelineView,
  Stage,
  ContactView,
  ContactStatus,
  Company,
  Contact,
} from '../types'
import { STAGES } from '../types'

const POC_STAGES: Stage[] = ['POC Kickoff', 'Client Data Received', 'POC Delivered']

export const PIPELINE_VIEWS: PipelineView[] = [
  'All Companies',
  'New Leads',
  'Discovery Calls',
  'Follow-ups',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'POC Running',
  'Final Negotiation',
  'Closed Won',
  'Closed Lost',
  'Not Interested',
]

export const CONTACT_VIEWS: ContactView[] = [
  'All Contacts',
  'Champions',
  'Pending Calls',
  'Follow-up Required',
]

export function filterCompanies(companies: Company[], view: PipelineView): Company[] {
  switch (view) {
    case 'All Companies':
      return companies
    case 'New Leads':
      return companies.filter((c) => c.stage === 'Lead Added')
    case 'Discovery Calls':
      return companies.filter((c) => c.stage === 'Discovery Call Done')
    case 'Follow-ups':
      return companies.filter((c) => c.stage === 'Follow-up')
    case 'Demo Scheduled':
      return companies.filter((c) => c.stage === 'Demo Scheduled')
    case 'Demo Delivered':
      return companies.filter((c) => c.stage === 'Demo Delivered')
    case 'Commercial Proposal Shared':
      return companies.filter((c) => c.stage === 'Commercial Proposal Shared')
    case 'POC Running':
      return companies.filter((c) => POC_STAGES.includes(c.stage))
    case 'Final Negotiation':
      return companies.filter((c) => c.stage === 'Final Negotiation')
    case 'Closed Won':
      return companies.filter((c) => c.stage === 'Closed Won')
    case 'Closed Lost':
      return companies.filter((c) => c.stage === 'Closed Lost')
    case 'Not Interested':
      return companies.filter((c) => c.stage === 'Not Interested')
    default:
      return companies
  }
}

export function stagesForView(view: PipelineView): Stage[] {
  switch (view) {
    case 'All Companies':
      return [...STAGES]
    case 'New Leads':
      return ['Lead Added']
    case 'Discovery Calls':
      return ['Discovery Call Done']
    case 'Follow-ups':
      return ['Follow-up']
    case 'Demo Scheduled':
      return ['Demo Scheduled']
    case 'Demo Delivered':
      return ['Demo Delivered']
    case 'Commercial Proposal Shared':
      return ['Commercial Proposal Shared']
    case 'POC Running':
      return POC_STAGES
    case 'Final Negotiation':
      return ['Final Negotiation']
    case 'Closed Won':
      return ['Closed Won']
    case 'Closed Lost':
      return ['Closed Lost']
    case 'Not Interested':
      return ['Not Interested']
    default:
      return [...STAGES]
  }
}

export function filterContacts(contacts: Contact[], view: ContactView): Contact[] {
  switch (view) {
    case 'All Contacts':
      return contacts
    case 'Champions':
      return contacts.filter((t) => t.champion)
    case 'Pending Calls':
      return contacts.filter(
        (t) => t.contactStatus === 'Not Contacted' || t.contactStatus === 'No Answer',
      )
    case 'Follow-up Required':
      return contacts.filter((t) => t.contactStatus === 'Follow-up Required')
    default:
      return contacts
  }
}

export function intentColor(intent: string): string {
  switch (intent) {
    case 'Hot':
      return 'bg-rose-100 text-rose-800'
    case 'Warm':
      return 'bg-amber-100 text-amber-800'
    case 'Cold':
      return 'bg-sky-100 text-sky-800'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

export function statusColor(status: ContactStatus): string {
  switch (status) {
    case 'Interested':
      return 'bg-emerald-100 text-emerald-800'
    case 'Follow-up Required':
      return 'bg-amber-100 text-amber-800'
    case 'Called':
      return 'bg-sky-100 text-sky-800'
    case 'No Answer':
      return 'bg-stone-200 text-stone-700'
    case 'Rejected':
      return 'bg-rose-100 text-rose-800'
    default:
      return 'bg-stone-100 text-stone-600'
  }
}

export function stageAccent(stage: Stage): string {
  if (stage === 'Closed Won') return 'border-t-emerald-500'
  if (stage === 'Closed Lost' || stage === 'Not Interested') return 'border-t-stone-400'
  if (stage.includes('Demo') || stage.includes('POC')) return 'border-t-teal-500'
  if (stage === 'Lead Added') return 'border-t-sky-400'
  if (stage === 'Follow-up') return 'border-t-amber-500'
  return 'border-t-teal-600'
}
