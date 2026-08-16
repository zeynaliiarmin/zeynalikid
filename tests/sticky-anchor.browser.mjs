import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const settings = {
  version: 2,
  courseTabs: [{
    id: 'height',
    title: 'رشد',
    active: true,
    courses: [{
      id: 'sticky-course-test',
      title: 'دوره تست ناوبری چسبنده',
      titleEn: 'Sticky navigation test course',
      active: true,
      price: '۱۰۰',
      desc: 'معرفی کامل دوره برای آزمون ناوبری چسبنده و اسکرول خودکار بخش‌ها.',
      features: ['بخش اول', 'بخش دوم', 'بخش سوم', 'بخش چهارم'],
    }],
  }],
  products: {
    showSection: true,
    list: [{
      id: 'sticky-product-test',
      name: 'محصول تست ناوبری چسبنده',
      title: 'Sticky navigation test product',
      active: true,
      isVisible: true,
      price: '۱۰۰',
      description: 'معرفی کامل محصول برای آزمون ناوبری چسبنده.',
      features: ['ویژگی اول', 'ویژگی دوم', 'ویژگی سوم', 'ویژگی چهارم', 'ویژگی پنجم'],
    }],
  },
};

const reviews = Array.from({ length: 12 }, (_, index) => ({
  id: index + 1,
  course_id: index < 7 ? 'sticky-course-test' : 'sticky-product-test',
  course_ids: [index < 7 ? 'sticky-course-test' : 'sticky-product-test'],
  reviewer_name: `نظر ${index + 1}`,
  rating: 5,
  comment: 'متن نظر برای ایجاد ارتفاع واقعی و آزمون اسکرول دستی در صفحه جزئیات.',
  status: 'approved',
  placements: [index < 7 ? 'course_detail' : 'product_detail'],
  phone_country: '+98',
  public_phone: '09123xxxx67',
  created_at: `2026-07-${String(index + 1).padStart(2, '0')}T12:00:00.000Z`,
}));

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const runtimeErrors = [];
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
page.on('pageerror', (error) => runtimeErrors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = request.url();
  const respondJson = (body) => request.respond({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(body),
  });
  try {
    if (url.includes('mock.supabase.co/functions/v1/public-settings')) return respondJson({ settings });
    if (url.includes('mock.supabase.co/rest/v1/reviews')) return respondJson(reviews);
    if (url.includes('mock.supabase.co/rest/v1/')) return respondJson([]);
    return request.continue();
  } catch {
    try { await request.abort(); } catch {}
  }
});

const clickText = (selector, text) => page.evaluate(({ selector, text }) => {
  const element = [...document.querySelectorAll(selector)].find((node) => node.textContent?.includes(text));
  if (!(element instanceof HTMLElement)) throw new Error(`not found: ${text}`);
  element.click();
}, { selector, text });

const waitVisible = (visible) => page.waitForFunction(
  (expected) => document.querySelector('[data-sticky-anchor-nav]')?.getAttribute('data-visible') === String(expected),
  { timeout: 10_000 },
  visible,
);

const assertSectionOffset = async (sectionId) => {
  await page.waitForFunction((id) => {
    const nav = document.querySelector('[data-sticky-anchor-nav]');
    const section = document.getElementById(id);
    if (!nav || !section) return false;
    const gap = section.getBoundingClientRect().top - nav.getBoundingClientRect().bottom;
    return gap >= 7 && gap <= 30;
  }, { timeout: 5_000 }, sectionId);
};

