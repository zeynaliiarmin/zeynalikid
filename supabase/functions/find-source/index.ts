// supabase/functions/find-source/index.ts
// "دستیار سوم" — Finds the closest peer-reviewed English paper for a given
// Persian/English title (and optional body excerpt), returns a {url, title, authors, year, venue}
// object so the UI can auto-fill sourceUrl / sourceTitle.
//
// Uses Semantic Scholar's free public Graph API (no API key needed).
// Rate-limited per IP + per session; caches results by title hash in DB so the same
// article title is not re-queried on every save.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  handleOptions, getOrigin, rejectIfInvalidOrigin, jsonResponse,
} from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken, sha256 } from "../_shared/adminAuth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { rateLimit, rateLimitKey, cleanupExpiredBuckets } from "../_shared/rateLimit.ts";

const S2_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const S2_FIELDS = "paperId,title,authors,year,venue,externalIds,openAccessPdf,url,citationCount,publicationTypes";
const CACHE_TTL_DAYS = 180;

type S2Hit = {
  paperId: string;
  title: string;
  authors?: { name: string }[];
  year?: number;
  venue?: string;
  externalIds?: Record<string,string>;
  openAccessPdf?: { url: string };
  url?: string;
  citationCount?: number;
  publicationTypes?: string[];
};

function pickUrl(p: S2Hit): string {
  // Prefer PubMed / DOI / open PDF / S2 page
  const ids = p.externalIds || {};
  if (ids.PubMed) return `https://pubmed.ncbi.nlm.nih.gov/${ids.PubMed}/`;
  if (ids.DOI)    return `https://doi.org/${ids.DOI}`;
  if (p.openAccessPdf?.url) return p.openAccessPdf.url;
  return p.url || `https://www.semanticscholar.org/paper/${p.paperId}`;
}

function bestUrl(p: S2Hit): string {
  // For E-E-A-T we prefer the most authoritative/canonical source:
  // PubMed > DOI > WHO/CDC/AAP would come from text search, but S2 only returns paper metadata.
  return pickUrl(p);
}

