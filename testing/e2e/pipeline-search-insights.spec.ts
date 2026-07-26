import { test, expect } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

/**
 * Issues #40 + #42 — Pipeline company search typeahead and date-range progress insights.
 */
test.describe('Pipeline search + date insights (issues #40 #42)', () => {
  test('search typeahead opens the company detail modal', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Sales Pipeline');

    await page.getByTestId('pipeline-search').fill('Nova Health');
    await expect(page.getByTestId('pipeline-search-suggestions')).toBeVisible();
    await page.getByTestId('pipeline-search-suggestion').filter({ hasText: 'Nova Health' }).click();
    await expect(page.getByRole('heading', { name: 'Nova Health' })).toBeVisible();
  });

  test('date range filters the board and updates insights', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Sales Pipeline');

    await expect(page.getByTestId('pipeline-insights')).toBeVisible();
    await expect(page.getByTestId('pipeline-insight-total')).toBeVisible();

    await page.getByTestId('pipeline-date-range').click();
    await page.getByRole('option', { name: 'This Week', exact: true }).click();
    await expect(page.getByTestId('pipeline-clear-filters')).toBeVisible();
    await expect(page.getByTestId('pipeline-insight-total')).toBeVisible();

    await page.getByTestId('pipeline-insights-toggle').click();
    await expect(page.getByTestId('pipeline-insight-total')).toHaveCount(0);
    await page.getByTestId('pipeline-insights-toggle').click();
    await expect(page.getByTestId('pipeline-insight-total')).toBeVisible();
  });

  test('custom date range shows from/to inputs', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Sales Pipeline');

    await page.getByTestId('pipeline-date-range').click();
    await page.getByRole('option', { name: 'Custom', exact: true }).click();
    await expect(page.getByTestId('pipeline-custom-from')).toBeVisible();
    await expect(page.getByTestId('pipeline-custom-to')).toBeVisible();

    await page.getByTestId('pipeline-custom-from').fill('2026-01-01');
    await page.getByTestId('pipeline-custom-to').fill('2026-12-31');
    await expect(page.getByTestId('pipeline-clear-filters')).toBeVisible();
  });
});
