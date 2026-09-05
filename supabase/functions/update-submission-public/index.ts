// supabase/functions/update-submission-public/index.ts
// Public Edge Function for users to update LIMITED fields of their own submission.
//
// Authentication: trackingCode + fullPhone (same as track-submission).
// No admin session required — this is for the consultation form's "edit existing"
// flow and the timeSlot selection.
//
// Whitelist of allowed fields (ONLY these can be updated):
//   - timeSlot (preferred call time)
//   - notes (additional notes from user)
//
// Blocklist (NEVER allowed, silently ignored):
//   - trackingCode, full_phone, fullPhone, id
//   - payment, orderStatus, consultationStatus, adminNotes
//   - course, shipping, childInfo, tonguePhotos
//   - editHistory, category, priority, unread, isNew
//   - date, time, type
//
// Security:
//   - CORS restricted to zeynalikid.vercel.app + *.vercel.app
//   - Rate limit: 15 req/min per IP
//   - Error responses are generic (no enumeration leak)
//   - service_role inside Function only
//
// Deploy: supabase functions deploy update-submission-public --no-verify-jwt

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

// ONLY these fields can be updated by the user.
const ALLOWED_FIELDS = new Set([
  "timeSlot",
  "notes",
]);

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Rate limit: 15 req/min per IP
  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "update-public"), {
    maxRequests: 15,
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
    const { trackingCode, fullPhone, updates } = await req.json();

    // Validate required fields
    if (!trackingCode || !fullPhone || !updates || typeof updates !== "object") {
      return jsonResponse({ error: "اطلاعات ارسالی ناقص است" }, 400, origin);
    }

    const rawCode=String(trackingCode).trim().replace(/\s+/g,"");const parsed=rawCode.match(/^(ZK|FM)-?(.*)$/i);const prefix=String(parsed?.[1]||"ZK").toUpperCase();const codeBody=String(parsed?.[2]||"");
    const code=/^\d{4,8}$/.test(codeBody)?`${prefix}${codeBody}`:`${prefix}-${codeBody.toLowerCase()}`;
    if(!/^(ZK|FM)\d{4,8}$/i.test(code)&&!/^(ZK|FM)-[A-F0-9]{6}$/i.test(code)&&!/^(ZK|FM)-[0-9][a-z0-9]{6,8}$/i.test(code)&&!/^(ZK|FM)-[A-Z0-9]{12,20}$/i.test(code)){
      return jsonResponse({ error: "فرمت کد پیگیری معتبر نیست" }, 400, origin);
    }

    const strictRl=await centralRateLimit(req,"update-public-central",{maxRequests:30,windowMs:10*60_000,blockMs:10*60_000});
    if(!strictRl.ok)return jsonResponse({error:"تعداد درخواست‌ها بیش از حد مجاز است. لطفاً بعداً تلاش کنید."},429,origin);

    const supabase = getSupabaseAdmin();

    const findByCode=(candidate:string)=>supabase.from("submissions").select("id,full_phone,payload").ilike("payload->>trackingCode",candidate).limit(1).maybeSingle();
    let lookup=await findByCode(code);if((lookup.error||!lookup.data)&&code.toUpperCase().startsWith("FM"))lookup=await findByCode(`ZK${code.slice(2)}`);
    const {data,error}=lookup;

    if (error || !data) {
      // Generic error — don't reveal whether code exists
      return jsonResponse(
        { error: "شماره تماس یا کد پیگیری اشتباه است." },
        404,
        origin,
      );
    }

    // Verify phone matches
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
      return jsonResponse(
        { error: "شماره تماس یا کد پیگیری اشتباه است." },
        404,
        origin,
      );
    }

    // Build clean updates — only allow whitelisted fields
    const payload = (data.payload && typeof data.payload === "object"
      ? data.payload : {}) as Record<string, any>;

    const cleanUpdates: Record<string, any> = {};
    let changedCount = 0;
    for (const key of Object.keys(updates)) {
      if (ALLOWED_FIELDS.has(key)) {
        const newVal = updates[key];
        // Validate: timeSlot must be a short string, notes must be a reasonable string
        if (key === "timeSlot") {
          if (typeof newVal === "string" && newVal.length <= 100) {
            if (payload[key] !== newVal) {
              cleanUpdates[key] = newVal;
              changedCount++;
            }
          }
        } else if (key === "notes") {
          if (typeof newVal === "string" && newVal.length <= 2000) {
            if (payload[key] !== newVal) {
              cleanUpdates[key] = newVal;
              changedCount++;
            }
          }
        }
      }
      // All other fields are silently ignored (blocklist)
    }

    if (changedCount === 0) {
      return jsonResponse({
        ok: true,
        updated: false,
        message: "هیچ تغییر مجازی ارسال نشده است.",
      }, 200, origin);
    }

    // Merge and save
    const newPayload = { ...payload, ...cleanUpdates };
    const { error: updateError } = await supabase
      .from("submissions")
      .update({
        payload: newPayload,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);

    if (updateError) {
      console.error("update-submission-public error:", updateError);
      return jsonResponse({ error: "خطا در ذخیره‌سازی تغییرات." }, 500, origin);
    }

    return jsonResponse({
      ok: true,
      updated: true,
      changedFields: Object.keys(cleanUpdates),
    }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور. لطفاً مجدداً تلاش کنید." }, 500, origin);
  }
});
