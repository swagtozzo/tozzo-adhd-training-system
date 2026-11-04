/* Allenamento a casa: funzionamento offline.
   Scope /casa/: gestisce solo le pagine di questa cartella, non l'app principale.
   La cache ha un nome diverso da quella dell'app principale ("rimessa-in-forma-…"), così le due non si cancellano a vicenda.
   Per pubblicare un aggiornamento cambia VERSION: la nuova versione si usa dalla riapertura successiva. */
const VERSION = "1.0";
const CACHE = "casa-allenamento-" + VERSION;
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "../fonts/atkinson-400.woff",
  "../fonts/atkinson-700.woff",
  "../fonts/barlow-condensed-500.woff",
  "../fonts/barlow-condensed-600.woff",
  "../fonts/barlow-condensed-700.woff",
  "../icons/apple-touch-icon.png",
  "../icons/icon-192.png",
  "../icons/icon-512.png",
  "../icons/maskable-512.png"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys()
    .then(keys => Promise.all(keys.filter(k => k.startsWith("casa-allenamento-") && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => req.mode === "navigate" ? caches.match("./index.html") : Response.error()))
  );
});
