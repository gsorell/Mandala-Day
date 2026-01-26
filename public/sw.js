// Service Worker for Mandala Day PWA
// Handles notification display, background scheduling, and network-first caching

const CACHE_NAME = 'mandala-day-v3';
const DB_NAME = 'mandala-notifications';
const STORE_NAME = 'scheduled';
const DB_VERSION = 1;

// ============ IndexedDB Helpers ============
// Using IndexedDB because localStorage isn't accessible in service workers

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        store.createIndex('scheduledTime', 'scheduledTime', { unique: false });
      }
    };
  });
}

async function saveNotifications(notifications) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);

    // Clear existing and add new ones
    await new Promise((resolve, reject) => {
      const clearRequest = store.clear();
      clearRequest.onsuccess = resolve;
      clearRequest.onerror = reject;
    });

    for (const notification of notifications) {
      store.put(notification);
    }

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    db.close();
    console.log('[SW] Saved', notifications.length, 'notifications to IndexedDB');
  } catch (error) {
    console.error('[SW] Error saving notifications:', error);
  }
}

async function loadNotifications() {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => {
        db.close();
        resolve(request.result || []);
      };
      request.onerror = () => {
        db.close();
        reject(request.error);
      };
    });
  } catch (error) {
    console.error('[SW] Error loading notifications:', error);
    return [];
  }
}

async function updateNotification(notification) {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(notification);

    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = reject;
    });

    db.close();
  } catch (error) {
    console.error('[SW] Error updating notification:', error);
  }
}

async function clearOldNotifications() {
  try {
    const notifications = await loadNotifications();
    const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
    const filtered = notifications.filter(n => n.scheduledTime > cutoff);

    if (filtered.length !== notifications.length) {
      await saveNotifications(filtered);
      console.log('[SW] Cleaned up', notifications.length - filtered.length, 'old notifications');
    }
  } catch (error) {
    console.error('[SW] Error cleaning up notifications:', error);
  }
}

// ============ Notification Checking ============

async function checkAndShowNotifications() {
  try {
    const notifications = await loadNotifications();
    const now = Date.now();
    let hasChanges = false;

    for (const notification of notifications) {
      // Show if it's due and hasn't been shown yet
      // Allow a 5-minute grace window for notifications that were slightly missed
      const graceWindow = 5 * 60 * 1000;
      const isDue = notification.scheduledTime <= now;
      const withinGrace = (now - notification.scheduledTime) < graceWindow;

      if (!notification.shown && isDue && withinGrace) {
        try {
          await self.registration.showNotification(notification.title, {
            body: notification.body,
            icon: '/icon-192.png',
            badge: '/icon-192.png',
            tag: notification.id,
            requireInteraction: false,
            vibrate: [200, 100, 200],
            data: {
              instanceId: notification.instanceId,
              templateId: notification.templateId,
            },
          });

          notification.shown = true;
          hasChanges = true;
          console.log('[SW] Showed notification:', notification.title);
        } catch (error) {
          console.error('[SW] Error showing notification:', error);
        }
      } else if (isDue && !withinGrace && !notification.shown) {
        // Mark as expired if too old
        notification.shown = true;
        notification.expired = true;
        hasChanges = true;
        console.log('[SW] Notification expired:', notification.title);
      }
    }

    if (hasChanges) {
      await saveNotifications(notifications);
    }

    // Schedule cleanup
    await clearOldNotifications();

    return notifications.filter(n => !n.shown).length;
  } catch (error) {
    console.error('[SW] Error checking notifications:', error);
    return 0;
  }
}

// ============ Service Worker Events ============

// Install event - immediately take control
self.addEventListener('install', (event) => {
  console.log('[SW] Installing...');
  self.skipWaiting();
});

// Activate event - clean up old caches and take control
self.addEventListener('activate', (event) => {
  console.log('[SW] Activating...');
  event.waitUntil(
    Promise.all([
      // Delete old caches
      caches.keys().then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('[SW] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            }
          })
        );
      }),
      // Take control of all clients immediately
      self.clients.claim(),
      // Check for any due notifications
      checkAndShowNotifications(),
      // Register periodic sync if available
      registerPeriodicSync(),
    ])
  );
});

// Fetch event - Network first, fall back to cache
self.addEventListener('fetch', (event) => {
  // Check notifications on any fetch event (keeps SW alive)
  checkAndShowNotifications();

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

  const data = event.notification.data || {};

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

// Listen for messages from the app
self.addEventListener('message', (event) => {
  if (!event.data) return;

  const { type } = event.data;

  if (type === 'SCHEDULE_NOTIFICATIONS') {
    // Receive batch of scheduled notifications
    const { notifications } = event.data;
    console.log('[SW] Received', notifications.length, 'notifications to schedule');

    event.waitUntil(
      saveNotifications(notifications).then(() => {
        // Immediately check if any are due
        return checkAndShowNotifications();
      })
    );
  } else if (type === 'CANCEL_NOTIFICATIONS') {
    // Cancel all notifications
    console.log('[SW] Canceling all notifications');
    event.waitUntil(
      Promise.all([
        saveNotifications([]),
        self.registration.getNotifications().then((notifications) => {
          notifications.forEach((notification) => notification.close());
        }),
      ])
    );
  } else if (type === 'CHECK_NOTIFICATIONS') {
    // Manual check trigger
    event.waitUntil(checkAndShowNotifications());
  } else if (type === 'GET_PENDING_COUNT') {
    // Return count of pending notifications
    event.waitUntil(
      loadNotifications().then((notifications) => {
        const pending = notifications.filter(n => !n.shown && n.scheduledTime > Date.now());
        event.source.postMessage({
          type: 'PENDING_COUNT',
          count: pending.length,
        });
      })
    );
  }
});

// ============ Periodic Background Sync ============
// This is the best way to get background execution, but has limited browser support

async function registerPeriodicSync() {
  if ('periodicSync' in self.registration) {
    try {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync',
      });

      if (status.state === 'granted') {
        await self.registration.periodicSync.register('check-notifications', {
          minInterval: 60 * 1000, // Request every minute (browser may throttle)
        });
        console.log('[SW] Periodic sync registered');
      }
    } catch (error) {
      console.log('[SW] Periodic sync not available:', error.message);
    }
  }
}

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('[SW] Periodic sync triggered');
    event.waitUntil(checkAndShowNotifications());
  }
});

// ============ Background Sync (for when coming back online) ============

self.addEventListener('sync', (event) => {
  if (event.tag === 'check-notifications') {
    console.log('[SW] Background sync triggered');
    event.waitUntil(checkAndShowNotifications());
  }
});

// ============ Push Notifications (for future server-based notifications) ============

self.addEventListener('push', (event) => {
  if (!event.data) return;

  try {
    const data = event.data.json();

    event.waitUntil(
      self.registration.showNotification(data.title || 'Mandala Day', {
        body: data.body || 'Time for your meditation',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        vibrate: [200, 100, 200],
        data: data,
      })
    );
  } catch (error) {
    console.error('[SW] Push notification error:', error);
  }
});
