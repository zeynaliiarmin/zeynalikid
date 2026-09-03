/* Keep the management entrance private: only /desk may expose its login screen. */
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const legacyPaths = ['/admin', '/admin/login', '/admin/app'];
const browser = await puppeteer.launch({
  headless: true,
  executablePath,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

try {
  const page = await browser.newPage();
  await page.setBypassServiceWorker(true);
  await page.setCacheEnabled(false);
  await page.evaluateOnNewDocument(() => {
    try { localStorage.clear(); sessionStorage.clear(); } catch { /* storage can be unavailable */ }
  });
  await page.setRequestInterception(true);
  page.on('request', request => {
    if (request.url().includes('/functions/v1/public-settings')) {
      return request.respond({
        status: 200,
        headers: { 'Access-Control-Allow-Origin': '*' },
        contentType: 'application/json',
        body: JSON.stringify({ settings: { publicThemeMode: 'light' } }),
      });
    }
    return request.continue();
  });

  for (const path of legacyPaths) {
    await page.goto(`${base}${path}?legacy-admin-route-check=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.waitForSelector('.zk-nf-page, .nf-page', { timeout: 20_000 });
    const state = await page.evaluate(() => ({
      notFound: !!document.querySelector('.zk-nf-page, .nf-page'),
      login: !!document.querySelector('[aria-label="admin-login"], input[type="password"]'),
    }));
    if (!state.notFound || state.login) throw new Error(`${path} exposed the management login instead of the not-found page: ${JSON.stringify(state)}`);
  }

  await page.goto(`${base}/desk?desk-route-check=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('.zp-root[aria-label="admin-login"]', { timeout: 20_000 });
  const desk = await page.evaluate(() => ({
    login: !!document.querySelector('.zp-root[aria-label="admin-login"]'),
    password: !!document.querySelector('input[type="password"]'),
    notFound: !!document.querySelector('.zk-nf-page, .nf-page'),
  }));
  if (!desk.login || !desk.password || desk.notFound) throw new Error(`/desk did not expose only the intended management login: ${JSON.stringify(desk)}`);

  console.log('Legacy admin routes stay on the not-found page; only /desk exposes the management login.');
} finally {
  await browser.close();
}
