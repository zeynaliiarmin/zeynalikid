/**
 * سایتمپ پویا روی همان‌دامنهٔ Vercel — جایگزین فانکشن سوپابیس (بدون نیاز به توکن مدیریت سوپابیس).
 * داده از public-settings همان پروژه خوانده می‌شود؛ محتوا با ادمین همیشه تازه است.
 */
const SUPABASE_FN = 'https://kkdrvexwzuuumjezipnd.supabase.co/functions/v1/public-settings';
const SITE_BASE = 'https://zeynalikid.vercel.app';

const FA_MAP: Record<string, string> = {
  'آ':'a','ا':'a','ب':'b','پ':'p','ت':'t','ث':'s','ج':'j','چ':'ch','ح':'h','خ':'kh',
  'د':'d','ذ':'z','ر':'r','ز':'z','ژ':'zh','س':'s','ش':'sh','ص':'s','ض':'z','ط':'t','ظ':'z',
  'ع':'a','غ':'gh','ف':'f','ق':'gh','ک':'k','گ':'g','ل':'l','م':'m','ن':'n','و':'v','ه':'h','ی':'y',
  'ء':'','ئ':'y','ؤ':'o','إ':'e','أ':'a','ة':'h','ـ':'','‌':' ',
  '۰':'0','۱':'1','۲':'2','۳':'3','۴':'4','۵':'5','۶':'6','۷':'7','۸':'8','۹':'9',
  '٠':'0','١':'1','٢':'2','٣':'3','٤':'4','٥':'5','٦':'6','٧':'7','٨':'8','٩':'9',
};
function slugifyFa(title: unknown, maxLen = 72): string {
  const t = String(title || '').trim();
  if (!t) return '';
  let out = '';
  for (const ch of t) {
    if (FA_MAP[ch] !== undefined) { out += FA_MAP[ch]; continue; }
    if (/[a-zA-Z0-9]/.test(ch)) { out += ch.toLowerCase(); continue; }
    if (/\s/.test(ch) || ch === '-' || ch === '–' || ch === '—' || ch === '_') { out += '-'; continue; }
  }
  return out.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxLen).replace(/-+$/g, '');
}
function seoKeyOf(item: any): string {
  const slug = String(item?.slug || '').trim();
  if (/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return slug.toLowerCase();
  const derived = slugifyFa(item?.title || item?.name || '');
  return derived || String(item?.id || '').toLowerCase();
}

const STATIC_PAGES: Array<[string, string, string]> = [
  ['/', '1.0', 'weekly'],
  ['/education', '0.9', 'weekly'],
  ['/courses', '0.9', 'weekly'],
  ['/form', '0.9', 'weekly'],
  ['/consultation', '0.8', 'weekly'],
  ['/products', '0.8', 'weekly'],
  ['/experience', '0.7', 'monthly'],
  ['/faq', '0.7', 'monthly'],
  ['/licenses', '0.6', 'monthly'],
  ['/about', '0.6', 'monthly'],
  ['/contact', '0.6', 'monthly'],
  ['/privacy', '0.4', 'yearly'],
];

async function loadSettings(): Promise<Record<string, any>> {
  // تلاش دوباره در اجرای سرد سرورلس — بدون Origin (رفتار مستند public-settings مثل education-ssr)
  let last: unknown = null;
  for (let i = 0; i < 2; i++) {
    try {
      const r = await fetch(SUPABASE_FN, { headers: { 'Accept': 'application/json' }, signal: AbortSignal.timeout(6000) });
      if (!r.ok) throw new Error('HTTP ' + r.status);
      const d: any = await r.json();
      if (d?.settings && typeof d.settings === 'object') return d.settings;
      throw new Error('bad payload');
    } catch (e) { last = e; }
  }
  throw last;
}

export default async function handler(_req: any, res: any) {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  // بدون کشِ لبه (s-maxage=0): سایتمپ باید همیشه تازه و کامل باشد؛ هزینهٔ تولید ناچیز است (۱ فتچ داخلی)
  res.setHeader('Cache-Control', 'public, max-age=600, s-maxage=0, must-revalidate');
  try {
    const settings = await loadSettings();
    const today = new Date().toISOString().slice(0, 10);
    const seen = new Set<string>();
    const rows: string[] = [];
    const push = (loc: string, priority: string, changefreq: string) => {
      if (seen.has(loc)) return;
      seen.add(loc);
      rows.push(`  <url>\n    <loc>${SITE_BASE}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);
    };
    STATIC_PAGES.forEach(([p, pr, cf]) => push(p, pr, cf));

    // محتوای آموزشی (فعال/نمایان)
    const edu = settings.education && typeof settings.education === 'object' ? settings.education : {};
    (Array.isArray(edu.items) ? edu.items : [])
      .filter((x: any) => x?.active !== false && x?.isVisible !== false)
      .forEach((x: any) => push(`/education/${encodeURIComponent(seoKeyOf(x))}`, '0.8', 'weekly'));

    // دوره‌ها — courseTabs[].courses[] فعال
    (Array.isArray(settings.courseTabs) ? settings.courseTabs : []).forEach((t: any) => {
      (Array.isArray(t?.courses) ? t.courses : [])
        .filter((c: any) => c?.active !== false)
        .forEach((c: any) => push(`/courses/${encodeURIComponent(seoKeyOf(c))}`, '0.8', 'weekly'));
    });

    // محصولات — products.list فعال/نمایان
    const prodSrc = settings.products && typeof settings.products === 'object' ? settings.products : {};
    (Array.isArray(prodSrc.list) ? prodSrc.list : (Array.isArray(prodSrc.items) ? prodSrc.items : []))
      .filter((p: any) => p?.isVisible !== false && p?.active !== false)
      .forEach((p: any) => push(`/products/${encodeURIComponent(seoKeyOf(p))}`, '0.7', 'weekly'));

    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join('\n')}\n</urlset>`);
  } catch {
    res.status(200).send(`<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${STATIC_PAGES.map(([p, pr, cf]) => `  <url>\n    <loc>${SITE_BASE}${p}</loc>\n    <changefreq>${cf}</changefreq>\n    <priority>${pr}</priority>\n  </url>`).join('\n')}\n</urlset>`);
  }
}
