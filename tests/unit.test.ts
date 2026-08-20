/**
 * Zeynalikid — Unit Tests (Read-only)
 * منطق phone / tracking / growth / validation / i18n / successMessages / درایورهای پرداخت
 * هیچ داده‌ای ذخیره یا درخواست نوشتنی انجام نمی‌شود.
 */

import { p2e, digits, fullPhone, validPhone, flagToEmoji, getCountryFlag } from '../src/utils/phone';
import {
  generateTrackingCode, extractTrackingNumber, isValidTrackingCode, isAnyValidTrackingCode,
  normalizeTrackingCode, isTrackingCodeUnique, generateUniqueTrackingCode,
} from '../src/utils/tracking';
import { growthStatusLabels } from '../src/utils/growth';
import { isRequired } from '../src/utils/validation';
import { courseSuccessMessages, formSuccessMessages, getRandomMessageTracked } from '../src/config/successMessages';
import fa from '../src/locales/fa';
import en from '../src/locales/en';
import { PaymentService, SUPPORTED_GATEWAYS } from '../src/services/payment/PaymentService';
import type { PaymentMetadata } from '../src/services/payment/drivers';
import { parseReferralRaw, findConsultantByCode, findTabByCode } from '../src/utils/referral';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(cond: boolean, name: string) {
  if (cond) { passed++; }
  else { failed++; failures.push(name); console.error(`  ✗ ${name}`); }
}

// ── phone ─────────────────────────────────────────────────────────
// p2e converts Persian/Arabic digits to English
assert(p2e('۰۹۱۲۳۴۵۶۷۸۹') === '09123456789', 'p2e فارسی→انگلیسی');
assert(p2e('٠٩١٢٣٤٥٦٧٨٩') === '09123456789', 'p2e عربی→انگلیسی');
assert(p2e('abc ۱۲۳') === 'abc 123', 'p2e با متن مخلوط');

// digits strips non-digits
assert(digits('+98 912 345 6789') === '989123456789', 'digits حذف غیررقمی');
assert(digits('۰۹۱۲') === '0912', 'digits فارسی');

// fullPhone for Iran
assert(fullPhone('+98', '09123456789') === '+989123456789', 'fullPhone ایران با 0');
assert(fullPhone('+98', '9123456789') === '+989123456789', 'fullPhone ایران بدون 0');
assert(fullPhone('+1', '5551234567') === '+15551234567', 'fullPhone آمریکا');

// validPhone — Iran
assert(validPhone('09123456789', { code: '+98' }) === true, 'validPhone ایران معتبر');
assert(validPhone('9123456789', { code: '+98' }) === true, 'validPhone ایران بدون 0 معتبر');
assert(validPhone('09125703684', { code: '+98' }) === true, 'validPhone شماره تست ادمین');
assert(validPhone('09111111111', { code: '+98' }) === false, 'validPhone تکراری جعلی رد شود');
assert(validPhone('09000000000', { code: '+98' }) === false, 'validPhone تکراری ۰۹۰ رد شود');
assert(validPhone('0912345678', { code: '+98' }) === false, 'validPhone ایران کم‌رقم');
assert(validPhone('091234567890', { code: '+98' }) === false, 'validPhone ایران زیادرقم');
assert(validPhone('', { code: '+98' }) === false, 'validPhone خالی');

// validPhone — generic (non-Iran)
assert(validPhone('5551234567', { code: '+1', regex: '^\\d{10}$' }) === true, 'validPhone آمریکا معتبر');
assert(validPhone('123', { code: '+1', regex: '^\\d{10}$' }) === false, 'validPhone آمریکا کم‌رقم');
assert(validPhone('11223344', { code: null }) === true, 'validPhone بدون کشور (7+ رقم)');

// flags
assert(flagToEmoji('IR') === '🇮🇷', 'flagToEmoji ایران');
assert(flagToEmoji('GB') === '🇬🇧', 'flagToEmoji بریتانیا');
assert(flagToEmoji('') === '🌍', 'flagToEmoji خالی');
assert(getCountryFlag({ flag: 'ir' }) === '🇮🇷', 'getCountryFlag از flag');
assert(getCountryFlag(null) === '🌍', 'getCountryFlag null');

