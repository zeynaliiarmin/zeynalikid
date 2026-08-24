import type { PaymentDriver,PaymentResult,VerifyResult,PaymentMetadata } from './BaseDriver';

/**
 * Deliberately unavailable until Stripe PaymentIntent creation and verification
 * are implemented in a trusted server function. No fake URL or success result is
 * ever returned to a customer.
 */
export class StripeDriver implements PaymentDriver{
 constructor(_secretKey:string,_publishableKey:string){}
 async createPayment(_amount:number,_metadata:PaymentMetadata):Promise<PaymentResult>{throw new Error('درگاه Stripe هنوز به سرویس امن سمت سرور متصل نشده است.')}
 async verifyPayment(_transactionId:string):Promise<VerifyResult>{return{status:'failed',data:{message:'Stripe gateway is not configured'}}}
}
