/**
 * Payment Driver — زرین‌پال (Zarinpal)
 *
 * مستندات: https://docs.zarinpal.com/payment-terminal/rest-api/
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

interface ZarinpalRequestResponse {
  data: {
    authority: string;
    code: number;
    message?: string;
  };
  errors?: any;
}

interface ZarinpalVerifyResponse {
  data: {
    code: number;
    message: string;
    ref_id?: string;
    card_hash?: string;
    card_pan?: string;
    fee_type?: string;
    fee?: number;
  };
}

export class ZarinpalDriver implements PaymentDriver {
  private merchantId: string;
  private baseUrl: string;

  constructor(merchantId: string, sandbox: boolean = false) {
    this.merchantId = merchantId;
    this.baseUrl = sandbox
      ? 'https://sandbox.zarinpal.com/pg/v4'
      : 'https://api.zarinpal.com/pg/v4';
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/payment/request.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        amount: Math.round(amount),
        description: metadata.description || 'پرداخت دوره آموزشی',
        callback_url: metadata.callbackUrl || '',
        metadata: {
          userId: metadata.userId,
          courseId: metadata.courseId,
          email: metadata.userEmail || '',
          mobile: metadata.userPhone || '',
        },
      }),
    });

    const data: ZarinpalRequestResponse = await response.json();

    if (data.data.code === 100) {
      return {
        paymentUrl: `https://www.zarinpal.com/pg/StartPay/${data.data.authority}`,
        transactionId: data.data.authority,
        gateway: 'zarinpal',
      };
    } else {
      throw new Error(`Zarinpal error code ${data.data.code}: ${data.errors?.message || data.data.message || 'Unknown error'}`);
    }
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    const response = await fetch(`${this.baseUrl}/payment/verify.json`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        merchant_id: this.merchantId,
        authority: transactionId,
        amount: 0, // باید از دیتابیس خوانده شود
      }),
    });

    const result: ZarinpalVerifyResponse = await response.json();

    if (result.data.code === 100) {
      return {
        status: 'success',
        refId: result.data.ref_id,
        data: result.data,
      };
    } else if (result.data.code === 101) {
      return {
        status: 'pending',
        data: result.data,
      };
    } else {
      return {
        status: 'failed',
        data: result.data,
      };
    }
  }
}
