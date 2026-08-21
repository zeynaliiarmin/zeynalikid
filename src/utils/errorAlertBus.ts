// bus رویداد هشدار خطا — ارتباط بین کدهای غیر-React (توابع ماژولی مثل supabase.ts)
// و کامپوننت نمایش هشدار. triggerErrorAlert از هر جایی قابل فراخوانی است.
// منبع واحد پیام‌های هر بخش (فارسی/انگلیسی) — فقط نمایشی؛ هیچ تغییری در منطق ندارد.

export type ErrorAlertContext =
  | 'registration'   // ثبت دوره / ثبت مشاوره
  | 'receipt'        // آپلود فیش واریزی
  | 'tongue'         // آپلود عکس زبان (اجباری از پنل مدیریت)
  | 'tongueOptional' // آپلود عکس زبان (اختیاری — بدون نمایش شماره تماس)
  | 'review'         // ثبت نظر
  | 'question'       // سوالات متداول / سوال دارم
  | 'track'          // صفحه پیگیری
  | 'pdf';           // دانلود PDF

interface Copy { title: string; message: string; showPhone?: boolean; }

const PREVENT = 'برای جلوگیری از خطاهای بیشتر، لطفاً با پشتیبانی تماس بگیرید و این خطا را گزارش دهید.';
const PREVENT_EN = 'To help prevent further issues, please contact support and report this error.';

export const ERROR_ALERT_CONTENT: Record<ErrorAlertContext, { fa: Copy; en: Copy }> = {
  registration: {
    fa: {
      title: 'خطا در ثبت اطلاعات',
      message: `والدین زیادی روزانه ثبت درخواست مشاوره می‌دهند. ${PREVENT}`,
    },
    en: {
      title: 'Registration error',
      message: `Many parents register every day. ${PREVENT_EN}`,
    },
  },
  receipt: {
    fa: {
      title: 'خطا در بارگذاری فیش',
      message: `ثبت‌نام شما بدون فیش واریزی نهایی نمی‌شود و جایگاهتان در دوره ممکن است از دست برود. ${PREVENT}`,
    },
    en: {
      title: 'Receipt upload error',
      message: `Your enrollment can't be finalized without the payment receipt and you may lose your spot. ${PREVENT_EN}`,
    },
  },
  tongue: {
    fa: {
      title: 'خطا در بارگذاری عکس',
      message: `بدون عکس زبان، ارزیابی فرزندتان شروع نمی‌شود و برنامهٔ اختصاصی او به تأخیر می‌افتد. ${PREVENT}`,
    },
    en: {
      title: 'Photo upload error',
      message: `Without the tongue photo, your child's assessment can't begin and their personalized plan will be delayed. ${PREVENT_EN}`,
    },
  },
  tongueOptional: {
    fa: {
      title: 'خطا در بارگذاری عکس',
      message: 'عکس زبان را می‌توانید از طریق واتساپ یا روبیکا برای ما ارسال کنید؛ پس از اتمام مراحل ثبت‌نام دوره، برای جلوگیری از خطاهای بیشتر، لطفاً با پشتیبانی تماس بگیرید و این خطا را گزارش دهید.',
      showPhone: false,
    },
    en: {
      title: 'Photo upload error',
      message: "You can send the tongue photo to us via WhatsApp or Rubika. After completing your course registration, please contact support and report this error to help prevent further issues.",
      showPhone: false,
    },
  },
  review: {
    fa: {
      title: 'خطا در ثبت نظر',
      message: `نظر شما راهنمای صدها والد دیگر برای انتخاب درست است. ${PREVENT}`,
    },
    en: {
      title: 'Review error',
      message: `Your review guides hundreds of other parents toward the right choice. ${PREVENT_EN}`,
    },
  },
  question: {
    fa: {
      title: 'خطا در ثبت سوال',
      message: `کارشناسان ما هر روز به ده‌ها سوال والدین پاسخ می‌دهند؛ نگذارید سوال شما بی‌پاسخ بماند. ${PREVENT}`,
    },
    en: {
      title: 'Question error',
      message: `Our specialists answer dozens of parent questions every day — don't let yours go unanswered. ${PREVENT_EN}`,
    },
  },
  track: {
    fa: {
      title: 'مشکل در صفحه پیگیری',
      message: `وضعیت ثبت‌نام یا دورهٔ فرزندتان در چند ثانیه قابل بررسی است. ${PREVENT}`,
    },
    en: {
      title: 'Tracking error',
      message: `Your registration status can be checked in seconds. ${PREVENT_EN}`,
    },
  },
  pdf: {
    fa: {
      title: 'خطا در دانلود فایل',
      message: `این فایل برنامهٔ اختصاصی فرزند شماست و نباید از دست برود. ${PREVENT}`,
    },
    en: {
      title: 'Download error',
      message: `This file contains your child's personalized plan and shouldn't be missed. ${PREVENT_EN}`,
    },
  },
};

export interface ErrorAlertPayload {
  context: ErrorAlertContext;
  id: number;
}

type Listener = (p: ErrorAlertPayload) => void;
const listeners = new Set<Listener>();

let seq = 0;

/** نمایش هشدار خطا برای کاربر (فقط نمایشی — منطق ذخیرهٔ localStorage دست‌نخورده می‌ماند) */
export function triggerErrorAlert(context: ErrorAlertContext): void {
  try {
    const payload: ErrorAlertPayload = { context, id: ++seq };
    listeners.forEach((l) => {
      try { l(payload); } catch { /* بی‌صدا */ }
    });
  } catch { /* بی‌صدا */ }
}

/** اشتراک برای کامپوننت میزبان هشدار */
export function subscribeErrorAlerts(fn: Listener): () => void {
  listeners.add(fn);
  return () => { listeners.delete(fn); };
}
