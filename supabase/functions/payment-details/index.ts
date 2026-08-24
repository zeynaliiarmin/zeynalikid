import {serve} from "https://deno.land/std@0.177.0/http/server.ts";
import {getSupabaseAdmin} from "../_shared/supabaseClient.ts";
import {handleOptions,jsonResponse,getOrigin} from "../_shared/cors.ts";
import {centralRateLimit} from "../_shared/rateLimit.ts";
const cleanBanks=(items:any)=>Array.isArray(items)?items.filter(Boolean).map((b:any)=>({id:String(b.id||''),name:String(b.name||''),card:String(b.card||''),iban:String(b.iban||''),holder:String(b.holder||b.accountName||''),color:b.color,active:b.active!==false,order:Number(b.order||0)})).filter((b:any)=>b.active&&(b.card||b.iban)).slice(0,10):[];
const cleanWallets=(items:any)=>Array.isArray(items)?items.filter(Boolean).map((w:any)=>({id:String(w.id||''),name:String(w.name||''),symbol:String(w.symbol||''),address:String(w.address||''),network:String(w.network||''),color:w.color,active:w.active!==false})).filter((w:any)=>w.active&&w.address).slice(0,10):[];
const hashToken=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(value=>value.toString(16).padStart(2,'0')).join('');
serve(async req=>{
 const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);
 if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,origin);
 const checkoutToken=String(req.headers.get('X-Checkout-Token')||'').trim();
 if(!/^[A-Za-z0-9_-]{40,100}$/.test(checkoutToken))return jsonResponse({error:"نشست پرداخت معتبر نیست"},401,origin);
 const rate=await centralRateLimit(req,"payment-details",{maxRequests:20,windowMs:10*60_000,blockMs:10*60_000},checkoutToken.slice(0,16));
 if(!rate.ok)return jsonResponse({error:"درخواست بیش از حد مجاز است"},429,origin);
 const admin=getSupabaseAdmin();const tokenHash=await hashToken(checkoutToken);
 const {data:session,error:sessionError}=await admin.from('checkout_sessions').select('course_id,referral_code,expires_at').eq('token_hash',tokenHash).gt('expires_at',new Date().toISOString()).limit(1).maybeSingle();
 if(sessionError||!session)return jsonResponse({error:"نشست پرداخت منقضی یا نامعتبر است"},401,origin);
 const {data,error}=await admin.from('settings').select('settings').eq('key','app_settings').limit(1).maybeSingle();
 if(error||!data)return jsonResponse({error:"اطلاعات پرداخت در دسترس نیست"},503,origin);
 const settings=data.settings||{};const referralCode=String(session.referral_code||'').trim().toLowerCase();
 if(referralCode){const consultant=(settings.consultants||[]).find((c:any)=>c?.active!==false&&String(c?.referralCode||'').trim().toLowerCase()===referralCode);if(!consultant)return jsonResponse({error:"مشاور یافت نشد"},404,origin);const cb=Array.isArray(consultant.banks)?consultant.banks:(consultant.bank?[consultant.bank]:[]);const cw=Array.isArray(consultant.wallets)?consultant.wallets:(consultant.wallet?[consultant.wallet]:[]);return jsonResponse({banks:cleanBanks(cb),wallets:cleanWallets(cw)},200,origin)}
 return jsonResponse({banks:cleanBanks(settings.banks),wallets:cleanWallets(settings.cryptoWallets),cryptoVisibility:settings.cryptoVisibility||'intl'},200,origin);
});
