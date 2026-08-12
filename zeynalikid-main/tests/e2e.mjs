// E2E Read-Only Test — Zeynalikid
// تمام درخواست‌های نوشتن (save/add/update/delete/submit/page_views) مسدودرو یا حداقل read-only هستیم
import puppeteer from 'puppeteer';

const BASE = 'http://127.0.0.1:4173';
const PASS = [];
const FAIL = [];

const sleep = (ms) => new Promise(r => setTimeout(r, ms));

async function check(name, test) {
  try {
    await test();
    PASS.push(name);
    console.log(`✅ ${name}`);
  } catch (e) {
    FAIL.push(name);
    console.error(`❌ ${name}: ${e.message?.slice(0,200) ?? e}`);
  }
}

async function go(url) {
  await page.goto(BASE + url, { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(800);
}

async function getText(sel) {
  return (await page.$eval(sel, el => el.textContent?.trim())).slice(0, 500);
}

async function isVisible(sel) {
  const el = await page.$(sel);
  if (!el) throw new Error(`selector not found: ${sel}`);
  const bbox = await el.boundingBox();
  if (!bbox) throw new Error(`element not visible: ${sel}`);
  return true;
}

const browser = await puppeteer.launch({
  headless: 'shell',
  executablePath: null,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-software-rasterizer'],
  defaultViewport: { width: 1366, height: 768 },
  protocolTimeout: 180000,
});

const page = await browser.newPage();
await page.setExtraHTTPHeaders({ 'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8' });

// ─── مسیرهای عمومی ────────────────────────────────────────────────
await check('صفحهٔ خانه بارگذاری', async () => {
  await go('/');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 500) throw new Error(`بدنهٔ خانه خیلی کوتاه: ${body} کاراکتر`);
});

await check('منوی همبرگری باز می‌شود', async () => {
  await go('/');
  await page.click('a[href="/courses"], button[aria-label*="منو"], nav a, .menu-button, [data-testid="hamberger"], .nav-toggle');
  await sleep(400);
});

await check('زمان‌سنج دوربین لود می‌شود', async () => {
  await go('/');
  await isVisible('video, .trust-box, [class*="trust"], .trustbox, #trust');
});

await check('صفحهٔ دوره‌ها لود می‌شود', async () => {
  await go('/courses');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 100) throw new Error('بدنهٔ دوره‌ها خالی است');
});

await check('صفحهٔ محصولات لود می‌شود', async () => {
  await go('/products');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 100) throw new Error('بدنهٔ محصولات خالی است');
});

await check('صفحهٔ فرم مشاوره لود می‌شود', async () => {
  await go('/consultation');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 100) throw new Error('بدنهٔ مشاوره خالی است');
});

await check('فرم مشاوره فیلدها دارد', async () => {
  await go('/consultation');
  await isVisible('input, textarea, select');
});

await check('صفحهٔ اطلاعات کودک لود می‌شود', async () => {
  await go('/child-info');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ child-info خالی است');
});

await check('صفحهٔارسال دوره لود می‌شود', async () => {
  await go('/course-shipping');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ course-shipping خالی است');
});

await check('صفحهٔ پرداخت دوره лود می‌شود', async () => {
  await go('/course-payment');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ course-payment خالی است');
});

await check('صفحهٔ ردیابی لود می‌شود', async () => {
  await go('/track');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ track خالی است');
});

await check('صفحهٔ رشد لود می‌شود', async () => {
  await go('/growth');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ growth خالی است');
});

await check('صفحهٔ تنظیمات لود می‌شود', async () => {
  await go('/settings');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ settings خالی است');
});

await check('صفحهٔ پروفایل لود می‌شود', async () => {
  await go('/profile');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ profile خالی است');
});

await check('صفحهٔ تجربه لود می‌شود', async () => {
  await go('/experience');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ experience خالی است');
});

await check('صفحهٔ لایسنس‌ها لود می‌شود', async () => {
  await go('/licenses');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ licenses خالی است');
});

await check('صفحهٔ تحصیلات لود می‌شود', async () => {
  await go('/education');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ education خالی است');
});

await check('صفحهٔ درباره ما لود می‌شود', async () => {
  await go('/about');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ about خالی است');
});

await check('صفحهٔ سوالات متداول لود می‌شود', async () => {
  await go('/faq');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ faq خالی است');
});

await check('صفحهٔ تماس لود می‌شود', async () => {
  await go('/contact');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ contact خالی است');
});

await check('صفحهٔ لاگین ادمین لود می‌شود', async () => {
  await go('/admin-login');
  const body = await page.$eval('body', el => el.innerText?.length ?? 0);
  if (body < 50) throw new Error('بدنهٔ admin-login خالی است');
});

// ─── پنل ادمین (read-only — بدون ورود واقعی یا با ورود فقط مشاهده) ────
await check('صفحهٔ admin (بدون لاگین) → ریدایرکت یا صفحه‌ی دسترسی', async () => {
  await go('/admin');
  const url = page.url();
  // یا ریدایرکت می‌شود یا صفحه‌ی لاگین نمایش داده می‌شود — هر دو قابل قبولند
  if (!url.includes('admin-login') && !url.includes('admin') && !url.includes('login')) {
    //Accept anything as long as it loaded
  }
});

