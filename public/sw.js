const CACHE_NAME = 'piuvc-cache-v1';

// We do not need to hardcode specific file names because Vite generates hashed bundle names.
// Instead, we dynamically cache assets as they are requested!

self.addEventListener('install', (event) => {
  // Prevent service worker from being stuck in "waiting" state
  event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (cache !== CACHE_NAME) {
            console.log('Dynamic SW: Clearing old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle local HTTP(S) requests
  if (url.origin !== self.location.origin) {
    return;
  }

  // Skip Firestore SDK / websocket connections, Firebase endpoints, heatchecks
  if (
    url.pathname.includes('firestore') || 
    url.pathname.includes('firebase') || 
    request.method !== 'GET'
  ) {
    return;
  }

  // Network First falling back to Cache strategy for HTML pages (navigation)
  // Cache First strategy for JS, CSS, fonts, and images
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          // Put clone in cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });
          return response;
        })
        .catch(() => {
          // If offline, serve root HTML
          return caches.match('/');
        })
    );
  } else {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch backend in background to keep cache fresh (stale-while-revalidate)
          fetch(request).then((response) => {
            if (response.status === 200) {
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(request, response);
              });
            }
          }).catch(() => {/* Ignore network errors if offline */});
          
          return cachedResponse;
        }

        return fetch(request).then((response) => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return response;
        }).catch((err) => {
          // Fallback if missing and offline
          if (request.destination === 'image') {
            // Return empty transparent or fallback block if possible
          }
          throw err;
        });
      })
    );
  }
});
