/* Browser regression for route-top navigation and history-based viewport restoration.
   Run with: TEST_BASE_URL=http://127.0.0.1:4173 node tests/scroll-restoration-ui.mjs */
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const failures = [];

function assert(condition, message, detail) {
  if (!condition) failures.push(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`);
}

async function position(page) {
  return page.evaluate(() => ({
    path: window.location.pathname,
    x: window.scrollX,
    y: window.scrollY,
    maxY: Math.max(0, document.documentElement.scrollHeight - window.innerHeight),
    restoration: window.history.scrollRestoration,
    state: window.history.state,
  }));
}

async function setSourceScroll(page, preferred = 620) {
  await page.evaluate((target) => window.scrollTo(0, Math.min(target, Math.max(0, document.documentElement.scrollHeight - window.innerHeight))), preferred);
  await sleep(130);
  const state = await position(page);
  assert(state.y > 120, 'source route is not long enough for the scroll-restoration scenario', state);
  return state.y;
}

function assertTop(state, label) {
  assert(state.path && state.y <= 2, `${label}: the destination did not open at its top`, state);
}

function assertRestored(state, expectedY, label) {
  assert(Math.abs(state.y - expectedY) <= 3, `${label}: previous viewport was not restored`, { expectedY, state });
}

async function openMenu(page) {
  await page.click('[aria-label="باز کردن منو"], [aria-label="Open menu"]');
  await page.waitForSelector('aside[aria-label]', { timeout: 10_000 });
}

async function navigateWithMenuLink(page, href) {
  await openMenu(page);
  const selector = `aside a[href="${href}"]`;
  await page.waitForSelector(selector, { timeout: 10_000 });
  await page.click(selector);
  await page.waitForFunction((expected) => window.location.pathname === expected, { timeout: 10_000 }, href);
  await sleep(220);
}

async function navigateWithMenuAction(page, text, expectedPath) {
  await openMenu(page);
  const clicked = await page.$$eval('aside button', (buttons, needle) => {
    const button = buttons.find((item) => (item.textContent || '').trim().includes(needle));
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  }, text);
  assert(clicked, `menu action “${text}” was not found`);
  await page.waitForFunction((expected) => window.location.pathname === expected, { timeout: 10_000 }, expectedPath);
  await sleep(220);
}

async function openInitialEducation(page) {
  await page.goto(`${base}/education`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('.zke-root', { timeout: 20_000 });
  await sleep(650);
}

const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  await page.setBypassServiceWorker(true);
  await page.evaluateOnNewDocument(() => {
    const fixture = { entryMode: 'user', showLicensesPage: true };
    let preloaded;
    Object.defineProperty(window, '__APP_SSG_SETTINGS__', {
      configurable: true,
      get: () => preloaded,
      set: (value) => {
        preloaded = value && typeof value === 'object' && !Array.isArray(value)
          ? { ...value, ...fixture }
          : fixture;
      },
    });
    localStorage.clear();
    sessionStorage.clear();
    localStorage.setItem('zkid_lang', JSON.stringify('fa'));
    localStorage.setItem('zkid_settings_v2', JSON.stringify(fixture));
  });
  await page.setRequestInterception(true);
  page.on('request', (request) => {
    const url = request.url();
    const cors = { 'access-control-allow-origin': '*' };
    if (url.includes('/functions/v1/public-settings')) {
      return request.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ settings: { entryMode: 'user', showLicensesPage: true } }) });
    }
    if (url.includes('/functions/v1/assistant-public')) {
      return request.respond({ status: 200, contentType: 'application/json', headers: cors, body: JSON.stringify({ knowledge: [], settings: { enabled: false } }) });
    }
    return request.continue();
  });

  // A Link in the hamburger menu starts the new route at the top, while browser Back
  // restores the exact scroll coordinate of the previous public route.
  await openInitialEducation(page);
  const browserBackY = await setSourceScroll(page);
  await navigateWithMenuLink(page, '/licenses');
  assertTop(await position(page), 'hamburger Link');
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForFunction(() => window.location.pathname === '/education', { timeout: 10_000 });
  await sleep(520);
  assertRestored(await position(page), browserBackY, 'browser/device Back');

  // The shared visible project return control must follow the same history entry.
  const projectBackY = await setSourceScroll(page, 700);
  await navigateWithMenuLink(page, '/licenses');
  assertTop(await position(page), 'licenses route through hamburger Link');
  await page.waitForSelector('[data-testid="public-back"]', { timeout: 10_000 });
  await page.click('[data-testid="public-back"]');
  await page.waitForFunction(() => window.location.pathname === '/education', { timeout: 10_000 });
  await sleep(520);
  assertRestored(await position(page), projectBackY, 'project Back control');

  // A direct visit must not use the browser's unrelated previous document. The
  // Courses header is representative of public pages with a safe home fallback.
  await page.goto(`${base}/courses`, { waitUntil: 'domcontentloaded', timeout: 45_000 });
  await page.waitForSelector('[data-testid="public-back"]', { timeout: 20_000 });
  await page.waitForFunction(() => !document.querySelector('.zk-launch'), { timeout: 5_000 });
  const directCourseState = await position(page);
  assert(!Number(directCourseState.state?.idx), 'direct course visit unexpectedly has an in-app history entry', directCourseState);
  await page.click('[data-testid="public-back"]');
  await page.waitForFunction(() => window.location.pathname === '/', { timeout: 10_000 });
  await sleep(180);
  assertTop(await position(page), 'direct course fallback');

  // Menu actions using the app-level setView path follow the same policy.
  await openInitialEducation(page);
  const setViewBackY = await setSourceScroll(page, 760);
  await navigateWithMenuAction(page, 'فرم مشاوره', '/form');
  assertTop(await position(page), 'hamburger setView action');
  await page.goBack({ waitUntil: 'domcontentloaded', timeout: 20_000 });
  await page.waitForFunction(() => window.location.pathname === '/education', { timeout: 10_000 });
  await sleep(520);
  assertRestored(await position(page), setViewBackY, 'setView browser Back');

  // Native in-page detail history entries keep the source coordinate too. Education
  // always includes the built-in preview cards, so this remains independent of live
  // course content and exercises the same merge-safe overlay history contract.
  await openInitialEducation(page);
  const detailY = await setSourceScroll(page, 360);
  const opened = await page.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((item) => (item.textContent || '').trim() === 'مشاهده جزئیات');
    if (!(button instanceof HTMLButtonElement)) return false;
    button.click();
    return true;
  });
  assert(opened, 'education detail trigger was not found');
  await page.waitForSelector('[data-testid="public-education-detail-back"]', { timeout: 12_000 });
  await sleep(760);
  assertTop(await position(page), 'education detail');
  await page.click('[data-testid="public-education-detail-back"]');
  await page.waitForFunction(() => !document.querySelector('[data-testid="public-education-detail-back"]'), { timeout: 10_000 });
  await sleep(520);
  assertRestored(await position(page), detailY, 'in-page education detail Back');
} catch (error) {
  failures.push(`browser scenario crashed\n${String(error?.stack || error)}`);
} finally {
  await browser.close();
}

if (failures.length) {
  console.error(`Scroll-restoration browser contracts failed (${failures.length}):`);
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}
console.log('New public routes start at top; browser, device and project Back restore the prior viewport.');
