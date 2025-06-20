// Simple service worker for offline support
const CACHE_NAME = 'remey-site-cache-v1';
const URLS_TO_CACHE = [
  '/',
  '/index.html',
  '/style.css',
  '/sounds/click-confirm.mp3.mp3',
  '/sounds/calling.wav',
  '/sounds/scif-fi-Video call opening-mp3.wav',
  // Add more assets as needed
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_TO_CACHE))
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(response => response || fetch(event.request))
  );
});
