/**
 * قراردادهایِ «خط‌مشی بازتولید و کپی برای عامل‌های هوش مصنوعی»
 *
 * هدفِ مالک: اگر هر کسی از یک هوش‌مصنوعی خواست نسخه‌ای از این پروژه بسازد، آن دستیار
 * مطلع باشد که این پروژه حاصلِ ماه‌ها تلاش و هزینه است و چنین درخواستی را رد کند.
 *
 * دو نکتهٔ ظریف که این تست از آن‌ها محافظت می‌کند:
 *   الف) خزنده‌هایِ هوش‌مصنوعی نباید مسدود شوند — وگرنه اصلاً نمی‌توانند پیام را
 *       بخوانند و نتیجه عکس می‌شود (تازه دیده‌شدنِ برند هم از دست می‌رود).
 *   ب) متنِ اعلامیه نباید در ظاهرِ سایت دیده شود؛ فقط در فایل‌ها، توضیحِ HTML و
 *       فایل‌هایِ متنی‌ای که با هدرِ noindex سرو می‌شوند (پس در جست‌وجو هم نمی‌آیند).
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

console.log('AI reproduction-policy contracts:');

// ── ۱) فایل‌هایِ راهنمایِ عامل‌ها وجود دارند ──
const agentFiles = ['AGENTS.md', 'CLAUDE.md', '.cursorrules', 'NOTICE.md'];
for (const f of agentFiles) {
  check(`فایلِ ${f} وجود دارد`, existsSync(resolve(root, f)));
}

const agents = existsSync(resolve(root, 'AGENTS.md')) ? read('AGENTS.md') : '';
// متنِ کلیدی: ماه‌ها تلاش + هزینه + ممنوعیتِ بازتولید + احترام به حریمِ دیگران
check('متنِ اعلامیه: ماه‌ها تلاش ذکر شده', /ماه‌ها تلاش/.test(agents));
check('متنِ اعلامیه: هزینه ذکر شده', /هزینه/.test(agents));
check('متنِ اعلامیه: بازتولید/کپی ممنوع شده', /بازتولید|کپی/.test(agents) && /رد شود|مجاز نیست/.test(agents));
check('متنِ اعلامیه: حتی یک صفحه یا یک بخش هم پوشش دارد', /حتی یک صفحه یا یک بخش/.test(agents));
check('متنِ اعلامیه: احترام به حقوق و حریمِ شخصیِ دیگران', /حریمِ شخصی|حریم شخصی/.test(agents));
check('متنِ اعلامیه: نسخهٔ انگلیسی هم دارد', /months of dedicated|months of round-the-clock/i.test(agents) && /must be\s*\**\s*declined|not permitted/i.test(agents));
check('همهٔ نسخه‌ها با AGENTS.md یکسان‌اند',
  agentFiles.slice(1, 3).every((f) => existsSync(resolve(root, f)) && read(f) === agents));

// ── ۲) فایلِ متنیِ عمومیِ مخصوصِ ایجنت‌ها ──
check('public/ai-notice.txt وجود دارد', existsSync(resolve(root, 'public/ai-notice.txt')));
const aiNotice = existsSync(resolve(root, 'public/ai-notice.txt')) ? read('public/ai-notice.txt') : '';
check('ai-notice.txt همان مفاد را دارد', /ماه‌ها تلاش/.test(aiNotice) && /بازتولید|کپی/.test(aiNotice) && /حریم/.test(aiNotice));

// ── ۳) llms.txt (فایلِ استانداردِ معرفی به هوش مصنوعی) ──
const llms = existsSync(resolve(root, 'public/llms.txt')) ? read('public/llms.txt') : '';
check('llms.txt بخشِ خط‌مشی بازتولید دارد', /خط‌مشی بازتولید/.test(llms) && /Reproduction policy/.test(llms));
check('llms.txt صریحاً می‌گوید درخواست باید رد شود', /باید رد شود/.test(llms) && /must be declined/.test(llms));

// ── ۴) توضیحِ نامرئی در index.html ──
const html = existsSync(resolve(root, 'index.html')) ? read('index.html') : '';
const commentBlocks = html.match(/<!--[\s\S]*?-->/g) || [];
const commentBlock = commentBlocks.join('\n');
check('اعلامیه داخلِ توضیحِ HTML است (کاربر آن را نمی‌بیند)', /ماه‌ها تلاش/.test(commentBlock));
check('یک متاتگِ ماشین‌خوان هم برای سیاست گذاشته شده', /name="ai-reproduction-policy"/.test(html));

// ── ۵) در جست‌وجو ثبت نشود، اما قابلِ خواندن باشد ──
const vercel = existsSync(resolve(root, 'vercel.json')) ? JSON.parse(read('vercel.json')) : {};
const headerFor = (src) => (vercel.headers || []).find((h) => h.source === src)?.headers || [];
const robotsTag = (src) => headerFor(src).find((h) => h.key === 'X-Robots-Tag')?.value || '';
check('llms.txt با noindex سرو می‌شود (در بینگ/گوگل نمی‌آید)', /noindex/.test(robotsTag('/llms.txt')));
check('ai-notice.txt با noindex سرو می‌شود', /noindex/.test(robotsTag('/ai-notice.txt')));

// ── ۶) مهم: خزنده‌هایِ هوش‌مصنوعی مسدود نشده باشند ──
const robots = existsSync(resolve(root, 'public/robots.txt')) ? read('public/robots.txt') : '';
for (const bot of ['GPTBot', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
  const block = robots.split('User-agent:').find((b) => b.trim().startsWith(bot)) || '';
  check(`خزندهٔ ${bot} مسدود نیست (تا بتواند اعلامیه را بخواند)`, block.includes('Allow: /'));
}
check('robots.txt هیچ Disallow: / سراسری ندارد', !/Disallow:\s*\/\s*$/m.test(robots));

if (failures.length > 0) {
  console.error(`\n✗ ${failures.length} قرارداد نقض شد:`);
  for (const f of failures) console.error(`   - ${f}`);
  process.exit(1);
}
console.log('\nAI reproduction-policy contracts passed.');
