// کد پیگیری: پیشوندِ هر سایت + N رقم (پیش‌فرض ۵ رقم — قابل تنظیم از پنل مدیریت با trackingDigitCount)
// پیشوند از src/config/project.ts (TRACKING_PREFIX) خوانده می‌شود: «فرزند من» FM و «زینالیکید» ZK.
// کدهای قدیمی با پیشوند دیگر (ZK-XXXXXX هگز، ZK1234 چهاررقمی و…) همچنان برای جستجو معتبرند.

/**
 * تولید کد پیگیری با تعداد ارقام مشخص
 * @param digitCount - تعداد ارقام (پیش‌فرض: ۵)
 * @returns کد پیگیری با فرمت ZK[عدد]
 */
// یادداشت: «۶۳۹» دیگر در فیلد کد پیگیری معنایی ندارد؛ درِ مخفی پنل مدیریت
// به فیلد شمارهٔ تماس منتقل شده است، پس کدها می‌توانند با هر رقمی شروع شوند.
import { TRACKING_PREFIX } from '../config/project';

export const generateTrackingCode = (digitCount: number = 5, prefix: string = TRACKING_PREFIX): string => {
  const min = Math.pow(10, digitCount - 1);
  const max = Math.pow(10, digitCount) - 1;
  const num = String(Math.floor(min + Math.random() * (max - min + 1)));
  return `${String(prefix || TRACKING_PREFIX)}${num}`;
};

const SECURE_ALPHABET='abcdefghijklmnopqrstuvwxyz0123456789';
export const generateSecureTrackingCode=(existingCodes:string[]=[],prefix=TRACKING_PREFIX,requestedLength?:number):string=>{
  const seen=new Set(existingCodes.map(code=>String(code).toLowerCase()));
  for(let attempt=0;attempt<20;attempt++){
    const length=requestedLength==null?7+crypto.getRandomValues(new Uint8Array(1))[0]%3:Math.max(7,Math.min(9,requestedLength));
    const bytes=crypto.getRandomValues(new Uint8Array(length));
    const first=String(1+(bytes[0]%9));
    const body=first+Array.from(bytes.slice(1),b=>SECURE_ALPHABET[b%SECURE_ALPHABET.length]).join('');
    const code=`${String(prefix||TRACKING_PREFIX).toUpperCase()}-${body}`;
    if(!seen.has(code.toLowerCase()))return code;
  }
  throw new Error('Could not generate a unique tracking code');
};

/** استخراج بخش عددی/بدنه از کد پیگیری */
export const extractTrackingNumber = (code: string): string => {
  return String(code||'').replace(/^(ZK|FM)-?/i,'');
};

/** اعتبارسنجی کد پیگیری با تعداد ارقام مشخص */
export const isValidTrackingCode = (code: string, digitCount: number = 5): boolean => {
  const num = extractTrackingNumber(code);
  if (!num) return false;
  if (num.length !== digitCount) return false;
  return /^\d+$/.test(num);
};

/** اعتبارسنجی همه فرمت‌های پشتیبانی‌شده: ZK + ۴ تا ۸ رقم یا فرمت قدیمی ZK-XXXXXX */
export const isAnyValidTrackingCode=(code:string):boolean=>/^(ZK|FM)\d{4,8}$/i.test(code)||/^(ZK|FM)-[A-F0-9]{6}$/i.test(code)||/^(ZK|FM)-[0-9][a-z0-9]{6,8}$/i.test(code)||/^(ZK|FM)-[A-Z0-9]{12,20}$/i.test(code);

/** نرمال‌سازی بدون حساسیت به کوچکی/بزرگی حروف. */
export const normalizeTrackingCode=(input:string,preferredPrefix=TRACKING_PREFIX):string=>{
  const raw=String(input||'').trim().replace(/\s+/g,'');
  const match=raw.match(/^(ZK|FM)-?(.*)$/i);
  const prefix=(match?.[1]||preferredPrefix||TRACKING_PREFIX).toUpperCase();
  const body=String(match?.[2]??raw).replace(/[^a-z0-9]/gi,'');
  if(/^\d{4,8}$/.test(body))return `${prefix}${body}`;
  if(/^[A-F0-9]{6}$/i.test(body))return `${prefix}-${body.toUpperCase()}`;
  if(/^[0-9][a-z0-9]{6,8}$/i.test(body))return `${prefix}-${body.toLowerCase()}`;
  if(/^[a-z0-9]{12,20}$/i.test(body))return `${prefix}-${body.toLowerCase()}`;
  return `${prefix}-${body.toLowerCase()}`;
};

/** بررسی یکتایی کد پیگیری در لیست کدهای موجود */
export const isTrackingCodeUnique = (code: string, existingCodes: string[]): boolean => {
  return !existingCodes.includes(code);
};

/** تولید کد پیگیری یکتا با تعداد ارقام مشخص */
export const generateUniqueTrackingCode = (existingCodes: string[], digitCount: number = 5): string => {
  let attempts = 0;
  const maxAttempts = 100;
  let code = '';
  do {
    code = generateTrackingCode(digitCount);
    attempts++;
  } while (!isTrackingCodeUnique(code, existingCodes) && attempts < maxAttempts);
  return code;
};
