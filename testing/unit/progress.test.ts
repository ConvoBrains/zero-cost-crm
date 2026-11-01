import { describe, expect, it } from 'vitest';
import {
  companyContactSummary,
  companyProgress,
  countCompanyProgress,
  groupContactsByCompany,
  isDialed,
  needsWhatsApp,
  whatsAppPending,
} from '../../src/lib/progress';
import type { Company, Contact } from '../../src/types';

const STAGES = [
  'Lead Added',
  'Follow-up',
  'Demo Scheduled',
  'Demo Delivered',
  'Commercial Proposal Shared',
  'Closed Won',
  'Not Interested',
  'Parked',
];

function company(partial: Partial<Company> = {}): Company {
  return {
    id: 'co',
    companyName: 'Co',
    stage: 'Lead Added',
    industry: '',
    location: '',
    estimatedCallVolume: null,
    employeeCount: null,
    intent: '',
    offeredPrice: null,
    primaryContactId: null,
    assignedTo: '',
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    sourceLink: '',
    companyWebsite: '',
    linkedInCompany: '',
    discoveryAnswers: {},
    createdAt: '2026-11-01T00:00:00.000Z',
    ...partial,
  };
}

let n = 0;
function contact(partial: Partial<Contact> = {}): Contact {
  return {
    id: `t${++n}`,
    contactName: 'Person',
    companyId: 'co',
    role: '',
    phone: '',
    email: '',
    linkedInProfile: '',
    contactStatus: 'Not Contacted',
    champion: false,
    lastContacted: null,
    nextFollowUp: null,
    notes: '',
    createdAt: '2026-11-01T00:00:00.000Z',
    ...partial,
  };
}

describe('isDialed', () => {
  it('is false for an untouched contact', () => {
    expect(isDialed(contact())).toBe(false);
  });

  it('is true once the status moved, a last-contacted date exists, or history shows a call', () => {
    expect(isDialed(contact({ contactStatus: "Didn't Pick" }))).toBe(true);
    expect(isDialed(contact({ lastContacted: '2026-11-01' }))).toBe(true);
    expect(isDialed(contact({ statusHistory: ['Not Contacted', "Didn't Pick"] }))).toBe(true);
  });
});

describe('needsWhatsApp / whatsAppPending', () => {
  it('expects the message for every dialed contact except bad numbers and DQ', () => {
    expect(needsWhatsApp(contact())).toBe(false);
    expect(needsWhatsApp(contact({ contactStatus: "Didn't Pick" }))).toBe(true);
    expect(needsWhatsApp(contact({ contactStatus: 'Rejected' }))).toBe(true);
    expect(needsWhatsApp(contact({ contactStatus: 'Wrong/Bad Number' }))).toBe(false);
    expect(needsWhatsApp(contact({ contactStatus: 'Connected - DQ Company (Bad Fit)' }))).toBe(
      false
    );
  });

  it('is pending until whatsappSentAt is set', () => {
    const dialed = contact({ contactStatus: 'Connected - Not Right Person' });
    expect(whatsAppPending(dialed)).toBe(true);
    expect(whatsAppPending({ ...dialed, whatsappSentAt: '2026-11-02T05:00:00.000Z' })).toBe(false);
  });
});

describe('companyProgress', () => {
  const progress = (co: Partial<Company>, people: Partial<Contact>[]) =>
    companyProgress(company(co), people.map(contact), STAGES);

  it('is not started when nobody was dialed, even with a company follow-up date', () => {
    expect(progress({}, [])).toBe('not_started');
    expect(progress({}, [{}, {}])).toBe('not_started');
    expect(progress({ nextFollowUp: '2026-11-05' }, [{}])).toBe('not_started');
  });

  it("is didn't pick when every dialed contact was unreachable", () => {
    expect(
      progress({}, [{ contactStatus: "Didn't Pick" }, { contactStatus: 'Wrong/Bad Number' }, {}])
    ).toBe('didnt_pick');
  });

  it('is connected when someone was reached but no follow-up is set', () => {
    expect(
      progress({}, [
        { contactStatus: "Didn't Pick" },
        { contactStatus: 'Connected - Got Referral' },
      ])
    ).toBe('connected');
  });

  it('is follow-up set when a contact has a date, or the company does after a dial', () => {
    expect(
      progress({}, [{ contactStatus: 'Connected - Future Follow-up', nextFollowUp: '2026-11-05' }])
    ).toBe('follow_up');
    expect(progress({ nextFollowUp: '2026-11-05' }, [{ contactStatus: "Didn't Pick" }])).toBe(
      'follow_up'
    );
  });

  it('uses the demo stages ahead of contact activity', () => {
    expect(progress({ stage: 'Demo Scheduled' }, [])).toBe('demo_scheduled');
    expect(progress({ stage: 'Demo Delivered' }, [{ nextFollowUp: '2026-11-05' }])).toBe(
      'demo_delivered'
    );
  });

  it('puts every stage after Demo Delivered in later, by configured order', () => {
    expect(progress({ stage: 'Closed Won' }, [])).toBe('later');
    expect(progress({ stage: 'Parked' }, [{ nextFollowUp: '2026-11-05' }])).toBe('later');
    // A stage before the demo stages is still worked out from contacts.
    expect(progress({ stage: 'Follow-up' }, [{ contactStatus: "Didn't Pick" }])).toBe('didnt_pick');
  });

  it('skips stage rules when the instance has no demo stages', () => {
    expect(
      companyProgress(
        company({ stage: 'Won' }),
        [contact({ contactStatus: "Didn't Pick" })],
        ['New', 'Won']
      )
    ).toBe('didnt_pick');
  });
});

describe('companyContactSummary / countCompanyProgress', () => {
  it('summarises dials, follow-ups and WhatsApp', () => {
    expect(
      companyContactSummary([
        contact(),
        contact({ contactStatus: "Didn't Pick" }),
        contact({
          contactStatus: 'Connected - Future Follow-up',
          nextFollowUp: '2026-11-05',
          whatsappSentAt: '2026-11-02T05:00:00.000Z',
        }),
        contact({ contactStatus: 'Wrong/Bad Number' }),
      ])
    ).toEqual({
      total: 4,
      dialed: 3,
      followUps: 1,
      whatsappDue: 2,
      whatsappSent: 1,
      whatsappPending: 1,
    });
  });

  it('puts each company in exactly one bucket', () => {
    const companies = [
      company({ id: 'a' }),
      company({ id: 'b' }),
      company({ id: 'c', stage: 'Closed Won' }),
    ];
    const contacts = [contact({ companyId: 'b', contactStatus: "Didn't Pick" })];
    const counts = countCompanyProgress(companies, groupContactsByCompany(contacts), STAGES);
    expect(counts).toEqual({
      not_started: 1,
      didnt_pick: 1,
      connected: 0,
      follow_up: 0,
      demo_scheduled: 0,
      demo_delivered: 0,
      later: 1,
    });
    expect(Object.values(counts).reduce((a, b) => a + b, 0)).toBe(companies.length);
  });
});
