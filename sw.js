const CACHE_NAME = 'mon-budget-cache-v41';
const URLS_A_METTRE_EN_CACHE = [
  './',
  './index.html',
  './css/base.css',
  './css/components.css',
  './css/modals.css',
  './css/responsive.css',
  './css/oneui.css',
  './js/config.js',
  './js/helpers.js',
  './js/prevision.js',
  './js/storage.js',
  './js/budgets.js',
  './js/render.js',
  './js/historique.js',
  './js/modals.js',
  './js/donnees.js',
  './js/securite.js',
  './js/verrou-precoce.js',
  './js/recurrentes.js',
  './js/objectif.js',
  './js/events.js',
  './js/app.js',
  './fonts/inter-latin.woff2',
  './manifest.json',
  './icons/icon-192.png',
  './icons/icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(URLS_A_METTRE_EN_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(noms =>
      Promise.all(
        noms.filter(nom => nom !== CACHE_NAME).map(nom => caches.delete(nom))
      )
    )
  );
  self.clients.claim();
});

// Stale-while-revalidate : on répond tout de suite avec le cache (rapide, marche hors ligne),
// et on récupère en arrière-plan la version à jour pour la prochaine ouverture.
// Les correctifs arrivent donc même si on oublie de changer CACHE_NAME.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(cache =>
      cache.match(req).then(enCache => {
        const reseau = fetch(req).then(rep => {
          if (rep && rep.ok) cache.put(req, rep.clone());
          return rep;
        }).catch(() => enCache || (req.mode === 'navigate' ? cache.match('./index.html') : Response.error()));
        return enCache || reseau;
      })
    )
  );
});
