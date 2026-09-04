// supabase/functions/generate-plans/index.ts
// «برنامه‌ها» — مسیر ادمین: احراز نشست + محدودیت نرخ، سپس هسته مشترک (plansCore) تولید/ذخیره برنامه‌ها.
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, getOrigin } from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { ok, err } from "../_shared/http.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";
import { generateAndSavePlans } from "../_shared/plansCore.ts";

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const origin = getOrigin(req);
  if (!origin) return err("Origin not allowed", origin ?? "", 403);
  if (req.method !== "POST") return err("Method not allowed", origin, 405);

  const rl = await centralRateLimit(req, "generate-plans", { maxRequests: 12, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!rl.ok) return err("تعداد تولید برنامه بیش از حد مجاز است؛ کمی بعد تلاش کنید", origin, 429);

  let body: any;
  try { body = await req.json(); } catch { return err("بدنه نامعتبر", origin, 400); }

  const sessionToken = String(body?.sessionToken || "").trim() || extractSessionToken(req, body);
  if (!sessionToken) return err("نشست وارد نشده است.", origin, 401);
  const sessionResult = await validateAdminSession(sessionToken);
  if (!sessionResult.ok) return err("نشست نامعتبر یا منقضی است.", origin, 401);

  const submissionId = String(body?.submissionId ?? "").trim();
  if (!submissionId) return err("شناسه رکورد الزامی است", origin, 400);
  const force = body?.force === true;

  try {
    const r = await generateAndSavePlans(getSupabaseAdmin(), submissionId, { force });
    return ok({ ...r }, origin);
  } catch (e: any) {
    const msg = String(e?.message || e || "");
    if (msg === "رکورد یافت نشد") return err("رکورد یافت نشد", origin, 404);
    return err(msg || "تولید برنامه ناموفق بود", origin, 502);
  }
});
