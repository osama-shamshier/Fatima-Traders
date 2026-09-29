// Service Worker for Fatima Traders Retail Management System
// Full-app offline shell, static asset caching, and Next.js RSC router support

const CACHE_NAME = "fatima-retail-pwa-v11";
const STATIC_ASSETS = [
  "/",
  "/login",
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

// Helper: Fast timeout fetch to prevent stalled dead-network connections from freezing navigation
function fetchWithTimeout(request, timeoutMs = 3000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error("NetworkTimeout"));
    }, timeoutMs);

    fetch(request)
      .then((res) => {
        clearTimeout(timer);
        resolve(res);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

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

  // Always bypass Service Worker for health checks so connectivity is tested cleanly
  if (url.pathname === "/api/health") {
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
          if (navigator.onLine) {
            fetch(event.request)
              .then((networkResponse) => {
                if (networkResponse && networkResponse.status === 200) {
                  caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, networkResponse);
                  });
                }
              })
              .catch(() => {});
          }
          return cachedResponse;
        }

        if (!navigator.onLine) {
          return new Response("", { status: 408, statusText: "Offline" });
        }

        return fetchWithTimeout(event.request, 3000)
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
    // When offline, match cache or return 503 INSTANTLY without waiting on network socket timeouts
    if (!navigator.onLine) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(CACHE_NAME);
          const cached = await cache.match(event.request);
          if (cached) return cached;

          const matchedWithoutQuery = await cache.match(event.request, { ignoreSearch: true });
          if (matchedWithoutQuery) {
            const ct = matchedWithoutQuery.headers.get("Content-Type") || "";
            if (!ct.includes("text/html")) return matchedWithoutQuery;
          }

          return new Response("Offline RSC Unavailable", {
            status: 503,
            statusText: "Offline RSC Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })()
      );
      return;
    }

    event.respondWith(
      fetchWithTimeout(event.request, 3000)
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
          const cache = await caches.open(CACHE_NAME);

          // 1. Exact match
          const cached = await cache.match(event.request);
          if (cached) return cached;

          // 2. Match ignoring search parameters (if _rsc hash changed)
          const matchedWithoutQuery = await cache.match(event.request, { ignoreSearch: true });
          if (matchedWithoutQuery) {
            const ct = matchedWithoutQuery.headers.get("Content-Type") || "";
            // Never return HTML for RSC requests!
            if (!ct.includes("text/html")) return matchedWithoutQuery;
          }

          // Return 503 so Next.js falls back cleanly to document navigation
          return new Response("Offline RSC Unavailable", {
            status: 503,
            statusText: "Offline RSC Unavailable",
            headers: { "Content-Type": "text/plain" },
          });
        })
    );
    return;
  }

  // 3. Page Navigations and HTML Shells: Instant offline match or network with cache fallback
  const isPageRequest =
    event.request.mode === "navigate" ||
    (event.request.headers.get("Accept") && event.request.headers.get("Accept").includes("text/html")) ||
    STATIC_ASSETS.includes(url.pathname);

  if (isPageRequest) {
    const getCachedPage = async () => {
      const cache = await caches.open(CACHE_NAME);

      // 1. Exact match
      const cached = await cache.match(event.request);
      if (cached) return cached;

      // 2. Pathname match (e.g. /buyers, /pos, /dashboard)
      const pathCached = await cache.match(url.pathname);
      if (pathCached) return pathCached;

      const fullUrlCached = await cache.match(url.origin + url.pathname);
      if (fullUrlCached) return fullUrlCached;

      // 3. Fallback for root path
      if (url.pathname === "/") {
        const dashCached = await cache.match("/dashboard");
        if (dashCached) return dashCached;
        const posCached = await cache.match("/pos");
        if (posCached) return posCached;
      }

      // 4. Clean offline notice for routes not yet cached
      return new Response(
        `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1">
            <title>Fatima Retail - Offline</title>
          </head>
          <body style="font-family:system-ui,sans-serif;text-align:center;padding:50px;background:#f8fafc;color:#1e293b;">
            <h2 style="font-size:20px;font-weight:700;">Page Offline</h2>
            <p style="font-size:14px;color:#64748b;margin-top:8px;">Please connect to the internet to load this page.</p>
            <div style="margin-top:20px;">
              <a href="/dashboard" style="display:inline-block;padding:8px 16px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin:4px;">Dashboard</a>
              <a href="/pos" style="display:inline-block;padding:8px 16px;background:#059669;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;font-size:13px;margin:4px;">POS Terminal</a>
            </div>
          </body>
        </html>`,
        { headers: { "Content-Type": "text/html" } }
      );
    };

    // When offline, respond immediately with the cached page shell (< 2ms)
    if (!navigator.onLine) {
      event.respondWith(getCachedPage());
      return;
    }

    event.respondWith(
      fetchWithTimeout(event.request, 3000)
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
        .catch(() => getCachedPage())
    );
    return;
  }

  // 4. API GET requests: Fast offline response when offline; normal network when online
  if (url.pathname.startsWith("/api/")) {
    if (!navigator.onLine) {
      event.respondWith(
        caches.match(event.request).then((cachedResponse) => {
          if (cachedResponse) return cachedResponse;
          return new Response(JSON.stringify({ error: "Offline" }), {
            status: 503,
            headers: { "Content-Type": "application/json" },
          });
        })
      );
      return;
    }

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
