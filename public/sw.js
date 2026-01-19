// Service Worker for Mandala Day PWA
// Handles notification display and network-first caching strategy

const CACHE_NAME = 'mandala-day-v2';

// Install event - immediately take control
self.addEventListener('install', (event) => {
  // Skip waiting to activate immediately
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all([
        // Delete all old caches
        ...cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        }),
        // Take control of all clients immediately
        self.clients.claim(),
      ]);
    })
  );
});

// Fetch event - Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Clone the response before caching
        const responseToCache = response.clone();
        
        // Cache successful responses
        if (response.status === 200) {
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseToCache);
          });
        }
        
        return response;
      })
      .catch(() => {
        // Network failed, try cache
        return caches.match(event.request).then((cachedResponse) => {
          return cachedResponse || new Response('Offline', { status: 503 });
        });
      })
  );
});

// Notification click handler
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If there's already a window open, focus it
      for (const client of clientList) {
        if ('focus' in client) {
          return client.focus();
        }
      }
      // Otherwise open a new window
      if (clients.openWindow) {
        return clients.openWindow('/');
      }
    })
  );
});

// Listen for messages from the app (for scheduling notifications)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SCHEDULE_NOTIFICATION') {
    const { title, body, scheduledTime, notificationId } = event.data;
    const now = Date.now();
    const delay = scheduledTime - now;

    if (delay > 0) {
      setTimeout(() => {
        self.registration.showNotification(title, {
          body,
          icon: '/icon-192.png',
          badge: '/icon-192.png',
          tag: notificationId,
          requireInteraction: false,
          vibrate: [200, 100, 200],
        });
      }, delay);
    }
  } else if (event.data && event.data.type === 'CANCEL_NOTIFICATIONS') {
    // Cancel all notifications
    self.registration.getNotifications().then((notifications) => {
      notifications.forEach((notification) => notification.close());
    });
  }
});
