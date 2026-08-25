import {serve} from "https://deno.land/std@0.177.0/http/server.ts";
import {getSupabaseAdmin} from "../_shared/supabaseClient.ts";
import {handleOptions,jsonResponse,getOrigin} from "../_shared/cors.ts";
import {centralRateLimit} from "../_shared/rateLimit.ts";

const encodeToken=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hashToken=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(value=>value.toString(16).padStart(2,'0')).join('');
const reply=(body:unknown,status:number,origin:string)=>{const response=jsonResponse(body,status,origin);response.headers.set('Cache-Control','no-store');return response};

interface TurnstileResult {success?:boolean;hostname?:string;action?:string;['error-codes']?:string[];}
async function verifyTurnstile(token:string,remoteIp:string,expectedHostname:string):Promise<'ok'|'invalid'|'unavailable'>{
 const secret=String(Deno.env.get('TURNSTILE_SECRET_KEY')||'').trim();
 if(!secret)return 'unavailable';
 try{
  const form=new URLSearchParams({secret,response:token});
  if(remoteIp)form.set('remoteip',remoteIp);
  const response=await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:form,signal:AbortSignal.timeout(8000)});
  if(!response.ok)return 'unavailable';
  const result=await response.json() as TurnstileResult;
  return result.success===true&&result.action==='payment_details'&&String(result.hostname||'').toLowerCase()===expectedHostname.toLowerCase()?'ok':'invalid';
 }catch{return 'unavailable'}
}

serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;
 const origin=getOrigin(req);
 if(!origin)return reply({error:"مبدأ درخواست مجاز نیست"},403,origin);
 if(req.method!=="POST")return reply({error:"Method not allowed"},405,origin);
 const rate=await centralRateLimit(req,"checkout-session",{maxRequests:12,windowMs:10*60_000,blockMs:10*60_000});
 if(!rate.ok)return reply({error:"درخواست بیش از حد مجاز است"},429,origin);
 const body=await req.json().catch(()=>({}));
 const courseId=String(body.courseId||'').trim().slice(0,100);
 const referralCode=String(body.referralCode||'').trim().toLowerCase().slice(0,100);
 const turnstileToken=String(body.turnstileToken||'').trim();
 if(!courseId)return reply({error:"دوره معتبر نیست"},400,origin);
 if(turnstileToken.length<20||turnstileToken.length>2048)return reply({error:"تأیید امنیتی لازم است"},403,origin);
 const remoteIp=String(req.headers.get('CF-Connecting-IP')||req.headers.get('X-Forwarded-For')||'').split(',')[0].trim();
 const hostname=new URL(origin).hostname;
 const captcha=await verifyTurnstile(turnstileToken,remoteIp,hostname);
 if(captcha==='unavailable')return reply({error:"سرویس بررسی امنیتی موقتاً در دسترس نیست"},503,origin);
 if(captcha!=='ok')return reply({error:"تأیید امنیتی نامعتبر یا منقضی است"},403,origin);
 const admin=getSupabaseAdmin();
 const {data,error}=await admin.from('settings').select('settings').eq('key','app_settings').limit(1).maybeSingle();
 if(error||!data)return reply({error:"روند پرداخت در دسترس نیست"},503,origin);
 const settings=data.settings||{};
 const courses=(Array.isArray(settings.courseTabs)?settings.courseTabs:[]).flatMap((tab:any)=>Array.isArray(tab?.courses)?tab.courses:[]);
 const course=courses.find((item:any)=>String(item?.id||'')===courseId&&item?.active!==false);
 if(!course)return reply({error:"دوره معتبر نیست"},404,origin);
 if(referralCode){
  const consultant=(Array.isArray(settings.consultants)?settings.consultants:[]).find((item:any)=>item?.active!==false&&String(item?.referralCode||'').trim().toLowerCase()===referralCode);
  if(!consultant)return reply({error:"مشاور معتبر نیست"},404,origin);
 }
 const token=encodeToken(crypto.getRandomValues(new Uint8Array(32)));
 const expiresAt=new Date(Date.now()+15*60_000).toISOString();
 const {error:insertError}=await admin.from('checkout_sessions').insert({token_hash:await hashToken(token),course_id:courseId,referral_code:referralCode||null,expires_at:expiresAt});
 if(insertError)return reply({error:"ساخت نشست پرداخت انجام نشد"},503,origin);
 return reply({checkoutToken:token,expiresAt},200,origin);
});
