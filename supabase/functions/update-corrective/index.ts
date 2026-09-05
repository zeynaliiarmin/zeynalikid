// supabase/functions/update-corrective/index.ts
// به‌روزرسانی امن «اطلاعات اصلاحی» توسط خودِ کاربر از صفحه پیگیری (Track).
// فقط با «کد پیگیری + شماره تماس» احراز هویت می‌شود و فقط کلید payload.correctiveData را
// (بدون دست‌زدن به بقیه اطلاعات فرم) merge می‌کند.
//
// Security:
//   - CORS فقط برای zeynalikid.vercel.app و previewهای *.vercel.app
//   - Rate Limit: حداکثر ۲۰ درخواست در دقیقه برای هر IP
//   - service_role داخل Function فقط
//   - فقط فیلدهای مجاز (whitelist) در correctiveData ذخیره می‌شوند
//
// Deploy: supabase functions deploy update-corrective --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin, rejectIfInvalidOrigin,
} from "../_shared/cors.ts";
import {
  rateLimit, rateLimitKey, centralRateLimit, cleanupExpiredBuckets,
} from "../_shared/rateLimit.ts";

const digitsOnly = (v: string) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

// فیلدهای مجاز اطلاعات اصلاحی — هر کلید دیگری نادیده گرفته می‌شود.
const ALLOWED_FIELDS = [
  "height", "weight", "appetite", "sleep", "activity", "exercise", "puberty",
  "waterIntake", "snacks", "parentsHeight", "allergies", "diseases", "medications", "temperament",
];

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Rate limit: 20 req/min per IP
  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "corrective"), {
    maxRequests: 20,
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
    const { trackingCode, fullPhone, correctiveData } = await req.json();

    if (!trackingCode || !fullPhone || !correctiveData || typeof correctiveData !== "object") {
      return jsonResponse({ error: "اطلاعات ارسالی ناقص است" }, 400, origin);
    }

    const rawCode=String(trackingCode).trim().replace(/\s+/g,"");const parsed=rawCode.match(/^(ZK|FM)-?(.*)$/i);const prefix=String(parsed?.[1]||"ZK").toUpperCase();const codeBody=String(parsed?.[2]||"");
    const code=/^\d{4,8}$/.test(codeBody)?`${prefix}${codeBody}`:`${prefix}-${codeBody.toLowerCase()}`;
    if(!/^(ZK|FM)\d{4,8}$/i.test(code)&&!/^(ZK|FM)-[A-F0-9]{6}$/i.test(code)&&!/^(ZK|FM)-[0-9][a-z0-9]{6,8}$/i.test(code)&&!/^(ZK|FM)-[A-Z0-9]{12,20}$/i.test(code)){
      return jsonResponse({ error: "فرمت کد پیگیری معتبر نیست" }, 400, origin);
    }

    const strictRl=await centralRateLimit(req,"corrective-central",{maxRequests:30,windowMs:10*60_000,blockMs:10*60_000});
    if(!strictRl.ok)return jsonResponse({error:"تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید."},429,origin);

    const supabase = getSupabaseAdmin();

    const findByCode=(candidate:string)=>supabase.from("submissions").select("id,full_phone,payload").ilike("payload->>trackingCode",candidate).limit(1).maybeSingle();
    let lookup=await findByCode(code);if((lookup.error||!lookup.data)&&code.toUpperCase().startsWith("FM"))lookup=await findByCode(`ZK${code.slice(2)}`);
    const {data,error}=lookup;

    if (error || !data) {
      return jsonResponse({ error: "شماره تماس یا کد پیگیری اشتباه است." }, 404, origin);
    }

    const storedPhone = String(data.full_phone ?? data.payload?.fullPhone ?? "");
    const storedDigits = digitsOnly(storedPhone);
    const inputDigits = digitsOnly(String(fullPhone));
    const match =
      storedDigits.length >= 7 &&
      inputDigits.length >= 7 &&
      (storedDigits.endsWith(inputDigits) ||
        inputDigits.endsWith(storedDigits) ||
        storedDigits.slice(-10) === inputDigits.slice(-10));

    if (!match) {
      return jsonResponse({ error: "شماره تماس یا کد پیگیری اشتباه است." }, 404, origin);
    }

    const payload = (data.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, any>;
    if (!payload.showCorrectiveTab) {
      return jsonResponse({ error: "امکان ویرایش اطلاعات اصلاحی برای این فرم فعال نیست." }, 403, origin);
    }

    // فقط فیلدهای مجاز را merge می‌کنیم (بدون دست‌زدن به بقیه payload)
    const cleanCorrective: Record<string, string> = {};
    for (const key of ALLOWED_FIELDS) {
      if (correctiveData[key] !== undefined) cleanCorrective[key] = String(correctiveData[key] ?? "").slice(0, 500);
    }

    const newPayload = {
      ...payload,
      correctiveData: { ...(payload.correctiveData || {}), ...cleanCorrective },
    };

    const { error: updateError } = await supabase
      .from("submissions")
      .update({ payload: newPayload, updated_at: new Date().toISOString() })
      .eq("id", data.id);

    if (updateError) {
      return jsonResponse({ error: "خطا در ذخیره‌سازی اطلاعات اصلاحی." }, 500, origin);
    }

    return jsonResponse({ ok: true, correctiveData: newPayload.correctiveData }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور. لطفاً مجدداً تلاش کنید." }, 500, origin);
  }
});
