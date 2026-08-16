/**
 * trustFont — محاسبه اندازه فونت پویا بر اساس طول کاراکتر
 *
 * برای باکس جملات اعتمادساز (TrustBoxNew) استفاده می‌شود.
 * هر چه متن طولانی‌تر باشد، فونت کوچک‌تر می‌شود تا در فضای محدود جای بگیرد.
 */

/**
 * محاسبه اندازه فونت عنوان
 * @param text متن عنوان
 * @param baseSize اندازه پایه (پیش‌فرض ۱۸)
 * @returns اندازه فونت بر حسب پیکسل
 */
export function getTrustTitleSize(text: string, baseSize: number = 18): number {
  const len = text.length;
  if (len <= 25) return baseSize + 4;
  if (len <= 40) return baseSize + 2;
  if (len <= 60) return baseSize;
  if (len <= 80) return baseSize - 2;
  if (len <= 100) return baseSize - 4;
  return baseSize - 6;
}

/**
 * محاسبه اندازه فونت توضیحات
 * @param text متن توضیحات
 * @param baseSize اندازه پایه (پیش‌فرض ۱۴)
 * @returns اندازه فونت بر حسب پیکسل
 */
export function getTrustDescSize(text: string, baseSize: number = 14): number {
  const len = text.length;
  if (len <= 30) return baseSize + 4;
  if (len <= 50) return baseSize + 2;
  if (len <= 70) return baseSize;
  if (len <= 100) return baseSize - 1;
  if (len <= 130) return baseSize - 2;
  return baseSize - 3;
}
