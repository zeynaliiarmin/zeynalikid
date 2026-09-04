import { getCountryFlag, p2e } from './phone';

export type ReviewCountry = {
  id?: string;
  name?: string;
  nameEn?: string;
  code?: string;
  flag?: string;
  regex?: string;
};

const localExamples: Record<string, string> = {
  '+98': '09193123469',
  '+1': '2125550123',
  '+44': '07700900000',
  '+49': '0301234567',
  '+46': '0701234567',
  '+41': '0791234567',
  '+47': '41234567',
  '+33': '0612345678',
  '+61': '0412345678',
  '+971': '0501234567',
  '+90': '05321234567',
  '+31': '0612345678',
  '+91': '9876543210',
  '+93': '0701234567',
};

// پیش‌شماره‌های واقعی و معتبر هر کشور + طول کل شماره محلی (بدون کد کشور)
// این‌ها فقط برای ساخت شماره ماسک‌شده رندوم استفاده می‌شوند.
const localPhoneSpecs: Record<string, { prefixes: string[]; length: number }> = {
  '+98': { prefixes: ['0910','0911','0912','0913','0914','0915','0916','0917','0918','0919','0920','0921','0922','0930','0931','0932','0933','0934','0935','0936','0937','0938','0939','0900','0901','0902','0903','0905','0990','0991','0992','0993'], length: 11 },
  '+1': { prefixes: ['212','310','415','646','650','718','732','818','929'], length: 10 },
  '+44': { prefixes: ['7700','7400','7500','7701'], length: 11 },
  '+49': { prefixes: ['0151','0160','0170','0171','0157'], length: 11 },
  '+46': { prefixes: ['070','073','076'], length: 10 },
  '+41': { prefixes: ['076','077','078','079'], length: 10 },
  '+47': { prefixes: ['400','410','450','900','920','950','970','980','990'], length: 8 },
  '+33': { prefixes: ['06','07'], length: 10 },
  '+61': { prefixes: ['0400','0401','0402','0403','0404','0405','0406','0407','0408','0409','0410','0411'], length: 10 },
  '+971': { prefixes: ['050','052','054','055','056','058'], length: 10 },
  '+90': { prefixes: ['0500','0501','0502','0503','0504','0505','0530','0531','0532','0533','0534','0535','0536','0537','0538','0539','0541','0542'], length: 11 },
  '+31': { prefixes: ['06'], length: 10 },
  '+91': { prefixes: ['98','99','96','70','80','81','82','83','84','85','86','87','88','89'], length: 10 },
  '+93': { prefixes: ['070','079','078','077'], length: 10 },
};

// طول کل شماره نمایشی (با احتساب کد کشور در صورت وجود) برای ساخت ماسک
function localLength(countryCode: string, localLengthVal: number): number {
  const dial = reviewDigits(countryCode);
  return countryCode === '+98' ? localLengthVal : dial.length + localLengthVal;
}

export const reviewDigits = (value: unknown) => p2e(value).replace(/[^0-9]/g, '');

export function reviewCountryByCode(countries: ReviewCountry[] = [], code?: string): ReviewCountry | undefined {
  return countries.find((country) => String(country.code || '') === String(code || ''));
}

export function detectReviewCountryCode(value: unknown, countries: ReviewCountry[] = []): string {
  const raw = p2e(value).trim();
  const number = raw.startsWith('00') ? `+${raw.slice(2)}` : raw;
  const dialCodes = countries
    .map((country) => String(country.code || ''))
    .filter((code) => /^\+\d+$/.test(code))
    .sort((a, b) => b.length - a.length);
  if (number.startsWith('+')) {
    return dialCodes.find((code) => number.startsWith(code)) || '+';
  }
  const digits = reviewDigits(number);
  if (/^0?9\d{9}$/.test(digits)) return '+98';
  const explicit = dialCodes.find((code) => digits.startsWith(code.slice(1)));
  return explicit || '+98';
}

export function normalizeReviewPhone(value: unknown, countryCode?: string): string {
  const raw = p2e(value).trim();
  if (/x/i.test(raw)) return raw.toLowerCase().replace(/[^0-9x]/g, '');
  let digits = reviewDigits(raw);
  const code = countryCode || detectReviewCountryCode(raw);
  if (code === '+98') {
    if (digits.startsWith('0098')) digits = digits.slice(4);
    else if (digits.startsWith('98') && digits.length >= 12) digits = digits.slice(2);
    if (digits.startsWith('0')) digits = digits.slice(1);
    return `+98${digits}`;
  }
  if (raw.startsWith('00')) return `+${digits.slice(2)}`;
  if (raw.startsWith('+')) return `+${digits}`;
  const dial = String(code || '').replace(/\D/g, '');
  if (dial && !digits.startsWith(dial)) digits = `${dial}${digits.replace(/^0/, '')}`;
  return digits ? `+${digits}` : '';
}

