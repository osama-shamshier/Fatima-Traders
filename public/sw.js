// Service Worker for Fatima Traders Retail Management System
// Full-app offline shell and static asset caching

const CACHE_NAME = "fatima-retail-pwa-v1";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/pos",
  "/products",
  "/inventory",
  "/expenses",
  "/purchases",
  "/buyers",
  "/suppliers",
  "/favicon.ico",
  "/manifest.json",
];

// Install: Pre-cache core shell pages
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch((err) => {
        console.warn("Pre-caching some assets failed:", err);
      });
    })
  );
  self.skipWaiting();
});

// Activate: Clean up old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch: Strategy depending on request type
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // Skip non-GET requests (mutations handled by IndexedDB Outbox)
  if (event.request.method !== "GET") {
    return;
  }

  // Skip chrome-extension or external URLs
  if (url.origin !== self.location.origin) {
    return;
  }

  // 1. Static Assets (JS, CSS, fonts, images): Cache-first with network refresh
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.endsWith(".js") ||
    url.pathname.endsWith(".css") ||
    url.pathname.endsWith(".svg") ||
    url.pathname.endsWith(".png") ||
    url.pathname.endsWith(".ico") ||
    url.pathname.endsWith(".woff2")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          // Fetch fresh in background
          fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse && networkResponse.status === 200) {
                caches.open(CACHE_NAME).then((cache) => {
                  cache.put(event.request, networkResponse);
                });
              }
            })
            .catch(() => {});
          return cachedResponse;
        }

        return fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
              });
            }
            return networkResponse;
          })
          .catch(() => {
            return new Response("", { status: 408, statusText: "Offline" });
          });
      })
    );
    return;
  }

  // 2. Page Navigations (HTML): Network first with fallback to cached page shell
  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // Fallback to cache for this specific route, or fallback to /pos or /dashboard
          const cached = await caches.match(event.request);
          if (cached) return cached;

          const posCached = await caches.match("/pos");
          if (posCached) return posCached;

          const dashboardCached = await caches.match("/dashboard");
          if (dashboardCached) return dashboardCached;

          return new Response(
            `<!DOCTYPE html>
            <html>
              <head><title>Fatima Retail - Offline</title></head>
              <body style="font-family:sans-serif;text-align:center;padding:50px;">
                <h2>You are currently offline</h2>
                <p>The app shell is ready. <a href="/pos">Click here to go to POS</a></p>
              </body>
            </html>`,
            { headers: { "Content-Type": "text/html" } }
          );
        })
    );
    return;
  }

  // 3. API GET requests: Network first, cache fallback
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          return caches.match(event.request).then((cachedResponse) => {
            if (cachedResponse) {
              return cachedResponse;
            }
            return new Response(JSON.stringify({ error: "Offline - cached data not available" }), {
              status: 503,
              headers: { "Content-Type": "application/json" },
            });
          });
        })
    );
    return;
  }
});
