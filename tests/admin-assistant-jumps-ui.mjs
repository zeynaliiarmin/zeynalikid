/*
 * تست «راهنمای پنل» برای دستیار مدیریت:
 *  ۱) بررسی ساختاری supabase/seed/admin_assistant_knowledge.json (دسته، حالت پاسخ، محدودیت‌های دیتابیس، یکتا بودن سؤال‌ها)
 *  ۲) هر ردیف باید تب معتبر پنل را هدف بگیرد (فهرست سفید Edge Function + تب‌های واقعی پنل)
 *  ۳) متن «برجسته‌سازی» هر ردیف باید واقعاً در DOM همان تب پیدا شود — با همان سلکتوری که خود پنل استفاده می‌کند
 *  ۴) فایل مایگریشن SQL باید با فایل JSON هم‌تعداد و هم‌سؤال باشد
 * اجرا: node tests/admin-assistant-jumps-ui.mjs   (بخش DOM فقط وقتی Chrome و آدرس پایه در دسترس باشد)
 */
import fs from 'node:fs';
import path from 'node:path';
import { readFileSync } from 'node:fs';

const root = path.resolve(import.meta.dirname, '..');
const fail = [];
const notes = [];
const SEED_FILE = path.join(root, 'supabase/seed/admin_assistant_knowledge.json');
const SQL_FILE = path.join(root, 'supabase/migrations/20260831190000_seed_admin_panel_guide_knowledge.sql');
const norm = value => String(value || '').replace(/\s+/g, ' ').trim().toLocaleLowerCase('fa');

if (!fs.existsSync(SEED_FILE)) { console.error('✗ فایل دانش راهنمای پنل پیدا نشد:', SEED_FILE); process.exit(1); }
const items = JSON.parse(readFileSync(SEED_FILE, 'utf8'));
if (!Array.isArray(items) || items.length < 40) fail.push(`تعداد دانش راهنمای پنل غیرمنتظره است: ${Array.isArray(items) ? items.length : 'نامشخص'}`);
else notes.push(`${items.length} ردیف دانش راهنمای پنل`);

