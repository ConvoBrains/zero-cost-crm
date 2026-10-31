import { test, expect } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

/**
 * Contacts opens on Queue = All, keeps filters across page switches, and each contact's
 * Call log keeps the first call's outcome after a later status overwrites it.
 */

test.describe('Contacts call log + filters', () => {
  test('filters persist across navigation and the call log keeps each update', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Contacts');
    await expect(page.getByTestId('contact-filter-queue')).toContainText('All');

    // Pick a status filter, leave, come back: it is still applied.
    await page.getByTestId('contact-filter-status').click();
    await page.getByRole('option', { name: 'Interested', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('button', { name: 'Clear Status: Interested' })).toBeVisible();
    await navTo(page, 'Sales Pipeline');
    await navTo(page, 'Contacts');
    await expect(page.getByRole('button', { name: 'Clear Status: Interested' })).toBeVisible();
    await page.getByRole('button', { name: 'Clear Status: Interested' }).click();

    // New contact → Interested with a note → Didn't Pick. Both updates stay in the log.
    const name = `Call Log ${Date.now()}`;
    await page.getByRole('button', { name: '+ Add contact' }).click();
    await page.getByLabel('Contact Name *').fill(name);
    await page.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0);

    const open = async () => {
      await page.locator('main table').getByText(name).first().click();
      await expect(page.getByRole('heading', { name })).toBeVisible();
    };

    await open();
    await page.getByLabel('Contact Status').selectOption('Interested');
    await page.getByLabel('Notes', { exact: true }).fill('Busy, call tomorrow');
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name })).toHaveCount(0);

    await open();
    await page.getByLabel('Contact Status').selectOption("Didn't Pick");
    await page.getByRole('button', { name: 'Save changes' }).click();
    await expect(page.getByRole('heading', { name })).toHaveCount(0);

    await open();
    const log = page.getByTestId('contact-call-log');
    await expect(log.getByTestId('call-log-summary')).toContainText('First contacted');
    await expect(log).toContainText('First call');
    await expect(log).toContainText('Busy, call tomorrow');
    await expect(log).toContainText('Not Contacted → Interested');
    await expect(log).toContainText("Interested → Didn't Pick");

    // "Current or past status" finds it under Interested even though it is now Didn't Pick.
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name })).toHaveCount(0);
    await page.getByTestId('contact-filter-status').click();
    await page.getByRole('option', { name: 'Interested', exact: true }).click();
    await page.keyboard.press('Escape');
    await expect(page.locator('main table').getByText(name)).toHaveCount(0);
    await page.getByTestId('contact-filter-status-match').click();
    await page.getByRole('option', { name: 'Current or past status' }).click();
    await expect(page.locator('main table').getByText(name).first()).toBeVisible();
  });
});
