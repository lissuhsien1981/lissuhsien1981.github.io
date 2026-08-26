// sw.js
const CACHE = 'fitcoach-v42';
const STATIC = [
  '/css/app.css', '/manifest.json', '/config.js',
  '/js/app.js', '/js/api.js', '/js/storage.js', '/js/diag.js',
  '/js/screens/today.js', '/js/screens/log.js', '/js/screens/stats.js', '/js/screens/profile.js',
  '/js/components/timer.js', '/js/components/numpad.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(STATIC)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys =>
    Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
  ));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.url.includes('script.google.com')) {
    // Only reads get an offline stand-in. A POST that fails is a write that did
    // not happen, and answering it with [] made logFood report success — the
    // meal went into the local cache and never reached the sheet.
    if (e.request.method !== 'GET') return;
    e.respondWith(fetch(e.request).catch(() =>
      new Response('[]', {headers: {'Content-Type': 'application/json'}})
    ));
    return;
  }
  // Never cache HTML — always fetch fresh so viewport meta is up-to-date
  if (e.request.destination === 'document') {
    e.respondWith(fetch(e.request).catch(() => caches.match('/index.html')));
    return;
  }
  // Network-first for the app's own code. Cache-first meant a device kept
  // serving whatever JS it had cached until the cache name changed, so there
  // was no way to tell which build a phone was actually running. The cache is
  // still the offline fallback, and it is refreshed on every successful fetch.
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
