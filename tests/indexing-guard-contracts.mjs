/**
 * قراردادهایِ «ایندکس و حریمِ مدیریت»
 *
 * دو مرز که نباید هیچ‌وقت جابه‌جا شوند:
 *   ۱) صفحاتِ عمومی (فعلی و آینده) برای گوگل، بینگ و هوش‌مصنوعی‌ها باز بمانند؛
 *   ۲) بخش‌های مدیریت (/desk، /admin، /admin-login) ایندکس نشوند و توسط ایجنت‌ها
 *       هم افشا نشوند.
 *
 * نکتهٔ مهم: «Disallow» در robots.txt فقط جلویِ خزش را می‌گیرد، نه نمایش در نتایج را.
 * بنابراین مسیرهای مدیریت باید «هدرِ noindex» هم داشته باشند؛ این تست آن را الزام می‌کند.
 *
 * این تست فقط می‌خواند و چیزی را تغییر نمی‌دهد.
 */
import { existsSync, readFileSync } from 'node:fs';
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

const robots = read('public/robots.txt');
const vercel = JSON.parse(read('vercel.json'));
const aiNotice = existsSync(resolve(root, 'public/ai-notice.txt')) ? read('public/ai-notice.txt') : '';
const sitemapFn = existsSync(resolve(root, 'supabase/functions/sitemap/index.ts'))
  ? read('supabase/functions/sitemap/index.ts')
  : '';

console.log('Indexing & privacy guard contracts:');

// ── ۱) صفحات عمومی باز بمانند ──
const blocks = robots.split('User-agent:').slice(1);
check('robots.txt چند بخش دارد', blocks.length > 0);
check('هیچ «Disallow: /» سراسری نیست (وگرنه کل سایت از ایندکس می‌افتد)',
  !/Disallow:\s*\/\s*$/m.test(robots));
check('همهٔ بخش‌ها به خزنده‌ها اجازهٔ ورود می‌دهند', blocks.every((b) => b.includes('Allow: /')));
check('نشانیِ نقشهٔ سایت معرفی شده (برای کشفِ صفحاتِ آینده)', /Sitemap:/i.test(robots));

// ── ۲) بخش‌های مدیریت بسته بمانند (همهٔ خزنده‌ها، از جمله هوش‌مصنوعی‌ها) ──
const required = ['/desk', '/admin', '/admin-login'];
const guards = ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'OAI-SearchBot', 'Google-Extended', '*'];
for (const bot of guards) {
  const block = blocks.find((b) => b.trim().startsWith(bot)) || '';
  check(`مسیرهای مدیریت برای ${bot} بسته‌اند`, required.every((r) => block.includes(`Disallow: ${r}`)));
}
check('همهٔ بخش‌ها مسیرهای مدیریت را بسته‌اند',
  blocks.every((b) => required.every((r) => b.includes(`Disallow: ${r}`))));

// ── ۳) هدرِ noindex برای مدیریت (چون Disallow به‌تنهایی کافی نیست) ──
const headerFor = (src) => (vercel.headers || []).find((h) => h.source === src)?.headers || [];
const robotsTag = (src) => headerFor(src).find((h) => h.key === 'X-Robots-Tag')?.value || '';
for (const src of ['/desk', '/desk/(.*)', '/admin', '/admin/(.*)', '/admin-login']) {
  check(`هدرِ noindex برای ${src}`, /noindex/.test(robotsTag(src)));
}
check('هدرِ سیاستِ هوش‌مصنوعی روی مسیرهای مدیریت هم هست',
  /no-use|confidential/i.test(headerFor('/desk').find((h) => h.key === 'X-AI-Policy')?.value || ''));

// ── ۴) صفحاتِ عمومی هرگز noindex نشوند (مهم‌ترین خطای ممکن) ──
const publicSources = ['/courses', '/education', '/products', '/about', '/faq', '/contact', '/consultation', '/form', '/licenses', '/experience', '/privacy'];
const noindexSources = (vercel.headers || [])
  .filter((h) => (h.headers || []).some((x) => x.key === 'X-Robots-Tag' && /noindex/.test(x.value)))
  .map((h) => h.source);
const wronglyBlocked = publicSources.filter((p) => noindexSources.some((s) => s === p || s === `${p}/(.*)`));
check('هیچ صفحهٔ عمومی‌ای noindex نشده است', wronglyBlocked.length === 0);
if (wronglyBlocked.length) console.log(`      مسیرهای اشتباه: ${wronglyBlocked.join(', ')}`);

// ── ۵) سیاستِ هوش‌مصنوعی در robots.txt و هدرِ سراسری ──
check('robots.txt سیاستِ بازتولید را دربردارد', /بازتولید/.test(robots) && /Reproduction prohibited/.test(robots));
check('robots.txt به /ai-notice.txt ارجاع می‌دهد', /\/ai-notice\.txt/.test(robots));
check('robots.txt به /llms.txt ارجاع می‌دهد', /\/llms\.txt/.test(robots));
const globalHeaders = headerFor('/(.*)');
check('هدرِ سراسریِ X-AI-Policy وجود دارد', globalHeaders.some((h) => h.key === 'X-AI-Policy'));
check('هدرِ سراسری سیاست به /ai-notice.txt ارجاع می‌دهد',
  /ai-notice/.test(globalHeaders.find((h) => h.key === 'X-AI-Policy')?.value || ''));

// ── ۶) اعلامیه: محرمانگیِ بخش مدیریت، بدون افشایِ نشانی ──
check('اعلامیه به محرمانگیِ بخش مدیریت اشاره می‌کند', /مدیریتی/.test(aiNotice) && /محرمانه/.test(aiNotice));
check('اعلامیه نشانیِ بخش مدیریت را افشا نمی‌کند', !/\/desk|\/admin-login/.test(aiNotice));

// ── ۷) صفحاتِ آینده هم باید وارد نقشهٔ سایت شوند ──
check('نقشهٔ سایت پویا است (آموزش‌ها/دوره‌ها/محصولات از تنظیمات خوانده می‌شوند)',
  /education/.test(sitemapFn) && /courses/.test(sitemapFn) && /products/.test(sitemapFn));

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} قرارداد نقض شد:`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('\nIndexing & privacy guard contracts passed.');
