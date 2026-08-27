/**
 * Zeynalikid — Unit Tests (Read-only)
 * منطق phone / tracking / growth / validation / i18n / successMessages / درایورهای پرداخت
 * هیچ داده‌ای ذخیره یا درخواست نوشتنی انجام نمی‌شود.
 */

import { p2e, digits, fullPhone, validPhone, flagToEmoji, getCountryFlag } from '../src/utils/phone';
import {
  generateTrackingCode, extractTrackingNumber, isValidTrackingCode, isAnyValidTrackingCode,
  normalizeTrackingCode,isTrackingCodeUnique,generateUniqueTrackingCode,generateSecureTrackingCode,
} from '../src/utils/tracking';
import { growthStatusLabels } from '../src/utils/growth';
import { isRequired } from '../src/utils/validation';
import { courseSuccessMessages, formSuccessMessages, getRandomMessageTracked } from '../src/config/successMessages';
import fa from '../src/locales/fa';
import en from '../src/locales/en';
import { PaymentService,SUPPORTED_GATEWAYS,isGatewayProductionReady } from '../src/services/payment/PaymentService';
import type { PaymentMetadata } from '../src/services/payment/drivers';
import { parseReferralRaw, findConsultantByCode, findTabByCode } from '../src/utils/referral';
import { paymentShareText, resolvePaymentLaunchInfo } from '../src/utils/paymentLauncher';
import { findAssistantRule, matchAssistantKnowledge, normalizeAssistantText, scoreAssistantKnowledge, type AssistantKnowledge } from '../src/utils/assistantMatch';

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
const uniq=generateUniqueTrackingCode(['ZK11111','ZK22222']);
assert(/^ZK\d{5}$/.test(uniq),'generateUniqueTrackingCode خروجی قدیمی معتبر');
const secureCodes=new Set(Array.from({length:200},()=>generateSecureTrackingCode()));
assert(secureCodes.size===200,'کدهای امن نمونه تکراری ندارند');
assert([...secureCodes].every(code=>/^ZK-[1-9][a-z0-9]{6,8}$/.test(code)),'کد امن ۷ تا ۹ کاراکتر، عدد اول و حروف کوچک دارد');
assert(isAnyValidTrackingCode([...secureCodes][0].toUpperCase())===true,'اعتبارسنجی کد امن به بزرگی حروف حساس نیست');
const fmSecure=generateSecureTrackingCode([],'FM',8);
assert(/^FM-[1-9][a-z0-9]{7}$/.test(fmSecure),'پیشوند FM و طول هشت‌کاراکتری');
assert(normalizeTrackingCode('fm-3AbC9xY','FM')==='FM-3abc9xy','نرمال‌سازی FM بدون حساسیت حروف');

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

// ── Payment drivers: unfinished gateways fail closed ─────────────
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
const enabled=service.getEnabledDrivers();
const readyIds=SUPPORTED_GATEWAYS.filter(isGatewayProductionReady);
assert(enabled.length===readyIds.length,'فقط درگاه‌های غیرنمایشی فعال می‌شوند');
for(const id of readyIds){const info=enabled.find(d=>d.id===id);assert(!!info,`درگاه ${id} در فهرست فعال حاضر است`);assert(typeof info!.driver.createPayment==='function',`درایور ${id} createPayment دارد`);assert(typeof info!.driver.verifyPayment==='function',`درایور ${id} verifyPayment دارد`)}
for(const id of SUPPORTED_GATEWAYS.filter(id=>!isGatewayProductionReady(id)))assert(!enabled.some(d=>d.id===id),`درگاه نمایشی ${id} در پرداخت عمومی غیرفعال است`);
assert(service.getCurrency()==='IRR','getCurrency پیش‌فرض');
assert(service.getActiveGateway()===readyIds[0],'getActiveGateway اولین درگاه آماده');

// Crypto createPayment — no network needed
{
  const res = await service.createPaymentForGateway('crypto', 100, { orderId: 'O1' } as PaymentMetadata);
  assert(res.gateway === 'crypto', 'crypto createPayment gateway');
  assert(typeof res.transactionId === 'string' && res.transactionId.startsWith('crypto_'), 'crypto transactionId');
}

// placeholder gateways can never return a fake success URL
for(const id of ['blubank','stripe','paypal']){let threw=false;try{await service.createPaymentForGateway(id,100,{} as PaymentMetadata)}catch{threw=true}assert(threw,`درگاه نمایشی ${id} با خطا متوقف می‌شود`)}

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
    { id: 'height', title: 'رشد قد', shortCode: 'h', courses: [{id:'h1',active:true},{id:'h2',active:true}] },
    { id: 'mind', title: 'هوش و ذهن', shortCode: 'm', courses: [{id:'m1',active:true},{id:'m2',active:true}] },
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


