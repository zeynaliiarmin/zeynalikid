/* Browser contract for independent /portal and /track routes plus the public header avatar.
   Run with: TEST_BASE_URL=http://127.0.0.1:4173 node tests/entry-mode-routing-ui.mjs */
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const cors = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS' };
const browser = await puppeteer.launch({ headless: true, executablePath, args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'] });
const fail = [];
const assert = (condition, message, detail = null) => { if (!condition) fail.push(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`); };

async function pageFor(entryMode, signedIn = false) {
  const context = await browser.createBrowserContext();
  const page = await context.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  page.on('request', request => {
    const url = request.url();
    if (request.method() === 'OPTIONS' && url.includes('/functions/v1/')) return request.respond({ status: 204, headers: cors, body: '' });
    if (url.includes('/functions/v1/public-settings')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { entryMode, userPortal: { otpMode: 'test', captchaEnabled: false } } }) });
    if (url.includes('/functions/v1/assistant-public')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(new URL(url).searchParams.get('status') === '1' ? { enabled: false, revision: 1, updated_at: '' } : { settings: { enabled: false }, knowledge: [] }) });
    if (url.includes('/functions/v1/user-portal')) return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, items: [], advisorName: '' }) });
    return request.continue();
  });
  await page.evaluateOnNewDocument((mode, hasSession) => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage can be unavailable before navigation */ }
    const settings = { entryMode: mode, userPortal: { otpMode: 'test', captchaEnabled: false } };
    let preloaded;
    Object.defineProperty(window, '__APP_SSG_SETTINGS__', {
      configurable: true,
      get: () => preloaded,
      set: value => { preloaded = value && typeof value === 'object' && !Array.isArray(value) ? { ...value, ...settings } : settings; },
    });
    localStorage.setItem('zkid_settings_v2', JSON.stringify(settings));
    if (hasSession) sessionStorage.setItem('zk_portal_session', JSON.stringify({ phone: '+989120000000', fullName: 'کاربر آزمایشی', code: 'ZK-TEST01' }));
  }, entryMode, signedIn);
  return { context, page };
}

async function open(page, path, selector) {
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector(selector, { timeout: 25_000 });
  await page.waitForSelector('[data-testid="header-user-control"]', { timeout: 25_000 });
}

async function clickAndWaitPath(page, expectedPath) {
  await page.$eval('[data-testid="header-user-control"]', node => node.click());
  await page.waitForFunction(path => location.pathname === path, { timeout: 12_000 }, expectedPath);
}

// The two URLs are independent regardless of the chosen public-entry preference.
for (const mode of ['user', 'track']) {
  const { context, page } = await pageFor(mode, false);
  try {
    await open(page, '/portal', '[aria-label="user-portal"]');
    const portal = await page.evaluate(() => ({
      portal: !!document.querySelector('[aria-label="user-portal"]'),
      track: !!document.querySelector('[aria-label="track-page"]'),
      avatar: document.querySelector('[data-testid="header-user-control"]')?.getAttribute('aria-label') || '',
    }));
    assert(portal.portal && !portal.track, `${mode}: /portal is not permanently the user portal`, portal);
    assert(mode === 'user' ? /پنل|parent/i.test(portal.avatar) : /پیگیری|track/i.test(portal.avatar), `${mode}: portal header avatar does not target the active entry page`, portal);
    await clickAndWaitPath(page, mode === 'user' ? '/portal' : '/track');

    await open(page, '/track', '[aria-label="track-page"]');
    const track = await page.evaluate(() => ({
      portal: !!document.querySelector('[aria-label="user-portal"]'),
      track: !!document.querySelector('[aria-label="track-page"]'),
      avatar: document.querySelector('[data-testid="header-user-control"]')?.getAttribute('aria-label') || '',
    }));
    assert(track.track && !track.portal, `${mode}: /track is not permanently the tracking page`, track);

    for (const route of ['/', '/courses', '/portal', '/track']) {
      await page.goto(`${base}${route}`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
      await page.waitForSelector('[data-testid="header-user-control"]', { timeout: 25_000 });
      assert(await page.$('[data-testid="header-user-control"]') !== null, `${mode}: public fixed header avatar is missing on ${route}`);
    }
  } finally { await context.close(); }
}

// A signed-in owner gets the exact special behavior only while already at /portal.
{
  const { context, page } = await pageFor('user', true);
  try {
    await open(page, '/portal', '[aria-label="user-portal"]');
    const before = await page.$eval('[data-testid="header-user-control"]', node => node.getAttribute('aria-label'));
    assert(/خروج|log out/i.test(before || ''), 'signed-in /portal avatar is not converted to logout', { before });
    await clickAndWaitPath(page, '/');
    const signedOut = await page.evaluate(() => sessionStorage.getItem('zk_portal_session'));
    assert(signedOut === null, 'portal logout avatar did not clear the portal session');

    await open(page, '/courses', 'h1');
    await clickAndWaitPath(page, '/portal');
  } finally { await context.close(); }
}

{
  const { context, page } = await pageFor('track', true);
  try {
    await open(page, '/courses', 'h1');
    const label = await page.$eval('[data-testid="header-user-control"]', node => node.getAttribute('aria-label'));
    assert(/پیگیری|track/i.test(label || ''), 'tracking preference does not retarget a signed-in outside-portal avatar', { label });
    await clickAndWaitPath(page, '/track');
  } finally { await context.close(); }
}

await browser.close();
if (fail.length) {
  console.error(`Entry-mode routing browser contracts failed (${fail.length}):`);
  for (const item of fail) console.error(`  – ${item}`);
  process.exit(1);
}
console.log('Independent portal/tracking routes and public header avatar browser contracts passed.');
