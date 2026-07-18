import { test, expect, type Page } from '@playwright/test'
import { loginAsFounder, navTo } from './helpers'

/** Inner name button on a kanban card (not the outer dnd-kit drag handle). */
function companyCard(page: Page, name: string | RegExp) {
  return page.locator('main button.min-w-0').filter({ hasText: name })
}

/**
 * Click-path tests: each action must produce the right UI outcome
 * (not just that a page loaded).
 */
test.describe('Click behaviours (UI)', () => {
  test('dashboard CTAs navigate to the right pages', async ({ page }) => {
    await loginAsFounder(page)

    await page.getByRole('button', { name: 'Open Pipeline', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Sales Pipeline' })).toBeVisible()
    await expect(page.getByRole('button', { name: '+ Add company' })).toBeVisible()

    await navTo(page, 'Dashboard')
    await page.getByRole('button', { name: 'Import leads', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Import leads' })).toBeVisible()

    await navTo(page, 'Dashboard')
    await page.getByRole('button', { name: 'Open Contacts', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()
  })

  test('add company modal creates a card on the pipeline', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    const stamp = Date.now()
    const name = `Click Co ${stamp}`

    await page.getByRole('button', { name: '+ Add company' }).click()
    await expect(page.getByRole('heading', { name: 'Add company' })).toBeVisible()
    await page.getByLabel('Company Name *').fill(name)
    await page.getByLabel('Stage').selectOption('Lead Added')
    await page.getByRole('button', { name: 'Add company', exact: true }).click()

    await expect(page.getByRole('heading', { name: 'Add company' })).toHaveCount(0)
    await expect(companyCard(page, name)).toBeVisible()
  })

  test('opening a company card edits and saves changes', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    await companyCard(page, 'Nova Health').click()
    await expect(page.getByRole('heading', { name: 'Nova Health' })).toBeVisible()

    const note = `E2E note ${Date.now()}`
    await page.getByLabel('Notes').fill(note)
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('heading', { name: 'Nova Health' })).toHaveCount(0)
    await companyCard(page, 'Nova Health').click()
    await expect(page.getByLabel('Notes')).toHaveValue(note)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
  })

  test('pipeline view filter shows only matching stage', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    // Use firms not mutated by earlier click tests in this file
    await expect(companyCard(page, 'LogiFleet')).toBeVisible()
    await page.getByRole('button', { name: 'Closed Won', exact: true }).click()
    await expect(companyCard(page, 'CloudNest')).toBeVisible()
    await expect(companyCard(page, 'LogiFleet')).toHaveCount(0)

    await page.getByRole('button', { name: 'All Companies', exact: true }).click()
    await expect(companyCard(page, 'LogiFleet')).toBeVisible()
  })

  test('add contact appears in All Contacts table', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')

    const stamp = Date.now()
    const name = `Click Person ${stamp}`

    await page.getByRole('button', { name: '+ Add contact' }).click()
    await expect(page.getByRole('heading', { name: 'Add contact' })).toBeVisible()
    await page.getByLabel('Contact Name *').fill(name)
    await page.locator('form select').first().selectOption({ label: 'Nova Health' })
    await page.getByLabel('Email').fill(`click.${stamp}@seed.example`)
    await page.getByRole('button', { name: 'Add contact', exact: true }).click()

    await page.getByRole('button', { name: /All Contacts/ }).click()
    await expect(page.locator('main table').getByText(name)).toBeVisible()
  })

  test('editing a contact status updates the table', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')
    await page.getByRole('button', { name: /All Contacts/ }).click()

    await page.locator('main table').getByText('Jordan Sample').first().click()
    await expect(page.getByRole('heading', { name: 'Jordan Sample' })).toBeVisible()

    await page.getByLabel('Contact Status').selectOption('Interested')
    await page.getByRole('button', { name: 'Save changes' }).click()

    await expect(page.getByRole('heading', { name: 'Jordan Sample' })).toHaveCount(0)
    const row = page.locator('main table tr').filter({ hasText: 'Jordan Sample' })
    await expect(row.getByText('Interested')).toBeVisible()
  })

  test('create user shows success and lists the new teammate', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Users')

    const stamp = Date.now()
    const email = `e2e.user.${stamp}@convobrains.com`
    const name = `E2E User ${stamp}`

    await page.getByLabel('Name').fill(name)
    await page.getByLabel('Email').fill(email)
    await page.getByLabel('Temporary password').fill('TestSeed123!')
    await page.getByLabel('Role').selectOption('sdr')
    await page.getByRole('button', { name: 'Create user' }).click()

    await expect(page.getByText(new RegExp(`Created ${name}`, 'i'))).toBeVisible()
    await expect(page.getByText(email)).toBeVisible()
  })
})
