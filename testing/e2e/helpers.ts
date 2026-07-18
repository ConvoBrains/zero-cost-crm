import { expect, type Page } from '@playwright/test'

export const SEED = {
  founder: {
    email: 'founder.seed@convobrains.com',
    password: 'TestSeed123!',
    name: 'Founder Seed',
  },
  sdr: {
    email: 'rahul.seed@convobrains.com',
    password: 'TestSeed123!',
    name: 'Rahul',
  },
} as const

/** Clear session and land on the login screen. */
export async function gotoLogin(page: Page) {
  await page.goto('/')
  await page.evaluate(() => localStorage.clear())
  await page.goto('/')
  await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible()
}

export async function login(
  page: Page,
  email: string,
  password: string,
) {
  await gotoLogin(page)
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: 'Log in' }).click()
  await expect(page.getByText('Signed in as')).toBeVisible()
}

export async function loginAsFounder(page: Page) {
  await login(page, SEED.founder.email, SEED.founder.password)
  await expect(page.getByRole('heading', { name: 'SDR Dashboard' })).toBeVisible()
}

export async function loginAsSdr(page: Page) {
  await login(page, SEED.sdr.email, SEED.sdr.password)
  await expect(page.locator('aside:visible').getByText(SEED.sdr.name)).toBeVisible()
}

/** Desktop sidebar nav (viewport ≥ lg). Prefer the visible aside. */
export async function navTo(page: Page, label: string) {
  await page.locator('aside:visible').getByRole('button', { name: new RegExp(label) }).click()
}
