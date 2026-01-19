import { test, expect } from '@playwright/test';

// Generate unique email for each test run
const uniqueEmail = () => `test${Date.now()}@example.com`;

test.describe('Authentication', () => {
  test.describe('Registration', () => {
    test('should register a new user', async ({ page }) => {
      const email = uniqueEmail();
      const name = `Test User ${Date.now()}`;

      await page.goto('/');

      // Should be on login page initially
      await expect(page.getByRole('heading', { name: 'JobJourney' })).toBeVisible();

      // Switch to signup
      await page.getByRole('button', { name: /create (an )?account/i }).click();
      await expect(page.getByRole('button', { name: /create account/i })).toBeVisible();

      // Fill in registration form
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password123');
      await page.getByPlaceholder('Alex Explorer').fill(name);

      // Submit
      await page.getByRole('button', { name: /create account/i }).click();

      // Should redirect to dashboard
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
    });

    test('should show error for duplicate email', async ({ page }) => {
      const email = uniqueEmail();
      const name = `Test User ${Date.now()}`;

      await page.goto('/');
      await page.getByRole('button', { name: /create (an )?account/i }).click();

      // Register first time
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password123');
      await page.getByPlaceholder('Alex Explorer').fill(name);
      await page.getByRole('button', { name: /create account/i }).click();

      // Wait for success
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out/i }).click();
      await page.getByRole('button', { name: 'Sign Out' }).last().click();

      // Try to register again with same email
      await page.getByRole('button', { name: /create (an )?account/i }).click();
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password456');
      await page.getByPlaceholder('Alex Explorer').fill(name);
      await page.getByRole('button', { name: /create account/i }).click();

      // Should show error
      await expect(page.getByText(/already in use|already exists/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Login', () => {
    test('should login with valid credentials', async ({ page }) => {
      const email = uniqueEmail();
      const name = `Test User ${Date.now()}`;

      // First register
      await page.goto('/');
      await page.getByRole('button', { name: /create (an )?account/i }).click();
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password123');
      await page.getByPlaceholder('Alex Explorer').fill(name);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });

      // Logout
      await page.getByRole('button', { name: /sign out/i }).click();
      await page.getByRole('button', { name: 'Sign Out' }).last().click();

      // Login
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password123');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Should be logged in
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/');

      await page.getByPlaceholder('name@company.com').fill('nonexistent@example.com');
      await page.getByPlaceholder('••••••••').fill('wrongpassword');
      await page.getByRole('button', { name: 'Sign In' }).click();

      // Should show error
      await expect(page.getByText(/invalid|incorrect/i)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Session Persistence', () => {
    test('should persist session after page reload', async ({ page }) => {
      const email = uniqueEmail();
      const name = `Test User ${Date.now()}`;

      // Register and login
      await page.goto('/');
      await page.getByRole('button', { name: /create (an )?account/i }).click();
      await page.getByPlaceholder('name@company.com').fill(email);
      await page.getByPlaceholder('••••••••').fill('password123');
      await page.getByPlaceholder('Alex Explorer').fill(name);
      await page.getByRole('button', { name: /create account/i }).click();
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });

      // Reload page
      await page.reload();

      // Should still be logged in
      await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
    });
  });
});
