// کلاینت فانکشن user-portal — ثبت‌نام / تأیید کد / ورود / تاریخچهٔ کاربر
// الگوی فراخوانی دقیقاً مثل بقیهٔ فانکشن‌های عمومی پروژه (create-submission و track-submission)

const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '');

interface PortalResponse {
  ok?: boolean;
  error?: string;
  [key: string]: any;
}

const call = async (action: string, payload: Record<string, unknown>): Promise<PortalResponse> => {
  const response = await fetch(`${base}/functions/v1/user-portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...payload }),
  });
  const data: PortalResponse = await response.json().catch(() => ({}));
  if (!response.ok || !data.ok) throw new Error(data?.error || 'ارتباط با سرور برقرار نشد؛ اینترنت یا VPN را بررسی کنید.');
  return data;
};

/** مرحله ۱ ثبت‌نام: اعتبارسنجی نام/شماره + ارسال کد تأیید (تست/واقعی) */
export const portalStart = (fullName: string, phone: string, captchaToken?: string, referralCode?: string): Promise<PortalResponse> =>
  call('start', { fullName, phone, captchaToken, referralCode });

/** مرحله ۲: تأیید کد پیامکی → کد پیگیری یکپارچه برای کاربر ساخته/به‌ارث می‌رسد */
export const portalConfirm = (phone: string, otp: string): Promise<PortalResponse> =>
  call('confirm', { phone, otp });

/** پیش‌نمایش ماسک‌شدهٔ شماره ثبت‌شده با کد پیگیری — فقط رقم‌های ماسک‌خورده برمی‌گردد */
export const portalPhonePreview = (code: string): Promise<PortalResponse> =>
  call('preview-phone', { code });

/** ورود با شماره تماس + کد پیگیری (مثل صفحه پیگیری، ولی در پنل کاربر) */
export const portalLogin = (phone: string, code: string, captchaToken?: string): Promise<PortalResponse> =>
  call('login', { phone, code, captchaToken });

/** تاریخچهٔ دوره‌ها و مشاوره‌های کاربر */
export const portalHistory = (phone: string, code: string): Promise<PortalResponse> =>
  call('history', { phone, code });

/** ویرایش محدود اطلاعات ثبت‌شده از پنل کاربر (با ثبت نسخهٔ قبلی برای پنل متخصص) */
export const portalUpdateInfo = (phone: string, code: string, id: string, fields: Record<string, string>): Promise<PortalResponse> =>
  call('update-info', { phone, code, id, fields });
