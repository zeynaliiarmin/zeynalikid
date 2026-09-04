// محاسبه خودکار مدت‌زمان مطالعه/تماشا/شنیدن محتوای آموزشی (مقاله/ویدیو/پادکست)
// — کاملاً خودکار؛ هیچ چیزی در دیتابیس ذخیره نمی‌شود.
// واحد نمایش: زیر ۶۰ ثانیه → «ثانیه»؛ از ۶۰ ثانیه به بالا → «دقیقه» (گردشده بدون ثانیه).

const CHARS_PER_MINUTE = 900; // سرعت مطالعه متعارف فارسی ≈ ۹۰۰ کاراکتر در دقیقه (با احتساب فاصله‌ها)

export function faNum(n: number): string {
  try { return n.toLocaleString('fa-IR'); } catch { return String(n); }
}

/** تعداد کاراکترهای واقعی (فاصله‌های اضافی فشرده می‌شوند) */
export function countTextChars(...texts: Array<string | null | undefined>): number {
  return texts.filter(Boolean).join(' ').replace(/\s+/g, ' ').trim().length;
}

/** زمان مطالعه یک متن به ثانیه */
export function readingSeconds(...texts: Array<string | null | undefined>): number {
  return countTextChars(...texts) / (CHARS_PER_MINUTE / 60);
}

/**
 * گرد کردن بدون ثانیه با آستانه ۳۰ ثانیه رو به پایین:
 * ۱:۲۹ → ۱ ، ۱:۳۰ → ۱ ، ۱:۳۱ → ۲ ، ۱:۵۰ → ۲
 */
export function roundToMinute(totalSeconds: number): number {
  const s = Math.max(0, Number(totalSeconds) || 0);
  return Math.max(1, Math.floor((s + 29) / 60));
}

/**
 * مدت‌زمان کل یک آیتم به ثانیه:
 * - مقاله: فقط زمان مطالعه متن
 * - ویدیو/ویس: مدت واقعی رسانه + زمان مطالعه توضیحات
 * @param detectedMediaSeconds مدت واقعی فایل (اگر قابل تشخیص باشد) — از useMediaDuration
 */
export function computeDurationSeconds(item: any, detectedMediaSeconds = 0): number {
  const type = item?.type || 'text';
  if (type === 'article' || type === 'text' || type === 'image') {
    return readingSeconds(item?.body, item?.description, item?.desc);
  }
  const descSeconds = readingSeconds(item?.description, item?.descriptionCourses, item?.desc);
  const storedSeconds = (Number(item?.minutes) || 0) * 60; // مدت ثبت‌شده ادمین (دقیقه)
  const mediaSeconds = (Number(detectedMediaSeconds) > 0) ? Number(detectedMediaSeconds) : storedSeconds;
  return mediaSeconds + descSeconds;
}

/** مدت‌زمان کل به دقیقه (گردشده) — برای سازگاری */
export function computeDurationMinutes(item: any, detectedMediaSeconds = 0): number {
  return roundToMinute(computeDurationSeconds(item, detectedMediaSeconds));
}

const unitLabel = (type: string, unit: string, lang: string, kind: 'study' | 'watch' | 'listen') => {
  if (lang === 'en') {
    const k = kind === 'study' ? 'read' : kind === 'watch' ? 'watch' : 'listen';
    return `${unit} ${k}`;
  }
  const k = kind === 'study' ? 'مطالعه' : kind === 'watch' ? 'تماشا' : 'شنیدن';
  return `${unit} ${k}`;
};

/**
 * برچسب نمایشی مدت‌زمان:
 * - زیر ۶۰ ثانیه → «X ثانیه»
 * - ۶۰ ثانیه و بیشتر → «X دقیقه» (گردشده، بدون ثانیه)
 * - صفر (بدون داده) → «۱ دقیقه» به‌عنوان مقدار پیش‌فرض ملایم
 */
export function formatDuration(type: string, totalSeconds: number, lang: string): string {
  if (type === 'image') return lang === 'en' ? 'Photo' : 'تصویر';
  const kind: 'study' | 'watch' | 'listen' = (type === 'article' || type === 'text') ? 'study' : type === 'video' ? 'watch' : 'listen';
  const s = Math.max(0, Number(totalSeconds) || 0);
  if (s <= 0) {
    return unitLabel(type, lang === 'en' ? '1 min' : '۱ دقیقه', lang, kind);
  }
  if (s < 60) {
    const sec = Math.max(1, Math.round(s));
    return unitLabel(type, lang === 'en' ? `${sec} sec` : `${faNum(sec)} ثانیه`, lang, kind);
  }
  const m = roundToMinute(s);
  return unitLabel(type, lang === 'en' ? `${m} min` : `${faNum(m)} دقیقه`, lang, kind);
}

/** برچسب دقیقه‌ای (نسخه ساده قدیمی — برای سازگاری) */
export function formatDurationMinutes(type: string, minutes: number, lang: string): string {
  if (type === 'image') return lang === 'en' ? 'Photo' : 'تصویر';
  const m = faNum(minutes);
  if (lang === 'en') {
    return (type === 'article' || type === 'text') ? `${m} min read`
      : type === 'video' ? `${m} min watch`
      : `${m} min listen`;
  }
  return (type === 'article' || type === 'text') ? `${m} دقیقه مطالعه`
    : type === 'video' ? `${m} دقیقه تماشا`
    : `${m} دقیقه شنیدن`;
}
