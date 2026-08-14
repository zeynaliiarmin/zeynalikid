import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const settings = {
  version: 2,
  courseTabs: [{ id: 'height', title: 'رشد', active: true, courses: [{ id: 'course-review-test', title: 'دوره تست نظرات', active: true, price: '۱۰۰' }] }],
  products: { showSection: true, list: [{ id: 'product-review-test', name: 'محصول تست نظرات', title: 'محصول تست نظرات', active: true, isVisible: true, price: '۱۰۰' }] },
};
const publicReviews = [
  { id: 1, course_id: 'course-review-test', course_ids: ['course-review-test'], reviewer_name: 'نظر جدید', rating: 5, comment: 'متن نظر جدید', status: 'approved', placements: ['course_detail'], phone_country: '+98', public_phone: '09193xxxx69', created_at: '2026-07-01T12:00:00.000Z' },
  { id: 2, course_id: 'course-review-test', course_ids: ['course-review-test'], reviewer_name: 'نظر قدیمی', rating: 4, comment: 'متن نظر قدیمی', status: 'approved', placements: ['course_detail'], phone_country: '+1', public_phone: '12127xxxx84', created_at: '2025-04-01T12:00:00.000Z' },
  { id: 3, course_id: 'product-review-test', course_ids: ['product-review-test'], reviewer_name: 'نظر محصول', rating: 3, comment: 'متن نظر محصول', status: 'approved', placements: ['product_detail'], phone_country: '+44', public_phone: '44770xxxx00', created_at: '2025-05-01T12:00:00.000Z' },
];
const adminReviews = publicReviews.map((review) => ({ ...review, phone: review.id === 1 ? '+989193123469' : review.public_phone }));
let createdAdminReview = null;
const runtimeErrors = [];
const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
page.on('pageerror', (error) => runtimeErrors.push(String(error)));
page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = request.url();
  const respondJson = (body) => request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(body) });
  try {
    if (url.includes('mock.supabase.co/functions/v1/public-settings')) return respondJson({ settings });
    if (url.includes('mock.supabase.co/functions/v1/admin-session')) return respondJson({ valid: true, ownerPhone: '***' });
    if (url.includes('mock.supabase.co/functions/v1/admin-api')) {
      const body = JSON.parse(request.postData() || '{}');
      if (body.action === 'list_settings') return respondJson({ settings });
      if (body.action === 'list_submissions') return respondJson({ submissions: [], total: 0, page: 1, limit: 100 });
      if (body.action === 'list_reviews') return respondJson({ reviews: adminReviews, total: adminReviews.length, page: 1, limit: 100 });
      if (body.action === 'create_review') {
        createdAdminReview = body;
        return respondJson({ review: { ...body, id: 99 } });
      }
      return respondJson({});
    }
    if (url.includes('mock.supabase.co/rest/v1/reviews')) return respondJson(publicReviews);
    if (url.includes('mock.supabase.co/rest/v1/')) return respondJson([]);
    return request.continue();
  } catch {
    try { await request.abort(); } catch {}
  }
});

const assert = (condition, message) => { if (!condition) throw new Error(message); };
const clickByText = async (selector, text) => page.evaluate(({ selector, text }) => {
  const element = [...document.querySelectorAll(selector)].find((node) => node.textContent?.includes(text));
  if (!(element instanceof HTMLElement)) throw new Error(`not found: ${text}`);
  element.click();
}, { selector, text });

