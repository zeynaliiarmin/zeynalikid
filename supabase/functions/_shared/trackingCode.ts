// supabase/functions/_shared/trackingCode.ts
// ─────────────────────────────────────────────────────────────────────────────
// «یک کد پیگیری برای هر شماره — برای همیشه»
//
// مشکل قبلی: ایندکس یکتای سراسری روی tracking_code با سیاست «همهٔ فرم‌های یک شماره
// یک کد دارند» از نظر ریاضی ناسازگار بود؛ فرم دوم همان شماره با خطای 23505 رد می‌شد
// و کاربر پیام «ساخت کد پیگیری انجام نشد» می‌گرفت (و هیچ ردیفی در پنل ثبت نمی‌شد).
//
// راه‌حل: جدول نگاشت phone_tracking_codes (شماره → کد) به‌عنوان تنها منبع حقیقت:
//   - PRIMARY KEY روی شماره  ⇒ هر شماره فقط یک کد
//   - UNIQUE روی کد          ⇒ هر کد فقط برای یک شماره
// تابع زیر همین دو قانون را رعایت می‌کند و اگر جدول نگاشت هنوز ساخته نشده باشد
// (پروژه‌ای که مهاجرت روی آن اعمال نشده) با رفتار سازگارِ قدیمی ادامه می‌دهد.
// ─────────────────────────────────────────────────────────────────────────────

const ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

/** کد تصادفی با آنتروپی بالا: ZK- + ۷ تا ۹ کاراکتر (رقم اول هرگز صفر نیست) */
export const randomTrackingCode = (prefix = "ZK"): string => {
  const head = String(prefix || "ZK").toUpperCase() === "FM" ? "FM" : "ZK";
  const length = 7 + (crypto.getRandomValues(new Uint8Array(1))[0] % 3);
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  const first = String(1 + (bytes[0] % 9));
  const body = first + Array.from(bytes.slice(1), (b) => ALPHABET[b % ALPHABET.length]).join("");
  return `${head}-${body}`;
};

const isMissingTable = (err: any): boolean => {
  const msg = String(err?.message || err || "");
  return /42P01|does not exist|relation .* not found|Could not find the table/i.test(msg);
};

/**
 * کد رسمیِ این شماره را برمی‌گرداند؛ اگر نداشت، یکی می‌سازد و ثبت می‌کند.
 * سوابق حذف‌شدهٔ نرم هم شمرده می‌شوند تا کد یک کاربر «برای همیشه» همان بماند.
 */
export async function getOrCreateTrackingCode(supabase: any, phone: string, prefix = "ZK"): Promise<string> {
  const p = String(phone || "").trim();
  if (!p) return randomTrackingCode(prefix);

  // ۱) نگاشت رسمی (سریع‌ترین و معتبرترین مسیر)
  try {
    const { data, error } = await supabase.from("phone_tracking_codes").select("tracking_code").eq("full_phone", p).maybeSingle();
    if (!error && data?.tracking_code) return String(data.tracking_code);
  } catch { /* ادامه */ }

  // ۲) ارث‌بری کد موجودِ همین شماره از هر رکورد (حتی حذف‌شده) — قدیمی‌ترین کد برنده است
  let adopted = "";
  try {
    const { data } = await supabase
      .from("submissions")
      .select("payload")
      .eq("full_phone", p)
      .order("created_at", { ascending: true })
      .limit(200);
    for (const row of data || []) {
      const c = String(row?.payload?.code || row?.payload?.trackingCode || "").trim();
      if (c) { adopted = c; break; }
    }
  } catch { /* ادامه */ }

  // ۳) ثبت در نگاشت (اول کد ارثی، بعد کدهای تصادفی تا رفع برخورد)
  const candidates: string[] = [];
  if (adopted) candidates.push(adopted);
  for (let i = 0; i < 8; i++) candidates.push(randomTrackingCode(prefix));
  for (const cand of candidates) {
    try {
      const { error } = await supabase.from("phone_tracking_codes").insert({ full_phone: p, tracking_code: cand });
      if (!error) return cand;
      if (String(error?.code) === "23505") {
        // یا همین شماره در رقابتِ هم‌زمان کد گرفته، یا این کد مال شمارهٔ دیگری است
        try {
          const { data } = await supabase.from("phone_tracking_codes").select("tracking_code").eq("full_phone", p).maybeSingle();
          if (data?.tracking_code) return String(data.tracking_code);
        } catch { /* ادامه */ }
        continue;
      }
      if (isMissingTable(error)) break; // مهاجرت اعمال نشده → مسیر سازگار پایین
      break;
    } catch (e) {
      if (isMissingTable(e)) break;
      break;
    }
  }

  if (adopted) return adopted;

  // ۴) مسیر سازگار (بدون جدول نگاشت): کدی بساز که قبلاً استفاده نشده باشد
  const seen = new Set<string>();
  try {
    const { data } = await supabase.from("submissions").select("tracking_code").not("tracking_code", "is", null).limit(5000);
    for (const row of data || []) if (row?.tracking_code) seen.add(String(row.tracking_code).toLowerCase());
  } catch { /* ادامه */ }
  try {
    const { data } = await supabase.from("submissions").select("payload->code").eq("payload->>type", "user").limit(3000);
    for (const row of data || []) {
      const c = row?.code || row?.payload?.code;
      if (c) seen.add(String(c).toLowerCase());
    }
  } catch { /* ادامه */ }
  for (let i = 0; i < 20; i++) {
    const c = randomTrackingCode(prefix);
    if (!seen.has(c.toLowerCase())) return c;
  }
  return randomTrackingCode(prefix);
}
