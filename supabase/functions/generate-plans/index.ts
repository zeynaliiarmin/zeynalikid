// supabase/functions/generate-plans/index.ts
// «برنامه‌ها» — تولید برنامهٔ خوراکی و ورزشی کودک با هوش مصنوعی (Mistral) و ذخیره روی payload.
// ورودی: { token (نشست ادمین)، submissionId، force? } — فقط از پنل مدیریت.
// خروجی: { ok, mealPlan, sportPlan, skipped? }
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, getOrigin } from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { ok, err } from "../_shared/http.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";
import { whoRef, type WhoSex } from "../_shared/whoGrowth.ts";

const MISTRAL_API_URL = "https://api.mistral.ai/v1/chat/completions";
const MISTRAL_MODEL = Deno.env.get("MISTRAL_ASSISTANT_MODEL") || "mistral-small-latest";
const MAX_PLAN_CHARS = 6000;

const toEn = (v: unknown) => String(v ?? "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));
const numOf = (v: unknown) => { const m = toEn(v).match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(",", ".")) : NaN; };
const str = (v: unknown) => String(v ?? "").trim();

function topicList(p: any): string[] {
  const raw = Array.isArray(p?.topics) ? p.topics : (str(p?.topics) ? [str(p.topics)] : []);
  return raw.map((t: any) => (t && typeof t === "object" ? str(t.t || t.title || t.label) : str(t))).filter(Boolean);
}

function buildPrompt(p: any): { prompt: string; allowSport: boolean } {
  const age = numOf(p.age);
  const height = numOf(p.height);
  const weight = numOf(p.weight);
  const topics = topicList(p);
  const topicText = topics.join("، ");
  const sex: WhoSex = /دختر|girl/i.test(str(p.pGender)) ? "girl" : /پسر|boy/i.test(str(p.pGender)) ? "boy" : "unknown";
  const ref = Number.isFinite(age) ? whoRef(age, sex) : null;
  const focusHeight = /(قد|growth|height|بلوغ|کوتاه)/i.test(topicText);
  const focusWeight = /(وزن|چاق|لاغر|اشتها|تغذیه|غذا)/i.test(topicText);
  const allowSport = Number.isFinite(age) && age >= 6 && (focusHeight || focusWeight || topics.length === 0);

  const facts: string[] = [];
  const name = str(p.childName || p.pName);
  if (name) facts.push(`نام کودک: ${name}`);
  facts.push(`جنسیت: ${sex === "girl" ? "دختر" : sex === "boy" ? "پسر" : "نامشخص"}`);
  if (Number.isFinite(age)) facts.push(`سن: ${age} سال`);
  if (Number.isFinite(height)) facts.push(`قد فعلی: ${height} سانتی‌متر`);
  if (Number.isFinite(weight)) facts.push(`وزن فعلی: ${weight} کیلوگرم`);
  if (ref) facts.push(`مرجع WHO برای این سن: قد میانگین ${ref.h} سانتی‌متر (بازهٔ معمول ${Math.round((ref.h - 2) * 10) / 10} تا ${Math.round((ref.h + 2) * 10) / 10})، وزن میانگین ${ref.w} کیلوگرم (بازهٔ معمول ${Math.round((ref.w - 3) * 10) / 10} تا ${Math.round((ref.w + 3) * 10) / 10})`);
  for (const [key, label] of [
    ["appetite", "اشتها"], ["sleep", "خواب"], ["activity", "فعالیت روزانه"], ["exercise", "ورزش فعلی"],
    ["puberty", "بلوغ"], ["waterIntake", "مصرف آب"], ["snacks", "تنقلات"], ["temperament", "طبع"],
    ["parentsHeight", "قد والدین"], ["allergies", "حساسیت‌های غذایی"], ["diseases", "بیماری‌ها"],
    ["medications", "داروها"], ["additionalNotes", "توضیحات والدین"],
  ] as const) { const v = str(p[key]); if (v) facts.push(`${label}: ${v.slice(0, 300)}`); }
  if (topicText) facts.push(`موضوعات مشاوره: ${topicText.slice(0, 300)}`);
  const corr = p.correctiveData || {};
  const corrHeight = numOf(corr.height), corrWeight = numOf(corr.weight);
  if (Number.isFinite(corrHeight)) facts.push(`قد به‌روز شده توسط خانواده: ${corrHeight} سانتی‌متر`);
  if (Number.isFinite(corrWeight)) facts.push(`وزن به‌روز شده توسط خانواده: ${corrWeight} کیلوگرم`);
  const corrNotes = str(corr.notes || corr.description);
  if (corrNotes) facts.push(`یادداشت اصلاحی خانواده: ${corrNotes.slice(0, 300)}`);
  if (allowSport === false && Number.isFinite(age) && age < 6) facts.push("نکته: کودک زیر ۶ سال است — هیچ برنامهٔ ورزشی داده نمی‌شود.");

  const prompt = [
    "تو دستیار تغذیهٔ کودک در برند «فرزندمن» هستی و برای خانواده یک کودک، برنامهٔ غذایی و در صورت نیاز برنامهٔ تمرینی خانگی می‌نویسی.",
    "داده‌های کودک:",
    facts.join("\n"),
    "",
    "قوانین خروجی (بسیار مهم):",
    "۱) خروجی فقط یک شیء JSON معتبر به شکل {\"meal\":\"...\",\"sport\":\"...\"} است؛ بدون متن اضافه بیرون از JSON.",
    "۲) meal = برنامهٔ خوراکی: فقط پنج بخش پشت سر هم با این عنوان‌ها: «صبحانه:»، «ناهار:»، «شام:»، «میان‌وعده‌ها:»، «پرهیزها:». جلوی هر عنوان، خوراکی‌ها را با «، » جدا کن. در بخش پرهیزها، جلوی هر مورد درصد بنویس (نمونه: نوشابه ۹۰٪، چیپس ۷۵٪) که یعنی تا چه حد باید کنار گذاشته شود.",
    "۳) در برنامهٔ خوراکی هرگز روز هفته، تاریخ، «شنبه تا پنجشنبه»، نوبت صبح/عصر روزانه یا جدول هفتگی نباشد؛ فقط همان پنج بخش.",
    "۴) sport = برنامهٔ ورزشی خانگی؛ فقط اگر موضوع مشاوره قد یا وزن است و سن کودک ۶ سال یا بیشتر. برای هر حرکت، مدت زمان را با دقیقه یا ثانیه بنویس و بگو هر چند وقت یک‌بار انجام شود؛ در پایان بنویس «تعداد روزهای تمرین در هفته: X» و «مجموع زمان روزانه: Y دقیقه». از واژه‌های «ست» و «تکرار» استفاده نکن.",
    "۵) در انتهای sport سه پیشنهاد کلاس ورزشی بیرون از خانه به همین ترتیب اولویت بده: ۱. بسکتبال ۲. شنا ۳. والیبال — برای هر کدام یک جمله دلیل متناسب با قد/وزن و سن کودک.",
    "۶) اگر نوشتن برنامهٔ ورزشی لازم نیست (سن کمتر از ۶ یا موضوع غیر از قد/وزن)، مقدار sport را رشتهٔ خالی بگذار.",
    "۷) زبان فارسی روان، خطاب محترمانه به والدین، بدون واژهٔ «ساده»، بدون جایگزینی نظر پزشک.",
    "۸) جملهٔ اول هر دو برنامه باید این باشد: «این برنامه با کمک هوش مصنوعی فرزندمن تنظیم شده و جایگزین نظر پزشک نیست.»",
    "۹) برنامه باید کاملاً متناسب با داده‌های بالا باشد (حساسیت‌ها و بیماری‌ها را جدی بگیر؛ اگر حساسیت لبنیات ذکر شده، لبنیات را حذف یا جایگزین کن).",
  ].join("\n");
  return { prompt, allowSport };
}

