import { test, expect, type Page } from '@playwright/test';
import { loginAsFounder, navTo } from './helpers';

/**
 * Sales Pipeline "Calling progress" chips segment companies from their contacts, the
 * WhatsApp flag is tracked per contact, and the company modal lists its contacts.
 */

const card = (page: Page, name: string) =>
  page.locator('[data-testid="company-card"]').filter({ hasText: name });

async function pickProgress(page: Page, bucket: string) {
  await page.getByTestId(`pipeline-progress-${bucket}`).click();
  await expect(page.getByTestId(`pipeline-progress-${bucket}`)).toHaveAttribute(
    'aria-pressed',
    'true'
  );
}

test.describe('Pipeline calling progress + WhatsApp tracking', () => {
  test('segments companies, tracks WhatsApp, and lists contacts on the company', async ({
    page,
  }) => {
    const stamp = Date.now();
    const companyName = `Progress Co ${stamp}`;
    const contactName = `Progress Person ${stamp}`;

    await loginAsFounder(page);
    await navTo(page, 'Sales Pipeline');
    await page.getByRole('button', { name: '+ Add company' }).click();
    await page.getByLabel('Company Name *').fill(companyName);
    await page.getByRole('button', { name: 'Add company', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add company' })).toHaveCount(0);

    // A fresh company with no dials is "Not started".
    await expect(card(page, companyName).getByTestId('card-progress')).toContainText('Not started');
    await pickProgress(page, 'not_started');
    await expect(card(page, companyName)).toBeVisible();
    await pickProgress(page, 'didnt_pick');
    await expect(card(page, companyName)).toHaveCount(0);

    // Add a contact who didn't pick up.
    await navTo(page, 'Contacts');
    await page.getByRole('button', { name: '+ Add contact' }).click();
    await page.getByLabel('Contact Name *').fill(contactName);
    await page.locator('form select').first().selectOption({ label: companyName });
    await page.getByLabel('Email', { exact: true }).fill(`progress.${stamp}@example.test`);
    await page.getByLabel('Contact Status').selectOption("Didn't Pick");
    await page.getByRole('button', { name: 'Add contact', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Add contact' })).toHaveCount(0);

    // The pipeline kept the "Didn't pick" chip across navigation and now shows the company.
    await navTo(page, 'Sales Pipeline');
    await expect(page.getByTestId('pipeline-progress-didnt_pick')).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    await expect(card(page, companyName).getByTestId('card-progress')).toContainText('1/1 dialed');
    await expect(card(page, companyName).getByTestId('card-progress')).toContainText('WA 0/1');

    // WhatsApp pending narrows to companies with an unsent dialed contact.
    await page.getByTestId('pipeline-whatsapp-pending').click();
    await expect(card(page, companyName)).toBeVisible();

    // Company modal: contacts list with an inline WhatsApp toggle.
    await card(page, companyName).getByRole('button').first().click();
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
    const row = page.getByTestId('company-contact-row').filter({ hasText: contactName });
    await expect(row).toContainText("Didn't Pick");
    await expect(row).toContainText('Pending');
    await row.getByTestId('company-contact-whatsapp').check();
    await expect(row).toContainText('Sent');
    await expect(page.getByTestId('company-contacts-summary')).toContainText('WhatsApp 1/1 sent');

    // View events are hidden from Progress unless asked for.
    const history = page.getByRole('region', { name: 'Company progress history' });
    await expect(history).not.toContainText('Opened company');
    await page.getByTestId('history-show-views').check();
    await expect(history).toContainText('Opened company');

    // Opening the contact shows its call log with the WhatsApp entry.
    await row.getByTestId('company-contact-open').click();
    await expect(page.getByRole('heading', { name: contactName })).toBeVisible();
    await expect(page.getByTestId('contact-whatsapp-sent')).toBeChecked();
    await expect(page.getByTestId('contact-call-log')).toContainText('WhatsApp sent');
    await page.getByRole('button', { name: 'Cancel' }).click();
    await expect(page.getByRole('heading', { name: companyName })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('heading', { name: companyName })).toHaveCount(0);

    // Sent, so the company drops out of WhatsApp pending.
    await expect(card(page, companyName)).toHaveCount(0);
    await page.getByTestId('pipeline-clear-filters').click();
    await expect(card(page, companyName)).toBeVisible();

    // Contacts page: WhatsApp filter + inline toggle.
    await navTo(page, 'Contacts');
    await page.getByTestId('contact-filter-whatsapp').click();
    await page.getByRole('option', { name: 'Sent', exact: true }).click();
    const contactRow = page.locator('main table tr').filter({ hasText: contactName });
    await expect(contactRow).toBeVisible();
    // click, not uncheck(): the row leaves the "Sent" list as soon as it saves.
    await contactRow.getByTestId('contact-row-whatsapp').click();
    await expect(contactRow).toHaveCount(0);
    await page.getByTestId('contact-filter-whatsapp').click();
    await page.getByRole('option', { name: 'Pending (dialed, not sent)' }).click();
    await expect(contactRow).toBeVisible();

    // Bulk mark.
    await contactRow.locator('input[type="checkbox"]').first().check();
    await page.getByTestId('bulk-whatsapp-sent').click();
    await expect(contactRow).toHaveCount(0);
    await page.getByTestId('contact-clear-filters').click();
  });
});
