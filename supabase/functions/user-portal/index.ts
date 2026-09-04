// supabase/functions/user-portal/index.ts
// پنل کاربر (ثبت‌نام / ورود / تاریخچه) — نسخه امن:
//
// Security:
//   - CORS فقط برای farzandman.vercel.app و previewهای *.vercel.app
//   - rate limit مرکزی برای هر اکشن (ضد ربات و سوزاندن پیامک)
//   - service_role فقط داخل Function
//   - شماره کامل به کلاینت برنمی‌گردد (فقط ماسک‌شده)
//   - کد OTP فقط به‌صورت هش (SHA-256 + salt) ذخیره می‌شود؛ حداکثر ۵ تلاش، انقضای ۵ دقیقه
//   - کپچا (Cloudflare Turnstile) در صورت فعال بودن از تنظیمات بررسی می‌شود
//   - ارسال واقعی پیامک فقط با otpMode='live' و کلید پنل؛ در حالت 'test' کد به‌عنوان پیش‌نمایش برمی‌گردد
//
// Deploy: supabase functions deploy user-portal --no-verify-jwt
// Secrets: TURNSTILE_SECRET_KEY (اختیاری — فقط وقتی captchaEnabled باشد الزامی است)
//          KAVENEGAR_API_KEY / SMSIR_API_KEY / MELIPAYAMAK_* (پس از خرید پنل پیامکی)

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, jsonResponse, getOrigin } from "../_shared/cors.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";
import { sendSecurityAlert } from "../_shared/securityAlert.ts";

