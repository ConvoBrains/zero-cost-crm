import { test, expect } from '@playwright/test';
import { loginAsFounder, navTo, showAllContacts } from './helpers';

/**
 * Issue #108 — Playwright coverage for EmptyState (Contacts first-run + filtered
 * empty states, and Pipeline view/filter-empty vs first-run empty state).
 */
test.describe('EmptyState coverage (issue #108)', () => {
  test('empty Contacts shows first-run empty state and CTA opens Add contact modal', async ({
    page,
  }) => {
    await page.route('**/api/bootstrap', async (route) => {
      const response = await route.fetch();
      const body = (await response.json()) as { companies: unknown[]; contacts: unknown[] };
      await route.fulfill({
        response,
        json: { ...body, contacts: [] },
      });
    });

    await loginAsFounder(page);
    await navTo(page, 'Contacts');
    await showAllContacts(page);

    const table = page.locator('main table');
    await expect(table.getByText('No contacts yet')).toBeVisible();
    await expect(
      table.getByText('Add your first contact to start tracking follow-ups.')
    ).toBeVisible();
    await expect(table.getByText('No contacts match these filters')).toHaveCount(0);

    const cta = table.getByRole('button', { name: '+ Add contact' });
    await expect(cta).toBeVisible();
    await cta.click();
    await expect(page.getByRole('heading', { name: 'Add contact' })).toBeVisible();
  });

  test('filtered Contacts with 0 matches shows filtered empty state and Clear all filters CTA resets', async ({
    page,
  }) => {
    await loginAsFounder(page);
    await navTo(page, 'Contacts');
    await showAllContacts(page);

    const table = page.locator('main table');
    await expect(table.getByText('Alex Example').first()).toBeVisible();

    await page.getByTestId('contact-search').fill('__no_matching_contact_e2e__');
    await expect(table.getByText('No contacts match these filters')).toBeVisible();
    await expect(table.getByText('Try clearing a filter to see more results.')).toBeVisible();
    await expect(table.getByText('No contacts yet')).toHaveCount(0);

    await table.getByRole('button', { name: 'Clear all filters' }).click();
    await expect(table.getByText('Alex Example').first()).toBeVisible();
  });

  test('Pipeline with companies in a 0-count view shows "No companies match this view" and CTA resets view and filters', async ({
    page,
  }) => {
    await loginAsFounder(page);
    await navTo(page, 'Sales Pipeline');

    await expect(page.getByText('ABC Pvt Ltd')).toBeVisible();
    await expect(page.getByText('CloudNest')).toBeVisible();

    // Select a 0-count view ("Final Negotiation" has 0 seeded companies)
    await page.getByRole('button', { name: /^Final Negotiation/ }).click();
    await expect(page.getByText('No companies match this view')).toBeVisible();
    await expect(
      page.getByText('Try a different view or clear the filters to see more companies.')
    ).toBeVisible();
    await expect(page.getByText('No companies yet')).toHaveCount(0);

    // Also activate a filter so we verify CTA resets both view and filters
    await page.getByTestId('pipeline-progress-demo_delivered').click();
    await expect(page.getByTestId('pipeline-progress-demo_delivered')).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    const cta = page.getByRole('button', { name: 'Show all companies' });
    await expect(cta).toBeVisible();
    await cta.click();

    await expect(page.getByText('No companies match this view')).toHaveCount(0);
    await expect(page.getByTestId('pipeline-progress-all')).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('pipeline-clear-filters')).toHaveCount(0);
    await expect(page.getByText('ABC Pvt Ltd')).toBeVisible();
    await expect(page.getByText('CloudNest')).toBeVisible();
  });
});
