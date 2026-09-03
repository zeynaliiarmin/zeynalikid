/* Zeynalikid Admin Service Worker
 * Scope: /desk/
 * Separate from the public site's sw.js to avoid cache interference.
 *
 * Strategy:
 *  - Navigation requests (HTML) under /desk/: Network-First, fallback to cached /desk.
 *  - Static assets (JS/CSS/icons/images under /assets/, /icons/): Stale-While-Revalidate.
 *  - API/Supabase requests: NEVER cached (bypass).
 *  - POST/PUT/DELETE: NEVER intercepted.
 */

const VERSION = 'zkid-desk-v9-2026-09-03-url-migration';
const STATIC_CACHE = 'admin-static-' + VERSION;
const NAV_CACHE = 'admin-nav-' + VERSION;

// Pre-cache the admin entry points at install time.
// Note: the SPA serves the same index.html for all /admin/* routes (vercel.json rewrites to spa.html; R21: URLs moved from /admin/* to /desk/*).
const PRECACHE_URLS = [
  '/desk',
  '/desk/app',
  '/desk/',
  '/desk-manifest.webmanifest',
  '/icons/admin-icon-192.png',
  '/icons/admin-icon-512.png',
  '/icons/admin-icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(STATIC_CACHE)
      .then((c) => c.addAll(PRECACHE_URLS).catch((err) => {
        // If any precache URL fails, log but don't block install — we'll lazy-cache on fetch.
        console.warn('[admin-sw] precache partial failure:', err);
      }))
      .then(() => cleanOldCaches())
      .then(() => self.skipWaiting())
  );
});

async function cleanOldCaches() {
  const keys = await caches.keys();
  // Only delete admin-* caches that don't match current VERSION
  await Promise.all(
    keys
      .filter((k) => k.startsWith('admin-') && !k.endsWith(VERSION))
      .map((k) => caches.delete(k))
  );
}

self.addEventListener('activate', (e) => {
  e.waitUntil((async () => {
    await cleanOldCaches();
    await self.clients.claim();
  })());
});

self.addEventListener('message', (e) => {
  if (e.data === 'zk-admin-clean-caches') {
    if (e.waitUntil) e.waitUntil(cleanOldCaches());
    else cleanOldCaches();
  }
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // Never intercept cross-origin requests (Supabase API, fonts CDN, etc.)
  if (url.origin !== self.location.origin) return;

  // Only handle requests under /admin/* (our scope).
  // The browser enforces scope at registration, but this is a defensive check.
  if (!url.pathname.startsWith('/desk/') && url.pathname !== '/desk') return;

  // Don't intercept the public sw.js or this admin-sw.js
  if (url.pathname === '/sw.js' || url.pathname === '/desk-sw.js') return;

  // Navigation requests: Network-First
  if (req.mode === 'navigate') {
    e.respondWith((async () => {
      try {
        const fresh = await fetch(req);
        const cache = await caches.open(NAV_CACHE);
        cache.put(req, fresh.clone());
        return fresh;
      } catch (err) {
        // Offline: try cached nav, then fallback to /admin/login (which the SPA will route).
        const cached = await caches.match(req, { ignoreSearch: true });
        if (cached) return cached;
        const fallback = await caches.match('/desk');
        return fallback || caches.match('/desk/');
      }
    })());
    return;
  }

  // Static asset requests under /admin/ or shared assets (/assets/, /icons/)
  const isStatic = /\.(js|css|woff2?|ttf|png|jpe?g|webp|svg|ico|xml|webmanifest)(\?.*)?$/i.test(url.pathname)
    || url.pathname.startsWith('/assets/')
    || url.pathname.startsWith('/icons/')
    || url.pathname === '/desk-manifest.webmanifest';

  if (!isStatic) return;

  // Stale-While-Revalidate for static
  e.respondWith((async () => {
    const cache = await caches.open(STATIC_CACHE);
    const cached = await cache.match(req);
    const network = fetch(req)
      .then((res) => {
        if (res && res.ok) cache.put(req, res.clone());
        return res;
      })
      .catch(() => cached);
    return cached || network;
  })());
});
