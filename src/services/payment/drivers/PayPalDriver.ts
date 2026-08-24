import type { PaymentDriver,PaymentResult,VerifyResult,PaymentMetadata } from './BaseDriver';

/**
 * Deliberately unavailable until PayPal order creation/capture is implemented in
 * a trusted server function. Client secrets are never processed in the browser.
 */
export class PayPalDriver implements PaymentDriver{
 constructor(_clientId:string,_clientSecret:string,_sandbox:boolean=true){}
 async createPayment(_amount:number,_metadata:PaymentMetadata):Promise<PaymentResult>{throw new Error('درگاه PayPal هنوز به سرویس امن سمت سرور متصل نشده است.')}
 async verifyPayment(_transactionId:string):Promise<VerifyResult>{return{status:'failed',data:{message:'PayPal gateway is not configured'}}}
}
