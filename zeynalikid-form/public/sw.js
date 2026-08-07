/* Zeynalikid Service Worker — Stage 9
 * استراتژی: Stale-While-Revalidate برای assetهای استاتیک هم‌خاستگاه،
 * Network-First برای ناوبری/HTML (نسخه تازه پس از هر دیپلوی)،
 * و عدم کش هر درخواست API/Supabase/خارج‌خاستگاه.
 */
const VERSION = 'zkid-v22-2026-08-07-form-phase4-fix';
const STATIC_CACHE = 'static-' + VERSION;
const NAV_CACHE = 'nav-' + VERSION;

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(['/manifest.webmanifest', '/icons/icon-192.png', '/icons/icon-512.png'])).then(cleanOldCaches).then(() => self.skipWaiting()));
});

async function cleanOldCaches() {
  const keys = await caches.keys();
  await Promise.all(keys.filter((k) => !k.endsWith(VERSION) && (k.startsWith('static-') || k.startsWith('nav-'))).map((k) => caches.delete(k)));
}
self.addEventListener('install', (e) => { e.waitUntil(cleanOldCaches()); });
self.addEventListener('activate', (e) => {
  e.waitUntil((async () => { await cleanOldCaches(); await self.clients.claim(); })());
});
self.addEventListener('message', (e) => { if (e.data === 'zk-clean-caches') { e.waitUntil ? e.waitUntil(cleanOldCaches()) : cleanOldCaches(); } });

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // هرگز POST/پرداخت/فرم‌ها
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;      // هرگز Supabase/API/فونت CDN
  if (url.pathname.startsWith('/sw.js')) return;

  if (req.mode === 'navigate') {
    // Network-First برای HTML تا دیپلوی تازه همیشه برسد
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(NAV_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        const cached = await caches.match(req, { ignoreSearch: true });
        return cached || caches.match('/index.html');
      }
    })());
    return;
  }

  const isStatic = /\.(js|css|woff2?|ttf|png|jpe?g|webp|svg|ico|xml|webmanifest)(\?.*)?$/i.test(url.pathname) || url.pathname.startsWith('/assets/') || url.pathname.startsWith('/images/') || url.pathname.startsWith('/icons/');
  if (!isStatic) return; // درخواست‌های داده/JSON کش نمی‌شوند

  // Stale-While-Revalidate برای استاتیک
  e.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req).then((res) => { if (res && res.ok) cache.put(req, res.clone()); return res; }).catch(() => cached);
    return cached || network;
  })());
});
