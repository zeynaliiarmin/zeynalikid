// src/lib/courseFlow.ts
// Stage-2 refactor: ثابت‌ها و توابع کمکی روند ثبت دوره که قبلاً به‌صورت inline
// در App.tsx تعریف شده بودند. این فایل هیچ React stateی ندارد — همه توابع
// پارامترهای صریح می‌گیرند و pure/helper هستند؛ توابعی که setState را صدا
// می‌کنند (chooseDest و finalizeCourseRegistration) فعلاً در App.tsx می‌مانند.

import { p2e } from '../app/appSupport';

/** مدت زمان تایمر ۱۵ دقیقه‌ای روند ثبت دوره (میلی‌ثانیه). */
export const COURSE_TIMER_MS = 15 * 60 * 1000;

/** نما‌هایی که تایمر ثبت دوره در آن‌ها فعال است.
 *  خروج از این نماها (به‌جز payment-verify و course-done) به‌معنی رها کردن
 *  ناقص روند است. */
export const TIMER_VIEWS = ['child-info', 'course-shipping', 'course-payment', 'course-confirm'] as const;

/** نمایانگر حالت‌هایی که پس از آن روند تکمیل شده تلقی می‌شود و تایمر نباید
 *  فرم را ناقص mark کند. */
export const FLOW_COMPLETE_VIEWS = ['course-done', 'payment-verify'] as const;

/**
 * متن تخمین زمان تحویل بر اساس مقصد، شهر، و روش ارسال.
 * این تابع هیچ setStateی انجام نمی‌دهد و صرفاً رشته خروجی را برمی‌گرداند.
 */
export function buildDeliveryText(params: {
  dest: string;
  shippingMethod: string | number;
  city: string;
  optionalSendDate: string;
  delivery: {
    iranFastText: string;
    iranOtherText: string;
    intlText: string;
    iranFastCities: string[];
  };
  trVal: (s: unknown) => string;
  publicText: (key: string, fb: string) => string;
  lang: 'fa' | 'en';
}): string {
  const { dest, shippingMethod, city, delivery, trVal, publicText, lang } = params;
  if (!dest) {
    return `${trVal(delivery.iranFastText)} / ${trVal(delivery.iranOtherText)} / ${trVal(delivery.intlText)}`;
  }
  if (dest === 'intl') return trVal(delivery.intlText);
  if (String(shippingMethod) === 'mahaks') {
    return lang === 'en' ? '48-hour delivery' : 'تحویل ۴۸ ساعته';
  }
  const cityTrim = String(city || '').trim();
  if (!cityTrim) return publicText('deliveryAddressRequired', 'برای تخمین زمان تحویل، ابتدا باید قسمت آدرس تکمیل شود.');
  return delivery.iranFastCities.some((x: string) => cityTrim.includes(x))
    ? trVal(delivery.iranFastText)
    : trVal(delivery.iranOtherText);
}

/**
 * اعتبارسنجی فیلد «تاریخ ارسال دلخواه». برای ایران انتظار تاریخ شمسی
 * (14xx/mm/dd) و برای خارج از ایران انتظار تاریخ میلادی (20xx/mm/dd) را دارد.
 * در صورت معتبر بودن رشته خالی و در غیر این صورت پیام خطا برمی‌گرداند.
 */
export function validateOptionalSendDate(params: {
  dateValue: string;
  dest: string;
  trVal: (s: string) => string;
}): string {
  const s = p2e(params.dateValue).trim();
  if (!s) return '';
  if (params.dest === 'iran') {
    return /^14\d{2}[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])$/.test(s)
      ? ''
      : params.trVal('برای مقصد ایران فقط تاریخ شمسی مانند 1403/05/20 وارد کنید');
  }
  return /^20\d{2}[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])$/.test(s)
    ? ''
    : params.trVal('برای خارج از ایران فقط تاریخ میلادی مانند 2026/08/20 وارد کنید');
}
