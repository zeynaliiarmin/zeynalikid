/**
 * Payment Driver — Stripe
 *
 * مستندات: https://stripe.com/docs/api/payment_intents
 *
 * توجه: برای استفاده واقعی نیاز به نصب پکیج `stripe` و راه‌اندازی سرور بک‌اند است.
 * این درایور یک نمونه اولیه (Skeleton) است.
 */

import type { PaymentDriver, PaymentResult, VerifyResult, PaymentMetadata } from './BaseDriver';

export class StripeDriver implements PaymentDriver {
  private secretKey: string;
  private publishableKey: string;

  constructor(secretKey: string, publishableKey: string) {
    this.secretKey = secretKey;
    this.publishableKey = publishableKey;
  }

  async createPayment(amount: number, metadata: PaymentMetadata): Promise<PaymentResult> {
    // ─── استفاده از Stripe Payment Intents API ───
    //
    // در محیط سرور:
    // const stripe = require('stripe')(this.secretKey);
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(amount * 100), // تبدیل به سنت (cents)
    //   currency: 'usd',
    //   description: metadata.description || 'Course payment',
    //   metadata: { userId: metadata.userId, courseId: metadata.courseId },
    // });
    //
    // return {
    //   paymentUrl: `https://checkout.stripe.com/pay/${paymentIntent.id}`,
    //   transactionId: paymentIntent.id,
    //   gateway: 'stripe',
    // };

    // نمونه اولیه — نیاز به تکمیل در بک‌اند
    return {
      paymentUrl: `https://checkout.stripe.com/c/pay/${metadata.orderId || 'cs_test'}`,
      transactionId: `stripe_${Date.now()}`,
      gateway: 'stripe',
    };
  }

  async verifyPayment(transactionId: string): Promise<VerifyResult> {
    // ─── بررسی وضعیت Payment Intent ───
    //
    // const stripe = require('stripe')(this.secretKey);
    // const paymentIntent = await stripe.paymentIntents.retrieve(transactionId);
    //
    // if (paymentIntent.status === 'succeeded') {
    //   return { status: 'success', refId: transactionId };
    // } else if (paymentIntent.status === 'processing') {
    //   return { status: 'pending', refId: transactionId };
    // }

    // نمونه اولیه
    return {
      status: 'success',
      refId: transactionId,
      data: { message: 'Payment verified (skeleton)' },
    };
  }
}
