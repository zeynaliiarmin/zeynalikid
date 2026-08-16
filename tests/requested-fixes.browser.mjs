import assert from 'node:assert/strict';
import puppeteer from 'puppeteer';

const baseUrl = process.env.TEST_BASE_URL || 'http://127.0.0.1:4175';
const viewportWidth = Number(process.env.TEST_VIEWPORT_WIDTH) || 390;
const viewportHeight = Number(process.env.TEST_VIEWPORT_HEIGHT) || (viewportWidth > 800 ? 1000 : 844);
const directImage = 'https://cdn.imgurl.ir/uploads/n378546_IMG_3316.webp';
const longText = 'این توضیح عمداً بسیار طولانی است تا از دو خط بیشتر شود و دکمه بیشتر در انتهای محدوده بسته نمایش داده شود و اندازه کارت بسته با کارت‌های دیگر یکسان باقی بماند.';
const settings = {
  showProductsSection: true,
  showProductsPage: true,
  courseTabs: [{
    id: 'height', title: 'رشد قد', titleEn: 'Height', active: true, order: 1,
    courses: [
      {
        id: 'course-a', tabId: 'height', category: 'height', title: 'دوره تست یک', titleEn: 'Test course one',
        active: true, order: 1, description: 'معرفی دوره تست یک', desc: 'معرفی دوره تست یک', descriptionEn: 'Test one description',
        features: ['ویژگی یک'], syllabus: ['سرفصل یک'], duration: '۴ هفته', ageRange: '۵ تا ۹ سال',
      },
      {
        id: 'course-b', tabId: 'height', category: 'height', title: 'دوره تست دو', titleEn: 'Test course two',
        active: true, order: 2, description: 'معرفی دوره تست دو', desc: 'معرفی دوره تست دو', descriptionEn: 'Test two description',
        features: ['ویژگی دو'], syllabus: ['سرفصل دو'], duration: '۳ هفته', ageRange: '۶ تا ۱۰ سال',
      },
    ],
  }],
  products: {
    showSection: true,
    list: [{ id: 'product-custom', name: 'محصول پایدار تست', title: 'محصول پایدار تست', titleEn: 'Persistent test product', description: 'توضیح سفارشی محصول که نباید با مقدار پیش‌فرض جایگزین شود', price: 1000, active: true, isVisible: true, order: 1 }],
  },
  experience: {
    items: [
      { id: 'parent-image', type: 'image', title: 'تجربه والد تست', description: 'رضایت والد تست', manualCode: `<img src="${directImage}" onerror="alert(1)">`, imageCodeExternal: `<img src="${directImage}" onerror="alert(1)">`, mediaCategories: ['experience', 'height'], active: true, order: 1 },
      { id: 'parent-image-two', type: 'image', title: 'تجربه والد دوم', description: 'رضایت والد دوم', manualCode: directImage, imageCodeExternal: directImage, mediaCategories: ['experience', 'height'], active: true, order: 2 },
    ],
  },
  education: {
    items: [
      { id: 'edu-image-long', type: 'image', title: 'آموزش تصویری بلند', desc: longText, description: longText, cover: `<img src="${directImage}">`, imageCodeExternal: `<img src="${directImage}">`, mediaCategories: ['education', 'height'], active: true, order: 1 },
      { id: 'edu-image-short', type: 'image', title: 'آموزش تصویری کوتاه', desc: 'توضیح کوتاه', description: 'توضیح کوتاه', cover: directImage, imageCodeExternal: directImage, mediaCategories: ['education', 'height'], active: true, order: 2 },
    ],
  },
  storyHighlights: {
    highlights: [{ id: 'highlight-test', title: 'هایلایت تست', coverUrl: '', active: true, order: 1, stories: [{ id: 'story-test', title: 'استوری تست', imageCodeExternal: `<img src="${directImage}">`, imageCodeInternal: '', active: true, order: 1 }] }],
    items: [],
  },
  faqItems: [{ id: 'faq-test', question: 'سؤال متداول تست؟', answer: 'پاسخ متداول تست', placements: ['home', 'faq', 'course:height'] }],
  faqItemsEn: [{ id: 'faq-test-en', question: 'Test FAQ?', answer: 'Test FAQ answer', placements: ['home', 'faq', 'course:height'] }],
  faqDisplay: { home: true, faq: true, courses: true },
  manualUserQuestions: [],
};

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M/wHwAF/gL+PvVZ3wAAAABJRU5ErkJggg==', 'base64');

