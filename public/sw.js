const CACHE_NAME = "litlens-v1";

// Static assets to pre-cache on install
const PRECACHE_ASSETS = [
  "/",
  "/new",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
];

// Install — pre-cache static shell
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(PRECACHE_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Fetch — network-first for API, cache-first for static assets
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // Avoid caching unsupported schemes (e.g., chrome-extension) and non-http(s)
  if (![`http:`, `https:`].includes(url.protocol)) return;

  // Avoid opaque requests triggered by devtools/only-if-cached cross-origin
  if (request.cache === "only-if-cached" && request.mode !== "same-origin") return;

  // Limit to same-origin assets to avoid extension noise and CORS issues
  if (url.origin !== self.location.origin) return;

  // API calls — network only (no caching)
  if (url.pathname.startsWith("/api/")) return;

  // Static assets & pages — stale-while-revalidate
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      const fetchPromise = fetch(request)
        .then((response) => {
          // Only cache successful responses
          if (response.ok && response.status === 200) {
            cache.put(request, response.clone());
          }
          return response;
        })
        .catch(() => {
          // If network fails, return cached version if available
          return cached;
        });

      // Return cached version immediately, update in background
      return cached || fetchPromise;
    })
  );
});
