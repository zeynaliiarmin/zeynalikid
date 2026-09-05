// Admin credential management backed by PBKDF2 hashes in admin_credentials.
// No Management API token is required. Every operation requires a valid admin
// session; changing credentials revokes every existing session.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, jsonResponse, getOrigin, rejectIfInvalidOrigin } from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";
import { changeAdminCredentials } from "../_shared/adminCredentials.ts";

const digitsOnly=(value:string)=>String(value||"").replace(/\D/g,"");
const maskPhone=(phone:string)=>{const d=digitsOnly(phone);return d.length>=7?`${d.slice(0,3)}•••••${d.slice(-3)}`:""};

serve(async(req)=>{
  const options=handleOptions(req);if(options)return options;
  const origin=getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;
  if(req.method!=="POST")return jsonResponse({error:"Method not allowed"},405,origin);

  let body:any={};try{body=await req.json()}catch{return jsonResponse({error:"درخواست نامعتبر است"},400,origin)}
  const session=await validateAdminSession(extractSessionToken(req,body));
  if(!session.ok)return jsonResponse({error:"نشست نامعتبر یا منقضی است"},401,origin);

  const rl=await centralRateLimit(req,"admin-credentials",{maxRequests:6,windowMs:15*60_000,blockMs:15*60_000},session.session.ownerPhone);
  if(!rl.ok)return jsonResponse({error:"تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید."},429,origin);

  const action=String(body.action||"");
  if(action==="get_info")return jsonResponse({ok:true,phoneMasked:maskPhone(session.session.ownerPhone),minimumPasswordLength:12},200,origin);
  if(action!=="change_credentials")return jsonResponse({error:"action نامعتبر است"},400,origin);

  const currentPassword=String(body.currentPassword||"");
  const newPhone=body.newPhone?String(body.newPhone):"";
  const newPassword=body.newPassword?String(body.newPassword):"";
  if(!currentPassword)return jsonResponse({error:"رمز عبور فعلی الزامی است"},400,origin);
  if(!newPhone&&!newPassword)return jsonResponse({error:"شماره یا رمز جدید را وارد کنید"},400,origin);
  if(newPassword&&newPassword.length<12)return jsonResponse({error:"رمز جدید باید حداقل ۱۲ کاراکتر باشد"},400,origin);

  const supabase=getSupabaseAdmin();
  try{
    const result=await changeAdminCredentials(session.session.ownerPhone,currentPassword,newPhone,newPassword);
    if(!result.ok){
      const message=result.error==="weak_password"?"رمز جدید باید حداقل ۱۲ کاراکتر باشد":result.error==="invalid_phone"?"شماره موبایل معتبر نیست":"رمز عبور فعلی صحیح نیست";
      await supabase.from("admin_audit_logs").insert({actor_phone:session.session.ownerPhone,session_id:String(session.session.sessionId),action:"admin_credentials_change_failed",target_type:"admin_credentials",metadata:{reason:result.error||"unknown"},success:false});
      return jsonResponse({error:message},result.error==="invalid_current_password"?401:400,origin);
    }

    const now=new Date().toISOString();
    await supabase.from("admin_sessions").update({is_revoked:true,revoked_at:now}).eq("owner_phone",session.session.ownerPhone);
    if(result.phone!==session.session.ownerPhone)await supabase.from("admin_sessions").update({is_revoked:true,revoked_at:now}).eq("owner_phone",result.phone);
    await supabase.from("admin_audit_logs").insert({actor_phone:result.phone,session_id:String(session.session.sessionId),action:"admin_credentials_changed",target_type:"admin_credentials",metadata:{phoneChanged:result.phone!==session.session.ownerPhone,passwordChanged:!!newPassword},success:true});

    return jsonResponse({ok:true,message:"اطلاعات ورود به‌روزرسانی شد. برای ادامه دوباره وارد شوید."},200,origin);
  }catch(error){
    console.error("admin credential update failed:",String((error as Error)?.message||error));
    return jsonResponse({error:"ذخیره اطلاعات ورود انجام نشد"},500,origin);
  }
});