const PREFIX = String(Deno.env.get("TRACKING_PREFIX") || "ZK").toUpperCase() === "FM" ? "FM" : "ZK";

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";
const randomCode = () => {
  const length = 7 + crypto.getRandomValues(new Uint8Array(1))[0] % 3;
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const first = String(1 + (bytes[0] % 9));
  const body = first + Array.from(bytes.slice(1), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${PREFIX}-${body}`;
};

const faDigits = (v: string) =>
  String(v ?? "").replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const digitsOnly = (v: string) => faDigits(v).replace(/\D/g, "");

/** نرمال‌سازی: ۰۹۱۲… / ۹۱۲… / +98912… / 0098912… → +98912… (برای بقیه +CC…) */
// ─── برچسب‌های نمایشی برای پنل کاربر: خلاصه فرم، طریقه مصرف، گزارش‌ها ───
// وضعیت آموزشیِ دوره فقط برای پنل کاربر: پس از ثبت فیش/اس‌ام‌اس، «در انتظار پرداخت» نه، بلکه «ثبت شد – در انتظار تأیید»
const coursePortalStatus = (p: any): string => {
  const os = String(p?.orderStatus || "").trim();
  if (os && os !== "جدید" && os !== "در انتظار پرداخت" && os !== "ثبتی") return os; // وضعیتِ تنظیم‌شده توسط ادمین دست‌نخورده می‌ماند
  const pay = p?.payment || {};
  const hasProof = !!(pay.receipt || pay.receipt_image || String(pay.receiptText || "").trim() || String(pay.receipt_text || "").trim() || pay.receiptMethod);
  if (hasProof) return "دوره ثبت شد – در انتظار تأیید";
  return os || "جدید";
};

const briefForm = (p: any) => {
  const norm = (v: any) => { const t = Array.isArray(v) ? v.map((x: any) => String(x ?? "").trim()).filter(Boolean).join("، ") : String(v ?? "").trim(); return t.slice(0, 300); };
  const rows = [
    ["نام و نام خانوادگی", norm(p.pName || p.fullName)],
    ["نام کودک", norm(p.childName)],
    ["سن", norm(p.age)],
    ["جنسیت", p.gender === "female" ? "دختر" : p.gender === "male" ? "پسر" : ""],
    ["قد (سانتی‌متر)", norm(p.height)],
    ["وزن (کیلوگرم)", norm(p.weight)],
    ["اشتها", norm(p.appetite)],
    ["خواب", norm(p.sleep)],
    ["فعالیت روزانه", norm(p.activity)],
    ["بیماری / عارضه / جراحی", norm(p.disease || p.diseases)],
    ["دفع و اجابت مزاج", norm(p.digest)],
    ["حساسیت غذایی", norm(p.allergies)],
    ["دارو", norm(p.medications)],
    ["موضوعات مشاوره", norm(p.topics)],
    ["توضیحات تکمیلی", norm(p.notes || p.additionalDesc || p.additionalNotes)],
  ];
  return rows.filter((r) => r[1] && r[1] !== "ندارد").map((r) => ({ label: r[0], value: r[1] }));
};
const briefUsage = (p: any) => {
  const labels: Record<string, string> = { time: "زمان مصرف", dosage: "مقدار مصرف", how: "نحوه مصرف", before: "قبل از غذا", after: "بعد از غذا", note: "یادداشت", text: "توضیح", when: "زمان مصرف" };
  const prods = Array.isArray(p.course?.products) ? p.course.products : [];
  const pu = p.productUsage || {};
  const rows: { name: string; lines: string[] }[] = [];
  for (const k of Object.keys(pu)) {
    const u = pu[k] || {};
    if (u.enabled === false) continue;
    const pr = prods.find((x: any) => String(x?.id ?? "") === String(k));
    const lines = Object.keys(u).filter((kk) => kk !== "enabled" && typeof u[kk] === "string" && String(u[kk]).trim())
      .map((kk) => `${labels[kk] || kk}: ${String(u[kk]).trim().slice(0, 200)}`);
    if (lines.length) rows.push({ name: String(pr?.title || pr?.name || k), lines });
  }
  return { instructions: String(p.usageInstructions || "").trim().slice(0, 1200), rows };
};
const briefReports = (p: any) => {
  const fups = (Array.isArray(p.followUps) ? p.followUps : []).map((s: any, i: number) => ({ step: i + 1, state: s === "done" ? "پیگیری انجام شد" : s === "miss" ? "تماس بدون پاسخ" : "در انتظار پیگیری" })).filter((x) => x.state !== "در انتظار پیگیری");
  const c = p.correctiveData && typeof p.correctiveData === "object" ? p.correctiveData : {};
  const cn = (v: any) => String(v ?? "").trim().slice(0, 300);
  const corr = [["قد (سانتی‌متر)", cn(c.height)], ["وزن (کیلوگرم)", cn(c.weight)], ["توضیح خانواده", cn(c.notes || c.description)]].filter((r) => r[1]).map((r) => ({ label: r[0], value: r[1] }));
  return { followUps: fups, corrective: corr };
};

const normalizePhone = (raw: string): string => {
  let d = digitsOnly(raw);
  if (d.length < 7) return "";
  if (d.startsWith("0098")) d = d.slice(2);
  if (d.startsWith("98") && d.length === 12) d = "0" + d.slice(2);
  if (d.startsWith("9") && d.length === 10) d = "0" + d;
  if (d.startsWith("0")) return `+98${d.slice(1)}`;
  return `+${d}`;
};

const maskPhone = (phone: string): string => {
  const d = digitsOnly(String(phone || "").replace(/^\+/, ""));
  if (d.length < 7) return "";
  const last3 = d.slice(-3);
  if (d.startsWith("98")) return "+98" + d.slice(2, 6) + "xxxx" + last3;
  return d.slice(0, 3) + "xxxx" + last3;
};

/** نام واقعی: minimum LETTER count, mirroring src/utils/userPortal.ts — fa: 3 letters (e.g. «علی»), en: 2 Latin letters. */
const PERSIAN_TOKEN_RE = /^[\u0600-\u06FF\u0750-\u077F]+$/;
const LATIN_NAME_RE = /^[A-Za-z][A-Za-z '.-]*$/;
const NAME_RULE_ERROR = "نام و نام خانوادگی خود را به درستی وارد کنید.";
const NAME_RULE_ERROR_EN = "Enter your first and last name correctly.";

const validateFullName = (raw: string, minLetters?: number): { ok: boolean; error?: string } => {
  const cleaned = String(raw ?? "").replace(/[\u200c\u0640]/g, " ").replace(/\s+/g, " ").trim();
  if (!cleaned) return { ok: false, error: "نام را وارد کنید." };
  const letters = cleaned.replace(/[\s'.,-]/g, "");
  if (/[A-Za-z]/.test(cleaned)) {
    if (!LATIN_NAME_RE.test(cleaned)) return { ok: false, error: NAME_RULE_ERROR_EN };
    if (letters.length < 2) return { ok: false, error: NAME_RULE_ERROR_EN };
    return { ok: true };
  }
  for (const part of cleaned.split(" ").filter(Boolean)) {
    if (!PERSIAN_TOKEN_RE.test(part)) return { ok: false, error: NAME_RULE_ERROR };
  }
  const min = Math.max(2, Math.min(8, Number(minLetters) || 3));
  if (letters.length < min) return { ok: false, error: NAME_RULE_ERROR };
  return { ok: true };
};

const sha256Hex = async (text: string): Promise<string> => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
};

/** هش OTP با salt تصادفی — ذخیره به‌صورت `salt:hash` */
const hashOtp = async (otp: string): Promise<string> => {
  const salt = crypto.getRandomValues(new Uint8Array(8));
  const saltHex = Array.from(salt, (b) => b.toString(16).padStart(2, "0")).join("");
  const hash = await sha256Hex(`${saltHex}:${otp}`);
  return `${saltHex}:${hash}`;
};
const verifyOtpHash = async (otp: string, stored: string): Promise<boolean> => {
  const [saltHex, hash] = String(stored || "").split(":");
  if (!saltHex || !hash) return false;
  const calc = await sha256Hex(`${saltHex}:${otp}`);
  return calc === hash;
};

/** ارسال واقعی پیامک از طریق پنل — فقط وقتی کلید تنظیم شده باشد */
const sendSms = async (provider: string, apiKey: string, sender: string, phone: string, text: string): Promise<{ ok: boolean; error?: string }> => {
  if (!apiKey) return { ok: false, error: "پنل پیامکی هنوز متصل نشده است (کلید API تنظیم نشده)." };
  try {
    if (provider === "smsir") {
      const res = await fetch(`https://api.sms.ir/v1/send/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey },
        body: JSON.stringify({ lineNumber: Number(sender) || 0, messageText: text, mobiles: [phone.replace("+", "")] }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `ارسال پیامک ناموفق بود (${res.status})` };
    }
    if (provider === "melipayamak") {
      const res = await fetch(`https://sms.melipayamak.ir/api/v1/sms/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ username: apiKey.split(":")[0] || "", password: apiKey.split(":")[1] || "", to: phone.replace("+", ""), from: sender, text }),
      });
      return res.ok ? { ok: true } : { ok: false, error: `ارسال پیامک ناموفق بود (${res.status})` };
    }
    // kavenegar (پیش‌فرض)
    const res = await fetch(`https://api.kavenegar.com/v1/${apiKey}/sms/send.json?receptor=${encodeURIComponent(phone.replace("+", ""))}&message=${encodeURIComponent(text)}`);
    return res.ok ? { ok: true } : { ok: false, error: `ارسال پیامک ناموفق بود (${res.status})` };
  } catch (e) {
    return { ok: false, error: String(e instanceof Error ? e.message : e) };
  }
};

/** بررسی کپچای Turnstile اگر فعال باشد */
const verifyCaptcha = async (token: string | undefined): Promise<{ ok: boolean; error?: string }> => {
  if (!token) return { ok: false, error: "تأیید امنیتی (کپچا) الزامی است." };
  // نام کلید باید با سکرتِ ذخیره‌شده در Supabase یکی باشد (TURNSTILE_SECRET_KEY).
  // مقدار جایگزینِ قدیمی (placeholder) که با 0x شروع نمی‌شود «تنظیم‌نشده» شمرده می‌شود تا پیامِ روشن بدهد.
  const secret = (Deno.env.get("TURNSTILE_SECRET_KEY") || Deno.env.get("TURNSTILE_SECRET") || "").trim();
  if (!secret || !/^0x/i.test(secret)) return { ok: false, error: "کپچا فعال است اما کلید تأیید سرور تنظیم نشده است." };
  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, response: token }),
    });
    const data = await res.json().catch(() => ({}));
    return data?.success === true ? { ok: true } : { ok: false, error: "تأیید امنیتی ناموفق بود؛ دوباره تلاش کنید." };
  } catch {
    return { ok: false, error: "سرویس تأیید امنیتی در دسترس نیست؛ کمی بعد تلاش کنید." };
  }
};

