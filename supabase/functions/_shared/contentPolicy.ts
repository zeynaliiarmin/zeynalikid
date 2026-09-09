/**
 * قوانین محتوایی برند (Brand Content Policy) — لایهٔ اجباری سمت سرور برای content-api.
 *
 * این فایل «تنها منبع حقیقت» قوانین محتواست؛ همهٔ مسیرهای نوشتار قبل از ذخیره
 * با scanContentPolicy عبور می‌کنند:
 *   ۱) اکشن‌های create_* و update_* مستقیم
 *   ۲) اکشن‌های bulk_create_* و bulk_update_*
 *   ۳) اجرای درخواست‌های pending (bulk تأییدی)
 *
 * راهنمای همین قوانین به شکل طبیعی‌زبانی هم در «AI-CONTENT-AGENT-API.md» ریخته می‌شود.
 * اگر قانونی اضافه/حذف شد: فقط همین فایل + POLICY_VERSION را به‌روزرسانی کنید؛
 * عامل‌ها با اکشن get_policy نسخه و متن کامل قوانین را می‌گیرند (قابلیت «خودتوضیح»).
 */

export const POLICY_VERSION = 1;

export interface PolicyViolation {
  /** شناسهٔ قانون نقض‌شده */
  rule: string;
  /** توضیح فارسیِ آمادهٔ بازگشت به عامل / ثبت در گزارش مدیر */
  message: string;
  /** نمونه‌ای از متن نقض‌شده (برش کوتاه برای دیباگ) */
  excerpt: string;
}

interface PolicyRule {
  rule: string;
  message: string;
  patterns: RegExp[];
}

/* ------------------------------------------------------------------ */
/* قوانین سخت (Hard-Fail): هر متنی که با این الگوها منطبق شود، ۴۲۲ می‌گیرد */
/* ------------------------------------------------------------------ */
export const POLICY_RULES: PolicyRule[] = [
  {
    rule: "no_doctor_referral",
    message:
      "ارجاع مخاطب به پزشک/دکتر/متخصص/کلینیک/بیمارستان در محتوا ممنوع است (قانون استراتژیک برند). " +
      "به‌جای آن: ارجاع به مشاورهٔ تخصصی داخل خود برند (واحد آموزشی-مشاوره / پشتیبانی رسمی).",
    patterns: [
      /مراجعه\s*به\s*(پزشک|دکتر|متخصص|کلینیک|بیمارستان|مدکترا|فوق\s*تخصص)/i,
      /به\s*(پزشک|دکتر|متخصص)\s+مراجعه/i,
      /(پزشک|دکتر|متخصص)\s+(خود\s+را\s+)?مراجعه/i,
      /با\s*(پزشک|دکتر|متخصص)\s+(حتماً\s*)?(مشورت|تماس|صحبت|هماهنگ|دیدار)/i,
      /مشورت\s+با\s*(پزشک|دکتر|متخصص)/i,
      /صحبت\s+با\s*(پزشک|دکتر|متخصص)/i,
      /نزد\s*(پزشک|دکتر|متخصص)\s*برو/i,
      /تحت\s*نظر\s*(پزشک|دکتر|متخصص)/i,
      /حتماً\s*به\s*(پزشک|دکتر)/i,
      /توسط\s*(پزشک|دکتر|متخصص)\s*(بررسی|معاینه|تشخیص)/i,
      /(consult|see|ask|talk\s+to|contact|visit|check\s+with)\s+(a\s+|your\s+|his\s+|her\s+)?(doctor|physician|pediatrician|specialist|health\s*care\s+provider|medical\s+professional)/i,
      /doctor'?s\s+(advice|approval|consultation|office)/i,
      /pediatrician'?s\s+(advice|approval|consultation)/i,
    ],
  },
  {
    rule: "no_drug_prescription",
    message:
      "تجویز/توصیهٔ مصرف دارو یا مکمل با دوز مشخص در محتوا ممنوع است (مسئولیت درمانی ایجاد می‌کند).",
    patterns: [
      /تجویز\s*(دارو|نوسخه|قرص|مکمل|شربت|قطره)/i,
      /نسخه\s*(دادن|پیچیدن|نوشتن|پزشکی)/i,
      /(قرص|شربت|آمپول|قطره|капсуل)\s+\S+\s+(مصرف\s+)?(بدهید|بخورید|نوشید|بزنید|یک‌?بار|دو\s*بار)/i,
      /(یک|دو|سه|چهار|پنج)\s*(بار|وعده)\s+در\s+(روز|شب)\s+(مصرف\s+)?(قرص|شربت|قطره|مکمل)/i,
      /دوز\s+(مصرفی|مجاز)\s+.{0,40}(داروی|قرص|شربت|قطره)/i,
      /\b\d+\s*mg\s*(أ|per|\/|به|در)/i,
      /(take|give)\s+\d+\s*(mg|ml|cc|pill|tablet|capsule)/i,
      /prescrib(e|ing|tion)\b/i,
      /دوزاژ\s+(مصرفی|کودکان)/i,
    ],
  },
  {
    rule: "no_definitive_cure_claim",
    message:
      "ادعای درمان قطعی/تضمینی یا درصدِ قاطع (مثل «۱۰۰٪ درمان») در محتوا ممنوع است؛ از لحن علمی و محتاط استفاده کنید.",
    patterns: [
      /درمان\s+(قطعی|تضمینی|صد\s*در\s*صد|100\s*٪)/i,
      /تضمین\s+(قطعی|صد\s*در\s*صد|100)/i,
      /شفای\s+قطعی/i,
      /درمان\s+۱۰۰\s*(درصد|٪)/i,
      /(صِد|100)\s*(درصد|٪)\s+درمان/i,
      /cured?\s+(permanently|100\s*%|completely)/i,
      /guaranteed\s+(cure|result|recovery)/i,
      /۱۰۰٪\s*(درمان|قطعی|تضمینی)/i,
    ],
  },
  {
    rule: "no_private_contacts",
    message:
      "درج شمارهٔ تماس/کارت بانکی/لینک مستقیم پیام‌رسانِ شخصی در محتوای عمومی ممنوع است.",
    patterns: [
      /\b0?9\d{9}\b/,
      /\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b/,
      /(\+98|0098)\s*9\d{9}/i,
      /(whatsapp|تلگرام|واتس‌?اپ|واتساب|اینستاگرام)\s*[:@/]/i,
      /(لینک)?\s*(پیوست|ضمیمه|فایل)\s*دانلود\s*[:：]\s*https?:\/\//i,
    ],
  },
];