// ── tracking ──────────────────────────────────────────────────────
const tk = generateTrackingCode();
assert(/^ZK\d{5}$/.test(tk), 'generateTrackingCode فرمت ZK+5');
assert(generateTrackingCode(4).length === 6, 'generateTrackingCode با 4 رقم');
assert(extractTrackingNumber('ZK12345') === '12345', 'extractTrackingNumber');
assert(extractTrackingNumber('zk-12345') === '12345', 'extractTrackingNumber مورد-ناست (lower)');
assert(isValidTrackingCode('ZK12345') === true, 'isValidTrackingCode معتبر');
assert(isValidTrackingCode('ZK1234') === false, 'isValidTrackingCode کم‌رقم');
assert(isValidTrackingCode('ZK123456') === false, 'isValidTrackingCode زیادرقم');
assert(isAnyValidTrackingCode('ZK1234567') === true, 'isAnyValidTrackingCode');
assert(isAnyValidTrackingCode('ZK-AB12CD') === true, 'isAnyValidTrackingCode هگز قدیمی');
assert(isAnyValidTrackingCode('XYZ123') === false, 'isAnyValidTrackingCode نامعتبر');
assert(normalizeTrackingCode('zk 12345') === 'ZK12345', 'normalizeTrackingCode استاندارد');
assert(normalizeTrackingCode('ZK-AB12CD') === 'ZK-AB12CD', 'normalizeTrackingCode هگز');
// ── ورودی مخفی ادمین «۶۳۹»: هیچ کد پیگیری تولیدی نباید با ۶۳۹ شروع شود ──
for (let i = 0; i < 2000; i++) {
  const c = generateTrackingCode(5);
  const body = extractTrackingNumber(c);
  assert(!body.startsWith('639'), 'کد پیگیری هرگز با 639 شروع نشود');
}
assert(!extractTrackingNumber(generateTrackingCode(3)).startsWith('639'), 'کد ۳رقمی هم با 639 شروع نشود');
assert(isTrackingCodeUnique('ZK99999', ['ZK11111']) === true, 'isTrackingCodeUnique یکتا');
assert(isTrackingCodeUnique('ZK11111', ['ZK11111']) === false, 'isTrackingCodeUnique تکراری');
const uniq = generateUniqueTrackingCode(['ZK11111', 'ZK22222']);
assert(/^ZK\d{5}$/.test(uniq), 'generateUniqueTrackingCode خروجی معتبر');

// ── growth ────────────────────────────────────────────────────────
assert(growthStatusLabels.length === 6, 'growthStatusLabels ۶ برچسب');
assert(growthStatusLabels[0] === 'نرمال', 'growthStatusLabels[0]');
assert(growthStatusLabels.includes('خیلی زیر نرمال'), 'growthStatusLabels شامل خیلی زیر نرمال');

// ── validation ────────────────────────────────────────────────────
assert(isRequired('  x ') === true, 'isRequired مقدار');
assert(isRequired('') === false, 'isRequired خالی');
assert(isRequired('   ') === false, 'isRequired فاصله');