function cleanText(t: string): string {
  return String(t||"")
    .replace(/[؟?!,،.;:«»"\-_/()[\]{}]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0, 280);
}

async function fetchSemanticScholar(query: string, limit: number): Promise<S2Hit[]> {
  const u = new URL(S2_SEARCH_URL);
  u.searchParams.set("query", query);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("fields", S2_FIELDS);
  u.searchParams.set("fieldsOfStudy", "Medicine");
  u.searchParams.set("sort", "relevance");
  const resp = await fetch(u.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  if (resp.status === 429) {
    // S2 free tier rate-limits — tell the caller to retry later.
    throw new Error("Semantic Scholar rate-limited");
  }
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`Semantic Scholar ${resp.status}: ${t.slice(0,200)}`);
  }
  const j = await resp.json();
  return Array.isArray(j?.data) ? (j.data as S2Hit[]) : [];
}

// Backup: PubMed ESearch + ESummary — no API key, no strict rate limit.
const PUBMED_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
type PubMedHit = { pmid: string; title: string; source: string; pubdate: string; authors: string[]; };

async function fetchPubMed(query: string, limit: number): Promise<PubMedHit[]> {
  try {
    const sUrl = new URL(PUBMED_ESEARCH);
    sUrl.searchParams.set("db", "pubmed");
    sUrl.searchParams.set("term", query);
    sUrl.searchParams.set("retmax", String(limit));
    sUrl.searchParams.set("retmode", "json");
    sUrl.searchParams.set("sort", "relevance");
    const sResp = await fetch(sUrl.toString(), { signal: AbortSignal.timeout(12000) });
    if (!sResp.ok) return [];
    const sJson = await sResp.json();
    const ids: string[] = sJson?.esearchresult?.idlist || [];
    if (!ids.length) return [];
    const uUrl = new URL(PUBMED_ESUMMARY);
    uUrl.searchParams.set("db", "pubmed");
    uUrl.searchParams.set("id", ids.join(","));
    uUrl.searchParams.set("retmode", "json");
    const uResp = await fetch(uUrl.toString(), { signal: AbortSignal.timeout(12000) });
    if (!uResp.ok) return [];
    const uJson = await uResp.json();
    return ids.map(id => {
      const r = uJson?.result?.[id];
      if (!r) return null;
      return {
        pmid: id,
        title: String(r.title || "").replace(/\.$/, ""),
        source: String(r.fulljournalname || r.source || ""),
        pubdate: String(r.pubdate || "").slice(0,4),
        authors: Array.isArray(r.authors) ? r.authors.slice(0,3).map((a:any)=>String(a.name||"")) : [],
      };
    }).filter(Boolean) as PubMedHit[];
  } catch {
    return [];
  }
}

// Map common Persian topic keywords to English queries so Semantic Scholar (English-only)
// can actually find peer-reviewed results.
function buildQueries(title: string, body: string): string[] {
  const all = `${title} ${body}`;
  const kw: string[] = [];
  if (/قد|رشد\s*قد|قد\s*کودک/.test(all)) kw.push("child height growth");
  if (/وزن/.test(all)) kw.push("child weight growth");
  if (/اشتها|بدغذا|بد\s*غذا/.test(all)) kw.push("picky eating preschool children appetite");
  if (/تغذیه|غذا\s*خوردن|وعده/.test(all)) kw.push("child nutrition feeding practices");
  if (/خواب/.test(all)) kw.push("child sleep duration school performance");
  if (/تمرکز|ذهن|هوش|یادگیری|حافظه/.test(all)) kw.push("children attention focus cognitive");
  if (/مکمل|ویتامین|مولتی|ویتامین\s*د|آهن|روی/.test(all)) kw.push("micronutrient supplementation children growth");
  if (/اضطراب|نگرانی|استرس|والد/.test(all)) kw.push("parental stress child feeding parenting");
  if (/اسهال|یبوست|گوارش|معده|دل\s*درد/.test(all)) kw.push("children functional gastrointestinal disorders");
  if (/بلوغ/.test(all)) kw.push("puberty growth adolescent nutrition");
  if (/قدرت\s*ایمنی|ایمنی|سرماخوردگی|بیماری/.test(all)) kw.push("immune function children nutrition");
  if (!kw.length) kw.push("children growth nutrition parents systematic review");
  // Build 2 queries:
  // 1) Pure English keywords (most reliable for S2)
  // 2) Keywords + latinized digits/spaces (for titles that contain numerals/transliterated words)
  const asciiTitle = title.replace(/[^\p{L}\p{N}\s]/gu, " ").replace(/[\u0600-\u06FF\u0750-\u077F\uFB8A-\uFDFD]/g, " ").replace(/\s+/g, " ").trim();
  const q1 = kw.join(" ") + " systematic review";
  const q2 = asciiTitle ? `${q1} ${asciiTitle}`.slice(0,240) : q1;
  return [q1, q2];
}

function scoreHit(p: S2Hit, query: string): number {
  let s = 0;
  // Prefer papers with PubMed ID or DOI (peer-reviewed)
  const ids = p.externalIds || {};
  if (ids.PubMed) s += 60;
  if (ids.DOI)    s += 30;
  // Prefer review/meta-analysis/journal articles
  const types = p.publicationTypes || [];
  if (types.includes("Review")) s += 25;
  if (types.includes("MetaAnalysis") || types.includes("Meta-Analysis")) s += 30;
  if (types.includes("JournalArticle")) s += 10;
  // Citation count (log bonus)
  const c = Number(p.citationCount) || 0;
  s += Math.min(30, Math.log1p(c));
  // Prefer non-preprint venues
  if (p.venue && !/arxiv|medrxiv|biorxiv|ssrn/i.test(p.venue)) s += 15;
  // Recency: small bonus for papers after 2010
  if ((p.year||0) >= 2015) s += 5;
  if ((p.year||0) >= 2020) s += 3;
  return s;
}

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _o = rejectIfInvalidOrigin(req, { allowNoOrigin: false }); if (_o) return _o;

  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);

  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "find-source"), { maxRequests: 20, windowMs: 60_000 });
  if (!rl.ok) return jsonResponse({ error: "تعداد درخواست‌ها زیاد است. کمی بعد تلاش کنید." }, 429, origin);

  // Require a valid admin session.
  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const token = extractSessionToken(req, body);
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401, origin);
  const supabase = getSupabaseAdmin();
  let validation;
  try {
    validation = await validateAdminSession(token);
  } catch (ve: any) {
    console.warn("validateAdminSession threw:", ve?.message || ve);
    return jsonResponse({ error: "Unauthorized" }, 401, origin);
  }
  if (!validation?.ok) return jsonResponse({ error: "Unauthorized" }, 401, origin);

  const title = cleanText(body.title);
  const bodyExcerpt = cleanText(body.body || body.excerpt || "");
  const mode = body.mode === "multi" ? "multi" : "single";
  const limit = Math.max(1, Math.min(5, Number(body.limit) || (mode==="multi"?3:1)));

  if (!title) return jsonResponse({ error: "عنوان لازم است" }, 400, origin);

  const query = bodyExcerpt
    ? `${title} ${bodyExcerpt.split(" ").slice(0,12).join(" ")}`
    : title;

  try {
    // Check cache first (simple key = first 120 chars of cleaned title)
    const cacheKey = title.slice(0,120);
    const { data: cached } = await supabase
      .from("source_finder_cache")
      .select("results, fetched_at")
      .eq("query_key", cacheKey)
      .maybeSingle();

    let hits: S2Hit[] = [];
    if (cached && (Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_DAYS*86400_000)) {
      hits = Array.isArray(cached.results) ? cached.results : [];
    } else {
      // Try multiple English queries; merge & de-duplicate from Semantic Scholar.
      const queries = buildQueries(title, bodyExcerpt);
      const merged = new Map<string, S2Hit>();
      let s2RateLimited = false;
      for (const q of queries) {
        try {
          const batch = await fetchSemanticScholar(q, 8);
          batch.forEach(p => { if (p?.paperId && !merged.has(p.paperId)) merged.set(p.paperId, p); });
        } catch (e) {
          const msg = String((e as Error)?.message || e);
          if (msg.includes("rate-limited")) s2RateLimited = true;
          console.warn("find-source S2 query failed:", q, msg);
        }
      }
      hits = Array.from(merged.values());

      // If S2 returned nothing (either rate-limited or just no hits), fall back to PubMed E-utilities.
      if (hits.length === 0) {
        for (const q of queries) {
          try {
            const pmHits = await fetchPubMed(q, 5);
            for (const pm of pmHits) {
              const fakeId = `pmid:${pm.pmid}`;
              if (merged.has(fakeId)) continue;
              const s2like: S2Hit = {
                paperId: fakeId,
                title: pm.title,
                authors: pm.authors.map(name => ({ name })),
                year: Number(pm.pubdate) || undefined,
                venue: pm.source,
                externalIds: { PubMed: pm.pmid },
                url: `https://pubmed.ncbi.nlm.nih.gov/${pm.pmid}/`,
                citationCount: 0,
              };
              merged.set(fakeId, s2like);
            }
          } catch (e) {
            console.warn("find-source PubMed query failed:", String((e as Error)?.message||e));
          }
        }
        hits = Array.from(merged.values());
      }

      // Only cache if S2 wasn't rate-limited (so we don't cache empty results due to throttling).
      if (!s2RateLimited) {
        supabase.from("source_finder_cache").upsert({
          query_key: cacheKey,
          results: hits,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "query_key" }).then(() => {}, () => {});
      }
    }

    const ranked = [...hits].sort((a,b)=>scoreHit(b,query)-scoreHit(a,query));
    const picks = ranked.slice(0, limit).map(p => ({
      title: p.title,
      url: bestUrl(p),
      year: p.year || null,
      authors: (p.authors||[]).slice(0,3).map(a=>a.name),
      venue: p.venue || "",
      citationCount: p.citationCount || 0,
    }));

    if (!picks.length) {
      return jsonResponse({ ok:false, error:"منبع علمی مرتبطی پیدا نشد. لطفاً دستی وارد کنید." }, 200, origin);
    }

    return jsonResponse({ ok:true, results: picks, top: picks[0] }, 200, origin);
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    console.warn("find-source error:", msg);
    return jsonResponse({ ok:false, error: `جست‌وجو ناموفق بود: ${msg}` }, 502, origin);
  }
});
