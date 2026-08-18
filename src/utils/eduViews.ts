// شمارش بازدید محتوای آموزشی (مقاله/ویدیو/پادکست/عکس) — بدون هیچ تأثیری روی دیتابیس.
// ۱) عدد شروع (seed): اگر مدیر در پنل «viewsSeed» تنظیم کرده باشد همان؛ در غیر این صورت
//    از id محتوا یک عدد ثابت بین ۳۰٬۰۰۰ تا ۶۰٬۰۰۰ ساخته می‌شود (برای هر محتوا متفاوت و پایدار،
//    طوری که همهٔ کاربران همان عدد شروع را ببینند).
// ۲) شمارش واقعی: هر بار که کاربر محتوا را باز می‌کند، یک شمارنده در localStorage همان دستگاه
//    زیاد می‌شود و روی عدد شروع اضافه می‌شود. (برای شمارش سراسری/مشترک بین همه، باید در دیتابیس
//    ذخیره شود که فعلاً لازم نیست.)

const VIEWS_KEY = 'zk_edu_views_v1';

export function hashViewsSeed(id: string): number {
  // FNV-1a + مرحلهٔ اختلاط نهایی تا شناسه‌های نزدیک به هم (مثل a1,a2,a3) اعداد کاملاً
  // پراکنده‌ای بگیرند، نه اعداد پشت‌سرهم.
  let h = 2166136261 >>> 0;
  const s = String(id || '');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  h ^= h >>> 13; h = Math.imul(h, 0x5bd1e995) >>> 0; h = (h ^ (h >>> 15)) >>> 0;
  h = (h ^ (h >>> 7)) >>> 0; h = Math.imul(h, 0x1b873593) >>> 0; h = (h ^ (h >>> 16)) >>> 0;
  return 30000 + (h % 30001); // ۳۰٬۰۰۰ تا ۶۰٬۰۰۰
}

/** عدد شروع نمایش‌داده‌شده برای یک محتوا */
export function viewsSeedOf(item: any): number {
  const v = Number(item?.viewsSeed);
  if (Number.isFinite(v) && v >= 0) return Math.round(v);
  return hashViewsSeed(String(item?.id || item?.title || item?.titleEn || ''));
}

export function loadRealViews(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function recordView(prev: Record<string, number>, id: string): Record<string, number> {
  const key = String(id || '');
  const next = { ...prev, [key]: (Number(prev[key]) || 0) + 1 };
  try { localStorage.setItem(VIEWS_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  return next;
}

/** بازدید کل = عدد شروع + بازدیدهای واقعی */
export function totalViews(item: any, real: number): number {
  return viewsSeedOf(item) + (Number(real) || 0);
}

export function formatViews(n: number, en: boolean): string {
  const num = (Number(n) || 0).toLocaleString(en ? 'en-US' : 'fa-IR');
  return en ? `${num} views` : `${num} بازدید`;
}