// ── experimental payment app launcher clipboard rules ─────────────
{
  const copiedCrypto={kind:'crypto' as const,value:'wallet-123',label:'آدرس کیف پول'};
  const keepCrypto=resolvePaymentLaunchInfo(copiedCrypto,'6037990012345678','بانک اول');
  assert(keepCrypto.info===copiedCrypto&&!keepCrypto.shouldCopyDefault,'لانچر اطلاعات رمزارز کپی‌شده را با کارت پیش‌فرض جایگزین نمی‌کند');
  const copiedIban={kind:'iban' as const,value:'IR123',label:'شماره شبا'};
  const keepIban=resolvePaymentLaunchInfo(copiedIban,'6037990012345678','بانک اول');
  assert(keepIban.info===copiedIban&&!keepIban.shouldCopyDefault,'لانچر شبای کپی‌شده را با کارت پیش‌فرض جایگزین نمی‌کند');
  const useDefault=resolvePaymentLaunchInfo(null,'6037990012345678','بانک اول');
  assert(useDefault.shouldCopyDefault&&useDefault.info?.value==='6037990012345678','لانچر فقط در نبود اطلاعات قبلی کارت اول را انتخاب می‌کند');
  assert(paymentShareText(copiedCrypto,'fa')==='wallet-123','اشتراک‌گذاری فقط مقدار خام اطلاعات پرداخت را ارسال می‌کند');
}


// ── free knowledge assistant matching ─────────────────────────────
{
 const knowledge:AssistantKnowledge[]=[
  {id:'1',question:'چطور درخواست مشاوره ثبت کنم؟',answer:'از فرم مشاوره استفاده کنید.',aliases:['مشاوره میخوام'],keywords:['فرم','مشاوره'],category:'راهنما',priority:10},
  {id:'2',question:'چطور دوره‌ها را ببینم؟',answer:'به صفحه دوره‌ها بروید.',aliases:['لیست دوره ها'],keywords:['دوره','ثبت نام'],category:'دوره',priority:5},
 ];
 assert(normalizeAssistantText('كودکِ ۱۲ ساله')==='کودک 12 ساله','نرمال‌سازی فارسی دستیار');
 assert(scoreAssistantKnowledge('مشاوره میخوام',knowledge[0])>=1,'تطبیق عبارت مشابه دستیار');
 assert(matchAssistantKnowledge('چطور مشاوره ثبت کنم',knowledge,1)[0]?.item.id==='1','تطبیق سؤال فارسی نزدیک');
 assert(matchAssistantKnowledge('لیست دوره‌ها',knowledge,1)[0]?.item.id==='2','تحمل نیم‌فاصله و نشانه در دستیار');
 assert(matchAssistantKnowledge('آب و هوای مریخ',knowledge).length===0,'دستیار برای سؤال نامرتبط پاسخ نمی‌سازد');
 const rules:AssistantKnowledge[]=[
  {id:'r1',question:'قیمت مشاوره',answer:'برای قیمت وارد فرم شوید.',aliases:['مشاوره چنده'],keywords:[],category:'قیمت',response_mode:'exact',match_mode:'contains',priority:50},
  {id:'r2',question:'پیش بینی هوا',answer:'من درباره این موضوع اطلاعاتی ندارم.',aliases:['هوا چطوره'],keywords:[],category:'خارج از حوزه',response_mode:'refusal',match_mode:'exact',priority:50},
 ];
 assert(findAssistantRule('لطفاً بگو مشاوره چنده',rules)?.item.id==='r1','قانون شامل عبارت، پاسخ ثابت را پیدا می‌کند');
 assert(findAssistantRule('قیمت',rules)===null,'قانون contains فقط وقتی اجرا می‌شود که عبارت کامل داخل سؤال کاربر باشد');
 assert(findAssistantRule('هوا چطوره',rules)?.item.id==='r2','قانون عدم اطلاع با جمله دقیق پیدا می‌شود');
 assert(findAssistantRule('هوا فردا چطوره',rules)===null,'قانون exact روی جمله متفاوت اجرا نمی‌شود');
}

console.log(`\n═══════════════════════════════════`);
console.log(`✅ موفق: ${passed}   ❌ ناموفق: ${failed}`);
if (failed > 0) {
  console.log('ناموفق‌ها:', failures);
}
console.log(`═══════════════════════════════════`);
if (failed > 0) process.exit(1);
process.exit(0);
