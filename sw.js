// sw.js
const CACHE = 'fitcoach-v5';
const STATIC = [
  '/', '/index.html', '/css/app.css', '/manifest.json', '/config.js',
  '/js/app.js', '/js/api.js', '/js/storage.js',
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
    e.respondWith(fetch(e.request).catch(() =>
      new Response('[]', {headers: {'Content-Type': 'application/json'}})
    ));
    return;
  }
  e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
});
