import { test, expect, Page } from '@playwright/test';
import { createECDH } from 'crypto';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import { runInNewContext } from 'vm';

const publicKey = createECDH('prime256v1').generateKeys().toString('base64url');
const endpoint = 'https://web.push.apple.com/test-device';

async function setup(page: Page, options: { enabled?: boolean; denied?: boolean; configured?: boolean; failRemoval?: boolean } = {}) {
  const state = {
    configured: options.configured ?? true, publicKey,
    preferences: { followUps: true, interviews: true, jobsAdded: true, jobsUpdated: true }, endpoints: options.enabled ? [endpoint] : [],
    tested: false, removedWithAuth: false,
  };
  await page.addInitScript(({ endpoint, publicKey, enabled, denied }) => {
    localStorage.setItem('auth_token', 'test-token');
    localStorage.setItem('tenant_id', 'test-workspace');
    let permission = denied ? 'denied' : enabled ? 'granted' : 'default';
    Object.defineProperty(Notification, 'permission', { get: () => permission });
    Notification.requestPermission = async () => { permission = 'granted'; return 'granted'; };
    const decoded = atob(publicKey.replace(/-/g, '+').replace(/_/g, '/'));
    const key = Uint8Array.from(decoded, char => char.charCodeAt(0));
    const device = {
      endpoint, options: { applicationServerKey: key.buffer },
      toJSON: () => ({ endpoint, keys: { p256dh: publicKey, auth: 'synthetic-auth' } }),
      unsubscribe: async () => { subscription = null; return true; },
    };
    let subscription: typeof device | null = enabled ? device : null;
    const registration = { pushManager: {
      getSubscription: async () => subscription,
      subscribe: async () => { subscription = device; return device; },
    } };
    Object.defineProperty(navigator, 'serviceWorker', { value: {
      getRegistration: async () => registration,
      register: async () => registration,
      ready: Promise.resolve(registration),
    } });
  }, { endpoint, publicKey, enabled: !!options.enabled, denied: !!options.denied });

  const handle = async (route: import('@playwright/test').Route) => {
    const path = new URL(route.request().url()).pathname;
    const method = route.request().method();
    if (path === '/auth/me') return route.fulfill({ json: { user: { id: 'test-user', name: 'Test User', email: 'test@example.com' }, tenantId: 'test-workspace', role: 'owner' } });
    if (path === '/api/notifications/config') return route.fulfill({ json: state });
    if (path === '/api/notifications/preferences') {
      state.preferences = route.request().postDataJSON();
      return route.fulfill({ json: state.preferences });
    }
    if (path === '/api/notifications/subscriptions') {
      if (method === 'POST') {
        expect(route.request().postDataJSON().endpoint).toBe(endpoint);
        state.endpoints = [endpoint];
        return route.fulfill({ status: 201, json: { success: true } });
      }
      state.removedWithAuth = route.request().headers().authorization === 'Bearer test-token';
      if (options.failRemoval) return route.fulfill({ status: 503, json: { error: 'Unavailable' } });
      state.endpoints = [];
      return route.fulfill({ status: 204 });
    }
    if (path === '/api/notifications/test') {
      expect(route.request().postDataJSON().endpoint).toBe(endpoint);
      state.tested = true;
      return route.fulfill({ json: { success: true } });
    }
    if (path.endsWith('/unread-count')) return route.fulfill({ json: { count: 0 } });
    if (path === '/api/goals/current') return route.fulfill({ json: { target: 25 } });
    if (path === '/api/settings') return route.fulfill({ json: { applicationGoal: 25, jobSources: null, recruitingServices: null, interviewTypes: null } });
    return route.fulfill({ json: [] });
  };
  await page.route('**/api/**', handle);
  await page.route('**/auth/**', handle);
  await page.goto('/');
  await expect(page.getByText('0 / 25', { exact: true })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
  return state;
}

test('enables a device, sends a test, persists preferences and disables the device', async ({ page }) => {
  const state = await setup(page);
  await page.getByRole('button', { name: 'Enable on this device', exact: true }).click();
  await expect(page.getByText('Notifications are enabled on this device.', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Send test notification', exact: true }).click();
  await expect(page.getByText('Test sent', { exact: true })).toBeVisible();
  expect(state.tested).toBe(true);
  await page.getByRole('switch', { name: 'Application follow-ups', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Application follow-ups', exact: true })).toHaveAttribute('aria-checked', 'false');
  await page.locator('aside').getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Application follow-ups', exact: true })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('button', { name: 'Disable on this device', exact: true }).click();
  await expect(page.getByText('Notifications are off on this device.', { exact: true })).toBeVisible();
  expect(state.endpoints).toEqual([]);
});

test('removes this device before clearing credentials on logout', async ({ page }) => {
  const state = await setup(page, { enabled: true });
  await expect(page.getByRole('button', { name: 'Disable on this device', exact: true })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Sign Out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect(state.removedWithAuth).toBe(true);
  expect(state.endpoints).toEqual([]);
  expect(await page.evaluate(() => localStorage.getItem('auth_token'))).toBeNull();
});

test('saves shared-workspace job alert preferences independently from reminders', async ({ page }) => {
  const state = await setup(page, { enabled: true });
  await expect(page.getByText('Job-added and job-updated alerts cover your shared workspaces.', { exact: false })).toBeVisible();
  await page.getByRole('switch', { name: 'Jobs added', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Jobs added', exact: true })).toHaveAttribute('aria-checked', 'false');
  await page.getByRole('switch', { name: 'Jobs updated', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Jobs updated', exact: true })).toHaveAttribute('aria-checked', 'false');
  expect(state.preferences).toEqual({ followUps: true, interviews: true, jobsAdded: false, jobsUpdated: false });
  await page.locator('aside').getByRole('button', { name: 'Dashboard', exact: true }).click();
  await page.locator('aside').getByRole('button', { name: 'Settings', exact: true }).click();
  await expect(page.getByRole('switch', { name: 'Jobs added', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Jobs updated', exact: true })).toHaveAttribute('aria-checked', 'false');
  await expect(page.getByRole('switch', { name: 'Application follow-ups', exact: true })).toHaveAttribute('aria-checked', 'true');
});

test('can sign out during an outage when browser unsubscription succeeds', async ({ page }) => {
  const state = await setup(page, { enabled: true, failRemoval: true });
  await expect(page.getByRole('button', { name: 'Disable on this device', exact: true })).toBeVisible();
  await page.locator('aside').getByRole('button', { name: 'Sign Out', exact: true }).click();
  await page.getByRole('button', { name: 'Sign Out', exact: true }).last().click();
  await expect(page.getByRole('button', { name: 'Sign In', exact: true })).toBeVisible();
  expect(state.removedWithAuth).toBe(true);
});

test('explains missing server configuration and blocked permission', async ({ page }) => {
  await setup(page, { configured: false, denied: true });
  await expect(page.getByText('Web push is not set up on your JobJourney server yet.', { exact: true })).toBeVisible();
  await expect(page.getByText('Notifications are blocked.', { exact: false })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Enable on this device', exact: true })).toBeDisabled();
  await expect(page.getByRole('switch', { name: 'Email reminders', exact: true })).toHaveCount(0);
});

test('explains the iPhone Home Screen requirement', async ({ browser }) => {
  const context = await browser.newContext({ baseURL: 'http://localhost:3000', userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Version/18.0 Mobile/15E148 Safari/604.1' });
  const page = await context.newPage();
  try {
    await setup(page);
    await expect(page.getByText('On iPhone, use Safari’s Share', { exact: false })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Enable on this device', exact: true })).toBeDisabled();
  } finally { await context.close(); }
});

test('ships an installable manifest, phone icons and service worker', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest');
  expect(manifest.ok()).toBe(true);
  expect((await manifest.json()).display).toBe('standalone');
  const icon = await request.get('/icons/apple-touch-icon.png');
  expect((await icon.body()).subarray(1, 4).toString()).toBe('PNG');
  const worker = await request.get('/sw.js');
  expect(worker.ok()).toBe(true);
  expect(await worker.text()).toContain("addEventListener('push'");
});

test('service worker displays pushes and restricts click destinations to JobJourney', async () => {
  const handlers: Record<string, (event: any) => void> = {};
  const displayed: { title: string; options: any }[] = [];
  const opened: string[] = [];
  runInNewContext(readFileSync(resolve(__dirname, '../../jobjourney/public/sw.js'), 'utf8'), {
    URL,
    self: {
      addEventListener: (type: string, handler: (event: any) => void) => { handlers[type] = handler; },
      location: { origin: 'https://pi-server.local' },
      registration: { showNotification: async (title: string, options: unknown) => { displayed.push({ title, options }); } },
      clients: { matchAll: async () => [], openWindow: async (url: string) => { opened.push(url); } },
    },
  });
  let finished: Promise<unknown> = Promise.resolve();
  handlers.push({ data: { json: () => ({ title: 'Interview', body: 'Tomorrow', url: '/?view=calendar' }) }, waitUntil: (promise: Promise<unknown>) => { finished = promise; } });
  await finished;
  expect(displayed[0].title).toBe('Interview');
  expect(displayed[0].options.body).toBe('Tomorrow');
  handlers.notificationclick({ notification: { close() {}, data: { url: '/?view=calendar' } }, waitUntil: (promise: Promise<unknown>) => { finished = promise; } });
  await finished;
  handlers.notificationclick({ notification: { close() {}, data: { url: 'https://untrusted.example/' } }, waitUntil: (promise: Promise<unknown>) => { finished = promise; } });
  await finished;
  expect(opened).toEqual(['https://pi-server.local/?view=calendar', 'https://pi-server.local/']);
  handlers.push({ data: { json: () => { throw Error('Invalid JSON'); } }, waitUntil: (promise: Promise<unknown>) => { finished = promise; } });
  await finished;
  expect(displayed[1].title).toBe('JobJourney');
  handlers.push({ data: { json: () => null }, waitUntil: (promise: Promise<unknown>) => { finished = promise; } });
  await finished;
  expect(displayed[2].title).toBe('JobJourney');
});
