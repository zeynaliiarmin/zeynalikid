// Prerender سروری صفحات تک‌محتوای آموزش برای ربات‌ها (Googlebot و…) — Dynamic Rendering استاندارد گوگل.
// - ربات: این HTML کامل (بدون JS) را می‌گیرد — عنوان/توضیح/canonical/OG/JSON-LD + متن کامل مقاله.
// - انسان: همان SPA (صفحهٔ تمام‌صفحهٔ آیتم) — Vercel با تشخیص User-Agent بین این دو سوئیچ می‌کند.
// هیچ دادهٔ جدیدی ذخیره نمی‌شود؛ فقط همان یک ردیف settings خود‌دیتابیس خوانده می‌شود (با کش لبه).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = (Deno.env.get("SITE_BASE") || "").replace(/\/+$/, "");
function baseOf(settings: Record<string, any>): string {
  if (SITE) return SITE;
  const title = String(settings?.browserTitle || settings?.siteTitle || "");
  if (title.includes("زینال")) return "https://zeynalikid.vercel.app";
  if (title.includes("فرزند")) return "https://farzandman.vercel.app";
  return "https://zeynalikid.vercel.app";
}

const FA_MAP: Record<string, string> = {
  "آ":"a","ا":"a","ب":"b","پ":"p","ت":"t","ث":"s","ج":"j","چ":"ch","ح":"h","خ":"kh",
  "د":"d","ذ":"z","ر":"r","ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z","ط":"t","ظ":"z",
  "ع":"a","غ":"gh","ف":"f","ق":"gh","ک":"k","گ":"g","ل":"l","م":"m","ن":"n","و":"v","ه":"h","ی":"y",
  "ء":"","ئ":"y","ؤ":"o","إ":"e","أ":"a","ة":"h","ـ":"","‌":" ",
  "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
  "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9",
};
function slugifyFa(title: unknown, maxLen = 72): string {
  const t = String(title || "").trim();
  if (!t) return "";
  let out = "";
  for (const ch of t) {
    if (FA_MAP[ch] !== undefined) { out += FA_MAP[ch]; continue; }
    if (/[a-zA-Z0-9]/.test(ch)) { out += ch.toLowerCase(); continue; }
    if (/\s/.test(ch) || ch === "-" || ch === "–" || ch === "—" || ch === "_") { out += "-"; continue; }
  }
  return out.replace(/-+/g, "-").replace(/^-+|-+$/g, "").slice(0, maxLen).replace(/-+$/g, "");
}
function seoKeyOf(item: any): string {
  const slug = String(item?.slug || "").trim();
  if (/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return slug.toLowerCase();
  const derived = slugifyFa(item?.title || item?.name || "");
  return derived || String(item?.id || "").toLowerCase();
}

const esc = (v: unknown) => String(v ?? "")
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
  .replace(/"/g, "&quot;").replace(/'/g, "&#39;");

// مارکاپ این‌لاین متن‌ها — با کارت رسمی UI سازگار: **بولد** *کج* __زیرخط__ [متن](url) + لینک‌های داخلی
function inline(text: string): string {
  let t = esc(text);
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer" style="color:#0B5D56">$1</a>');
  t = t.replace(/\[([^\]]+)\]\((\/[^)\s]*)\)/g, '<a href="$2" style="color:#0B5D56">$1</a>');
  t = t.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  t = t.replace(/\*([^*\n]+)\*/g, "<em>$1</em>");
  t = t.replace(/__([^_]+)__/g, "<u>$1</u>");
  return t;
}
const metaDescOf = (text: unknown) => {
  const t = String(text || "").replace(/\*\*|\*|__/g, "").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/\s+/g, " ").trim();
  return t.length <= 155 ? t : t.slice(0, 154).replace(/\S+$/, "") + "…";
};

