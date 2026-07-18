import { test, expect } from '@playwright/test'
import { loginAsFounder, navTo } from './helpers'

test.describe('CRM flows (UI)', () => {
  test('pipeline shows seeded companies', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')
    await expect(page.getByText('ABC Pvt Ltd')).toBeVisible()
    await expect(page.getByText('Nova Health')).toBeVisible()
    await expect(page.getByText('CloudNest')).toBeVisible()
  })

  test('contacts list shows seeded people', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Contacts')
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()
    await page.getByRole('button', { name: /All Contacts/ }).click()
    await expect(page.locator('main table').getByText('Alex Example').first()).toBeVisible()
  })

  test('import single lead creates company', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Import Leads')
    await page.getByRole('button', { name: 'Single lead' }).click()
    const stamp = Date.now()
    await page.getByLabel('Company *').fill(`E2E Co ${stamp}`)
    await page.getByLabel('Prospect name *').fill(`E2E Person ${stamp}`)
    await page.getByLabel('Email').fill(`e2e.${stamp}@seed.example`)
    await page.getByRole('button', { name: 'Add lead' }).click()
    await expect(page.getByText(/Done\./)).toBeVisible()

    await navTo(page, 'Sales Pipeline')
    await expect(page.getByText(`E2E Co ${stamp}`)).toBeVisible()
  })

  test('dashboard metrics reflect seeded data', async ({ page }) => {
    await loginAsFounder(page)
    await expect(page.getByRole('heading', { name: 'SDR Dashboard' })).toBeVisible()
    await expect(page.getByText('Total Companies')).toBeVisible()
    await expect(page.getByText('Total Contacts')).toBeVisible()
    // Seed creates 8 companies
    const companiesCard = page.locator('div').filter({ hasText: /^Total Companies/ }).first()
    await expect(companiesCard.getByText(/^[1-9]\d*$/)).toBeVisible()
  })
})
