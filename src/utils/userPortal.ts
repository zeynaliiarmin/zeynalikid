// userPortal — ابزار مشترک پنل کاربر (نشست، اعتبارسنجی نام واقعی)
// قانون نشست: فقط sessionStorage؛ هیچ دادهٔ حساسی در localStorage ذخیره نمیشود.
export interface PortalSession {
  phone: string;      // فقط ارقام (شمارهٔ کاربر)
  fullName: string;   // نام کامل ثبتنامشده
  code: string;       // کد پیگیری یکتای کاربر (همان کد ثبتنام)
}

export const PORTAL_SESSION_KEY = 'zk_portal_session';

export function getUserSession(): PortalSession | null {
  try {
    const raw = sessionStorage.getItem(PORTAL_SESSION_KEY);
    if (!raw) return null;
    const o = JSON.parse(raw);
    if (!o || !o.phone || !o.code) return null;
    return { phone: String(o.phone), fullName: String(o.fullName || ''), code: String(o.code) };
  } catch { return null; }
}

/** رویداد سبکِ محلی تا برچسب منوی همبرگری با ورود/خروج کاربر تازه شود */
function announceSessionChange() {
  try { if (typeof window !== 'undefined') window.dispatchEvent(new Event('zk-portal-session')); } catch { /* ignore */ }
}

export function setUserSession(s: PortalSession) {
  try { sessionStorage.setItem(PORTAL_SESSION_KEY, JSON.stringify(s)); } catch { /* ignore */ }
  announceSessionChange();
}

export function clearUserSession() {
  try { sessionStorage.removeItem(PORTAL_SESSION_KEY); } catch { /* ignore */ }
  announceSessionChange();
}

export function setPortalNext(path: string) {
  try { sessionStorage.setItem('zk_portal_next', path); } catch { /* ignore */ }
}

export function takePortalNext(): string | null {
  try { const p = sessionStorage.getItem('zk_portal_next'); sessionStorage.removeItem('zk_portal_next'); return p; } catch { return null; }
}

export function getPortalNext(): string | null {
  try { return sessionStorage.getItem('zk_portal_next'); } catch { return null; }
}

