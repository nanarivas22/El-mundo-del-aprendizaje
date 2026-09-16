/* El Mundo del Aprendizaje — funciona sin internet desde la segunda vez
   © 2026 Natalia Andrea Rivas Rodríguez — CC BY-NC 4.0

   REGLA DE ORO: nada de Firestore se guarda en caché.
   Si se guardara, los niños verían listas viejas de grupos y estudiantes. */

var CACHE = "mundo-aprendizaje-v1";
var BASE = [
  "./", "./index.html", "./manifest.json",
  "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(function (c) {
    return Promise.all(BASE.map(function (u) { return c.add(u).catch(function(){}); }));
  }));
});

self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== CACHE; })
                         .map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener("fetch", function (e) {
  var r = e.request;
  if (r.method !== "GET") return;
  var url = new URL(r.url);

  /* La base de datos SIEMPRE va a la red. Nunca se guarda. */
  if (/firestore\.googleapis\.com|firebaseio|identitytoolkit|googleapis\.com\/identitytoolkit|firebaseinstallations/.test(url.href)) return;

  /* El SDK de Firebase y las fuentes: se sirven de lo guardado y se refrescan detrás. */
  if (url.origin !== location.origin) {
    e.respondWith(
      caches.match(r).then(function (hit) {
        var red = fetch(r).then(function (res) {
          if (res && (res.ok || res.type === "opaque")) {
            var copia = res.clone();
            caches.open(CACHE).then(function (c) { c.put(r, copia); });
          }
          return res;
        }).catch(function () { return hit; });
        return hit || red;
      })
    );
    return;
  }

  /* El juego: primero la red, y si no hay señal, lo guardado. */
  e.respondWith(
    fetch(r).then(function (res) {
      var copia = res.clone();
      caches.open(CACHE).then(function (c) { c.put(r, copia); });
      return res;
    }).catch(function () {
      return caches.match(r).then(function (hit) { return hit || caches.match("./index.html"); });
    })
  );
});
