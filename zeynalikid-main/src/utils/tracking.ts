// کد پیگیری: ZK + N رقم (پیش‌فرض ۵ رقم — قابل تنظیم از پنل مدیریت با trackingDigitCount)
// کدهای قدیمی (ZK-XXXXXX هگز و ZK1234 چهاررقمی) همچنان برای جستجو معتبرند (Backward Compatibility).

/**
 * تولید کد پیگیری با تعداد ارقام مشخص
 * @param digitCount - تعداد ارقام (پیش‌فرض: ۵)
 * @returns کد پیگیری با فرمت ZK[عدد]
 */
// اصلاح ۳ (مرحله ۶): عدد ۶۳۹ به‌عنوان ورودی مخفی ورود ادمین رزرو شده است؛
// اگر تولید تصادفی دقیقاً برابر «639» بود (فقط زمانی ممکن است که digitCount=3 باشد)، دوباره تولید می‌شود.
export const generateTrackingCode = (digitCount: number = 5): string => {
  const min = Math.pow(10, digitCount - 1);
  const max = Math.pow(10, digitCount) - 1;
  let num = '';
  do {
    num = String(Math.floor(min + Math.random() * (max - min + 1)));
  } while (num === '639');
  return `ZK${num}`;
};

/** استخراج بخش عددی/بدنه از کد پیگیری */
export const extractTrackingNumber = (code: string): string => {
  return String(code || '').replace(/^ZK-?/i, '');
};

/** اعتبارسنجی کد پیگیری با تعداد ارقام مشخص */
export const isValidTrackingCode = (code: string, digitCount: number = 5): boolean => {
  const num = extractTrackingNumber(code);
  if (!num) return false;
  if (num.length !== digitCount) return false;
  return /^\d+$/.test(num);
};

/** اعتبارسنجی همه فرمت‌های پشتیبانی‌شده: ZK + ۴ تا ۸ رقم یا فرمت قدیمی ZK-XXXXXX */
export const isAnyValidTrackingCode = (code: string): boolean =>
  /^ZK\d{4,8}$/.test(code) || /^ZK-[A-F0-9]{6}$/.test(code);

/** نرمال‌سازی ورودی کاربر → کد استاندارد */
export const normalizeTrackingCode = (input: string): string => {
  const raw = String(input || '').trim().toUpperCase().replace(/\s+/g, '');
  const body = raw.replace(/^ZK-?/, '');
  if (/^\d{4,8}$/.test(body)) return `ZK${body}`;
  if (/^[A-F0-9]{6}$/.test(body)) return `ZK-${body}`;
  return raw;
};

/** بررسی یکتایی کد پیگیری در لیست کدهای موجود */
export const isTrackingCodeUnique = (code: string, existingCodes: string[]): boolean => {
  return !existingCodes.includes(code);
};

/** تولید کد پیگیری یکتا با تعداد ارقام مشخص */
export const generateUniqueTrackingCode = (existingCodes: string[], digitCount: number = 5): string => {
  let attempts = 0;
  const maxAttempts = 100;
  let code = '';
  do {
    code = generateTrackingCode(digitCount);
    attempts++;
  } while (!isTrackingCodeUnique(code, existingCodes) && attempts < maxAttempts);
  return code;
};
