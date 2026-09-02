// میانگین‌های قد و وزن WHO برای کودکان ۲ تا ۱۸ سال (مقادیر مرجع، گرد شده).
// کاربرد: پاسخ رشد دستیار عمومی + پشتوانهٔ عددی تولید برنامه با هوش مصنوعی.
export type WhoRow = { h: number; w: number };

export const WHO_HEIGHT_TOLERANCE_CM = 2;
export const WHO_WEIGHT_TOLERANCE_KG = 3;

export const WHO_GROWTH: Record<"boy" | "girl", Record<number, WhoRow>> = {
  boy: {
    2: { h: 87.0, w: 12.2 }, 3: { h: 96.1, w: 14.3 }, 4: { h: 103.3, w: 16.5 }, 5: { h: 110.0, w: 18.7 },
    6: { h: 115.7, w: 20.2 }, 7: { h: 122.2, w: 23.0 }, 8: { h: 128.1, w: 26.9 }, 9: { h: 133.6, w: 31.0 },
    10: { h: 138.6, w: 34.8 }, 11: { h: 144.1, w: 39.7 }, 12: { h: 149.3, w: 44.6 }, 13: { h: 156.4, w: 49.9 },
    14: { h: 162.6, w: 56.4 }, 15: { h: 167.3, w: 62.2 }, 16: { h: 170.4, w: 66.8 }, 17: { h: 172.5, w: 70.4 },
    18: { h: 173.7, w: 73.0 },
  },
  girl: {
    2: { h: 86.4, w: 11.8 }, 3: { h: 95.3, w: 13.9 }, 4: { h: 102.3, w: 16.0 }, 5: { h: 109.4, w: 18.2 },
    6: { h: 115.1, w: 19.8 }, 7: { h: 121.3, w: 22.5 }, 8: { h: 127.3, w: 26.3 }, 9: { h: 133.5, w: 31.4 },
    10: { h: 138.6, w: 35.6 }, 11: { h: 144.8, w: 41.8 }, 12: { h: 151.2, w: 47.1 }, 13: { h: 156.4, w: 52.7 },
    14: { h: 158.7, w: 56.0 }, 15: { h: 160.1, w: 58.1 }, 16: { h: 161.5, w: 59.5 }, 17: { h: 162.4, w: 60.6 },
    18: { h: 162.7, w: 61.4 },
  },
};

export type WhoSex = "boy" | "girl" | "unknown";

/** مرجع WHO برای سن (clamp به ۲..۱۸). جنسیت نامعلوم = میانگین دو جدول. */
export function whoRef(ageYears: number, sex: WhoSex): { age: number; h: number; w: number } | null {
  const age = Math.round(Number(ageYears));
  if (!Number.isFinite(age) || age < 2 || age > 18) return null;
  const rows: WhoRow[] = [];
  if (sex === "boy" || sex === "unknown") rows.push(WHO_GROWTH.boy[age]);
  if (sex === "girl" || sex === "unknown") rows.push(WHO_GROWTH.girl[age]);
  const h = rows.reduce((s, r) => s + r.h, 0) / rows.length;
  const w = rows.reduce((s, r) => s + r.w, 0) / rows.length;
  return { age, h: Math.round(h * 10) / 10, w: Math.round(w * 10) / 10 };
}

const faDigits = (v: unknown) => String(v ?? "").replace(/\d/g, (d) => "۰۱۲۳۴۵۶۷۸۹"[+d]).replace(".", "٫");
const toEn = (v: string) => v.replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d))).replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)));

/**
 * مسیر پاسخ رشد بدون مدل: اگر پرسش شامل «رشد/قد/وزن + سن» بود، متن راهنمای WHO برگردان؛
 * در غیر این صورت null تا جریان عادی دستیار ادامه پیدا کند.
 */
