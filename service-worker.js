// Service worker mínimo para poder "instalar" el dashboard como app en el celu.
// Objetivo único: cachear el shell de la app (HTML/manifest/íconos) para que abra rápido
// y no quede en blanco si hay mala señal. A propósito NO cachea nada de Supabase ni de los
// CDNs (Chart.js, supabase-js) — esos siempre van a red, para no mostrar nunca datos financieros
// viejos ni versiones viejas de las librerías.
const CACHE_NAME = 'finanzas-shell-v1';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo intervenir en pedidos GET al mismo origen (el shell). Todo lo demás
  // (Supabase, CDNs de Chart.js/supabase-js, etc.) pasa directo a la red sin tocar.
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then((res) => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, resClone));
        return res;
      })
      .catch(() => caches.match(req).then((cached) => cached || caches.match('./index.html')))
  );
});
