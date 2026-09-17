/**
 * قراردادهایِ «محافظت از محتوایِ صفحاتِ مجوزها و تجربه والدین»
 *
 * هدف: سه رفتاری که مالک صریحاً خواسته، در کد بماند و کسی بعداً بی‌صدا حذفشان نکند:
 *   ۱) صفحهٔ مجوزها زوم نشود — اما اسکرولِ عادی کاملاً سالم بماند؛
 *   ۲) تلاش برای کپی/ذخیره/نگه‌داشتنِ طولانی، یک پیامِ محترمانه نشان دهد؛
 *   ۳) متنِ پیام هرگز نگوید «نمی‌توانید کپی/دانلود کنید» (کنجکاویِ مخاطب را زیاد می‌کند)؛
 *   ۴) گزینهٔ «ورود والد / پنل والد» در منوی همبرگری همیشه باشد.
 *
 * این تست فقط فایل‌ها را می‌خواند و چیزی را تغییر نمی‌دهد.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const failures = [];
const check = (label, condition) => {
  if (condition) console.log(`  ✓ ${label}`);
  else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
};

const secure = read('src/components/SecurePage.tsx');
const pages = read('src/pages/InfoPages.tsx');
const menu = read('src/components/HamburgerMenu.tsx');

console.log('Content-guard source contracts:');

// ── ۱) زومِ صفحهٔ مجوزها، بدون آسیب به اسکرول ──
check('محافظِ زوم فقط وقتی فعال است که noZoom داده شود', /if \(!noZoom\) return undefined;/.test(secure));
check('touch-action روی pan-x pan-y ست می‌شود (اسکرول آزاد می‌ماند)', /touchAction\s*=\s*'pan-x pan-y'/.test(secure));
check('فقط حرکتِ چندانگشتی مسدود می‌شود (تک‌انگشت = اسکرول)', /e\.touches\.length\s*>\s*1/.test(secure));
check(
  'همهٔ شنونده‌هایِ روی document هنگام خروج پاک می‌شوند',
  /removeEventListener\('gesturestart'/.test(secure) &&
    /removeEventListener\('touchmove'/.test(secure) &&
    /root\.style\.touchAction\s*=\s*prevTouchAction/.test(secure),
);
check('میانبرهایِ بزرگ‌نماییِ صفحه‌کلید هم مسدودند', /e\.ctrlKey \|\| e\.metaKey/.test(secure));

// ── ۲) محافظت از کپی/ذخیره و پیامِ نگه‌داشتنِ طولانی ──
check('رویدادهایِ کپی، برش، کشیدن و انتخاب گarded شده‌اند',
  /addEventListener\('copy'/.test(secure) &&
  /addEventListener\('cut'/.test(secure) &&
  /addEventListener\('dragstart'/.test(secure) &&
  /addEventListener\('selectstart'/.test(secure));
check('منویِ راست‌کلیک هم مدیریت می‌شود', /addEventListener\('contextmenu'/.test(secure));
check('نگه‌داشتنِ طولانی روی لمس پیام می‌آورد', /addEventListener\('touchstart'/.test(secure) && /setTimeout\(/.test(secure));
check('فیلدهایِ نوشتاری از محافظت مستثنا هستند (کاربر بتواند بنویسد)', /EDITABLE\s*=/.test(secure) && /isEditableTarget\(/.test(secure));
check('کنترل‌هایِ تعاملی (ویدیو/دکمه/لینک) با نگه‌داشتن، پیام نمی‌گیرند', /INTERACTIVE\s*=/.test(secure));

// ── ۳) اتصالِ درست به هر صفحه ──
const licensesTag = pages.match(/<SecurePage[^>]*>/g)?.find((t) => /noZoom/.test(t)) || '';
const experienceTag = pages.match(/<SecurePage[^>]*>/g)?.find((t) => /warningMessage/.test(t)) || '';
check('صفحهٔ مجوزها هم محافظ دارد و هم بدون زوم است', /protect/.test(licensesTag) && /noZoom/.test(licensesTag));
check('صفحهٔ تجربه والدین محافظِ کپی دارد', /protect/.test(experienceTag));
check('صفحهٔ تجربه والدین زوم را آزاد می‌گذارد (بدون noZoom)', !/noZoom/.test(experienceTag));
check('زبان به محافظ پاس داده می‌شود (پیامِ فارسی/انگلیسی)', /lang=\{lang\}/.test(licensesTag) && /lang=\{lang\}/.test(experienceTag));

// ── ۴) لحنِ پیام: منعِ صریح ممنوع ──
// دو نسخهٔ پیام: عمومی (مجوزها — بدون «خانواده‌ها») و ویژهٔ والدین (تجربه والدین)
const generalFa = (secure.match(/general:\s*\{[\s\S]*?body:\s*'([^']*)'/) || [])[1] || '';
const familiesFa = (secure.match(/families:\s*\{[\s\S]*?body:\s*'([^']*)'/) || [])[1] || '';
const faBody = generalFa;
const enBody = (secure.match(/general:\s*[\s\S]*?en:\s*\{[\s\S]*?body:\s*'([^']*)'/) || [])[1] || '';
check('متنِ فارسی پیام وجود دارد', faBody.length > 40);
check('نسخهٔ مجوزها واژهٔ «خانواده‌ها» ندارد (مجوزها مربوط به والدین نیست)',
  familiesFa.length > 40 && !/خانواده/.test(generalFa));
check('نسخهٔ تجربه والدین به حریمِ خانواده‌ها اشاره می‌کند', /خانواده/.test(familiesFa));
check('صفحهٔ تجربه والدین از نسخهٔ خانواده‌ها استفاده می‌کند', /familiesNotice/.test(experienceTag));
check('صفحهٔ مجوزها از نسخهٔ عمومی استفاده می‌کند (familiesNotice ندارد)', !/familiesNotice/.test(licensesTag));
check('متن پیام صریحاً نمی‌گوید «نمی‌توانید»', !/نمی‌توانید|نمی‌توانی|نمی‌توان/.test(faBody));
check('متن پیام صریحاً نمی‌گوید «کپی نکنید / دانلود نکنید»', !/کپی نکنید|دانلود نکنید|ذخیره نکنید/.test(faBody));
check('متن پیام بر حریمِ خصوصی و رضایت تأکید می‌کند', /حریم/.test(faBody) && /رضایت|اعتماد/.test(faBody));
check('نسخهٔ انگلیسی هم همین ملاحظات را دارد', !/you cannot|you can't|do not copy/i.test(enBody));

// ── ۵) پیام یک دکمهٔ بستن دارد ──
check('پیام دکمهٔ تأیید دارد', /action:\s*'متوجه شدم'/.test(secure) && /onClick=\{\(\) => \{ suppressClickRef\.current = false; setNoticeOpen\(false\); \}\}/.test(secure));
check('پیام با کلیدِ Esc هم بسته می‌شود', /e\.key === 'Escape'/.test(secure));
// رفعِ ایرادِ «دو ضربه»: کلیکِ روی خودِ پیام نباید توسطِ لایهٔ خنثی‌ساز بلعیده شود
check('کلیک روی دکمهٔ پیام بلعیده نمی‌شود (تک‌ضربه بسته می‌شود)',
  /closest\?\.\('\[role="dialog"\]'\)/.test(secure));
check('نقشِ dialog برای دسترسی‌پذیری ست شده', /role="dialog"/.test(secure) && /aria-modal="true"/.test(secure));

// ── ۶) منوی همبرگری: پنل والد همیشه هست ──
check('شناسهٔ قدیمیِ track به profile مهاجرت می‌دهد', /x\.id==='track'\?\{\.\.\.x,id:'profile'\}/.test(menu));
check('اگر profile در چیدمان نباشد، خودکار درج می‌شود', /x\._id==='profile'\)&&itemsBase\.profile/.test(menu));
check('مدخلِ پنل والد خطِ جداکننده دارد (مثل خطِ زیرِ خانه)', /to:'\/profile',\s*separator:\s*true/.test(menu));
check('عنوان بر اساسِ وضعیتِ ورود تغییر می‌کند', /portalSignedIn\?'پنل والد':'ورود والد'/.test(menu));

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} قرارداد نقض شد:`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('\nContent-guard contracts passed.');
