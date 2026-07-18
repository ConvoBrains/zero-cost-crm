import { test, expect } from '@playwright/test'
import { loginAsFounder, loginAsSdr, navTo } from './helpers'

test.describe('Navigation (UI)', () => {
  test('founder can open every main page', async ({ page }) => {
    await loginAsFounder(page)

    await navTo(page, 'Import Leads')
    await expect(page.getByRole('heading', { name: /Import leads/i })).toBeVisible()

    await navTo(page, 'Sales Pipeline')
    await expect(page.getByRole('button', { name: '+ Add company' })).toBeVisible()

    await navTo(page, 'Contacts')
    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible()

    await navTo(page, 'SDR Activity')
    await expect(page.getByRole('heading', { name: 'SDR Activity' })).toBeVisible()

    await navTo(page, 'Users')
    await expect(page.getByRole('heading', { name: 'Users' })).toBeVisible()

    await navTo(page, 'Dashboard')
    await expect(page.getByRole('heading', { name: 'SDR Dashboard' })).toBeVisible()
  })

  test('SDR does not see admin-only nav', async ({ page }) => {
    await loginAsSdr(page)
    const aside = page.locator('aside:visible')
    await expect(aside.getByRole('button', { name: /Dashboard/ })).toBeVisible()
    await expect(aside.getByRole('button', { name: /Sales Pipeline/ })).toBeVisible()
    await expect(aside.getByRole('button', { name: /SDR Activity/ })).toHaveCount(0)
    await expect(aside.getByRole('button', { name: /^Users/ })).toHaveCount(0)
  })
})
