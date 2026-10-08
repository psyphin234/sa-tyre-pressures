/*
 * sw.js: offline support. Every file the site needs is cached on the first
 * visit, then served from the cache (so it works with no signal). Bump
 * VERSION whenever any file changes, so visitors pick up the new files;
 * tests/run.ps1 checks that every local file referenced by the pages is in
 * FILES.
 */
const VERSION = "tyres-2026-10-08-13";
const FILES = [
  "./",
  "index.html",
  "sources.html",
  "manifest.webmanifest",
  "css/style.css",
  "js/data.js",
  "js/tables.js",
  "js/images.js",
  "js/calc.js",
  "js/ui.js",
  "js/diagrams.js",
  "js/app.js",
  "js/sources.js",
  "js/install.js",
  "fonts/inter-latin-var.woff2",
  "fonts/rajdhani-600-latin.woff2",
  "fonts/rajdhani-700-latin.woff2",
  "brand-64.png",
  "favicon.ico",
  "favicon-96x96.png",
  "favicon-192x192.png",
  "apple-touch-icon.png",
  "icon-192.png",
  "icon-512.png",
  "icon-maskable-512.png",
  "img/hero.jpg",
  "img/tar.jpg", "img/tar-thumb.jpg",
  "img/gravel.jpg", "img/gravel-thumb.jpg",
  "img/corrugations.jpg", "img/corrugations-thumb.jpg",
  "img/sand.jpg", "img/sand-thumb.jpg",
  "img/mud.jpg", "img/mud-thumb.jpg",
  "img/rock.jpg", "img/rock-thumb.jpg",
  "img/snow.jpg", "img/snow-thumb.jpg",
  "img/markings.jpg",
  "img/gauge.jpg",
  "img/compressor.jpg",
  "img/beadlock.jpg",
  "img/deflated.jpg",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache first, then the network (and cache what it returns from this site).
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(
      (hit) =>
        hit ||
        fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(VERSION).then((cache) => cache.put(req, copy));
            }
            return res;
          })
          .catch(() => (req.mode === "navigate" ? caches.match("index.html") : Response.error()))
    )
  );
});
