// src/utils/vpn.ts
// اصلاح ۷: تشخیص خودکار وضعیت VPN برای انتخاب پلتفرم محتوا (یوتیوب در برابر آپارات).
// از آنجا که مرورگرها API رسمی برای «وضعیت VPN» ندارند، از یک روش عملی (heuristic) استفاده می‌شود:
// تلاش برای بارگذاری یک منبع کوچک از یک سرویس بین‌المللی که معمولاً بدون VPN از داخل ایران در دسترس نیست
// (favicon گوگل). اگر با موفقیت و در بازه زمانی کوتاه بارگذاری شود، فرض بر روشن بودن VPN (یا کاربر خارج
// از ایران) است؛ در غیر این صورت (تایم‌اوت یا خطا)، فرض بر خاموش بودن VPN / دسترسی داخل ایران است.

let cachedVpnOn: boolean | null = null;

export const detectVpnOn = (timeoutMs = 2500): Promise<boolean> => {
  if (cachedVpnOn !== null) return Promise.resolve(cachedVpnOn);
  return new Promise((resolve) => {
    let settled = false;
    const done = (v: boolean) => {
      if (settled) return;
      settled = true;
      cachedVpnOn = v;
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
      img.src = `https://www.google.com/favicon.ico?_=${Date.now()}`;
    } catch {
      done(false);
    }
  });
};
