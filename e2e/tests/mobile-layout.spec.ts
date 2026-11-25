import { test, expect, Page } from '@playwright/test';

// Layout and navigation checks use synthetic data and never touch the Pi or its database.
async function openSession(page: Page) {
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mobile-test');
    localStorage.setItem('tenant_id', 'mobile-workspace');
  });
  const applications = [{
    id: 'mobile-job', company: 'Example Company', role: 'Software Engineer', status: 'APPLIED',
    dateApplied: new Date().toISOString().slice(0, 10), description: '', location: 'Remote', createdByUserId: 'mobile-user',
  }];
  const handle = async (route: import('@playwright/test').Route) => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/auth/me') return route.fulfill({ json: {
      user: { id: 'mobile-user', name: 'Example User', email: 'mobile@example.test' }, tenantId: 'mobile-workspace', role: 'owner',
    } });
    if (path.endsWith('/applications')) {
      if (route.request().method() === 'POST') {
        const job = { ...route.request().postDataJSON(), id: 'new-job', createdByUserId: 'mobile-user' };
        applications.push(job);
        return route.fulfill({ status: 201, json: job });
      }
      return route.fulfill({ json: applications });
    }
    if (path.endsWith('/unread-count')) return route.fulfill({ json: { count: 3 } });
    if (path === '/api/goals/current') return route.fulfill({ json: { target: 25 } });
    if (path === '/api/settings') return route.fulfill({ json: {
      applicationGoal: 25, jobSources: null, recruitingServices: null, interviewTypes: null,
    } });
    if (path === '/api/notifications/config') return route.fulfill({ json: {
      configured: false, publicKey: null, preferences: { followUps: true, interviews: true, jobsAdded: true, jobsUpdated: true }, endpoints: [],
    } });
    return route.fulfill({ json: [] });
  };
  await page.route('**/api/**', handle);
  await page.route('**/auth/**', handle);
  await page.goto('/');
  await expect(page.getByText('1 / 25', { exact: true })).toBeVisible();
}

async function expectNoHorizontalOverflow(page: Page) {
  const widths = await page.locator('main').evaluate(element => ({
    available: element.clientWidth, content: element.scrollWidth,
    page: document.documentElement.scrollWidth, viewport: window.innerWidth,
  }));
  expect(widths.content).toBeLessThanOrEqual(widths.available + 1);
  expect(widths.page).toBeLessThanOrEqual(widths.viewport + 1);
}

