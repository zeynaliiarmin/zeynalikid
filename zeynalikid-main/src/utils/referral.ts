// ابزار کمکی مشاورین و لینک‌های ارجاع (referral)
// کد ارجاع از مسیر (مثل /mhi) یا پارامتر URL (مثل ?ad=mhi) خوانده می‌شود.

export function getReferralCodeFromUrl(): string {
  try {
    // ۱) مسیر مستقیم: https://zeynalikid.vercel.app/mhi
    const path = window.location.pathname || '';
    const cleanPath = path.replace(/\/+$/, '').replace(/^\//, '');
    // فقط اگر دقیقاً یک قطعهٔ ساده باشد و جزو مسیرهای شناخته‌شده نباشد
    if (cleanPath && !cleanPath.includes('/') && !cleanPath.startsWith('admin') && !['courses','experience','education','about','contact','faq','products','form','consultation','track','growth','settings','profile','licenses','child-info','course-shipping','course-payment','course-confirm','course-done'].includes(cleanPath.split('?')[0])) {
      return cleanPath.split('?')[0].trim();
    }
    // ۲) پارامتر URL: ?ad=CODE یا ?ref=CODE
    const q = new URLSearchParams(window.location.search);
    return (q.get('ad') || q.get('ref') || '').trim();
  } catch {
    return '';
  }
}

// پیدا کردن مشاور بر اساس کد ارجاع (case-insensitive)
export function findConsultantByCode(consultants: any[] | undefined, code: string): any | null {
  if (!code || !Array.isArray(consultants)) return null;
  const c = code.trim().toLowerCase();
  return consultants.find((x: any) => x && String(x.referralCode || '').trim().toLowerCase() === c) || null;
}

// ساخت کد ارجاع پیشنهادی از نام انگلیسی (۳ حرف اول، بدون فاصله)
export function makeReferralCode(nameEn?: string): string {
  const base = String(nameEn || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
  return base.slice(0, 3);
}

// بررسی یکتایی کد ارجاع در لیست مشاورین (به‌جز خود مشاور)
export function isReferralCodeUnique(consultants: any[] | undefined, code: string, excludeId?: string): boolean {
  if (!code) return false;
  const c = code.trim().toLowerCase();
  return !(Array.isArray(consultants) && consultants.some((x: any) =>
    x && String(x.referralCode || '').trim().toLowerCase() === c && String(x.id) !== String(excludeId)
  ));
}
