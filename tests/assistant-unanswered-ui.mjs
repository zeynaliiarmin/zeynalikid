/* Browser contract for the owner-reviewed unanswered-question accordion.
   It uses only mocked Edge responses: no live unanswered question is changed. */
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const page = await browser.newPage();
const requests = [];
let unresolved = [
  { id: 41, question: 'هزینه مشاوره چقدر است؟', occurrences: 3, status: 'pending', page_path: '/consultation', last_seen_at: '2026-09-04T10:00:00.000Z', detection_reason: 'low_confidence' },
  { id: 42, question: 'برای اشتهای کودک چه برنامه ای دارید؟', occurrences: 1, status: 'pending', page_path: '/courses', last_seen_at: '2026-09-04T09:00:00.000Z', detection_reason: 'generic_answer' },
];
const assistantSettings = { enabled: true, welcome_message: 'سلام', fallback_message: 'اطلاعی ندارم', disclaimer: 'جایگزین پزشک نیست', suggested_questions: [], frequent_question_threshold: 3 };

try {
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    localStorage.clear(); sessionStorage.clear();
    localStorage.setItem('zk_admin_authed', 'true');
    localStorage.setItem('zk_admin_session_token', 'browser-test-session');
    localStorage.setItem('zk_admin_login_at', String(Date.now()));
    localStorage.setItem('zkid_settings_v2', JSON.stringify({ entryMode: 'user' }));
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (request.method() === 'OPTIONS' && url.includes('/functions/v1/')) return request.respond({ status: 204, headers: cors, body: '' });
    if (url.includes('/functions/v1/admin-session')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ valid: true }) });
    if (url.includes('/functions/v1/admin-api')) {
      const body = JSON.parse(request.postData() || '{}');
      const empty = { submissions: [], questions: [], reviews: [], devices: [], logs: [], total: 0, page: 1, limit: 50 };
      if (body.action === 'list_settings') return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { entryMode: 'user' } }) });
      return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(empty) });
    }
    if (url.includes('/functions/v1/assistant-admin')) {
      const body = JSON.parse(request.postData() || '{}');
      requests.push(body);
      if (body.action === 'list') return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ knowledge: [], adminKnowledge: [], settings: assistantSettings, unanswered: unresolved }) });
      if (body.action === 'telegram_status') return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, status: { configured: { token: true, owner: true, webhook_secret: true }, connected: true, bot: { username: 'fixture' }, webhook: {} } }) });
      if (body.action === 'unanswered_draft') return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, draft: { question: unresolved.find(item => item.id === body.id)?.question || '', aliases: ['قیمت مشاوره چقدر است؟'], keywords: ['هزینه', 'مشاوره'], category: 'سؤال‌های کاربران', response_mode: 'exact', match_mode: 'smart', grouped_occurrences: 4, suggested_answer: 'پیش‌نویس پیشنهادی آزمایشی که هنوز منتشر نشده است.', suggested_answer_notice: 'این فقط پیش‌نویس پیشنهادی است و تا تأیید صریح مالک منتشر نمی‌شود.', owner_notice: 'فقط متن تأییدشده مالک و پس از ذخیره صریح منتشر می‌شود.' } }) });
      if (body.action === 'resolve_unanswered') {
        unresolved = unresolved.filter(item => item.id !== Number(body.id));
        return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, item: { id: 'resolved-fixture', question: 'fixture', answer: body.answer, aliases: body.aliases || [], keywords: body.keywords || [], category: 'سؤال‌های کاربران', status: 'published', is_active: true, created_by: 'owner-unanswered-panel' }, draft: {} }) });
      }
      if (body.action === 'clear_unanswered') { const archived = unresolved.length; unresolved = []; return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, archived }) }); }
      return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true }) });
    }
    if (url.includes('/functions/v1/public-settings')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { entryMode: 'user' } }) });
    if (url.includes('/functions/v1/assistant-public')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { enabled: false }, knowledge: [] }) });
    return request.continue();
  });

  await page.goto(`${base}/desk/app`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForFunction(() => [...document.querySelectorAll('button')].some(item => (item.textContent || '').trim() === 'دستیار'), { timeout: 25_000 });
  await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find(item => (item.textContent || '').trim() === 'دستیار');
    if (!(button instanceof HTMLButtonElement)) throw new Error('assistant navigation button missing');
    button.click();
  });
  await page.waitForSelector('[data-testid="assistant-manager"]', { timeout: 25_000 });
  await page.waitForSelector('.zkam-unanswered-item', { timeout: 25_000 });
  const initial = await page.$$eval('.zkam-unanswered-item', nodes => nodes.length);
  if (initial !== 2) throw new Error(`expected two pending accordion entries, got ${initial}`);

  await page.$eval('.zkam-unanswered-item summary', node => node.click());
  await page.waitForSelector('[data-testid="assistant-unanswered-answer-41"]', { timeout: 10_000 });
  await page.$eval('.zkam-unanswered-item button', node => {
    const buttons = [...node.parentElement.querySelectorAll('button')];
    const candidate = buttons.find(item => (item.textContent || '').includes('دریافت پیشنهادهای یار بررسی'));
    if (!(candidate instanceof HTMLButtonElement)) throw new Error('draft button missing');
    candidate.click();
  });
  await page.waitForFunction(() => [...document.querySelectorAll('.zkam-unanswered-item textarea')].some(item => item.value.includes('قیمت مشاوره')),{ timeout: 10_000 });
  const suggested = await page.evaluate(() => ({
    shown: document.body.innerText.includes('پیش‌نویس پیشنهادی آزمایشی که هنوز منتشر نشده است.'),
    answer: document.querySelector('[data-testid="assistant-unanswered-answer-41"]')?.value || '',
  }));
  if (!suggested.shown || suggested.answer) throw new Error(`draft suggestion must remain non-publishing and out of the answer field: ${JSON.stringify(suggested)}`);
  await page.click('[data-testid="assistant-unanswered-answer-41"]');
  await page.type('[data-testid="assistant-unanswered-answer-41"]', 'برای اطلاع از هزینه، درخواست مشاوره را ثبت کنید.');
  await page.$eval('[data-testid="assistant-resolve-unanswered-41"]', node => node.click());
  // `load()` briefly renders the manager loading state. Wait for the post-refresh
  // controls as well as removal of the resolved item, rather than sampling that gap.
  await page.waitForFunction(() => !document.querySelector('[data-testid="assistant-resolve-unanswered-41"]') && !!document.querySelector('[data-testid="assistant-clear-unanswered"]'), { timeout: 12_000 });
  const resolvedCall = requests.find(item => item.action === 'resolve_unanswered');
  if (!resolvedCall || resolvedCall.answer !== 'برای اطلاع از هزینه، درخواست مشاوره را ثبت کنید.') throw new Error(`owner answer was not sent unchanged: ${JSON.stringify(resolvedCall)}`);
  if (requests.some(item => item.action === 'save' && item.created_by === 'automatic')) throw new Error('the panel attempted automatic publication');

  await page.$eval('[data-testid="assistant-clear-unanswered"]', node => node.click());
  await page.waitForFunction(() => document.body.innerText.includes('فقط سؤال‌های در انتظار پاسخ همین سایت'), { timeout: 8_000 });
  await page.$eval('[data-testid="assistant-clear-unanswered"]', node => node.click());
  await page.waitForFunction(() => document.body.innerText.includes('موردی در انتظار پاسخ نیست'), { timeout: 12_000 });
  if (!requests.some(item => item.action === 'clear_unanswered')) throw new Error('archive-all action was not called after explicit confirmation');

  console.log('Owner-reviewed unanswered accordion browser contract passed.');
} finally {
  await browser.close();
}
