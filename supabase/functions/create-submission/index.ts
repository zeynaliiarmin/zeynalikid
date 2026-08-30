// Validated public submission creation with server-generated high-entropy codes.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions,jsonResponse,getOrigin } from "../_shared/cors.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";

const alphabet="abcdefghijklmnopqrstuvwxyz0123456789";
const trackingPrefix=()=>{const value=String(Deno.env.get("TRACKING_PREFIX")||"ZK").toUpperCase();return value==="FM"?"FM":"ZK"};
const randomCode=()=>{const length=7+crypto.getRandomValues(new Uint8Array(1))[0]%3;const bytes=crypto.getRandomValues(new Uint8Array(length));const first=String(1+bytes[0]%9);const body=first+Array.from(bytes.slice(1),b=>alphabet[b%alphabet.length]).join('');return `${trackingPrefix()}-${body}`};
const phoneDigits=(value:string)=>String(value||"").replace(/[^0-9+]/g,"").slice(0,32);

serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);
 if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,origin);
 const rl=await centralRateLimit(req,"create-submission",{maxRequests:20,windowMs:60*60_000,blockMs:60*60_000});
 if(!rl.ok)return jsonResponse({error:"تعداد ثبت‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید."},429,origin);
 let body:any={};try{body=await req.json()}catch{return jsonResponse({error:"درخواست نامعتبر است"},400,origin)}
 const input=body?.submission;
 if(!input||typeof input!=="object"||Array.isArray(input))return jsonResponse({error:"اطلاعات فرم نامعتبر است"},400,origin);
 if(JSON.stringify(input).length>250000)return jsonResponse({error:"حجم اطلاعات فرم بیش از حد مجاز است"},413,origin);
 const fullPhone=phoneDigits(input.fullPhone||input.full_phone||"");
 if(fullPhone.replace(/\D/g,"").length<7)return jsonResponse({error:"شماره تماس معتبر نیست"},400,origin);
 const type=input.type==="course"?"course":"consultation";
 const payload={...input};
 for(const key of ["id","created_at","updated_at","deleted_at","full_phone","tracking_code","edit_token","service_role","adminPassword"]){delete payload[key]}
 payload.type=type;payload.unread=true;payload.isNew=true;payload.editHistory=[];payload.deleted_at=undefined;
 if(type==="consultation"){payload.orderStatus=undefined;payload.consultationStatus=payload.consultationStatus==="ناقص"?"ناقص":"مشاوره اولیه"}
 else{payload.orderStatus=payload.incomplete===true?"ناقص":"جدید";payload.consultationStatus=payload.incomplete===true?"ناقص":"ثبتی"}
 const supabase=getSupabaseAdmin();
 // اتحاد کد پیگیری: اگر برای این شماره، کاربر فعال ثبت‌نام‌شدهٔ پنل (payload.type==='user')
 // وجود دارد، همان کد ثبت‌نام به‌عنوان کد پیگیری این فرم استفاده می‌شود (کد جدا صادر نمی‌شود).
 // در صورت تداخل (23505) تلاش بعدی کد تصادفی می‌گیرد.
 let unifiedCode="";
 try{
  const {data:userRow}=await supabase.from("submissions")
   .select("payload")
   .eq("full_phone",fullPhone)
   .eq("payload->>type","user")
   .eq("payload->>status","active")
   .order("created_at",{ascending:false}).limit(1).maybeSingle();
  if(userRow?.payload?.code)unifiedCode=String(userRow.payload.code);
 }catch{/* ignore */} 
 for(let attempt=0;attempt<5;attempt++){
  payload.trackingCode=unifiedCode||randomCode();
  const {data,error}=await supabase.from("submissions").insert({full_phone:fullPhone,payload,deleted_at:null}).select("id,full_phone,payload,created_at,updated_at,deleted_at").single();
  if(!error&&data)return jsonResponse({ok:true,submission:data},201,origin);
  if(error?.code!=="23505"){console.error("create-submission insert error:",error?.message||error);return jsonResponse({error:"ثبت فرم انجام نشد"},500,origin)}
 }
 return jsonResponse({error:"ساخت کد پیگیری انجام نشد؛ دوباره تلاش کنید"},503,origin);
});
