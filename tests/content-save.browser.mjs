import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const freshCode = 'https://www.youtube.com/embed/immediate-save-value';
const freshAudio = 'https://cdn.test/immediate-audio.mp3';
const freshImage = 'https://cdn.test/immediate-image.jpg';
const freshText = 'متن جدیدی که درست قبل از ذخیره وارد شد';
const aparatEmbed = '<style>.h_iframe-aparat_embed_frame{position:relative}.h_iframe-aparat_embed_frame iframe{position:absolute;inset:0;width:100%;height:100%}</style><div class="h_iframe-aparat_embed_frame"><span style="display:block;padding-top:57%"></span><iframe src="https://www.aparat.com/video/video/embed/videohash/browsertest/vt/frame" allowFullScreen="true"></iframe></div>';
let currentSettings = {
  version: 2,
  education: {
    items: [{
      id: 'edu-browser-test',
      title: 'آیتم تست ذخیره فوری',
      description: 'Browser-only mocked item',
      type: 'video',
      youtubeCode: 'https://www.youtube.com/embed/old-value',
      aparatCode: '',
      mediaCategory: 'experience',
      active: true,
      order: 1,
    }, {
      id: 'edu-audio-test', title: 'آیتم تست ویس فوری', type: 'audio', externalCode: 'https://old.test/audio.mp3', active: true, order: 2,
    }, {
      id: 'edu-image-test', title: 'آیتم تست عکس فوری', type: 'image', externalCode: 'https://old.test/image.jpg', active: true, order: 3,
    }, {
      id: 'edu-text-test', title: 'آیتم تست متن فوری', type: 'text', body: 'متن قدیمی', active: true, order: 4,
    }],
  },
  experience: { items: [{ id: 'experience-aparat-test', title: 'ویدیوی مستقیم تجربه', type: 'video', aparatCode: aparatEmbed, mediaCategories: ['experience'], active: true, order: 2 }] },
  experienceTabs: { video: true, audio: true, image: true, text: true },
  mediaItems: [{ id: 'generic-aparat-test', title: 'ویدیوی آپارات چندرسانه‌ای', type: 'video', platforms: { aparat: aparatEmbed }, categories: ['parent-experience', 'growth'], isVisible: true, order: 1 }],
  customPlatforms: [],
  mediaCountryMode: 'iran',
};
const saves = [];
let listSettingsCount = 0;
const runtimeErrors = [];

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
page.on('pageerror', (error) => runtimeErrors.push(String(error)));
page.on('console', (message) => {
  if (message.type() === 'error') runtimeErrors.push(`console: ${message.text()}`);
});