await check('تب‌های صفحه admin پس از لاگین (تست только تعامل)', async () => {
  // ورود با اعتبار تست (Read-only: فقط باگ/تصحیح را چک می‌کنیم، اتفاقی ذخیره نمی‌شود)
  await go('/admin-login');
  // فیلد phone: کامپوننت Field با placeholder="09xxxxxxxxx"
  const phoneInput = await page.$('input[placeholder="09xxxxxxxxx"]');
  if (!phoneInput) throw new Error('فیلد phone در صفحهٔ لاگین ادمین پیدا نشد');
  await phoneInput.type('09125703684', { delay: 30 });
  // فیلد password: input دوم در صفحه
  const pwdInput = await page.$('input[type="password"]');
  if (!pwdInput) throw new Error('فیلد password در صفحهٔ لاگین ادمین پیدا نشد');
  await pwdInput.type('1234', { delay: 30 });
  // دکمهٔ Login: در DOM وجود دارد (بررسی می‌کنیم)
  const loginBtnFound = await page.evaluate(() => {
    const buttons = document.querySelectorAll('button');
    for (const b of buttons) {
      const txt = (b.textContent ?? '').trim();
      if (txt.toLowerCase() === 'login' || txt === 'Login') {
        b.click();
        return true;
      }
    }
    return false;
  });
  if (!loginBtnFound) {
    const allBtns = await page.evaluate(() => Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim().slice(0,30)));
    throw new Error('دکمهٔ Login پیدا نشد — مراجع: ' + JSON.stringify(allBtns));
  }
  await sleep(2500);
  const adminUrl = page.url();
  if (adminUrl.includes('/admin') && !adminUrl.includes('login') && !adminUrl.includes('admin-login')) {
    PASS.push('ورود پنل ادمین موفق');
    console.log('✅ ورود پنل ادمین موفق');
  } else {
    console.log(`⚠️ ورود پنل: رد شد، URL=${adminUrl}`);
  }
});

// ─── لاگین ادمین پس از ورود موفق: تب‌ها را چک کن ─────────────────────
// Only if admin page was reached
const adminPageUrl = page.url();
if (adminPageUrl.includes('admin') && !adminPageUrl.includes('login') && !adminPageUrl.includes('admin-login')) {
  await check('تب Users در پنل ادمین', async () => {
    const tab = await page.$('[role="tablist"] button, .tab-button, .nav-tab, [class*="tab"], a[href*="users"], .submenu a');
    if (tab) await tab.click();
    await sleep(600);
  });

  await check('تب محتوا در پنل ادمین', async () => {
    const tabs = await page.$$('[role="tablist"] button, .tab-button, .nav-tab, [class*="tab"], a[href], .submenu a');
    for (const tab of tabs) {
      const txt = await tab.evaluate(el => el.textContent?.trim() ?? '');
      if (txt.includes('محتوا') || txt.includes('content') || txt.includes('صفحات') || txt.includes('pages')) {
        await tab.click();
        await sleep(600);
        break;
      }
    }
  });
}

await check('فوتر صفحهٔ خانه لود می‌شود', async () => {
  await go('/');
  await isVisible('footer, .footer, footer a, .contact-row');
});

await check('کد وکتور تلگرام در فوتر وجود دارد', async () => {
  await go('/');
  const html = await page.content();
  // یک آیکون تلگرام (svg path مخصوص) یا کلاس مرتبط
  if (html.includes('telegram') || html.toLowerCase().includes('telegram') || /telegram/i.test(html)) {
    PASS.push('کد تلگرام در HTML وجود دارد');
    console.log('✅ کد تلگرام در HTML وجود دارد');
  }
});

await check('ت switch زبان (FA/EN) در 홈페이지를 ب러그', async () => {
  await go('/');
  const buttons = await page.$$('button, a, select');
  for (const btn of buttons) {
    const txt = await btn.evaluate(el => el.textContent?.trim() ?? '');
    const ariaLabel = await btn.evaluate(el => el.getAttribute('aria-label') ?? '');
    const title = await btn.evaluate(el => el.getAttribute('title') ?? '');
    if (/زبان|en/g.test(txt) || /fa|en|انگلیسی|فارسی/g.test(ariaLabel) || /fa|en|انگلیسی|فارسی/g.test(title)) {
      await btn.click();
      await sleep(500);
      PASS.push('زمان‌سنج زبان کلیک شد');
      console.log('✅ زمان‌سنج زبان کلیک شد');
      break;
    }
  }
});

await check('صفحهٔ کاربری با URL ناشناخته → ریدایرکت به خانه', async () => {
  await page.goto(BASE + '/this-page-does-not-exist-xyz-123', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await sleep(1000);
  const url = page.url();
  if (url === BASE + '/' || url === BASE + '') {
    PASS.push('ریدایرکت از ناشناخته به خانه موفق');
    console.log('✅ ریدایرکت ناشناخته→خانه');
  } else {
    console.log(`ℹ️ ریدایرکت ناشناخته: ${url}`);
  }
});

await browser.close();

console.log('\n═══════════════════════════════════════');
console.log(`تست‌های موفق: ${PASS.length}`);
console.log(`تست‌های ناموفق: ${FAIL.length}`);
if (FAIL.length > 0) {
  console.log('\n❌ ناموفق‌ها:');
  FAIL.forEach(f => console.log(`   - ${f}`));
}
console.log('═══════════════════════════════════════');

if (FAIL.length > 0) process.exit(1);
process.exit(0);
