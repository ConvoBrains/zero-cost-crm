import { test, expect } from '@playwright/test'
import { loginAsFounder, navTo, showAllContacts } from './helpers'

/**
 * Issue #41 — Contacts page search, composable filters, and lead insights strip.
 */
test.describe('Contacts search + filters + insights (issue #41)', () => {
  test('search finds a contact by name and opens the detail modal', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')

    const stamp = Date.now()
    const name = `Search Target ${stamp}`
    await page.getByRole('button', { name: '+ Add contact' }).click()
    await expect(page.getByRole('heading', { name: 'Add contact' })).toBeVisible()
    await page.getByLabel('Contact Name *').fill(name)
    await page.locator('form select').first().selectOption({ label: 'Nova Health' })
    await page.getByLabel('Email', { exact: true }).fill(`search.${stamp}@seed.example`)
    await page.getByRole('button', { name: 'Add contact', exact: true }).click()
    await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0)

    await showAllContacts(page)
    await page.getByTestId('contact-search').fill(name)
    await expect(page.locator('main table').getByText(name)).toBeVisible()
    await expect(page.locator('main table').getByText('Alex Example')).toHaveCount(0)

    await page.locator('main table').getByText(name).first().click()
    await expect(page.getByRole('heading', { name })).toBeVisible()
  })

  test('status filter and clear-all reset the table', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')
    await showAllContacts(page)

    await page.getByTestId('contact-filter-status').click()
    await page.getByRole('option', { name: 'Interested', exact: true }).click()
    // Close the multi-select by clicking outside
    await page.getByRole('heading', { name: 'Contacts' }).click()

    await expect(page.getByTestId('contact-clear-filters')).toBeVisible()
    await page.getByTestId('contact-clear-filters').click()
    await expect(page.getByTestId('contact-clear-filters')).toHaveCount(0)
  })

  test('lead insights strip shows outcome totals for the filtered set', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')
    await showAllContacts(page)

    const insights = page.getByTestId('lead-insights')
    await expect(insights).toBeVisible()
    await expect(page.getByTestId('insight-total')).toBeVisible()
    await expect(page.getByTestId('insight-contacted')).toBeVisible()
    await expect(page.getByTestId('insight-not-contacted')).toBeVisible()
    await expect(page.getByTestId('insight-discoveries')).toBeVisible()
    await expect(page.getByTestId('insight-demos')).toBeVisible()

    await page.getByTestId('lead-insights-toggle').click()
    await expect(page.getByTestId('insight-total')).toHaveCount(0)
    await page.getByTestId('lead-insights-toggle').click()
    await expect(page.getByTestId('insight-total')).toBeVisible()
  })

  test('date range filter restricts contacts by createdAt', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')
    await showAllContacts(page)

    await page.getByTestId('contact-date-range').click()
    await page.getByRole('option', { name: 'This Week', exact: true }).click()
    await expect(page.getByTestId('contact-clear-filters')).toBeVisible()
    await expect(page.getByTestId('insight-total')).toBeVisible()
  })
})
