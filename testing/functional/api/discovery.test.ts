import { describe, expect, it } from 'vitest'
import { api, loginAs, SEED } from './helpers'

let seq = 0
const uniq = () => `${Date.now()}-${++seq}`

describe('discovery questions + answers', () => {
  it('config exposes discoveryQuestions; company can store discoveryAnswers', async () => {
    const { token } = await loginAs(SEED.founder)

    const seeded = await api('/api/settings', {
      method: 'PATCH',
      token,
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
    })
    expect(seeded.status).toBe(200)

    const cfg = await api<{
      discoveryQuestions: Array<{ id: string; section: string }>
    }>('/api/config')
    expect(cfg.status).toBe(200)
    expect(cfg.data.discoveryQuestions.map((q) => q.id)).toEqual(
      expect.arrayContaining(['problem_pain', 'floors_type']),
    )

    const created = await api<{
      id: string
      discoveryAnswers: Record<string, string>
    }>('/api/companies', {
      token,
      body: {
        companyName: `Discovery Co ${uniq()}`,
        stage: 'Lead Added',
        industry: 'SaaS',
        location: 'Remote',
        intent: 'Warm',
        discoveryAnswers: { problem_pain: 'Missed objections' },
      },
    })
    expect(created.status).toBe(201)
    expect(created.data.discoveryAnswers.problem_pain).toBe('Missed objections')

    const patched = await api<{
      discoveryAnswers: Record<string, string>
    }>(`/api/companies/${created.data.id}`, {
      method: 'PATCH',
      token,
      body: {
        discoveryAnswers: {
          problem_pain: 'Missed objections',
          floors_type: 'Both',
        },
      },
    })
    expect(patched.status).toBe(200)
    expect(patched.data.discoveryAnswers.floors_type).toBe('Both')

    const history = await api<{
      events: Array<{ eventType: string; payload: Record<string, unknown> }>
    }>(`/api/activity/company/${created.data.id}/history`, { token })
    expect(history.status).toBe(200)
    const disc = history.data.events.find((e) => e.eventType === 'company.discovery_updated')
    expect(disc).toBeTruthy()
    expect(disc?.payload.changedFields).toEqual(expect.arrayContaining(['floors_type']))

    await api(`/api/companies/${created.data.id}`, { method: 'DELETE', token })
  })
})
