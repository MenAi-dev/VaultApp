// Numéro de version : À CHANGER à chaque modification de l'application (et dans js/config.js : VERSION_APP).
// Tous les fichiers d'une version sont mis en cache ensemble ; l'application ne mélange donc jamais
// d'anciens et de nouveaux fichiers. Quand ce numéro change, la nouvelle version remplace l'ancienne
// et la page se recharge une fois (voir js/app.js).
const CACHE_NAME = 'mon-budget-cache-v42';
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
  './js/reglages.js',
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
    caches.open(CACHE_NAME).then(cache =>
      // cache: 'reload' : on va chercher les fichiers sur le serveur, jamais dans le cache HTTP du navigateur
      // (sinon une ancienne copie d'un fichier pourrait être rangée dans la nouvelle version).
      cache.addAll(URLS_A_METTRE_EN_CACHE.map(url => new Request(url, { cache: 'reload' })))
    )
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

// Cache d'abord (rapide, fonctionne hors ligne), réseau en secours.
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(enCache =>
      enCache || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('./index.html') : Response.error()))
    )
  );
});
