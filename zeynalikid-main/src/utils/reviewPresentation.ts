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
  const local = localExamples[countryCode] || '12345678901';
  let digits = reviewDigits(local);
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
