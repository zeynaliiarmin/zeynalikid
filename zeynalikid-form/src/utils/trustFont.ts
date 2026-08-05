/**
 * محاسبه اندازه فونت پویا برای جملات اعتمادساز بر اساس تعداد کاراکترها
 * جملات کوتاه‌تر → فونت بزرگ‌تر | جملات بلندتر → فونت کوچک‌تر
 *
 * @param text  متن جمله
 * @param base  اندازه پایه فونت (پیش‌فرض 16)
 * @returns     اندازه فونت مناسب به پیکسل
 */
export function getTrustFontSize(text: string, base: number = 16): number {
  const len = text.length;
  if (len <= 30) return base + 4;   // جملات خیلی کوتاه → بزرگ‌تر
  if (len <= 50) return base + 2;
  if (len <= 80) return base;
  if (len <= 120) return base - 2;
  return base - 4;                   // جملات خیلی بلند → کوچک‌تر
}

/**
 * نسخه‌ی اندازه فونت برای عنوان TrustRotator (معمولاً کمی بزرگ‌تر از توضیحات)
 */
export function getTrustTitleSize(text: string, base: number = 16): number {
  const len = text.length;
  if (len <= 25) return base + 5;
  if (len <= 45) return base + 3;
  if (len <= 70) return base + 1;
  if (len <= 100) return base - 1;
  return base - 3;
}

/**
 * نسخه‌ی اندازه فونت برای توضیحات TrustRotator (معمولاً کوچک‌تر از عنوان)
 */
export function getTrustDescSize(text: string, base: number = 14): number {
  const len = text.length;
  if (len <= 35) return base + 2;
  if (len <= 60) return base + 1;
  if (len <= 90) return base;
  if (len <= 130) return base - 1;
  return base - 2;
}
