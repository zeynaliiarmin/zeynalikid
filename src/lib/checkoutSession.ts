export interface PaymentBank {id:string;name:string;card:string;iban:string;holder:string;color?:string;active?:boolean;order?:number;}
export interface PaymentWallet {id:string;name:string;symbol:string;address:string;network:string;color?:string;active?:boolean;}
export interface PaymentDetails {banks:PaymentBank[];wallets:PaymentWallet[];cryptoVisibility?:string;}
const functionBase=()=>String(import.meta.env.VITE_SUPABASE_URL||'').replace(/\/$/,'')+'/functions/v1';
const parseJson=async(response:Response):Promise<Record<string,unknown>>=>response.json().catch(()=>({})) as Promise<Record<string,unknown>>;
export async function loadCheckoutPaymentDetails(courseId:string,referralCode:string,signal?:AbortSignal):Promise<PaymentDetails>{
 const sessionResponse=await fetch(`${functionBase()}/checkout-session`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({courseId,referralCode}),signal});
 const sessionBody=await parseJson(sessionResponse);const checkoutToken=typeof sessionBody.checkoutToken==='string'?sessionBody.checkoutToken:'';
 if(!sessionResponse.ok||!checkoutToken)throw new Error(typeof sessionBody.error==='string'?sessionBody.error:'ساخت نشست پرداخت انجام نشد');
 const detailsResponse=await fetch(`${functionBase()}/payment-details`,{method:'POST',headers:{'Content-Type':'application/json','X-Checkout-Token':checkoutToken},body:JSON.stringify({referralCode}),signal});
 const detailsBody=await parseJson(detailsResponse);
 if(!detailsResponse.ok)throw new Error(typeof detailsBody.error==='string'?detailsBody.error:'اطلاعات پرداخت در دسترس نیست');
 return {banks:Array.isArray(detailsBody.banks)?detailsBody.banks as unknown as PaymentBank[]:[],wallets:Array.isArray(detailsBody.wallets)?detailsBody.wallets as unknown as PaymentWallet[]:[],cryptoVisibility:typeof detailsBody.cryptoVisibility==='string'?detailsBody.cryptoVisibility:undefined};
}
