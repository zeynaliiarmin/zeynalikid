import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import { BrowserRouter } from 'react-router-dom';
import '@fontsource/vazirmatn/400.css';
import '@fontsource/vazirmatn/500.css';
import '@fontsource/vazirmatn/600.css';
import '@fontsource/vazirmatn/700.css';
import '@fontsource/vazirmatn/800.css';
import App from './App';
import AppLaunchSplash from './components/AppLaunchSplash';
import ErrorBoundary from './components/ErrorBoundary';
import { initErrorLogging } from './utils/errorLog';
import './index.css';
// keyframes/استایل دکمه‌های CTA و آکاردئون مشاوره — به‌صورت سراسری در همهٔ صفحات در دسترس
import './components/zkCta.css';
// گلسمورفیسم (کارت شیشه‌ای + لیبل شناور) برای ورود ادمین و صفحهٔ پیگیری
import './components/zkGlass.css';

// ثبت سراسری خطاهای فرانت‌اند (بی‌صدا — تجربهٔ کاربر را مختل نمی‌کند)
initErrorLogging();

// ─── PWA: dynamic manifest & service worker based on route ──────────────
// مسیرهای /admin/* از manifest و SW مستقل مدیریت استفاده می‌کنند تا
// اپ PWA "زینالیکید | مدیریت" به‌صورت یک اپ جداگانه نصب شود.
function isAdminRoute(pathname: string): boolean {
  return pathname === '/admin' || pathname.startsWith('/admin/');
}

function applyAdminPwaMeta() {
  // manifest
  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = '/admin-manifest.webmanifest';

  // apple-touch-icon
  let appleTouch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!appleTouch) {
    appleTouch = document.createElement('link');
    appleTouch.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouch);
  }
  appleTouch.href = '/icons/admin-icon-192.png';

  // favicon svg
  let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = 'image/svg+xml';
    document.head.appendChild(iconLink);
  }
  iconLink.href = '/icons/admin-icon.svg';

  // apple-mobile-web-app-title
  let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(meta);
  }
  meta.content = 'مدیریت زینالیکید';

  // iOS: اطمینان از باز شدن به‌صورت اپ مستقل (بدون نوار مرورگر) و full-screen
  let capable = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-capable"]');
  if (!capable) {
    capable = document.createElement('meta');
    capable.name = 'apple-mobile-web-app-capable';
    document.head.appendChild(capable);
  }
  capable.content = 'yes';

  let statusBar = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-status-bar-style"]');
  if (!statusBar) {
    statusBar = document.createElement('meta');
    statusBar.name = 'apple-mobile-web-app-status-bar-style';
    document.head.appendChild(statusBar);
  }
  statusBar.content = 'black-translucent';

  // theme-color (keep teal, but darker for admin if desired)
  let themeColor = document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if (!themeColor) {
    themeColor = document.createElement('meta');
    themeColor.name = 'theme-color';
    document.head.appendChild(themeColor);
  }
  themeColor.content = '#0F766E';

  // robots: noindex admin routes
  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (!robots) {
    robots = document.createElement('meta');
    robots.name = 'robots';
    document.head.appendChild(robots);
  }
  robots.content = 'noindex, nofollow';

  document.title = 'زینالیکید | مدیریت';
}

function applyPublicPwaMeta() {
  let manifestLink = document.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  if (!manifestLink) {
    manifestLink = document.createElement('link');
    manifestLink.rel = 'manifest';
    document.head.appendChild(manifestLink);
  }
  manifestLink.href = '/manifest.webmanifest';

  let appleTouch = document.querySelector<HTMLLinkElement>('link[rel="apple-touch-icon"]');
  if (!appleTouch) {
    appleTouch = document.createElement('link');
    appleTouch.rel = 'apple-touch-icon';
    document.head.appendChild(appleTouch);
  }
  appleTouch.href = '/icons/apple-touch-icon.png';

  let iconLink = document.querySelector<HTMLLinkElement>('link[rel="icon"][type="image/svg+xml"]');
  if (!iconLink) {
    iconLink = document.createElement('link');
    iconLink.rel = 'icon';
    iconLink.type = 'image/svg+xml';
    document.head.appendChild(iconLink);
  }
  iconLink.href = '/icons/icon.svg';

  let meta = document.querySelector<HTMLMetaElement>('meta[name="apple-mobile-web-app-title"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.name = 'apple-mobile-web-app-title';
    document.head.appendChild(meta);
  }
  meta.content = 'زینالیکید';

  let robots = document.querySelector<HTMLMetaElement>('meta[name="robots"]');
  if (robots) robots.content = 'index, follow';
}

function setupPwaForCurrentRoute() {
  const isAdmin = isAdminRoute(window.location.pathname);
  if (isAdmin) {
    applyAdminPwaMeta();
  } else {
    applyPublicPwaMeta();
  }

  if (!('serviceWorker' in navigator)) return;

  // Only register in production to avoid dev-time caching issues.
  if (!import.meta.env.PROD) return;

  window.addEventListener('load', () => {
    if (isAdmin) {
      // Admin route: only register the admin SW (scope /admin/).
      // Do NOT register the public sw.js here — it would conflict with admin-sw.js
      // because both would try to control /admin/* navigations.
      navigator.serviceWorker.register('/admin-sw.js', { scope: '/admin/' })
        .catch((err) => { console.warn('[admin] SW registration failed:', err); });
    } else {
      // Public route: register the public sw.js (scope /).
      // If a previous registration of admin-sw exists on this origin, leave it alone.
      navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`)
        .catch(() => {});
      navigator.serviceWorker.ready.then((reg) => {
        try { reg.active?.postMessage('zk-clean-caches'); } catch {}
      }).catch(() => {});
    }
  });
}

// Apply on initial load
setupPwaForCurrentRoute();

// Re-apply on route changes (in case user navigates between public and admin)
// Listen to popstate (back/forward) and pushstate/replacestate (router navigation).
let lastPath = window.location.pathname;
const checkPathChange = () => {
  const current = window.location.pathname;
  if (current !== lastPath) {
    const wasAdmin = isAdminRoute(lastPath);
    const isAdmin = isAdminRoute(current);
    if (wasAdmin !== isAdmin) {
      setupPwaForCurrentRoute();
    }
    lastPath = current;
  }
};
window.addEventListener('popstate', checkPathChange);
window.addEventListener('pushstate', checkPathChange);
window.addEventListener('replacestate', checkPathChange);
// Patch history methods to emit our custom events
const origPush = history.pushState;
const origReplace = history.replaceState;
history.pushState = function (...args) {
  const r = origPush.apply(this, args as any);
  window.dispatchEvent(new Event('pushstate'));
  return r;
};
history.replaceState = function (...args) {
  const r = origReplace.apply(this, args as any);
  window.dispatchEvent(new Event('replacestate'));
  return r;
};

const rootElement=document.getElementById('root')!;
const application=(
  <React.StrictMode>
    <HelmetProvider>
      <AppLaunchSplash><BrowserRouter>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </BrowserRouter></AppLaunchSplash>
    </HelmetProvider>
  </React.StrictMode>
);
// The pre-rendered document is a crawler/first-paint snapshot. Several legacy public
// widgets intentionally randomize their initial item, so hydrating that snapshot would create
// mismatches. Activate the SPA from a clean root while keeping the full no-JS HTML response.
if(rootElement.hasChildNodes())rootElement.replaceChildren();
createRoot(rootElement).render(application);
