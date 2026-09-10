/**
 * زیرساخت سئوی محتوا — Stage «صفحهٔ دائمی هر محتوا»
 * - slug لاتین از عنوان فارسی (برای URL هر آیتم /education/:slug/…)
 * - تطبیق URL به آیتم: slug → slugify(title) → id
 * برای نمایش/دوره/محصول مشترک است؛ صفحات مجوزها/نظرات/تجربه‌والدین آیتم جدا سئو نمی‌خورند.
 */
const FA_MAP: Record<string, string> = {
  'آ': 'a', 'ا': 'a', 'ب': 'b', 'پ': 'p', 'ت': 't', 'ث': 's', 'ج': 'j', 'چ': 'ch',
  'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'z', 'ر': 'r', 'ز': 'z', 'ژ': 'zh',
  'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'z', 'ط': 't', 'ظ': 'z', 'ع': 'a', 'غ': 'gh',
  'ف': 'f', 'ق': 'gh', 'ک': 'k', 'گ': 'g', 'ل': 'l', 'م': 'm', 'ن': 'n',
  'و': 'v', 'ه': 'h', 'ی': 'y', 'ئ': 'y', 'ء': '', 'ؤ': 'o', 'إ': 'e', 'أ': 'a', 'ة': 'h', 'ـ': '', '‌': ' ',
  '۰': '0', '۱': '1', '۲': '2', '۳': '3', '۴': '4', '۵': '5', '۶': '6', '۷': '7', '۸': '8', '۹': '9',
};

export function slugifyFa(title: unknown, maxLen = 72): string {
  const t = String(title || '').trim();
  if (!t) return '';
  let out = '';
  for (const ch of t) {
    if (FA_MAP[ch] !== undefined) { out += FA_MAP[ch]; continue; }
    if (/[a-zA-Z0-9]/.test(ch)) { out += ch.toLowerCase(); continue; }
    if (/\s/.test(ch) || ch === '-' || ch === '–' || ch === '—' || ch === '_') { out += '-'; continue; }
  }
  out = out.replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, maxLen).replace(/-+$/g, '');
  return out;
}

export function seoKeyOf(item: any, titleFallback?: string): string {
  const slug = String(item?.slug || '').trim();
  if (/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return slug.toLowerCase();
  const derived = slugifyFa(item?.title || item?.name || titleFallback || '');
  if (derived) return derived;
  return String(item?.id || '').toLowerCase();
}

export function matchSeoKey(items: any[], keyParam: unknown): any | undefined {
  const raw = String(keyParam || '').trim();
  if (!raw) return undefined;
  const key = decodeURIComponent(raw).toLowerCase();
  return (items || []).find((x: any) => {
    const explicit = String(x?.slug || '').toLowerCase();
    if (explicit && explicit === key) return true;
    if (seoKeyOf(x) === key) return true;
    if (String(x?.id || '').toLowerCase() === key) return true;
    return false;
  });
}

export function itemUrl(section: string, item: any): string {
  const key = seoKeyOf(item);
  try {
    return `${window.location.origin}/${section}/${encodeURIComponent(key)}`;
  } catch {
    return `/${section}/${encodeURIComponent(key)}`;
  }
}

export function metaDescOf(text: unknown, maxLen = 155): string {
  const t = String(text || '').replace(/\*\*|\*|__|\n+/g, ' ').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/\s+/g, ' ').trim();
  if (t.length <= maxLen) return t;
  return t.slice(0, maxLen - 1).replace(/\S+$/, '') + '…';
}
