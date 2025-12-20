/**
 * Service Worker for Scroungers Multimedia
 * Phase 16: PWA offline support, caching strategies
 */

const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `scroungers-static-${CACHE_VERSION}`;
const DYNAMIC_CACHE = `scroungers-dynamic-${CACHE_VERSION}`;
const IMAGE_CACHE = `scroungers-images-${CACHE_VERSION}`;

// Assets to cache immediately on install
const STATIC_ASSETS = [
  '/',
  '/offline',
  '/manifest.json',
  '/favicon.ico',
  '/favicon.svg',
  '/apple-touch-icon.png',
];

// Cache limits
const MAX_DYNAMIC_CACHE_ITEMS = 50;
const MAX_IMAGE_CACHE_ITEMS = 100;

// =============================================================================
// INSTALL
// =============================================================================

self.addEventListener('install', (event) => {
  console.log('[SW] Installing service worker...');

  event.waitUntil(
    caches
      .open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Pre-caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[SW] Static assets cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[SW] Failed to cache static assets:', error);
      })
  );
});

// =============================================================================
// ACTIVATE
// =============================================================================

self.addEventListener('activate', (event) => {
  console.log('[SW] Activating service worker...');

  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => {
              return (
                name.startsWith('scroungers-') &&
                name !== STATIC_CACHE &&
                name !== DYNAMIC_CACHE &&
                name !== IMAGE_CACHE
              );
            })
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[SW] Service worker activated');
        return self.clients.claim();
      })
  );
});

// =============================================================================
// FETCH
// =============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip cross-origin requests (except images)
  if (url.origin !== location.origin && !isImageRequest(request)) {
    return;
  }

  // Skip API requests (let them go through normally)
  if (url.pathname.startsWith('/api/')) {
    return;
  }

  // Handle different types of requests
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request));
  } else if (isNavigationRequest(request)) {
    event.respondWith(handleNavigationRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// =============================================================================
// REQUEST HANDLERS
// =============================================================================

/**
 * Handle static assets (cache first)
 */
async function handleStaticRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Static fetch failed:', error);
    throw error;
  }
}

/**
 * Handle image requests (cache first with limit)
 */
async function handleImageRequest(request) {
  const cached = await caches.match(request);
  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      await trimCache(IMAGE_CACHE, MAX_IMAGE_CACHE_ITEMS);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[SW] Image fetch failed:', error);
    // Return a placeholder image if available
    return caches.match('/images/placeholder.png');
  }
}

/**
 * Handle navigation requests (network first, fallback to cache)
 */
async function handleNavigationRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Navigation failed, trying cache:', request.url);

    const cached = await caches.match(request);
    if (cached) {
      return cached;
    }

    // Return offline page for navigation requests
    return caches.match('/offline');
  }
}

/**
 * Handle dynamic requests (network first with cache fallback)
 */
async function handleDynamicRequest(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(DYNAMIC_CACHE);
      await trimCache(DYNAMIC_CACHE, MAX_DYNAMIC_CACHE_ITEMS);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.log('[SW] Dynamic fetch failed, trying cache:', request.url);
    return caches.match(request);
  }
}

// =============================================================================
// HELPERS
// =============================================================================

function isStaticAsset(request) {
  const url = new URL(request.url);
  return (
    STATIC_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.woff')
  );
}

function isImageRequest(request) {
  const url = new URL(request.url);
  return (
    request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|avif)$/i)
  );
}

function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Trim cache to a maximum number of items
 */
async function trimCache(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();

  if (keys.length > maxItems) {
    // Delete oldest entries
    const toDelete = keys.slice(0, keys.length - maxItems);
    await Promise.all(toDelete.map((key) => cache.delete(key)));
    console.log(`[SW] Trimmed ${toDelete.length} items from ${cacheName}`);
  }
}

// =============================================================================
// PUSH NOTIFICATIONS
// =============================================================================

self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');

  let data = { title: 'Scroungers Multimedia', body: 'New notification' };

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data.body = event.data.text();
    }
  }

  const options = {
    body: data.body,
    icon: '/apple-touch-icon.png',
    badge: '/favicon-32x32.png',
    vibrate: [100, 50, 100],
    data: data.data || {},
    actions: data.actions || [],
    requireInteraction: data.requireInteraction || false,
  };

  event.waitUntil(self.registration.showNotification(data.title, options));
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);

  event.notification.close();

  const urlToOpen = event.notification.data?.url || '/dashboard';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url === urlToOpen && 'focus' in client) {
          return client.focus();
        }
      }
      // Open new window if none exists
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// =============================================================================
// BACKGROUND SYNC
// =============================================================================

self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync:', event.tag);

  if (event.tag === 'sync-drafts') {
    event.waitUntil(syncDrafts());
  }

  if (event.tag === 'sync-reading-progress') {
    event.waitUntil(syncReadingProgress());
  }
});

async function syncDrafts() {
  try {
    // Get pending drafts from IndexedDB
    const drafts = await getPendingDrafts();

    for (const draft of drafts) {
      try {
        await fetch('/api/posts/drafts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(draft),
        });
        await removePendingDraft(draft.id);
      } catch (error) {
        console.error('[SW] Failed to sync draft:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Draft sync failed:', error);
  }
}

async function syncReadingProgress() {
  try {
    // Get pending reading progress updates from IndexedDB
    const updates = await getPendingReadingProgress();

    for (const update of updates) {
      try {
        await fetch('/api/reading-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(update),
        });
        await removePendingReadingProgress(update.postId);
      } catch (error) {
        console.error('[SW] Failed to sync reading progress:', error);
      }
    }
  } catch (error) {
    console.error('[SW] Reading progress sync failed:', error);
  }
}

// IndexedDB helpers (simplified - would need full implementation)
async function getPendingDrafts() {
  // Implementation would use IndexedDB
  return [];
}

async function removePendingDraft(/* id */) {
  // Implementation would use IndexedDB
}

async function getPendingReadingProgress() {
  // Implementation would use IndexedDB
  return [];
}

async function removePendingReadingProgress(/* postId */) {
  // Implementation would use IndexedDB
}

// =============================================================================
// MESSAGE HANDLING
// =============================================================================

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'GET_VERSION') {
    event.ports[0].postMessage({ version: CACHE_VERSION });
  }

  if (event.data && event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(
      caches.keys().then((names) => {
        return Promise.all(names.map((name) => caches.delete(name)));
      })
    );
  }
});

console.log('[SW] Service worker loaded - version:', CACHE_VERSION);
