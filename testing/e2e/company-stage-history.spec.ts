import { test, expect, type Page } from '@playwright/test'
import { loginAsFounder, navTo } from './helpers'

const cardSelector = (companyId: string) =>
  `[data-testid="company-card"][data-company-id="${companyId}"]`

function stageColumn(page: Page, stage: string) {
  return page.locator(`div:has(> div > h3:text-is("${stage}"))`)
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
  opts: { name: string; company: string; email: string },
) {
  await navTo(page, 'Contacts')
  await page.getByRole('button', { name: '+ Add contact' }).click()
  await expect(page.getByRole('heading', { name: 'Add contact' })).toBeVisible()
  await page.getByLabel('Contact Name *').fill(opts.name)
  await page.locator('form select').first().selectOption({ label: opts.company })
  await page.getByLabel('Email', { exact: true }).fill(opts.email)
  await page.getByRole('button', { name: 'Add contact', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0)
}

async function openContact(page: Page, name: string) {
  await navTo(page, 'Contacts')
  await page.getByRole('button', { name: /All Contacts/ }).click()
  await page.locator('main table').getByText(name).first().click()
  await expect(page.getByRole('heading', { name })).toBeVisible()
}

test.describe('Company stage from contact + company progress', () => {
  test('contact pipeline stage moves company on Kanban; company modal shows progress', async ({
    page,
  }) => {
    await loginAsFounder(page)

    const stamp = Date.now()
    const companyName = `StageSync Co ${stamp}`
    const leadA = `Lead A ${stamp}`
    const leadB = `Lead B ${stamp}`

    const companyId = await addCompany(page, companyName)
    await addContact(page, {
      name: leadA,
      company: companyName,
      email: `a.${stamp}@stagesync.example`,
    })
    await addContact(page, {
      name: leadB,
      company: companyName,
      email: `b.${stamp}@stagesync.example`,
    })

    await openContact(page, leadA)
    await expect(page.getByLabel('Company pipeline stage')).toBeVisible()
    await page.getByLabel('Company pipeline stage').selectOption('Follow-up')
    // Stage change is immediate (not waiting for Save).
    await expect(page.getByLabel('Company pipeline stage')).toHaveValue('Follow-up')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await openContact(page, leadB)
    await expect(page.getByLabel('Company pipeline stage')).toHaveValue('Follow-up')
    await page.getByRole('button', { name: 'Cancel' }).click()

    await navTo(page, 'Sales Pipeline')
    await expect(stageColumn(page, 'Follow-up').locator(cardSelector(companyId))).toBeVisible()

    await page.locator(cardSelector(companyId)).getByRole('button', { name: companyName }).click()
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible()
    await expect(page.getByRole('heading', { name: 'Progress' })).toBeVisible()
    await expect(page.getByText('Stage changed').first()).toBeVisible()
  })
})
