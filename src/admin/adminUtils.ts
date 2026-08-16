// ابزارهای مشترک پنل مدیریت — سطح ماژول (هویت پایدار، بدون Remount)
// این فایل در بازطراحی SubCard ساخته شد تا AdminPanel.tsx و SubCard.tsx از یک منبع واحد استفاده کنند.

export const SK = { settings: 'zkid_settings_v2', subs: 'zkid_submissions_v2' };

export const p2e = (s: any) =>
  String(s ?? '')
    .replace(/[۰-۹]/g, d => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString())
    .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());

export const digits = (s: any) => p2e(s).replace(/[^0-9]/g, '');

export const uid = () => Date.now() + Math.floor(Math.random() * 9999);

export const getLS = (k: string, f: any) => {
  try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; }
};

export const setLS = (k: string, v: any) => {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* noop */ }
};

export const faNum = (n: number) => Number(n || 0).toLocaleString('fa-IR');

export const fmtWhen = (x: any) => {
  try {
    const d = x?.created_at ? new Date(x.created_at) : null;
    if (d && !isNaN(+d)) return new Intl.DateTimeFormat('fa-IR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
  } catch { /* noop */ }
  return x?.date ? `${x.date}${x.time ? ' ' + x.time : ''}` : '—';
};

export const relTime = (t: number) => {
  try {
    if (!t) return '';
    const rtf = new Intl.RelativeTimeFormat('fa', { numeric: 'auto' });
    const m = Math.round((t - Date.now()) / 60000);
    if (Math.abs(m) < 60) return rtf.format(m, 'minute');
    const h = Math.round(m / 60);
    if (Math.abs(h) < 24) return rtf.format(h, 'hour');
    return rtf.format(Math.round(h / 24), 'day');
  } catch { return ''; }
};

export const statusTone = (s: string) =>
  (s === 'پرداخت‌شده' || s === 'تکمیل‌شده') ? 'ok'
    : s === 'ارسال‌شده' ? 'info'
      : s === 'لغو‌شده' ? 'err'
        : (s === 'جدید' || s === 'در انتظار پرداخت') ? 'warn'
          : 'mut';

/** زمان ثبت فرم (میلی‌ثانیه) برای مرتب‌سازی */
export const subTime = (x: any) => {
  if (x?.created_at) { const t = Date.parse(x.created_at); if (!isNaN(t)) return t; }
  return typeof x?.id === 'number' ? x.id : 0;
};

/** آیا این فرم نیاز به یادآور پیگیری دارد (بیش از ۳ روز بدون اقدام) */
export const needsReminder = (x: any) => {
  if (!x?.followReminder) return false;
  const fu = x.followUps || [];
  if (fu.some((f: any) => f !== null)) return false;
  if (x.category === 'پیگیری' || x.category === 'آخر ماه' || x.consultationStatus === 'پیگیری' || x.consultationStatus === 'پیگیری آخر ماه') return false;
  const t = subTime(x);
  return t > 0 && (Date.now() - t) > 3 * 24 * 60 * 60 * 1000;
};

/** بازه نرمال قد/وزن بر اساس جدول WHO */
export const normRange = (age: any, g: any) => {
  const t: any = {
    2: { m: [78, 85, 92, 9, 12, 15], f: [77, 84, 91, 9, 12, 14] },
    3: { m: [88, 95, 103, 11, 14, 18], f: [86, 94, 102, 11, 14, 17] },
    4: { m: [95, 103, 111, 12, 16, 21], f: [94, 102, 110, 12, 16, 20] },
    5: { m: [102, 110, 118, 13, 18, 23], f: [100, 108, 117, 13, 18, 23] },
    6: { m: [107, 116, 126, 15, 21, 27], f: [106, 115, 125, 14, 20, 26] },
    7: { m: [112, 122, 132, 16, 23, 30], f: [111, 122, 132, 15, 22, 30] },
    8: { m: [116, 127, 138, 16, 25, 35], f: [116, 127, 139, 15, 25, 35] },
    9: { m: [121, 133, 144, 17, 28, 39], f: [121, 133, 145, 16, 29, 41] },
    10: { m: [126, 138, 150, 19, 32, 45], f: [126, 139, 152, 18, 33, 47] },
    11: { m: [130, 144, 157, 20, 36, 51], f: [131, 145, 159, 20, 37, 54] },
    12: { m: [134, 149, 164, 22, 40, 58], f: [138, 152, 166, 23, 42, 60] },
    13: { m: [141, 156, 172, 24, 45, 66], f: [142, 155, 168, 26, 46, 66] },
    14: { m: [149, 163, 178, 28, 51, 73], f: [146, 158, 171, 29, 50, 71] },
    15: { m: [156, 169, 182, 34, 57, 80], f: [148, 160, 172, 32, 53, 73] },
    16: { m: [160, 173, 186, 39, 62, 84], f: [149, 161, 172, 33, 54, 75] },
    17: { m: [163, 175, 187, 43, 65, 87], f: [149, 161, 173, 34, 55, 76] },
  };
  const a = Math.min(17, Math.max(2, Math.round(+p2e(age) || 2)));
  const d = t[a]?.[g === 'male' ? 'm' : 'f'];
  return d ? { hMin: d[0], hMed: d[1], hMax: d[2], wMin: d[3], wMed: d[4], wMax: d[5] } : null;
};

/** افزودن یک رکورد به تاریخچه تغییرات */
export const logChange = (x: any, what: string) => [
  ...(x.changeHistory || []),
  { by: 'مدیر', at: new Date().toLocaleString('fa-IR'), what },
];

export const growthStatus = (val: number, min: number, med: number, max: number) => {
  const sd = (max - min) / 4;
  if (val >= min + sd && val <= max - sd) return { label: 'نرمال', tone: 'ok' as const };
  if (val >= min && val <= max) return { label: 'نزدیک به مرز', tone: 'warn' as const };
  const diff = val < min ? min - val : val - max;
  if (diff <= sd * 1.5) return { label: val < min ? 'زیر نرمال' : 'بالای نرمال', tone: 'warn' as const };
  return { label: val < min ? 'خیلی زیر نرمال' : 'خیلی بالای نرمال', tone: 'err' as const };
};