await page.setRequestInterception(true);
page.on('request', async (request) => {
  const url = request.url();
  const json = (status, body) => request.respond({
    status,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify(body),
  });
  try {
    if (url.includes('mock.supabase.co/functions/v1/admin-session')) {
      const body = JSON.parse(request.postData() || '{}');
      if (body.action === 'validate_session') return json(200, { valid: true, ownerPhone: '***' });
      return json(200, { ok: true, devices: [] });
    }
    if (url.includes('mock.supabase.co/functions/v1/admin-api')) {
      const body = JSON.parse(request.postData() || '{}');
      if (body.action === 'list_settings') {
        listSettingsCount++;
        return json(200, { settings: currentSettings });
      }
      if (body.action === 'list_submissions') return json(200, { submissions: [], total: 0, page: 1, limit: 100 });
      if (body.action === 'save_settings') {
        saves.push(body.settings);
        currentSettings = body.settings;
        return json(200, { saved: true, blockedFields: [], settings: body.settings });
      }
      return json(200, {});
    }
    if (url.includes('mock.supabase.co/functions/v1/public-settings')) return json(200, { settings: currentSettings });
    if (url.includes('mock.supabase.co/rest/v1/')) return json(200, []);
    if (url.startsWith('https://cdn.test/')) {
      if (/\.(jpg|jpeg|png|webp)$/i.test(url)) {
        return request.respond({ status: 200, contentType: 'image/gif', body: Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64') });
      }
      return request.respond({ status: 204, body: '' });
    }
    if (url.startsWith('https://www.youtube.com/')) return request.abort();
    if (url.includes('www.aparat.com/video/video/embed/')) return request.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>mock aparat player</title>' });
    return request.continue();
  } catch (error) {
    console.error('interception error', error);
    try { await request.abort(); } catch {}
  }
});

await page.evaluateOnNewDocument(() => {
  if (localStorage.getItem('browser_test_public_mode') !== 'true') {
    sessionStorage.setItem('zk_admin_session_token', 'browser-test-token');
    sessionStorage.setItem('zk_admin_authed', 'true');
    sessionStorage.setItem('zk_admin_device_id', 'browser-test-device');
  }
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function waitForSaveCount(expected) {
  const deadline = Date.now() + 15_000;
  while (saves.length < expected && Date.now() < deadline) {
    await new Promise((resolve) => setTimeout(resolve, 30));
  }
  assert(saves.length >= expected, `timed out waiting for mocked save ${expected}`);
}

async function openPublicEducationItem(itemTitle) {
  await page.evaluate((title) => {
    const card = [...document.querySelectorAll('.zke-card')].find((element) => element.textContent?.includes(title));
    const button = card?.querySelector('button');
    if (!(button instanceof HTMLButtonElement)) throw new Error(`public card not found: ${title}`);
    button.click();
  }, itemTitle);
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
}

async function closePublicEducationItem() {
  await page.evaluate(() => {
    const close = document.querySelector('[role="dialog"] .zke-back');
    if (!(close instanceof HTMLButtonElement)) throw new Error('public item close button not found');
    close.click();
  });
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 15_000 });
}

async function typeAndImmediatelySave(itemTitle, fieldLabel, value) {
  const expected = saves.length + 1;
  await page.evaluate(({ itemTitle, fieldLabel, value }) => {
    const summary = [...document.querySelectorAll('summary')].find((element) => element.textContent?.includes(itemTitle));
    const details = summary?.closest('details');
    if (!(details instanceof HTMLDetailsElement)) throw new Error(`item not found: ${itemTitle}`);
    details.open = true;
    const label = [...details.querySelectorAll('label')].find((element) => element.textContent?.includes(fieldLabel));
    const field = label?.nextElementSibling;
    if (!(field instanceof HTMLTextAreaElement || field instanceof HTMLInputElement)) throw new Error(`field not found: ${fieldLabel}`);
    field.focus();
    field.value = value;
    const save = document.querySelector('[data-testid="content-save"]');
    if (!(save instanceof HTMLButtonElement)) throw new Error('save button not found');
    save.click();
  }, { itemTitle, fieldLabel, value });
  await waitForSaveCount(expected);
  await page.waitForFunction(() => {
    const save = document.querySelector('[data-testid="content-save"]');
    return save instanceof HTMLButtonElement && !save.disabled && save.textContent?.includes('ذخیره تغییرات محتوا');
  }, { timeout: 15_000 });
}

try {
  await page.goto(`${baseUrl}/admin/app`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('محتوا و صفحات'), { timeout: 20_000 });
  await page.waitForFunction(() => true, { timeout: 100 });
  assert(listSettingsCount > 0, 'mocked full settings were not loaded');

  await page.evaluate(() => {
    const target = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('محتوا و صفحات'));
    if (!(target instanceof HTMLButtonElement)) throw new Error('content navigation button not found');
    target.click();
  });
  await page.waitForSelector('[data-testid="content-save"]', { timeout: 15_000 });

  await page.evaluate(() => {
    const summary = [...document.querySelectorAll('summary')].find((element) => element.textContent?.includes('آیتم تست ذخیره فوری'));
    if (!(summary instanceof HTMLElement)) throw new Error('education test item not found');
    const details = summary.closest('details');
    if (details) details.open = true;
  });

  const legacySelections = await page.evaluate(() => {
    const details = [...document.querySelectorAll('details')].find((element) => element.textContent?.includes('آیتم تست ذخیره فوری'));
    return {
      education: details?.querySelector('input[data-media-destination="education"]')?.checked,
      experience: details?.querySelector('input[data-media-destination="experience"]')?.checked,
    };
  });
  assert(legacySelections.education === true && legacySelections.experience === true, 'legacy single choice was not shown as compatible multi-selection');

  // Deliberately call button.click() while the textarea is still focused. Programmatic click does
  // not blur it; saveAll itself must flush the active draft before building the request payload.
  await page.evaluate((value) => {
    const details = [...document.querySelectorAll('details')].find((element) => element.textContent?.includes('آیتم تست ذخیره فوری'));
    const label = [...(details?.querySelectorAll('label') || [])].find((element) => element.textContent?.includes('کد دستی یوتیوب'));
    const textarea = label?.nextElementSibling;
    if (!(textarea instanceof HTMLTextAreaElement)) throw new Error('YouTube textarea not found');
    textarea.focus();
    textarea.value = value;
    const height = details?.querySelector('input[data-media-destination="height"]');
    if (height instanceof HTMLInputElement && !height.checked) height.click();
    const save = document.querySelector('[data-testid="content-save"]');
    if (!(save instanceof HTMLButtonElement)) throw new Error('save button not found');
    save.click();
  }, freshCode);

  await page.waitForFunction(() => document.body.innerText.includes('تغییرات محتوا با موفقیت ذخیره شد.'), { timeout: 15_000 });
  assert(saves.length === 1, `expected one mocked settings save, got ${saves.length}`);
  const savedItem = saves[0]?.education?.items?.find((item) => item.id === 'edu-browser-test');
  assert(savedItem?.youtubeCode === freshCode, 'immediately typed video value was lost before save');
  assert(JSON.stringify(savedItem?.mediaCategories) === JSON.stringify(['education', 'experience', 'height']), 'multi-page destinations were not saved');

  await typeAndImmediatelySave('آیتم تست ویس فوری', 'کد دستی صوتی خارجی', freshAudio);
  await typeAndImmediatelySave('آیتم تست عکس فوری', 'کد دستی تصویر خارجی', freshImage);
  await typeAndImmediatelySave('آیتم تست متن فوری', 'متن کامل', freshText);
  const latestItems = saves.at(-1)?.education?.items || [];
  assert(latestItems.find((item) => item.id === 'edu-audio-test')?.externalCode === freshAudio, 'immediately typed audio value was lost before save');
  assert(latestItems.find((item) => item.id === 'edu-image-test')?.externalCode === freshImage, 'immediately typed image value was lost before save');
  assert(latestItems.find((item) => item.id === 'edu-text-test')?.body === freshText, 'immediately typed text value was lost before save');

  await page.reload({ waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('محتوا و صفحات'), { timeout: 20_000 });
  await page.evaluate(() => {
    const target = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('محتوا و صفحات'));
    if (target instanceof HTMLButtonElement) target.click();
  });
  await page.waitForSelector('[data-testid="content-save"]', { timeout: 15_000 });
  await page.evaluate(() => {
    const summary = [...document.querySelectorAll('summary')].find((element) => element.textContent?.includes('آیتم تست ذخیره فوری'));
    const details = summary?.closest('details');
    if (details) details.open = true;
  });
  const persisted = await page.evaluate(() => {
    const details = [...document.querySelectorAll('details')].find((element) => element.textContent?.includes('آیتم تست ذخیره فوری'));
    const label = [...(details?.querySelectorAll('label') || [])].find((element) => element.textContent?.includes('کد دستی یوتیوب'));
    const textarea = label?.nextElementSibling;
    return textarea instanceof HTMLTextAreaElement ? textarea.value : '';
  });
  assert(persisted === freshCode, 'saved video value did not survive mocked server reload');

  // Public page uses the sanitized public-settings path (session cleared) and must feed every
  // saved content type into the real education card/modal player rather than preview samples.
  await page.evaluate(() => {
    localStorage.setItem('browser_test_public_mode', 'true');
    sessionStorage.clear();
  });
  await page.goto(`${baseUrl}/education`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('آیتم تست ذخیره فوری'), { timeout: 20_000 });

  await openPublicEducationItem('آیتم تست ذخیره فوری');
  const publicVideo = await page.$eval('[role="dialog"] iframe', (element) => element.getAttribute('src') || '');
  assert(publicVideo === freshCode, 'saved video was not connected to the public education player');
  await closePublicEducationItem();

  await openPublicEducationItem('آیتم تست ویس فوری');
  const publicAudio = await page.$eval('[role="dialog"] audio', (element) => element.getAttribute('src') || '');
  assert(publicAudio === freshAudio, 'saved audio was not connected to the public education player');
  await closePublicEducationItem();

  await openPublicEducationItem('آیتم تست عکس فوری');
  const publicImage = await page.$eval('[role="dialog"] img', (element) => element.getAttribute('src') || '');
  assert(publicImage === freshImage, 'saved image was not connected to the public education viewer');
  await closePublicEducationItem();

  await openPublicEducationItem('آیتم تست متن فوری');
  const publicText = await page.$eval('[role="dialog"]', (element) => element.textContent || '');
  assert(publicText.includes(freshText), 'saved text was not rendered in the public education modal');
  await closePublicEducationItem();

  await page.goto(`${baseUrl}/experience`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('آیتم تست ذخیره فوری'), { timeout: 20_000 });
  const firstExperienceVisit = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('[data-media-card="true"][data-media-type="video"]')];
    const inspect = (id) => {
      const card = document.querySelector(`[data-media-id="${id}"]`);
      return { html: !!card?.querySelector('[data-manual-embed="html"]'), src: card?.querySelector('iframe')?.getAttribute('src') || '' };
    };
    return { firstId: cards[0]?.getAttribute('data-media-id') || '', generic: inspect('generic-aparat-test'), direct: inspect('experience-aparat-test') };
  });
  assert(firstExperienceVisit.generic.html && firstExperienceVisit.direct.html, 'single-platform Aparat HTML was not recognized as an embed on Experience page');
  assert(firstExperienceVisit.generic.src.includes('/videohash/browsertest/') && !firstExperienceVisit.generic.src.startsWith('<'), 'Aparat HTML was incorrectly assigned to iframe src');
  assert(firstExperienceVisit.direct.src.includes('/videohash/browsertest/') && !firstExperienceVisit.direct.src.startsWith('<'), 'direct Experience Aparat code was incorrectly assigned to iframe src');

  await page.goto(`${baseUrl}/education?between=1`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.goto(`${baseUrl}/experience?visit=2`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-media-card="true"][data-media-type="video"]', { timeout: 20_000 });
  const secondFirstId = await page.$eval('[data-media-card="true"][data-media-type="video"]', (element) => element.getAttribute('data-media-id') || '');
  assert(firstExperienceVisit.firstId && secondFirstId && firstExperienceVisit.firstId !== secondFirstId, 'first Experience video repeated on consecutive visits');

  await page.goto(`${baseUrl}/courses`, { waitUntil: 'networkidle0', timeout: 30_000 });
  await page.waitForFunction(() => document.body.innerText.includes('محتوای آموزشی مرتبط') && document.body.innerText.includes('آیتم تست ذخیره فوری'), { timeout: 20_000 });
  const courseAparat = await page.$eval('[data-media-id="generic-aparat-test"] iframe', (element) => element.getAttribute('src') || '');
  assert(courseAparat.includes('/videohash/browsertest/') && !courseAparat.startsWith('<'), 'Aparat embed did not connect on the course-introduction section');

  assert(runtimeErrors.length === 0, `runtime errors: ${runtimeErrors.join(' | ')}`);

  console.log(JSON.stringify({ ok: true, saves: saves.length, persisted, mediaCategories: savedItem.mediaCategories, runtimeErrors: 0 }, null, 2));
} finally {
  await browser.close();
}
