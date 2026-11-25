import { test, expect, Page, Route } from '@playwright/test';

// Exercise the real React app with controlled API failures and response ordering.
// These tests do not create accounts or modify the development database.
async function mockSessionApi(page: Page, delayFirstAccount = false) {
  let releaseFirst!: () => void;
  const delayed = new Promise<void>(resolve => { releaseFirst = resolve; });
  const pending = new Set<string>();
  const completed = new Set<string>();
  const requests: { path: string; body: any; authorization: string | undefined }[] = [];
  const now = new Date();
  const pastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const user = (account: string) => ({
    id: account, name: `User ${account.toUpperCase()}`, email: `${account}@example.test`, role: 'owner',
  });
  const session = (account: string) => ({
    token: `account-${account}`, user: user(account), tenantId: `workspace-${account}`, role: 'owner',
  });

  const handle = async (route: Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    const authorization = request.headers().authorization;
    const body = request.postData() ? request.postDataJSON() : undefined;
    requests.push({ path, body, authorization });
    if (path === '/auth/google/status') return route.fulfill({ json: { configured: true } });
    if (path === '/auth/login') return route.fulfill({ json: session(body.email.startsWith('b@') ? 'b' : 'a') });
    if (path === '/auth/me') return route.fulfill({ json: session(authorization === 'Bearer account-b' ? 'b' : 'a') });
    if (path === '/auth/reset-password') return route.fulfill({ json: { message: 'Password reset successfully.' } });
    if (path === '/api/notifications/config') return route.fulfill({ json: {
      configured: false, publicKey: null, preferences: { followUps: true, interviews: true, jobsAdded: true, jobsUpdated: true }, endpoints: [],
    } });

    // Simulate a partial outage for the second user, leaving applications usable.
    if (authorization === 'Bearer account-b') {
      if (path.endsWith('/applications')) return route.fulfill({ json: [] });
      return route.fulfill({ status: 503, json: { error: 'Temporarily unavailable' } });
    }

    const shouldDelay = delayFirstAccount && !path.endsWith('/applications');
    if (shouldDelay) {
      pending.add(path);
      await delayed;
    }
    let payload: unknown = [];
    if (path.endsWith('/applications')) payload = [{
      id: 'private-application', company: 'Private company', role: 'Engineer', status: 'APPLIED',
      dateApplied: now.toISOString(), description: '', location: '', createdByUserId: 'a',
    }];
    if (path === '/api/goals/current') payload = {
      id: 'private-goal', userId: 'a', month: now.getMonth() + 1, year: now.getFullYear(), target: 73, met: false,
    };
    if (path === '/api/goals/history') payload = [{
      id: 'private-history', userId: 'a', month: pastMonth.getMonth() + 1,
      year: pastMonth.getFullYear(), target: 81, met: true,
    }];
    if (path === '/api/settings') payload = {
      applicationGoal: 73, jobSources: [{ value: 'private-board', label: 'Private board' }],
      recruitingServices: ['Private recruiter'], interviewTypes: [{ value: 'private-type', label: 'Private type' }],
    };
    if (path.endsWith('/events')) payload = [{
      id: 'private-event', tenantId: 'workspace-a', createdByUserId: 'a',
      title: 'Private recruiter call', startAt: now.toISOString(), type: 'RECRUITER_CALL',
    }];
    if (path.endsWith('/unread-count')) payload = { count: 9 };
    await route.fulfill({ json: payload });
    if (shouldDelay) completed.add(path);
  };
  await page.route('**/auth/**', handle);
  await page.route('**/api/**', handle);
  return { releaseFirst, pending, completed, requests };
}

async function login(page: Page, account: string) {
  await page.getByPlaceholder('name@company.com').fill(`${account}@example.test`);
  await page.getByPlaceholder('••••••••').fill('synthetic-password');
  await page.getByRole('button', { name: 'Sign In', exact: true }).click();
  await expect(page.getByRole('button', { name: 'New Opportunity', exact: true })).toBeVisible();
}

