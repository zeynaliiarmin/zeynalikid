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
  rateLimit, rateLimitKey, centralRateLimit, cleanupExpiredBuckets,
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

    const rawCode=String(trackingCode).trim().replace(/\s+/g,"");
    const matchCode=rawCode.match(/^(ZK|FM)-?(.*)$/i);const prefix=String(matchCode?.[1]||"ZK").toUpperCase();const bodyCode=String(matchCode?.[2]||"");
    const code=/^\d{4,8}$/.test(bodyCode)?`${prefix}${bodyCode}`:`${prefix}-${bodyCode.toLowerCase()}`;
    if(!/^(ZK|FM)\d{4,8}$/i.test(code)&&!/^(ZK|FM)-[A-F0-9]{6}$/i.test(code)&&!/^(ZK|FM)-[0-9][a-z0-9]{6,8}$/i.test(code)&&!/^(ZK|FM)-[A-Z0-9]{12,20}$/i.test(code)){
      return jsonResponse({ error: "فرمت کد پیگیری معتبر نیست" }, 400, origin);
    }

    const strictRl = await centralRateLimit(req, "track-submission", {
      maxRequests: 30,
      windowMs: 10 * 60_000,
      blockMs: 10 * 60_000,
    });
    if (!strictRl.ok) {
      return jsonResponse(
        { error: "تعداد درخواست‌های پیگیری بیش از حد مجاز است. لطفاً کمی بعد دوباره تلاش کنید." },
        429,
        origin,
      );
    }

    // The former preview mode exposed part of a registered phone number using
    // only a short tracking code. It is intentionally disabled: a complete
    // phone number is now always required before any record lookup.
    if (preview === true) {
      return jsonResponse({ error: "شماره تماس کامل برای پیگیری الزامی است" }, 400, origin);
    }

    const supabase = getSupabaseAdmin();

    const findByCode=(candidate:string)=>supabase.from("submissions").select("full_phone,payload,created_at").ilike("payload->>trackingCode",candidate).limit(1).maybeSingle();
    // پیشوندِ کد در گذشته ZK بود و در سایت فرزندمن به FM تغییر کرده؛ هر دو شکل (با خط تیره و بدون آن)
    // امتحان می‌شود تا کد قدیمیِ مشتری‌های قبلی همان رکورد را پیدا کند.
    const bodyPart=String(code).replace(/^(ZK|FM)-?/i,"");
    const candidates:string[]=[];
    for(const cand of [code,`FM${bodyPart}`,`ZK${bodyPart}`,`FM-${bodyPart}`,`ZK-${bodyPart}`]){
      if(cand&&!candidates.includes(cand))candidates.push(cand);
    }
    let lookup={data:null,error:null as any};
    for(const cand of candidates){
      const attempt=await findByCode(cand);
      if(attempt.data){lookup=attempt;break;}
      if(!lookup.error&&attempt.error)lookup=attempt;
    }
    const {data,error}=lookup;

    if(error||!data){
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
        if (error || !data) {
          try {
            await supabase.from("error_logs").insert({ kind: "track_pdf_sign", message: `createSignedUrl failed: ${String(error?.message || "no data")}`, page_path: code });
          } catch { /* نادیده بگیر */ }
          return url;
        }
        return data.signedUrl;
      } catch (e) {
        try {
          await supabase.from("error_logs").insert({ kind: "track_pdf_sign", message: String((e as any)?.message || e), page_path: code });
        } catch { /* نادیده بگیر */ }
        return url;
      }
    };

    // فقط اطلاعات عمومی — بدون نام و شماره کامل
    const publicData = {
      trackingCode:String(p.trackingCode||code),
      status,
      date: [p.date, p.time].filter(Boolean).join(" ") || data.created_at,
      course: p.course
        ? { title: p.course.title ?? null, titleEn: p.course.titleEn ?? null }
        : null,
      usage: p.usageInstructions || "",
      mealPlan: p.mealPlan || "",
      showMealPlan: p.showMealPlan === true,
      sportPlan: p.sportPlan || "",
      showSportPlan: p.showSportPlan === true,
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