// بدنه کد پیگیری بدون پیشوند (ZK/FM) — تا کدهایی که با پیشوند دیگر ساخته شده‌اند هم پیدا شوند
const codeBody = (v: unknown) => {
  const s = String(v || "").trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = s.match(/[0-9][A-Z0-9]*$/);
  return m ? m[0] : s;
};

const getUserRecord = async (supabase: any, phone: string, code?: string) => {
  const { data } = await supabase
    .from("submissions")
    .select("id,full_phone,payload,created_at")
    .eq("full_phone", phone)
    .is("deleted_at", null)
    .ilike("payload->>type", "user")
    .order("created_at", { ascending: false })
    .limit(5);
  const rows = data || [];
  if (!code) return rows[0] || null;
  const wanted = String(code).trim().toUpperCase();
  const wantedBody = codeBody(wanted);
  // ۱) تطبیق کامل کد ۲) تطبیق بدنه کد (پیشوند فرق کرده باشد) ۳) کد بایگانی‌شده قدیمی
  return (
    rows.find((r: any) => String(r.payload?.code || "").toUpperCase() === wanted) ||
    (wantedBody ? rows.find((r: any) =>
      codeBody(r.payload?.code) === wantedBody || codeBody(r.payload?.legacyCode) === wantedBody) : null) ||
    null
  );
};

/** تطبیق نرمِ شماره (ایرانی: ۱۰ رقم آخر) برای ثبت‌نام خودکار از رکورد مشاوره */
const phoneLooseMatch = (a: string, b: string): boolean => {
  const norm = (v: string) => { let d = digitsOnly(String(v || "")); if (d.startsWith("00")) d = d.slice(2); if (d.startsWith("0")) d = "98" + d.slice(1); return d; };
  const ka = norm(a); const kb = norm(b);
  if (!ka || !kb) return false;
  if (ka === kb) return true;
  const tail = (v: string) => (/^989\d{9}$/.test(v) ? v.slice(-10) : v);
  return tail(ka) === tail(kb);
};

