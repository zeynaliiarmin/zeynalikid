/**
 * Payment Driver — بلوبانک / بانک سامان (Blubank)
 *
 * بلوبانک از طریق وب‌هوک (Webhook) یا لینک پرداخت (فاکتور دیجیتال) کار می‌کند.
 * برای اتصال رسمی باید با پشتیبانی بلوبانک تماس بگیرید و Merchant Code دریافت کنید.
 * این درایور یک نمونه اولیه (Skeleton) است و نیاز به تنظیمات دقیق API بلوبانک دارد.
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

export class BlubankDriver implements PaymentDriver {
  private merchantCode: string;
  private terminalCode: string;

  constructor(merchantCode: string, terminalCode: string) {
    this.merchantCode = merchantCode;
    this.terminalCode = terminalCode;
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    // ─── نمونه ساختاری — API واقعی بلوبانک نیاز به تنظیمات اختصاصی دارد ───
    //
    // const invoiceData = {
    //   merchantCode: this.merchantCode,
    //   terminalCode: this.terminalCode,
    //   amount: Math.round(amount),
    //   callbackUrl: metadata.callbackUrl || '',
    //   description: metadata.description || 'پرداخت دوره',
    //   customData: {
    //     userId: metadata.userId,
    //     courseId: metadata.courseId,
    //   },
    // };
    //
    // const response = await fetch('https://api.blubank.com/v1/payment/invoice', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(invoiceData),
    // });

    // نمونه اولیه — لینک ساختگی
    return {
      paymentUrl: `https://pay.blubank.com/pay/${this.merchantCode}/${Date.now()}`,
      transactionId: `blu_${Date.now()}`,
      gateway: 'blubank',
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    // ─── تأیید از طریق وب‌هوک یا API بلوبانک ───
    //
    // const response = await fetch(`https://api.blubank.com/v1/payment/verify/${transactionId}`);
    // const data = await response.json();

    // نمونه اولیه
    return {
      status: 'success',
      refId: transactionId,
      data: { message: 'Payment verified (skeleton)' },
    };
  }
}