export function isValidReviewPhone(value: unknown, countryCode?: string): boolean {
  const raw = p2e(value).trim();
  if (/^\d{5}x{4}\d{2}$/i.test(raw.replace(/[^0-9x]/gi, ''))) return true;
  const normalized = normalizeReviewPhone(raw, countryCode);
  const digits = reviewDigits(normalized);
  if (countryCode === '+98' || normalized.startsWith('+98')) return /^989\d{9}$/.test(digits);
  return /^\d{8,15}$/.test(digits) && !/^(\d)\1+$/.test(digits);
}

/** Public representation: exactly five visible leading digits, four x characters, and two trailing digits. */
export function maskReviewPhone(value: unknown, countryCode?: string): string {
  const raw = p2e(value).trim().toLowerCase();
  const alreadyMasked = raw.replace(/[^0-9x]/g, '');
  if (/^\d{5}x{4}\d{2}$/.test(alreadyMasked)) return alreadyMasked;
  let digits = reviewDigits(raw);
  const code = countryCode || detectReviewCountryCode(raw);
  if (code === '+98') {
    if (digits.startsWith('0098')) digits = digits.slice(4);
    else if (digits.startsWith('98')) digits = digits.slice(2);
    if (!digits.startsWith('0')) digits = `0${digits}`;
  }
  if (digits.length < 7) return '';
  return `${digits.slice(0, 5)}xxxx${digits.slice(-2)}`;
}

export function reviewCountryFlag(countryCode: string | undefined, countries: ReviewCountry[] = []): string {
  const country = reviewCountryByCode(countries, countryCode);
  return getCountryFlag(country || countryCode || 'other');
}

export function manualMaskedPhoneTemplate(countryCode: string): string {
  const spec = localPhoneSpecs[countryCode];
  if (spec) {
    const prefix = spec.prefixes[Math.floor(Math.random() * spec.prefixes.length)];
    const total = localLength(countryCode, spec.length);
    // رقم‌های بعد از پیش‌شماره تا طول کل را رندوم می‌سازیم
    const fill = Array.from({ length: total - prefix.length }, () => String(Math.floor(Math.random() * 10))).join('');
    const digits = `${prefix}${fill}`;
    return `${digits.slice(0, 5)}xxxx${digits.slice(-2)}`;
  }
  // fallback: الگوی قدیمی با حفظ پیش‌شماره مثال
  const local = localExamples[countryCode] || '12345678901';
  let digits = reviewDigits(local);
  const prefixLen = Math.min(4, digits.length);
  const prefix = digits.slice(0, prefixLen);
  const fill = Array.from({ length: digits.length - prefixLen }, () => String(Math.floor(Math.random() * 10))).join('');
  digits = `${prefix}${fill}`;
  if (countryCode !== '+98') {
    const dial = reviewDigits(countryCode);
    digits = `${dial}${digits.replace(/^0/, '')}`;
  }
  return `${digits.slice(0, 5)}xxxx${digits.slice(-2)}`;
}

export function sanitizeManualMaskedPhone(value: unknown): string {
  const clean = p2e(value).toLowerCase().replace(/[^0-9x]/g, '');
  if (/^\d{5}x{4}\d{0,2}$/.test(clean)) return clean;
  const digits = reviewDigits(clean);
  if (digits.length >= 7) return `${digits.slice(0, 5)}xxxx${digits.slice(-2)}`;
  return clean.slice(0, 11);
}

function persianParts(date: Date, timeZone = 'UTC'): { year: number; month: number; day: number } {
  const parts = new Intl.DateTimeFormat('en-US-u-ca-persian', {
    timeZone, year: 'numeric', month: 'numeric', day: 'numeric',
  }).formatToParts(date);
  const get = (type: string) => Number(parts.find((part) => part.type === type)?.value || 0);
  return { year: get('year'), month: get('month'), day: get('day') };
}

export function formatPersianReviewDate(value?: string | Date, persianDigits = true): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  const { year, month, day } = persianParts(date, 'Asia/Tehran');
  const ascii = `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
  return persianDigits ? ascii.replace(/\d/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'[Number(digit)]) : ascii;
}

export function todayPersianReviewDate(): string {
  const { year, month, day } = persianParts(new Date(), 'Asia/Tehran');
  return `${year}/${String(month).padStart(2, '0')}/${String(day).padStart(2, '0')}`;
}

export function persianReviewDateToIso(value: unknown): string | null {
  const normalized = p2e(value).replace(/[-.]/g, '/').trim();
  const match = normalized.match(/^(\d{4})\/(\d{1,2})\/(\d{1,2})$/);
  if (!match) return null;
  const target = { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
  if (target.month < 1 || target.month > 12 || target.day < 1 || target.day > 31) return null;
  const start = Date.UTC(target.year + 621, 1, 1, 12);
  for (let offset = 0; offset < 500; offset += 1) {
    const date = new Date(start + offset * 86_400_000);
    const parts = persianParts(date);
    if (parts.year === target.year && parts.month === target.month && parts.day === target.day) return date.toISOString();
  }
  return null;
}
