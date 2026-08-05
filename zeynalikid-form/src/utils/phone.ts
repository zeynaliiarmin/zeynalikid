export const p2e = (value: unknown) =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(d)));

export const digits = (value: unknown) => p2e(value).replace(/[^0-9]/g, '');

export const fullPhone = (cc: string, local: string): string => {
  const cleaned = p2e(local).replace(/[\s\-().]/g, '');
  // اگر کد کشور ایران (+98) است و شماره با 0 شروع می‌شود، 0 را حذف کن
  if (cc === '+98' && cleaned.startsWith('0')) {
    return `+98${cleaned.slice(1)}`;
  }
  // اگر کد کشور ایران است و شماره با 9 شروع می‌شود، مستقیماً +98 را اضافه کن
  if (cc === '+98' && cleaned.startsWith('9')) {
    return `+98${cleaned}`;
  }
  return `${cc}${cleaned}`;
};

export const validPhone = (local: string, country: { code?: string; regex?: string } | null | undefined): boolean => {
  const clean = p2e(local).replace(/[\s\-()]/g, '');
  if (!clean || /^(\d)\1+$/.test(clean)) return false;
  // ایران: هر دو فرمت 09XXXXXXXXX و 9XXXXXXXXX معتبر است
  if (country?.code === '+98') return /^(0?9)\d{9}$/.test(clean);
  try {
    return new RegExp(country?.regex || '^\\d{7,}$').test(clean);
  } catch {
    return /^\d{7,}$/.test(clean);
  }
};
