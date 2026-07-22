import { test, expect, type Page } from '@playwright/test'
import { loginAsFounder, navTo } from './helpers'

/**
 * Issue #29 — a champion contact's status change auto-moves its company on the Kanban,
 * and the company card renders the champion trail + badges. A non-champion change must
 * neither move the company nor leak into the trail.
 *
 * Setup + edits go through the real UI (Modal here has no role="dialog", so we drive it
 * by label/heading like the other specs). Each run creates its own dedicated company and
 * two contacts (unique names), so it never relies on shared seed rows.
 */

const cardSelector = (companyId: string) =>
  `[data-testid="company-card"][data-company-id="${companyId}"]`

/** The KanbanColumn root whose header <h3> is exactly `stage`. */
function stageColumn(page: Page, stage: string) {
  return page.locator(`div:has(> div > h3:text-is("${stage}"))`)
}

/** Today's calendar day in Asia/Kolkata as `YYYY-MM-DD` — the same policy the card badge uses. */
function istTodayIso(): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const part = (type: string) => parts.find((p) => p.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}`
}

async function addCompany(page: Page, name: string, stage: string = 'Lead Added'): Promise<string> {
  await navTo(page, 'Sales Pipeline')
  await page.getByRole('button', { name: '+ Add company' }).click()
  await expect(page.getByRole('heading', { name: 'Add company' })).toBeVisible()
  await page.getByLabel('Company Name *').fill(name)
  await page.getByLabel('Stage').selectOption(stage)
  await page.getByRole('button', { name: 'Add company', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add company' })).toHaveCount(0)

  const card = page.locator('[data-testid="company-card"]').filter({ hasText: name }).first()
  await expect(card).toBeVisible()
  const id = await card.getAttribute('data-company-id')
  expect(id).toBeTruthy()
  return id as string
}

async function addContact(
  page: Page,
  opts: { name: string; company: string; email: string; champion: boolean },
) {
  await navTo(page, 'Contacts')
  await page.getByRole('button', { name: '+ Add contact' }).click()
  await expect(page.getByRole('heading', { name: 'Add contact' })).toBeVisible()
  await page.getByLabel('Contact Name *').fill(opts.name)
  await page.locator('form select').first().selectOption({ label: opts.company })
  await page.getByLabel('Email').fill(opts.email)
  if (opts.champion) await page.locator('form input[type="checkbox"]').first().check()
  await page.getByRole('button', { name: 'Add contact', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0)
}

async function openContact(page: Page, name: string) {
  await navTo(page, 'Contacts')
  await page.getByRole('button', { name: /All Contacts/ }).click()
  await page.locator('main table').getByText(name).first().click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test.describe('Champion → company auto-move (issue #29)', () => {
  test('champion status change moves the company + renders trail/badges; non-champion does not', async ({
    page,
  }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `AutoMove Co ${stamp}`
    const championName = `Priya Champion ${stamp}`
    const sidekickName = `Sam Sidekick ${stamp}`
    const championNote = `E2E champion note ${stamp}`

    // (1) Dedicated company (Lead Added) + champion + non-champion contact.
    const companyId = await addCompany(page, companyName)
    await addContact(page, {
      name: championName,
      company: companyName,
      email: `priya.${stamp}@automove.example`,
      champion: true,
    })
    await addContact(page, {
      name: sidekickName,
      company: companyName,
      email: `sam.${stamp}@automove.example`,
      champion: false,
    })

    // (2) Open the champion, set status Interested + note + follow-up, save.
    await openContact(page, championName)
    await page.getByLabel('Contact Status').selectOption('Interested')
    await page.getByLabel('Notes', { exact: true }).fill(championNote)
    await page.getByLabel('Next Follow-up').fill('2026-08-15')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: championName })).toHaveCount(0)

    // (3) + (4) Card is in the Discovery Call Done column with trail + badges.
    await navTo(page, 'Sales Pipeline')
    await expect(
      stageColumn(page, 'Discovery Call Done').locator(cardSelector(companyId)),
    ).toBeVisible()
    await expect(stageColumn(page, 'Lead Added').locator(cardSelector(companyId))).toHaveCount(0)

    const badges = page.locator(`[data-testid="card-badges"][data-company-id="${companyId}"]`)
    await expect(badges).toContainText('2 contacts')
    await expect(badges).toContainText('★ Champion')

    const trail = page.locator(`[data-testid="champion-trail"][data-company-id="${companyId}"]`)
    await expect(trail).toContainText(championName)
    await expect(trail).toContainText('Interested')
    await expect(trail).toContainText(championNote)
    await expect(trail).toContainText('FU') // champion follow-up line

    // (5) Update the NON-champion to a status that WOULD move a champion forward
    // ('Follow-up Required' → 'Follow-up'); the company must stay put and the trail
    // must keep showing the champion, never the non-champion.
    await openContact(page, sidekickName)
    await page.getByLabel('Contact Status').selectOption('Follow-up Required')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: sidekickName })).toHaveCount(0)

    await navTo(page, 'Sales Pipeline')
    await expect(
      stageColumn(page, 'Discovery Call Done').locator(cardSelector(companyId)),
    ).toBeVisible()
    await expect(stageColumn(page, 'Follow-up').locator(cardSelector(companyId))).toHaveCount(0)

    const trailAfter = page.locator(
      `[data-testid="champion-trail"][data-company-id="${companyId}"]`,
    )
    await expect(trailAfter).toContainText(championName)
    await expect(trailAfter).toContainText('Interested')
    await expect(trailAfter).not.toContainText(sidekickName)
    await expect(trailAfter).not.toContainText('Follow-up Required')
  })

  test('a champion follow-up due today (Asia/Kolkata) renders the "Due today" badge', async ({
    page,
  }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `DueToday Co ${stamp}`
    const championName = `Deepa DueToday ${stamp}`

    const companyId = await addCompany(page, companyName)
    await addContact(page, {
      name: championName,
      company: companyName,
      email: `deepa.${stamp}@duetoday.example`,
      champion: true,
    })

    // Follow-up dated for *today* in the SAME Asia/Kolkata calendar the badge resolves.
    await openContact(page, championName)
    await page.getByLabel('Contact Status').selectOption('Interested')
    await page.getByLabel('Next Follow-up').fill(istTodayIso())
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: championName })).toHaveCount(0)

    await navTo(page, 'Sales Pipeline')
    const badges = page.locator(`[data-testid="card-badges"][data-company-id="${companyId}"]`)
    await expect(badges).toContainText('Due today')
  })

  test('a rejected champion moves its company to the Not Interested column', async ({ page }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `Rejected Co ${stamp}`
    const championName = `Ravi Rejected ${stamp}`

    const companyId = await addCompany(page, companyName)
    await addContact(page, {
      name: championName,
      company: companyName,
      email: `ravi.${stamp}@rejected.example`,
      champion: true,
    })

    await openContact(page, championName)
    await page.getByLabel('Contact Status').selectOption('Rejected')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: championName })).toHaveCount(0)

    await navTo(page, 'Sales Pipeline')
    await expect(
      stageColumn(page, 'Not Interested').locator(cardSelector(companyId)),
    ).toBeVisible()
    await expect(stageColumn(page, 'Lead Added').locator(cardSelector(companyId))).toHaveCount(0)
  })

  test('a company already ahead of the mapped stage never moves (never backward)', async ({
    page,
  }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `Ahead Co ${stamp}`
    const championName = `Anita Ahead ${stamp}`

    // Starts at Demo Delivered — ahead of 'Interested' → Discovery Call Done.
    const companyId = await addCompany(page, companyName, 'Demo Delivered')
    await addContact(page, {
      name: championName,
      company: companyName,
      email: `anita.${stamp}@ahead.example`,
      champion: true,
    })

    await openContact(page, championName)
    await page.getByLabel('Contact Status').selectOption('Interested')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: championName })).toHaveCount(0)

    await navTo(page, 'Sales Pipeline')
    // Stays at Demo Delivered; must never be dragged backward to the earlier mapped stage.
    await expect(
      stageColumn(page, 'Demo Delivered').locator(cardSelector(companyId)),
    ).toBeVisible()
    await expect(
      stageColumn(page, 'Discovery Call Done').locator(cardSelector(companyId)),
    ).toHaveCount(0)
  })

  test('a Closed Won company is never auto-moved by a champion status change', async ({ page }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `Won Co ${stamp}`
    const championName = `Vikram Won ${stamp}`

    const companyId = await addCompany(page, companyName, 'Closed Won')
    await addContact(page, {
      name: championName,
      company: companyName,
      email: `vikram.${stamp}@won.example`,
      champion: true,
    })

    await openContact(page, championName)
    await page.getByLabel('Contact Status').selectOption('Interested')
    await page.getByRole('button', { name: 'Save changes' }).click()
    await expect(page.getByRole('heading', { name: championName })).toHaveCount(0)

    await navTo(page, 'Sales Pipeline')
    // A terminal stage is frozen — the champion move must not pull it out of Closed Won.
    await expect(stageColumn(page, 'Closed Won').locator(cardSelector(companyId))).toBeVisible()
    await expect(
      stageColumn(page, 'Discovery Call Done').locator(cardSelector(companyId)),
    ).toHaveCount(0)
  })
})
