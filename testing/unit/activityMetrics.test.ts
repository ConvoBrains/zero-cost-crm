import { describe, expect, it } from 'vitest'

/**
 * Unit coverage for the champion auto-move exclusion in `accumulateCallMetrics`
 * (server/activity.ts). When a champion contact is Rejected, the PATCH handler both
 * logs `contact.status_changed → Rejected` AND mirrors it onto the company as a
 * `company.stage_changed → Not Interested` tagged `source: 'champion_contact'`.
 * Both events land in the same lead's stream and are folded through
 * `accumulateCallMetrics` (see server/activityRoutes.ts `metricsForEvents`), so the
 * `source !== 'champion_contact'` guard is what stops ONE rejection from counting as
 * TWO "not interested" — the regression this test locks down.
 *
 * `server/activity.ts` imports `./db.ts`, which throws at load unless a DB URL is set.
 * The `pg.Pool` it builds is lazy (it never connects here), so a dummy URL set BEFORE
 * a dynamic import lets the pure metric helpers load fully offline — no Postgres, no
 * network, no docker.
 */
process.env.DATABASE_URL ??= 'postgresql://unit:unit@127.0.0.1:5432/unit_no_connect'

const { accumulateCallMetrics, emptyCallMetrics } = await import('../../server/activity')

describe('accumulateCallMetrics — champion auto-move is not double-counted', () => {
  it('counts a Rejected champion exactly once and ignores the champion_contact mirror', () => {
    const metrics = emptyCallMetrics()

    // The contact rejection is the single "not interested" signal.
    accumulateCallMetrics(metrics, 'contact.status_changed', { from: 'Interested', to: 'Rejected' })
    expect(metrics.notInterested).toBe(1)

    // The auto-move re-reports the same rejection on the company. Because it carries
    // source=champion_contact it MUST be skipped — otherwise notInterested inflates to 2.
    accumulateCallMetrics(metrics, 'company.stage_changed', {
      from: 'Lead Added',
      to: 'Not Interested',
      source: 'champion_contact',
    })
    expect(metrics.notInterested).toBe(1)
  })

  it('still counts a direct (non-champion) company move to Not Interested', () => {
    // Discriminator: the guard excludes champion mirrors specifically, not every
    // company.stage_changed → Not Interested. A manual/human move is real and counts.
    const noSource = emptyCallMetrics()
    accumulateCallMetrics(noSource, 'company.stage_changed', { from: 'Lead Added', to: 'Not Interested' })
    expect(noSource.notInterested).toBe(1)

    const manualSource = emptyCallMetrics()
    accumulateCallMetrics(manualSource, 'company.stage_changed', {
      from: 'Lead Added',
      to: 'Not Interested',
      source: 'manual',
    })
    expect(manualSource.notInterested).toBe(1)
  })

  it('does not count champion_contact mirrors for other stages either (demo/converted)', () => {
    // The guard wraps the whole company.stage_changed block, so champion mirrors never
    // touch demo/converted counters, only ever the direct moves do.
    const champion = emptyCallMetrics()
    accumulateCallMetrics(champion, 'company.stage_changed', {
      to: 'Closed Won',
      source: 'champion_contact',
    })
    accumulateCallMetrics(champion, 'company.stage_changed', {
      to: 'Demo Scheduled',
      source: 'champion_contact',
    })
    expect(champion.converted).toBe(0)
    expect(champion.demo).toBe(0)

    const direct = emptyCallMetrics()
    accumulateCallMetrics(direct, 'company.stage_changed', { to: 'Closed Won' })
    accumulateCallMetrics(direct, 'company.stage_changed', { to: 'Demo Scheduled' })
    expect(direct.converted).toBe(1)
    expect(direct.demo).toBe(1)
  })
})
