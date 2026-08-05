import React from 'react';
import { createRoot } from 'react-dom/client';
import { HelmetProvider } from 'react-helmet-async';
import App from './App';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <HelmetProvider>
      <App />
    </HelmetProvider>
  </React.StrictMode>
);

// Stage 9: ثبت Service Worker فقط در build تولیدی (در dev فعال نمی‌شود)
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
    navigator.serviceWorker.ready.then((reg) => { try { reg.active && reg.active.postMessage('zk-clean-caches'); } catch {} }).catch(() => {});
  });
}