// ─────────────────────────────────────────────────────────────────────────
// نام واقعی — جدید: حداقل «حرف» نه «کلمه»
//  • فارسی (زبان سایت fa): فقط حروف فارسی، حداقل ۳ حرف (مثل «علی»)
//  • انگلیسی (زبان سایت en): فقط حروف لاتین، حداقل ۲ حرف
//  • هیچوقت: رقم، نماد، تکرار یک کلمه
// ⚠️ این قانون همهجای پروژه اعمال میشود: ثبتنام پنل، فرم مشاوره (نام والد) و فرم ارسال دوره (نام گیرنده)
// ─────────────────────────────────────────────────────────────────────────
const FA_CHARS = '\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF';
const FA_RE = new RegExp(`^[${FA_CHARS}\\s\u200c\u200f]+$`);
const EN_RE = /^[A-Za-z\s\u200c\u200f'.-]+$/;
const FA_MIN_DEFAULT = 3;
const EN_MIN = 2;

/** «+989123456789» را به کد کشور + شمارهٔ داخلی تبدیل می‌کند (برای پر کردن خودکار فرم‌ها) */
export function splitE164(phone: any, countries: any[] = []): { cc: string; local: string } {
  const raw = String(phone || '').replace(/[^\d+]/g, '');
  if (!raw.startsWith('+')) return { cc: '+98', local: raw };
  let best: any = null; let bestLen = 0;
  for (const c of countries || []) {
    const d = String(c?.code || '').replace(/\D/g, '');
    if (d && raw.slice(1).startsWith(d) && d.length > bestLen) { best = c; bestLen = d.length; }
  }
  if (!best) return { cc: '+98', local: raw.replace(/\D/g, '') };
  let local = raw.slice(1 + bestLen);
  if (String(best.code) === '+98' && local && !local.startsWith('0')) local = `0${local}`;
  return { cc: String(best.code), local };
}

const FA_START_RE = new RegExp(`^[${FA_CHARS}]`);
const EN_TOKEN_RE = /^[A-Za-z][A-Za-z'.-]*$/;
/**
 * اعتبارسنجی نام — بر پایهٔ «خطِ متن» نه زبان سایت:
 * نام کاملاً لاتین با قواعد لاتین (حداقل ۲ حرف)، وگرنه با قواعد فارسی (حداقل faMin حرف).
 * ترکیب فارسی+لاتین (مثلاً «علی Rezaei») هم مجاز است.
 */
export function validateFullName(name: any, lang: 'fa' | 'en' | string = 'fa', faMin: number = FA_MIN_DEFAULT): { ok: boolean; error?: string } {
  const en = lang === 'en';
  const bad = en ? 'Enter your first and last name correctly.' : 'نام و نام خانوادگی خود را به درستی وارد کنید.';
  const raw = String(name || '').replace(/\s+/g, ' ').trim();
  if (!raw) return { ok: false, error: en ? 'Enter your first and last name.' : 'نام و نام خانوادگی را وارد کنید.' };
  if (/[0-9\u06F0-\u06F9\u0660-\u0669]/.test(raw)) return { ok: false, error: bad };
  const tokens = raw.split(' ').filter(Boolean);
  if (!tokens.length) return { ok: false, error: bad };
  const allLatin = tokens.every((t) => EN_TOKEN_RE.test(t));
  if (!allLatin && !tokens.every((t) => EN_TOKEN_RE.test(t) || FA_START_RE.test(t))) return { ok: false, error: bad };
  const min = allLatin ? EN_MIN : Math.max(2, Math.min(8, Number(faMin) || FA_MIN_DEFAULT));
  const letters = raw.replace(/[\s\u200c\u200f'.-]/g, '');
  if (letters.length < min) return { ok: false, error: bad };
  // رد تکرار یک کلمه
  const seen: Record<string, boolean> = {};
  for (const w of tokens) {
    const norm = w.toLowerCase();
    if (w.length < 2) continue;
    if (seen[norm]) return { ok: false, error: bad };
    seen[norm] = true;
  }
  return { ok: true };
}

/**
 * یکسان‌سازی کد پیگیری برای والدین: ارقام فارسی→لاتین، حروف بزرگ، حذف فاصله/خط تیره/آندرلاین
 * و حذف پیشوند برند در ابتدای کد (ZK، FM، F، M) — «ZK-12739»، «F 12739»، «M-12739» و «fm12739» همگی پذیرفته می‌شوند.
 */
export function normalizeLoginCode(raw: unknown): string {
  const s = String(raw ?? '')
    .replace(/[\u0660-\u0669]/g, (d) => String('\u0660\u0661\u0662\u0663\u0664\u0665\u0666\u0667\u0668\u0669'.indexOf(d)))
    .replace(/[\u06F0-\u06F9]/g, (d) => String('\u06F0\u06F1\u06F2\u06F3\u06F4\u06F5\u06F6\u06F7\u06F8\u06F9'.indexOf(d)))
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  if (!s) return '';
  const m = s.match(/[0-9][A-Z0-9]*$/);
  return m ? m[0] : s;
}

// ─────────────────────────────────────────────────────────────────────────
// شمارهٔ تماس
// ─────────────────────────────────────────────────────────────────────────
// تبدیل ارقام فارسی/عربی به لاتین + حذف غیررقم
export function digitsOnly(v: any): string {
  return String(v ?? '').replace(/[۰-۹]/g, (d: any) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, (d: any) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');
}

// نرمالسازی برای سرور: ۰۹۱۲… / ۹۱۲… / +98912… / 0098912… → +98912… (و برای سایر کشورها +CC…)
export function normalizePhoneForServer(raw: string): string {
  let d = digitsOnly(raw);
  if (d.length < 7) return '';
  if (d.startsWith('0098')) d = d.slice(2);
  if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2);
  if (d.startsWith('9') && d.length === 10) d = '0' + d;
  if (d.startsWith('0')) return `+98${d.slice(1)}`;
  return `+${d}`;
}

// نمایش ماسکشدهٔ شماره برای UI: +98912xxxx789 / 0912xxxx789
export function maskPhoneLocal(phone: string): string {
  const d = digitsOnly(String(phone || '').replace(/^\+/, ''));
  if (d.length < 7) return String(phone || '');
  const last3 = d.slice(-3);
  if (d.startsWith('98')) return '+98' + d.slice(2, 6) + 'xxxx' + last3;
  return d.slice(0, 3) + 'xxxx' + last3;
}

// نرمالسازی ساده (بدون کد کشور): برای مقایسههای محلی
export function normalizePhone(raw: string): string {
  let d = String(raw || '').replace(/[^0-9]/g, '');
  if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2);
  if (d.startsWith('0098')) d = '0' + d.slice(4);
  if (d.length === 10 && d.startsWith('9')) d = '0' + d;
  return d;
}

export function phoneValid(raw: string): boolean {
  const d = normalizePhone(raw);
  return d.length === 11 && d.startsWith('09');
}
