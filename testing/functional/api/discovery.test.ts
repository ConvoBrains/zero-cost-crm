import { describe, expect, it } from 'vitest';
import { api, loginAsCookie, SEED } from './helpers';

let seq = 0;
const uniq = () => `${Date.now()}-${++seq}`;

describe('discovery questions + answers', () => {
  it('config exposes discoveryQuestions; company can store discoveryAnswers', async () => {
    const session = await loginAsCookie(SEED.founder);

    const seeded = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: {
        discoveryQuestions: [
          {
            id: 'problem_pain',
            section: 'The Problem',
            prompt: 'Main pain point?',
            input: 'textarea',
          },
          {
            id: 'floors_type',
            section: 'Your Floors',
            prompt: 'Sales, Support, or both?',
            input: 'text',
          },
        ],
      },
    });
    expect(seeded.status).toBe(200);

    const cfg = await api<{
      discoveryQuestions: Array<{ id: string; section: string }>;
    }>('/api/config');
    expect(cfg.status).toBe(200);
    expect(cfg.data.discoveryQuestions.map((q) => q.id)).toEqual(
      expect.arrayContaining(['problem_pain', 'floors_type'])
    );

    const created = await api<{
      id: string;
      discoveryAnswers: Record<string, string>;
    }>('/api/companies', {
      session,
      body: {
        companyName: `Discovery Co ${uniq()}`,
        stage: 'Lead Added',
        industry: 'SaaS',
        location: 'Remote',
        intent: 'Warm',
        discoveryAnswers: { problem_pain: 'Missed objections' },
      },
    });
    expect(created.status).toBe(201);
    expect(created.data.discoveryAnswers.problem_pain).toBe('Missed objections');

    const patched = await api<{
      discoveryAnswers: Record<string, string>;
    }>(`/api/companies/${created.data.id}`, {
      method: 'PATCH',
      session,
      body: {
        discoveryAnswers: {
          problem_pain: 'Missed objections',
          floors_type: 'Both',
        },
      },
    });
    expect(patched.status).toBe(200);
    expect(patched.data.discoveryAnswers.floors_type).toBe('Both');

    const history = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown> }>;
    }>(`/api/activity/company/${created.data.id}/history`, { session });
    expect(history.status).toBe(200);
    const disc = history.data.events.find((e) => e.eventType === 'company.discovery_updated');
    expect(disc).toBeTruthy();
    expect(disc?.payload.changedFields).toEqual(expect.arrayContaining(['floors_type']));

    await api(`/api/companies/${created.data.id}`, { method: 'DELETE', session });
  });

  it('rejects invalid discoveryQuestions shapes on PATCH /api/settings', async () => {
    const session = await loginAsCookie(SEED.founder);

    const nonArray = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: { discoveryQuestions: 'invalid' },
    });
    expect(nonArray.status).toBe(400);
    expect(nonArray.data.error).toContain('discoveryQuestions must be an array');

    const missingId = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: {
        discoveryQuestions: [{ id: '', section: 'Discovery', prompt: 'Prompt', input: 'text' }],
      },
    });
    expect(missingId.status).toBe(400);
    expect(missingId.data.error).toContain('missing an ID');

    const invalidId = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: {
        discoveryQuestions: [
          { id: 'bad id with spaces', section: 'Discovery', prompt: 'Prompt', input: 'text' },
        ],
      },
    });
    expect(invalidId.status).toBe(400);
    expect(invalidId.data.error).toContain('letters, numbers, hyphens, and underscores only');

    const duplicateId = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: {
        discoveryQuestions: [
          { id: 'budget', section: 'Discovery', prompt: 'Prompt 1', input: 'text' },
          { id: 'budget', section: 'General', prompt: 'Prompt 2', input: 'number' },
        ],
      },
    });
    expect(duplicateId.status).toBe(400);
    expect(duplicateId.data.error).toContain('Duplicate question ID');

    const invalidInput = await api('/api/settings', {
      method: 'PATCH',
      session,
      body: {
        discoveryQuestions: [
          { id: 'budget', section: 'Discovery', prompt: 'Prompt', input: 'invalid_type' },
        ],
      },
    });
    expect(invalidInput.status).toBe(400);
    expect(invalidInput.data.error).toContain('invalid input type');
  });
});
