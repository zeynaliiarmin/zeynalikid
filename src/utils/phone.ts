export const p2e = (value: unknown) =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const digits = (value: unknown) => p2e(value).replace(/[^0-9]/g, '');

// ─────────────────────────────────────────────────────────────────────────────
// نرمال‌سازی چندکشوری شمارهٔ تماس — نسخهٔ کلاینت.
// منبع حقیقت سمت سرور: supabase/functions/_shared/phone.ts
// منطق این دو فایل باید «دقیقاً» یکسان بماند؛ tests/unit.test.ts خروجی هر دو را
// روی یک ماتریس از قالب‌ها مقایسه می‌کند تا واگرایی در CI caught شود.
// ─────────────────────────────────────────────────────────────────────────────

export type CountryRule = { cc: string; trunk: string; min: number; max: number };

/** با هر تغییر در قواعد کشورها این عدد را در هر دو فایل بالا ببر. */
export const PHONE_RULES_VERSION = 1;

/** کشور پیش‌فرض سایت وقتی شماره هیچ نشانهٔ بین‌المللی ندارد (ایران). */
export const DEFAULT_CC = '98';

/** cc = کد کشور بدون «+»؛ trunk = پیش‌شمارهٔ داخلی؛ min/max = طول شمارهٔ ملی */
export const COUNTRY_RULES: CountryRule[] = [
  { cc: '98', trunk: '0', min: 10, max: 10 }, // ایران
  { cc: '1', trunk: '1', min: 10, max: 10 }, // آمریکا / کانادا
  { cc: '44', trunk: '0', min: 9, max: 10 }, // انگلیس
  { cc: '49', trunk: '0', min: 6, max: 13 }, // آلمان
  { cc: '46', trunk: '0', min: 7, max: 9 }, // سوئد
  { cc: '41', trunk: '0', min: 9, max: 9 }, // سوئیس
  { cc: '47', trunk: '', min: 8, max: 8 }, // نروژ
  { cc: '33', trunk: '0', min: 9, max: 9 }, // فرانسه
  { cc: '61', trunk: '0', min: 8, max: 9 }, // استرالیا
  { cc: '971', trunk: '0', min: 8, max: 9 }, // امارات
  { cc: '90', trunk: '0', min: 10, max: 10 }, // ترکیه
  { cc: '31', trunk: '0', min: 9, max: 9 }, // هلند
  { cc: '91', trunk: '0', min: 10, max: 10 }, // هند
  { cc: '93', trunk: '0', min: 9, max: 9 }, // افغانستان
];

/** فقط رقم (۲۴ رقم اول) — یکسان با سمت سرور */
export const phoneDigits = (value: unknown): string => p2e(value).replace(/[^0-9]/g, '').slice(0, 24);

const RULES_BY_CC_LENGTH = [...COUNTRY_RULES].sort((a, b) => b.cc.length - a.cc.length);
const DEFAULT_RULE = COUNTRY_RULES.find((r) => r.cc === DEFAULT_CC) as CountryRule;

const stripTrunk = (rule: CountryRule, national: string): string => {
  const n = String(national || '');
  if (rule.trunk && n.startsWith(rule.trunk) && n.length - rule.trunk.length >= rule.min) return n.slice(rule.trunk.length);
  return n;
};

const plausible = (rule: CountryRule, national: string): boolean => {
  const n = stripTrunk(rule, national);
  return n.length >= rule.min && n.length <= rule.max;
};

const matchRule = (d: string): CountryRule | null => {
  for (const rule of RULES_BY_CC_LENGTH) {
    if (d.length > rule.cc.length && d.startsWith(rule.cc) && plausible(rule, d.slice(rule.cc.length))) return rule;
  }
  return null;
};

/**
 * خروجی همیشه E.164 است: «+» + کد کشور + شمارهٔ ملی بدون پیش‌شمارهٔ داخلی.
 * همهٔ قالب‌های یک شماره به یک مقدار یکسان می‌رسند:
 *   ۰۹۱۹۸۳۰۵۷۷۴ / ۹۱۹۸۳۰۵۷۷۴ / ۹۸۹۱۹۸۳۰۵۷۷۴ / +۹۸۰۹۱۹۸۳۰۵۷۷۴ / +۹۸۹۱۹۸۳۰۵۷۷۴ → +989198305774
 */
