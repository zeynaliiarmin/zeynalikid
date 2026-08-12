// supabase/functions/admin-credentials/index.ts
// تغییر امن رمز عبور و شماره تماس ورود به پنل مدیریت (بدون نیاز به دسترسی خارجی).
//
// رمز و شماره واقعی ورود در Secret های Edge Function (ADMIN_PASSWORD / ADMIN_PHONE)
// نگهداری می‌شوند. این تابع به ادمین اجازه می‌دهد آن‌ها را با احراز هویت کامل عوض کند:
//   1) sessionToken معتبر ادمین (validateAdminSession)
//   2) رمز عبور فعلی (مطابقت با ADMIN_PASSWORD)
//   3) اعتبارسنجی شماره جدید (موبایل ایرانی) و رمز جدید (حداقل ۴ کاراکتر)
// سپس از طریق Management API (با توکن ADMIN_MGMT_TOKEN که فقط سمت سرور است)
// Secret ها را به‌روزرسانی و همهٔ نشست‌ها را می‌بندد.
//
// امنیت:
//   - ADMIN_MGMT_TOKEN فقط داخل این تابع (سمت سرور) استفاده می‌شود؛ هرگز به فرانت نمی‌رسد.
//   - Rate Limit: حداکثر ۱۰ درخواست در دقیقه برای هر IP
//   - CORS محدود (zeynalikid.vercel.app + *.vercel.app + localhost)
//   - هیچ Secret یا مقدار حساس در پاسخ یا لاگ چاپ نمی‌شود.
//
// Deploy: supabase functions deploy admin-credentials --no-verify-jwt
// Secret لازم: ADMIN_MGMT_TOKEN (توکن مدیریت پروژه — sbp_...)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin,
} from "../_shared/cors.ts";
import {
  validateAdminSession, extractSessionToken,
} from "../_shared/adminAuth.ts";
import {
  rateLimit, rateLimitKey, cleanupExpiredBuckets,
} from "../_shared/rateLimit.ts";

// شناسه پروژه — از SUPABASE_URL استخراج می‌شود (در صورت نبود، مقدار پیش‌فرض)
const projectRefFromUrl = (): string => {
  const url = Deno.env.get("SUPABASE_URL") || "";
  const m = url.match(/https:\/\/([^.]+)\.supabase\.co/);
  return m ? m[1] : "kkdrvexwzuuumjezipnd";
};
const MGMT_BASE = "https://api.supabase.com";

const digitsOnly = (v: string) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

function maskPhone(p: string): string {
  const d = digitsOnly(p);
  if (d.length < 7) return p || "";
  const tail = d.slice(-3);
  if (d.startsWith("98") && d.length >= 12) return `+98(xxxxxx)${tail}`;
  return `09(xxxxxx)${tail}`;
}

function normalizeIranianMobile(raw: string): string | null {
  let d = String(raw || "").replace(/[\s\-().]/g, "");
  d = digitsOnly(d);
  if (d.startsWith("0098")) d = "0" + d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  if (/^09\d{9}$/.test(d)) return d;
  return null;
}

async function updateSecrets(secrets: { name: string; value: string }[]): Promise<{ ok: boolean }> {
  const token = Deno.env.get("ADMIN_MGMT_TOKEN");
  if (!token) {
    console.error("ADMIN_MGMT_TOKEN not configured");
    return { ok: false };
  }
  const ref = projectRefFromUrl();
  try {
    const resp = await fetch(`${MGMT_BASE}/v1/projects/${ref}/secrets`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(secrets),
    });
    if (!resp.ok) {
      const txt = await resp.text().catch(() => "");
      console.error("updateSecrets failed:", resp.status, txt.slice(0, 300));
      return { ok: false };
    }
    return { ok: true };
  } catch (e) {
    console.error("updateSecrets exception:", e);
    return { ok: false };
  }
}

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "admin-credentials"), {
    maxRequests: 10,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonResponse(
      { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه بعد تلاش کنید." },
      429,
      origin,
    );
  }

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }

  const action = typeof body.action === "string" ? body.action : "";

  // get_info: شماره فعلی (ماسک‌شده) برای نمایش در پنل — نیاز به نشست معتبر
  if (action === "get_info") {
    const token = extractSessionToken(req, body);
    const s = await validateAdminSession(token);
    if (!s.ok) return jsonResponse({ error: "نشست نامعتبر است." }, 401, origin);
    return jsonResponse({
      ok: true,
      phoneMasked: maskPhone(Deno.env.get("ADMIN_PHONE") || ""),
    }, 200, origin);
  }

  if (action !== "change_credentials") {
    return jsonResponse({ error: "action نامعتبر است" }, 400, origin);
  }

  // ── change_credentials ─────────────────────────────────────────────
  const token = extractSessionToken(req, body);
  const session = await validateAdminSession(token);
  if (!session.ok) {
    return jsonResponse({ error: "نشست نامعتبر یا منقضی است." }, 401, origin);
  }

  const currentPassword = String(body.currentPassword || "");
  if (!currentPassword) {
    return jsonResponse({ error: "رمز عبور فعلی الزامی است" }, 400, origin);
  }
  const storedPwd = Deno.env.get("ADMIN_PASSWORD") || "";
  if (currentPassword !== storedPwd) {
    return jsonResponse({ error: "رمز عبور فعلی صحیح نیست" }, 401, origin);
  }

  const newPhoneRaw = body.newPhone ? String(body.newPhone) : "";
  const newPassword = body.newPassword ? String(body.newPassword) : "";
  if (!newPhoneRaw && !newPassword) {
    return jsonResponse({ error: "حداقل یکی از موارد (شماره جدید یا رمز جدید) را وارد کنید" }, 400, origin);
  }

  const secretsToUpdate: { name: string; value: string }[] = [];
  if (newPhoneRaw) {
    const np = normalizeIranianMobile(newPhoneRaw);
    if (!np) {
      return jsonResponse({ error: "شماره موبایل معتبر نیست (مثال: 09123456789)" }, 400, origin);
    }
    secretsToUpdate.push({ name: "ADMIN_PHONE", value: np });
  }
  if (newPassword) {
    if (newPassword.length < 4) {
      return jsonResponse({ error: "رمز جدید باید حداقل ۴ کاراکتر باشد" }, 400, origin);
    }
    secretsToUpdate.push({ name: "ADMIN_PASSWORD", value: newPassword });
  }

  const res = await updateSecrets(secretsToUpdate);
  if (!res.ok) {
    return jsonResponse({ error: "خطا در ذخیره‌سازی اطلاعات. لطفاً دوباره تلاش کنید." }, 500, origin);
  }

  // بستن همهٔ نشست‌ها — پس از تغییر، همه باید با اطلاعات جدید وارد شوند
  try {
    const now = new Date().toISOString();
    await getSupabaseAdmin()
      .from("admin_sessions")
      .update({ is_revoked: true, revoked_at: now });
  } catch (e) {
    console.warn("revoke all sessions failed:", e);
  }

  return jsonResponse({
    ok: true,
    message: "اطلاعات ورود به‌روزرسانی شد. برای ادامه با اطلاعات جدید وارد شوید.",
  }, 200, origin);
});
