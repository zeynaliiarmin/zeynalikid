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
    const body = await req.json().catch(() => ({}));
    const kind = sanitize(body?.kind || "error", 30);
    const message = sanitize(body?.message || "", MAX_MESSAGE);
    const stack = sanitize(body?.stack || "", MAX_STACK);
    const page = sanitize(body?.page || "", MAX_PAGE);
    const ua = sanitize(body?.user_agent || body?.ua || "", MAX_UA);
    const lang = sanitize(body?.lang || "", 8);

    if (!message && !stack) {
      return jsonResponse({ ok: true }, 200, origin);
    }

    const supabase = getSupabaseAdmin();
    const { error: insErr } = await supabase.from("error_logs").insert({
      kind,
      message,
      stack: stack || null,
      page_path: page || null,
      user_agent: ua || null,
      lang: lang || null,
    });
    if (insErr) {
      console.error("log-error insert failed:", insErr.message);
    }

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
    return jsonResponse({ ok: true }, 200, origin);
  }
});
