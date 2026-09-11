// Sitemap داینامیک — هر محتوای واقعی (درس/محصول/مقاله) به‌صورت خودکار لیست می‌شود، حتی بدون دیپلوی مجدد.
// GET /functions/v1/sitemap → text/xml (برای robots.txt + Google Search Console)
// هر دو پروژه (زینالیکید/فرزند من) از همین کد استفاده می‌کنند؛ داده از settings خودشان خوانده می‌شود.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE = (Deno.env.get("SITE_BASE") || "").replace(/\/+$/, "");

function fallbackBase(settings: Record<string, any>): string {
  if (SITE) return SITE;
  // پیش‌فرض بر اساس نام برند در تنظیمات (هر پروژه جدا)
  const title = String(settings?.browserTitle || settings?.siteTitle || "");
  if (title.includes("زینال")) return "https://zeynalikid.vercel.app";
  if (title.includes("فرزند")) return "https://farzandman.vercel.app";
  return "https://zeynalikid.vercel.app";
}

// slugifyFa — نسخهٔ سرور با همان خروجی کارتختهٔ مشترک seo.ts روی کاربر
const FA_MAP: Record<string, string> = {
  "آ":"a","ا":"a","ب":"b","پ":"p","ت":"t","ث":"s","ج":"j","چ":"ch","ح":"h","خ":"kh",
  "د":"d","ذ":"z","ر":"r","ز":"z","ژ":"zh","س":"s","ش":"sh","ص":"s","ض":"z","ط":"t","ظ":"z",
  "ع":"a","غ":"gh","ف":"f","ق":"gh","ک":"k","گ":"g","ل":"l","م":"m","ن":"n","و":"v","ه":"h","ی":"y",
  "ء":"","ئ":"y","ؤ":"o","إ":"e","أ":"a","ـ":"","‌":" ",
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

const STATIC_PAGES: Array<[string, string, string]> = [
  ["/", "1.0", "weekly"],
  ["/education", "0.9", "weekly"],
  ["/courses", "0.9", "weekly"],
  ["/products", "0.8", "weekly"],
  ["/experience", "0.7", "monthly"],
  ["/licenses", "0.6", "monthly"],
  ["/faq", "0.7", "monthly"],
  ["/about", "0.6", "monthly"],
  ["/contact", "0.6", "monthly"],
  ["/privacy", "0.4", "yearly"],
  ["/form", "0.9", "weekly"],
  ["/consultation", "0.8", "weekly"],
];

Deno.serve(async () => {
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const sb = createClient(url, key);
    const { data } = await sb.from("settings").select("settings").eq("key", "app_settings").maybeSingle();
    const settings = (data?.settings || {}) as Record<string, any>;
    const base = fallbackBase(settings);
    const today = new Date().toISOString().slice(0, 10);

    const rows: string[] = [];
    const push = (loc: string, priority: string, changefreq: string) => {
      rows.push(`  <url>\n    <loc>${base}${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <changefreq>${changefreq}</changefreq>\n    <priority>${priority}</priority>\n  </url>`);
    };
    STATIC_PAGES.forEach(([p, pr, cf]) => push(p, pr, cf));

    // محتوای آموزشی (فعال/نمایان) — از describe نمی‌آید؛ مستقیم از settings.education.items
    const edu = settings.education && typeof settings.education === "object" ? settings.education : {};
    const eduItems: any[] = Array.isArray(edu.items) ? edu.items : [];
    eduItems
      .filter((x: any) => x?.active !== false && x?.isVisible !== false)
      .forEach((x: any) => push(`/education/${encodeURIComponent(seoKeyOf(x))}`, "0.8", "weekly"));

    // دوره‌ها — courseTabs[].courses[] فعال
    const courseTabs: any[] = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
    courseTabs.forEach((t: any) => {
      (Array.isArray(t?.courses) ? t.courses : [])
        .filter((c: any) => c?.active !== false)
        .forEach((c: any) => push(`/courses/${encodeURIComponent(seoKeyOf(c))}`, "0.8", "weekly"));
    });

    // محصولات — products.list فعال/نمایان
    const prodSrc = settings.products && typeof settings.products === "object" ? settings.products : {};
    const prodList: any[] = Array.isArray(prodSrc.list) ? prodSrc.list : (Array.isArray(prodSrc.items) ? prodSrc.items : []);
    prodList
      .filter((p: any) => p?.isVisible !== false && p?.active !== false)
      .forEach((p: any) => push(`/products/${encodeURIComponent(seoKeyOf(p))}`, "0.7", "weekly"));

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${rows.join("\n")}\n</urlset>`;
    return new Response(xml, {
      headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600", "Access-Control-Allow-Origin": "*" },
    });
  } catch (e) {
    return new Response(
      `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>`,
      { headers: { "Content-Type": "application/xml; charset=utf-8" } },
    );
  }
});
