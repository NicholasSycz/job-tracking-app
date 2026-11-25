import { test, expect, Page } from '@playwright/test';

async function openApplications(page: Page, role = 'owner') {
  const applications = [
    { id: 'acme', company: 'Acme Studio', role: 'Software Engineer', status: 'APPLIED', dateApplied: '2026-11-22', location: 'Tokyo', salary: '$120k – $150k', link: 'https://example.com/jobs/engineer', reminderEnabled: true, followUpDate: '2026-11-24T09:00:00Z', description: 'Build helpful software with a small team.', createdByUserId: 'mobile-user' },
    { id: 'northstar', company: 'Northstar', role: 'Senior Product Designer', status: 'INTERVIEWING', dateApplied: '2026-11-24', location: 'Remote', description: 'Design the next generation of products.', createdByUserId: 'mobile-user' },
    { id: 'orbit', company: 'Orbit Labs', role: 'Frontend Developer', status: 'OFFER', dateApplied: '2026-11-23', location: 'Osaka', description: '', createdByUserId: 'mobile-user' },
    { id: 'shared', company: 'Shared Workspace Company With A Longer Name', role: 'Senior Engineer for International Product Development', status: 'INTERESTED', dateApplied: '2026-11-21', location: 'Tokyo / Hybrid', description: '', createdByUserId: 'another-user' },
  ];
  const bulkRequests: { ids: string[]; status: string }[] = [];
  await page.addInitScript(() => {
    localStorage.setItem('auth_token', 'mobile-applications-test');
    localStorage.setItem('tenant_id', 'mobile-workspace');
  });
  const handle = async (route: import('@playwright/test').Route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/auth/me') return route.fulfill({ json: {
      user: { id: 'mobile-user', name: 'Example User', email: 'mobile@example.test' }, tenantId: 'mobile-workspace', role,
    } });
    if (path.endsWith('/applications/bulk') && request.method() === 'PATCH') {
      const body = request.postDataJSON();
      bulkRequests.push(body);
      applications.forEach(application => { if (body.ids.includes(application.id)) application.status = body.status; });
      return route.fulfill({ json: { updated: body.ids.length } });
    }
    if (path.endsWith('/applications')) return route.fulfill({ json: applications });
    if (path.includes('/applications/') && request.method() === 'DELETE') {
      const index = applications.findIndex(application => application.id === path.split('/').pop());
      applications.splice(index, 1);
      return route.fulfill({ status: 204 });
    }
    if (path.endsWith('/unread-count')) return route.fulfill({ json: { count: 0 } });
    if (path === '/api/goals/current') return route.fulfill({ json: { target: 25 } });
    if (path === '/api/settings') return route.fulfill({ json: { applicationGoal: 25, jobSources: null, recruitingServices: null, interviewTypes: null } });
    return route.fulfill({ json: [] });
  };
  await page.route('**/api/**', handle);
  await page.route('**/auth/**', handle);
  await page.goto('/?view=applications');
  await expect(page.getByRole('article')).toHaveCount(4);
  return { applications, bulkRequests };
}

async function expectNoOverflow(page: Page) {
  const sizes = await page.locator('main').evaluate(main => ({ width: main.clientWidth, content: main.scrollWidth }));
  expect(sizes.content).toBeLessThanOrEqual(sizes.width + 1);
}

for (const width of [320, 390]) {
  test(`application rows and touch controls fit a ${width}px phone`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await openApplications(page);
    await expectNoOverflow(page);
    const first = page.getByRole('article', { name: 'Senior Product Designer at Northstar', exact: true });
    const height = await first.evaluate(card => card.getBoundingClientRect().height);
    expect(height).toBeLessThan(210);
    const actions = first.getByRole('button', { name: 'Application actions', exact: true });
    const box = await actions.boundingBox();
    expect(box?.width).toBeGreaterThanOrEqual(44);
    expect(box?.height).toBeGreaterThanOrEqual(44);
    await expect(page.getByText('No description provided.', { exact: true }).filter({ visible: true })).toHaveCount(0);
    if (width === 390) await page.screenshot({ path: '/private/tmp/jobjourney-mobile-applications.png' });
    await actions.click();
    const menu = page.getByRole('menu', { name: 'Application actions', exact: true });
    await expect(menu.getByRole('menuitem', { name: 'Edit application', exact: true })).toBeVisible();
    await expectNoOverflow(page);
    await page.keyboard.press('Escape');
    await expect(menu).not.toBeVisible();
  });
}

