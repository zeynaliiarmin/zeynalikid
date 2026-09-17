// قراردادهای «یک کد پیگیری برای هر شماره» و «ثبت فرم = ورود خودکار نیست».
// این دو قانونِ مالک با این فایل قفل می‌شوند تا هیچ تغییر آینده‌ای آن‌ها را نشکند.
import { readFile } from 'node:fs/promises';
const read = (path) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');
const [createFn, trackingShared, consultPage, normalizePath, phoneShared, phoneClient, migration, phoneTest] = await Promise.all([
  read('supabase/functions/create-submission/index.ts'),
  read('supabase/functions/_shared/trackingCode.ts'),
  read('src/pages/ConsultationPage.tsx'),
  read('src/utils/userPortal.ts'),
  read('supabase/functions/_shared/phone.ts'),
  read('src/utils/phone.ts'),
  read('supabase/migrations/20260912130000_one_tracking_code_per_phone.sql'),
  read('tests/phone-normalization.test.ts'),
]);
const failures = [];
const need = (source, text, message) => { if (!source.includes(text)) failures.push(message); };
const forbid = (source, pattern, message) => { if (pattern.test(source)) failures.push(message); };

// ─── ۱) کد پیگیری: یک کد برای هر شماره، منبع حقیقت دیتابیس ───
need(createFn, 'getOrCreateTrackingCode(supabase,fullPhone,prefix)', 'submission does not resolve the official tracking code of that phone number');
need(trackingShared, '"phone_tracking_codes"', 'the phone → code mapping table is no longer the source of truth');
need(migration, 'full_phone     text primary key', 'the mapping table does not guarantee one code per phone');
need(migration, 'constraint phone_tracking_codes_code_unique unique (tracking_code)', 'the mapping table does not guarantee one code per owner');
// سقوط مهربان: اگر جدول نگاشت نباشد (مهاجرت اعمال نشده)، کدِ قدیمی از سوابق ارث‌بری می‌شود
need(trackingShared, 'adopted', 'there is no inheritance fallback when the mapping table is missing');

// ─── ۲) ملاکِ تشخیص کاربر = شمارهٔ تماس (نرمال‌شده) ───
need(createFn, 'normalizeFullPhone', 'submissions are not normalized to a single phone format');
need(createFn, 'payload.trackingCode=code', 'the resolved code is not written into the submission payload');

// ─── ۳) ثبت فرم هرگز نشستِ ورود پنل کاربر نمی‌سازد ───
forbid(createFn, /setUserSession|createUserSession|saveUserSession/, 'submitting a form must never create a user session');
forbid(consultPage, /setUserSession\(/, 'the consultation page must never sign the user in after submitting');
need(consultPage, 'ثبت فرم هرگز نشست ورود پنل کاربر نمی‌سازد', 'the no-auto-login rule is not documented where the form is submitted');

// ─── ۴) شمارهٔ تماس در همهٔ قالب‌ها یکسان نرمال می‌شود ───
// همهٔ قالب‌های یک شماره باید به یک مقدار برسند (پوشش واقعی در تست واحد)
for (const variant of ['09198305774', '9198305774', '989198305774', '+989198305774']) {
  if (!phoneTest.includes(variant) && !phoneShared.includes(variant)) failures.push(`no coverage for the ${variant} phone variant`);
}
need(phoneTest, '+989198305774', 'the phone test does not pin the normalized E.164 result');
need(phoneShared, 'DEFAULT_CC', 'there is no default country for numbers without an international marker');
need(phoneShared, 'COUNTRY_RULES', 'the multi-country rule table is missing');
// کلاینت و سرور باید یک جدول قواعد را تکرار کنند (تست واحد یکسان بودن خروجی را قفل می‌کند)
need(phoneClient, 'COUNTRY_RULES', 'the client phone table drifted from the server table');
if (normalizePath === undefined) failures.push('user portal utils are missing');

if (failures.length) { console.error(failures.join('\n')); process.exit(1); }
console.log('Tracking-code + no-auto-login contracts passed.');
