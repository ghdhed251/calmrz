/* PLKNPL Calendar service worker.
   Bump CACHE_VERSION when you publish a new version of the calendar.
   Network-first for HTML and JSON so fresh data/code is used when online.
*/
const CACHE_VERSION = "v12";
const CACHE = "plknpl-cal-" + CACHE_VERSION;

const PRECACHE = [
  "./",
  "./index.html",
  "./school-calendar-data.json",
  "./school-calendar-data.js",
  "./manifest.json",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(PRECACHE).catch(() => {}))
  );
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", event => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return;

  const isHtml = url.pathname.endsWith("/") || url.pathname.endsWith(".html");
  const isData = url.pathname.endsWith(".json") || url.pathname.endsWith(".js");

  if (isHtml || isData) {
    // Network-first: prefer fresh code/data when online
    event.respondWith(
      fetch(req)
        .then(res => {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
          return res;
        })
        .catch(() => caches.match(req).then(r => r || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for icons and other static assets
  event.respondWith(
    caches.match(req).then(cached => {
      if (cached) return cached;
      return fetch(req).then(res => {
        const copy = res.clone();
        caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => cached);
    })
  );
});
