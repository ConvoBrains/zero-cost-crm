import { test, expect } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

test.describe('Settings champion status → stage map (issue #52)', () => {
  test('founder can add, save, reload, and remove a mapping', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Settings');

    const editor = page.getByTestId('champion-map-editor');
    await expect(editor).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Champion status → pipeline stage' })
    ).toBeVisible();
    await expect(editor.getByText(/never move backward/i)).toBeVisible();

    const statusValues = await editor
      .getByLabel('Contact status', { exact: true })
      .evaluateAll((els) => els.map((el) => (el as HTMLSelectElement).value));
    expect(statusValues).toContain('Interested');

    await page.getByTestId('champion-map-add').click();
    const newRow = page.getByTestId('champion-map-row').last();
    await newRow.getByLabel('Contact status', { exact: true }).selectOption('Not Contacted');
    await newRow.getByLabel('Pipeline stage', { exact: true }).selectOption('Follow-up');

    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(
      page.getByText('Settings saved. Pipeline and forms will use the new lists.')
    ).toBeVisible();

    await page.reload();
    await expect(page.getByText('Signed in as')).toBeVisible();
    await navTo(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Instance settings' })).toBeVisible();

    const mappedRow = page.getByTestId('champion-map-row').filter({
      has: page.getByLabel('Contact status', { exact: true }),
    });
    const rowCount = await mappedRow.count();
    let notContactedRow = mappedRow.first();
    let found = false;
    for (let i = 0; i < rowCount; i++) {
      const value = await mappedRow
        .nth(i)
        .getByLabel('Contact status', { exact: true })
        .inputValue();
      if (value === 'Not Contacted') {
        notContactedRow = mappedRow.nth(i);
        found = true;
        break;
      }
    }
    expect(found).toBe(true);
    await expect(notContactedRow.getByLabel('Pipeline stage', { exact: true })).toHaveValue(
      'Follow-up'
    );

    await notContactedRow.getByTestId('champion-map-remove').click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(
      page.getByText('Settings saved. Pipeline and forms will use the new lists.')
    ).toBeVisible();
  });
});
