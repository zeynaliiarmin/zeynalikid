/* tests/design-a-warm-ui.mjs — قرارداد «طراحی A گرم» (design-A-warm.html)
   ۱) هر چهار دیزاین در روشن و تاریک، پالت اختصاصی خودش را روی صفحات
      ورود/ثبت‌نام کاربر، پیگیری دوره و ورود مدیریت می‌گذارد (رنگ دکمه‌ها دقیقاً همان فایل).
   ۲) هدر واقعی سایت (منوی همبرگری + دستیار) روی این صفحه‌ها دست‌نخورده می‌ماند و تعویض زبان داخل منو است.
   ۳) هیچ متن کوتاهی روی هیچ پس‌زمینه‌ای خوانا نیست مگر نسبت کنتراست ≥ 4.5 (متن درشت ≥ 3.0).
   اجرا: TEST_BASE_URL=http://127.0.0.1:4173 node tests/design-a-warm-ui.mjs
*/
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* پالت‌ها — کپی مستقل از فایل design-A-warm.html تا اگر کد از فایل فاصله گرفت، این تست قرمز شود */
const SHARED_LIGHT = { card0: '#FFFFFF', card1: '#FBF8F3', fbg: '#F3EDE4', track: '#EFE9F4', errfg: '#B4403A', warnfg: '#96660A', btnfg: '#FFFFFF' };
const SHARED_DARK = { card0: '#182422', card1: '#121C1A', fbg: '#101A18', track: '#1E2C29', errfg: '#F2A9A2', warnfg: '#F2C968', btnfg: '#12101C' };
const ACCENTS = {
  wellness: { light: { acc: '#7A12D4', g2: '#DF1A6F', deep: '#5B0FA6', soft: '#F8EFFF', bg: '#F5EFE7', ink: '#3A2B4E', ttl: '#7A12D4' }, dark: { acc: '#A855F7', g2: '#EC4899', deep: '#7C3AED', soft: '#221F2E', bg: '#0F1A19', ink: '#ECE9F2', ttl: '#C6A8EF' } },
  kidlearn: { light: { acc: '#B91C1C', g2: '#1D4ED8', deep: '#8C1212', soft: '#FEF3C7', bg: '#F8F0E8', ink: '#4A3022', ttl: '#B91C1C' }, dark: { acc: '#F87171', g2: '#60A5FA', deep: '#DC2626', soft: '#262019', bg: '#0F1A19', ink: '#F0EAE2', ttl: '#F0BFA1' } },
  blend: { light: { acc: '#1769C2', g2: '#2F7D6D', deep: '#104E92', soft: '#E3F1EE', bg: '#F2F6F4', ink: '#22384B', ttl: '#1769C2' }, dark: { acc: '#38BDF8', g2: '#34D399', deep: '#1769C2', soft: '#15302B', bg: '#0F1A19', ink: '#E6F2F1', ttl: '#7CC4E8' } },
  classic: { light: { acc: '#2564A8', g2: '#2E8CD8', deep: '#1B4D86', soft: '#E1ECF6', bg: '#F1F5F8', ink: '#243A52', ttl: '#2564A8' }, dark: { acc: '#60A5FA', g2: '#93C5FD', deep: '#2564A8', soft: '#1C2733', bg: '#0F1A19', ink: '#E3EDF7', ttl: '#8FBBE9' } },
};
const designs = Object.keys(ACCENTS);
const modes = ['light', 'dark'];
const pages = ['/portal', '/track', '/desk'];

