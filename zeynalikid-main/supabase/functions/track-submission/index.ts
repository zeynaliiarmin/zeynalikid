// supabase/functions/track-submission/index.ts
// Edge Function برای پیگیری امن سفارش: فقط با «کد پیگیری + شماره تماس» و فقط فیلدهای عمومی.
// دیپلوی:  supabase functions deploy track-submission --no-verify-jwt
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { trackingCode, fullPhone } = await req.json();

    if (!trackingCode || !fullPhone) {
      return json({ error: "کد پیگیری و شماره تماس الزامی است" }, 400);
    }

    const code = String(trackingCode).trim().toUpperCase();
    if (!/^ZK\d{4,8}$/.test(code) && !/^ZK-[A-F0-9]{6}$/.test(code)) {
      return json({ error: "فرمت کد پیگیری معتبر نیست (مثال: ZK12345)" }, 400);
    }

    // SUPABASE_URL و SUPABASE_SERVICE_ROLE_KEY به‌صورت خودکار در Edge Functions تزریق می‌شوند.
    // Service Role برای عبور از RLS استفاده می‌شود؛ این کلید هرگز به کلاینت نمی‌رسد.
    const supabaseUrl =
      Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
    const supabaseKey =
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
      Deno.env.get("VITE_SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // جستجو با کد پیگیری (داخل payload) — ساختار جدول: full_phone + payload(jsonb)
    const { data, error } = await supabase
      .from("submissions")
      .select("full_phone, payload, created_at")
      .eq("payload->>trackingCode", code)
      .limit(1)
      .maybeSingle();

    if (error || !data) {
      return json(
        { error: "شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید." },
        404,
      );
    }

    // احراز هویت: شماره واردشده باید با شماره ثبت‌شده مطابقت داشته باشد
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
      return json(
        { error: "شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید." },
        404,
      );
    }

    const p = data.payload ?? {};

    // ماسک کردن شماره تماس (فقط ۳ رقم آخر)
    let maskedPhone = "";
    const lastThree = storedDigits.slice(-3);
    if (storedPhone.startsWith("+98") || storedPhone.startsWith("0098")) {
      maskedPhone = `09(xxxxxx)${lastThree}`;
    } else {
      const prefix = storedPhone.match(/^(\+\d{1,3})/)?.[0] || "";
      maskedPhone = `${prefix}(xxxxxx)${lastThree}`;
    }

    const status =
      p.orderStatus ||
      (p.payment?.receipt ? "پرداخت‌شده" : p.course ? "در انتظار پرداخت" : "جدید");

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
      showMealPlan: p.showMealPlan === true, // اصلاح: کنترل نمایش برنامه غذایی
      // اصلاح ۶: لینک فایل‌های PDF طریقه مصرف / برنامه غذایی (در صورت وجود)
      usagePdfUrl: p.usagePdfUrl || "",
      mealPdfUrl: p.mealPdfUrl || "",
      userNotes: p.userNotes || "",
      productUsage: p.productUsage || {},
      lastEdit: Array.isArray(p.editHistory) && p.editHistory.length
        ? `${p.editHistory[p.editHistory.length - 1].date ?? ""} ${p.editHistory[p.editHistory.length - 1].time ?? ""}`.trim()
        : "",
      maskedPhone,
      canEdit: true,
      // اصلاح ۱۲: در صورت فعال بودن نمایش اصلاحی توسط ادمین، اطلاعات ساختاریافته اصلاحی هم ارسال می‌شود.
      showCorrectiveTab: !!p.showCorrectiveTab,
      correctiveData: p.correctiveData || {},
      // اصلاح جدید: اطلاعات اصلاحی متنی (textarea)
      corrective: p.corrective || null,
    };

    return json(publicData, 200);
  } catch (_e) {
    return json({ error: "خطای سرور. لطفاً مجدداً تلاش کنید." }, 500);
  }
});
