self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));

self.addEventListener('push', event => {
  let message = {};
  try {
    const payload = event.data?.json();
    if (payload && typeof payload === 'object' && !Array.isArray(payload)) message = payload;
  } catch { /* Always show a visible notification, even for an invalid payload. */ }
  event.waitUntil(self.registration.showNotification(message.title || 'JobJourney', {
    body: message.body || 'You have a new JobJourney reminder.',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    tag: message.tag,
    data: { url: message.url || '/' },
  }));
});

self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    let target = new URL('/', self.location.origin);
    try {
      const requested = new URL(event.notification.data?.url || '/', self.location.origin);
      if (requested.origin === self.location.origin) target = requested;
    } catch { /* Keep the default destination. */ }
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) {
      if (new URL(client.url).origin === target.origin) {
        await client.navigate(target.href);
        return client.focus();
      }
    }
    return self.clients.openWindow(target.href);
  })());
});
