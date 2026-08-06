/**
 * Payment Driver — پی‌پینگ (PayPing)
 *
 * مستندات: https://docs.payping.ir/
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

interface PayPingPaymentResponse {
  code: string;
  // سایر فیلدها بسته به نسخه API
}

export class PayPingDriver implements PaymentDriver {
  private apiKey: string;
  private clientId: string;
  private baseUrl: string = 'https://api.payping.ir/v2';

  constructor(apiKey: string, clientId: string) {
    this.apiKey = apiKey;
    this.clientId = clientId;
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    const response = await fetch(`${this.baseUrl}/pay`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        amount: Math.round(amount),
        payerName: metadata.userName || 'کاربر',
        description: metadata.description || 'پرداخت دوره آموزشی',
        returnUrl: metadata.callbackUrl || '',
        clientRefId: metadata.orderId || `ref_${Date.now()}`,
        payerIdentity: metadata.userPhone || '',
      }),
    });

    const data: PayPingPaymentResponse = await response.json();

    if (data.code) {
      return {
        paymentUrl: `https://api.payping.ir/v2/pay/gotoipg/${data.code}`,
        transactionId: data.code,
        gateway: 'payping',
      };
    } else {
      throw new Error(`PayPing error: Failed to create payment`);
    }
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    const response = await fetch(`${this.baseUrl}/pay/verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        refId: transactionId,
      }),
    });

    const data = await response.json();

    if (response.ok && data) {
      return {
        status: 'success',
        refId: data.refid || transactionId,
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
