import type { PaymentDriver,PaymentResult,VerifyResult,PaymentMetadata } from './BaseDriver';

/** Placeholder is fail-closed until an official server-side Blubank API exists. */
export class BlubankDriver implements PaymentDriver{
 constructor(_merchantCode:string,_terminalCode:string){}
 async createPayment(_amount:number,_metadata:PaymentMetadata):Promise<PaymentResult>{throw new Error('درگاه بلوبانک هنوز به سرویس رسمی سمت سرور متصل نشده است.')}
 async verifyPayment(_transactionId:string):Promise<VerifyResult>{return{status:'failed',data:{message:'Blubank gateway is not configured'}}}
}