/** جست‌وجوی رکورد فقط با بدنه کد (هر پیشوندی: ZK-/FM/F/M/هیچی) در هر دو ستون code و trackingCode */
const findRecordByCode = async (supabase: any, codeRaw: string) => {
  const bodyC = codeBody(codeRaw);
  if (bodyC.length < 4) return null; // کدهای قدیمی ۵رقمی (مثل FM85905) هم مجاز
  const lc = bodyC.toLowerCase();
  const cands = Array.from(new Set([`${PREFIX}-${lc}`, lc, `${PREFIX}${lc}`, bodyC]));
  for (const cand of cands) {
    for (const col of ["trackingCode", "code"]) {
      try {
        const { data } = await supabase
          .from("submissions").select("id,full_phone,payload,created_at")
          .is("deleted_at", null).ilike(`payload->>${col}`, cand)
          .order("created_at", { ascending: false }).limit(5);
        const hit = (data || []).find((r: any) => codeBody(r.payload?.trackingCode) === bodyC || codeBody(r.payload?.code) === bodyC);
        if (hit) return hit;
      } catch { /* ادامه */ }
    }
  }
  return null;
};

/** ماسک پیش‌نمایش — دقیقاً همان قاعده صفحه پیگیری */
const maskPhonePreview = (stored: string): string => {
  const d = digitsOnly(String(stored || ""));
  if (!d || d.length < 7) return "";
  const last3 = d.slice(-3);
  if (d.startsWith("98")) { const local = "0" + d.slice(2); return local.slice(0, 4) + "xxxx" + last3; }
  if (d.startsWith("09")) return d.slice(0, 4) + "xxxx" + last3;
  const prefix = String(stored || "").match(/^(\+\d{1,3})/)?.[0] || "";
  if (prefix) { const rest = d.slice(prefix.replace("+", "").length); return prefix + rest.slice(0, 3) + "xxxx" + last3; }
  return d.slice(0, 4) + "xxxx" + last3;
};

