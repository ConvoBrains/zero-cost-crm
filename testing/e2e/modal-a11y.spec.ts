import { test, expect, type Page } from '@playwright/test'
import { loginAsFounder, navTo } from './helpers'

/**
 * Issue #13 — the shared Modal (src/components/ui.tsx) must be an accessible
 * dialog: role="dialog" + aria-modal="true", an accessible name taken from its
 * title, Escape-to-close (and a harmless no-op when nothing is open), plus
 * dismissal via the Close button and via the backdrop.
 *
 * We drive the real "Add company" modal (Sales Pipeline → "+ Add company").
 * No test submits the form, so nothing is persisted — every modal is discarded.
 */

/** Open the "Add company" modal and return its dialog locator. */
async function openAddCompanyModal(page: Page) {
  await page.getByRole('button', { name: '+ Add company' }).click()
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  return dialog
}

test.describe('Modal accessibility (issue #13)', () => {
  test('modal is a dialog with aria-modal and an accessible name from its title', async ({
    page,
  }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    const dialog = await openAddCompanyModal(page)
    await expect(dialog).toHaveAttribute('aria-modal', 'true')
    // The accessible name is wired to the modal's title ("Add company").
    await expect(dialog).toHaveAccessibleName('Add company')
  })

  test('Escape closes the dialog', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    await openAddCompanyModal(page)
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('Escape with no dialog open is a no-op and the page stays usable', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    // Nothing is open to begin with.
    await expect(page.getByRole('dialog')).toHaveCount(0)
    // Escape must not throw or wedge the app when there is no open modal.
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toHaveCount(0)

    // The page is still interactive: the modal can still be opened afterwards.
    const dialog = await openAddCompanyModal(page)
    await expect(dialog).toBeVisible()
  })

  test('the Close button dismisses the dialog', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    await openAddCompanyModal(page)
    await page.getByRole('button', { name: 'Close', exact: true }).click()
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })

  test('clicking the backdrop dismisses the dialog', async ({ page }) => {
    await loginAsFounder(page)
    await navTo(page, 'Sales Pipeline')

    await openAddCompanyModal(page)
    // The backdrop is a full-screen button rendered behind the centered panel;
    // click a top-left corner the panel does not cover so the click lands on it.
    await page
      .getByRole('button', { name: 'Dismiss dialog' })
      .click({ position: { x: 5, y: 5 } })
    await expect(page.getByRole('dialog')).toHaveCount(0)
  })
})
