// bus رویداد هشدار خطا — ارتباط بین کدهای غیر-React (توابع ماژولی مثل supabase.ts)
// و کامپوننت نمایش هشدار. triggerErrorAlert از هر جایی قابل فراخوانی است.
// منبع واحد پیام‌های هر بخش (فارسی/انگلیسی) — فقط نمایشی؛ هیچ تغییری در منطق ندارد.

export type ErrorAlertContext =
  | 'registration'   // ثبت دوره / ثبت مشاوره
  | 'receipt'        // آپلود فیش واریزی
  | 'tongue'         // آپلود عکس زبان
  | 'review'         // ثبت نظر
  | 'question'       // سوالات متداول / سوال دارم
  | 'track'          // صفحه پیگیری
  | 'pdf';           // دانلود PDF

interface Copy { title: string; message: string; }

export const ERROR_ALERT_CONTENT: Record<ErrorAlertContext, { fa: Copy; en: Copy }> = {
  registration: {
    fa: {
      title: 'خطا در ثبت اطلاعات',
      message: 'والدین زیادی روزانه ثبت درخواست مشاوره می‌دهند، لطفاً با گزارش این خطا به پشتیبانی از خطاهای بیشتر جلوگیری کنید.',
    },
    en: {
      title: 'Registration error',
      message: 'Many parents register every day. Please report this error to our support team to help prevent further issues.',
    },
  },
  receipt: {
    fa: {
      title: 'خطا در بارگذاری فیش',
      message: 'ثبت‌نام شما بدون فیش واریزی نهایی نمی‌شود و جایگاهتان در دوره ممکن است از دست برود؛ همین حالا فیش را از طریق پیامک یا واتساپ برای پشتیبانی ارسال کنید تا ثبت‌نامتان کامل شود.',
    },
    en: {
      title: 'Receipt upload error',
      message: "Your enrollment can't be finalized without the payment receipt and you may lose your spot. Send the receipt to our support number via SMS or WhatsApp right away to complete your registration.",
    },
  },
  tongue: {
    fa: {
      title: 'خطا در بارگذاری عکس',
      message: 'بدون عکس زبان، ارزیابی فرزندتان شروع نمی‌شود و برنامهٔ اختصاصی او به تأخیر می‌افتد؛ با یک تماس کوتاه با پشتیبانی، ثبت عکس را کامل کنید.',
    },
    en: {
      title: 'Photo upload error',
      message: "Without the tongue photo, your child's assessment can't begin and their personalized plan will be delayed. Call support to complete the photo upload.",
    },
  },
  review: {
    fa: {
      title: 'خطا در ثبت نظر',
      message: 'نظر شما راهنمای صدها والد دیگر برای انتخاب درست است؛ برای اینکه تجربهٔ شما به آن‌ها کمک کند، همین حالا با پشتیبانی تماس بگیرید.',
    },
    en: {
      title: 'Review error',
      message: 'Your review guides hundreds of other parents toward the right choice. Call support so your experience can help them too.',
    },
  },
  question: {
    fa: {
      title: 'خطا در ثبت سوال',
      message: 'کارشناسان ما هر روز به ده‌ها سوال والدین پاسخ می‌دهند؛ نگذارید سوال شما بی‌پاسخ بماند — همین حالا با پشتیبانی تماس بگیرید.',
    },
    en: {
      title: 'Question error',
      message: "Our specialists answer dozens of parent questions every day. Don't let yours go unanswered — call support now.",
    },
  },
  track: {
    fa: {
      title: 'مشکل در صفحه پیگیری',
      message: 'وضعیت ثبت‌نام یا دورهٔ فرزندتان در چند ثانیه قابل بررسی است؛ همین حالا با پشتیبانی تماس بگیرید تا کارشناس وضعیت را برایتان اعلام کند.',
    },
    en: {
      title: 'Tracking error',
      message: "Your registration status can be checked in seconds. Call support and our specialist will confirm it for you right away.",
    },
  },
  pdf: {
    fa: {
      title: 'خطا در دانلود فایل',
      message: 'این فایل برنامهٔ اختصاصی فرزند شماست و نباید از دست برود؛ برای دریافت فوری و جلوگیری از تأخیر در شروع برنامه، با پشتیبانی تماس بگیرید.',
    },
    en: {
      title: 'Download error',
      message: "This file contains your child's personalized plan and shouldn't be missed. Call support to receive it immediately and avoid any delay.",
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
