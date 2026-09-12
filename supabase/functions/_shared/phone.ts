// supabase/functions/_shared/phone.ts
// ─────────────────────────────────────────────────────────────────────────────
// نرمال‌سازی یکسان شمارهٔ تماس برای «همهٔ کشورها» — تنها منبع حقیقت سمت سرور.
//
// چرا این فایل وجود دارد؟
//   شمارهٔ یک کاربر با قالب‌های متفاوت تایپ می‌شود:
//     ۰۹۱۹۸۳۰۵۷۷۴ / ۹۱۹۸۳۰۵۷۷۴ / ۹۸۹۱۹۸۳۰۵۷۷۴ / +۹۸۰۹۱۹۸۳۰۵۷۷۴ / +۹۸۹۱۹۸۳۰۵۷۷۴
//   همهٔ اینها یک شماره‌اند و باید به یک مقدار یکسان (+989198305774) تبدیل شوند،
//   وگرنه هر قالب یک «کاربر جدید» می‌سازد و کد پیگیری جدا می‌گیرد.
//
//   نسخهٔ قدیمی فقط ایران را می‌شناخت و برای مثال «0049151…» را به «+98049151…»
//   (کشور اشتباه!) تبدیل می‌کرد. این نسخه جدول قواعد کشورها را دارد.
//
// نسخهٔ کلاینت: src/utils/phone.ts — منطق باید دقیقاً یکسان بماند؛
// تست واحد (tests/unit.test.ts) یکسان بودن خروجی هر دو را قفل می‌کند.
//
// این فایل هیچ API خاص Deno ندارد تا بتوان آن را در تست Node هم اجرا کرد.
// ─────────────────────────────────────────────────────────────────────────────

export type CountryRule = { cc: string; trunk: string; min: number; max: number };

/** با هر تغییر در قواعد کشورها این عدد را بالا ببر (در تست واحد بررسی می‌شود). */
export const PHONE_RULES_VERSION = 1;

/** کشور پیش‌فرض سایت وقتی شماره هیچ نشانهٔ بین‌المللی ندارد (ایران). */
export const DEFAULT_CC = "98";

/**
 * cc   = کد کشور بدون «+»
 * trunk= پیش‌شمارهٔ داخلی (معمولاً ۰) که در قالب بین‌المللی حذف می‌شود
 * min/max = طول مجاز «شمارهٔ ملی» (بدون کد کشور و بدون trunk)
 */
export const COUNTRY_RULES: CountryRule[] = [
  { cc: "98", trunk: "0", min: 10, max: 10 }, // ایران
  { cc: "1", trunk: "1", min: 10, max: 10 }, // آمریکا / کانادا
  { cc: "44", trunk: "0", min: 9, max: 10 }, // انگلیس
  { cc: "49", trunk: "0", min: 6, max: 13 }, // آلمان
  { cc: "46", trunk: "0", min: 7, max: 9 }, // سوئد
  { cc: "41", trunk: "0", min: 9, max: 9 }, // سوئیس
  { cc: "47", trunk: "", min: 8, max: 8 }, // نروژ
  { cc: "33", trunk: "0", min: 9, max: 9 }, // فرانسه
  { cc: "61", trunk: "0", min: 8, max: 9 }, // استرالیا
  { cc: "971", trunk: "0", min: 8, max: 9 }, // امارات
  { cc: "90", trunk: "0", min: 10, max: 10 }, // ترکیه
  { cc: "31", trunk: "0", min: 9, max: 9 }, // هلند
  { cc: "91", trunk: "0", min: 10, max: 10 }, // هند
  { cc: "93", trunk: "0", min: 9, max: 9 }, // افغانستان
];

const FA_DIGITS = "۰۱۲۳۴۵۶۷۸۹";
const AR_DIGITS = "٠١٢٣٤٥٦٧٨٩";

