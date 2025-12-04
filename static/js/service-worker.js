const CACHE_NAME = 'barbearia-cache-v1';
const ASSETS = [
  '/index.html',
  '/agendar.html',
  '/admin.html',
  '/static/css/styles.css',
  '/static/js/main.js',
  '/static/js/admin.js',
  '/static/js/sw-register.js',
  '/static/icons/icon-192.png',
  '/static/icons/icon-512.png'
];

self.addEventListener('install', evt => {
  evt.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', evt => {
  evt.respondWith(caches.match(evt.request).then(r => r || fetch(evt.request)));
});

// Recebe mensagem do cliente para mostrar notificação
self.addEventListener('message', event => {
  const data = event.data;
  if (data && data.type === 'SHOW_NOTIFICATION') {
    const title = data.title || 'Barbearia';
    const options = {
      body: data.body || '',
      icon: '/static/icons/icon-192.png',
      vibrate: [100, 50, 100],
      data: data.extra || {}
    };
    self.registration.showNotification(title, options);
  }
});
