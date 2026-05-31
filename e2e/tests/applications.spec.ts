import { test, expect, Page } from '@playwright/test';

const uniqueEmail = () => `test${Date.now()}@example.com`;

// Shared helper: sign up and land on the dashboard
async function signUp(page: Page) {
  const email = uniqueEmail();
  await page.goto('/');
  await page.getByRole('button', { name: /create (an )?account/i }).click();
  await page.getByPlaceholder('name@company.com').fill(email);
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByPlaceholder('Alex Explorer').fill(`User ${Date.now()}`);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
}

// Open the New Opportunity modal and fill company + role
async function openNewModal(page: Page, company: string, role: string) {
  await page.getByRole('button', { name: 'New Opportunity' }).click();
  await page.getByPlaceholder('Acme Corp').fill(company);
  await page.getByPlaceholder('Senior Engineer').fill(role);
}

test.describe('Applications', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test.describe('Create Application', () => {
    test('should create a new application', async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();
      await openNewModal(page, 'Test Company', 'Software Engineer');

      // Use locator('select').first() to target Status unambiguously
      // (Source is now a datalist input, not a select, but both have combobox role)
      await page.locator('select').first().selectOption('APPLIED');
      await page.getByPlaceholder('Remote / Hybrid').fill('Remote');
      await page.getByPlaceholder('$140k - $180k').fill('$150k');
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText('Application Added')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Test Company', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Software Engineer' })).toBeVisible();
    });

    test('should require company and role', async ({ page }) => {
      await page.getByRole('button', { name: 'New Opportunity' }).click();
      await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();

      await page.getByPlaceholder('Acme Corp').fill('Test Company');
      await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();

      await page.getByPlaceholder('Senior Engineer').fill('Engineer');
      await expect(page.getByRole('button', { name: /save/i })).toBeEnabled();
    });

    test('should accept free-text in the source field', async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();
      await openNewModal(page, 'Source Test Co', 'Dev');

      const sourceInput = page.getByPlaceholder('Select or type a source…');
      // Use pressSequentially so React processes each keystroke before save
      await sourceInput.click();
      await sourceInput.pressSequentially('AngelList');
      await expect(sourceInput).toHaveValue('AngelList');

      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Application Added')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Source Test Co', { exact: true })).toBeVisible();
    });
  });

  test.describe('Edit Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();
      await openNewModal(page, 'Edit Test Co', 'Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Edit Test Co', { exact: true })).toBeVisible();
    });

    test('should edit an existing application', async ({ page }) => {
      await page.getByText('Edit Test Co', { exact: true }).click();
      await page.getByPlaceholder('Acme Corp').fill('Updated Company');
      await page.locator('select').first().selectOption('INTERVIEWING');
      await page.getByRole('button', { name: /save/i }).click();

      await expect(page.getByText('Application Updated')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Updated Company', { exact: true })).toBeVisible();
    });

    test('should not carry over link from previous modal open', async ({ page }) => {
      // Create a second application with a link
      await openNewModal(page, 'Link Co', 'Dev');
      await page.getByPlaceholder('URL to posting...').fill('https://example.com/job');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Link Co', { exact: true })).toBeVisible();

      // Open Link Co, verify link present, close
      await page.getByText('Link Co', { exact: true }).click();
      await expect(page.getByPlaceholder('URL to posting...')).toHaveValue('https://example.com/job');
      await page.getByRole('button', { name: /cancel/i }).click();

      // Open Edit Test Co (no link) — link field must be empty
      await page.getByText('Edit Test Co', { exact: true }).click();
      await expect(page.getByPlaceholder('URL to posting...')).toHaveValue('');
    });
  });

  test.describe('Interview Tracking', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();
      await openNewModal(page, 'Interview Co', 'Engineer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Interview Co', { exact: true })).toBeVisible();
    });

    test('should show outcome buttons after setting an interview date', async ({ page }) => {
      await page.getByText('Interview Co', { exact: true }).click();
      await page.locator('input[type="datetime-local"]').fill('2026-07-15T10:00');

      await expect(page.getByRole('button', { name: 'Passed' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Failed' })).toBeVisible();
      await expect(page.getByRole('button', { name: 'Declined' })).toBeVisible();
    });

    test('should save interview outcome and notes', async ({ page }) => {
      await page.getByText('Interview Co', { exact: true }).click();
      await page.locator('input[type="datetime-local"]').fill('2026-07-15T10:00');
      await page.getByRole('button', { name: 'Passed' }).click();
      await page.getByPlaceholder(/questions asked|agenda|topics/i).fill('Asked about system design');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Application Updated')).toBeVisible({ timeout: 5000 });

      // Reopen and verify outcome persisted
      await page.getByText('Interview Co', { exact: true }).click();
      await expect(page.getByRole('button', { name: 'Passed' })).toHaveClass(/bg-emerald/);
      await expect(page.getByPlaceholder(/questions asked|agenda|topics/i)).toHaveValue('Asked about system design');
    });
  });

  test.describe('Delete Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();
      await openNewModal(page, 'Delete Test Co', 'Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Delete Test Co', { exact: true })).toBeVisible();
    });

    test('should delete an application', async ({ page }) => {
      const card = page.getByText('Delete Test Co', { exact: true }).locator('..').locator('..');
      await card.getByRole('button', { name: 'Delete application' }).click();

      await expect(page.getByText('Application Deleted')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Delete Test Co', { exact: true })).not.toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    // Creating 3 apps through the UI takes time — give this suite extra headroom
    test.setTimeout(90000);

    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();

      const apps = [
        { company: 'Google', role: 'Engineer', status: 'APPLIED' },
        { company: 'Meta', role: 'Designer', status: 'INTERVIEWING' },
        { company: 'Apple', role: 'Manager', status: 'OFFER' },
      ];

      for (const app of apps) {
        await openNewModal(page, app.company, app.role);
        await page.locator('select').first().selectOption(app.status);
        await page.getByRole('button', { name: /save/i }).click();
        await expect(page.getByText(app.company, { exact: true })).toBeVisible();
      }
    });

    test('should filter by search query', async ({ page }) => {
      await page.getByPlaceholder('Search...').fill('Google');
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Meta', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).not.toBeVisible();

      await page.getByPlaceholder('Search...').fill('');
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Meta', { exact: true })).toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
      await page.getByRole('button', { name: 'INTERVIEWING' }).click();
      await expect(page.getByText('Meta', { exact: true })).toBeVisible();
      await expect(page.getByText('Google', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).not.toBeVisible();
    });
  });

  test.describe('Dashboard Stats', () => {
    test('should update stats when applications are added', async ({ page }) => {
      await expect(page.getByText('0 / 25')).toBeVisible();

      await openNewModal(page, 'Stats Test Co', 'Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Stats Test Co', { exact: true })).toBeVisible();

      await expect(page.getByText('1 / 25')).toBeVisible();
    });
  });
});