const fail = [];
const assert = (cond, message, detail) => { if (!cond) fail.push(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`); };

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });

/* تنظیمات را همین‌جا می‌سازیم: دیزاین انتخابی، حالت روشن/تاریک و حالت ورودی «پنل کاربر»
   تا صفحات ورود/ثبت‌نام در هر دو پروژه بررسی شوند (در فرزند من پیش‌فرض پیگیری است). */
let mock = { design: 'wellness', mode: 'light', entryMode: 'user' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
await page.setRequestInterception(true);
page.on('request', request => {
  const url = request.url();
  if (url.includes('/functions/v1/public-settings')) {
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors, body: '' });
    return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { publicThemeMode: mock.mode, entryMode: mock.entryMode, designSystem: { sections: { public: { design: mock.design } } } } }) });
  }
  if (url.includes('/functions/v1/assistant-public')) {
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors, body: '' });
    return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify(url.includes('status=1') ? { enabled: true, revision: 1, updated_at: '2026-08-31T00:00:00.000Z' } : { knowledge: [], settings: { enabled: true, welcome_message: 'راهنمای سایت' } }) });
  }
  if (url.includes('/functions/v1/admin-api') || url.includes('/functions/v1/admin-assistant')) {
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors, body: '' });
    return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ ok: true, submissions: [], questions: [], reviews: [], devices: [], logs: [], total: 0, page: 1, limit: 50 }) });
  }
  request.continue();
});

async function open(design, mode, path, entryMode = 'user') {
  mock = { design, mode, entryMode };
  // فایل SSG تنظیمات را پیش از اجرای React روی window می‌نویسد؛ setter آن را با حالت
  // مورد آزمون جایگزین می‌کند تا هم UserPortal و هم TrackPage واقعی پوشش داده شوند.
  await page.evaluateOnNewDocument((wantedEntryMode) => {
    let preloaded;
    Object.defineProperty(window, '__APP_SSG_SETTINGS__', {
      configurable: true,
      get: () => preloaded,
      set: (value) => {
        preloaded = value && typeof value === 'object' && !Array.isArray(value)
          ? { ...value, entryMode: wantedEntryMode }
          : value;
      },
    });
  }, entryMode);
  await page.evaluateOnNewDocument((d, m) => {
    try { localStorage.clear(); } catch { }
    try { sessionStorage.clear(); } catch { }
    localStorage.setItem('zk_design_system', d);
    localStorage.setItem('zk_public_theme_mode', m);
    // پوستهٔ مدیریتی (صفحهٔ ورود مدیریت) با سلیقهٔ شخصی خودش روشن/تاریک می‌شود
    localStorage.setItem('zk_personal_color_mode', m);
    localStorage.setItem('zkid_lang', 'fa');
  }, design, mode);
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (path.startsWith('/desk')) {
    await page.waitForFunction(() => !!document.querySelector('.zp-root .zp-btn'), { timeout: 25000 });
  } else {
    await page.waitForFunction((expected) => document.documentElement.dataset.publicTheme === expected, { timeout: 25000 }, mode);
    await page.waitForFunction(() => !!document.querySelector('.zp-root .zp-btn') || !!document.querySelector('header'), { timeout: 25000 });
  }
  await sleep(700);
}

const readTokens = () => page.evaluate(() => {
  const root = document.querySelector('.zp-root');
  const cs = getComputedStyle(root || document.body);
  const btn = document.querySelector('.zp-btn:not([disabled])') || document.querySelector('.zp-btn');
  const ghost = document.querySelector('.zp-ghost');
  const box = document.querySelector('.zp-box');
  const card = document.querySelector('.zp-card');
  const bcs = btn ? getComputedStyle(btn) : null;
  return {
    theme: document.documentElement.dataset.zkTheme || '',
    vars: ['--zp-acc', '--zp-g2', '--zp-deep', '--zp-soft', '--zp-bg', '--zp-ink', '--zp-ttl', '--zp-card0', '--zp-card1', '--zp-fbg', '--zp-track', '--zp-btnfg', '--zp-errfg', '--zp-warnfg', '--zp-ph'].reduce((acc, name) => (acc[name] = cs.getPropertyValue(name).trim(), acc), {}),
    btn: bcs ? { bgImage: bcs.backgroundImage, color: bcs.color, radius: bcs.borderRadius, minHeight: bcs.minHeight } : null,
    ghost: ghost ? { bg: getComputedStyle(ghost).backgroundColor, color: getComputedStyle(ghost).color, border: getComputedStyle(ghost).borderTopColor } : null,
    box: box ? { bg: getComputedStyle(box).backgroundColor, radius: getComputedStyle(box).borderRadius, padding: getComputedStyle(box).padding, shadow: getComputedStyle(box).boxShadow.slice(0, 60) } : null,
    card: card ? { radius: getComputedStyle(card).borderRadius, shadow: getComputedStyle(card).boxShadow.slice(0, 60) } : null,
  };
});

// قرارداد بصری: کادر شمارهٔ تماس باید دقیقاً هم‌قدِ کادر کد پیگیری بماند.
// در ثبت‌نام، مرجعِ کد از نمای ورود همان صفحه گرفته می‌شود چون کد در آن مرحله نمایش ندارد.
const readAnswerFieldHeights = () => page.evaluate(() => {
  const read = label => {
    const field = [...document.querySelectorAll('.zp-field')].find(item => (item.querySelector('.zp-lbl')?.textContent || '').trim().includes(label));
    const box = field?.querySelector('.zp-box');
    const countryButton = box?.querySelector('button');
    if (!(box instanceof HTMLElement)) return null;
    return {
      height: box.getBoundingClientRect().height,
      className: box.className,
      countryButtonHeight: countryButton instanceof HTMLElement ? countryButton.getBoundingClientRect().height : null,
    };
  };
  return { code: read('کد پیگیری'), phone: read('شماره تماس') };
});

const readEntryFormPresentation = () => page.evaluate(() => {
  const rect = node => {
    if (!(node instanceof HTMLElement)) return null;
    const value = node.getBoundingClientRect();
    return { left: value.left, right: value.right, top: value.top, bottom: value.bottom, width: value.width, height: value.height };
  };
  const entryInputs = [...document.querySelectorAll('.zp-entry-field-input')].map(input => {
    const style = getComputedStyle(input);
    const box = input.closest('.zp-box');
    const field = input.closest('.zp-field');
    return { fontSize: style.fontSize, lineHeight: style.lineHeight, box: rect(box), marginBottom: field instanceof HTMLElement ? getComputedStyle(field).marginBottom : '' };
  });
  const labels = [...document.querySelectorAll('.zp-entry-field-label')].map(label => {
    const style = getComputedStyle(label);
    return { fontSize: style.fontSize, lineHeight: style.lineHeight };
  });
  const icons = [...document.querySelectorAll('.zp-entry-field-icon svg')].map(icon => {
    const value = icon.getBoundingClientRect();
    return { width: value.width, height: value.height };
  });
  const country = document.querySelector('.zp-entry-country-picker');
  const back = document.querySelector('[data-testid="public-entry-back"]');
  const row = back?.closest('.zp-entry-backrow');
  const card = back?.closest('.zp-card');
  const chip = card?.querySelector('.zp-chip');
  return {
    entryInputs,
    labels,
    icons,
    country: country instanceof HTMLElement ? { fontSize: getComputedStyle(country).fontSize, height: country.getBoundingClientRect().height } : null,
    back: back instanceof HTMLElement ? { direction: document.querySelector('.zp-root')?.getAttribute('dir') || '', position: getComputedStyle(back).position, height: back.getBoundingClientRect().height, rect: rect(back), row: rect(row), card: rect(card), chip: rect(chip) } : null,
  };
});

const assertEntryFormPresentation = (entry, label, hasCountry) => {
  assert(entry.entryInputs.length === 2, `${label}: exactly two requested entry inputs must be shown`, entry);
  assert(entry.entryInputs.every(input => input.fontSize === '23px' && input.lineHeight === '26px'), `${label}: requested input typography is not 23px / 26px`, entry.entryInputs);
  assert(entry.entryInputs.every(input => Math.abs(input.box?.height - 58) <= 0.5 && input.marginBottom === '16px'), `${label}: field height or field spacing changed`, entry.entryInputs);
  assert(entry.labels.length === 2 && entry.labels.every(item => item.fontSize === '16px' && item.lineHeight === '21.6px'), `${label}: requested field titles are not exactly 4px larger`, entry.labels);
  assert(entry.icons.length === 2 && entry.icons.every(item => Math.abs(item.width - 22) <= 0.5 && Math.abs(item.height - 22) <= 0.5), `${label}: field vectors are not the coordinated 22px size`, entry.icons);
  if (hasCountry) assert(entry.country?.fontSize === '17px' && entry.country.height >= 44, `${label}: country-code control or flag is not scaled safely`, entry.country);
  else assert(entry.country === null, `${label}: tracking page must not gain a country selector`, entry.country);
  assert(entry.back && entry.back.position === 'static' && entry.back.height >= 48 && entry.back.rect && entry.back.row && entry.back.chip && entry.back.row.top < entry.back.chip.top, `${label}: back button must stay in-flow at the start of the card`, entry.back);
  if (entry.back?.direction === 'rtl') assert(Math.abs(entry.back.rect.right - entry.back.row.right) <= 0.5, `${label}: Persian back button must align to the right`, entry.back);
  else if (entry.back?.direction === 'ltr') assert(Math.abs(entry.back.rect.left - entry.back.row.left) <= 0.5, `${label}: English back button must align to the left`, entry.back);
  else assert(false, `${label}: entry form direction was not set`, entry.back);
};

/* خوانایی: هر گره متنی که پس‌زمینهٔ ساده (بدون تصویر/گرادیان) دارد سنجیده می‌شود */
const auditContrast = () => page.evaluate(() => {
  const chan = v => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
  const lum = (r, g, b) => 0.2126 * chan(r / 255) + 0.7152 * chan(g / 255) + 0.0722 * chan(b / 255);
  const parse = value => {
    const m = String(value).match(/rgba?\(([^)]+)\)/);
    if (!m) return null;
    const parts = m[1].split(',').map(x => parseFloat(x.trim()));
    return { r: parts[0], g: parts[1], b: parts[2], a: parts.length > 3 ? parts[3] : 1 };
  };
  const ratio = (fg, bg) => {
    const alpha = fg.a;
    const mix = c => Math.round(alpha * c + (1 - alpha) * bg[c === 'r' ? 'r' : c === 'g' ? 'g' : 'b']);
    const f = { r: mix('r'), g: mix('g'), b: mix('b'), a: 1 };
    const lf = lum(f.r, f.g, f.b), lb = lum(bg.r, bg.g, bg.b);
    return +(((Math.max(lf, lb) + 0.05) / (Math.min(lf, lb) + 0.05))).toFixed(2);
  };
  const visible = el => {
    if (!(el instanceof HTMLElement) || el.offsetParent === null && el !== document.body) {
      if (!(el instanceof HTMLElement)) return false;
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return false;
    }
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return false;
    const r = el.getBoundingClientRect();
    return r.width >= 3 && r.height >= 3;
  };
  const skipAncestor = el => el.closest('[aria-hidden="true"],svg,.zp-bg,script,style,template,noscript');
  const bad = [], checked = { count: 0 };
  for (const el of document.querySelectorAll('body *')) {
    if (!visible(el) || skipAncestor(el)) continue;
    const own = [...el.childNodes].find(n => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!own) continue;
    const cs = getComputedStyle(el);
    const fg = parse(cs.color);
    if (!fg) continue;
    let node = el, bg = null, painted = false;
    while (node && node !== document.documentElement.parentElement) {
      const ncs = node === el ? cs : getComputedStyle(node);
      const image = ncs.backgroundImage;
      if (image && image !== 'none') { painted = true; break; }
      const c = parse(ncs.backgroundColor);
      if (c && c.a > 0.85) { bg = c; break; }
      node = node.parentElement;
    }
    if (!bg || painted) continue; // پس‌زمینهٔ گرادیانی/تصویری — در این تست قابل داوری نیست
    const size = parseFloat(cs.fontSize), weight = Number(cs.fontWeight) || 400;
    const large = size >= 24 || (size >= 18.66 && weight >= 700);
    const r = ratio(fg, bg);
    checked.count += 1;
    if (r < (large ? 3 : 4.5)) bad.push({ tag: el.tagName.toLowerCase(), cls: (el.className || '').toString().slice(0, 60), text: own.textContent.trim().slice(0, 40), color: cs.color, bg: `rgb(${bg.r}, ${bg.g}, ${bg.b})`, size, weight, ratio: r, need: large ? 3 : 4.5 });
  }
  return { bad: bad.slice(0, 12), badCount: bad.length, checked: checked.count };
});

for (const design of designs) {
  for (const mode of modes) {
    const pal = { ...(mode === 'dark' ? SHARED_DARK : SHARED_LIGHT), ...ACCENTS[design][mode] };
    for (const path of pages) {
      const label = `${design}/${mode}${path}`;
      await open(design, mode, path);
      const t = await readTokens();
      if (path === '/portal' || path === '/track') {
        const loginFields = await readAnswerFieldHeights();
        const loginPresentation = await readEntryFormPresentation();
        assert(loginFields.code && loginFields.phone, `${label}: کادر کد پیگیری یا شمارهٔ تماس پیدا نشد`, loginFields);
        if (loginFields.code && loginFields.phone) {
          assert(Math.abs(loginFields.phone.height - loginFields.code.height) <= 0.5, `${label}: ارتفاع کادر شمارهٔ تماس با کد پیگیری برابر نیست`, loginFields);
        }
        assertEntryFormPresentation(loginPresentation, `${label}: ورود`, true);
        if (path === '/portal' && loginFields.code) {
          const openedRegister = await page.evaluate(() => {
            const tab = document.querySelectorAll('.zp-tabs .zp-tab')[1];
            if (!(tab instanceof HTMLButtonElement)) return false;
            tab.click();
            return true;
          });
          assert(openedRegister, `${label}: تب ثبت‌نام برای بررسی ارتفاع پیدا نشد`);
          if (openedRegister) {
            await page.waitForFunction(() => ![...document.querySelectorAll('.zp-lbl')].some(item => (item.textContent || '').trim().includes('کد پیگیری')), { timeout: 10000 });
            const registerFields = await readAnswerFieldHeights();
            const registerPresentation = await readEntryFormPresentation();
            assert(registerFields.phone, `${label}: کادر شمارهٔ تماس ثبت‌نام پیدا نشد`, registerFields);
            if (registerFields.phone) {
              assert(Math.abs(registerFields.phone.height - loginFields.code.height) <= 0.5, `${label}: ارتفاع شمارهٔ تماس ثبت‌نام با کد پیگیری برابر نیست`, { login: loginFields.code, register: registerFields.phone });
            }
            assertEntryFormPresentation(registerPresentation, `${label}: ثبت‌نام`, true);
          }
        }
      }
      if (path.startsWith('/desk')) assert(/^admin-(light|dark)$/.test(t.theme), `${label}: پوستهٔ مدیریتی عوض شده`, t.theme);
      else assert(t.theme === (mode === 'dark' ? `${design}-dark` : design), `${label}: پوستهٔ اختصاصی دیزاین انتخاب نشد`, t.theme);
      const expect = { '--zp-acc': pal.acc, '--zp-g2': pal.g2, '--zp-deep': pal.deep, '--zp-soft': pal.soft, '--zp-bg': pal.bg, '--zp-ink': pal.ink, '--zp-ttl': pal.ttl, '--zp-card0': pal.card0, '--zp-card1': pal.card1, '--zp-fbg': pal.fbg, '--zp-btnfg': pal.btnfg };
      for (const [name, value] of Object.entries(expect)) assert(t.vars[name].toLowerCase() === value.toLowerCase(), `${label}: متغیر ${name} با فایل فرق دارد`, { got: t.vars[name], want: value });
      if (t.btn) {
        const toRgb = hex => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
        const wantImage = `linear-gradient(135deg, ${toRgb(pal.acc)}, ${toRgb(pal.g2)})`;
        assert(t.btn.bgImage.replace(/\s+/g, ' ') === wantImage.replace(/\s+/g, ' '), `${label}: گرادیان دکمه دقیقاً مثل فایل نیست`, { got: t.btn.bgImage, want: wantImage });
        assert(t.btn.color === toRgb(pal.btnfg), `${label}: رنگ متن دکمه برای خوانایی تنظیم نشده`, t.btn);
        assert(t.btn.radius === '999px' || t.btn.radius.endsWith('px'), `${label}: شعاع دکمه خوانده نشد`, t.btn);
      } else fail.push(`${label}: دکمهٔ اصلی صفحه پیدا نشد`);
      assert(t.box && /17px/.test(t.box.radius), `${label}: فیلد نئومورفیک فایل اجرا نشده`, t.box);
      assert(t.card && /26px/.test(t.card.radius), `${label}: کارت ۲۶px فایل اجرا نشده`, t.card);
      // هدر واقعی سایت باید دست‌نخورده بماند؛ انتخاب زبان عمداً درون منو است، نه بالای صفحه.
      const header = await page.evaluate(() => {
        const has = sel => !!document.querySelector(sel);
        const label = t => `[aria-label="${t}"]`;
        return {
          burger: has(label('باز کردن منو')) || has(label('Open menu')),
          languageInHeader: [...document.querySelectorAll('header button')].some(button => /(?:فارسی|English)/.test(button.textContent || '')),
          assistant: has('.zka-launch') || has(label('بازکردن راهنمای سایت')) || has(label('Open site guide')),
          headerEl: has('header') || has('.zku-header'),
        };
      });
      assert(header.headerEl, `${label}: هدر عمومی از این صفحات حذف شده`);
      assert(!header.languageInHeader, `${label}: انتخاب زبان نباید به هدر برگردد`);
      assert(header.assistant, `${label}: دکمهٔ دستیار هدر حذف شده`);
      if (path === '/track' || path === '/desk') assert(header.burger, `${label}: منوی همبرگری هدر حذف شده`);
      const openedMenu = await page.evaluate(() => {
        const button = document.querySelector('[aria-label="باز کردن منو"], [aria-label="Open menu"]');
        if (!(button instanceof HTMLButtonElement)) return false;
        button.click();
        return true;
      });
      assert(openedMenu, `${label}: منو برای رسیدن به انتخاب زبان باز نشد`);
      if (openedMenu) {
        await page.waitForSelector('aside[aria-label="منوی اصلی"], aside[aria-label="Main menu"]', { timeout: 25000 });
        const languageInMenu = await page.evaluate(() => {
          const menu = document.querySelector('aside[aria-label="منوی اصلی"], aside[aria-label="Main menu"]');
          const labels = [...(menu?.querySelectorAll('button') || [])].map(button => (button.textContent || '').trim());
          return labels.includes('🇮🇷 فارسی') && labels.includes('🇬🇧 English');
        });
        assert(languageInMenu, `${label}: انتخاب زبان داخل منو پیدا نشد`);
        const closedMenu = await page.evaluate(() => {
          const button = document.querySelector('[aria-label="بستن منو"], [aria-label="Close menu"]');
          if (!(button instanceof HTMLButtonElement)) return false;
          button.click();
          return true;
        });
        assert(closedMenu, `${label}: منوی بازشده بسته نشد`);
        if (closedMenu) await page.waitForFunction(() => !document.querySelector('aside[aria-label="منوی اصلی"], aside[aria-label="Main menu"]'), { timeout: 25000 });
      }
      const audit = await auditContrast();
      assert(audit.badCount === 0, `${label}: ${audit.badCount} متن با کنتراست ناکافی (بررسی‌شده: ${audit.checked})`, audit.bad);
    }
    // صفحات عمومی هم باید پالت تاریک اختصاصی را بگیرند
    for (const path of ['/', '/courses']) {
      const label = `${design}/${mode}${path}`;
      await open(design, mode, path);
      const state = await page.evaluate(() => {
        const cs = getComputedStyle(document.body);
        return { theme: document.documentElement.dataset.zkTheme || '', bg: cs.backgroundColor, color: cs.color, primary: cs.getPropertyValue('--zk-primary').trim(), dark: document.documentElement.dataset.publicTheme };
      });
      assert(state.theme === (mode === 'dark' ? `${design}-dark` : design), `${label}: دیزاین/حالت درست اعمال نشد`, state);
      if (mode === 'dark') {
        const asRgb = hex => `rgb(${parseInt(hex.slice(1, 3), 16)}, ${parseInt(hex.slice(3, 5), 16)}, ${parseInt(hex.slice(5, 7), 16)})`;
        assert(state.primary.toLowerCase() === pal.acc.toLowerCase(), `${label}: رنگ اصلی پالت تاریک اختصاصی به این صفحه نرسید`, state);
        assert(state.bg === asRgb(pal.bg) && state.color === asRgb(pal.ink), `${label}: بوم و متن پالت تاریک اختصاصی به این صفحه نرسیده`, { ...state, wantBg: asRgb(pal.bg), wantText: asRgb(pal.ink) });
      }
      const audit = await auditContrast();
      assert(audit.badCount === 0, `${label}: ${audit.badCount} متن با کنتراست ناکافی (بررسی‌شده: ${audit.checked})`, audit.bad);
    }
  }
}

// مستقل از حالت «پنل کاربر»، نسخهٔ واقعی صفحهٔ پیگیری هم همین قرارداد را نگه می‌دارد.
await open('wellness', 'light', '/track', 'track');
const standaloneTrack = await readEntryFormPresentation();
assertEntryFormPresentation(standaloneTrack, 'standalone tracking page', false);

// انتخاب English از منوی واقعی باید جای دکمه را از راست به چپ ببرد.
const openedLanguageMenu = await page.evaluate(() => {
  const trigger = document.querySelector('button[aria-label="باز کردن منو"]');
  if (!(trigger instanceof HTMLButtonElement)) return false;
  trigger.click();
  return true;
});
assert(openedLanguageMenu, 'tracking page: language menu trigger was not found');
if (openedLanguageMenu) {
  await page.waitForSelector('aside[aria-label="منوی اصلی"]', { timeout: 15000 });
  const switchedToEnglish = await page.evaluate(() => {
    const menu = document.querySelector('aside[aria-label="منوی اصلی"]');
    const english = [...(menu?.querySelectorAll('button') || [])].find(button => (button.textContent || '').includes('English'));
    if (!(english instanceof HTMLButtonElement)) return false;
    english.click();
    return true;
  });
  assert(switchedToEnglish, 'tracking page: English language choice was not found');
  if (switchedToEnglish) {
    await page.waitForFunction(() => document.querySelector('.zp-root')?.getAttribute('dir') === 'ltr', { timeout: 15000 });
    await sleep(250);
    assertEntryFormPresentation(await readEntryFormPresentation(), 'standalone tracking page in English', false);
  }
}

// دکمهٔ بازگشت باید به صفحهٔ واقعی قبل برگردد، نه اینکه صفحه را بپوشاند یا شناور بماند.
await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 45000 });
// اجازه بده React مسیر صفحهٔ قبل را کامل در history ثبت کند؛ سپس رفتار واقعی دکمه را می‌سنجیم.
await sleep(1000);
await page.goto(`${base}/track`, { waitUntil: 'domcontentloaded', timeout: 45000 });
await page.waitForSelector('[data-testid="public-entry-back"]', { timeout: 25000 });
// تنظیمات عمومی پس از mount به‌صورت async یک‌بار همگام می‌شود؛ دکمه را روی نمای پایدار می‌زنیم.
await sleep(1000);
await page.click('[data-testid="public-entry-back"]');
// history traversal creates a new document; waitForFunction is tied to the old realm in Puppeteer.
await sleep(1200);
const returnedPath = await page.evaluate(() => location.pathname);
assert(returnedPath === '/', 'back button did not return to the prior public page', { returnedPath });

await browser.close();
if (fail.length) { console.error(`✗ design-A-warm contracts failed (${fail.length}):`); for (const f of fail) console.error('  –', f); process.exit(1); }
console.log(`✓ design-A-warm contracts passed for ${designs.length} designs × ${modes.length} modes on ${pages.length + 2} page types (palettes, button colours, untouched header, contrast audit).`);