let cache: { at: number; settings: Record<string, any> } | null = null;
async function loadSettings(): Promise<Record<string, any>> {
  if (cache && Date.now() - cache.at < 10 * 60 * 1000) return cache.settings; // کش ۱۰ دقیقهٔ لبه
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  const { data } = await sb.from("settings").select("settings").eq("key", "app_settings").maybeSingle();
  const settings = (data?.settings || {}) as Record<string, any>;
  cache = { at: Date.now(), settings };
  return settings;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const slug = (url.searchParams.get("slug") || "").replace(/^\/+|\/+$/g, "").trim();
  try {
    const settings = await loadSettings();
    const brand = String(settings.browserTitle || settings.siteTitle || "سامانه").replace(/[“”"]/g, "").trim();
    const host = baseOf(settings);
    if (!slug) {
      return Response.redirect(`${host}/education`, 302);
    }
    const edu = settings.education && typeof settings.education === "object" ? settings.education : {};
    const items: any[] = (Array.isArray(edu.items) ? edu.items : []).filter((x: any) => x?.active !== false && x?.isVisible !== false);
    const key = decodeURIComponent(slug).toLowerCase();
    const item = items.find((x: any) => {
      const explicit = String(x?.slug || "").toLowerCase();
      if (explicit && explicit === key) return true;
      if (seoKeyOf(x) === key) return true;
      return String(x?.id || "").toLowerCase() === key;
    });
    if (!item) {
      // آیتم پیدا نشد: به لحاظ سئو باید 404 صادق بدهد، نه صفحه خالی — اما برای ربات، صفحهٔ ریدایرکت به لیست هم قابل قبول است
      return new Response(`<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8"><title>محتوا یافت نشد | ${esc(brand)}</title><meta name="robots" content="noindex"><meta http-equiv="refresh" content="2;url=${esc(host)}/education"></head><body><p>این محتوا یافت نشد. <a href="${esc(host)}/education">بازگشت به آموزش‌ها</a></p></body></html>`, { status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } });
    }

    const isArticle = !["video", "audio", "image"].includes(String(item.type || "").toLowerCase());
    const title = String(item.title || "");
    const desc = metaDescOf(item.desc || item.body || "");
    const canonical = `${host}/education/${encodeURIComponent(seoKeyOf(item))}`;
    const cover = String(item.cover || (Array.isArray(item.images) && item.images[0]?.url) || "");
    const keywords: string[] = Array.isArray(item.keywords) ? item.keywords : [];
    const paras: string[] = String(item.body || "").split("\n\n").map((p: string) => p.trim()).filter(Boolean);
    const images: any[] = Array.isArray(item.images) ? item.images.filter((im: any) => im && im.url) : [];
    const highlights: any[] = Array.isArray(item.highlights) ? item.highlights.filter((h: any) => h && h.text) : [];
    const topHighlights = highlights.filter((h) => !(Number(h?.position) > 0));

    const byPos: Record<number, any[]> = {};
    images.forEach((im) => { const p = Number(im.position) || 0; (byPos[p] = byPos[p] || []).push(im); });
    const hlPos: Record<number, any[]> = {};
    highlights.forEach((h) => { const p = Number(h.position) || 0; if (p > 0) (hlPos[p] = hlPos[p] || []).push(h); });

    const hlHtml = (h: any) => `<div style="background:${esc(h.color || "#DBEAFE")};color:#111;border-radius:14px;padding:12px 16px;line-height:2;font-weight:700;margin:14px 0">${inline(String(h.text))}</div>`;
    const imgHtml = (im: any) => `<img src="${esc(String(im.url))}" alt="${esc(String(im.alt || title))}" loading="lazy" referrerpolicy="no-referrer" style="width:100%;height:auto;border-radius:14px;margin:12px 0">`;

    let bodyContent = "";
    topHighlights.forEach((h) => { bodyContent += hlHtml(h); });
    if (paras.length) {
      bodyContent += inline(paras[0] ? "" : ""); // هیچ
      paras.forEach((p, idx) => {
        (byPos[idx] || []).forEach((im) => { bodyContent += imgHtml(im); });
        (hlPos[idx] || []).forEach((h) => { bodyContent += hlHtml(h); });
        bodyContent += `<p style="line-height:2.1;font-size:16px;margin:12px 0;color:#1a202c">${inline(p)}</p>`;
        (byPos[idx + 1] || []).forEach((im) => { bodyContent += imgHtml(im); });
        (hlPos[idx + 1] || []).forEach((h) => { bodyContent += hlHtml(h); });
      });
    } else if (item.desc) {
      bodyContent += `<p style="line-height:2.1;font-size:16px">${inline(String(item.desc))}</p>`;
    }
    if (item.quote) bodyContent += `<blockquote style="border-inline-start:4px solid #0F766E;margin:16px 0;padding:8px 16px;background:#F0FDF4;border-radius:10px;line-height:2">${inline(String(item.quote))}</blockquote>`;

    const ld = JSON.stringify({
      "@context": "https://schema.org",
      "@type": isArticle ? "Article" : (item.type === "video" ? "VideoObject" : "Article"),
      headline: title,
      description: desc,
      ...(cover ? { image: [cover] } : {}),
      ...(keywords.length ? { keywords: keywords.join(", ") } : {}),
      author: { "@type": "Person", name: String(item.author || brand) },
      inLanguage: "fa",
      mainEntityOfPage: canonical,
      url: canonical,
    });

    const html = `<!doctype html><html dir="rtl" lang="fa"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)} | ${esc(brand)}</title>
${desc ? `<meta name="description" content="${esc(desc)}">` : ""}
${keywords.length ? `<meta name="keywords" content="${esc(keywords.join(", "))}">` : ""}
<link rel="canonical" href="${esc(canonical)}">
<meta name="robots" content="index,follow,max-image-preview:large">
<meta property="og:type" content="article">
<meta property="og:site_name" content="${esc(brand)}">
<meta property="og:title" content="${esc(title)}">
${desc ? `<meta property="og:description" content="${esc(desc)}">` : ""}
${cover ? `<meta property="og:image" content="${esc(cover)}">` : ""}
<meta property="og:url" content="${esc(canonical)}">
<meta property="og:locale" content="fa_IR">
<meta name="twitter:card" content="${cover ? "summary_large_image" : "summary"}">
<meta name="twitter:title" content="${esc(title)}">
${desc ? `<meta name="twitter:description" content="${esc(desc)}">` : ""}
<script type="application/ld+json">${ld}</script>
<style>body{margin:0;font-family:Tahoma,Vazirmatn,Arial,sans-serif;background:#fff;color:#1a202c}main{max-width:760px;margin:0 auto;padding:16px}h1{font-size:22px;line-height:1.6;margin:10px 0}</style>
</head><body><main>
<nav style="padding:10px 0"><a href="${esc(host)}/education" style="color:#0B5D56;text-decoration:none">← بازگشت به آموزش‌ها</a></nav>
<article itemscope itemtype="https://schema.org/Article">
<h1 itemprop="headline">${esc(title)}</h1>
<p style="color:#4b5563;font-size:13px;margin:0 0 12px">${esc(String(item.author || brand))}${item.date ? " · " + esc(String(item.date)) : ""}${item.reviewedAt ? "" : ""}${item.sourceUrl && /^https?:\/\//.test(String(item.sourceUrl)) ? ` · <a href="${esc(String(item.sourceUrl))}" rel="noreferrer" target="_blank" style="color:#0B5D56">منبع</a>` : ""}</p>
${cover ? `<img src="${esc(cover)}" alt="${esc(title)}" style="width:100%;height:auto;border-radius:16px;margin:8px 0 12px">` : ""}
<div itemprop="articleBody">${bodyContent}</div>
</article>
<section style="margin-top:26px;background:#F8FAFC;border:1px solid #E2E8F0;border-radius:16px;padding:14px 18px">
<b>برای فرزندتان مسیر شخصی‌سازی‌شده لازم است؟</b>
<p style="font-size:13.5px;line-height:1.9;margin:8px 0">محتوای عمومی فقط برای آگاهی است؛ در مشاوره خصوصی ابتدا شرایط فرزند شما بررسی می‌شود و سپس برنامه مخصوص همان کودک پیشنهاد می‌شود.</p>
<a href="${esc(host)}/form" style="display:inline-block;background:#0F766E;color:#fff;padding:10px 20px;border-radius:12px;text-decoration:none;font-weight:700">درخواست مشاوره</a>
</section>
</main></body></html>`;
    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=600, s-maxage=3600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch {
    return new Response(`<!doctype html><html><head><meta http-equiv="refresh" content="0;url=https://zeynalikid.vercel.app/education"></head></html>`, { headers: { "Content-Type": "text/html" } });
  }
});