/* محدودیت‌های طول/اندازه (توسط handlerها نیز اعمال می‌شود؛ اینجا جهت خودتوضیحی) */
export const CONTENT_LIMITS = {
  title: { min: 4, max: 300 },
  shortDescription: { min: 0, max: 1000 },
  body: { min: 0, max: 30000 },
  keywordsPerItem: 20,
} as const;

/** فیلدهایِ فنی درخواست که هرگز نباید اسکن شوند */
const TECHNICAL_KEYS = new Set<string>([
  "api_key", "apiKey", "key", "action", "type", "id", "ids", "item_id", "faq_id",
  "review_id", "media_id", "course_id", "course_ids", "product_id", "discount_id",
  "tag_name", "tab_id", "tabId", "placement", "placements", "collection",
  "db_table", "include", "limit", "offset", "page", "warnings", "filters",
  "settings_key", "approval_ids", "feature_keys", "tag_pairs", "embedding_docs",
  "revoke", "hard_delete", "delete_all_placements", "category",
]);

function collectStrings(value: unknown, out: string[], depth: number): void {
  if (depth > 6 || out.length > 400) return;
  if (typeof value === "string") {
    out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectStrings(v, out, depth + 1);
    return;
  }
  if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      if (TECHNICAL_KEYS.has(k)) continue;
      collectStrings(v, out, depth + 1);
    }
  }
}

function excerptOf(text: string): string {
  const t = String(text).replace(/\s+/g, " ").trim();
  return t.length > 90 ? `${t.slice(0, 90)}…` : t;
}

/**
 * همهٔ رشته‌های قابل دید در بدنه (جزو فیلدهای فنی) را بر اساس POLICY_RULES اسکن می‌کند.
 * خروجی: آرایهٔ نقض‌ها (خالی = عبور).
 */
export function scanContentPolicy(
  body: unknown,
  extraStrings: string[] = [],
): PolicyViolation[] {
  const strings: string[] = [...extraStrings.filter((s) => typeof s === "string" && s)];
  collectStrings(body, strings, 0);
  const violations: PolicyViolation[] = [];
  const seen = new Set<string>();
  for (const rule of POLICY_RULES) {
    for (const pattern of rule.patterns) {
      for (const s of strings) {
        if (!s || s.length > 60000) continue;
        if (pattern.test(s)) {
          const sig = `${rule.rule}:${s.slice(0, 64)}`;
          if (seen.has(sig)) break;
          seen.add(sig);
          violations.push({
            rule: rule.rule,
            message: rule.message,
            excerpt: excerptOf(s),
          });
          break; // یک نقض از هر الگوی قانون کافی است
        }
      }
    }
  }
  return violations;
}

/** خلاصهٔ قوانین برای اکشن get_policy (بدون جزئیات regex، قابل‌نمایش برای عامل‌ها) */
export function policySummary() {
  return {
    version: POLICY_VERSION,
    limits: CONTENT_LIMITS,
    rules: POLICY_RULES.map((r) => ({ id: r.rule, description: r.message })),
    guide_points_fa: [
      "از لحن صمیمی ولی علمی و محافظه‌کارانه استفاده کنید (بدون ادعای قطعی، بدون نتیجهٔ تضمینی).",
      "محتوا برای والدینِ فارسی‌زبان نوشته شود؛ ترجمهٔ EN در صورت درخواست صریح.",
      "بدون ارجاع به پزشک/دکتر/کلینیک — به‌جای آن ارجاع به مشاورهٔ تخصصی داخل خود برند.",
      "بدون نام‌بردن از رقیبان/برندهای خارجی/شبکه‌های اجتماعی بی‌ربط.",
      "بدون لینک خارجی جزوه‌ای (فایل PDF/DOC) در متن عمومی؛ تمرکز بر تجربهٔ خود سایت.",
      "احترام به حریم خانواده: برچسب‌سازی هویتی برای کودک (مثل «عملکرد ضعیف») بدون تکرار اضطراب‌آور.",
    ],
  };
}
