import { test, expect, Page } from '@playwright/test';

const uniqueEmail = () => `test${Date.now()}@example.com`;

// Returns a datetime-local string for day 20 of the month the calendar is currently showing.
// Reads the heading from the browser so it always matches the displayed month — avoids
// Node.js / browser timezone mismatches where new Date() returns different months.
async function calendarMonthDate(page: Page, hour = 10): Promise<string> {
  const heading = await page.locator('h2').first().textContent() ?? '';
  const [monthName, yearStr] = heading.trim().split(' ');
  const MONTHS = ['January','February','March','April','May','June',
                  'July','August','September','October','November','December'];
  const month = String(MONTHS.indexOf(monthName) + 1).padStart(2, '0');
  const year = yearStr ?? String(new Date().getFullYear());
  return `${year}-${month}-20T${String(hour).padStart(2, '0')}:00`;
}

async function signUp(page: Page) {
  await page.goto('/');
  await page.getByRole('button', { name: /create (an )?account/i }).click();
  await page.getByPlaceholder('name@company.com').fill(uniqueEmail());
  await page.getByPlaceholder('••••••••').fill('password123');
  await page.getByPlaceholder('Alex Explorer').fill(`User ${Date.now()}`);
  await page.getByRole('button', { name: /create account/i }).click();
  await expect(page.getByRole('button', { name: 'New Opportunity' })).toBeVisible({ timeout: 10000 });
}

async function goToCalendar(page: Page) {
  await page.getByRole('button', { name: 'Calendar', exact: true }).first().click();
  await expect(page.getByRole('button', { name: 'Add Event' })).toBeVisible({ timeout: 5000 });
}

test.describe('Calendar', () => {
  test.beforeEach(async ({ page }) => {
    await signUp(page);
  });

  test.describe('Navigation', () => {
    test('should navigate to calendar and show the monthly grid', async ({ page }) => {
      await goToCalendar(page);

      // Heading should contain a month name and year
      await expect(page.locator('h2').first()).toHaveText(/\w+ \d{4}/);

      await expect(page.getByText('Sun')).toBeVisible();
      await expect(page.getByText('Mon')).toBeVisible();
      await expect(page.getByText('Sat')).toBeVisible();
      await expect(page.getByRole('button', { name: 'Today' })).toBeVisible();
    });

    test('should navigate to previous and next month', async ({ page }) => {
      await goToCalendar(page);

      const initialHeading = await page.locator('h2').first().textContent();

      // Go to next month
      await page.getByRole('button', { name: 'Next month' }).click();
      const nextHeading = await page.locator('h2').first().textContent();
      expect(nextHeading).not.toBe(initialHeading);

      // Return with Today
      await page.getByRole('button', { name: 'Today' }).click();
      await expect(page.locator('h2').first()).toHaveText(initialHeading!);
    });
  });

  test.describe('Create Event', () => {
    test('should create a recruiter call event', async ({ page }) => {
      await goToCalendar(page);
      await page.getByRole('button', { name: 'Add Event' }).click();

      await expect(page.getByText('New Event')).toBeVisible();
      await page.getByPlaceholder(/e\.g\. Call with|recruiter/i).fill('Hays Recruiter Call');
      await page.getByRole('button', { name: 'Recruiter Call' }).click();
      await page.locator('input[type="datetime-local"]').first().fill(await calendarMonthDate(page, 14));
      await page.getByRole('button', { name: /save event/i }).click();

      // Modal closing = save succeeded
      await expect(page.getByText('New Event')).not.toBeVisible({ timeout: 5000 });
      // Chip should now appear in the grid
      await expect(page.getByText('Hays Recruiter Call')).toBeVisible({ timeout: 5000 });
    });

    test('should create a networking event with notes', async ({ page }) => {
      await goToCalendar(page);
      await page.getByRole('button', { name: 'Add Event' }).click();

      await page.getByPlaceholder(/e\.g\. Call with|recruiter/i).fill('Coffee with Sarah');
      await page.getByRole('button', { name: 'Networking' }).click();
      await page.locator('input[type="datetime-local"]').first().fill(await calendarMonthDate(page, 11));
      await page.getByPlaceholder(/agenda|contact|prep/i).fill('Discuss open roles at her company');
      await page.getByRole('button', { name: /save event/i }).click();

      // Modal closing = save succeeded
      await expect(page.getByText('New Event')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Coffee with Sarah')).toBeVisible({ timeout: 5000 });
    });

    test('should require title and start date to enable Save', async ({ page }) => {
      await goToCalendar(page);
      await page.getByRole('button', { name: 'Add Event' }).click();

      await expect(page.getByRole('button', { name: /save event/i })).toBeDisabled();

      await page.getByPlaceholder(/e\.g\. Call with|recruiter/i).fill('My Event');
      await expect(page.getByRole('button', { name: /save event/i })).toBeDisabled();

      await page.locator('input[type="datetime-local"]').first().fill(await calendarMonthDate(page));
      await expect(page.getByRole('button', { name: /save event/i })).toBeEnabled();
    });
  });

  test.describe('Edit and Delete Event', () => {
    test.beforeEach(async ({ page }) => {
      await goToCalendar(page);
      await page.getByRole('button', { name: 'Add Event' }).click();
      await page.getByPlaceholder(/e\.g\. Call with|recruiter/i).fill('Editable Event');
      await page.locator('input[type="datetime-local"]').first().fill(await calendarMonthDate(page, 9));
      await page.getByRole('button', { name: /save event/i }).click();
      // Wait for modal to close then chip to appear
      await expect(page.getByText('New Event')).not.toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Editable Event')).toBeVisible({ timeout: 5000 });
    });

    test('should edit an event title', async ({ page }) => {
      await page.getByText('Editable Event').click();
      await page.getByPlaceholder(/e\.g\. Call with|recruiter/i).fill('Renamed Event');
      await page.getByRole('button', { name: /save event/i }).click();

      await expect(page.getByText('Renamed Event')).toBeVisible({ timeout: 5000 });
      await expect(page.getByText('Editable Event')).not.toBeVisible();
    });

    test('should delete an event', async ({ page }) => {
      await page.getByText('Editable Event').click();
      await page.getByRole('button', { name: 'Delete event' }).click();

      await expect(page.getByText('Editable Event')).not.toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Day Detail Panel', () => {
    test('should open the day detail panel when clicking a day cell', async ({ page }) => {
      await goToCalendar(page);

      // Click on day 15
      await page.getByText('15', { exact: true }).first().click();

      // Detail panel should appear with an Add button
      await expect(page.getByRole('button', { name: /^Add$/i })).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe('Job interview on calendar', () => {
    test('should show interview chip for an application with an interview date', async ({ page }) => {
      // First go to calendar to find out the current displayed month
      await goToCalendar(page);
      const interviewDate = await calendarMonthDate(page, 14);

      // Create an application with an interview date in the displayed month
      await page.getByRole('button', { name: 'New Opportunity' }).click();
      await page.getByPlaceholder('Acme Corp').fill('Calendar Corp');
      await page.getByPlaceholder('Senior Engineer').fill('Dev');
      await page.locator('input[type="datetime-local"]').fill(interviewDate);
      await page.getByRole('button', { name: /save/i }).click();
      await expect(page.getByText('Application Added')).toBeVisible({ timeout: 5000 });

      // Navigate back to calendar — interview chip should appear
      await goToCalendar(page);
      await expect(page.getByRole('button', { name: /Calendar Corp.*Interview/i })).toBeVisible({ timeout: 5000 });
    });
  });
});
