// supabase/functions/admin-session/index.ts
// Admin session management for the Zeynalikid admin panel.
//
// IMPORTANT: This function MUST be deployed with `--no-verify-jwt` so the
// `login` action can be reached WITHOUT a prior JWT. It performs its OWN
// validation internally:
//   1. login          -> validates a PBKDF2 password hash in admin_credentials
//   2. validate_session-> validates the session token (hash + expiry + revoked)
//   3. revoke_all     -> revokes every session/device of the owner
//   4. list_devices   -> lists active devices of the owner
//   5. revoke_device  -> revokes a single device (+ its sessions)
//
// Legacy Edge secrets are read only once for a backward-compatible migration to
// the database hash. No plaintext credential or service_role reaches the browser.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { sendSecurityAlert } from "../_shared/securityAlert.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, getOrigin, rejectIfInvalidOrigin, jsonResponse,
} from "../_shared/cors.ts";
import {
  validateAdminSession, extractSessionToken, sha256,
} from "../_shared/adminAuth.ts";
import { rateLimit, rateLimitKey, centralRateLimit, cleanupExpiredBuckets } from "../_shared/rateLimit.ts";
import { verifyAdminCredentials } from "../_shared/adminCredentials.ts";

const SESSION_TTL_MS = 8 * 60 * 60 * 1000; // 8 hours — limits exposure if a device token is stolen

const digitsOnly = (v: string) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

function normalizeIranianMobile(raw: string): string | null {
  let d = String(raw || "").replace(/[\s\-().]/g, "");
  d = digitsOnly(d);
  if (d.startsWith("0098")) d = "0" + d.slice(4);
  else if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  if (/^09\d{9}$/.test(d)) return d;
  return null;
}

function randomToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function deviceInfoFromBody(body: any): { device_name: string; platform: string; browser: string; user_agent: string } {
  return {
    device_name: String(body?.device_name || "دستگاه ناشناخته").slice(0, 200),
    platform: String(body?.platform || "").slice(0, 100),
    browser: String(body?.browser || "").slice(0, 100),
    user_agent: String(body?.user_agent || "").slice(0, 300),
  };
}

async function writeSecurityAudit(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  action: string,
  actorPhone: string,
  success: boolean,
  metadata: Record<string, unknown> = {},
): Promise<void> {
  try {
    await supabase.from("admin_audit_logs").insert({
      actor_phone: actorPhone || null,
      action,
      target_type: "admin_session",
      metadata,
      success,
    });
  } catch {
    // Auditing must not make authentication unavailable.
  }
}

