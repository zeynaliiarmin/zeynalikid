import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4173';
const onePixelGif = Buffer.from('R0lGODlhAQABAIAAAAAAAP///ywAAAAAAQABAAACAUwAOw==', 'base64');
const aparatEmbed = '<style>.h_iframe-aparat_embed_frame{position:relative}</style><div class="h_iframe-aparat_embed_frame"><iframe src="https://www.aparat.com/video/video/embed/videohash/rgzh6ht/vt/frame"></iframe></div>';
const settings = {
  experience: {
    items: [
      { id: 'preview-youtube', type: 'video', title: 'YouTube preview', description: 'Closed cards open details only.', youtubeUrl: 'https://www.youtube.com/watch?v=abcdefghi12', mediaCategories: ['experience'], active: true, order: 1 },
      { id: 'preview-aparat', type: 'video', title: 'Aparat preview', description: 'The official player belongs in detail.', aparatCode: aparatEmbed, mediaCategories: ['experience'], active: true, order: 2 },
      { id: 'preview-other', type: 'video', title: 'Other secure preview', description: 'An explicitly supplied cover keeps the card visual.', manualCode: 'https://player.example.test/embed/example', thumbnail: 'https://image.example.test/other-cover.jpg', mediaCategories: ['experience'], active: true, order: 3 },
    ],
  },
  experienceTabs: { video: true, audio: true, image: true, text: true },
  storyHighlights: { highlights: [] },
};

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
const page = await browser.newPage();
await page.setViewport({ width: 390, height: 844, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', error => errors.push(String(error)));
page.on('console', message => { if (message.type() === 'error') errors.push(`console: ${message.text()}`); });

await page.setRequestInterception(true);
page.on('request', request => {
  const url = request.url();
  const respondJson = () => request.respond({
    status: 200,
    contentType: 'application/json',
    headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' },
    body: JSON.stringify({ settings }),
  });
  if (url.includes('/functions/v1/public-settings')) return respondJson();
  if (url.includes('/functions/v1/assistant-public')) return request.respond({ status: 200, contentType: 'application/json', headers: { 'access-control-allow-origin': '*' }, body: JSON.stringify({ knowledge: [], settings: { enabled: false } }) });
  if (url.includes('/functions/v1/aparat-thumb?uid=rgzh6ht') || url.includes('img.youtube.com') || url.includes('image.example.test/other-cover.jpg')) {
    return request.respond({ status: 200, contentType: 'image/gif', body: onePixelGif });
  }
  if (url.includes('www.aparat.com/video/video/embed/') || url.includes('www.youtube.com/embed/') || url.includes('player.example.test/embed/')) {
    return request.respond({ status: 200, contentType: 'text/html', body: '<!doctype html><title>mock native platform player</title>' });
  }
  return request.continue();
});

const assert = (condition, message, detail) => {
  if (!condition) throw new Error(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`);
};

async function closedCardState(id) {
  return page.$eval(`[data-media-id="${id}"]`, card => ({
    iframeCount: card.querySelectorAll('iframe').length,
    videoCount: card.querySelectorAll('video').length,
    playerCount: card.querySelectorAll('[data-manual-embed]').length,
    cover: card.querySelector('[data-media-card-cover="true"]') instanceof HTMLButtonElement,
    coverImage: card.querySelector('[data-media-card-cover="true"] img')?.getAttribute('src') || '',
    customPlay: !!card.querySelector('.zke-play-ov,.zke-playbtn,[data-custom-play]'),
  }));
}

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function openByCover(id) {
  const selector = `[data-media-id="${id}"] [data-media-card-cover="true"]`;
  await page.$eval(selector, button => button.scrollIntoView({ block: 'center', inline: 'center' }));
  const pointerTarget = await page.$eval(selector, button => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return hit === button || button.contains(hit);
  });
  assert(pointerTarget, 'the visible media cover must receive pointer input');
  await page.click(selector);
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
  // The bottom sheet has a short entrance animation and its content can settle
  // after native platform iframe sizing. A person would not click mid-animation.
  await sleep(450);
}

async function openByCardBody(id) {
  const selector = `[data-media-id="${id}"] b`;
  await page.$eval(selector, target => target.scrollIntoView({ block: 'center', inline: 'center' }));
  const probe = await page.$eval(selector, target => {
    const rect = target.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { canReceivePointer: hit === target || target.contains(hit), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  assert(probe.canReceivePointer, 'the visible media-card body must receive pointer input');
  await page.mouse.click(probe.x, probe.y);
  await page.waitForSelector('[role="dialog"]', { timeout: 15_000 });
  await sleep(450);
}

async function closeDetail() {
  const selector = '[data-testid="public-media-detail-back"]';
  const probe = await page.$eval(selector, button => {
    const rect = button.getBoundingClientRect();
    const hit = document.elementFromPoint(rect.left + rect.width / 2, rect.top + rect.height / 2);
    return { canReceivePointer: hit === button || button.contains(hit), x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };
  });
  assert(probe.canReceivePointer, 'the visible detail back button must receive pointer input');
  await page.mouse.click(probe.x, probe.y);
  await page.waitForFunction(() => !document.querySelector('[role="dialog"]'), { timeout: 15_000 });
}

try {
  await page.goto(`${base}/experience`, { waitUntil: 'domcontentloaded', timeout: 30_000 });
  await page.waitForSelector('[data-media-id="preview-youtube"]', { timeout: 20_000 });
  await page.waitForFunction(() => {
    const splash = document.querySelector('.zk-launch');
    return !(splash instanceof HTMLElement) || splash.classList.contains('zk-launch-out') || getComputedStyle(splash).pointerEvents === 'none';
  }, { timeout: 15_000 });

  const [youtube, aparat, other] = await Promise.all([
    closedCardState('preview-youtube'),
    closedCardState('preview-aparat'),
    closedCardState('preview-other'),
  ]);
  for (const [name, state] of Object.entries({ youtube, aparat, other })) {
    assert(state.cover, `${name} closed card has a clickable cover`, state);
    assert(state.iframeCount === 0 && state.videoCount === 0 && state.playerCount === 0, `${name} closed card has no mounted player`, state);
    assert(!state.customPlay, `${name} closed card has no application play overlay`, state);
  }
  assert(youtube.coverImage.includes('img.youtube.com/vi/abcdefghi12/hqdefault.jpg'), 'YouTube uses its provider thumbnail when no cover was entered', youtube);
  assert(aparat.coverImage.includes('/functions/v1/aparat-thumb?uid=rgzh6ht'), 'Aparat uses the verified thumbnail endpoint when no cover was entered', aparat);
  assert(other.coverImage.includes('image.example.test/other-cover.jpg'), 'a supplied manual cover remains the card cover', other);

  await openByCover('preview-youtube');
  const youtubeDetail = await page.$eval('[role="dialog"] iframe', frame => ({ src: frame.getAttribute('src'), sandbox: frame.getAttribute('sandbox'), allow: frame.getAttribute('allow') }));
  assert(youtubeDetail.src === 'https://www.youtube.com/embed/abcdefghi12', 'YouTube detail uses the official embed URL', youtubeDetail);
  assert(youtubeDetail.sandbox === 'allow-scripts allow-same-origin allow-presentation', 'YouTube detail gets the verified native-control sandbox', youtubeDetail);
  assert(!youtubeDetail.sandbox.includes('allow-popups'), 'YouTube detail does not receive unnecessary popup permission', youtubeDetail);
  await closeDetail();

  await openByCover('preview-aparat');
  const aparatDetail = await page.$eval('[role="dialog"] iframe', frame => ({ src: frame.getAttribute('src'), sandbox: frame.getAttribute('sandbox') }));
  assert(aparatDetail.src?.includes('/videohash/rgzh6ht/vt/frame'), 'Aparat detail extracts the official iframe source from saved HTML', aparatDetail);
  assert(aparatDetail.sandbox === 'allow-scripts allow-presentation', 'Aparat detail stays isolated while keeping its native player', aparatDetail);
  await closeDetail();

  // A real pointer click on the card body (not its cover) also opens details,
  // without mounting or playing anything inline.
  await openByCardBody('preview-other');
  const otherDetail = await page.$eval('[role="dialog"] iframe', frame => ({ src: frame.getAttribute('src'), sandbox: frame.getAttribute('sandbox') }));
  assert(otherDetail.src === 'https://player.example.test/embed/example', 'other valid embed opens only in detail', otherDetail);
  assert(otherDetail.sandbox === 'allow-scripts allow-presentation', 'unknown embeds remain tightly sandboxed', otherDetail);
  await closeDetail();

  assert(errors.length === 0, 'media preview UI emitted runtime errors', errors);
  console.log('Media preview/detail browser contracts passed.');
} finally {
  await browser.close();
}