export function whoGrowthAnswer(text: unknown, lang: "fa" | "en" = "fa"): string | null {
  const raw = toEn(String(text || "")).toLowerCase();
  if (raw.length < 6) return null;
  const growthTopic = /(رشد|رشد قد|قد و وزن|وزن و قد|قد کوتاه|کوتاهی قد|استاندارد|میانگین|منحنی|سانتی|کیلو)/.test(raw);
  if (!growthTopic) return null;
  const ageMatch = raw.match(/(?:سن|age|عمر)[^\d]{0,8}(\d{1,2})(?:\s*(?:سال|year|yr))?/) || raw.match(/(\d{1,2})\s*(?:ساله|سال|years?)(?![0-9])/);
  if (!ageMatch) return null;
  const age = parseInt(ageMatch[1], 10);
  if (age < 2 || age > 18) return null;
  const sex: WhoSex = /(دختر|girl|daughter|خانم)/.test(raw) ? "girl" : /(پسر|boy|son|آقا)/.test(raw) ? "boy" : "unknown";
  const ref = whoRef(age, sex);
  if (!ref) return null;
  const hMatch = raw.match(/(\d{2,3}(?:[.,]\d)?)\s*(?:cm|سانتی|سانتی‌متر|سانتی متر|سانtim)/) || raw.match(/(?:قد|height)[^\d]{0,8}(\d{2,3}(?:[.,]\d)?)/);
  const wMatch = raw.match(/(\d{1,3}(?:[.,]\d)?)\s*(?:kg|کیلو(?:گرم)?|کیگ)/) || raw.match(/(?:وزن|weight)[^\d]{0,8}(\d{1,3}(?:[.,]\d)?)/);
  const userH = hMatch ? parseFloat(hMatch[1].replace(",", ".")) : NaN;
  const userW = wMatch ? parseFloat(wMatch[1].replace(",", ".")) : NaN;
  const sexFa = sex === "girl" ? "دختر" : sex === "boy" ? "پسر" : "کودک";
  const sexEn = sex === "girl" ? "girl" : sex === "boy" ? "boy" : "child";
  const hLow = Math.round((ref.h - WHO_HEIGHT_TOLERANCE_CM) * 10) / 10;
  const hHigh = Math.round((ref.h + WHO_HEIGHT_TOLERANCE_CM) * 10) / 10;
  const wLow = Math.round((ref.w - WHO_WEIGHT_TOLERANCE_KG) * 10) / 10;
  const wHigh = Math.round((ref.w + WHO_WEIGHT_TOLERANCE_KG) * 10) / 10;
  if (lang === "en") {
    let out = `According to WHO growth medians, the average ${sexEn} aged ${ref.age} is about ${ref.h} cm tall and weighs about ${ref.w} kg. Normally, a height within ±${WHO_HEIGHT_TOLERANCE_CM} cm (${hLow}–${hHigh} cm) and a weight within ±${WHO_WEIGHT_TOLERANCE_KG} kg (${wLow}–${wHigh} kg) of the median is considered the acceptable range. These are approximate WHO averages, not a medical diagnosis.`;
    if (Number.isFinite(userH)) out += ` Your reported height (${userH} cm) is ${userH >= hLow && userH <= hHigh ? "inside" : userH < hLow ? "below" : "above"} this range.`;
    if (Number.isFinite(userW)) out += ` Your reported weight (${userW} kg) is ${userW >= wLow && userW <= wHigh ? "inside" : userW < wLow ? "below" : "above"} this range.`;
    out += " For an exact assessment of the growth curve and the recent trend, request a specialist consultation.";
    return out;
  }
  let out = `بر اساس میانگین‌های رشد سازمان بهداشت جهانی (WHO)، یک ${sexFa} ${faDigits(ref.age)} ساله به‌طور میانگین حدود ${faDigits(ref.h)} سانتی‌متر قد و ${faDigits(ref.w)} کیلوگرم وزن دارد. محدودهٔ معمول: قد ${faDigits(hLow)} تا ${faDigits(hHigh)} سانتی‌متر (±${faDigits(WHO_HEIGHT_TOLERANCE_CM)} سانتی‌متر) و وزن ${faDigits(wLow)} تا ${faDigits(wHigh)} کیلوگرم (±${faDigits(WHO_WEIGHT_TOLERANCE_KG)} کیلوگرم) حول همین میانگین. توجه کنید که این اعداد تقریبی و بر پایهٔ میانگین WHO هستند و جایگزین قضاوت پزشکی نیستند.`;
  if (Number.isFinite(userH)) out += ` قد اعلامی شما (${faDigits(userH)} سانتی‌متر) ${userH >= hLow && userH <= hHigh ? "داخل بازهٔ معمول" : userH < hLow ? "کمی پایین‌تر از بازهٔ معمول" : "کمی بالاتر از بازهٔ معمول"} است.`;
  if (Number.isFinite(userW)) out += ` وزن اعلامی شما (${faDigits(userW)} کیلوگرم) ${userW >= wLow && userW <= wHigh ? "داخل بازهٔ معمول" : userW < wLow ? "کمی پایین‌تر از بازهٔ معمول" : "کمی بالاتر از بازهٔ معمول"} است.`;
  out += " برای ارزیابی دقیق منحنی رشد و روند چند ماه اخیر، پیشنهاد می‌کنم درخواست مشاوره بفرستید تا کارشناس فرزندمن عدد فرزند شما را روی نمودار رشد بررسی کند.";
  return out;
}