const adminFailCounter = new Map<string, { n: number; t: number }>();

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "admin-session"), {
    maxRequests: 30,
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
  const supabase = getSupabaseAdmin();

  // ── login (no prior JWT required) ─────────────────────────────────
  if (action === "login") {
    const phoneRaw = String(body.phone || "");
    const password = String(body.password || "");
    const phone = normalizeIranianMobile(phoneRaw);

    // Cross-instance limiter: unlike the in-memory guard above, this counter is
    // shared by every Edge instance and applies a 15-minute cooldown.
    // Cross-instance, DB-backed limiter: keys on (IP + phone) so brute-force on
    // a single account or from a single IP is blocked even across Edge instances.
    const strictRl = await centralRateLimit(req, "admin-login", {
      maxRequests: 5,
      windowMs: 15 * 60_000,
      blockMs: 60 * 60_000,   // 1 hour lockout after 5 failed attempts
    }, phone);
    if (!strictRl.ok) {
      return jsonResponse(
        { error: "تلاش‌های ورود بیش از حد مجاز است. لطفاً یک ساعت بعد دوباره تلاش کنید." },
        429,
        origin,
      );
    }

    const invalidLogin={error:"شماره تماس یا رمز عبور صحیح نیست"};
    let credentialCheck:{ok:boolean;phone:string;mustChangePassword:boolean};
    try{credentialCheck=await verifyAdminCredentials(phone,password)}catch(error){
      console.error("admin credential verification failed:",String((error as Error)?.message||error));
      await writeSecurityAudit(supabase,"admin_login_failed",phone,false,{reason:"credential_store_error"});
      return jsonResponse({error:"سرویس ورود موقتاً در دسترس نیست"},503,origin);
    }
    if(!credentialCheck.ok){
      await writeSecurityAudit(supabase,"admin_login_failed",phone,false,{reason:"invalid_credentials"});
      try {
        const ipAS=req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim()||"unknown";
        const rec=adminFailCounter.get(phone)||{n:0,t:Date.now()};
        rec.n=(Date.now()-rec.t>15*60_000)?1:rec.n+1; rec.t=Date.now();
        if(rec.n>=4){adminFailCounter.set(phone,{n:0,t:rec.t});void sendSecurityAlert("admin-brute",`ip=${ipAS}; phone=${String(phone).slice(-8)}; 4+ failed logins in 15min`,`as-brute:${ipAS}`);}
        else adminFailCounter.set(phone,rec);
      } catch { /* ignore */ }
      return jsonResponse(invalidLogin,401,origin);
    }

    const info = deviceInfoFromBody(body);
    const sessionToken = randomToken();
    const tokenHash = await sha256(sessionToken);
    const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString();
    const now = new Date().toISOString();

    // ── کاهش نشست‌های تکراری: اگر همان فرد با همان دستگاه (امضای دستگاه یکسان و معتبر)
    //    دوباره وارد شود، دستگاه قبلی را دوباره استفاده می‌کنیم و نشست‌های قدیمی همان
    //    دستگاه را می‌بندیم؛ به‌جای اینکه هر ورود یک دستگاه/نشست جدید بسازد.
    //    امضای دستگاه = device_name + platform + browser + user_agent (مستقل از تاریخ/تصادفی).
    const deviceSignatureKey = [
      info.device_name,
      info.platform,
      info.browser,
      info.user_agent,
    ].join("|");
    // UUID works with Zeynalikid's uuid column and Farzandman's text column.
    let deviceId=crypto.randomUUID();
    let deviceExists = false;
    try {
      const { data: existing, error: existingErr } = await supabase
        .from("admin_devices")
        .select("id, device_name, platform, browser, user_agent")
        .eq("owner_phone", phone)
        .eq("is_revoked", false)
        .order("last_seen_at", { ascending: false })
        .limit(20);
      if (!existingErr && Array.isArray(existing)) {
        const match = existing.find((d: any) =>
          [String(d?.device_name || ""), String(d?.platform || ""), String(d?.browser || ""), String(d?.user_agent || "")].join("|") === deviceSignatureKey
        );
        if (match?.id) {
          deviceId = match.id;
          deviceExists = true;
          // بستن نشست‌های قبلی همین دستگاه تا فقط یک نشست فعال برای آن بماند
          await supabase
            .from("admin_sessions")
            .update({ is_revoked: true, revoked_at: now })
            .eq("device_id", deviceId)
            .eq("owner_phone", phone)
            .eq("is_revoked", false);
          // به‌روزرسانی زمان آخرین فعالیت دستگاه
          await supabase
            .from("admin_devices")
            .update({ is_active: true, is_revoked: false, last_seen_at: now })
            .eq("id", deviceId);
        }
      }
    } catch (e) {
      console.error("admin-session login device-dedup error:", e);
    }

    // اگر دستگاهی با این امضا نبود، یک دستگاه جدید می‌سازیم
    if (!deviceExists) {
      const { data: deviceData, error: deviceErr } = await supabase
        .from("admin_devices")
        .insert({
          id: deviceId,
          device_name: info.device_name,
          platform: info.platform,
          browser: info.browser,
          user_agent: info.user_agent,
          owner_phone: phone,
          is_revoked: false,
          is_active: true,
          last_seen_at: now,
        })
        .select("id")
        .limit(1)
        .maybeSingle();
      if (deviceErr) {
        console.error("admin-session login device insert error:", deviceErr);
        return jsonResponse({ error: "خطا در برقراری نشست" }, 500, origin);
      }
    }

    // Insert session
    const { error: sessionErr } = await supabase.from("admin_sessions").insert({
      token_hash: tokenHash,
      device_id: deviceId,
      owner_phone: phone,
      is_revoked: false,
      expires_at: expiresAt,
      last_seen_at: now,
    });
    if (sessionErr) {
      console.error("admin-session login session insert error:", sessionErr);
      await writeSecurityAudit(supabase, "admin_login_failed", phone, false, { reason: "session_insert_failed" });
      return jsonResponse({ error: "خطا در برقراری نشست" }, 500, origin);
    }

    await writeSecurityAudit(supabase, "admin_login_success", phone, true, { deviceId });

    return jsonResponse({
      ok: true,
      sessionToken,
      deviceId,
      expiresAt,
      ownerPhone: phone,
      mustChangePassword: credentialCheck.mustChangePassword,
    }, 200, origin);
  }

  // ── validate_session ──────────────────────────────────────────────
  if (action === "validate_session") {
    const token = extractSessionToken(req, body);
    const s = await validateAdminSession(token);
    if (!s.ok) {
      return jsonResponse({ ok: false, valid: false }, 401, origin);
    }
    return jsonResponse({
      ok: true,
      valid: true,
      ownerPhone: s.session.ownerPhone,
      expiresAt: s.session.expiresAt,
    }, 200, origin);
  }

  // ── list_devices ──────────────────────────────────────────────────
  if (action === "list_devices") {
    const token = extractSessionToken(req, body);
    const s = await validateAdminSession(token);
    if (!s.ok) return jsonResponse({ error: "نشست نامعتبر یا منقضی است." }, 401, origin);

    const { data, error } = await supabase
      .from("admin_devices")
      .select("id, device_name, platform, browser, user_agent, is_active, is_revoked, last_seen_at, biometric_enabled, owner_phone")
      .eq("owner_phone", s.session.ownerPhone)
      .eq("is_revoked", false)
      .order("last_seen_at", { ascending: false });

    if (error) {
      console.error("admin-session list_devices error:", error);
      return jsonResponse({ error: "خطا در دریافت دستگاه‌ها" }, 500, origin);
    }
    return jsonResponse({ ok: true, devices: data ?? [] }, 200, origin);
  }

  // ── revoke_device ─────────────────────────────────────────────────
  if (action === "revoke_device") {
    const token = extractSessionToken(req, body);
    const s = await validateAdminSession(token);
    if (!s.ok) return jsonResponse({ error: "نشست نامعتبر یا منقضی است." }, 401, origin);

    const deviceId = String(body.deviceId || "");
    if (!deviceId) return jsonResponse({ error: "deviceId الزامی است" }, 400, origin);

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("admin_devices")
      .update({ is_revoked: true, is_active: false, revoked_at: now })
      .eq("id", deviceId)
      .eq("owner_phone", s.session.ownerPhone)
      .select("id")
      .limit(1);
    if (error) return jsonResponse({ error: "خطا در خروج دستگاه" }, 500, origin);
    if (!data || data.length === 0) return jsonResponse({ error: "دستگاه یافت نشد" }, 404, origin);

    // Also revoke all sessions of that device
    await supabase
      .from("admin_sessions")
      .update({ is_revoked: true, revoked_at: now })
      .eq("device_id", deviceId);

    return jsonResponse({ ok: true, revoked: true, id: deviceId }, 200, origin);
  }

  // ── revoke_all ────────────────────────────────────────────────────
  if (action === "revoke_all") {
    const token = extractSessionToken(req, body);
    const s = await validateAdminSession(token);
    if (!s.ok) return jsonResponse({ error: "نشست نامعتبر یا منقضی است." }, 401, origin);

    const now = new Date().toISOString();
    const { error: dErr } = await supabase
      .from("admin_devices")
      .update({ is_revoked: true, is_active: false, revoked_at: now })
      .eq("owner_phone", s.session.ownerPhone);
    const { error: sErr } = await supabase
      .from("admin_sessions")
      .update({ is_revoked: true, revoked_at: now })
      .eq("owner_phone", s.session.ownerPhone);

    if (dErr || sErr) {
      console.error("admin-session revoke_all error:", dErr, sErr);
      return jsonResponse({ error: "خطا در بستن نشست‌ها" }, 500, origin);
    }
    return jsonResponse({ ok: true, revoked: true }, 200, origin);
  }

  return jsonResponse({ error: "action نامعتبر است" }, 400, origin);
});
