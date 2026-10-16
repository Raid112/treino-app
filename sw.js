const CACHE_NAME = 'treino-v23';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './corrida-plan.json',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  // CF Worker — sempre network, nunca cacheia (dados dinâmicos)
  if (e.request.url.includes('garmin-cf-probe.caiocpagliarani.workers.dev')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // O contrato semanal é atualizado sem mudar o HTML. Network-first mantém o
  // cache offline utilizável, mas permite que a review aprovada chegue ao app.
  if (new URL(e.request.url).pathname.endsWith('/corrida-plan.json')) {
    e.respondWith(
      fetch(e.request).then(async res => {
        if (res.ok) {
          try {
            const cache = await caches.open(CACHE_NAME);
            await cache.put(e.request, res.clone());
          } catch (_error) {
            // Storage/quota failure must not hide a valid network response.
          }
        }
        return res;
      }).catch(async () => (await caches.match(e.request)) || new Response('', { status: 503 }))
    );
    return;
  }

  // Google Fonts — network first, fallback to cache
  if (e.request.url.includes('fonts.googleapis.com') || e.request.url.includes('fonts.gstatic.com')) {
    e.respondWith(
      fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      }).catch(() => caches.match(e.request))
    );
    return;
  }

  // Local assets — cache first, fallback to network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        const clone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        return res;
      });
    })
  );
});
