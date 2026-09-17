/**
 * قراردادهایِ «بارگذاریِ پایدارِ صفحات» (lazyWithRetry)
 *
 * هدف: اگر روزی کسی دوباره از React.lazy خام استفاده کند یا لایهٔ تلاشِ دوباره را دستکاری
 * کند، تست شکست بخورد — چون مستقیماً باعث می‌شود گوگل صفحات را «خزش کرده ولی ایندکس
 * نکرده» نگه دارد و کاربر هم صفحهٔ خطا ببیند.
 *
 * این تست فقط می‌خواند (خواندنِ فایل) و چیزی را تغییر نمی‌دهد.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(resolve(root, p), 'utf8');

const failures = [];
const check = (label, condition) => {
  if (condition) {
    console.log(`  ✓ ${label}`);
  } else {
    failures.push(label);
    console.log(`  ✗ ${label}`);
  }
};

const helper = read('src/utils/lazyWithRetry.ts');
const routes = read('src/app/AppRoutes.tsx');

console.log('Chunk-retry source contracts:');

// ۱) لایهٔ محافظ وجود دارد و واقعاً تلاشِ دوباره می‌کند
check('لایهٔ lazyWithRetry وجود دارد و خروجی می‌دهد', /export default function lazyWithRetry/.test(helper));
check('دست‌کم یک بار تلاشِ دوباره دارد', /MAX_RETRIES\s*=\s*[1-9]/.test(helper));

// ۲) رفرش فقط یک بار — برای جلوگیری از چرخهٔ بی‌انتها
check('پیش از رفرش، نگهبان چک می‌شود (چرخهٔ بی‌انتها ممنوع)', /if \(!guardRead\(\)\)/.test(helper) && /guardWrite\(\)/.test(helper));
check('پس از بارگذاریِ موفق، نگهبان پاک می‌شود', /guardClear\(\)/.test(helper));

// ۳) خطایِ واقعیِ برنامه پنهان نمی‌شود
check('خطای غیرمرتبط با چانک، بلافاصله بالا فرستاده می‌شود', /if \(!isChunkLoadError\(error\)\) break;/.test(helper));
check('در نهایت خطا پرتاب می‌شود', /throw lastError instanceof Error/.test(helper));

// ۴) همهٔ مسیرها از لایهٔ محافظ استفاده می‌کنند
const dynamicImports = (routes.match(/lazyWithRetry\(\(\) => import\(/g) || []).length;
const bareLazy = (routes.match(/(?<!WithRetry)\blazy\(\(/g) || []).length;
check('هیچ فراخوانِ خامِ lazy( باقی نمانده', bareLazy === 0);
check('همهٔ صفحاتِ پویا از lazyWithRetry استفاده می‌کنند', dynamicImports > 0, );
console.log(`      (${dynamicImports} صفحهٔ پویا محافظت شد)`);

// ۵) وارداتِ کمکی فراموش نشده باشد
check('وارداتِ lazyWithRetry در AppRoutes ثبت شده', /import lazyWithRetry from '\.\.\/utils\/lazyWithRetry'/.test(routes));

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} قرارداد نقض شد:`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('\nChunk-retry contracts passed.');
