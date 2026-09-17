/**
 * lazyWithRetry — لایهٔ محافظ برای بارگذاریِ تدریجیِ صفحات (React.lazy)
 *
 * چرا لازم است؟
 *   بعد از هر انتشارِ جدید، نام فایل‌هایِ جاوااسکریپت (chunk) عوض می‌شود. اگر کاربر — یا
 *   رباتِ گوگل — نسخهٔ قدیمیِ صفحه را باز کند، مرورگر چانکِ حذف‌شده را می‌خواهد و بارگذاری
 *   شکست می‌خورد. نتیجه: صفحه خطا نشان می‌دهد و گوگل آن را ایندکس نمی‌کند
 *   (وضعیتِ «Crawled - currently not indexed»).
 *
 * چه می‌کند؟
 *   ۱) چند بار بارگذاری را دوباره تلاش می‌کند؛
 *   ۲) اگر واقعاً چانک در دسترس نبود، یک بار صفحه را تازه می‌کند (فقط یک بار، تا چرخه
 *      بی‌انتها نسازد)؛
 *   ۳) خطاهایِ واقعیِ برنامه را دست‌نخورده بالا می‌فرستد تا پنهان نشوند.
 */
import { lazy, type ComponentType } from 'react';

/** کلیدِ نگهداریِ وضعیتِ «امروز یک بار رفرش دادیم» — فقط در همین نشستِ مرورگر */
const RELOAD_GUARD_KEY = 'zk:chunk-reload-guard';
/** چند بار تلاشِ دوباره پیش از رفرش */
const MAX_RETRIES = 2;

const wait = (ms: number): Promise<void> => new Promise((resolve) => { setTimeout(resolve, ms); });

/** تشخیصِ خطایِ «چانک پیدا نشد» از خطایِ واقعیِ برنامه */
function isChunkLoadError(error: unknown): boolean {
  const message = String((error as { message?: unknown })?.message ?? error ?? '');
  return (
    /Failed to fetch dynamically imported module/i.test(message) ||
    /Importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /Cannot read properties of undefined \(reading 'default'\)/i.test(message) ||
    /ChunkLoadError/i.test(message) ||
    /Loading chunk \d+ failed/i.test(message)
  );
}

function guardRead(): string | null {
  try { return window.sessionStorage.getItem(RELOAD_GUARD_KEY); } catch { return null; }
}

function guardWrite(): void {
  try { window.sessionStorage.setItem(RELOAD_GUARD_KEY, String(Date.now())); } catch { /* بی‌صدا */ }
}

function guardClear(): void {
  try { window.sessionStorage.removeItem(RELOAD_GUARD_KEY); } catch { /* بی‌صدا */ }
}

/**
 * همان React.lazy، اما با تلاشِ دوباره و رفرشِ یک‌باره در صورت نبودِ چانک.
 * @param factory تابعِ واردکنندهٔ صفحه، مثلاً `() => import('../pages/HomePage')`
 */
export default function lazyWithRetry<T extends ComponentType<unknown>>(
  factory: () => Promise<{ default: T }>,
) {
  return lazy(async () => {
    let lastError: unknown;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt += 1) {
      try {
        const module = await factory();
        // بارگذاری موفق بود → اجازهٔ رفرش برای انتشارِ بعدی آزاد می‌شود
        guardClear();
        return module;
      } catch (error) {
        lastError = error;
        // خطایِ برنامه ربطی به چانک ندارد → تلاشِ بی‌فایده ممنوع
        if (!isChunkLoadError(error)) break;
        await wait(300 * (attempt + 1));
      }
    }

    // چانک واقعاً در دسترس نیست (معمولاً انتشارِ جدید) → یک بار رفرشِ خودکار
    if (!guardRead()) {
      guardWrite();
      try {
        window.location.reload();
      } catch {
        /* بی‌صدا */
      }
      // فرصت بده رفرش انجام شود؛ اگر نشد، خطا را بالا بفرست تا ErrorBoundary نمایش دهد
      await wait(4000);
    }

    throw lastError instanceof Error ? lastError : new Error(String(lastError));
  });
}