export function normalizeFullPhone(value: unknown, preferredCc?: string): string {
  const raw = p2e(value);
  const hasPlus = /^\s*\+/.test(raw);
  const d = phoneDigits(raw);
  if (d.length < 7) return '';

  // پیش‌شمارهٔ بین‌المللی ۰۰ (فقط وقتی که بعدش کد کشور معتبر باشد)
  let digitsNow = d;
  const had00 = d.startsWith('00');
  if (had00 && matchRule(d.slice(2))) digitsNow = d.slice(2);
  const explicitIntl = hasPlus || had00;

  const rawPref = String(preferredCc ?? '').trim();
  const pref = rawPref.replace(/\D/g, '');
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
  if (explicitIntl || rawPref === '+') return `+${digitsNow.replace(/^00/, '')}`;

  // ۴) در نبود هر نشانه‌ای: کشور پیش‌فرض سایت (ایران)
  const fallback = prefRule || DEFAULT_RULE;
  return `+${fallback.cc}${stripTrunk(fallback, digitsNow)}`;
}

/**
 * ساخت شمارهٔ کامل از «کد کشور انتخابی + شمارهٔ تایپ‌شده».
 * حتی اگر والد کد کشور را هم داخل فیلد تایپ کرده باشد (۹۸…، ۰۰۹۸…، +۹۸۰۹۱۹…)
 * خروجی یکسان و بدون تکرار کد کشور است.
 */
export const fullPhone = (cc: string, local: string): string => normalizeFullPhone(local, cc);

export const validPhone = (local: string, country: { code?: string; regex?: string } | null | undefined): boolean => {
  const clean = p2e(local).replace(/[\s\-()]/g, '');
  if (!clean || /^(\d)\1+$/.test(clean)) return false;
  // ایران: هر دو فرمت 09XXXXXXXXX و 9XXXXXXXXX معتبر است
  if (country?.code === '+98') {
    const m = fullPhone('+98', local).match(/^\+98(9\d{9})$/);
    if (!m) return false;
    const tail = m[1].slice(1);
    // شماره‌های جعلی که ۹ رقم انتهایی آن‌ها تکراری/یکسان است (مثل 09111111111، 09000000000) رد شوند
    if (/^(\d)\1{8}$/.test(tail)) return false;
    return true;
  }
  try {
    return new RegExp(country?.regex || '^\\d{7,}$').test(clean);
  } catch {
    return /^\d{7,}$/.test(clean);
  }
};

const ISO_FLAG_MAP: Record<string, string> = {
  UK: 'GB',
};

const ID_TO_FLAG: Record<string, string> = {
  ir: '🇮🇷',
  us: '🇺🇸',
  uk: '🇬🇧',
  gb: '🇬🇧',
  de: '🇩🇪',
  se: '🇸🇪',
  ch: '🇨🇭',
  no: '🇳🇴',
  fr: '🇫🇷',
  au: '🇦🇺',
  ae: '🇦🇪',
  tr: '🇹🇷',
  nl: '🇳🇱',
  in: '🇮🇳',
  af: '🇦🇫',
  ca: '🇨🇦',
  other: '🌍',
};

const CODE_TO_FLAG: Record<string, string> = {
  '+98': '🇮🇷',
  '+1': '🇺🇸',
  '+44': '🇬🇧',
  '+49': '🇩🇪',
  '+46': '🇸🇪',
  '+41': '🇨🇭',
  '+47': '🇳🇴',
  '+33': '🇫🇷',
  '+61': '🇦🇺',
  '+971': '🇦🇪',
  '+90': '🇹🇷',
  '+31': '🇳🇱',
  '+91': '🇮🇳',
  '+93': '🇦🇫',
  '+': '🌍',
};

/**
 * تبدیل کد ISO 2 حرفی کشور یا شناسه به ایموجی پرچم
 * مثال: 'IR' → '🇮🇷', 'GB' → '🇬🇧', 'DE' → '🇩🇪'
 */
export function flagToEmoji(code: string): string {
  if (!code) return '🌍';
  const c = String(code).trim();
  const lower = c.toLowerCase();
  if (ID_TO_FLAG[lower]) return ID_TO_FLAG[lower];
  const upper = c.toUpperCase();
  const mapped = ISO_FLAG_MAP[upper] || upper;
  if (mapped.length === 2 && /^[A-Z]{2}$/.test(mapped)) {
    return String.fromCodePoint(
      127397 + mapped.charCodeAt(0),
      127397 + mapped.charCodeAt(1)
    );
  }
  return c;
}

/**
 * دریافت مطمئن ایموجی پرچم کشور از شیء کشور یا رشته
 */
export function getCountryFlag(c: any): string {
  if (!c) return '🌍';
  if (typeof c === 'string') return flagToEmoji(c);
  if (c.flag) {
    const f = flagToEmoji(c.flag);
    if (f) return f;
  }
  if (c.id && ID_TO_FLAG[String(c.id).toLowerCase()]) {
    return ID_TO_FLAG[String(c.id).toLowerCase()];
  }
  if (c.code && CODE_TO_FLAG[String(c.code).trim()]) {
    return CODE_TO_FLAG[String(c.code).trim()];
  }
  if (c.flag) return flagToEmoji(c.flag);
  return '🌍';
}
