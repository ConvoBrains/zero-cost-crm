import { test, expect } from '@playwright/test'
import { gotoLogin, loginAsFounder, SEED } from './helpers'

test.describe('Auth (UI)', () => {
  test('founder logs in and reaches dashboard', async ({ page }) => {
    await loginAsFounder(page)
    await expect(page.getByRole('heading', { name: 'SDR Dashboard' })).toBeVisible()
    await expect(page.getByText('Total Companies')).toBeVisible()
  })

  test('rejects bad password', async ({ page }) => {
    await gotoLogin(page)
    await page.getByLabel('Email').fill(SEED.founder.email)
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Log in' }).click()
    await expect(page.getByText(/invalid email or password/i)).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })

  test('logs out back to login', async ({ page }) => {
    await loginAsFounder(page)
    await page.locator('aside:visible').getByRole('button', { name: 'Log out' }).click()
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
  })
})
