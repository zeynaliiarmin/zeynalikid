// supabase/functions/log-error/index.ts
// ثبت خطاهای فرانت‌اند — عمومی (no-verify-jwt) اما با محافظت کامل:
//   • Rate limit: حداکثر ۱۰ درخواست در دقیقه برای هر IP
//   • فیلتر دادهٔ حساس (شماره موبایل/کارت/شبا/ایمیل/توکن) قبل از ذخیره
//   • محدودیت طول هر فیلد
//   • فقط سرویس‌رول می‌تواند جدول error_logs را بخواند (RLS)
//   • پاکسازی خودکار خطاهای قدیمی‌تر از ۱۵ روز
// هرگز خطا را به کلاینت برنمی‌گرداند (همیشه ok:true) تا تجربهٔ کاربر مختل نشود.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, jsonResponse, getOrigin } from "../_shared/cors.ts";
import { rateLimit, rateLimitKey, cleanupExpiredBuckets } from "../_shared/rateLimit.ts";

const MAX_MESSAGE = 2000;
const MAX_STACK = 4000;
const MAX_PAGE = 500;
const MAX_UA = 500;

const PII_PATTERNS: [RegExp, string][] = [
  [/(\+98|0098|0)9\d{9}/g, "[PHONE]"],
  [/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, "[CARD]"],
  [/IR\d{22,26}/g, "[IBAN]"],
  [/[\w.+-]+@[\w-]+\.[\w.-]+/g, "[EMAIL]"],
  [/eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, "[TOKEN]"],
];

function sanitize(s: unknown, max: number): string {
  let out = String(s ?? "");
  for (const [re, rep] of PII_PATTERNS) out = out.replace(re, rep);
  return out.slice(0, max);
}

let cleanupCounter = 0;

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "errlog"), { maxRequests: 10, windowMs: 60_000 });
  if (!rl.ok) {
    // بی‌صدا رد شود تا مهاجم متوجه نشود و تجربهٔ کاربر هم مختل نشود
    return jsonResponse({ ok: true }, 200, origin);
  }

  try {
    const body=await req.json().catch(()=>({}));
    const incoming=Array.isArray(body?.events)?body.events.slice(0,10):[body];
    const rows=incoming.map((item:any)=>{const message=sanitize(item?.message||"",MAX_MESSAGE);const stack=sanitize(item?.stack||"",MAX_STACK);return{kind:sanitize(item?.kind||"error",30),message,stack:stack||null,page_path:sanitize(item?.page||"",MAX_PAGE)||null,user_agent:sanitize(item?.user_agent||item?.ua||"",MAX_UA)||null,lang:sanitize(item?.lang||"",8)||null}}).filter((row:any)=>row.message||row.stack);
    if(!rows.length)return jsonResponse({ok:true,accepted:0},200,origin);
    const supabase=getSupabaseAdmin();
    const {error:insErr}=await supabase.from("error_logs").insert(rows);
    if(insErr)console.error("log-error insert failed:",insErr.message);
    const webhook=Deno.env.get("ERROR_ALERT_WEBHOOK_URL")||"";
    const urgent=rows.filter((row:any)=>/fatal|payment|registration|storage/i.test(String(row.kind)));
    if(webhook&&urgent.length){try{await fetch(webhook,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({source:'frontend-error-monitor',count:urgent.length,kinds:[...new Set(urgent.map((row:any)=>row.kind))],timestamp:new Date().toISOString()})})}catch{}}

    // پاکسازی خودکار: خطاهای قدیمی‌تر از ۱۵ روز (هر ~۵۰ گزارش یک‌بار اجرا می‌شود)
    cleanupCounter++;
    if (cleanupCounter % 50 === 0) {
      try {
        const cutoff = new Date(Date.now() - 15 * 24 * 3600 * 1000).toISOString();
        await supabase.from("error_logs").delete().lt("created_at", cutoff);
      } catch {
        /* نادیده بگیر — پاکسازی نباید ثبت خطا را بشکند */
      }
    }

    return jsonResponse({ ok: true }, 200, origin);
  } catch (_e) {
    console.error("log-error failed:", _e);
    return jsonResponse({ok:true,accepted:rows.length},200,origin);
  }
});
