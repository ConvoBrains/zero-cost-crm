import { test, expect, type Page } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

/** Settings "any contact" scope: a non-champion contact's status moves its company card. */

const column = (page: Page, stage: string) =>
  page.locator(`div:has(> div > h3:text-is("${stage}"))`);

async function setScope(page: Page, scope: 'champion' | 'any_contact') {
  await navTo(page, 'Settings');
  await page.getByTestId('stage-auto-move-scope').selectOption(scope);
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(
    page.getByText('Settings saved. Pipeline and forms will use the new lists.')
  ).toBeVisible();
}

test.describe('Contact status → company stage, any contact', () => {
  test('a non-champion status change moves the card', async ({ page }) => {
    const stamp = Date.now();
    const companyName = `Any Contact Co ${stamp}`;
    const contactName = `Any Contact Lead ${stamp}`;

    await loginAsFounder(page);
    await setScope(page, 'any_contact');
    try {
      await navTo(page, 'Sales Pipeline');
      await page.getByRole('button', { name: '+ Add company' }).click();
      await page.getByLabel('Company Name *').fill(companyName);
      await page.getByRole('button', { name: 'Add company', exact: true }).click();
      await expect(column(page, 'Lead Added').getByText(companyName)).toBeVisible();

      await navTo(page, 'Contacts');
      await page.getByRole('button', { name: '+ Add contact' }).click();
      await page.getByLabel('Contact Name *').fill(contactName);
      await page.locator('form select').first().selectOption({ label: companyName });
      await page.getByLabel('Email', { exact: true }).fill(`any.contact.${stamp}@example.test`);
      await page.getByLabel('Contact Status').selectOption('Not Contacted');
      await page.getByRole('button', { name: 'Add contact', exact: true }).click();
      await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0);

      await page.locator('main table').getByText(contactName).first().click();
      await page.getByLabel('Contact Status').selectOption('Follow-up Required');
      await page.getByRole('button', { name: 'Save changes' }).click();
      await expect(page.getByRole('heading', { name: contactName })).toHaveCount(0);

      await navTo(page, 'Sales Pipeline');
      await expect(column(page, 'Follow-up').getByText(companyName)).toBeVisible();
    } finally {
      await setScope(page, 'champion');
    }
  });
});