const training = readFileSync(path.join(root, 'supabase/functions/_shared/assistantTraining.ts'), 'utf8');
const tabsMatch = training.match(/ADMIN_ASSISTANT_TABS\s*=\s*new Set\(\[([^\]]*)\]\)/);
if (!tabsMatch) fail.push('فهرست ADMIN_ASSISTANT_TABS در assistantTraining.ts پیدا نشد');
const allowed = new Set((tabsMatch ? tabsMatch[1] : '').split(',').map(s => s.trim().replace(/^['"]|['"]$/g, '')).filter(Boolean));
const panel = readFileSync(path.join(root, 'src/admin/AdminPanel.tsx'), 'utf8');
const panelTabs = new Set([...panel.matchAll(/\bid:\s*'([a-zA-Z]+)'/g)].map(m => m[1]));
notes.push(`فهرست سفید دستیار ${allowed.size} تب، تب‌های پنل ${panelTabs.size} تا`);

const selMatch = panel.match(/document\.querySelectorAll<HTMLElement>\('([^']+)'\)/);
if (!selMatch) fail.push('سلکتور برجسته‌سازی در AdminPanel.tsx پیدا نشد تا همان منطق پنل سنجیده شود');
const SELECTOR = selMatch ? selMatch[1] : '.admin-main h1,.admin-main h2,.admin-main h3,.admin-main summary,.admin-main legend,.admin-main label';

const seenQuestion = new Set();
for (const item of items) {
  const q = String(item.question || '');
  const a = String(item.answer || '');
  const where = `«${q.slice(0, 30)}»`;
  if (q.length < 5 || q.length > 500) fail.push(`طول سؤال مجاز نیست ${where}`);
  if (a.length < 20 || a.length > 6000) fail.push(`طول پاسخ مجاز نیست ${where}`);
  const key = norm(q);
  if (seenQuestion.has(key)) fail.push(`سؤال تکراری ${where}`);
  seenQuestion.add(key);
  if (item.category !== 'راهنمای پنل') fail.push(`دسته باید «راهنمای پنل» باشد ${where}`);
  if (item.response_mode !== 'exact' || item.match_mode !== 'contains') fail.push(`حالت پاسخ باید exact+contains باشد ${where}`);
  if (item.status !== 'published' || item.is_active !== true) fail.push(`ردیف باید منتشر و فعال باشد ${where}`);
  if (!Array.isArray(item.aliases) || item.aliases.length < 2) fail.push(`حداقل یک میان‌بر لازم است ${where}`);
  if (!/^[a-zA-Z]+$/.test(String(item.target_tab)) || !allowed.has(item.target_tab)) fail.push(`تب مقصد در فهرست سفید نیست (${item.target_tab}) ${where}`);
  if (!panelTabs.has(item.target_tab)) fail.push(`تب مقصد در پنل وجود ندارد (${item.target_tab}) ${where}`);
}
const coveredTabs = new Set(items.map(i => i.target_tab));
for (const tab of allowed) if (!coveredTabs.has(tab)) fail.push(`تب «${tab}» هیچ راهنمایی ندارد`);
if (!fail.length) notes.push(`پوشش کامل: همهٔ ${coveredTabs.size} تبِ مجاز حداقل یک راهنما دارند`);

if (fs.existsSync(SQL_FILE)) {
  const sql = readFileSync(SQL_FILE, 'utf8');
  const inSql = items.filter(item => sql.includes(String(item.question).replace(/'/g, "''"))).length;
  if (inSql !== items.length) fail.push(`فایل SQL با JSON هم‌خوان نیست (${inSql}/${items.length} سؤال در آن هست)`);
  else notes.push('مایگریشن SQL با فایل seed هم‌خوان است');
} else fail.push('فایل مایگریشن SQL راهنمای پنل وجود ندارد');

/* ── بخش DOM: همان کاری که دستیار پنل انجام می‌دهد ── */
const LABELS = { dashboard: 'داشبورد', data: 'فرم‌ها و دوره‌ها', userQuestions: 'سوالات مخاطبین', assistant: 'دستیار', reviews: 'نظرات کاربران', consultants: 'مشاورین', courses: 'دوره‌ها', featured: 'دوره‌های ویژه', tagged: 'دوره‌های تگ‌دار', products: 'محصولات', services: 'خدمات', trustbox: 'جملات اعتمادساز', trust: 'جملات صفحه موفقیت', shipping: 'ارسال و پرداخت', content: 'محتوا و صفحات', images: 'تصاویر', highlights: 'هایلایت', licenses: 'مجوزها', contacts: 'راه‌های ارتباطی', settings: 'تنظیمات', design: 'مدیریت دیزاین', security: 'امنیت', analytics: 'آمار بازدید', entry: 'صفحهٔ ورودی سایت', errors: 'خطاهای سیستم', trash: 'سطل بازیافت' };
const PARENT = { featured: 'courses', tagged: 'courses', services: 'products', trust: 'trustbox', images: 'content', highlights: 'content', licenses: 'content', contacts: 'content', design: 'settings', security: 'settings', analytics: 'settings', entry: 'settings', errors: 'settings' };

let domChecked = 0;
const executable = process.env.PUPPETEER_EXECUTABLE_PATH;
const base = process.env.TEST_BASE_URL;
if (executable && base && fs.existsSync(executable)) {
  const { default: puppeteer } = await import('puppeteer');
  const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PATCH,DELETE,OPTIONS' };
  const browser = await puppeteer.launch({ executablePath: executable, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 1 });
  await page.evaluateOnNewDocument(() => {
    localStorage.setItem('zk_admin_session_token', 'jumps-test-token');
    localStorage.setItem('zk_admin_authed', 'true');
    localStorage.setItem('zk_admin_device_id', 'jumps-test-device');
    localStorage.setItem('zkid_lang', 'fa');
    localStorage.setItem('zk_personal_color_mode', 'light');
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    const respond = obj => request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(obj) });
    if (request.method() === 'OPTIONS' && url.includes('/functions/v1/')) return request.respond({ status: 204, headers: cors, body: '' });
    if (url.includes('/functions/v1/admin-session')) return respond({ valid: true, ownerPhone: '***', devices: [] });
    if (url.includes('/functions/v1/log-error') || url.includes('/functions/v1/admin-error-logs')) return respond({ ok: true, logs: [], total: 0 });
    // تب «دستیار» بدون پاسخ bootstrap خالی می‌ماند؛ همین یک پاسخ ساختاری کافی است تا عنوان‌های واقعی کارت‌ها سنجیده شوند
    const assistantList = { knowledge: [], adminKnowledge: [], settings: { enabled: true, welcome_message: 'سلام', fallback_message: 'پیدا نشد', disclaimer: 'راهنمای پنل', suggested_questions: [] }, unanswered: [], telegram: { configured: { token: false, owner: false, webhook_secret: false }, connected: false, bot: null, webhook: null, expected_url: '', error: '' }, status: { enabled: true, revision: 1, updated_at: '' }, revision: 'seed' };
    if (url.includes('/functions/v1/assistant-admin') || url.includes('/api/assistant/admin')) return respond(assistantList);
    if (url.includes('/functions/v1/admin-api')) {
      let body = {}; try { body = JSON.parse(request.postData() || '{}'); } catch { /* noop */ }
      if (body.action === 'list_settings') return respond({ settings: { version: 2, courseTabs: [], faqItems: [], education: { items: [] } } });
    }
    request.continue();
  });
  const headingsFor = new Map();
  for (const tab of coveredTabs) {
    await page.goto(`${base}/admin/app`, { waitUntil: 'domcontentloaded', timeout: 40000 });
    await new Promise(r => setTimeout(r, 1000));
    const click = label => page.evaluate(l => {
      const node = [...document.querySelectorAll('aside button, nav button, .zkad-nav button, button, a')]
        .find(el => (el.textContent || '').replace(/\s+/g, ' ').trim().startsWith(l));
      if (node) { node.click(); return true; }
      return false;
    }, label);
    if (PARENT[tab]) await click(LABELS[PARENT[tab]]);
    await new Promise(r => setTimeout(r, 600));
    await click(LABELS[tab]);
    await new Promise(r => setTimeout(r, 1400));
    const rendered = await page.evaluate(sel => {
      const main = document.querySelector('.admin-main');
      if (!main) return null;
      const active = [...document.querySelectorAll('.admin-side button[aria-current="page"], .admin-side button.is-active, .zkad-nav button[aria-current="page"]')][0];
      return { texts: [...main.querySelectorAll(sel)].map(e => (e.textContent || '').replace(/\s+/g, ' ').trim()), active: (active?.textContent || '').trim() };
    }, SELECTOR);
    if (!rendered) { fail.push(`تب «${tab}» در پیش‌نمایش باز نشد (پنل رندر نشد)`); continue; }
    headingsFor.set(tab, { texts: rendered.texts, active: rendered.active });
  }
  if (headingsFor.size) {
    for (const item of items) {
      const bucket = headingsFor.get(item.target_tab);
      if (!bucket) continue;
      domChecked += 1;
      const wanted = norm(item.target_focus);
      if (!wanted) continue;
      if (!bucket.texts.some(text => norm(text).includes(wanted))) {
        fail.push(`متن برجسته‌سازی «${item.target_focus}» در تب «${item.target_tab}» پیدا نشد (نمونه‌های همان تب: ${bucket.texts.slice(0, 3).join(' | ').slice(0, 90)})`);
      }
    }
    notes.push(`${domChecked} ردیف روی DOM واقعی پنل سنجیده شد`);
  } else notes.push('پنل مدیریت رندر نشد؛ سنجش DOM انجام نشد');
  await browser.close();
} else {
  notes.push('سنجش DOM پرش‌ها پرش شد (Chrome یا آدرس پایه در دسترس نبود)');
}

for (const note of notes) console.log('  ·', note);
if (fail.length) {
  console.error(`✗ admin assistant jumps: ${fail.length} مورد ناموفق`);
  for (const line of fail.slice(0, 25)) console.error('  ✗', line);
  process.exit(1);
}
console.log(`✓ admin assistant panel guide: ${items.length} راهنما، ${coveredTabs.size} تب، ${domChecked} سنجش DOM — همه درست`);
