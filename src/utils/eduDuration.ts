// محاسبهٔ خودکار مدت‌زمان مطالعه/تماشا/شنیدن محتوای آموزشی (مقاله/ویدیو/پادکست)
// — کاملاً خودکار؛ هیچ چیزی در دیتابیس ذخیره نمی‌شود.

const CHARS_PER_MINUTE = 900; // سرعت مطالعهٔ متعارف فارسی ≈ ۹۰۰ کاراکتر در دقیقه (با احتساب فاصله‌ها)

export function faNum(n: number): string {
  try { return n.toLocaleString('fa-IR'); } catch { return String(n); }
}

/** تعداد کاراکترهای واقعی (فاصله‌های اضافی فشرده می‌شوند) */
export function countTextChars(...texts: Array<string | null | undefined>): number {
  return texts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().length;
}

/** زمان مطالعهٔ یک متن به ثانیه */
export function readingSeconds(...texts: Array<string | null | undefined>): number {
  return countTextChars(...texts) / (CHARS_PER_MINUTE / 60);
}

/**
 * گرد کردن بدون ثانیه با آستانهٔ ۳۰ ثانیه رو به پایین:
 * ۱:۲۹ → ۱ ، ۱:۳۰ → ۱ ، ۱:۳۱ → ۲ ، ۱:۵۰ → ۲
 */
export function roundToMinute(totalSeconds: number): number {
  const s = Math.max(0, Number(totalSeconds) || 0);
  return Math.max(1, Math.floor((s + 29) / 60));
}

/**
 * مدت‌زمان کل یک آیتم (به دقیقه، گردشده):
 * - مقاله: فقط زمان مطالعهٔ متن
 * - ویدیو/ویس: مدت واقعی رسانه + زمان مطالعهٔ توضیحات
 * @param detectedMediaSeconds مدت واقعی فایل (اگر قابل تشخیص باشد) — از useMediaDuration
 */
export function computeDurationMinutes(item: any, detectedMediaSeconds = 0): number {
  const type = item?.type || 'text';
  if (type === 'text') {
    return roundToMinute(readingSeconds(item?.body, item?.description, item?.desc));
  }
  const descSeconds = readingSeconds(item?.description, item?.descriptionCourses, item?.desc);
  const storedSeconds = (Number(item?.minutes) || 0) * 60; // مدت ثبت‌شدهٔ ادمین (دقیقه)
  const mediaSeconds = (Number(detectedMediaSeconds) > 0) ? Number(detectedMediaSeconds) : storedSeconds;
  return roundToMinute(mediaSeconds + descSeconds);
}

/** برچسب نمایشی مدت‌زمان */
export function formatDurationMinutes(type: string, minutes: number, lang: string): string {
  const m = faNum(minutes);
  if (lang === 'en') {
    return type === 'text' ? `${m} min read`
      : type === 'video' ? `${m} min watch`
      : type === 'image' ? 'Photo'
      : `${m} min listen`;
  }
  return type === 'text' ? `${m} دقیقه مطالعه`
    : type === 'video' ? `${m} دقیقه تماشا`
    : type === 'image' ? 'تصویر'
    : `${m} دقیقه شنیدن`;
}
