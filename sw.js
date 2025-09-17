const CACHE_NAME = 'pwa-cache-v1';
const urlsToCache = [
    './',
    './index.html',
    './app.js',
    './manifest.json',
    './offline.html'
];

// Install event
self.addEventListener('install', event => {
    console.log('[SW] Install event');
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('[SW] Caching files');
                return cache.addAll(urlsToCache);
            })
            .catch(error => {
                console.error('[SW] Caching failed:', error);
            })
    );
    self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
    console.log('[SW] Activate event');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('[SW] Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    self.clients.claim();
});

// Fetch event
self.addEventListener('fetch', event => {
    console.log('[SW] Fetch event:', event.request.url);
    
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version or fetch from network
                if (response) {
                    console.log('[SW] Found in cache:', event.request.url);
                    return response;
                }
                
                console.log('[SW] Fetching from network:', event.request.url);
                return fetch(event.request)
                    .then(response => {
                        // Don't cache non-successful responses
                        if (!response || response.status !== 200 || response.type !== 'basic') {
                            return response;
                        }
                        
                        // Clone the response
                        const responseToCache = response.clone();
                        
                        caches.open(CACHE_NAME)
                            .then(cache => {
                                cache.put(event.request, responseToCache);
                            });
                        
                        return response;
                    });
            })
            .catch(error => {
                console.log('[SW] Fetch failed:', error);
                
                // Return offline page for navigation requests
                if (event.request.destination === 'document') {
                    return caches.match('./offline.html');
                }
                
                // Return a default response for other requests
                return new Response('Offline', {
                    status: 503,
                    statusText: 'Service Unavailable'
                });
            })
    );
});

// Handle notification click
self.addEventListener('notificationclick', event => {
    console.log('[SW] Notification click received:', event);
    
    event.notification.close();
    
    if (event.action === 'open') {
        event.waitUntil(
            clients.openWindow('./')
        );
    } else {
        // Default click behavior
        event.waitUntil(
            clients.matchAll().then(clientList => {
                for (let i = 0; i < clientList.length; i++) {
                    const client = clientList[i];
                    if (client.url === '/' && 'focus' in client) {
                        return client.focus();
                    }
                }
                if (clients.openWindow) {
                    return clients.openWindow('./');
                }
            })
        );
    }
});

// Handle push messages
self.addEventListener('push', event => {
    console.log('[SW] Push received:', event);
    
    const title = 'PWA Push Notification';
    const options = {
        body: event.data ? event.data.text() : 'New message received!',
        icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%232196F3%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22white%22>🔔</text></svg>',
        badge: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><circle cx=%2250%22 cy=%2250%22 r=%2240%22 fill=%22%232196F3%22/><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22 fill=%22white%22>📱</text></svg>',
        actions: [
            { action: 'open', title: 'Open App', icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22>👁️</text></svg>' },
            { action: 'close', title: 'Close', icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text x=%2250%22 y=%2260%22 font-size=%2240%22 text-anchor=%22middle%22>❌</text></svg>' }
        ],
        tag: 'pwa-push',
        requireInteraction: true,
        vibrate: [200, 100, 200]
    };

    event.waitUntil(
        self.registration.showNotification(title, options)
    );
});

// Handle background sync (for future use)
self.addEventListener('sync', event => {
    console.log('[SW] Background sync:', event.tag);
    
    if (event.tag === 'background-sync') {
        event.waitUntil(doBackgroundSync());
    }
});

function doBackgroundSync() {
    return new Promise((resolve, reject) => {
        // Implement your background sync logic here
        console.log('[SW] Performing background sync');
        resolve();
    });
}