async function installMocks(page) {
  await page.setRequestInterception(true);
  page.on('request', async (request) => {
    const url = request.url();
    if (url === directImage) {
      await request.respond({ status: 200, contentType: 'image/png', body: png });
      return;
    }
    if (!url.includes('mock.supabase.co')) {
      await request.continue();
      return;
    }
    let body = {};
    try { body = JSON.parse(request.postData() || '{}'); } catch {}
    const json = (payload, status = 200) => request.respond({ status, contentType: 'application/json', headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' }, body: JSON.stringify(payload) });
    if (url.includes('/functions/v1/public-settings')) return json({ settings });
    if (url.includes('/functions/v1/public-reviews')) return json({ reviews: [] });
    if (url.includes('/functions/v1/public-questions')) return json({ questions: [] });
    if (url.includes('/functions/v1/admin-session')) return json({ valid: true, ownerPhone: '***' });
    if (url.includes('/functions/v1/admin-api')) {
      if (body.action === 'list_settings') return json({ settings });
      if (body.action === 'list_questions') return json({ questions: [], total: 0, page: 1, limit: 1000 });
      if (body.action === 'list_submissions') return json({ submissions: [], total: 0, page: 1, limit: 50 });
      if (body.action === 'list_reviews') return json({ reviews: [], total: 0, page: 1, limit: 1000 });
      if (body.action === 'save_settings') return json({ saved: true, blockedFields: [] });
      return json({ ok: true });
    }
    if (url.includes('/rest/v1/')) return json([]);
    return json({});
  });
}

async function waitForText(page, text, timeout = 20000) {
  try {
    await page.waitForFunction((value) => document.body?.innerText.includes(value), { timeout }, text);
  } catch (error) {
    console.error('waitForText failed:', text, await page.evaluate(() => document.body?.innerText.slice(0, 1200)));
    throw error;
  }
}

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const runtimeErrors = [];
try {
  const publicPage = await browser.newPage();
  await publicPage.setViewport({ width: viewportWidth, height: viewportHeight, deviceScaleFactor: 1 });
  publicPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await installMocks(publicPage);

  await publicPage.goto(`${baseUrl}/courses`, { waitUntil: 'domcontentloaded' });
  await waitForText(publicPage, 'دوره تست یک');

  const courseListing = await publicPage.evaluate(() => {
    const menu = document.querySelector('button[aria-label="باز کردن منو"]');
    const cards = [...document.querySelectorAll('article')];
    const exp = document.querySelector('[data-course-media-group="experience"]');
    const edu = document.querySelector('[data-course-media-group="education"]');
    const similar = [...document.querySelectorAll('*')].find((node) => node.children.length === 0 && node.textContent?.trim() === 'دوره‌های مشابه');
    return {
      hasHeader: !!document.querySelector('header'),
      menuRight: menu ? getComputedStyle(menu).right !== 'auto' : false,
      experienceTitle: exp?.getAttribute('aria-label') || '',
      educationTitle: edu?.getAttribute('aria-label') || '',
      order: exp && edu && similar ? [exp.getBoundingClientRect().top + scrollY, edu.getBoundingClientRect().top + scrollY, similar.getBoundingClientRect().top + scrollY] : [],
      courseCards: cards.length,
    };
  });
  assert.equal(courseListing.hasHeader, true, 'course listing reuses the main header');
  assert.equal(courseListing.menuRight, true, 'Persian hamburger stays on the right');
  assert.equal(courseListing.experienceTitle, 'تجربه و رضایت والدین مرتبط');
  assert.equal(courseListing.educationTitle, 'محتوای آموزشی مرتبط');
  assert.equal(courseListing.courseCards >= 2, true);
  assert.equal(courseListing.order.length, 3);
  assert.equal(courseListing.order[0] < courseListing.order[1] && courseListing.order[1] < courseListing.order[2], true, 'experience and education precede similar courses');

  await publicPage.evaluate(() => {
    const article = [...document.querySelectorAll('article')].find((node) => node.textContent?.includes('دوره تست یک'));
    article?.click();
  });
  await waitForText(publicPage, 'پرسش‌های متداول');
  const detail = await publicPage.evaluate(() => {
    const nav = document.querySelector('[data-sticky-anchor-nav]');
    return {
      hasHeader: !!document.querySelector('header'),
      hasMenu: !!document.querySelector('button[aria-label="باز کردن منو"]'),
      hasAsk: document.body.innerText.includes('سؤال دارم'),
      faqHeading: document.body.innerText.includes('پرسش‌های متداول'),
      stickyInitiallyHidden: nav ? getComputedStyle(nav).display === 'none' || nav.getAttribute('aria-hidden') === 'true' || Number(getComputedStyle(nav).opacity) === 0 : false,
    };
  });
  assert.deepEqual(detail, { hasHeader: true, hasMenu: true, hasAsk: true, faqHeading: true, stickyInitiallyHidden: true });

  await publicPage.goto(`${baseUrl}/education`, { waitUntil: 'domcontentloaded' });
  await waitForText(publicPage, 'آموزش تصویری بلند');
  const education = await publicPage.evaluate((url) => {
    const cards = [...document.querySelectorAll('.zke-card')];
    const heights = cards.map((card) => Math.round(card.getBoundingClientRect().height));
    const imageSrcs = [...document.querySelectorAll('.zke-cover img')].map((img) => img.getAttribute('src'));
    const longCard = cards.find((card) => card.textContent?.includes('آموزش تصویری بلند'));
    const more = longCard?.querySelector('.zke-card-desc button');
    return { count: cards.length, heights, imageSrcs, moreText: more?.textContent?.trim() || '', directUrl: url };
  }, directImage);
  assert.equal(education.count, 2);
  assert.equal(Math.max(...education.heights) - Math.min(...education.heights) <= 1, true, 'collapsed cards have equal heights');
  assert.equal(education.imageSrcs.every((src) => src === directImage), true, 'direct and img-markup media both preview safely');
  assert.equal(education.moreText, 'بیشتر…');
  await publicPage.evaluate(() => [...document.querySelectorAll('.zke-card')].find((card) => card.textContent?.includes('آموزش تصویری بلند'))?.querySelector('.zke-card-desc button')?.click());
  assert.equal(await publicPage.evaluate(() => document.body.innerText.includes('کمتر')), true);

  await publicPage.goto(`${baseUrl}/experience`, { waitUntil: 'domcontentloaded' });
  await waitForText(publicPage, 'هایلایت تست');
  const experience = await publicPage.evaluate((url) => {
    const buttons = [...document.querySelectorAll('button[aria-label="بعدی"],button[aria-label="قبلی"]')];
    const byLabel = Object.fromEntries(buttons.map((button) => [button.getAttribute('aria-label'), button.getBoundingClientRect().left]));
    const highlightButton = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('هایلایت تست'));
    return {
      nextLeft: byLabel['بعدی'], previousLeft: byLabel['قبلی'],
      highlightSrc: highlightButton?.querySelector('img')?.getAttribute('src') || '',
      expected: url,
    };
  }, directImage);
  assert.equal(experience.nextLeft < experience.previousLeft, true, 'Persian next is left and previous is right');
  assert.equal(experience.highlightSrc, directImage, 'highlight previews the first safe story image');
  await publicPage.evaluate(() => document.querySelector('button[aria-label="تغییر زبان"]')?.click());
  await publicPage.waitForSelector('[role="menuitem"]');
  await publicPage.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((node) => node.textContent?.includes('English'))?.click());
  await publicPage.waitForFunction(() => !!document.querySelector('button[aria-label="Previous"]') && !!document.querySelector('button[aria-label="Next"]'));
  const englishControls = await publicPage.evaluate(() => ({
    previousLeft: document.querySelector('button[aria-label="Previous"]')?.getBoundingClientRect().left,
    nextLeft: document.querySelector('button[aria-label="Next"]')?.getBoundingClientRect().left,
  }));
  assert.equal(englishControls.previousLeft < englishControls.nextLeft, true, 'English previous/next behavior remains unchanged');
  await publicPage.evaluate(() => document.querySelector('button[aria-label="Change language"]')?.click());
  await publicPage.waitForSelector('[role="menuitem"]');
  await publicPage.evaluate(() => [...document.querySelectorAll('[role="menuitem"]')].find((node) => node.textContent?.includes('فارسی'))?.click());

  await publicPage.goto(`${baseUrl}/products`, { waitUntil: 'domcontentloaded' });
  await waitForText(publicPage, 'محصول پایدار تست');
  assert.equal(await publicPage.evaluate(() => document.body.innerText.includes('توضیح سفارشی محصول که نباید با مقدار پیش‌فرض جایگزین شود')), true, 'public product settings do not reset to defaults');

  const adminPage = await browser.newPage();
  await adminPage.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
  adminPage.on('pageerror', (error) => runtimeErrors.push(error.message));
  await adminPage.evaluateOnNewDocument(() => {
    sessionStorage.setItem('zk_admin_session_token', 'test-session-token');
    sessionStorage.setItem('zk_admin_device_id', 'test-device');
    sessionStorage.setItem('zk_admin_authed', 'true');
  });
  await installMocks(adminPage);
  await adminPage.goto(`${baseUrl}/admin`, { waitUntil: 'domcontentloaded' });
  await waitForText(adminPage, 'سوالات مخاطبین');
  await adminPage.evaluate(() => {
    const target = [...document.querySelectorAll('button')].find((button) => button.textContent?.includes('سوالات مخاطبین'));
    target?.click();
  });
  await waitForText(adminPage, 'مدیریت سوالات متداول (FAQ)');
  await adminPage.evaluate(() => {
    const button = [...document.querySelectorAll('button')].find((node) => node.textContent?.includes('افزودن سؤال جدید'));
    button?.click();
  });
  await adminPage.waitForFunction(() => document.querySelectorAll('[data-faq-editor-pair]').length >= 2);
  const faqInput = await adminPage.$('[data-faq-editor-pair] input[placeholder="سوال"]');
  assert.ok(faqInput, 'new Persian FAQ input exists');
  await faqInput.click();
  const before = await adminPage.evaluate((input) => ({ scrollY, pairCount: document.querySelectorAll('[data-faq-editor-pair]').length, top: input.getBoundingClientRect().top }), faqInput);
  const typed = 'تایپ پیوسته بدون بسته شدن کیبورد';
  for (const char of typed) {
    await adminPage.keyboard.type(char);
    const focused = await adminPage.evaluate((input) => document.activeElement === input, faqInput);
    assert.equal(focused, true, `FAQ input retained focus while typing ${char}`);
  }
  const after = await adminPage.evaluate((input) => ({ value: input.value, focused: document.activeElement === input, scrollY, pairCount: document.querySelectorAll('[data-faq-editor-pair]').length, top: input.getBoundingClientRect().top }), faqInput);
  assert.equal(after.value, typed);
  assert.equal(after.focused, true);
  assert.equal(after.pairCount, before.pairCount);
  const scrollDelta = Math.abs(after.scrollY - before.scrollY);
  const topDelta = Math.abs(after.top - before.top);
  assert.equal(scrollDelta < 2, true, `FAQ typing does not jump page scroll (delta ${scrollDelta})`);
  assert.equal(topDelta < 2, true, `FAQ editor does not remount or jump (delta ${topDelta})`);

  assert.deepEqual(runtimeErrors, []);
  console.log(JSON.stringify({ ok: true, viewport: `${viewportWidth}x${viewportHeight}`, courseListing, detail, education, experience, adminFocus: after, runtimeErrors: runtimeErrors.length }, null, 2));
} finally {
  await browser.close();
}