const loginFailCounter = new Map<string, { n: number; t: number }>();

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: "درخواست نامعتبر است" }, 400, origin); }
  const action = String(body?.action || "");
  const rawPhone = String(body?.phone || "");
  const phone = normalizePhone(rawPhone);
  if (!phone && action !== "preview-phone") return jsonResponse({ error: "شماره تماس معتبر نیست" }, 400, origin);

  // تنظیمات پنل کاربر از جدول settings
  let portalCfg: any = { otpMode: "test", captchaEnabled: false, smsProvider: "kavenegar", smsApiKey: "", smsSender: "", minNameWords: 3 };
  try {
    const sup = getSupabaseAdmin();
    const { data } = await sup.from("settings").select("settings").eq("key", "app_settings").limit(1).maybeSingle();
    if (data?.settings?.userPortal && typeof data.settings.userPortal === "object") {
      const u = data.settings.userPortal;
      portalCfg = {
        otpMode: ["off", "test", "live"].includes(u.otpMode) ? u.otpMode : "test",
        captchaEnabled: u.captchaEnabled === true,
        smsProvider: ["kavenegar", "smsir", "melipayamak"].includes(u.smsProvider) ? u.smsProvider : "kavenegar",
        smsApiKey: String(u.smsApiKey || ""),
        smsSender: String(u.smsSender || ""),
        minNameWords: Math.max(2, Math.min(6, Number(u.minNameWords) || 3)),
      };
    }
    // کدهای ارجاع فعال (برای اینکه ثبت‌نام از لینک مشاور، به همان مشاور برگردد)
    const list = Array.isArray(data?.settings?.consultants) ? data.settings.consultants : [];
    portalCfg.referralCodes = new Set(
      list.filter((c: any) => c?.active !== false && String(c?.referralCode || "").trim())
        .map((c: any) => String(c.referralCode).trim().toLowerCase()),
    );
    const _nm = new Map<string, string>();
    for (const c of list) {
      const rc = String(c?.referralCode || "").trim().toLowerCase();
      const cn = String(c?.name || "").trim();
      if (rc && c?.active !== false && cn) _nm.set(rc, cn);
    }
    portalCfg.referralNames = _nm;
  } catch { /* پیشفرضها */ }

  // ─────────────── اکشن: preview-phone (پیش‌نمایش ماسک‌شده شماره با کد پیگیری) ───────────────
  if (action === "preview-phone") {
    const rl = await centralRateLimit(req, "user-portal-preview", { maxRequests: 20, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
    if (!rl.ok) return jsonResponse({ ok: true, found: false }, 200, origin);
    const supabase = getSupabaseAdmin();
    const rec = await findRecordByCode(supabase, String(body?.code || ""));
    const masked = rec ? maskPhonePreview(String(rec.full_phone || "")) : "";
    return jsonResponse({ ok: true, found: !!masked, maskedPhone: masked }, 200, origin);
  }

  // ─────────────── اکشن: start (ثبتنام مرحله ۱ — ارسال کد) ───────────────
  if (action === "start") {
    const rl = await centralRateLimit(req, "user-portal-start", { maxRequests: 100, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
    if (!rl.ok) return jsonResponse({ error: "حجم ثبت‌نام بالاست؛ لطفاً ۵ دقیقه دیگر دوباره تلاش کنید." }, 429, origin);

    if (portalCfg.captchaEnabled) {
      const cap = await verifyCaptcha(body?.captchaToken);
      if (!cap.ok) return jsonResponse({ error: cap.error }, 400, origin);
    }

    const supabase = getSupabaseAdmin();
    // قبلاً ثبتنام کرده؟
    const existing = await getUserRecord(supabase, phone);
    if (existing && existing.payload?.status === "active") {
      return jsonResponse({ ok: true, exists: true, loginHint: true, maskedPhone: maskPhone(phone) }, 200, origin);
    }

    const nameCheck = validateFullName(String(body?.fullName || ""), portalCfg.minNameWords);
    if (!nameCheck.ok) return jsonResponse({ error: nameCheck.error }, 400, origin);
    const fullName = String(body?.fullName || "").replace(/\s+/g, " ").trim();

    // کد ارجاع: فقط اگر واقعاً در تنظیمات وجود دارد پذیرفته می‌شود
    const rawRef = String(body?.referralCode || "").trim().toLowerCase();
    const referralCode = rawRef && portalCfg.referralCodes instanceof Set && portalCfg.referralCodes.has(rawRef) ? rawRef.slice(0, 40) : "";
    const referralFields = referralCode ? { referralCode, origin: "referral" } : {};

    // اگر OTP خاموش است: ثبتنام مستقیم
    if (portalCfg.otpMode === "off") {
      const code = await adoptOrCreateCode(supabase, phone);
      const linkedOff = await linkPastRecords(supabase, phone, code, fullName);
      const { error } = await upsertUser(supabase, phone, { ...referralFields, fullName, code, status: "active", otpMode: "off", lastLoginAt: new Date().toISOString(), origin: linkedOff > 0 ? "guest" : "new" });
      if (error) return jsonResponse({ error: "ثبتنام انجام نشد؛ دوباره تلاش کنید." }, 500, origin);
      return jsonResponse({ ok: true, exists: false, otpMode: "off", code, fullName, maskedPhone: maskPhone(phone) }, 201, origin);
    }

    // ساخت/بهروزرسانی رکورد در انتظار + OTP
    const otpCode = String(100000 + Math.floor(Math.random() * 900000));
    const otpHash = await hashOtp(otpCode);
    const otpExpires = Date.now() + 5 * 60_000;
    const pending = await upsertUser(supabase, phone, {
      ...referralFields,
      fullName, status: "pending", otpHash, otpExpires, otpAttempts: 0,
      code: existing?.payload?.code || "",
    });
    if (pending.error) return jsonResponse({ error: "ثبتنام انجام نشد؛ دوباره تلاش کنید." }, 500, origin);

    if (portalCfg.otpMode === "live") {
      const msg = `کد ورود شما به پنل کاربر ${PREFIX === "FM" ? "فرزند من" : "زینالیکید"}: ${otpCode}`;
      const sent = await sendSms(portalCfg.smsProvider, portalCfg.smsApiKey, portalCfg.smsSender, phone, msg);
      if (!sent.ok) return jsonResponse({ error: sent.error || "ارسال کد ناموفق بود." }, 502, origin);
      return jsonResponse({ ok: true, exists: false, otpMode: "live", maskedPhone: maskPhone(phone) }, 200, origin);
    }

    // حالت تست (تا زمان خرید پنل پیامکی): کد فقط در پاسخ تستی برمیگردد
    return jsonResponse({ ok: true, exists: false, otpMode: "test", otpPreview: otpCode, maskedPhone: maskPhone(phone) }, 200, origin);
  }

  // ─────────────── اکشن: confirm (تأیید کد پیامکی + ساخت کد پیگیری) ───────────────
  if (action === "confirm") {
    const rl = await centralRateLimit(req, "user-portal-confirm", { maxRequests: 100, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
    if (!rl.ok) return jsonResponse({ error: "چند بار تلاش کرده‌اید؛ لطفاً ۵ دقیقه دیگر دوباره امتحان کنید." }, 429, origin);

    const supabase = getSupabaseAdmin();
    const pending = await getUserRecord(supabase, phone);
    if (!pending || pending.payload?.status !== "pending") {
      return jsonResponse({ error: "ابتدا درخواست کد تأیید را ارسال کنید." }, 400, origin);
    }
    if (Date.now() > Number(pending.payload.otpExpires || 0)) {
      return jsonResponse({ error: "کد منقضی شده است؛ دوباره درخواست کد بدهید." }, 410, origin);
    }
    const ok = await verifyOtpHash(String(body?.otp || ""), String(pending.payload.otpHash || ""));
    if (!ok) {
      // (محدودیت ۵ تلاش حذف شد — بنا به دستور)
      return jsonResponse({ error: "کد تأیید اشتباه است." }, 400, origin);
    }

    const code = await adoptOrCreateCode(supabase, phone);
    const linkedC = await linkPastRecords(supabase, phone, code, String(pending.payload.fullName || ""));
    const { error } = await upsertUser(supabase, phone, {
      fullName: pending.payload.fullName, code, status: "active", verifiedAt: new Date().toISOString(),
      lastLoginAt: new Date().toISOString(), otpMode: portalCfg.otpMode, origin: linkedC > 0 ? "guest" : "new",
    });
    if (error) return jsonResponse({ error: "تکمیل ثبتنام انجام نشد؛ دوباره تلاش کنید." }, 500, origin);



    return jsonResponse({ ok: true, code, fullName: String(pending.payload.fullName || ""), maskedPhone: maskPhone(phone) }, 200, origin);
  }

  // ─────────────── اکشن: login ───────────────
  if (action === "login" || action === "me") {
    const rl = await centralRateLimit(req, "user-portal-login", { maxRequests: 100, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
    if (!rl.ok) return jsonResponse({ error: "تعداد درخواستها بیش از حد مجاز است؛ کمی بعد تلاش کنید." }, 429, origin);

    // در حالت «پنل کاربر» کپچا همان‌جا روی فرم ورود نشسته است (فقط برای login، نه بررسی نشست)
    const ipUP = req.headers.get("X-Forwarded-For")?.split(",")[0]?.trim() || "unknown";
    if (action === "login" && portalCfg.captchaEnabled) {
      const cap = await verifyCaptcha(body?.captchaToken);
      if (!cap.ok) {
        void sendSecurityAlert("captcha", `fn=user-portal action=${action}; ip=${ipUP}`, `up-cap:${ipUP}`);
        return jsonResponse({ error: cap.error }, 400, origin);
      }
    }

    const code = String(body?.code || "").replace(/\s+/g, "").toUpperCase();
    if (!code) return jsonResponse({ error: "کد پیگیری الزامی است" }, 400, origin);
    const supabase = getSupabaseAdmin();
    let user = await getUserRecord(supabase, phone, code);
    // ثبت‌نام خودکارِ بی‌صدا: والدی که فقط «درخواست مشاوره» ثبت کرده و کد درست + شماره همان رکورد را
    // وارد می‌کند، با همان کد حسابش ساخته می‌شود (دقیقاً مثل ثبت‌نام عادی؛ سوابق هم پیوند می‌خورند).
    if ((!user || user.payload?.status !== "active") && user?.payload?.status !== "blocked") {
      const found = await findRecordByCode(supabase, code);
      if (found && phoneLooseMatch(String(found.full_phone || ""), phone)) {
        const keepCode = String(found.payload?.trackingCode || found.payload?.code || "") || code;
        const nm = [found.payload?.fullName, found.payload?.parentName, found.payload?.pName, found.payload?.childName].map((v: any) => String(v || "").trim()).filter(Boolean)[0] || "";
        await upsertUser(supabase, phone, { status: "active", code: keepCode, fullName: nm, origin: "guest" });
        await linkPastRecords(supabase, phone, keepCode, nm);
        const again = await getUserRecord(supabase, phone, code);
        if (again) user = again;
      }
    }
    if (!user || user.payload?.status !== "active") {
      // نگهبان: حدس کد/شماره در پنل کاربر — پس از ۸ خطای پیاپی در ۳۰ دقیقه به مالک گزارش می‌شود
      try {
        const fk = `${ipUP}|${phone}`;
        const rec = loginFailCounter.get(fk) || { n: 0, t: Date.now() };
        rec.n = (Date.now() - rec.t > 30 * 60_000) ? 1 : rec.n + 1;
        rec.t = Date.now();
        if (rec.n >= 8) { loginFailCounter.set(fk, { n: 0, t: rec.t }); void sendSecurityAlert("portal-brute", `ip=${ipUP}; phone=${phone.slice(-8)}; 8+ attempts in 30min`, `up-brute:${ipUP}`); }
        else loginFailCounter.set(fk, rec);
      } catch { /* گزارش‌دهی نباید ورود را خراب کند */ }
      return jsonResponse({ error: "شماره تماس یا کد پیگیری اشتباه است." }, 404, origin);
    }
    if (action === "login") {
      // کاربران قدیمی بدون origin: برچسب «مهمان» بر اساس سوابق قبلی همین شماره
      let nextPayload = { ...user.payload, lastLoginAt: new Date().toISOString() };
      if (!nextPayload.origin) {
        const linkedL = await linkPastRecords(supabase, phone, String(nextPayload.code || ""), String(nextPayload.fullName || ""));
        nextPayload.origin = linkedL > 0 ? "guest" : "new";
      }
      await supabase.from("submissions").update({ payload: nextPayload }).eq("id", user.id);
    }
    return jsonResponse({
      ok: true,
      code: String(user.payload.code || ""),
      fullName: String(user.payload.fullName || ""),
      maskedPhone: maskPhone(phone),
      createdAt: String(user.created_at || ""),
    }, 200, origin);
  }

  // ─────────────── اکشن: history (دورهها و مشاورههای کاربر) ───────────────
  if (action === "history") {
    const rl = await centralRateLimit(req, "user-portal-history", { maxRequests: 400, windowMs: 10 * 60_000, blockMs: 5 * 60_000 });
    if (!rl.ok) return jsonResponse({ error: "تعداد درخواستها بیش از حد مجاز است؛ کمی بعد تلاش کنید." }, 429, origin);

    const code = String(body?.code || "").replace(/\s+/g, "").toUpperCase();
    if (!code) return jsonResponse({ error: "کد پیگیری الزامی است" }, 400, origin);
    const supabase = getSupabaseAdmin();
    const user = await getUserRecord(supabase, phone, code);
    if (!user || user.payload?.status !== "active") {
      return jsonResponse({ error: "نشست شما معتبر نیست؛ دوباره وارد شوید." }, 404, origin);
    }
    const { data: rows, error } = await supabase
      .from("submissions")
      .select("id,full_phone,payload,created_at")
      .eq("full_phone", phone)
      .is("deleted_at", null)
      .not("payload->>type", "eq", "user")
      .order("created_at", { ascending: false })
      .limit(50);
    if (error) return jsonResponse({ error: "دریافت سوابق انجام نشد." }, 500, origin);

    const items = (rows || []).map((r: any) => {
      const p = r.payload || {};
      return {
        id: String(r.id || ""),
        type: p.type === "course" ? "course" : "consultation",
        status: p.type === "course" ? coursePortalStatus(p) : (p.consultationStatus || "مشاوره اولیه"),
        title: p.course?.title || (p.type === "course" ? "ثبتنام دوره" : "درخواست مشاوره"),
        amount: p.payment?.amount || "",
        date: String(p.date || ""),
        time: String(p.time || ""),
        createdAt: String(r.created_at || ""),
        mealPlan: p.showMealPlan === true ? String(p.mealPlan || "").slice(0, 6000) : "",
        sportPlan: p.showSportPlan === true ? String(p.sportPlan || "").slice(0, 6000) : "",
        userNotes: String(p.userNotes || "").slice(0, 1500),
        code: String(p.trackingCode || ""),
        form: briefForm(p),
        usage: briefUsage(p),
        reports: briefReports(p),
        correctiveEnabled: p.showCorrectiveTab === true,
      };
    });
    const advName = (() => {
      try {
        const rc = String((user.payload as any)?.referralCode || "").trim().toLowerCase();
        return rc && portalCfg.referralNames && portalCfg.referralNames.get ? String(portalCfg.referralNames.get(rc) || "") : "";
      } catch { return ""; }
    })();
    return jsonResponse({ ok: true, code, fullName: String(user.payload.fullName || ""), maskedPhone: maskPhone(phone), items, count: items.length, advisorName: advName }, 200, origin);
  }

  // ─────────────── اکشن: update-info (ویرایش کاربر از پنل — با editHistory برای پنل متخصص) ───────────────
  if (action === "update-info") {
    const rl = await centralRateLimit(req, "user-portal-edit", { maxRequests: 15, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
    if (!rl.ok) return jsonResponse({ error: "تعداد ویرایش‌ها بیش از حد مجاز است؛ کمی بعد تلاش کنید." }, 429, origin);
    const code = String(body?.code || "").replace(/\s+/g, "").toUpperCase();
    if (!code) return jsonResponse({ error: "کد پیگیری الزامی است" }, 400, origin);
    const supabase = getSupabaseAdmin();
    const user = await getUserRecord(supabase, phone, code);
    if (!user || user.payload?.status !== "active") {
      return jsonResponse({ error: "نشست شما معتبر نیست؛ دوباره وارد شوید." }, 404, origin);
    }
    const idRaw = String(body?.id || "").trim();
    if (!idRaw) return jsonResponse({ error: "شناسه رکورد لازم است" }, 400, origin);
    const LIMITS: Record<string, number> = { childName: 80, age: 40, gender: 10, height: 20, weight: 20, appetite: 300, sleep: 300, activity: 300, disease: 1200, digest: 300, allergies: 300, medications: 600, notes: 2000 };
    const clean: Record<string, string> = {};
    for (const [k, max] of Object.entries(LIMITS)) {
      const v = (body?.fields as any)?.[k];
      if (v === undefined || v === null) continue;
      if (k === "gender") { const g = String(v).trim().toLowerCase(); clean[k] = g === "male" || g === "female" ? g : ""; continue; }
      clean[k] = String(v).trim().slice(0, max);
    }
    let q = supabase.from("submissions").select("id,payload").eq("full_phone", phone).is("deleted_at", null).not("payload->>type", "eq", "user");
    q = /^\d+$/.test(idRaw) ? q.eq("id", Number(idRaw)) : q.eq("id", idRaw);
    const { data: rec, error: recErr } = await q.maybeSingle();
    if (recErr || !rec) return jsonResponse({ error: "رکوردی پیدا نشد." }, 404, origin);
    const p: Record<string, any> = (rec.payload && typeof rec.payload === "object") ? rec.payload : {};
    const changed = Object.keys(clean).filter((k) => String(p[k] ?? "") !== clean[k]);
    if (!changed.length) return jsonResponse({ ok: true, updated: false, message: "تغییری ثبت نشد." }, 200, origin);
    const faDate = (): string => {
      try {
        const parts = new Intl.DateTimeFormat("en-US-u-ca-persian", { year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
        const y = parts.find((x) => x.type === "year")?.value || "";
        const m = parts.find((x) => x.type === "month")?.value || "";
        const d = parts.find((x) => x.type === "day")?.value || "";
        return `${y}/${m}/${d}`;
      } catch { return new Date().toISOString().slice(0, 10); }
    };
    const faTime = (): string => { try { return new Date().toLocaleTimeString("en-GB", { hour12: false }); } catch { return ""; } };
    const prevData: Record<string, string> = {};
    for (const k of changed) prevData[k] = String(p[k] ?? "");
    const historyEntry = { date: faDate(), time: faTime(), actor: `کاربر (پنل) — ${maskPhone(phone)}`, fields: changed, data: prevData };
    const newPayload = { ...p, ...Object.fromEntries(changed.map((k) => [k, clean[k]])), editHistory: [...(Array.isArray(p.editHistory) ? p.editHistory : []), historyEntry] };
    const { error: upErr } = await supabase.from("submissions").update({ payload: newPayload, updated_at: new Date().toISOString() }).eq("id", (rec as any).id);
    if (upErr) return jsonResponse({ error: "ذخیره تغییرات انجام نشد." }, 500, origin);
    return jsonResponse({ ok: true, updated: true, fields: changed }, 200, origin);
  }

  return jsonResponse({ error: "اکشن نامعتبر است" }, 400, origin);
});

/** کد یکپارچه: اگر شماره قبلاً کد پیگیری داشته، همان؛ وگرنه کد تازه یکتا */
async function adoptOrCreateCode(supabase: any, phone: string): Promise<string> {
  // ۱) کد موجود همین شماره را به ارث ببر (تککد برای هر کاربر/شماره)
  try {
    const { data } = await supabase
      .from("submissions")
      .select("payload")
      .eq("full_phone", phone)
      .is("deleted_at", null)
      .not("payload->>type", "eq", "user")
      .not("payload->>trackingCode", "is", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    const adopted = data?.payload?.trackingCode ? String(data.payload.trackingCode) : "";
    if (adopted) return adopted;
  } catch { /* ادامه */ }
  // ۲) کد تازه یکتا — بدون برخورد با کدهای موجود
  const seen = new Set<string>();
  try {
    const { data } = await supabase.from("submissions").select("payload->>trackingCode").not("payload->>trackingCode", "is", null).limit(4000);
    for (const row of data || []) {
      const c = row?.trackingCode || row?.payload?.trackingCode;
      if (c) seen.add(String(c).toLowerCase());
    }
  } catch { /* اگر خواندن نشد، باز هم تلاش کن */ }
  for (let attempt = 0; attempt < 20; attempt++) {
    const candidate = randomCode();
    if (!seen.has(candidate.toLowerCase())) return candidate;
  }
  return randomCode();
}

/** ثبت/بهروزرسانی رکورد کاربر (type=user) */
async function upsertUser(supabase: any, phone: string, fields: Record<string, unknown>) {
  const existing = await getUserRecord(supabase, phone);
  const payload = {
    type: "user",
    kind: "user_account",
    status: fields.status || "pending",
    fullName: fields.fullName || "",
    code: fields.code || "",
    phone,
    createdAt: existing?.payload?.createdAt || new Date().toISOString(),
    ...fields,
    unread: false,
    isNew: false,
  };
  if (existing) {
    const { error } = await supabase.from("submissions").update({ payload }).eq("id", existing.id);
    return { error };
  }
  // حسابِ حذف‌شده نرم‌افزاریِ همین شماره؟ به‌جای ساخت حساب دوم، همان بازیابی می‌شود
  try {
    const { data: del } = await supabase.from("submissions").select("id")
      .eq("full_phone", phone).eq("payload->>type", "user").not("deleted_at", "is", null)
      .order("created_at", { ascending: false }).limit(1).maybeSingle();
    if (del) {
      const { error } = await supabase.from("submissions").update({ payload, deleted_at: null }).eq("id", del.id);
      return { error: error || null };
    }
  } catch { /* عادی‌سازی بی‌خطر */ }
  const { error } = await supabase.from("submissions").insert({ full_phone: phone, payload, deleted_at: null });
  return { error };
}

/** پیوند سوابق قدیمی همین شماره به کد کاربر */
async function linkPastRecords(supabase: any, phone: string, code: string, fullName: string): Promise<number> {
  let linked = 0;
  try {
    const { data } = await supabase
      .from("submissions")
      .select("id,payload")
      .eq("full_phone", phone)
      .is("deleted_at", null)
      .not("payload->>type", "eq", "user")
      .limit(100);
    for (const row of data || []) {
      const p = row.payload || {};
      if (p.userCode === code) continue;
      const next = { ...p, userCode: code, userPhone: phone, userName: fullName };
      const { error } = await supabase.from("submissions").update({ payload: next }).eq("id", row.id).select("id").limit(1);
      if (!error) linked++;
    }
  } catch { /* غیرمهم */ }
  return linked;
}
