// supabase/functions/update-corrective/index.ts
// اصلاح ۱۲: به‌روزرسانی امن «اطلاعات اصلاحی» توسط خودِ کاربر از صفحه پیگیری (Track).
// فقط با «کد پیگیری + شماره تماس» احراز هویت می‌شود و فقط کلید payload.correctiveData را
// (بدون دست‌زدن به بقیه اطلاعات فرم مانند دوره، ارسال، پرداخت و ...) به‌صورت امن merge می‌کند.
// دیپلوی:  supabase functions deploy update-corrective --no-verify-jwt
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

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
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    const { trackingCode, fullPhone, correctiveData } = await req.json();

    if (!trackingCode || !fullPhone || !correctiveData || typeof correctiveData !== "object") {
      return json({ error: "اطلاعات ارسالی ناقص است" }, 400);
    }

    const code = String(trackingCode).trim().toUpperCase();
    if (!/^ZK\d{4,8}$/.test(code) && !/^ZK-[A-F0-9]{6}$/.test(code)) {
      return json({ error: "فرمت کد پیگیری معتبر نیست" }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("VITE_SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data, error } = await supabase
      .from("submissions")
      .select("id, full_phone, payload")
      .eq("payload->>trackingCode", code)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return json({ error: "شماره تماس یا کد پیگیری اشتباه است." }, 404);
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
      return json({ error: "شماره تماس یا کد پیگیری اشتباه است." }, 404);
    }

    const payload = (data.payload && typeof data.payload === "object" ? data.payload : {}) as Record<string, any>;
    if (!payload.showCorrectiveTab) {
      return json({ error: "امکان ویرایش اطلاعات اصلاحی برای این فرم فعال نیست." }, 403);
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
      return json({ error: "خطا در ذخیره‌سازی اطلاعات اصلاحی." }, 500);
    }

    return json({ ok: true, correctiveData: newPayload.correctiveData }, 200);
  } catch (_e) {
    return json({ error: "خطای سرور. لطفاً مجدداً تلاش کنید." }, 500);
  }
});
