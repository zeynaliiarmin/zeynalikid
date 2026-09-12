// Validated public submission creation with server-generated high-entropy codes.
//
// دو قانون محصول که این فایل مسئول اجرای آنهاست:
//   ۱) هر شمارهٔ تماس «یک» کد پیگیری دارد — برای همیشه؛ فرم‌های بعدیِ همان شماره
//      به همان پروفایل و همان کد می‌چسبند (نه کد جدید).
//   ۲) ثبت فرم هرگز نشست ورود پنل کاربر نمی‌سازد (ورود فقط از صفحهٔ ورود + کپچا).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions,jsonResponse,getOrigin } from "../_shared/cors.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";
import { generateAndSavePlans } from "../_shared/plansCore.ts";
import { normalizeFullPhone, phoneDigits } from "../_shared/phone.ts";
import { getOrCreateTrackingCode, randomTrackingCode } from "../_shared/trackingCode.ts";

const trackingPrefix=()=>{const value=String(Deno.env.get("TRACKING_PREFIX")||"ZK").toUpperCase();return value==="FM"?"FM":"ZK"};

serve(async(req)=>{
 const options=handleOptions(req);if(options)return options;const origin=getOrigin(req);
 if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,origin);
 const rl=await centralRateLimit(req,"create-submission",{maxRequests:300,windowMs:60*60_000,blockMs:10*60_000});
 if(!rl.ok)return jsonResponse({error:"تعداد ثبت‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید."},429,origin);
 let body:any={};try{body=await req.json()}catch{return jsonResponse({error:"درخواست نامعتبر است"},400,origin)}
 const input=body?.submission;
 if(!input||typeof input!=="object"||Array.isArray(input))return jsonResponse({error:"اطلاعات فرم نامعتبر است"},400,origin);
 if(JSON.stringify(input).length>250000)return jsonResponse({error:"حجم اطلاعات فرم بیش از حد مجاز است"},413,origin);
 // نرمال‌سازی چندکشوری: ۰۹۱۹۸۳۰۵۷۷۴ / ۹۱۹۸۳۰۵۷۷۴ / ۹۸۹۱۹۸۳۰۵۷۷۴ / +۹۸۰۹۱۹۸۳۰۵۷۷۴ / +۹۸۹۱۹۸۳۰۵۷۷۴
// همه → +989198305774 ؛ و برای بقیهٔ کشورها هم همان منطق (۰۰۴۹… → +49… نه +98049…)
 let fullPhone=normalizeFullPhone(input.fullPhone||input.full_phone||"");
 // اگر fullPhone نامعتبر بود اما کاربر وارد حساب شده (userPhone همراه پیلود می‌آید)، شماره حساب جایگزین می‌شود —
 // فرمِ کاربر لاگین‌شده هرگز به‌خاطر خرابی فیلد مخفی شماره گم نمی‌شود.
 if(fullPhone.replace(/\D/g,"").length<7){
  const alt=normalizeFullPhone(String((input as any)?.userPhone||""));
  if(alt.replace(/\D/g,"").length>=7)fullPhone=alt;
 }
 if(fullPhone.replace(/\D/g,"").length<7)return jsonResponse({error:"شماره تماس معتبر نیست"},400,origin);
 const type=input.type==="course"?"course":"consultation";
 const payload={...input};
 for(const key of ["id","created_at","updated_at","deleted_at","full_phone","tracking_code","edit_token","service_role","adminPassword"]){delete payload[key]}
 // قالب شماره یکسان در همه جا (مقایسه دقیق پنل کاربر روی full_phone تکیه دارد)
 (payload as any).fullPhone=fullPhone;
 if(String((payload as any)?.userPhone||"").trim()){(payload as any).userPhone=normalizeFullPhone(String((payload as any).userPhone))||String((payload as any).userPhone)}
 payload.type=type;payload.unread=true;payload.isNew=true;payload.editHistory=[];payload.deleted_at=undefined;
 if(type==="consultation"){payload.orderStatus=undefined;payload.consultationStatus=payload.consultationStatus==="ناقص"?"ناقص":"مشاوره اولیه"}
 else{payload.orderStatus=payload.incomplete===true?"ناقص":"جدید";payload.consultationStatus=payload.incomplete===true?"ناقص":"ثبتی"}
 const supabase=getSupabaseAdmin();
 // idempotency: same client-side entry.id retried after a timeout returns the already-created row instead of a duplicate
 const clientRef=String((input as any).id||"").replace(/[^A-Za-z0-9_-]/g,"").slice(0,64);
 if(clientRef){
  try{
   const {data:dup}=await supabase.from("submissions").select("id,full_phone,payload,created_at,updated_at,deleted_at")
    .eq("full_phone",fullPhone).eq("payload->>clientRef",clientRef).is("deleted_at",null).maybeSingle();
   if(dup)return jsonResponse({ok:true,submission:dup,duplicate:true},201,origin);
  }catch{/* ignore */}
  (payload as any).clientRef=clientRef;
 }
 // ── کد پیگیری یکپارچه: کد رسمیِ همین شماره (از جدول نگاشت، یا ارثی از سوابق قبلی/حساب کاربر) ──
 // فرم دوم/سوم همان شماره دیگر کد تازه نمی‌گیرد و دیگر با خطای یکتایی (23505) رد نمی‌شود.
 const prefix=trackingPrefix();
 let code=await getOrCreateTrackingCode(supabase,fullPhone,prefix);
 for(let attempt=0;attempt<5;attempt++){
  payload.trackingCode=code;
  const {data,error}=await supabase.from("submissions").insert({full_phone:fullPhone,payload,deleted_at:null}).select("id,full_phone,payload,created_at,updated_at,deleted_at").single();
  if(!error&&data){
   try{
    const sid=String((data as any)?.id||"");
    if(sid){
     const run=generateAndSavePlans(supabase,sid,{force:false}).catch((e:any)=>console.error("auto-plans:",e?.message||e));
     const er=(globalThis as any).EdgeRuntime;
     if(er&&typeof er.waitUntil==="function")er.waitUntil(run);else await run;
    }
   }catch{/* plans failure must never block submission */}
   return jsonResponse({ok:true,submission:data},201,origin);
  }
  if(error?.code!=="23505"){console.error("create-submission insert error:",error?.message||error);return jsonResponse({error:"ثبت فرم انجام نشد"},500,origin)}
  // برخورد یکتایی: فقط وقتی رخ می‌دهد که ایندکس قدیمیِ «یکتایی سراسری کد» هنوز روی دیتابیس باشد
  // (یعنی مهاجرت 20260912130000 اعمال نشده). در آن حالت با کد تازه تلاش می‌کنیم تا ثبت هرگز گم نشود.
  console.error(`create-submission: tracking code collision (attempt ${attempt+1}) for a repeated code; migrating the DB removes this.`);
  code=randomTrackingCode(prefix);
 }
 return jsonResponse({error:"ساخت کد پیگیری انجام نشد؛ دوباره تلاش کنید"},503,origin);
});
