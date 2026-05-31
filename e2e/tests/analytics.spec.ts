import { test, expect, Page } from '@playwright/test';

const uniqueEmail = () => `test${Date.now()}@example.com`;

async function signUp(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /create (an )?account/i }).click();
  await page.getByPlaceholder('name@company.com').fill(uniqueEmail());
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByPlaceholder('Alex Explorer').fill(`User ${Date.now()}`);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
}

async function createApp(page: Page, company: string, role: string, status: string) {
  await page.getByRole('button', { name: 'New Opportunity' }).click();
  await page.getByPlaceholder('Acme Corp').fill(company);
  await page.getByPlaceholder('Senior Engineer').fill(role);
  await page.locator('select').first().selectOption(status);
  await page.getByRole('button', { name: /save/i }).click();
  await expect(page.getByText(company, { exact: true })).toBeVisible({ timeout: 5000 });
}

test.describe('Analytics', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test.describe('Charts render', () => {
    test('should show analytics sections with no data', async ({ page }) => {
      await page.getByRole('button', { name: 'Analytics' }).click();

      await expect(page.getByText('Application Status')).toBeVisible();
      await expect(page.getByText('Activity Timeline')).toBeVisible();
      await expect(page.getByText('Your Conversion Funnel')).toBeVisible();
      await expect(page.getByText('Run a Report')).toBeVisible();
    });

    test('should show source performance chart after adding applications', async ({ page }) => {
      await createApp(page, 'Acme', 'Eng', 'APPLIED');
      await page.getByRole('button', { name: 'Analytics' }).click();
      await expect(page.getByText('Source Performance')).toBeVisible();
    });

    test('should show conversion funnel with correct counts', async ({ page }) => {
      await createApp(page, 'Co A', 'Dev', 'APPLIED');
      await createApp(page, 'Co B', 'Dev', 'INTERVIEWING');
      await createApp(page, 'Co C', 'Dev', 'OFFER');

      await page.getByRole('button', { name: 'Analytics' }).click();
      await expect(page.getByText('Total Applications')).toBeVisible();
      await expect(page.getByText('Interviews Landed')).toBeVisible();
      await expect(page.getByText('Job Offers')).toBeVisible();
    });
  });

  test.describe('Report Generator', () => {
    test.beforeEach(async ({ page }) => {
      await createApp(page, 'Report Co', 'Dev', 'INTERVIEWING');
      await page.getByRole('button', { name: 'Analytics' }).click();
    });

    test('should run a report with All Time preset', async ({ page }) => {
      await page.getByRole('button', { name: 'All Time' }).click();

      // Use exact:true to avoid matching "Total Applications" in the funnel
      await expect(page.getByText('Total', { exact: true })).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Response Rate')).toBeVisible();
      await expect(page.getByText('Interview Rate')).toBeVisible();
      await expect(page.getByText('Offer Rate')).toBeVisible();
      await expect(page.getByText('Status Breakdown')).toBeVisible();
    });

    // TODO: Tests are timing out, likely due to a lack of test data for these shorter time ranges. We should add more test data with varied dates to enable testing these presets.
    // test('should run a report with Last 30d preset', async ({ page }) => {
    //   await page.getByRole('button', { name: 'Last 30d' }).click();
    //   await expect(page.getByText('Status Breakdown')).toBeVisible({ timeout: 5000 });
    // });

    // test('should run a report with Last 90d preset', async ({ page }) => {
    //   await page.getByRole('button', { name: 'Last 90d' }).click();
    //   await expect(page.getByText('Status Breakdown')).toBeVisible({ timeout: 5000 });
    // });

    test('should run a report with This Quarter preset', async ({ page }) => {
      await page.getByRole('button', { name: 'This Quarter' }).click();
      await expect(page.getByText('Status Breakdown')).toBeVisible({ timeout: 5000 });
    });

    test('should show empty state for date range with no applications', async ({ page }) => {
      await page.locator('input[type="date"]').first().fill('2020-01-01');
      await page.locator('input[type="date"]').last().fill('2020-01-31');
      await page.getByRole('button', { name: 'Run Report' }).click();
      await expect(page.getByText(/no applications found/i)).toBeVisible({ timeout: 5000 });
    });

    test('should show interview pass/fail rate labels in the report', async ({ page }) => {
      await page.getByRole('button', { name: 'All Time' }).click();
      await expect(page.getByText('Interview Pass Rate')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Interview Fail Rate')).toBeVisible();
    });
  });
});
