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
      message: 'فیش واریزی شما بارگذاری نشد. لطفاً تصویر فیش را از طریق پیامک یا واتساپ به شماره پشتیبانی ارسال کنید و موضوع را گزارش دهید.',
    },
    en: {
      title: 'Receipt upload error',
      message: 'Your payment receipt could not be uploaded. Please send the receipt image to our support number via SMS or WhatsApp and report the issue.',
    },
  },
  tongue: {
    fa: {
      title: 'خطا در بارگذاری عکس',
      message: 'عکس زبان فرزند شما بارگذاری نشد. برای تکمیل ثبت، لطفاً با پشتیبانی تماس بگیرید و مشکل را گزارش دهید.',
    },
    en: {
      title: 'Photo upload error',
      message: "Your child's tongue photo could not be uploaded. Please contact support to complete your registration and report the issue.",
    },
  },
  review: {
    fa: {
      title: 'خطا در ثبت نظر',
      message: 'نظر شما ثبت نشد. لطفاً با پشتیبانی تماس بگیرید و مشکل را گزارش دهید.',
    },
    en: {
      title: 'Review error',
      message: 'Your review could not be submitted. Please contact support and report the issue.',
    },
  },
  question: {
    fa: {
      title: 'خطا در ثبت سوال',
      message: 'سوال شما ثبت نشد. لطفاً با پشتیبانی تماس بگیرید و مشکل را گزارش دهید.',
    },
    en: {
      title: 'Question error',
      message: 'Your question could not be submitted. Please contact support and report the issue.',
    },
  },
  track: {
    fa: {
      title: 'مشکل در صفحه پیگیری',
      message: 'در ورود به صفحه پیگیری مشکلی پیش آمد. لطفاً با پشتیبانی تماس بگیرید و مشکل را گزارش دهید.',
    },
    en: {
      title: 'Tracking error',
      message: 'Something went wrong while opening the tracking page. Please contact support and report the issue.',
    },
  },
  pdf: {
    fa: {
      title: 'خطا در دانلود فایل',
      message: 'دانلود فایل انجام نشد. لطفاً با پشتیبانی تماس بگیرید تا فایل برای شما ارسال شود.',
    },
    en: {
      title: 'Download error',
      message: 'The file download failed. Please contact support and we will send the file to you.',
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
