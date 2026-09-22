const CACHE_NAME = "jobtrack-shell-v5";
const SHELL_ASSETS = ["/", "/icon.svg", "/manifest.webmanifest"];
const NETWORK_FIRST_ASSETS = new Set(["/", "/styles.css", "/app.js"]);

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))),
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      if (event.request.mode === "navigate" || NETWORK_FIRST_ASSETS.has(url.pathname)) {
        try {
          const response = await fetch(event.request);
          cache.put(event.request, response.clone());
          return response;
        } catch {
          return (await caches.match(event.request)) || caches.match("/");
        }
      }

      const cached = await caches.match(event.request);
      if (cached) return cached;
      const response = await fetch(event.request);
      cache.put(event.request, response.clone());
      return response;
    })(),
  );
});
