// GymHub service worker: aplicatia merge si fara internet.
const V = 'gymhub-v1', F = 'gymhub-fonts-v1';
const CORE = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(V).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(ks => Promise.all(ks.filter(k => k !== V && k !== F).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);

  if (u.origin === location.origin) {
    // Pagina: mai intai reteaua (ca sa primesti versiunea noua), apoi memoria daca esti offline sau reteaua e lenta.
    if (r.mode === 'navigate') {
      e.respondWith(
        Promise.race([fetch(r), new Promise((_, no) => setTimeout(no, 4000))])
          .then(x => { if (x.ok) { const cp = x.clone(); caches.open(V).then(c => c.put('./index.html', cp)); } return x; })
          .catch(() => caches.match('./index.html'))
      );
      return;
    }
    // Restul fisierelor: din memorie, apoi reteaua.
    e.respondWith(
      caches.match(r).then(h => h || fetch(r).then(x => {
        if (x.ok) { const cp = x.clone(); caches.open(V).then(c => c.put(r, cp)); }
        return x;
      }))
    );
    return;
  }

  // Fonturile Google: din memorie, actualizate in fundal.
  if (/(^|\.)fonts\.(googleapis|gstatic)\.com$/.test(u.hostname)) {
    e.respondWith(
      caches.open(F).then(c => c.match(r).then(h => {
        const n = fetch(r).then(x => { c.put(r, x.clone()); return x; }).catch(() => h);
        return h || n;
      }))
    );
  }
});
