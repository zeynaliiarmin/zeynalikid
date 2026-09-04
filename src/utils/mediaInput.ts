const decodeHtmlEntities = (value: string): string => {
  const decodeOnce = (input: string) => input.replace(
    /&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|#39|amp|nbsp);/gi,
    (match, entity: string) => {
      const key = String(entity).toLowerCase();
      if (key === 'lt') return '<';
      if (key === 'gt') return '>';
      if (key === 'quot') return '"';
      if (key === 'apos' || key === '#39') return "'";
      if (key === 'amp') return '&';
      if (key === 'nbsp') return ' ';
      if (key.startsWith('#x')) return String.fromCodePoint(parseInt(key.slice(2), 16));
      if (key.startsWith('#')) return String.fromCodePoint(parseInt(key.slice(1), 10));
      return match;
    },
  );
  let output = String(value || '');
  for (let index = 0; index < 3; index += 1) {
    const next = decodeOnce(output);
    if (next === output) break;
    output = next;
  }
  return output;
};

export function normalizeMediaInput(value: unknown): string {
  return decodeHtmlEntities(String(value ?? '')).replace(/^\uFEFF/, '').trim();
}

const cleanUrl = (candidate: string): string => {
  const cleaned = decodeHtmlEntities(candidate)
    .trim()
    .replace(/^[('"\s]+/, '')
    .replace(/[)'"\s,،؛;]+$/, '');
  try {
    const parsed = new URL(cleaned);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? parsed.toString() : '';
  } catch {
    return '';
  }
};

/**
 * Accepts a direct URL, an HTML tag such as <img src="…">, or copied ImgURL
 * text containing «لینک دانلود». Only http(s) URLs are returned; executable
 * schemes and surrounding HTML are never passed to an image/audio element.
 */
export function extractDirectMediaUrl(value: unknown, kind: 'image' | 'audio' | 'video' = 'image'): string {
  const normalized = normalizeMediaInput(value);
  if (!normalized) return '';

  const tagName = kind === 'image' ? '(?:img|source)' : kind === 'audio' ? '(?:audio|source)' : '(?:iframe|video|source)';
  const tagPattern = new RegExp(`<\\s*${tagName}\\b[^>]*?\\b(?:src|srcset)\\s*=\\s*["']([^"']+)["']`, 'i');
  const tagMatch = normalized.match(tagPattern);
  if (tagMatch?.[1]) {
    const firstSrcSetUrl = tagMatch[1].split(/\s*,\s*/)[0].trim().split(/\s+/)[0];
    const safe = cleanUrl(firstSrcSetUrl);
    if (safe) return safe;
  }

  const cssMatch = normalized.match(/url\(\s*["']?([^"')]+)["']?\s*\)/i);
  if (cssMatch?.[1]) {
    const safe = cleanUrl(cssMatch[1]);
    if (safe) return safe;
  }

  const urls = normalized.match(/https?:\/\/[^\s"'<>]+/gi) || [];
  const safeUrls = urls.map(cleanUrl).filter(Boolean);
  if (!safeUrls.length) return '';

  if (kind === 'image') {
    const imageUrl = safeUrls.find((url) => /\.(?:avif|bmp|gif|jpe?g|png|svg|webp)(?:[?#].*)?$/i.test(url));
    if (imageUrl) return imageUrl;
    const downloadUrl = safeUrls.find((url) => /(?:cdn\.|\/uploads?\/|\/images?\/)/i.test(url));
    return downloadUrl || (safeUrls.length === 1 && normalized === urls[0] ? safeUrls[0] : '');
  }

  return safeUrls[0];
}

export function canonicalizeMediaInput(value: unknown, kind: 'image' | 'audio' = 'image'): string {
  const normalized = normalizeMediaInput(value);
  return extractDirectMediaUrl(normalized, kind) || normalized;
}

// ─── استخراج لیست لینک‌های تصویر از یک متن چسبانده‌شده (برای افزودن دسته‌جمعی استوری) ───
// هر لینک http(s) یا src هر تگ <img> شناسایی می‌شود؛ لینک‌ها می‌توانند با خط جدید، کاما،
// فاصله یا پرانتز از هم جدا شده باشند. فقط لینک‌های معتبر http/https برگردانده می‌شوند (بدون تکرار).
function cleanListUrl(u: string): string {
  let s = String(u || '').trim()
    .replace(/[)\],،؛'"<>]+$/, '')
    .replace(/^['"(<\s]+/, '');
  if (!/^https?:\/\//i.test(s)) return '';
  try {
    const p = new URL(s);
    return p.protocol === 'http:' || p.protocol === 'https:' ? p.toString() : '';
  } catch {
    return '';
  }
}

export function extractImageLinkList(value: unknown): string[] {
  const normalized = normalizeMediaInput(value);
  if (!normalized) return [];
  const out: string[] = [];
  const push = (candidate: string) => {
    const cleaned = cleanListUrl(candidate);
    if (cleaned && !out.includes(cleaned)) out.push(cleaned);
  };
  // ۱) تگ‌های <img src="...">
  const imgRe = /<img\b[^>]*?\bsrc\s*=\s*["']([^"']+)["']/gi;
  let m;
  while ((m = imgRe.exec(normalized))) push(m[1]);
  // ۲) لینک‌های مستقیم http(s) — روی پرانتز/براکت/کاما/ویرگول هم قطع می‌شود تا
  //    متن‌های بهم‌ریخته کپی‌شده (مثل `](https://…)` یا `…jpeg)،(`) درست جدا شوند.
  const urlRe = /https?:\/\/[^\s"'<>()\[\],،؛]+/gi;
  while ((m = urlRe.exec(normalized))) push(m[0]);
  return out;
}