try {
  await page.goto(`${baseUrl}/courses`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('دوره تست نظرات'), { timeout: 20_000 });
  await clickByText('article', 'دوره تست نظرات');
  await clickByText('button', 'نظرات');
  await page.waitForSelector('[data-review-id="1"]', { timeout: 20_000 });

  const defaultCourse = await page.evaluate(() => ({
    first: document.querySelector('[data-review-id]')?.getAttribute('data-review-id'),
    phones: [...document.querySelectorAll('[data-public-review-phone]')].map((node) => node.textContent || ''),
    text: document.body.innerText,
  }));
  assert(defaultCourse.first === '1', 'public reviews were not newest-first by default');
  assert(defaultCourse.phones.some((phone) => phone.includes('🇮🇷') && phone.includes('09193xxxx69')), 'Iran masked phone/flag missing');
  assert(defaultCourse.phones.some((phone) => phone.includes('🇺🇸') && phone.includes('12127xxxx84')), 'international masked phone/flag missing');
  assert(!defaultCourse.text.includes('+989193123469'), 'full phone leaked into public DOM');
  assert(defaultCourse.text.includes('تاریخ ثبت:'), 'Persian review date is missing');

  await page.select('label select', 'oldest');
  const oldestFirst = await page.$eval('[data-review-id]', (node) => node.getAttribute('data-review-id'));
  assert(oldestFirst === '2', 'oldest public sort did not work');

  await page.goto(`${baseUrl}/products`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('محصول تست نظرات'), { timeout: 20_000 });
  await clickByText('article', 'محصول تست نظرات');
  await clickByText('button', 'نظرات');
  await page.waitForSelector('[data-review-id="3"]', { timeout: 20_000 });
  const productReviewIds = await page.$$eval('[data-review-id]', (nodes) => nodes.map((node) => node.getAttribute('data-review-id')));
  assert(JSON.stringify(productReviewIds) === JSON.stringify(['3']), 'product detail did not isolate product_detail reviews');

  await page.evaluate(() => {
    sessionStorage.setItem('zk_admin_session_token', 'browser-test-token');
    sessionStorage.setItem('zk_admin_authed', 'true');
    sessionStorage.setItem('zk_admin_device_id', 'browser-test-device');
  });
  await page.goto(`${baseUrl}/admin/app`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('نظرات کاربران'), { timeout: 20_000 });
  await clickByText('button', 'نظرات کاربران');
  await page.waitForFunction(() => document.body.innerText.includes('+989193123469'), { timeout: 20_000 });
  const adminText = await page.evaluate(() => document.body.innerText);
  assert(adminText.includes('+989193123469'), 'admin did not show the user full phone');

  await clickByText('button', 'افزودن نظر جدید دستی');
  await page.waitForFunction(() => document.body.innerText.includes('تاریخ ثبت نظر (هجری شمسی)'), { timeout: 20_000 });
  const modalState = await page.evaluate(() => {
    const heading = [...document.querySelectorAll('h3')].find((node) => node.textContent?.includes('افزودن نظر جدید'));
    const modal = heading?.closest('div[style*="position: fixed"]') || heading?.parentElement?.parentElement?.parentElement;
    const labels = [...(modal?.querySelectorAll('label') || [])];
    const phoneLabel = labels.find((label) => label.textContent?.includes('شماره نمایشی دستی'));
    const dateLabel = labels.find((label) => label.textContent?.includes('تاریخ ثبت نظر'));
    const phone = phoneLabel?.parentElement?.querySelector('input');
    const date = dateLabel?.parentElement?.querySelector('input');
    return { phone: phone?.value || '', date: date?.value || '', text: modal?.textContent || '' };
  });
  assert(/^\d{5}x{4}\d{2}$/.test(modalState.phone), 'manual phone is not one masked field');
  assert(/^14\d{2}\/\d{2}\/\d{2}$/.test(modalState.date), 'manual date is not Persian-calendar input');
  assert(modalState.text.includes('جزئیات دوره') && modalState.text.includes('جزئیات محصول'), 'allowed placements missing');
  for (const removed of ['صفحه اصلی', 'فرم مشاوره', 'سوالات و تجربیات', 'درباره ما و متد', 'صفحه پیگیری نوبت']) {
    assert(!modalState.text.includes(removed), `removed placement still exists: ${removed}`);
  }

  await page.type('[data-testid="manual-review-name"]', 'نظر دستی تست');
  await page.type('[data-testid="manual-review-comment"]', 'متن نظر دستی تست');
  await page.click('[data-testid="manual-review-submit"]');
  const deadline = Date.now() + 10_000;
  while (!createdAdminReview && Date.now() < deadline) await new Promise((resolve) => setTimeout(resolve, 30));
  assert(createdAdminReview?.action === 'create_review', 'manual review did not use authenticated admin create');
  assert(/^\d{5}x{4}\d{2}$/.test(createdAdminReview?.phone || ''), 'manual masked phone was not sent');
  assert(createdAdminReview?.phone_country === '+98', 'manual phone country was not sent');
  assert(JSON.stringify(createdAdminReview?.placements) === JSON.stringify(['course_detail']), 'manual review sent a removed placement');
  assert(!Number.isNaN(Date.parse(createdAdminReview?.created_at || '')), 'manual Persian date was not converted for storage');

  assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(' | ')}`);
  console.log(JSON.stringify({ ok: true, courseReviews: 2, productReviews: 1, publicFullPhoneLeaks: 0, adminFullPhoneVisible: true, runtimeErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
