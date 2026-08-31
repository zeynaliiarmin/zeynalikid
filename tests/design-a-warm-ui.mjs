/* tests/design-a-warm-ui.mjs — قرارداد «طراحی A گرم» (design-A-warm.html)
   ۱) هر چهار دیزاین در روشن و تاریک، پالت اختصاصی خودش را روی صفحات
      ورود/ثبت‌نام کاربر، پیگیری دوره و ورود مدیریت می‌گذارد (رنگ دکمه‌ها دقیقاً همان فایل).
   ۲) هدر واقعی سایت (منوی همبرگری + تعویض زبان + دستیار) روی این صفحات دست‌نخورده می‌ماند.
   ۳) هیچ متن کوتاهی روی هیچ پس‌زمینه‌ای خوانا نیست مگر نسبت کنتراست ≥ 4.5 (متن درشت ≥ 3.0).
   اجرا: TEST_BASE_URL=http://127.0.0.1:4173 node tests/design-a-warm-ui.mjs
*/
import puppeteer from 'puppeteer';

const base = process.env.TEST_BASE_URL || 'http://localhost:4173';
const executablePath = process.env.PUPPETEER_EXECUTABLE_PATH || undefined;
const sleep = ms => new Promise(r => setTimeout(r, ms));

/* پالت‌ها — کپی مستقل از فایل design-A-warm.html تا اگر کد از فایل فاصله گرفت، این تست قرمز شود */
const SHARED_LIGHT = { card0: '#FFFFFF', card1: '#FBF8F3', fbg: '#F3EDE4', track: '#EFE9F4', errfg: '#B4403A', warnfg: '#96660A', btnfg: '#FFFFFF' };
const SHARED_DARK = { card0: '#241C33', card1: '#1D1627', fbg: '#1B1327', track: '#2B2140', errfg: '#F2A9A2', warnfg: '#F4C766', btnfg: '#12101C' };
const ACCENTS = {
  wellness: { light: { acc: '#7A12D4', g2: '#DF1A6F', deep: '#5B0FA6', soft: '#F8EFFF', bg: '#F5EFE7', ink: '#3A2B4E', ttl: '#7A12D4' }, dark: { acc: '#A855F7', g2: '#EC4899', deep: '#7C3AED', soft: '#2A1B3E', bg: '#151021', ink: '#F2EAFC', ttl: '#C9A2F8' } },
  kidlearn: { light: { acc: '#B91C1C', g2: '#1D4ED8', deep: '#8C1212', soft: '#FEF3C7', bg: '#F8F0E8', ink: '#4A3022', ttl: '#B91C1C' }, dark: { acc: '#F87171', g2: '#60A5FA', deep: '#DC2626', soft: '#3B2416', bg: '#1B1112', ink: '#FBE9E4', ttl: '#F5A29B' } },
  blend: { light: { acc: '#1769C2', g2: '#2F7D6D', deep: '#104E92', soft: '#E3F1EE', bg: '#F2F6F4', ink: '#22384B', ttl: '#1769C2' }, dark: { acc: '#38BDF8', g2: '#34D399', deep: '#1769C2', soft: '#15302B', bg: '#0F1A19', ink: '#E6F2F1', ttl: '#7CC4E8' } },
  classic: { light: { acc: '#2564A8', g2: '#2E8CD8', deep: '#1B4D86', soft: '#E1ECF6', bg: '#F1F5F8', ink: '#243A52', ttl: '#2564A8' }, dark: { acc: '#60A5FA', g2: '#93C5FD', deep: '#2564A8', soft: '#1B2A3D', bg: '#0F1620', ink: '#E3EDF7', ttl: '#7DB3E8' } },
};
const designs = Object.keys(ACCENTS);
const modes = ['light', 'dark'];
const pages = ['/portal', '/track', '/admin/login'];

const fail = [];
const assert = (cond, message, detail) => { if (!cond) fail.push(`${message}${detail ? `\n${JSON.stringify(detail)}` : ''}`); };

const browser = await puppeteer.launch({ executablePath, headless: 'new', args: ['--no-sandbox', '--disable-dev-shm-usage', '--font-render-hinting=none'] });
const page = await browser.newPage();
await page.setViewport({ width: 1360, height: 900, deviceScaleFactor: 1 });

/* تنظیمات را همین‌جا می‌سازیم: دیزاین انتخابی، حالت روشن/تاریک و حالت ورودی «پنل کاربر»
   تا صفحات ورود/ثبت‌نام در هر دو پروژه بررسی شوند (در فرزند من پیش‌فرض پیگیری است). */
let mock = { design: 'wellness', mode: 'light' };
const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': '*', 'Access-Control-Allow-Methods': 'GET,POST,OPTIONS' };
await page.setRequestInterception(true);
page.on('request', request => {
  const url = request.url();
  if (url.includes('/functions/v1/public-settings')) {
    if (request.method() === 'OPTIONS') return request.respond({ status: 204, headers: cors, body: '' });
    return request.respond({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ settings: { publicThemeMode: mock.mode, entryMode: 'user', designSystem: { sections: { public: { design: mock.design } } } } }) });
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

async function open(design, mode, path) {
  mock = { design, mode };
  await page.evaluateOnNewDocument((d, m) => {
    try { localStorage.clear(); } catch { }
    localStorage.setItem('zk_design_system', d);
    localStorage.setItem('zk_public_theme_mode', m);
    // پوستهٔ مدیریتی (صفحهٔ ورود مدیریت) با سلیقهٔ شخصی خودش روشن/تاریک می‌شود
    localStorage.setItem('zk_personal_color_mode', m);
    localStorage.setItem('zkid_lang', 'fa');
  }, design, mode);
  await page.goto(`${base}${path}`, { waitUntil: 'domcontentloaded', timeout: 45000 });
  if (path.startsWith('/admin')) {
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
      if (path.startsWith('/admin')) assert(/^admin-(light|dark)$/.test(t.theme), `${label}: پوستهٔ مدیریتی عوض شده`, t.theme);
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
      // هدر واقعی سایت باید دست‌نخورده بماند
      const header = await page.evaluate(() => {
        const has = sel => !!document.querySelector(sel);
        const label = t => `[aria-label="${t}"]`;
        return {
          burger: has(label('باز کردن منو')) || has(label('Open menu')),
          lang: has(label('تغییر زبان')) || has(label('Change language')),
          assistant: has('.zka-launch') || has(label('بازکردن راهنمای سایت')) || has(label('Open site guide')),
          headerEl: has('header') || has('.zku-header'),
        };
      });
      assert(header.headerEl, `${label}: هدر عمومی از این صفحات حذف شده`);
      assert(header.headerEl, `${label}: هدر عمومی از این صفحات حذف شده`);
      assert(header.lang, `${label}: تعویض زبان هدر حذف شده`);
      assert(header.assistant, `${label}: دکمهٔ دستیار هدر حذف شده`);
      if (path === '/track' || path === '/admin/login') assert(header.burger, `${label}: منوی همبرگری هدر حذف شده`);
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

await browser.close();
if (fail.length) { console.error(`✗ design-A-warm contracts failed (${fail.length}):`); for (const f of fail) console.error('  –', f); process.exit(1); }
console.log(`✓ design-A-warm contracts passed for ${designs.length} designs × ${modes.length} modes on ${pages.length + 2} page types (palettes, button colours, untouched header, contrast audit).`);
