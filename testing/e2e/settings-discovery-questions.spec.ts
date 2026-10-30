import { test, expect } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

test.describe('Settings discovery questions editor', () => {
  test('founder can add, edit, save, reload, and remove discovery questions', async ({ page }) => {
    await loginAsFounder(page);
    await navTo(page, 'Settings');

    const editor = page.getByTestId('discovery-questions-editor');
    await expect(editor).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Discovery questions' })).toBeVisible();

    const initialRowCount = await page.getByTestId('discovery-question-row').count();

    // Add a new discovery question
    await page.getByTestId('discovery-questions-add').click();
    await expect(page.getByTestId('discovery-question-row')).toHaveCount(initialRowCount + 1);

    const testId = `test_budget_${Date.now()}`;
    const testSection = 'Budget Info';
    const testPrompt = 'What is your estimated annual budget?';

    const newRow = page.getByTestId('discovery-question-row').last();
    const idInput = newRow.getByLabel(/ID/i);
    await idInput.fill(testId);

    const sectionInput = newRow.getByLabel(/Section/i);
    await sectionInput.fill(testSection);

    const promptInput = newRow.getByLabel(/Prompt/i);
    await promptInput.fill(testPrompt);

    const typeSelect = newRow.getByLabel(/Input type/i);
    await typeSelect.selectOption('number');

    // Save settings
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(
      page.getByText('Settings saved. Pipeline and forms will use the new lists.')
    ).toBeVisible();

    // Reload page and navigate to Settings to verify persistence
    await page.reload();
    await expect(page.getByText('Signed in as')).toBeVisible();
    await navTo(page, 'Settings');
    await expect(page.getByRole('heading', { name: 'Instance settings' })).toBeVisible();

    const savedRow = page.getByTestId('discovery-question-row').filter({
      has: page.locator(`input[value="${testId}"]`),
    });
    await expect(savedRow).toBeVisible();
    await expect(savedRow.getByLabel(/Section/i)).toHaveValue(testSection);
    await expect(savedRow.getByLabel(/Prompt/i)).toHaveValue(testPrompt);
    await expect(savedRow.getByLabel(/Input type/i)).toHaveValue('number');

    // Clean up: Remove the question and save again
    await savedRow.getByTestId('discovery-question-remove').click();
    await page.getByRole('button', { name: 'Save settings' }).click();
    await expect(
      page.getByText('Settings saved. Pipeline and forms will use the new lists.')
    ).toBeVisible();
  });
});
