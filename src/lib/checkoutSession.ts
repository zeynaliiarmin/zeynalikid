export interface PaymentBank {id:string;name:string;card:string;iban:string;holder:string;color?:string;active?:boolean;order?:number;}
export interface PaymentWallet {id:string;name:string;symbol:string;address:string;network:string;color?:string;active?:boolean;}
export interface PaymentDetails {banks:PaymentBank[];wallets:PaymentWallet[];cryptoVisibility?:string;}
const functionBase=()=>String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1';
const parseJson=async(response:Response):Promise<Record<string,unknown>>=>response.json().catch(()=>({})) as Promise<Record<string,unknown>>;
// ─── کشِ نشستِ پرداخت ───
// بازگشت به صفحه پرداخت نباید کاربر را دوباره پشتِ «در حال بررسی» بگذارد:
// نتیجه موفق تا ۱۵ دقیقه در sessionStorage نگه داشته می‌شود؛ همان اول نشان داده می‌شود و
// در پس‌زمینه با پاسخ تازه سرور به‌روز می‌شود (اعتبارسنجی کپچا سرِ جایش حفظ می‌شود).
const CACHE_PREFIX='zk_pay_cache_v1:';
const CACHE_TTL_MS=15*60*1000;
export function peekCachedPaymentDetails(courseId:string):PaymentDetails|null{
 try{
  const raw=sessionStorage.getItem(CACHE_PREFIX+courseId);if(!raw)return null;
  const p=JSON.parse(raw);const d=p?.d;
  if(!d||Date.now()-Number(p?.t||0)>CACHE_TTL_MS||!Array.isArray(d.banks))return null;
  return d as PaymentDetails;
 }catch{return null}
}
function writeCachedPaymentDetails(courseId:string,d:PaymentDetails){try{sessionStorage.setItem(CACHE_PREFIX+courseId,JSON.stringify({t:Date.now(),d}))}catch{/* بی‌خطر */}}
export function clearCachedPaymentDetails(courseId:string){try{sessionStorage.removeItem(CACHE_PREFIX+courseId)}catch{/* بی‌خطر */}}

export async function loadCheckoutPaymentDetails(courseId:string,referralCode:string,turnstileToken:string,signal?:AbortSignal):Promise<PaymentDetails>{
 const sessionResponse=await fetch(`${functionBase()}/checkout-session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId,referralCode,turnstileToken}),signal});
 const sessionBody=await parseJson(sessionResponse);const checkoutToken=typeof sessionBody.checkoutToken==='string'?sessionBody.checkoutToken:'';
 if(!sessionResponse.ok||!checkoutToken)throw new Error(typeof sessionBody.error==='string'?sessionBody.error:'ساخت نشست پرداخت انجام نشد');
 const detailsResponse=await fetch(`${functionBase()}/payment-details`,{method:'POST',headers:{'Content-Type':'application/json','X-Checkout-Token':checkoutToken},body:JSON.stringify({referralCode}),signal});
 const detailsBody=await parseJson(detailsResponse);
 if(!detailsResponse.ok)throw new Error(typeof detailsBody.error==='string'?detailsBody.error:'اطلاعات پرداخت در دسترس نیست');
 const details:PaymentDetails={banks:Array.isArray(detailsBody.banks)?detailsBody.banks as unknown as PaymentBank[]:[],wallets:Array.isArray(detailsBody.wallets)?detailsBody.wallets as unknown as PaymentWallet[]:[],cryptoVisibility:typeof detailsBody.cryptoVisibility==='string'?detailsBody.cryptoVisibility:undefined};
 writeCachedPaymentDetails(courseId,details);
 return details;
}
