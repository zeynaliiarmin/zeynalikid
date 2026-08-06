/**
 * Payment Driver — آیدی‌پی (IDPay)
 *
 * مستندات: https://idpay.ir/web-service/v1.1/docs/
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

export class IDPayDriver implements PaymentDriver {
  private apiKey: string;
  private sandbox: boolean;

  constructor(apiKey: string, sandbox: boolean = false) {
    this.apiKey = apiKey;
    this.sandbox = sandbox;
  }

  private get baseUrl(): string {
    return 'https://api.idpay.ir/v1.1';
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
        'X-SANDBOX': this.sandbox ? '1' : '0',
      },
      body: JSON.stringify({
        order_id: metadata.orderId || `order_${Date.now()}`,
        amount: Math.round(amount),
        name: metadata.userName || 'کاربر',
        desc: metadata.description || 'پرداخت دوره آموزشی',
        callback: metadata.callbackUrl || '',
        mail: metadata.userEmail || '',
        phone: metadata.userPhone || '',
      }),
    });

    const data = await response.json();

    if (data.id) {
      return {
        paymentUrl: data.link || `${this.baseUrl}/payment/${data.id}`,
        transactionId: data.id,
        gateway: 'idpay',
      };
    } else {
      throw new Error(`IDPay error ${data.error_code || ''}: ${data.error_message || 'Unknown error'}`);
    }
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    const response = await fetch(`${this.baseUrl}/payment/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-KEY': this.apiKey,
        'X-SANDBOX': this.sandbox ? '1' : '0',
      },
      body: JSON.stringify({
        id: transactionId,
        order_id: '', // باید از دیتابیس خوانده شود
      }),
    });

    const data = await response.json();

    // status 10 = موفقیت، 1 و 2 = در انتظار، سایر = خطا
    if (data.status === 10) {
      return {
        status: 'success',
        refId: data.id,
        data,
      };
    } else if (data.status === 1 || data.status === 2) {
      return {
        status: 'pending',
        data,
      };
    } else {
      return {
        status: 'failed',
        data,
      };
    }
  }
}
