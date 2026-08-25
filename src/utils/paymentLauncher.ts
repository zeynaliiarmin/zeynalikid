export type CopiedPaymentKind='card'|'iban'|'crypto';
export interface CopiedPaymentInfo {kind:CopiedPaymentKind;value:string;label:string;}
export interface PaymentLaunchResolution {info:CopiedPaymentInfo|null;shouldCopyDefault:boolean;}

export function resolvePaymentLaunchInfo(lastCopied:CopiedPaymentInfo|null,defaultCard:string,defaultLabel=''):PaymentLaunchResolution{
 if(lastCopied)return{info:lastCopied,shouldCopyDefault:false};
 const value=String(defaultCard||'').trim();
 if(!value)return{info:null,shouldCopyDefault:false};
 return{info:{kind:'card',value,label:defaultLabel||'شماره کارت پیش‌فرض'},shouldCopyDefault:true};
}

export const paymentShareText=(info:CopiedPaymentInfo|null,lang:'fa'|'en')=>info
 ? `${info.label}: ${info.value}`
 : (lang==='en'?'Open a supported payment application.':'یک برنامه پرداخت پشتیبانی‌شده را انتخاب کنید.');
