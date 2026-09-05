// supabase/functions/admin-error-logs/index.ts
// خواندن لاگ خطاها — فقط با نشست معتبر ادمین (admin_sessions).
// بدون JWT اجباری نیست؛ احراز هویت از طریق توکن نشست ادمین انجام می‌شود.
// دسترسی فقط‌خواندنی و محدود به آخرین گزارش‌هاست.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, jsonResponse, getOrigin, rejectIfInvalidOrigin } from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { rateLimit, rateLimitKey, cleanupExpiredBuckets } from "../_shared/rateLimit.ts";

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "errlogadmin"), { maxRequests: 30, windowMs: 60_000 });
  if (!rl.ok) {
    return jsonResponse({ error: "تعداد درخواست‌ها بیش از حد مجاز است." }, 429, origin);
  }

  const body = await req.json().catch(() => ({}));
  const token = extractSessionToken(req, body);
  const auth = await validateAdminSession(token);
  if (!auth.ok) {
    return jsonResponse({ error: "دسترسی غیرمجاز" }, 401, origin);
  }

  try {
    const supabase = getSupabaseAdmin();

    // پاک‌سازی همه خطاها (فقط ادمین)
    if (body?.action === 'clear') {
      const { error: delErr } = await supabase.from("error_logs").delete().neq("id", -1);
      if (delErr) {
        return jsonResponse({ error: "خطا در پاک‌سازی لاگ‌ها" }, 500, origin);
      }
      return jsonResponse({ ok: true, cleared: true }, 200, origin);
    }

    const limit = Math.min(100, Math.max(1, Number(body?.limit) || 50));
    const { data, error } = await supabase
      .from("error_logs")
      .select("id,kind,message,stack,page_path,user_agent,lang,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return jsonResponse({ error: "خطا در خواندن لاگ‌ها" }, 500, origin);
    }

    return jsonResponse({ ok: true, logs: data || [] }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور" }, 500, origin);
  }
});
