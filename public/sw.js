// Service Worker for Fatima Traders Retail Management System
// Full-app offline shell, static asset caching, and Next.js RSC router support

const CACHE_NAME = "fatima-retail-pwa-v4";
const STATIC_ASSETS = [
  "/",
  "/dashboard",
  "/pos",
  "/sales",
  "/sales-returns",
  "/products",
  "/inventory",
  "/expenses",
  "/purchases",
  "/buyers",
  "/buyer-payments",
  "/buyer-due-dates",
  "/suppliers",
  "/supplier-payments",
  "/financials",
  "/profit-loss",
  "/categories",
  "/units",
  "/counters",
  "/branches",
  "/reports",
  "/stock-transfers",
  "/settings",
  "/users",
  "/roles",
  "/audit-logs",
  "/backups",
  "/favicon.ico",
  "/manifest.json",
];

// Install: Pre-cache core shell pages resiliently
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of STATIC_ASSETS) {
        try {
          await cache.add(asset);
        } catch (err) {
          console.warn("Pre-caching asset skipped/failed:", asset);
        }
      }
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

  // 2. Next.js React Server Component (RSC) requests and client navigation payloads
  const isRSC =
    url.searchParams.has("_rsc") ||
    event.request.headers.get("RSC") === "1" ||
    event.request.headers.get("Next-Router-State-Tree");

  if (isRSC) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
              cache.put(url.pathname + "_rsc_payload", responseToCache.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          // 1. Exact match
          const cached = await caches.match(event.request);
          if (cached) return cached;

          // 2. Match ignoring search parameters (e.g. if _rsc hash changed)
          const matchedWithoutQuery = await caches.match(event.request, { ignoreSearch: true });
          if (matchedWithoutQuery) return matchedWithoutQuery;

          // 3. Fallback to generic stored payload for this route
          const genericPayload = await caches.match(url.pathname + "_rsc_payload");
          if (genericPayload) return genericPayload;

          // 4. Match pathname directly
          const pathCached = await caches.match(url.pathname);
          if (pathCached) return pathCached;

          return new Response("Offline RSC Unavailable", {
            status: 503,
            statusText: "Offline RSC Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 3. Page Navigations and HTML Shells: Network first with fallback to cached page shell
  const isPageRequest =
    event.request.mode === "navigate" ||
    (event.request.headers.get("Accept") && event.request.headers.get("Accept").includes("text/html")) ||
    STATIC_ASSETS.includes(url.pathname);

  if (isPageRequest) {
    event.respondWith(
      fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
              cache.put(url.pathname, responseToCache.clone());
            });
          }
          return networkResponse;
        })
        .catch(async () => {
          const cached = await caches.match(event.request);
          if (cached) return cached;

          const pathCached = await caches.match(url.pathname);
          if (pathCached) return pathCached;

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

  // 4. API GET requests: Network first, cache fallback
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
