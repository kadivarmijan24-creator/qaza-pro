const CACHE_NAME = 'qaza-offline-final-v10';

// ક્લીન પાથ - કોઈ કવેરી પેરામીટર વગર
const ASSETS = [
  './',
  './index.html',
  './style.css',
  './app.js',
  './manifest.json'
];

// ૧. ઇન્સ્ટોલ થતાં જ બધી ફાઇલો ડાઉનલોડ કરો
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('કેશિંગ સફળ!');
      return cache.addAll(ASSETS);
    })
  );
  self.skipWaiting();
});

// ૨. જૂનો કેશ સાફ કરી નવો એક્ટિવેટ કરો
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// ૩. ઓફલાઇન હેન્ડલર (Cache First Strategy)
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request, { ignoreSearch: true }).then((cachedResponse) => {
      // જો કેશમાં હોય તો સીધું આપી દો (ઇન્ટરનેટ વગર ૧ સેકન્ડમાં ખુલશે)
      if (cachedResponse) {
        return cachedResponse;
      }
      // જો કેશમાં ન હોય તો નેટવર્ક પરથી લાવો
      return fetch(event.request).catch(() => {
        // નેટ બંધ હોય અને નેવિગેશન હોય તો index.html બતાવો
        if (event.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});