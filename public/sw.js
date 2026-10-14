// GrocerAI Manager Sentinel Service Worker for Standalone App Installation
const CACHE_NAME = 'grocerai-manager-v1';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener('fetch', (event) => {
  // Pass-through network requests with safe fallback
  event.respondWith(
    fetch(event.request).catch(() => {
      return caches.match(event.request) as any;
    })
  );
});
