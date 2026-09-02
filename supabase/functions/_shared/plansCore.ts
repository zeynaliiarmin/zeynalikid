// «برنامه‌ها» — هستهٔ مشترک تولید برنامهٔ خوراکی/ورزشی (Mistral) و ذخیره روی payload.
// مصرف‌کننده‌ها: تابع generate-plans (دکمهٔ پنل ادمین) و create-submission (تولید خودکار بی‌درنگ پس از ثبت فرم).
import { whoRef, type WhoSex } from "./whoGrowth.ts";

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
  const sex: WhoSex = /دختر|girl/i.test(str(p.pGender || p.gender || p.childGender)) ? "girl" : /پسر|boy/i.test(str(p.pGender || p.gender || p.childGender)) ? "boy" : "unknown";
  const ref = Number.isFinite(age) ? whoRef(age, sex) : null;
  const focusHeight = /(قد|growth|height|بلوغ|کوتاه)/i.test(topicText);
  const focusWeight = /(وزن|چاق|لاغر|اشتها|تغذیه|غذا)/i.test(topicText);
  // برنامهٔ ورزشی همیشه ساخته می‌شود؛ تنها استثنا: کودک زیر ۶ سال (قاعدهٔ ثابت برند).
  const underSix = Number.isFinite(age) && age < 6;
  const allowSport = !underSix;
  void focusHeight; void focusWeight;

  const facts: string[] = [];
  const name = str(p.childName || p.pName);
  if (name) facts.push(`نام کودک: ${name}`);
  facts.push(`جنسیت: ${sex === "girl" ? "دختر" : sex === "boy" ? "پسر" : "نامشخص"}`);
  if (Number.isFinite(age)) facts.push(`سن: ${age} سال`);
  if (Number.isFinite(height)) facts.push(`قد فعلی: ${height} سانتی‌متر`);
  if (Number.isFinite(weight)) facts.push(`وزن فعلی: ${weight} کیلوگرم`);
  if (ref) facts.push(`مرجع WHO برای این سن: قد میانگین ${ref.h} سانتی‌متر (بازهٔ معمول ${Math.round((ref.h - 2) * 10) / 10} تا ${Math.round((ref.h + 2) * 10) / 10})، وزن میانگین ${ref.w} کیلوگرم (بازهٔ معمول ${Math.round((ref.w - 3) * 10) / 10} تا ${Math.round((ref.w + 3) * 10) / 10})`);
  const seenLabels = new Set<string>();
  const pushFact = (label: string, v: unknown) => {
    if (seenLabels.has(label)) return;
    const t = Array.isArray(v) ? v.map((x: any) => String(x ?? "").trim()).filter(Boolean).join("، ") : String(v ?? "").trim();
    if (!t || t === "ندارد") return;
    seenLabels.add(label); facts.push(`${label}: ${t.slice(0, 300)}`);
  };
  pushFact("اشتها", p.appetite); pushFact("خواب", p.sleep); pushFact("فعالیت روزانه", p.activity);
  pushFact("ورزش فعلی", p.exercise); pushFact("بلوغ", p.puberty); pushFact("مصرف آب", p.waterIntake);
  pushFact("تنقلات", p.snacks); pushFact("طبع", p.temperament); pushFact("قد والدین", p.parentsHeight);
  pushFact("حساسیت‌های غذایی", p.allergies);
  pushFact("بیماری، عارضه یا جراحی", p.disease || p.diseases);
  pushFact("وضعیت دفع و اجابت مزاج", p.digest);
  pushFact("داروها", p.medications);
  pushFact("توضیحات تکمیلی والدین", p.notes || p.additionalDesc || p.additionalNotes);
  pushFact("یادداشت‌های خاص", p.specials);
  if (topicText) facts.push(`موضوعات مشاوره: ${topicText.slice(0, 300)}`);
  const corr = p.correctiveData || {};
  const corrHeight = numOf(corr.height), corrWeight = numOf(corr.weight);
  if (Number.isFinite(corrHeight)) facts.push(`قد به‌روز شده توسط خانواده: ${corrHeight} سانتی‌متر`);
  if (Number.isFinite(corrWeight)) facts.push(`وزن به‌روز شده توسط خانواده: ${corrWeight} کیلوگرم`);
  const corrNotes = str(corr.notes || corr.description);
  if (corrNotes) facts.push(`یادداشت اصلاحی خانواده: ${corrNotes.slice(0, 300)}`);
  if (allowSport === false && Number.isFinite(age) && age < 6) facts.push("نکته: کودک زیر ۶ سال است — هیچ برنامهٔ ورزشی داده نمی‌شود.");

  const prompt = [
    "تو یک دستیار متخصص تغذیهٔ کودک هستی و برای خانواده یک کودک، برنامهٔ غذایی و در صورت نیاز برنامهٔ تمرینی خانگی می‌نویسی.",
    "داده‌های کودک:",
    facts.join("\n"),
    "",
    "قوانین خروجی (بسیار مهم):",
    "۱) خروجی فقط یک شیء JSON معتبر به شکل {\"meal\":\"...\",\"sport\":\"...\"} است؛ بدون متن اضافه بیرون از JSON.",
    "۲) meal = برنامهٔ خوراکی با این ساختار دقیق: خط اول «🍽 برنامه خوراکی». بعد برای هر وعده (صبحانه، ناهار، شام، میان‌وعده‌ها) سه خط پشت سر هم: خط نام وعده با ایموجی مخصوص (🥣 صبحانه: / 🍲 ناهار: / 🌙 شام: / 🍏 میان‌وعده‌ها:)، سپس «• مواردی که سخت پیدا میشن یا هزینه زیادی دارن: …» و سپس «• مواردی نیاز به بودجه زیادی ندارند و به راحتی میتونید دسترسی داشته باشید: …». بین هر وعده یک خط جداکننده فقط با کاراکتر «——————» بگذار.",
    "۲.۱) در پایان meal بعد از یک خط جداکننده «——————» بخش «🚫 پرهیزها:» را بیاور؛ هر مورد در یک خط جدا با شروع «- » و درصد جلوی آن (نمونه: - نوشابه ۹۰٪) که درصد یعنی تا چه حد باید کنار گذاشته شود.",
    "۲.۲) فقط از مواد غذایی که در ایران به‌راحتی و با هزینه متعارف پیدا می‌شوند استفاده کن (نان سنگک/بربری، برنج، حبوبات، ماست، پنیر، تخم‌مرغ، مرغ، میوه و سبزی فصل و...). قلم وارداتی، کمیاب یا گران را فقط در گروه «مواردی که سخت پیدا میشن یا هزینه زیادی دارن» بیاور و همان وعده را در گروه اقتصادی کامل و قابل اجرا نگه دار.",
    "۳) در برنامهٔ خوراکی هرگز روز هفته، تاریخ، «شنبه تا پنجشنبه» یا جدول هفتگی نباشد.",
    "۴) sport = برنامهٔ ورزشی خانگی؛ برای همهٔ کودکان ۶ سال یا بیشتر بنویس — حتی اگر موضوع مشاوره قد یا وزن نباشد؛ در آن حالت یک برنامهٔ عمومی‌تر ولی کاملاً متناسب با سن، بیماری‌ها و توضیحات تکمیلی والد بده. ساختار: خط اول «🏃 برنامه ورزشی»، بعد برای هر حرکت یک خط به شکل «• نام حرکت: مدت زمان X دقیقه یا Y ثانیه — هر چند وقت یک‌بار: Z». سپس دو خط پایانی: «📅 تعداد روزهای تمرین در هفته: …» و «⏱ مجموع زمان روزانه: …». از واژه‌های «ست» و «تکرار» استفاده نکن.",
    "۵) در انتهای sport یک خط جداکننده «——————» و بعد «🎽 کلاس‌های ورزشی پیشنهادی (به ترتیب اولویت):» بیاور؛ سه گزینه از میان بسکتبال، شنا و والیبال انتخاب کن و اولویت‌بندی‌شان را خودت بر اساس شرایط کودک (سن، قد، وزن، اشتها، تمرین‌پذیری) تعیین کن؛ هر گزینه در یک خط با شماره ۱. ۲. ۳. و یک جمله دلیل کوتاه. در خط آخر دقیقاً این را بنویس: «شرکت در یکی از همین کلاس‌ها (همان اولویت اول) کافی است و نیازی به رفتن در هر سه نیست.»",
    "۶) تنها در یک حالت sport را رشتهٔ خالی بگذار: کودک زیر ۶ سال باشد.",
    "۷) زبان فارسی روان و محترمانه خطاب به والدین؛ از واژهٔ «ساده» استفاده نکن.",
    "۸) هرگز در متن برنامه‌ها جمله‌ای دربارهٔ هوش مصنوعی یا سلب مسئولیت (مانند «این برنامه با کمک هوش مصنوعی تنظیم شده» یا «جایگزین نظر پزشک نیست») و نام برند ننویس؛ هر برنامه مستقیم با عنوانش شروع شود.",
    "۹) برنامه باید کاملاً متناسب با داده‌های بالا باشد (حساسیت‌ها و بیماری‌ها را جدی بگیر؛ اگر حساسیت لبنیات ذکر شده، لبنیات را حذف یا جایگزین کن).",
  ].join("\n");
  return { prompt, allowSport };
}