// ── successMessages ───────────────────────────────────────────────
assert(courseSuccessMessages.length > 0, 'courseSuccessMessages غیرخالی');
assert(formSuccessMessages.length > 0, 'formSuccessMessages غیرخالی');
assert(courseSuccessMessages.every(m => typeof m === 'string' && m.trim().length > 0), 'courseSuccessMessages همه رشته غیرخالی');
const r1 = getRandomMessageTracked(formSuccessMessages, []);
const r2 = getRandomMessageTracked(formSuccessMessages, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
assert(typeof r1.message === 'string' && r1.message.length > 0, 'getRandomMessageTracked پیام');
assert(r1.newUsedIndices.length === 1, 'getRandomMessageTracked ایندکس جدید');
// when all used, it resets
const r3 = getRandomMessageTracked(formSuccessMessages, formSuccessMessages.map((_, i) => i));
assert(r3.newUsedIndices.length === 1, 'getRandomMessageTracked ریست بعد از همه');

// ── i18n ──────────────────────────────────────────────────────────
assert(fa && typeof fa === 'object' && Object.keys(fa).length > 10, 'fa export غیرخالی');
assert(en && typeof en === 'object' && Object.keys(en).length > 10, 'en export غیرخالی');
const shared = ['heroTitle', 'heroDesc', 'noticeText', 'submitBtnText', 'successMsg', 'menuHome', 'menuCourses', 'menuAbout', 'adminLogin', 'trackingCode', 'paymentInfo', 'shippingInfo'];
for (const k of shared) {
  assert(typeof (fa as any)[k] === 'string' && (fa as any)[k].length > 0, `fa کلید ${k}`);
  assert(typeof (en as any)[k] === 'string' && (en as any)[k].length > 0, `en کلید ${k}`);
}
// all en translation-map values (persian-keyed entries) are non-empty
for (const [k, v] of Object.entries(en)) {
  assert(typeof v === 'string' && v.length > 0, `en ترجمه برای کلید ${k}`);
}

// ── Payment drivers (all 7 via PaymentService) ────────────────────
const allGateways = SUPPORTED_GATEWAYS.map(id => ({
  id,
  label: id,
  enabled: true,
  config: {
    merchantId: 'merch-1', sandbox: true,
    apiKey: 'key-1',
    clientId: 'cid', clientSecret: 'csec',
    merchantCode: 'mc', terminalCode: 'tc',
    secretKey: 'sk', publishableKey: 'pk',
    wallets: [{ currency: 'USDT', address: 'T123456789', network: 'TRC20' }],
  },
}));
const service = new PaymentService({ gateways: allGateways, defaultCurrency: 'IRR', callbackUrl: 'https://zeynalikid.vercel.app/callback' });
const enabled = service.getEnabledDrivers();
assert(enabled.length === SUPPORTED_GATEWAYS.length, 'همه ۷ درگاه فعال ثبت شدند');
for (const id of SUPPORTED_GATEWAYS) {
  const info = enabled.find(d => d.id === id);
  assert(!!info, `درگاه ${id} در list فعال حاضر است`);
  assert(typeof info!.driver.createPayment === 'function', `درایور ${id} createPayment دارد`);
  assert(typeof info!.driver.verifyPayment === 'function', `درایور ${id} verifyPayment دارد`);
}
assert(service.getCurrency() === 'IRR', 'getCurrency پیش‌فرض');
assert(service.getActiveGateway() === 'blubank', 'getActiveGateway اولین درگاه');

// Crypto createPayment — no network needed
{
  const res = await service.createPaymentForGateway('crypto', 100, { orderId: 'O1' } as PaymentMetadata);
  assert(res.gateway === 'crypto', 'crypto createPayment gateway');
  assert(typeof res.transactionId === 'string' && res.transactionId.startsWith('crypto_'), 'crypto transactionId');
}

// unknown/disabled gateway throws
{
  const s2 = new PaymentService({ gateways: allGateways.filter(g => g.id !== 'zarinpal'), defaultCurrency: 'IRR' });
  let threw = false;
  try { await s2.createPaymentForGateway('zarinpal', 100, {} as PaymentMetadata); } catch { threw = true; }
  assert(threw, 'درگاه غیرفعال خطا می‌دهد');
}

// ── referral: parseReferralRaw (بازیابی بعد از رفرش) ─────────────────────
{
  const consultants = [
    { id: 'c1', name: 'آرمین زینالی', referralCode: 'az' },
    { id: 'c2', name: 'مشاور دیگر', referralCode: 'mhi' },
  ];
  const tabs = [
    { id: 'height', title: 'رشد قد', shortCode: 'h' },
    { id: 'mind', title: 'هوش و ذهن', shortCode: 'm' },
  ];
  assert(JSON.stringify(parseReferralRaw('mhi', consultants, tabs)) === JSON.stringify({ code: 'mhi', raw: 'mhi' }), 'parseReferralRaw کد پایه');
  assert(JSON.stringify(parseReferralRaw('mhih', consultants, tabs)) === JSON.stringify({ code: 'mhi', raw: 'mhih', tabCode: 'h' }), 'parseReferralRaw کد + تب');
  assert(JSON.stringify(parseReferralRaw('mhih2', consultants, tabs)) === JSON.stringify({ code: 'mhi', raw: 'mhih2', tabCode: 'h', courseIndex: 2 }), 'parseReferralRaw کد + تب + دوره');
  assert(parseReferralRaw('mhi', consultants, [])!.code === 'mhi', 'parseReferralRaw بدون تب (فقط کد)');
  assert(parseReferralRaw('xx', consultants, tabs) === null, 'parseReferralRaw کد ناشناخته → null');
  assert(parseReferralRaw('', consultants, tabs) === null, 'parseReferralRaw خالی → null');
  // طولانی‌ترین کد برنده باشد (مشاور جدید اضافه شده با کد طولانی‌تر، هماهنگ با پنل)
  const withNew = [
    { id: 'c1', name: 'آرمین زینالی', referralCode: 'az' },
    { id: 'c2', name: 'مشاور جدید', referralCode: 'az2' },
  ];
  assert(parseReferralRaw('az2h', withNew, tabs)!.code === 'az2', 'parseReferralRaw طولانی‌ترین کد برنده (مشاور جدید)');
  assert(findConsultantByCode(withNew, 'az2')?.id === 'c2', 'findConsultantByCode کد مشاور جدید');
  assert(findTabByCode(tabs, 'h')?.id === 'height', 'findTabByCode مخفف سفارشی');
  assert(findTabByCode(tabs, 'mind')?.id === 'mind', 'findTabByCode با id');
}

console.log(`\n═══════════════════════════════════`);
console.log(`✅ موفق: ${passed}   ❌ ناموفق: ${failed}`);
if (failed > 0) {
  console.log('ناموفق‌ها:', failures);
}
console.log(`═══════════════════════════════════`);
if (failed > 0) process.exit(1);
process.exit(0);
