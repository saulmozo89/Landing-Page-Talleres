// Service worker: guarda la página en el celular para que abra sin señal.
const CACHE = "talleres-v5";
const ARCHIVOS = ["./", "./index.html", "./app.js", "./datos.js", "./manifest.json", "./icono.svg", "./logocc.jpg"];

self.addEventListener("install", e => {
  // Tailwind viene de internet; si no carga, la instalación sigue igual.
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARCHIVOS).then(() => c.add("https://cdn.tailwindcss.com").catch(() => {}))));
  self.skipWaiting();
});

self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

// Primero intenta internet; si no hay, usa la copia guardada.
self.addEventListener("fetch", e => {
  if (e.request.method !== "GET") return;
  e.respondWith(
    fetch(e.request, { cache: "no-cache" }) // revalida con el servidor para no servir JS viejo tras un deploy
      .then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request))
  );
});
