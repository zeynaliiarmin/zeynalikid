/**
 * Payment System — Base Driver Interface
 *
 * این فایل اینترفیس‌های اصلی سیستم پرداخت چنددرگاهی را تعریف می‌کند.
 * هر درایور پرداخت باید اینترفیس PaymentDriver را پیاده‌سازی کند.
 */

// ─── نتیجه ایجاد تراکنش ───
export interface PaymentResult {
  /** لینک پرداخت که کاربر به آن هدایت می‌شود */
  paymentUrl: string;
  /** شناسه منحصر به فرد تراکنش */
  transactionId: string;
  /** نام درگاه پرداخت */
  gateway: string;
}

// ─── نتیجه تأیید تراکنش ───
export interface VerifyResult {
  /** وضعیت نهایی تراکنش */
  status: 'success' | 'failed' | 'pending';
  /** شناسه مرجع (RefID) — مخصوصاً برای درگاه‌های ایرانی */
  refId?: string;
  /** داده‌های اضافی از پاسخ درگاه */
  data?: Record<string, any>;
}

// ─── متادیتای پرداخت ───
export interface PaymentMetadata {
  /** شناسه کاربر */
  userId?: string;
  /** شناسه دوره */
  courseId?: string;
  /** شناسه سفارش */
  orderId?: string;
  /** توضیحات تراکنش */
  description?: string;
  /** آدرس بازگشت (callback) */
  callbackUrl?: string;
  /** نام کاربر */
  userName?: string;
  /** شماره تلفن کاربر */
  userPhone?: string;
  /** ایمیل کاربر */
  userEmail?: string;
  /** فیلدهای سفارشی اضافی */
  [key: string]: any;
}

// ─── اینترفیس درایور پرداخت ───
export interface PaymentDriver {
  /** ایجاد تراکنش و دریافت لینک پرداخت */
  createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult>;

  /** تأیید تراکنش پس از بازگشت از درگاه */
  verifyPayment(transactionId: string): Promise<VerifyResult>;

  /** بررسی وضعیت تراکنش (اختیاری) */
  getTransactionStatus?(transactionId: string): Promise<VerifyResult>;
}
