import { test, expect, type Page } from '@playwright/test';
import { login, loginAsSdr, SEED } from './helpers';

async function loginAsFounderCurrent(page: Page) {
  await login(page, SEED.founder.email, SEED.founder.password);
  await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
}

/**
 * Issue #68 — Cmd/Ctrl+K command palette for quick CRM navigation.
 */
test.describe('Command palette (issue #68)', () => {
  test('opens with Ctrl+K and jumps to a company detail modal', async ({ page }) => {
    await loginAsFounderCurrent(page);

    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await expect(page.getByTestId('command-palette-input')).toBeFocused();

    await page.getByTestId('command-palette-input').fill('Nova Health');
    await expect(page.getByTestId('command-palette-item').first()).toContainText('Nova Health');
    await page.keyboard.press('Enter');

    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Nova Health' })).toBeVisible();
    await expect(page).toHaveURL(/page=pipeline&companyId=/);
  });

  test('finds a contact by email and opens the contact detail modal', async ({ page }) => {
    await loginAsFounderCurrent(page);

    await page.keyboard.press('Control+K');
    await page.getByTestId('command-palette-input').fill('contact0@seed.example');
    await expect(
      page.getByTestId('command-palette-item').filter({ hasText: 'Alex Example' })
    ).toBeVisible();
    await page.keyboard.press('Enter');

    await expect(page.getByRole('heading', { name: 'Contacts' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Alex Example' })).toBeVisible();
    await expect(page).toHaveURL(/page=contacts$/);
  });

  test('Escape and click-outside close the palette', async ({ page }) => {
    await loginAsFounderCurrent(page);

    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);

    await page.keyboard.press('Control+K');
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toBeVisible();
    await page.getByRole('button', { name: 'Dismiss command palette' }).click({
      position: { x: 5, y: 5 },
    });
    await expect(page.getByRole('dialog', { name: 'Command palette' })).toHaveCount(0);
  });

  test('page results honor the current user role', async ({ page }) => {
    await loginAsSdr(page);

    await page.keyboard.press('Control+K');
    await page.getByTestId('command-palette-input').fill('Settings');

    await expect(page.getByText('No matching results.')).toBeVisible();
    await expect(
      page.getByTestId('command-palette-item').filter({ hasText: 'Settings' })
    ).toHaveCount(0);
  });
});
