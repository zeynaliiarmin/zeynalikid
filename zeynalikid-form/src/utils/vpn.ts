// src/utils/vpn.ts
// تشخیص خودکار وضعیت VPN با چندین منبع آزمایشی و کش ۵ دقیقه‌ای

let cachedVpnOn: boolean | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // ۵ دقیقه

export const forceRedetectVpn = () => {
  cachedVpnOn = null;
  cacheTime = 0;
};

const probeFetch = async (url: string, timeoutMs: number): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    const res = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(id);
    return true;
  } catch {
    return false;
  }
};

const probeImage = (url: string, timeoutMs: number): Promise<boolean> => {
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      resolve(v);
    };
    try {
      const img = new Image();
      const timer = setTimeout(() => done(false), timeoutMs);
      img.onload = () => {
        clearTimeout(timer);
        done(true);
      };
      img.onerror = () => {
        clearTimeout(timer);
        done(false);
      };
      img.src = `${url}?_=${Date.now()}`;
    } catch {
      done(false);
    }
  });
};

export const detectVpnOn = async (timeoutMs = 4000): Promise<boolean> => {
  const now = Date.now();
  if (cachedVpnOn !== null && now - cacheTime < CACHE_TTL) {
    return cachedVpnOn;
  }

  const p1 = await probeFetch('https://www.google.com/generate_204', timeoutMs);
  if (p1) {
    cachedVpnOn = true;
    cacheTime = Date.now();
    return true;
  }

  const p2 = await probeFetch('https://cp.cloudflare.com/', timeoutMs);
  if (p2) {
    cachedVpnOn = true;
    cacheTime = Date.now();
    return true;
  }

  const p3 = await probeImage('https://www.google.com/favicon.ico', timeoutMs);
  cachedVpnOn = p3;
  cacheTime = Date.now();
  return p3;
};
