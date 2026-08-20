// supabase/functions/track-submission/index.ts
// Edge Function برای پیگیری امن سفارش: فقط با «کد پیگیری + شماره تماس» و فقط فیلدهای عمومی.
//
// Security:
//   - CORS فقط برای zeynalikid.vercel.app و previewهای *.vercel.app
//   - Rate Limit: حداکثر ۳۰ درخواست در دقیقه برای هر IP
//   - service_role داخل Function فقط (هیچ‌وقت به کلاینت نمی‌رسد)
//   - هیچ اطلاعات هویتی کامل (نام، شماره کامل) به کلاینت برگردانده نمی‌شود
//   - شماره تماس ماسک‌شده برمی‌گردد
//
// Deploy: supabase functions deploy track-submission --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin,
} from "../_shared/cors.ts";
import {
  rateLimit, rateLimitKey, cleanupExpiredBuckets,
} from "../_shared/rateLimit.ts";

const digitsOnly = (v: string) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

serve(async (req) => {
  // CORS preflight
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Rate limit: 30 req/min per IP
  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "track"), {
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

  try {
    const { trackingCode, fullPhone, preview } = await req.json();

    if (!trackingCode) {
      return jsonResponse({ error: "کد پیگیری الزامی است" }, 400, origin);
    }

    const code = String(trackingCode).trim().toUpperCase();
    if (!/^ZK\d{4,8}$/.test(code) && !/^ZK-[A-F0-9]{6}$/.test(code)) {
      return jsonResponse({ error: "فرمت کد پیگیری معتبر نیست (مثال: ZK12345)" }, 400, origin);
    }

    const supabase = getSupabaseAdmin();

    // جستجو با کد پیگیری (داخل payload)
    const { data, error } = await supabase
      .from("submissions")
      .select("full_phone, payload, created_at")
      .eq("payload->>trackingCode", code)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return jsonResponse(
        { error: "شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید." },
        404,
        origin,
      );
    }

    const storedPhone = String(data.full_phone ?? data.payload?.fullPhone ?? "");
    const storedDigits = digitsOnly(storedPhone);

    // ماسک شمارهٔ تماس: ۰۹۱۹xxxx۵۴۶ (ایران) یا +CC123xxxx456 (بین‌المللی)
    const maskPhonePreview = (stored: string): string => {
      const d = digitsOnly(stored);
      if (!d || d.length < 7) return "";
      const last3 = d.slice(-3);
      if (d.startsWith("98")) {
        const local = "0" + d.slice(2);
        return local.slice(0, 4) + "xxxx" + last3;
      }
      if (d.startsWith("09")) return d.slice(0, 4) + "xxxx" + last3;
      const prefix = stored.match(/^(\+\d{1,3})/)?.[0] || "";
      if (prefix) {
        const rest = d.slice(prefix.replace("+", "").length);
        return prefix + rest.slice(0, 3) + "xxxx" + last3;
      }
      return d.slice(0, 4) + "xxxx" + last3;
    };

    // حالت پیش‌نمایش (فقط با کد پیگیری، بدون شماره تماس):
    // فقط شمارهٔ ماسک‌شده برمی‌گردد تا کاربر بداند ثبت با کدام شماره انجام شده است.
    if (preview === true) {
      return jsonResponse({ previewPhone: maskPhonePreview(storedPhone) }, 200, origin);
    }

    if (!fullPhone) {
      return jsonResponse({ error: "شماره تماس الزامی است" }, 400, origin);
    }

    // احراز هویت: شماره واردشده باید با شماره ثبت‌شده مطابقت داشته باشد
    const inputDigits = digitsOnly(String(fullPhone));
    const match =
      storedDigits.length >= 7 &&
      inputDigits.length >= 7 &&
      (storedDigits.endsWith(inputDigits) ||
        inputDigits.endsWith(storedDigits) ||
        storedDigits.slice(-10) === inputDigits.slice(-10));

    if (!match) {
      return jsonResponse(
        { error: "شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید." },
        404,
        origin,
      );
    }

    const p = data.payload ?? {};

    // ماسک کردن شماره تماس (فقط ۳ رقم آخر)
    let maskedPhone = maskPhonePreview(storedPhone);

    const status =
      p.orderStatus ||
      (p.payment?.receipt ? "پرداخت‌شده" : p.course ? "در انتظار پرداخت" : "جدید");

    // Phase 6: فایل‌های PDF در باکت خصوصی «files» هستند — برای نمایش در صفحهٔ عمومی Track
    // باید Signed URL کوتاه‌مدت تولید شود (service_role فقط داخل Function).
    const signPrivateUrl = async (url: string): Promise<string> => {
      if (!url) return "";
      const m = url.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
      if (!m) return url;
      const bucket = decodeURIComponent(m[1]);
      const path = decodeURIComponent(m[2]);
      if (bucket !== "files" && bucket !== "receipts" && bucket !== "tongue-photos" && bucket !== "voice-notes") {
        return url; // باکت عمومی (images) — بدون تغییر
      }
      try {
        const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
        if (error || !data) return url;
        return data.signedUrl;
      } catch {
        return url;
      }
    };

    // فقط اطلاعات عمومی — بدون نام و شماره کامل
    const publicData = {
      trackingCode: code,
      status,
      date: [p.date, p.time].filter(Boolean).join(" ") || data.created_at,
      course: p.course
        ? { title: p.course.title ?? null, titleEn: p.course.titleEn ?? null }
        : null,
      usage: p.usageInstructions || "",
      mealPlan: p.mealPlan || "",
      showMealPlan: p.showMealPlan === true,
      usagePdfUrl: await signPrivateUrl(p.usagePdfUrl || ""),
      mealPdfUrl: await signPrivateUrl(p.mealPdfUrl || ""),
      userNotes: p.userNotes || "",
      productUsage: p.productUsage || {},
      lastEdit: Array.isArray(p.editHistory) && p.editHistory.length
        ? `${p.editHistory[p.editHistory.length - 1].date ?? ""} ${p.editHistory[p.editHistory.length - 1].time ?? ""}`.trim()
        : "",
      maskedPhone,
      canEdit: true,
      showCorrectiveTab: !!p.showCorrectiveTab,
      correctiveData: p.correctiveData || {},
      corrective: p.corrective || null,
    };

    return jsonResponse(publicData, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور. لطفاً مجدداً تلاش کنید." }, 500, origin);
  }
});
