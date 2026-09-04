// ابزار کمکی مشاورین و لینک‌های ارجاع (referral)
// کد ارجاع از مسیر (مثل /mhi) یا پارامتر URL (مثل ?ad=mhi) خوانده می‌شود.
// نسخه گسترش‌یافته: پشتیبانی از لینک‌های نقشه راه مثل /afit (تب) یا /afit1 (دوره مستقیم)

export interface ParsedReferral {
  /** کد پایه مشاور (مثلاً afi) */
  code: string;
  /** کل رشته شناسایی‌شده (مثلاً afit1) */
  raw: string;
  /** مخفف تب (مثلاً t برای رشد قد) - خالی برای لینک پایه */
  tabCode?: string;
  /** شماره ۱-بیس دوره درون تب (مثلاً ۱ برای اولین دوره) - خالی برای لینک تب */
  courseIndex?: number;
}

// مسیرهای سیستمی که نباید به عنوان کد ارجاع تفسیر شوند
const SYSTEM_PATHS = new Set([
  'admin','admin-login','courses','experience','education','about','contact','faq',
  'products','form','consultation','track','growth','settings','profile','licenses',
  'child-info','course-shipping','course-payment','course-confirm','course-done',
  'payment-verify','service-worker.js','favicon.ico','robots.txt','sitemap.xml',
  'assets','images','static','manifest.json'
]);

// حروف استاتیک/غیرقابل حدس را به‌عنوان پسوند تب نپذیر (مثلاً پسوندهای فایل)
function isLikelyFile(s: string): boolean {
  return /\.(js|css|png|jpg|jpeg|webp|gif|svg|ico|woff2?|ttf|map|json|html?|pdf|mp4|mp3|webm|txt)$/i.test(s);
}