async function brandKnowledge(db: any, topics: string[]): Promise<string> {
  const terms = ["تغذیه", "غذا", "غذایی", "صبحانه", "ناهار", "شام", "میان‌وعده", "میان وعده", "مکمل", "ویتامین", "پروتئین", "رشد", "قد", "وزن", "اشتها", "خواب", "ورزش", "لبنیات", "تنقلات", "نوشابه", "فست", "قند", "آهن", "کلسیم", "امگا"];
  try {
    const { data } = await db.from("assistant_knowledge").select("question,answer,keywords,category").limit(500);
    const scored = (data || []).map((k: any) => {
      const hay = `${k.question || ""} ${k.answer || ""} ${(Array.isArray(k.keywords) ? k.keywords : []).join(" ")} ${k.category || ""}`;
      let s = terms.reduce((n: number, term) => n + (hay.includes(term) ? 1 : 0), 0);
      s += topics.filter((tp) => tp && hay.includes(tp)).length * 2;
      return { k, s };
    }).filter((x: any) => x.s >= 2).sort((a: any, b: any) => b.s - a.s).slice(0, 6);
    return scored.map((x: any) => `- ${String(x.k.answer || x.k.question || "").replace(/\s+/g, " ").slice(0, 420)}`).join("\n").slice(0, 2600);
  } catch { return ""; }
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

export type PlansResult = { ok: boolean; skipped?: boolean; mealPlan: string; sportPlan: string; saved: boolean };

/** تولید (در صورت نیاز) و ذخیرهٔ برنامه‌ها روی payload. خطا را throw می‌کند؛ فراخوان‌کننده تصمیم می‌گیرد. */
export async function generateAndSavePlans(db: any, submissionId: string, opts?: { force?: boolean }): Promise<PlansResult> {
  const { data: row, error: loadErr } = await db.from("submissions").select("id,payload").eq("id", submissionId).maybeSingle();
  if (loadErr || !row) throw new Error("رکورد یافت نشد");
  const p: any = row.payload || {};
  const force = opts?.force === true;
  const ageNum = numOf(p.age);
  const underSixRow = Number.isFinite(ageNum) && ageNum < 6;
  // اگر برنامهٔ خوراکی هست ولی ورزشی کم است (زیر ۶ سال نیست)، دوباره تولید می‌شود تا هر دو کامل شوند
  if (!force && String(p.mealPlan || "").trim() && (String(p.sportPlan || "").trim() || underSixRow)) {
    return { ok: true, skipped: true, mealPlan: String(p.mealPlan || ""), sportPlan: String(p.sportPlan || ""), saved: false };
  }
  const { prompt: basePrompt, allowSport } = buildPrompt(p);
  const kn = await brandKnowledge(db, topicList(p));
const prompt = kn ? `${basePrompt}\n\nدانش تغذیه‌ای تأییدشدهٔ برند (الهام بگیر، عیناً کپی نکن، با محدودیت‌های پزشکی کودک سازگار کن):\n${kn}` : basePrompt;
  let meal = ""; let sport = "";
  const parsed = extractPlans(await callMistral(prompt));
  meal = parsed.meal; sport = parsed.sport;
  if (!meal) throw new Error("سرویس هوش مصنوعی خروجی قابل‌فهمی برنگرداند؛ یک‌بار دیگر تلاش کنید");
  if (!allowSport) sport = "";
  const payload: any = { ...p, mealPlan: meal, plansAiAt: Date.now() };
  if (sport) { payload.sportPlan = sport; payload.showSportPlan = true; }
  payload.showMealPlan = p.showMealPlan !== false;
  const { error: saveErr } = await db.from("submissions").update({ payload, updated_at: new Date().toISOString() }).eq("id", row.id);
  if (saveErr) throw new Error("ذخیرهٔ برنامه انجام نشد");
  return { ok: true, mealPlan: meal, sportPlan: sport, saved: true };
}
