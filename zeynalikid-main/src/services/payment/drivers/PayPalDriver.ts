/**
 * Payment Driver — PayPal
 *
 * مستندات: https://developer.paypal.com/api/rest/
 *
 * توجه: برای استفاده واقعی نیاز به نصب پکیج @paypal/checkout-server-sdk است.
 * این درایور یک نمونه اولیه (Skeleton) است.
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

export class PayPalDriver implements PaymentDriver {
  private clientId: string;
  private clientSecret: string;
  private sandbox: boolean;

  constructor(clientId: string, clientSecret: string, sandbox: boolean = true) {
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.sandbox = sandbox;
  }

  private get baseUrl(): string {
    return this.sandbox
      ? 'https://api-m.sandbox.paypal.com'
      : 'https://api-m.paypal.com';
  }

  /** دریافت Access Token از PayPal */
  private async getAccessToken(): Promise<string> {
    const auth = btoa(`${this.clientId}:${this.clientSecret}`);

    const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const data = await response.json();
    return data.access_token || '';
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    // ─── PayPal Orders API v2 ───
    //
    // const token = await this.getAccessToken();
    // const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //   },
    //   body: JSON.stringify({
    //     intent: 'CAPTURE',
    //     purchase_units: [{
    //       amount: { currency_code: 'USD', value: (amount / 100).toFixed(2) },
    //       description: metadata.description || 'Course payment',
    //       custom_id: metadata.orderId,
    //     }],
    //     application_context: {
    //       return_url: metadata.callbackUrl || '',
    //       cancel_url: metadata.callbackUrl || '',
    //     },
    //   }),
    // });
    //
    // const order = await response.json();
    // const approveLink = order.links?.find((l: any) => l.rel === 'approve');

    // نمونه اولیه — نیاز به تکمیل در بک‌اند
    return {
      paymentUrl: `https://www.paypal.com/checkoutnow?token=${metadata.orderId || 'EC-test'}`,
      transactionId: `paypal_${Date.now()}`,
      gateway: 'paypal',
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    // ─── Capture و بررسی Order ───
    //
    // const token = await this.getAccessToken();
    // const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${transactionId}/capture`, {
    //   method: 'POST',
    //   headers: {
    //     'Content-Type': 'application/json',
    //     'Authorization': `Bearer ${token}`,
    //   },
    // });
    //
    // const capture = await response.json();
    // if (capture.status === 'COMPLETED') {
    //   return { status: 'success', refId: transactionId, data: capture };
    // }

    // نمونه اولیه
    return {
      status: 'success',
      refId: transactionId,
      data: { message: 'Payment verified (skeleton)' },
    };
  }
}
