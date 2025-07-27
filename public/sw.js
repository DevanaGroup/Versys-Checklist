
const CACHE_NAME = 'versys-pwa-v3';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/favicon.ico',
  '/favicon-16x16.png',
  '/favicon-32x32.png',
  '/apple-touch-icon.png',
  '/icon-192x192.png',
  '/icon-512x512.png',
  '/versys-logo.png',
  '/lovable-uploads/a4359bba-bc5d-4bf2-98b0-566712fd53b8.png',
  '/lovable-uploads/d4ef3de2-1ab1-45f0-9e85-afac3edece7d.png'
];

// Install event
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event
self.addEventListener('fetch', (event) => {
  // Não interceptar requisições do Firebase Storage
  if (event.request.url.includes('firebasestorage.googleapis.com')) {
    return;
  }
  
  // Não interceptar módulos JavaScript/TypeScript do Vite em desenvolvimento
  if (event.request.url.includes('/src/') || 
      event.request.url.includes('/@vite/') ||
      event.request.url.includes('/@fs/') ||
      event.request.url.includes('.tsx') ||
      event.request.url.includes('.ts') ||
      event.request.url.includes('.jsx') ||
      event.request.url.includes('.js') && event.request.url.includes('?')) {
    return;
  }
  
  // Só cachear requisições GET
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // Se falhar, sempre buscar da rede
        return fetch(event.request);
      })
  );
});

// Activate event
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
