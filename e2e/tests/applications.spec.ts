import { test, expect } from '@playwright/test';

const uniqueEmail = () => `test${Date.now()}@example.com`;

test.describe('Applications', () => {
  test.beforeEach(async ({ page }) => {
    const email = uniqueEmail();
    const name = `Test User ${Date.now()}`;

    await page.goto('/');
    await page.getByRole('button', { name: /create (an )?account/i }).click();
    await page.getByPlaceholder('name@company.com').fill(email);
    await page.getByPlaceholder('••••••••').fill('password123');
    await page.getByPlaceholder('Alex Explorer').fill(name);
    await page.getByRole('button', { name: /create account/i }).click();

    await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
  });

  test.describe('Create Application', () => {
    test('should create a new application', async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();

      await page.getByRole('button', { name: 'New Opportunity' }).click();

      await page.getByPlaceholder('Acme Corp').fill('Test Company');
      await page.getByPlaceholder('Senior Engineer').fill('Software Engineer');

      await page.getByRole('combobox').first().selectOption('APPLIED');

      await page.getByPlaceholder('Remote / Hybrid').fill('Remote');
      await page.getByPlaceholder('$140k - $180k').fill('$150k');

      await page.getByRole('button', { name: /save/i }).click();

      // Should show success toast
      await expect(page.getByText('Application Added')).toBeVisible({ timeout: 5000 });

      // Application should appear in the list
      await expect(page.getByText('Test Company', { exact: true })).toBeVisible();
      await expect(page.getByRole('heading', { name: 'Software Engineer' })).toBeVisible();
    });

    test('should require company and role', async ({ page }) => {
      await page.getByRole('button', { name: 'New Opportunity' }).click();

      // Save button should be disabled with empty fields
      await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();

      // Fill only company
      await page.getByPlaceholder('Acme Corp').fill('Test Company');
      await expect(page.getByRole('button', { name: /save/i })).toBeDisabled();

      // Fill role
      await page.getByPlaceholder('Senior Engineer').fill('Engineer');
      await expect(page.getByRole('button', { name: /save/i })).toBeEnabled();
    });
  });

  test.describe('Edit Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();

      // Create an application first
      await page.getByRole('button', { name: 'New Opportunity' }).click();
      await page.getByPlaceholder('Acme Corp').fill('Edit Test Co');
      await page.getByPlaceholder('Senior Engineer').fill('Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Edit Test Co', { exact: true })).toBeVisible();
    });

    test('should edit an existing application', async ({ page }) => {
      // Click on the application card
      await page.getByText('Edit Test Co', { exact: true }).click();

      // Update fields
      await page.getByPlaceholder('Acme Corp').fill('Updated Company');
      await page.getByRole('combobox').first().selectOption('INTERVIEWING');

      // Save
      await page.getByRole('button', { name: /save/i }).click();

      // Should show success toast
      await expect(page.getByText('Application Updated')).toBeVisible({ timeout: 5000 });

      // Changes should be reflected
      await expect(page.getByText('Updated Company', { exact: true })).toBeVisible();
    });
  });

  test.describe('Delete Application', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();

      // Create an application first
      await page.getByRole('button', { name: 'New Opportunity' }).click();
      await page.getByPlaceholder('Acme Corp').fill('Delete Test Co');
      await page.getByPlaceholder('Senior Engineer').fill('Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Delete Test Co', { exact: true })).toBeVisible();
    });

    test('should delete an application', async ({ page }) => {
      // Find and click the delete button on the card
      const card = page.getByText('Delete Test Co', { exact: true }).locator('..').locator('..');
      await card.getByRole('button', { name: 'Delete application' }).click();

      // Should show success toast
      await expect(page.getByText('Application Deleted')).toBeVisible({ timeout: 5000 });

      // Application should be removed from list
      await expect(page.getByText('Delete Test Co', { exact: true })).not.toBeVisible();
    });
  });

  test.describe('Search and Filter', () => {
    test.beforeEach(async ({ page }) => {
      await page.getByRole('button', { name: 'Applications' }).click();

      // Create multiple applications
      const apps = [
        { company: 'Google', role: 'Engineer', status: 'APPLIED' },
        { company: 'Meta', role: 'Designer', status: 'INTERVIEWING' },
        { company: 'Apple', role: 'Manager', status: 'OFFER' },
      ];

      for (const app of apps) {
        await page.getByRole('button', { name: 'New Opportunity' }).click();
        await page.getByPlaceholder('Acme Corp').fill(app.company);
        await page.getByPlaceholder('Senior Engineer').fill(app.role);
        await page.getByRole('combobox').first().selectOption(app.status);
        await page.getByRole('button', { name: /save/i }).click();
        await expect(page.getByText(app.company, { exact: true })).toBeVisible();
      }
    });

    test('should filter by search query', async ({ page }) => {
      // Search for specific company
      await page.getByPlaceholder('Search your journey...').fill('Google');

      // Only matching application should be visible
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Meta', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).not.toBeVisible();

      // Clear search
      await page.getByPlaceholder('Search your journey...').fill('');

      // All applications should be visible again
      await expect(page.getByText('Google', { exact: true })).toBeVisible();
      await expect(page.getByText('Meta', { exact: true })).toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).toBeVisible();
    });

    test('should filter by status', async ({ page }) => {
      // Filter by INTERVIEWING status
      await page.getByRole('button', { name: 'INTERVIEWING' }).click();

      // Only INTERVIEWING application should be visible
      await expect(page.getByText('Meta', { exact: true })).toBeVisible();
      await expect(page.getByText('Google', { exact: true })).not.toBeVisible();
      await expect(page.getByText('Apple', { exact: true })).not.toBeVisible();
    });
  });

  test.describe('Dashboard Stats', () => {
    test('should update stats when applications are added', async ({ page }) => {
      // Initially should show 0 applications
      await expect(page.getByText('0 / 25')).toBeVisible();

      // Add an application
      await page.getByRole('button', { name: 'New Opportunity' }).click();
      await page.getByPlaceholder('Acme Corp').fill('Stats Test Co');
      await page.getByPlaceholder('Senior Engineer').fill('Developer');
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Stats Test Co', { exact: true })).toBeVisible();

      // Stats should update
      await expect(page.getByText('1 / 25')).toBeVisible();
    });
  });
});