try {
  // Course detail: window scroll root, RTL, all sections in one continuous DOM.
  await page.goto(`${baseUrl}/courses`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('دوره تست ناوبری چسبنده'), { timeout: 20_000 });
  await clickText('article', 'دوره تست ناوبری چسبنده');
  await page.waitForSelector('#course-detail-faq');
  await page.waitForSelector('[data-review-id="1"]');

  const courseInitial = await page.evaluate(() => ({
    visible: document.querySelector('[data-sticky-anchor-nav]')?.getAttribute('data-visible'),
    sections: ['intro', 'syllabus', 'reviews', 'faq'].map((part) => Boolean(document.getElementById(`course-detail-${part}`))),
    faqTitle: document.querySelector('#course-detail-faq h2')?.textContent,
    direction: document.querySelector('[data-sticky-anchor-nav] > div')?.getAttribute('dir'),
  }));
  assert(courseInitial.visible === 'false', 'course nav must be hidden at the top');
  assert(courseInitial.sections.every(Boolean), 'course sections are not rendered continuously');
  assert(courseInitial.faqTitle === 'پرسش‌های متداول', 'course FAQ title was not renamed exactly');
  assert(courseInitial.direction === 'rtl', 'course navigation is not RTL in Persian');

  await page.evaluate(() => {
    const trigger = document.querySelector('[data-sticky-anchor-trigger]');
    if (trigger) window.scrollBy({ top: trigger.getBoundingClientRect().top - 90, behavior: 'auto' });
  });
  await waitVisible(true);
  await page.click('[data-anchor-target="course-detail-syllabus"]');
  await page.waitForFunction(() => document.querySelector('[data-anchor-target="course-detail-syllabus"]')?.getAttribute('aria-current') === 'location');
  await new Promise((resolve) => setTimeout(resolve, 600));
  await assertSectionOffset('course-detail-syllabus');

  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' }));
  await page.waitForFunction(() => document.querySelector('[data-anchor-target="course-detail-faq"]')?.getAttribute('aria-current') === 'location');
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'auto' }));
  await waitVisible(false);

  // Switch language while the same component remains mounted to verify LTR labels/direction.
  await page.evaluate(() => {
    localStorage.setItem('zkid_lang', '"en"');
    window.dispatchEvent(new StorageEvent('storage', { key: 'zkid_lang', newValue: '"en"' }));
  });
  await page.waitForFunction(() => document.querySelector('[data-sticky-anchor-nav] > div')?.getAttribute('dir') === 'ltr');

  // Product detail: modal scroll root, continuous sections and independent scroll spy.
  await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('Sticky navigation test product'), { timeout: 20_000 });
  await clickText('article', 'Sticky navigation test product');
  await page.waitForSelector('#product-detail-faq');
  await page.waitForSelector('[data-review-id="8"]');

  const productInitial = await page.evaluate(() => ({
    visible: document.querySelector('[data-sticky-anchor-nav]')?.getAttribute('data-visible'),
    sections: ['intro', 'specs', 'reviews', 'faq'].map((part) => Boolean(document.getElementById(`product-detail-${part}`))),
    direction: document.querySelector('[data-sticky-anchor-nav] > div')?.getAttribute('dir'),
  }));
  assert(productInitial.visible === 'false', 'product nav must be hidden at modal top');
  assert(productInitial.sections.every(Boolean), 'product sections are not rendered continuously');
  assert(productInitial.direction === 'ltr', 'product navigation is not LTR in English');

  await page.evaluate(() => {
    const trigger = document.querySelector('[data-sticky-anchor-trigger]');
    let root = trigger?.parentElement;
    while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (!(root instanceof HTMLElement) || !trigger) throw new Error('product modal scroll root not found');
    root.scrollBy({ top: trigger.getBoundingClientRect().top - root.getBoundingClientRect().top - 30, behavior: 'auto' });
  });
  await waitVisible(true);
  await page.evaluate(() => (document.querySelector('[data-anchor-target="product-detail-specs"]'))?.click());
  await page.waitForFunction(() => document.querySelector('[data-anchor-target="product-detail-specs"]')?.getAttribute('aria-current') === 'location');
  await new Promise((resolve) => setTimeout(resolve, 600));
  await assertSectionOffset('product-detail-specs');

  await page.evaluate(() => {
    const trigger = document.querySelector('[data-sticky-anchor-trigger]');
    let root = trigger?.parentElement;
    while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (!(root instanceof HTMLElement)) throw new Error('product modal scroll root not found');
    root.scrollTo({ top: root.scrollHeight, behavior: 'auto' });
  });
  await page.waitForFunction(() => document.querySelector('[data-anchor-target="product-detail-faq"]')?.getAttribute('aria-current') === 'location');
  const activeButtonInView = await page.evaluate(() => {
    const button = document.querySelector('[data-anchor-target="product-detail-faq"]');
    const scroller = document.querySelector('[data-sticky-anchor-nav] > div');
    if (!button || !scroller) return false;
    const buttonRect = button.getBoundingClientRect();
    const scrollerRect = scroller.getBoundingClientRect();
    return buttonRect.left >= scrollerRect.left - 2 && buttonRect.right <= scrollerRect.right + 2;
  });
  assert(activeButtonInView, 'active LTR tab was not scrolled into view');

  await page.evaluate(() => {
    const trigger = document.querySelector('[data-sticky-anchor-trigger]');
    let root = trigger?.parentElement;
    while (root && !/(auto|scroll|overlay)/.test(getComputedStyle(root).overflowY)) root = root.parentElement;
    if (root instanceof HTMLElement) root.scrollTo({ top: 0, behavior: 'auto' });
  });
  await waitVisible(false);

  assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(' | ')}`);
  console.log(JSON.stringify({
    ok: true,
    course: { scrollRoot: 'window', sections: 4, rtl: true, hideOnReturn: true },
    product: { scrollRoot: 'modal', sections: 4, ltr: true, hideOnReturn: true },
    smoothOffset: true,
    scrollSpy: true,
    runtimeErrors: 0,
  }, null, 2));
} finally {
  await browser.close();
}
