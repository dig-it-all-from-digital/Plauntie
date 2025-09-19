// This is the service worker file for the Plauntie PWA.

self.addEventListener('install', (event) => {
  console.log('Plauntie Service Worker: Installing...');
  // We can add caching logic here later if needed.
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Plauntie Service Worker: Activating...');
  // This is a good place to clean up old caches.
  event.waitUntil(self.clients.claim());
});

self.addEventListener('push', (event) => {
  console.log('Plauntie Service Worker: Push Received.');

  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.error('Push event data is not JSON', e);
      data = { body: event.data.text() };
    }
  }

  const title = data.title || 'Plauntie';
  const options = {
    body: data.body || 'You have a new notification.',
    icon: 'logo192.png', // Icon to display in the notification
    badge: 'logo192.png' // Icon for the notification tray
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Optional: Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('Plauntie Service Worker: Notification click Received.');

  event.notification.close();

  // This opens the app to the root page.
  // We could add more complex logic to open specific pages.
  event.waitUntil(
    clients.openWindow('/')
  );
});
