/* NotePDF service worker — made by zayan-coder */
const CACHE_NAME = 'notepdf-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './pdf.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css'
];

self.addEventListener('install', (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.allSettled(
      APP_SHELL.map((url) => cache.add(url).catch(() => null))
    );
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Don't intercept chrome-extension:// or devtools
  if (!url.protocol.startsWith('http')) return;

  // App navigations → network first, fallback to cached shell
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, fresh.clone()).catch(() => {});
        return fresh;
      } catch (_) {
        const cache = await caches.open(CACHE_NAME);
        return (await cache.match('./index.html'))
            || (await cache.match('./'))
            || Response.error();
      }
    })());
    return;
  }

  // Static assets → cache first, then network
  event.respondWith((async () => {
    const cache = await caches.open(CACHE_NAME);
    const cached = await cache.match(req);
    if (cached) return cached;

    try {
      const fresh = await fetch(req);
      if (fresh && (fresh.ok || fresh.type === 'opaque')) {
        cache.put(req, fresh.clone()).catch(() => {});
      }
      return fresh;
    } catch (_) {
      return (await cache.match(req)) || Response.error();
    }
  })());
});