// مسیر خام را با حذف trailing slash برمی‌گرداند
function rawPath(): string {
  try {
    const p = (window.location.pathname || '').replace(/\/+$/, '').replace(/^\//, '');
    return p.split('?')[0].trim();
  } catch {
    return '';
  }
}

/**
 * تجزیه لینک ارجاع گسترش‌یافته.
 * ورودی: consultants و courseTabs برای تطبیق معکوس کد پایه و مخفف تب.
 * خروجی: ParsedReferral یا null.
 */
/**
 * تجزیه یک رشته خام (بدون وابستگی به URL) به کد مشاور/تب/دوره.
 * برای بازیابی لینک ارجاع بعد از رفرش/ناوبری SPA از sessionStorage استفاده می‌شود،
 * بنابراین باید صرفاً بر اساس consultants و courseTabs فعلی (پویا) حل شود تا
 * با افزودن/ویرایش مشاورین در پنل همیشه هماهنگ بماند.
 */
export function parseReferralRaw(rawIn: string, consultants?: any[], courseTabs?: any[]): ParsedReferral | null {
  const raw = String(rawIn || '').trim();
  if (!raw) return null;
  const list = Array.isArray(consultants) ? consultants : [];
  const tabs = (Array.isArray(courseTabs) ? courseTabs : []).filter((tab:any)=>tab?.active!==false);
  const candidates = list
    .filter((consultant:any)=>consultant?.active!==false)
    .map((consultant:any) => String(consultant?.referralCode || '').trim().toLowerCase())
    .filter(Boolean)
    .sort((a: string, b: string) => b.length - a.length);
  const lowerRaw = raw.toLowerCase();
  for (const code of candidates) {
    if (!lowerRaw.startsWith(code)) continue;
    const tail = lowerRaw.slice(code.length).replace(/^[-_]+/, '');
    if (!tail) return { code, raw };
    // Try the complete tail first so future alphanumeric tab short codes remain valid.
    const exactTab = findTabByCode(tabs, tail);
    if (exactTab) return { code, raw, tabCode: String(exactTab.shortCode || tail).trim().toLowerCase() };
    // Try the longest tab prefix before the numeric course index.
    for (let split = tail.length - 1; split >= 1; split--) {
      const requestedTab = tail.slice(0, split);
      const numericTail = tail.slice(split);
      if (!/^\d+$/.test(numericTail)) continue;
      const idx = Number(numericTail);
      const tab = findTabByCode(tabs, requestedTab);
      const activeCourses = (Array.isArray(tab?.courses) ? tab.courses : []).filter((course:any)=>course?.active!==false);
      if (!tab || !Number.isSafeInteger(idx) || idx < 1 || idx > activeCourses.length) continue;
      return { code, raw, tabCode: String(tab.shortCode || requestedTab).trim().toLowerCase(), courseIndex: idx };
    }
  }
  return null;
}

export function parseReferral(consultants?: any[], courseTabs?: any[]): ParsedReferral | null {
  // ۱) پارامتر URL (?ad=CODE یا ?ref=CODE)
  let raw = '';
  try {
    const q = new URLSearchParams(window.location.search);
    raw = (q.get('ad') || q.get('ref') || '').trim();
  } catch {}

  // ۲) مسیر مستقیم
  if (!raw) {
    const p = rawPath();
    if (p && !p.includes('/')) {
      const first = p.split('?')[0].trim();
      if (first && !SYSTEM_PATHS.has(first.toLowerCase()) && !isLikelyFile(first)) {
        raw = first;
      }
    }
  }

  if (!raw) return null;
  return parseReferralRaw(raw, consultants, courseTabs);
}

/** پیدا کردن مشاور بر اساس کد ارجاع (case-insensitive) - ساده، برای سازگاری */
export function findConsultantByCode(consultants: any[] | undefined, code: string): any | null {
  if (!code || !Array.isArray(consultants)) return null;
  const c = code.trim().toLowerCase();
  return consultants.find((x: any) => x && String(x.referralCode || '').trim().toLowerCase() === c) || null;
}

/** پیدا کردن تب بر اساس مخفف سفارشی یا id یا حروف اول عنوان */
export function findTabByCode(tabs: any[], code: string): any | null {
  if (!code || !Array.isArray(tabs)) return null;
  const c = code.trim().toLowerCase();
  // اول: مخفف سفارشی
  const byShort = tabs.find((t: any) => String(t?.shortCode || '').trim().toLowerCase() === c);
  if (byShort) return byShort;
  // دوم: خود id
  const byId = tabs.find((t: any) => String(t?.id || '').toLowerCase() === c);
  if (byId) return byId;
  // سوم: حرف اول id (مثل h برای height) — برای تب‌هایی که shortCode ندارند
  const byIdFirst = tabs.find((t: any) => String(t?.id || '').replace(/[^a-z]/gi, '').charAt(0).toLowerCase() === c);
  if (byIdFirst) return byIdFirst;
  // چهارم: حروف اول کلمات عنوان (مثل bg برای «بی‌اشتهایی / بدغذایی»)
  const titleFirst = (t: any) => String(t?.title || '').replace(/[^a-zA-Zآ-ی]/gi, '').toLowerCase();
  const byTitle = tabs.find((t: any) => titleFirst(t).startsWith(c) && c.length >= 2);
  if (byTitle) return byTitle;
  return null;
}

/** لیست مخفف‌های پیشنهادی برای یک تب (اولین حرف از id، سپس حرف اول کلمات عنوان) */
export function suggestTabShortCode(tab: any, allTabs?: any[]): string {
  if (tab?.shortCode) return tab.shortCode;
  const used = new Set((allTabs || []).map((t: any) => String(t?.shortCode || '').toLowerCase()).filter(Boolean));
  const idFirst = String(tab?.id || '').replace(/[^a-z]/gi, '').charAt(0).toLowerCase();
  if (idFirst && !used.has(idFirst)) return idFirst;
  const title = String(tab?.title || '');
  for (const ch of title.replace(/[^a-zآ-ی]/gi, '').toLowerCase()) {
    if (ch && !used.has(ch)) return ch;
  }
  return (idFirst || 'x') + (used.size + 1);
}

// ساخت کد ارجاع پیشنهادی از نام انگلیسی (۲ حرف اول، بدون فاصله)
export function makeReferralCode(nameEn?: string): string {
  // ۲ حرف: حرف اول نام + حرف اول نام خانوادگی (مثل Armin Zeynali → az)
  const parts = String(nameEn || '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).replace(/[^a-z]/g, '');
  }
  // تک‌کلمه‌ای: دو حرف اول
  return (parts[0] || '').replace(/[^a-z]/g, '').slice(0, 2);
}

// بررسی یکتایی کد ارجاع در لیست مشاورین (به‌جز خود مشاور)
export function isReferralCodeUnique(consultants: any[] | undefined, code: string, excludeId?: string): boolean {
  if (!code) return false;
  const c = code.trim().toLowerCase();
  return !(Array.isArray(consultants) && consultants.some((x: any) =>
    x && String(x.referralCode || '').trim().toLowerCase() === c && String(x.id) !== String(excludeId)
  ));
}

// سازگاری با نسخه قبلی: خواندن کد خام از URL
export function getReferralCodeFromUrl(): string {
  try {
    const path = window.location.pathname || '';
    const cleanPath = path.replace(/\/+$/, '').replace(/^\//, '');
    if (cleanPath && !cleanPath.includes('/') && !cleanPath.startsWith('admin') && !['courses','experience','education','about','contact','faq','products','form','consultation','track','growth','settings','profile','licenses','child-info','course-shipping','course-payment','course-confirm','course-done'].includes(cleanPath.split('?')[0])) {
      return cleanPath.split('?')[0].trim();
    }
    const q = new URLSearchParams(window.location.search);
    return (q.get('ad') || q.get('ref') || '').trim();
  } catch {
    return '';
  }
}

// جایگزینی توکن‌های پویا ({tab}، {course}، {consultant}) در متن‌های راهنمای ارجاع.
// وقتی مدیر متن سفارشی با توکن ذخیره کرده باشد، این تابع نام واقعی را جایگزین می‌کند.
export function fillReferralText(text: string | null | undefined, vars: Record<string, string>): string {
  let out = String(text || '');
  for (const [key, value] of Object.entries(vars || {})) {
    out = out.split(`{${key}}`).join(String(value ?? ''));
  }
  return out;
}
