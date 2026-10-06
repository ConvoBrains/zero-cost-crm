import { test, expect } from '@playwright/test';
import { loginAsFounder, loginAsSdr, navTo } from './helpers';

test.describe('Settings E2E', () => {
  test('founder can edit brand name and it persists', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Instance settings' })).toBeVisible();

    const brandInput = page.getByLabel('Brand name');
    const originalBrand = await brandInput.inputValue();
    const stamp = Date.now();
    const newBrand = `${originalBrand} ${stamp}`;

    try {
      // Edit and save
      await brandInput.fill(newBrand);
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(
        page.getByText('Settings saved. Pipeline and forms will use the new lists.')
      ).toBeVisible();
      await expect(brandInput).toHaveValue(newBrand);

      // Reload and verify persistence
      await page.reload();
      await expect(page.getByRole('heading', { name: 'Instance settings' })).toBeVisible();
      await expect(brandInput).toHaveValue(newBrand);
    } finally {
      // Restore original value
      await brandInput.fill(originalBrand);
      await page.getByRole('button', { name: 'Save settings' }).click();
      await expect(
        page.getByText('Settings saved. Pipeline and forms will use the new lists.')
      ).toBeVisible();
      await expect(brandInput).toHaveValue(originalBrand);
    }
  });

  test('SDR cannot access settings', async ({ page }) => {
    await loginAsSdr(page);

    // Assert Settings navigation item is hidden
    await expect(
      page.locator('aside:visible').getByRole('button', { name: 'Settings' })
    ).toHaveCount(0);

    // Attempt direct navigation
    await page.goto('/?page=settings');

    // Assert redirect to Dashboard and Settings page is not visible
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Instance settings' })).toHaveCount(0);
  });
});