for (const width of [320, 390, 768]) {
  test(`mobile navigation and pages fit a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openSession(page);
    const nav = page.getByRole('navigation', { name: 'Mobile navigation', exact: true });
    await expect(nav).toBeVisible();
    await expect(nav.getByRole('button')).toHaveCount(5);
    await expect(page.getByRole('button', { name: 'Open menu', exact: true })).toHaveCount(0);
    await expect(page.getByRole('navigation', { name: 'Desktop navigation', exact: true })).toBeHidden();
    const bounds = await nav.getByRole('button').evaluateAll(buttons => buttons.map(button => {
      const rect = button.getBoundingClientRect();
      return { left: rect.left, right: rect.right, width: rect.width, height: rect.height };
    }));
    for (const button of bounds) {
      expect(button.left).toBeGreaterThanOrEqual(0);
      expect(button.right).toBeLessThanOrEqual(width);
      expect(button.width).toBeGreaterThanOrEqual(44);
      expect(button.height).toBeGreaterThanOrEqual(44);
    }
    await expectNoHorizontalOverflow(page);
    if (width === 390) await page.screenshot({ path: '/private/tmp/jobjourney-mobile-home.png' });
    for (const name of ['Applications', 'Calendar', 'Messages']) {
      await nav.getByRole('button', { name, exact: true }).click();
      await expect(page.locator('header h1')).toHaveText(name, { ignoreCase: true });
      await expectNoHorizontalOverflow(page);
    }
    for (const name of ['Analytics', 'Settings']) {
      await nav.getByRole('button', { name: 'More', exact: true }).click();
      const more = page.getByRole('dialog', { name: 'More', exact: true });
      await expect(more).toBeVisible();
      if (width === 390 && name === 'Analytics') await page.screenshot({ path: '/private/tmp/jobjourney-mobile-more.png' });
      await more.getByRole('button', { name, exact: true }).click();
      await expect(more).not.toBeVisible();
      await expect(page.locator('header h1')).toHaveText(name, { ignoreCase: true });
      await expectNoHorizontalOverflow(page);
    }
  });
}

test('More preserves appearance and sign-out actions and dismisses with Escape', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSession(page);
  const trigger = page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'More', exact: true });
  await trigger.click();
  const more = page.getByRole('dialog', { name: 'More', exact: true });
  const wasDark = await page.locator('html').evaluate(element => element.classList.contains('dark'));
  await more.getByRole('button', { name: wasDark ? 'Switch to light theme' : 'Switch to dark theme', exact: true }).click();
  await expect.poll(() => page.locator('html').evaluate(element => element.classList.contains('dark'))).toBe(!wasDark);
  await page.keyboard.press('Escape');
  await expect(more).not.toBeVisible();
  await expect(trigger).toBeFocused();
  await trigger.click();
  await more.getByRole('button', { name: 'Sign Out', exact: true }).click();
  await expect(more).not.toBeVisible();
  await expect(page.getByText("Are you sure you want to sign out? You'll need to log in again to access your applications.", { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Stay', exact: true }).click();
  await expect(page.locator('header h1')).toHaveText('dashboard');
});

test('application form fits a small phone and keeps inputs readable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openSession(page);
  await page.getByRole('button', { name: 'Add application', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Track New Opportunity', exact: true })).toBeVisible();
  const form = page.getByRole('dialog', { name: 'Track New Opportunity', exact: true });
  await form.getByRole('button', { name: 'Add round', exact: true }).click();
  await form.locator('input[type="datetime-local"]').fill('2026-12-01T10:00');
  const fields = await form.locator('input, select, textarea').evaluateAll(elements => elements
    .filter(element => !['checkbox', 'radio', 'file'].includes((element as HTMLInputElement).type))
    .map(element => ({ size: parseFloat(getComputedStyle(element).fontSize), left: element.getBoundingClientRect().left, right: element.getBoundingClientRect().right })));
  for (const field of fields) {
    expect(field.size).toBeGreaterThanOrEqual(16);
    expect(field.left).toBeGreaterThanOrEqual(0);
    expect(field.right).toBeLessThanOrEqual(320);
  }
  await page.getByPlaceholder('Acme Corp').fill('Mobile Company');
  await page.getByPlaceholder('Senior Engineer').fill('Mobile Engineer');
  const actions = await form.getByRole('button', { name: 'Save Details', exact: true }).evaluate(button => ({
    right: button.getBoundingClientRect().right, left: button.getBoundingClientRect().left,
  }));
  expect(actions.left).toBeGreaterThanOrEqual(0);
  expect(actions.right).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Save Details', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Track New Opportunity', exact: true })).not.toBeVisible();
  await expect(page.getByText('Mobile Company', { exact: true })).toBeVisible();
});

test('calendar event form fits the phone width', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 740 });
  await openSession(page);
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'Calendar', exact: true }).click();
  await page.getByRole('button', { name: 'Add Event', exact: true }).click();
  const form = page.getByRole('dialog', { name: 'New Event', exact: true });
  await expect(form).toBeVisible();
  const bounds = await form.locator('input, select, textarea').evaluateAll(fields => fields.map(field => ({
    left: field.getBoundingClientRect().left, right: field.getBoundingClientRect().right,
    size: parseFloat(getComputedStyle(field).fontSize),
  })));
  for (const field of bounds) {
    expect(field.left).toBeGreaterThanOrEqual(0);
    expect(field.right).toBeLessThanOrEqual(320);
    expect(field.size).toBeGreaterThanOrEqual(16);
  }
  await form.getByRole('button', { name: 'Close event form', exact: true }).click();
  await expect(form).not.toBeVisible();
});

test('changing to desktop closes the mobile dialog and restores sidebar navigation', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openSession(page);
  await page.getByRole('navigation', { name: 'Mobile navigation' }).getByRole('button', { name: 'More', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'More', exact: true })).toBeVisible();
  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(page.locator('#mobile-more-menu')).not.toHaveAttribute('open', '');
  await expect(page.getByRole('navigation', { name: 'Mobile navigation' })).toBeHidden();
  const desktop = page.getByRole('navigation', { name: 'Desktop navigation' });
  await expect(desktop).toBeVisible();
  await desktop.getByRole('button', { name: 'Applications', exact: true }).click();
  await expect(page.locator('header h1')).toHaveText('applications');
  await expectNoHorizontalOverflow(page);
});
