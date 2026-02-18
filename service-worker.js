// service-worker.js
// Grimorio v3.1 RC1 — Strategia: Network-First per HTML, Cache-First per assets

const CACHE_NAME = "grimorio-v1.2.0"; // ← bump ad ogni deploy per forzare aggiornamento
const ASSETS = [
  "./",
  "./index.html",
  "./css/style.css",
  "./js/app.js",
  "./js/character.js",
  "./js/database.js",
  "./js/ui.js",
  "./data/spells/v5_lvl0.js",
  "./data/spells/v5_lvl1.js",
  "./data/spells/v5_lvl2.js",
  "./data/spells/v5_lvl3.js",
  "./data/spells/v5_lvl4.js",
  "./data/spells/v5_lvl5.js",
  "./data/spells/v5_lvl6.js",
  "./data/spells/v5_lvl7.js",
  "./data/spells/v5_lvl8.js",
  "./data/spells/v5_lvl9.js",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./manifest.json"
];

// ─── INSTALL: precache degli asset statici ────────────────────────────────────
self.addEventListener("install", event => {
  console.log("[SW] Installazione:", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS))
      .then(() => {
        console.log("[SW] Cache pronta, salto attesa");
        // skipWaiting forza l'attivazione immediata senza aspettare
        // che tutte le tab siano chiuse
        return self.skipWaiting();
      })
      .catch(err => console.error("[SW] Errore install:", err))
  );
});

// ─── ACTIVATE: elimina tutte le cache vecchie ─────────────────────────────────
self.addEventListener("activate", event => {
  console.log("[SW] Attivazione:", CACHE_NAME);
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => {
            console.log("[SW] Elimino cache obsoleta:", key);
            return caches.delete(key);
          })
      ))
      .then(() => {
        console.log("[SW] Attivo. Prendo controllo delle tab aperte.");
        // clients.claim() fa sì che le tab già aperte usino subito il nuovo SW
        return self.clients.claim();
      })
  );
});

// ─── FETCH: strategia differenziata ──────────────────────────────────────────
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  if (event.request.url.includes("chrome-extension")) return;

  const url = new URL(event.request.url);
  const isHTML = url.pathname.endsWith("/") ||
                 url.pathname.endsWith(".html") ||
                 url.pathname === "";

  if (isHTML) {
    // ── HTML: Network-First ──────────────────────────────────────────────────
    // Prova sempre la rete. Se offline, fallback alla cache.
    // Così l'utente vede sempre la versione più recente quando è connesso.
    event.respondWith(
      fetch(event.request)
        .then(networkResponse => {
          // Aggiorna la cache con la versione appena scaricata
          const clone = networkResponse.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return networkResponse;
        })
        .catch(() => {
          // Offline: servi dalla cache se disponibile
          return caches.match(event.request)
            .then(cached => cached || new Response(
              "<h1>Sei offline</h1><p>Riconnettiti per caricare il Grimorio.</p>",
              { headers: { "Content-Type": "text/html" } }
            ));
        })
    );

  } else {
    // ── Asset statici (JS, CSS, immagini): Cache-First ───────────────────────
    // Se in cache → veloce. Se non in cache → rete + salva in cache.
    event.respondWith(
      caches.match(event.request)
        .then(cached => {
          if (cached) return cached;

          return fetch(event.request)
            .then(networkResponse => {
              // Salva solo risposte valide (non opaque, non errori)
              if (
                networkResponse &&
                networkResponse.status === 200 &&
                networkResponse.type === "basic"
              ) {
                const clone = networkResponse.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
              }
              return networkResponse;
            })
            .catch(() => {
              // Offline e non in cache: ritorna 503 esplicito invece di undefined
              console.warn("[SW] Asset non disponibile offline:", event.request.url);
              return new Response("", { status: 503, statusText: "Offline" });
            });
        })
    );
  }
});