/** رقم‌های فارسی/عربی → لاتین (بدون حذف هیچ کاراکتری) */
export const faDigits = (value: unknown): string =>
  String(value ?? "")
    .replace(/[۰-۹]/g, (d) => String(FA_DIGITS.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String(AR_DIGITS.indexOf(d)));

/** فقط رقم (۲۴ رقم اول) — علامت + و فاصله و خط تیره حذف می‌شوند */
export const phoneDigits = (value: unknown): string =>
  faDigits(value).replace(/[^0-9]/g, "").slice(0, 24);

const RULES_BY_CC_LENGTH = [...COUNTRY_RULES].sort((a, b) => b.cc.length - a.cc.length);
const DEFAULT_RULE = COUNTRY_RULES.find((r) => r.cc === DEFAULT_CC) as CountryRule;

/** حذف پیش‌شمارهٔ داخلی فقط وقتی که طول باقی‌مانده برای آن کشور معتبر باشد */
const stripTrunk = (rule: CountryRule, national: string): string => {
  const n = String(national || "");
  if (rule.trunk && n.startsWith(rule.trunk) && n.length - rule.trunk.length >= rule.min) return n.slice(rule.trunk.length);
  return n;
};

/** آیا این «شمارهٔ ملی» برای این کشور از نظر طول منطقی است؟ */
const plausible = (rule: CountryRule, national: string): boolean => {
  const n = stripTrunk(rule, national);
  return n.length >= rule.min && n.length <= rule.max;
};

/**
 * تشخیص کد کشور از ابتدای رقم‌ها — بلندترین کدِ ممکن که طول باقی‌مانده‌اش منطقی باشد.
 * این «طول منطقی» همان چیزی است که جلوی اشتباه می‌ایستد: شمارهٔ ایرانی ۹۱۹۸۳۰۵۷۷۴
 * با کد هند (۹۱) هم‌پوشانی دارد ولی باقی‌مانده‌اش ۸ رقم است و برای هند نامعتبر است.
 */
const matchRule = (d: string): CountryRule | null => {
  for (const rule of RULES_BY_CC_LENGTH) {
    if (d.length > rule.cc.length && d.startsWith(rule.cc) && plausible(rule, d.slice(rule.cc.length))) return rule;
  }
  return null;
};

/**
 * خروجی همیشه E.164 است: «+» + کد کشور + شمارهٔ ملی بدون پیش‌شمارهٔ داخلی.
 *
 * @param value       هر قالبی از شماره (فارسی/لاتین، با یا بدون +، با 00، با trunk)
 * @param preferredCc کد کشور انتخاب‌شدهٔ کاربر در فرم (مثل «+98») — اختیاری
 * @returns رشتهٔ نرمال یا «» اگر کمتر از ۷ رقم باشد
 */
export function normalizeFullPhone(value: unknown, preferredCc?: string): string {
  const raw = faDigits(value);
  const hasPlus = /^\s*\+/.test(raw);
  const d = phoneDigits(raw);
  if (d.length < 7) return "";

  // پیش‌شمارهٔ بین‌المللی ۰۰ (فقط وقتی که بعدش کد کشور معتبر باشد)
  let digitsNow = d;
  const had00 = d.startsWith("00");
  if (had00 && matchRule(d.slice(2))) digitsNow = d.slice(2);
  const explicitIntl = hasPlus || had00;

  const rawPref = String(preferredCc ?? "").trim();
  const pref = rawPref.replace(/\D/g, "");
  const prefRule = pref ? COUNTRY_RULES.find((r) => r.cc === pref) : undefined;

  // ۱) بدون نشانهٔ بین‌المللی + کشور انتخابی کاربر → شمارهٔ داخلیِ همان کشور است
  //    (اگر کاربر کد کشور را هم داخل فیلد تایپ کرده باشد — مثلاً ۹۸۹۱۹۸۳۰۵۷۷۴ — یک‌بار حذف می‌شود)
  if (prefRule && !explicitIntl) {
    if (digitsNow.startsWith(prefRule.cc) && plausible(prefRule, digitsNow.slice(prefRule.cc.length))) {
      return `+${prefRule.cc}${stripTrunk(prefRule, digitsNow.slice(prefRule.cc.length))}`;
    }
    return `+${prefRule.cc}${stripTrunk(prefRule, digitsNow)}`;
  }

  // ۲) تشخیص کد کشور از خود شماره (۹۸…، ۰۰۴۹…، +۹۷۱…)
  const rule = matchRule(digitsNow);
  if (rule) return `+${rule.cc}${stripTrunk(rule, digitsNow.slice(rule.cc.length))}`;

  // ۳) کاربر خودش کد کشور را با «+» یا «۰۰» اعلام کرده ولی آن کشور در جدول ما نیست
  //    (کشور «سایر») → رقم‌ها را دست‌نخورده نگه می‌داریم تا کشور اشتباه نسازیم
  if (explicitIntl || rawPref === "+") return `+${digitsNow.replace(/^00/, "")}`;

  // ۴) در نبود هر نشانه‌ای: کشور پیش‌فرض سایت (ایران)
  const fallback = prefRule || DEFAULT_RULE;
  return `+${fallback.cc}${stripTrunk(fallback, digitsNow)}`;
}

/** آیا مقدار ورودی دست‌کم یک شمارهٔ قابل قبول است؟ (۷ رقم به بالا) */
export const isPlausiblePhone = (value: unknown): boolean => phoneDigits(value).length >= 7;