test('mobile filters, search and persisted sorting control the visible applications', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApplications(page);
  const filters = page.getByRole('group', { name: 'Filter applications by status' });
  await filters.getByRole('button', { name: 'APPLIED', exact: true }).click();
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAccessibleName('Software Engineer at Acme Studio');
  await filters.getByRole('button', { name: 'All', exact: true }).click();
  await page.getByRole('button', { name: 'Sort applications', exact: true }).click();
  await page.getByRole('menuitemradio', { name: 'Company (A-Z)', exact: true }).click();
  await expect(page.getByRole('article').first()).toHaveAccessibleName('Software Engineer at Acme Studio');
  await page.reload();
  await expect(page.getByRole('article').first()).toHaveAccessibleName('Software Engineer at Acme Studio');
  await page.getByRole('textbox', { name: 'Search applications' }).fill('Orbit');
  await expect(page.getByRole('article')).toHaveCount(1);
  await expect(page.getByRole('article')).toHaveAccessibleName('Frontend Developer at Orbit Labs');
});

test('mobile card actions open editing and preserve posting links and deletion', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApplications(page);
  const card = page.getByRole('article', { name: 'Software Engineer at Acme Studio', exact: true });
  await card.getByRole('button', { name: 'Edit Software Engineer at Acme Studio', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'Refine Application', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Close application form', exact: true }).click();
  await card.getByRole('button', { name: 'Application actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Application actions', exact: true });
  await expect(menu.getByRole('menuitem', { name: 'View job posting', exact: true })).toHaveAttribute('href', 'https://example.com/jobs/engineer');
  await menu.getByRole('menuitem', { name: 'Delete application', exact: true }).click();
  await expect(card).not.toBeVisible();
  await expect(page.getByRole('article')).toHaveCount(3);
});

test('bulk actions stay above the bottom navigation and update only selected applications', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  const state = await openApplications(page);
  await page.getByRole('button', { name: 'Select applications', exact: true }).click();
  await page.getByRole('article', { name: 'Software Engineer at Acme Studio', exact: true }).getByRole('button', { name: 'Select application', exact: true }).click();
  await page.getByRole('article', { name: 'Senior Product Designer at Northstar', exact: true }).getByRole('button', { name: 'Select application', exact: true }).click();
  const bar = page.locator('[aria-label="Selected application actions"]');
  await expect(bar).toBeVisible();
  const bounds = await bar.boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Mobile navigation' }).boundingBox();
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(nav!.y);
  await bar.getByRole('button', { name: 'Change Status', exact: true }).click();
  await bar.getByRole('button', { name: 'REJECTED', exact: true }).click();
  await expect(bar).not.toBeVisible();
  expect(state.bulkRequests).toEqual([{ ids: ['acme', 'northstar'], status: 'REJECTED' }]);
  expect(state.applications.find(application => application.id === 'orbit')?.status).toBe('OFFER');
});

test('mobile list actions keep import and export accessible', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 844 });
  await openApplications(page);
  await page.getByRole('button', { name: 'Application list actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Application list actions', exact: true });
  const download = page.waitForEvent('download');
  await menu.getByRole('menuitem', { name: 'Export as JSON', exact: true }).click();
  expect((await download).suggestedFilename()).toBe('applications.json');
  await page.getByRole('button', { name: 'Application list actions', exact: true }).click();
  await menu.getByRole('menuitem', { name: 'Import applications', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bulk Import Applications', exact: true })).toBeVisible();
});

test('shared applications keep their edit permissions on mobile', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await openApplications(page, 'member');
  const card = page.getByRole('article', { name: 'Senior Engineer for International Product Development at Shared Workspace Company With A Longer Name', exact: true });
  await card.getByRole('button', { name: 'Application actions', exact: true }).click();
  const menu = page.getByRole('menu', { name: 'Application actions', exact: true });
  await expect(menu.getByRole('menuitem', { name: 'Edit application', exact: true })).toBeDisabled();
  await expect(menu.getByRole('menuitem', { name: 'Delete application', exact: true })).toBeDisabled();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Select applications', exact: true }).click();
  await card.getByRole('button', { name: 'Select application', exact: true }).click();
  const bar = page.locator('[aria-label="Selected application actions"]');
  await expect(bar.getByRole('button', { name: 'Change Status', exact: true })).toBeDisabled();
  await expect(bar.getByRole('status')).toContainText('You can only modify applications you created.');
});
