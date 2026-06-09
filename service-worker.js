/* Plant Navigator service worker
   Strategi:
   - HTML: network-first (selalu ambil versi terbaru; saat offline pakai cache).
   - Aset statis (ikon, css): cache-first.
   - Supabase / pihak ketiga (beda origin): TIDAK di-cache (selalu live).
   Saat update besar, naikkan VERSION agar cache lama dibersihkan. */
const VERSION = 'plantnav-v1';
const ASSETS = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(ASSETS).catch(()=>{})));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(ks => Promise.all(ks.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // Beda origin (Supabase, tiles, font CDN) -> langsung jaringan, jangan diintervensi.
  if (url.origin !== location.origin) return;

  const isHTML = req.mode === 'navigate' || (req.headers.get('accept') || '').includes('text/html');
  if (isHTML) {
    e.respondWith(
      fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; })
        .catch(() => caches.match(req).then(m => m || caches.match('./index.html')))
    );
    return;
  }
  // aset statis same-origin -> cache dulu, kalau tak ada ambil jaringan lalu simpan.
  e.respondWith(
    caches.match(req).then(m => m || fetch(req).then(r => { const cp = r.clone(); caches.open(VERSION).then(c => c.put(req, cp)); return r; }))
  );
});