async function logout(page: Page) {
  await page.locator('aside').getByRole('button', { name: 'Sign Out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
}

async function expectFreshAccount(page: Page) {
  await expect(page.getByText('0 / 25', { exact: true })).toBeVisible();
  await expect(page.getByText('Private company', { exact: true })).toHaveCount(0);
  await expect(page.locator('aside').getByRole('button', { name: 'Messages', exact: true })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Private board', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Private recruiter', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Private type', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Goal History', { exact: true })).toHaveCount(0);
  await page.locator('aside').getByRole('button', { name: 'Calendar', exact: true }).click();
  await expect(page.getByText('Private recruiter call', { exact: true })).toHaveCount(0);
}

test('OAuth callback restores the session instead of opening password reset', async ({ page }) => {
  const api = await mockSessionApi(page);
  await page.goto('/?token=account-a&tenantId=workspace-a&keep=yes#dashboard');
  await expect(page.getByText('1 / 73', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Reset Password', exact: true })).toHaveCount(0);
  await expect(page).toHaveURL('/?keep=yes#dashboard');
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBe('account-a');
  expect(api.requests.filter(r => r.path === '/auth/me').every(r => r.authorization === 'Bearer account-a')).toBe(true);
});

test('password-reset links preserve their token without restoring a stored session', async ({ page }) => {
  const api = await mockSessionApi(page);
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'existing-session');
    localStorage.setItem('tenant_id', 'existing-workspace');
  });
  await page.goto('/reset-password?token=reset-only&keep=yes');
  await expect(page.getByRole('button', { name: 'Reset Password', exact: true })).toBeVisible();
  await expect(page).toHaveURL('/reset-password?keep=yes');
  await page.getByPlaceholder('••••••••').fill('synthetic-new-password');
  await page.getByRole('button', { name: 'Reset Password', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect(api.requests.find(r => r.path === '/auth/reset-password')?.body.token).toBe('reset-only');
  expect(api.requests.some(r => r.path === '/auth/me')).toBe(false);
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBe('existing-session');
});

test('invite links open signup after URL cleanup', async ({ page }) => {
  await mockSessionApi(page);
  await page.goto('/?invite=signup-invite');
  await expect(page.getByRole('button', { name: 'Create Account', exact: true })).toBeVisible();
  await expect(page.getByPlaceholder('Alex Explorer')).toBeVisible();
  await expect(page).toHaveURL('/');
});

test('logout clears loaded account data even when the next account fails to load', async ({ page }) => {
  await mockSessionApi(page);
  await page.goto('/');
  await login(page, 'a');
  await expect(page.getByText('1 / 73', { exact: true })).toBeVisible();
  await expect(page.locator('aside').getByRole('button', { name: 'Messages 9', exact: true })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByText('Private board', { exact: true })).toBeVisible();
  await logout(page);
  await login(page, 'b');
  await expectFreshAccount(page);
});

test('responses from the signed-out account cannot populate the next session', async ({ page }) => {
  const api = await mockSessionApi(page, true);
  await page.goto('/');
  await login(page, 'a');
  await expect.poll(() => api.pending.size).toBe(5);
  await logout(page);
  await login(page, 'b');
  await expect(page.getByText('0 / 25', { exact: true })).toBeVisible();
  api.releaseFirst();
  await expect.poll(() => api.completed.size).toBe(5);
  await expectFreshAccount(page);
});

test('late saves cannot show the previous account data or notifications', async ({ page }) => {
  await mockSessionApi(page);
  let releaseSave!: () => void;
  const delayedSave = new Promise<void>(resolve => { releaseSave = resolve; });
  let savePending = false;
  let saveCompleted = false;
  await page.route('**/api/tenants/workspace-a/applications', async route => {
    if (route.request().method() !== 'POST') return route.fallback();
    savePending = true;
    await delayedSave;
    await route.fulfill({ status: 201, json: {
      ...route.request().postDataJSON(), id: 'late-save', createdByUserId: 'a',
    } });
    saveCompleted = true;
  });
  await page.goto('/');
  await login(page, 'a');
  await expect(page.getByText('1 / 73', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'New Opportunity', exact: true }).click();
  await page.getByPlaceholder('Acme Corp').fill('Confidential company');
  await page.getByPlaceholder('Senior Engineer').fill('Confidential role');
  await page.getByRole('button', { name: 'Save Details', exact: true }).click();
  await expect.poll(() => savePending).toBe(true);
  await page.getByRole('heading', { name: 'Track New Opportunity', exact: true })
    .locator('..').getByRole('button').click();
  await logout(page);
  await login(page, 'b');
  await expect(page.getByText('0 / 25', { exact: true })).toBeVisible();
  releaseSave();
  await expect.poll(() => saveCompleted).toBe(true);
  await expect(page.getByText('Application Added', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Confidential company', { exact: true })).toHaveCount(0);
});
