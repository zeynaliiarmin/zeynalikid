export const p2e = (value: unknown) =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const digits = (value: unknown) => p2e(value).replace(/[^0-9]/g, '');

export const fullPhone = (cc: string, local: string): string => {
  // فقط رقم نگه می‌داریم (علامت + و فاصله و خط تیره حذف می‌شوند)
  let cleaned = p2e(local).replace(/[^0-9]/g, '');
  const ccDigits = String(cc || '').replace(/\D/g, '');
  // اگر والدین کد کشور را هم داخل فیلد شماره تایپ کرده باشند (98…، 0098…، +98…) یک‌بار حذف می‌شود
  if (ccDigits) {
    if (cleaned.startsWith(`00${ccDigits}`)) cleaned = cleaned.slice(2 + ccDigits.length);
    else if (cleaned.startsWith(`0${ccDigits}`) && cleaned.length >= ccDigits.length + 9) cleaned = cleaned.slice(1 + ccDigits.length);
    else if (ccDigits.length >= 2 && cleaned.startsWith(ccDigits) && cleaned.length >= ccDigits.length + 9) cleaned = cleaned.slice(ccDigits.length);
  }
  // اگر کد کشور ایران است و پیش‌شماره داخلی 0 دارد، آن 0 حذف می‌شود
  if (cleaned.startsWith('0') && cleaned.length >= 9) cleaned = cleaned.slice(1);
  return `${cc}${cleaned}`;
};

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
