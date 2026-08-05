// src/utils/detectCountry.ts
// تشخیص خودکار کشور کاربر: اولویت اول API ایرانی، سپس fallback بین‌المللی.
// خروجی: کد دوحرفی کشور (IR / US / DE / ...). حداکثر ۳ ثانیه timeout برای هر درخواست.

const fetchWithTimeout = async (url: string, ms = 3000): Promise<any> => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), ms);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } finally {
    clearTimeout(timeoutId);
  }
};

let cached: string | null = null;

export const detectUserCountry = async (): Promise<string> => {
  if (cached) return cached;
  // اولویت اول: APIهای ایرانی (داخل ایران سریع و بدون فیلتر)
  try {
    const data = await fetchWithTimeout('https://api.iranlms.ir/v1/ip');
    const c = String(data?.country || data?.data?.country || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(c)) { cached = c; return c; }
    cached = 'IR'; return 'IR'; // پاسخ آمد ولی کد کشور نداشت → فرض بر ایران
  } catch {
    /* ادامه به fallback */
  }
  // Fallback اول: ipapi.co
  try {
    const data = await fetchWithTimeout('https://ipapi.co/json/');
    const c = String(data?.country_code || data?.country || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(c)) { cached = c; return c; }
  } catch {
    /* ادامه */
  }
  // Fallback دوم: ip-api.com
  try {
    const data = await fetchWithTimeout('http://ip-api.com/json/');
    const c = String(data?.countryCode || '').toUpperCase();
    if (/^[A-Z]{2}$/.test(c)) { cached = c; return c; }
  } catch {
    /* ادامه */
  }
  cached = 'US'; // پیش‌فرض نهایی: خارج
  return 'US';
};

export const isValidMediaUrl = (u: string) => {
  try {
    const parsed = new URL(String(u || '').trim());
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
};