function extractPlans(text: string): { meal: string; sport: string } {
  const t = String(text || "").trim();
  const start = t.indexOf("{"); const end = t.lastIndexOf("}");
  if (start >= 0 && end > start) {
    try {
      const parsed = JSON.parse(t.slice(start, end + 1));
      const meal = typeof parsed?.meal === "string" ? parsed.meal.trim() : "";
      const sport = typeof parsed?.sport === "string" ? parsed.sport.trim() : "";
      if (meal) return { meal: meal.slice(0, MAX_PLAN_CHARS), sport: sport.slice(0, MAX_PLAN_CHARS) };
    } catch {
      try {
        const parsed = JSON.parse(t.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1"));
        const meal = typeof parsed?.meal === "string" ? parsed.meal.trim() : "";
        const sport = typeof parsed?.sport === "string" ? parsed.sport.trim() : "";
        if (meal) return { meal: meal.slice(0, MAX_PLAN_CHARS), sport: sport.slice(0, MAX_PLAN_CHARS) };
      } catch { /* fallthrough */ }
    }
  }
  if (/صبحانه/.test(t)) return { meal: t.replace(/^```(?:json)?\s*|\s*```$/g, "").trim().slice(0, MAX_PLAN_CHARS), sport: "" };
  return { meal: "", sport: "" };
}

function mistralKeys(): string[] {
  const names = ["MISTRAL_PLANS_API_KEY", "MISTRAL_ADMIN_API_KEY", "MISTRAL_API_KEY", "MISTRAL_PUBLIC_API_KEY", "MISTRAL_FALLBACK_API_KEY"];
  const out: string[] = []; const seen = new Set<string>();
  for (const n of names) { const v = String(Deno.env.get(n) || "").trim(); if (v && !seen.has(v)) { seen.add(v); out.push(v); } }
  return out;
}

async function callMistral(prompt: string): Promise<string> {
  const keys = mistralKeys();
  if (!keys.length) throw new Error("کلید هوش مصنوعی روی این پروژه تنظیم نشده است");
  const models = (String(Deno.env.get("ASSISTANT_MODEL_ORDER") || "mistral-small-latest,ministral-8b-latest,ministral-3b-latest")).split(",").map((s) => s.trim()).filter(Boolean);
  const deadline = Date.now() + 48_000;
  let lastErr = "سرویس هوش مصنوعی پاسخ نداد؛ دوباره تلاش کنید";
  for (const key of keys) {
    for (const model of models) {
      if (Date.now() > deadline) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 24_000);
      try {
        const res = await fetch(MISTRAL_API_URL, {
          method: "POST", signal: controller.signal,
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${key}` },
          body: JSON.stringify({ model, messages: [
            { role: "system", content: "یک متخصص تغذیهٔ کودک هستی که خروجی‌ات فقط JSON است." },
            { role: "user", content: prompt },
          ], temperature: 0.55, max_tokens: 1700 }),
        });
        if (!res.ok) {
          lastErr = res.status === 429 ? "سقف درخواست‌های Mistral پر شده (۴۲۹)؛ کمی بعد دوباره بزن"
            : res.status === 401 || res.status === 403 ? "کلید هوش مصنوعی رد شد؛ کلید بعدی امتحان می‌شود"
            : `خطای سرویس هوش مصنوعی (${res.status})`;
          continue;
        }
        const data = await res.json();
        const content = data?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) return content;
        lastErr = "پاسخ خالی از سرویس هوش مصنوعی";
      } catch (e: any) {
        lastErr = e?.name === "AbortError" ? "تأخیر سرویس هوش مصنوعی؛ کلید/مدل بعدی امتحان می‌شود" : "خطای شبکه در سرویس هوش مصنوعی";
      } finally {
        clearTimeout(timer);
      }
    }
    if (Date.now() > deadline) break;
  }
  throw new Error(lastErr);
}

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const origin = getOrigin(req);
  if (!origin) return err("Origin not allowed", origin ?? "", 403);
  if (req.method !== "POST") return err("Method not allowed", origin, 405);

  const rl = await centralRateLimit(req, "generate-plans", { maxRequests: 12, windowMs: 10 * 60_000, blockMs: 10 * 60_000 });
  if (!rl.ok) return err("تعداد تولید برنامه بیش از حد مجاز است؛ کمی بعد تلاش کنید", origin, 429);

  let body: any;
  try { body = await req.json(); } catch { return err("بدنهٔ نامعتبر", origin, 400); }

  const sessionToken = extractSessionToken(req, body);
  if (!sessionToken) return err("نشست وارد نشده است.", origin, 401);
  const sessionResult = await validateAdminSession(sessionToken);
  if (!sessionResult.ok) return err("نشست نامعتبر یا منقضی است.", origin, 401);

  const submissionId = String(body?.submissionId ?? "").trim();
  if (!submissionId) return err("شناسهٔ رکورد الزامی است", origin, 400);
  const force = body?.force === true;

  const supabase = getSupabaseAdmin();
  const { data: row, error: loadErr } = await supabase.from("submissions").select("id,payload").eq("id", submissionId).maybeSingle();
  if (loadErr || !row) return err("رکورد یافت نشد", origin, 404);
  const p: any = row.payload || {};

  if (!force && String(p.mealPlan || "").trim()) {
    return ok({ ok: true, skipped: true, mealPlan: String(p.mealPlan || ""), sportPlan: String(p.sportPlan || "") }, origin);
  }

  const { prompt, allowSport } = buildPrompt(p);
  let meal = ""; let sport = "";
  try {
    const parsed = extractPlans(await callMistral(prompt));
    meal = parsed.meal; sport = parsed.sport;
  } catch (e: any) {
    return err(String(e?.message || e) || "تولید برنامه ناموفق بود", origin, 502);
  }
  if (!meal) return err("سرویس هوش مصنوعی خروجی قابل‌فهمی برنگرداند؛ یک‌بار دیگر تلاش کنید", origin, 502);
  if (!allowSport) sport = "";

  const payload: any = { ...p, mealPlan: meal, plansAiAt: Date.now() };
  if (sport) { payload.sportPlan = sport; payload.showSportPlan = true; }
  payload.showMealPlan = p.showMealPlan !== false;
  const { error: saveErr } = await supabase.from("submissions").update({ payload, updated_at: new Date().toISOString() }).eq("id", row.id);
  if (saveErr) return err("ذخیرهٔ برنامه انجام نشد", origin, 500);

  return ok({ ok: true, mealPlan: meal, sportPlan: sport, saved: true }, origin);
});
