/* Browser regression for the requested course/portal/header refinements.
   Run with: TEST_BASE_URL=http://127.0.0.1:4173 node tests/requested-public-ui.mjs */
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fail = [];
const assert = (condition, message, detail) => {
  if (!condition) fail.push(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`);
};

const makeItems = (prefix, count, extra = {}) => Array.from({ length: count }, (_, index) => ({
  id: `${prefix}-${index + 1}`,
  type: 'text',
  title: `${prefix} ${index + 1}`,
  titleEn: `${prefix} ${index + 1}`,
  body: 'متن کوتاه برای بررسی نمای کارت.',
  bodyEn: 'Short content used to verify the card presentation.',
  active: true,
  order: index + 1,
  mediaCategories: ['height'],
  ...extra,
}));

const fixture = {
  entryMode: 'user',
  userPortal: { otpMode: 'test', captchaEnabled: false },
  mediaItems: [
    ...makeItems('education-fixture', 6),
    ...makeItems('experience-fixture', 6, { categories: ['experience'] }),
  ],
  faqItems: Array.from({ length: 6 }, (_, index) => ({
    id: `course-faq-${index + 1}`,
    question: `پرسش نمونه ${index + 1}`,
    answer: 'پاسخ نمونه برای بررسی صفحه همه پرسش‌ها.',
    placements: ['course:height'],
  })),
  faqItemsEn: Array.from({ length: 6 }, (_, index) => ({
    id: `course-faq-en-${index + 1}`,
    question: `Fixture question ${index + 1}`,
    answer: 'Fixture answer used to verify the all-questions screen.',
    placements: ['course:height'],
  })),
};

const reviews = Array.from({ length: 6 }, (_, index) => ({
  id: `fixture-review-${index + 1}`,
  course_id: 'h1',
  course_ids: ['h1'],
  reviewer_name: `Fixture parent ${index + 1}`,
  rating: 5,
  comment: 'نظر نمونه برای بررسی چیدمان صفحه همه نظرها.',
  status: 'approved',
  placements: ['course_detail'],
  phone: '09120000000',
  phone_country: '+98',
  created_at: `2026-08-${String(index + 1).padStart(2, '0')}T10:00:00.000Z`,
}));

async function withFixturePage(lang) {
  const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument((language, seededReviews, settings) => {
    // The SSG shell writes defaults before React mounts. Keep the test fixture in that
    // write as well as in the subsequent public-settings response.
    let preloaded;
    Object.defineProperty(window, '__APP_SSG_SETTINGS__', {
      configurable: true,
      get: () => preloaded,
      set: (value) => {
        preloaded = value && typeof value === 'object' && !Array.isArray(value)
          ? { ...value, ...settings, entryMode: 'user' }
          : { ...settings, entryMode: 'user' };
      },
    });
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('zkid_lang', JSON.stringify(language));
    localStorage.setItem('zk_reviews', JSON.stringify(seededReviews));
    localStorage.setItem('zkid_settings_v2', JSON.stringify(settings));
  }, lang, reviews, fixture);
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    if (url.includes('/functions/v1/public-settings')) {
      return request.respond({
        status: 200,
        contentType: 'application/json',
        headers: { 'access-control-allow-origin': '*' },
        body: JSON.stringify({ settings: fixture }),
      });
    }
    if (url.includes('/functions/v1/assistant-public')) {
      return request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ knowledge: [], settings: { enabled: false } }) });
    }
    // Force the review component through its safe local fallback, seeded above.
    if (url.includes('/rest/v1/reviews')) return request.respond({ status: 500, contentType: 'application/json', body: JSON.stringify({ message: 'fixture fallback' }) });
    return request.continue();
  });
  return { browser, page };
}

async function clickIn(page, selector, predicate, label) {
  const clicked = await page.$eval(selector, (root, predicateSource) => {
    const matches = [...root.querySelectorAll('button')];
    const selected = matches.find((button) => new Function('text', `return (${predicateSource})(text)`)(button.textContent?.trim() || ''));
    if (!(selected instanceof HTMLButtonElement)) return false;
    selected.click();
    return true;
  }, predicate.toString());
  assert(clicked, `${label}: trigger was not found`);
}

async function clickSelector(page, selector, label) {
  const clicked = await page.$eval(selector, (node) => {
    if (!(node instanceof HTMLButtonElement)) return false;
    node.click();
    return true;
  }).catch(() => false);
  assert(clicked, `${label}: button was not found`);
}

async function headerState(page, id) {
  return page.$eval(`[data-testid="${id}"]`, (back) => {
    const rect = (node) => {
      if (!(node instanceof HTMLElement)) return null;
      const box = node.getBoundingClientRect();
      return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, width: box.width, height: box.height };
    };
    const row = back.closest('.zk-public-title-row');
    const title = [...(row?.children || [])].find((child) => child !== back);
    const label = back.querySelector('.zk-public-back__label');
    const icon = back.querySelector('.zk-public-back__icon');
    const arrow = icon?.querySelector('svg');
    return {
      direction: getComputedStyle(row).direction,
      row: rect(row),
      title: rect(title),
      back: rect(back),
      label: rect(label),
      icon: rect(icon),
      arrowTransform: arrow ? getComputedStyle(arrow).transform : '',
      controlDirection: back.getAttribute('data-direction'),
    };
  });
}

function assertHeader(state, lang, label) {
  const expected = lang === 'fa' ? 'rtl' : 'ltr';
  assert(state.direction === expected && state.controlDirection === expected, `${label}: local language direction is not preserved`, state);
  assert(state.row && state.title && state.back && state.label && state.icon, `${label}: public title row structure is incomplete`, state);
  if (!state.row || !state.title || !state.back || !state.label || !state.icon) return;
  if (lang === 'fa') {
    assert(state.back.left - state.row.left <= 18 && state.row.right - state.title.right <= 18, `${label}: Persian back/title sides are reversed`, state);
    assert(state.icon.right <= state.label.left + 1 && String(state.arrowTransform).includes('-1'), `${label}: Persian circle or arrow is not outward-left`, state);
  } else {
    assert(state.row.right - state.back.right <= 18 && state.title.left - state.row.left <= 18, `${label}: English back/title sides are reversed`, state);
    assert(state.label.right <= state.icon.left + 1 && state.arrowTransform === 'none', `${label}: English circle or arrow is not outward-right`, state);
  }
}

async function waitForAbsent(page, selector, label) {
  try {
    await page.waitForFunction((query) => !document.querySelector(query), { timeout: 10_000 }, selector);
  } catch {
    assert(false, `${label}: view did not close`);
  }
}

async function verifyPortal(page) {
  await page.goto(`${base}/portal`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('.zp-entry-title-row .zp-h1', { timeout: 20_000 });
  const portal = await page.evaluate(() => ({
    title: document.querySelector('.zp-entry-title-row .zp-h1')?.textContent?.trim(),
    chip: !!document.querySelector('.zp-content > .zp-card .zp-chip'),
    lines: [...document.querySelectorAll('.zp-sub .zp-sub-line')].map((line) => ({ text: line.textContent?.trim(), display: getComputedStyle(line).display })),
  }));
  assert(!portal.chip, 'portal: user chip remains', portal);
  assert(portal.title === 'خوش آمدید!', 'portal: Persian welcome title is not exact', portal);
  assert(JSON.stringify(portal.lines) === JSON.stringify([
    { text: 'با شماره تماس و کد پیگیری وارد شوید؛', display: 'block' },
    { text: 'اگر کد پیگیری دارید نیازی به ثبت‌نام دوباره نیست', display: 'block' },
  ]), 'portal: Persian subtitle is not the requested two independent lines', portal);
}

async function verifyCourseAndOverlays(page, lang) {
  await page.goto(`${base}/courses`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('h1', { timeout: 20_000 });
  await sleep(650);
  const languageTitle = lang === 'fa' ? 'مشاهده دوره' : 'View course';
  const opened = await page.evaluate((needle) => {
    const button = [...document.querySelectorAll('button')].find((item) => (item.textContent || '').trim() === needle);
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  }, languageTitle);
  assert(opened, `${lang}: a course card could not be opened`);
  await page.waitForSelector('[data-testid="public-course-detail-back"]', { timeout: 12_000 });
  await sleep(350);
  const detailText = await page.$eval('body', (body) => body.innerText);
  assert(!detailText.includes(lang === 'fa' ? 'دوره تخصصی' : 'Specialized Course'), `${lang}: fixed specialized-course detail tag remains visible`);
  assertHeader(await headerState(page, 'public-course-detail-back'), lang, `${lang}: course detail`);

  const initialConsult = await page.$eval('.zk-consult-trigger', (trigger) => {
    const box = trigger.getBoundingClientRect();
    const style = getComputedStyle(trigger);
    const wrap = document.querySelector('.zk-consult-panel-wrap');
    return { height: box.height, width: box.width, padding: style.padding, closedHeight: wrap?.getBoundingClientRect().height || 0 };
  });
  assert(initialConsult.closedHeight < 1, `${lang}: consultation panel is visible while closed`, initialConsult);
  await clickSelector(page, '.zk-consult-trigger', `${lang}: consultation trigger`);
  await page.waitForFunction(() => document.querySelector('.zk-consult-trigger')?.getAttribute('aria-expanded') === 'true', { timeout: 8_000 });
  await sleep(350);
  const openedConsult = await page.$eval('[data-testid="course-consult-panel"]', (panel) => {
    const rect = panel.getBoundingClientRect();
    const copy = panel.querySelector('.zk-consult-panel-copy');
    const icon = panel.querySelector('.zk-consult-panel-icon');
    const cta = panel.querySelector('.zk-swap-cta');
    return {
      width: rect.width,
      height: rect.height,
      backgroundImage: getComputedStyle(panel).backgroundImage,
      copy: !!copy,
      icon: !!icon,
      ctaWidth: cta instanceof HTMLElement ? cta.getBoundingClientRect().width : 0,
    };
  });
  assert(openedConsult.height > 100 && openedConsult.copy && openedConsult.icon && openedConsult.backgroundImage !== 'none', `${lang}: revealed consultation panel did not receive its richer treatment`, openedConsult);
  assert(Math.abs(openedConsult.ctaWidth - (openedConsult.width - 32)) < 2, `${lang}: revealed consultation CTA is not full-width within the panel`, openedConsult);
  await clickSelector(page, '.zk-consult-trigger', `${lang}: close consultation trigger`);
  await page.waitForFunction(() => document.querySelector('.zk-consult-trigger')?.getAttribute('aria-expanded') === 'false', { timeout: 8_000 });
  await sleep(400);
  const closedConsult = await page.$eval('.zk-consult-trigger', (trigger) => {
    const box = trigger.getBoundingClientRect();
    return { height: box.height, width: box.width, padding: getComputedStyle(trigger).padding, closedHeight: document.querySelector('.zk-consult-panel-wrap')?.getBoundingClientRect().height || 0 };
  });
  assert(JSON.stringify({ height: closedConsult.height, width: closedConsult.width, padding: closedConsult.padding }) === JSON.stringify({ height: initialConsult.height, width: initialConsult.width, padding: initialConsult.padding }) && closedConsult.closedHeight < 1, `${lang}: closing consultation changed the closed trigger`, { initialConsult, closedConsult });

  await clickIn(page, '#course-detail-education', (text) => /مشاهده همه|View all/.test(text), `${lang}: all educational content`);
  await page.waitForSelector('[data-testid="public-course-education-back"]', { timeout: 10_000 });
  assertHeader(await headerState(page, 'public-course-education-back'), lang, `${lang}: educational overlay`);
  await clickSelector(page, '[data-testid="public-course-education-back"]', `${lang}: close educational overlay`);
  await waitForAbsent(page, '[data-testid="public-course-education-back"]', `${lang}: educational overlay`);

  await clickIn(page, '#course-detail-faq', (text) => /مشاهده همه|View all/.test(text), `${lang}: all FAQ`);
  await page.waitForSelector('[data-testid="public-course-faq-back"]', { timeout: 10_000 });
  assertHeader(await headerState(page, 'public-course-faq-back'), lang, `${lang}: FAQ overlay`);
  await clickSelector(page, '[data-testid="public-course-faq-back"]', `${lang}: close FAQ overlay`);
  await waitForAbsent(page, '[data-testid="public-course-faq-back"]', `${lang}: FAQ overlay`);

  await page.waitForFunction(() => document.querySelector('#course-detail-reviews')?.textContent?.includes('Fixture parent'), { timeout: 10_000 });
  await clickIn(page, '#course-detail-reviews', (text) => /مشاهده همه|View all/.test(text), `${lang}: all reviews`);
  await page.waitForSelector('[data-testid="public-reviews-back"]', { timeout: 10_000 });
  assertHeader(await headerState(page, 'public-reviews-back'), lang, `${lang}: reviews overlay`);
  await clickSelector(page, '[data-testid="public-reviews-back"]', `${lang}: close reviews overlay`);
  await waitForAbsent(page, '[data-testid="public-reviews-back"]', `${lang}: reviews overlay`);

  await clickSelector(page, '[data-testid="public-course-detail-back"]', `${lang}: close course detail`);
  await waitForAbsent(page, '[data-testid="public-course-detail-back"]', `${lang}: course detail`);
  await page.waitForSelector('[data-course-media-group="experience"]', { timeout: 10_000 });
  await clickIn(page, '[data-course-media-group="experience"]', (text) => /مشاهده همه|View all/.test(text), `${lang}: all parent experiences`);
  await page.waitForSelector('[data-testid="public-course-media-back"]', { timeout: 10_000 });
  assertHeader(await headerState(page, 'public-course-media-back'), lang, `${lang}: parent-experience overlay`);
  await clickSelector(page, '[data-testid="public-course-media-back"]', `${lang}: close parent-experience overlay`);
  await waitForAbsent(page, '[data-testid="public-course-media-back"]', `${lang}: parent-experience overlay`);
}

for (const lang of ['fa', 'en']) {
  const { browser, page } = await withFixturePage(lang);
  try {
    if (lang === 'fa') await verifyPortal(page);
    await verifyCourseAndOverlays(page, lang);
  } catch (error) {
    fail.push(`${lang}: browser test crashed\n${String(error?.stack || error)}`);
  } finally {
    await browser.close();
  }
}

if (fail.length) {
  console.error(`Requested public UI browser contracts failed (${fail.length}):`);
  for (const item of fail) console.error(`- ${item}`);
  process.exit(1);
}
console.log('Requested public UI browser contracts passed in Persian and English.');
