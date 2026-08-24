import {serve} from "https://deno.land/std@0.177.0/http/server.ts";
import {getSupabaseAdmin} from "../_shared/supabaseClient.ts";
import {handleOptions,jsonResponse,getOrigin} from "../_shared/cors.ts";
import {centralRateLimit} from "../_shared/rateLimit.ts";

const encodeToken=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const hashToken=async(token:string)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token)))).map(value=>value.toString(16).padStart(2,'0')).join('');

serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;
 const origin=getOrigin(req);
 if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,origin);
 const rate=await centralRateLimit(req,"checkout-session",{maxRequests:12,windowMs:10*60_000,blockMs:10*60_000});
 if(!rate.ok)return jsonResponse({error:"درخواست بیش از حد مجاز است"},429,origin);
 const body=await req.json().catch(()=>({}));
 const courseId=String(body.courseId||'').trim().slice(0,100);
 const referralCode=String(body.referralCode||'').trim().toLowerCase().slice(0,100);
 if(!courseId)return jsonResponse({error:"دوره معتبر نیست"},400,origin);
 const admin=getSupabaseAdmin();
 const {data,error}=await admin.from('settings').select('settings').eq('key','app_settings').limit(1).maybeSingle();
 if(error||!data)return jsonResponse({error:"روند پرداخت در دسترس نیست"},503,origin);
 const settings=data.settings||{};
 const courses=(Array.isArray(settings.courseTabs)?settings.courseTabs:[]).flatMap((tab:any)=>Array.isArray(tab?.courses)?tab.courses:[]);
 const course=courses.find((item:any)=>String(item?.id||'')===courseId&&item?.active!==false);
 if(!course)return jsonResponse({error:"دوره معتبر نیست"},404,origin);
 if(referralCode){
  const consultant=(Array.isArray(settings.consultants)?settings.consultants:[]).find((item:any)=>item?.active!==false&&String(item?.referralCode||'').trim().toLowerCase()===referralCode);
  if(!consultant)return jsonResponse({error:"مشاور معتبر نیست"},404,origin);
 }
 const tokenBytes=crypto.getRandomValues(new Uint8Array(32));
 const token=encodeToken(tokenBytes);const tokenHash=await hashToken(token);
 const expiresAt=new Date(Date.now()+15*60_000).toISOString();
 const {error:insertError}=await admin.from('checkout_sessions').insert({token_hash:tokenHash,course_id:courseId,referral_code:referralCode||null,expires_at:expiresAt});
 if(insertError)return jsonResponse({error:"ساخت نشست پرداخت انجام نشد"},503,origin);
 return jsonResponse({checkoutToken:token,expiresAt},200,origin);
});
