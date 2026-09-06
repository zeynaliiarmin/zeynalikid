// supabase/functions/find-source/index.ts
// "دستیار سوم" — Finds the closest peer-reviewed English paper for a given
// Persian/English title (and optional body excerpt).
// Runs Semantic Scholar AND PubMed in parallel, merges & ranks, applies a minimum
// relevance threshold, and returns top N hits.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import {
  handleOptions, getOrigin, rejectIfInvalidOrigin, jsonResponse,
} from "../_shared/cors.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { rateLimit, rateLimitKey, cleanupExpiredBuckets } from "../_shared/rateLimit.ts";

const S2_SEARCH_URL = "https://api.semanticscholar.org/graph/v1/paper/search";
const S2_FIELDS = "paperId,title,authors,year,venue,externalIds,openAccessPdf,url,citationCount,publicationTypes,abstract";
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
  abstract?: string;
};

function pickUrl(p: S2Hit): string {
  const ids = p.externalIds || {};
  if (ids.PubMed) return `https://pubmed.ncbi.nlm.nih.gov/${ids.PubMed}/`;
  if (ids.DOI)    return `https://doi.org/${ids.DOI}`;
  if (p.openAccessPdf?.url) return p.openAccessPdf.url;
  return p.url || `https://www.semanticscholar.org/paper/${p.paperId}`;
}

function cleanText(t: string): string {
  return String(t||"")
    .replace(/[؟?!,،.;:«»"_\-/()\[\]{}]/g," ")
    .replace(/\s+/g," ")
    .trim()
    .slice(0, 800);
}

async function fetchJson<T>(url: string, wantStatus: number, init: RequestInit): Promise<T> {
  const resp = await fetch(url, init);
  if (resp.status !== wantStatus) {
    const txt = await resp.text().catch(() => "");
    throw new Error(`HTTP ${resp.status}: ${txt.slice(0,200)}`);
  }
  return await resp.json() as T;
}

async function fetchSemanticScholar(query: string, limit: number, signal: AbortSignal): Promise<S2Hit[]> {
  const u = new URL(S2_SEARCH_URL);
  u.searchParams.set("query", query);
  u.searchParams.set("limit", String(limit));
  u.searchParams.set("fields", S2_FIELDS);
  u.searchParams.set("fieldsOfStudy", "Medicine");
  u.searchParams.set("sort", "relevance");
  u.searchParams.set("year", "2005-");
  const resp = await fetch(u.toString(), {
    method: "GET",
    headers: { "Accept": "application/json" },
    signal,
  });
  if (resp.status === 429) throw new Error("S2_429");
  if (!resp.ok) {
    const t = await resp.text().catch(() => "");
    throw new Error(`S2_${resp.status}: ${t.slice(0,200)}`);
  }
  const j = await resp.json();
  return Array.isArray(j?.data) ? (j.data as S2Hit[]) : [];
}

const PUBMED_ESEARCH = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi";
const PUBMED_ESUMMARY = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi";
type PubMedHit = { pmid: string; title: string; source: string; pubdate: string; authors: string[]; };

async function fetchPubMed(query: string, limit: number, signal: AbortSignal): Promise<PubMedHit[]> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const sUrl = new URL(PUBMED_ESEARCH);
      sUrl.searchParams.set("db", "pubmed");
      sUrl.searchParams.set("term", query);
      sUrl.searchParams.set("retmax", String(limit));
      sUrl.searchParams.set("retmode", "json");
      sUrl.searchParams.set("sort", "relevance");
      sUrl.searchParams.set("mindate", "2005/01/01");
      sUrl.searchParams.set("datetype", "pdat");
      const sResp = await fetch(sUrl.toString(), { signal });
      if (sResp.status === 429) { await delay(600 + attempt*600); continue; }
      if (!sResp.ok) return [];
      const sJson = await sResp.json();
      const ids: string[] = sJson?.esearchresult?.idlist || [];
      if (!ids.length) return [];
      const uUrl = new URL(PUBMED_ESUMMARY);
      uUrl.searchParams.set("db", "pubmed");
      uUrl.searchParams.set("id", ids.join(","));
      uUrl.searchParams.set("retmode", "json");
      let uResp: Response | null = null;
      for (let a2 = 0; a2 < 3; a2++) {
        uResp = await fetch(uUrl.toString(), { signal });
        if (uResp.status !== 429) break;
        await delay(500 + a2*500);
      }
      if (!uResp || !uResp.ok) return [];
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
      await delay(400 + attempt*400);
    }
  }
  return [];
}

function delay(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// Keyword map: Persian regex -> English terms (pipe-separated alternatives for scoring).
// Each entry contributes independent English tokens; scoring rewards any token match.
type KWRule = { pattern: RegExp; en: string[]; prefer?: string[]; pubmedExtra?: string };

// Build a regex that treats zero-width-joiner and whitespace as equivalent, AND
// uses Persian/Arabic letter boundaries so "دبستان" does NOT match inside "دبستانی"
// and "تب" does NOT match inside "مرتب".
const PB = "(?<![\\u0600-\\u06FF\\u200c\\u064B-\\u0652])";
const PE = "(?![\\u0600-\\u06FF\\u200c\\u064B-\\u0652])";
const P = (s: string) => new RegExp(PB + s.replace(/\s+/g, "[\\s\\u200c]+") + PE);

const KEYWORD_RULES: KWRule[] = [
  { pattern: P("قد|رشد قد|کوتاهی قد|قد کوتاه|افزایش قد|نرسیدن به قد|قدکوتاه"), en: ["short stature","height growth","linear growth","growth velocity","height"], prefer: ["review","guideline"] },
  { pattern: P("وزن|اضافه وزن|کم وزنی|چاق|لاغر|چاقی|کاهش وزن|افزایش وزن|وزن گیری|کم وزنی|وزن کم"), en: ["obesity","weight gain","underweight","weight loss","body weight","overweight","failure to thrive","growth faltering"], prefer: ["review","guideline"] },
  { pattern: P("خواب|خوابیدن|بی خوابی|بدخوابی|ساعت خواب|کم خوابی|شب بیداری|خواب آلود|کابوس|دندان قروچه|نمی خوابد|دیر می خوابد"), en: ["sleep","insomnia","night waking","nightmare","bedtime","sleep duration","sleep hygiene"], prefer: ["review","meta"] },
  { pattern: P("شیر مادر|شیر خشک|شیر خوردن|از شیر گرفتن|قطع شیر|دوشیدن|پستان|مکیدن|شیردهی|شیرخوار"), en: ["breastfeeding","formula","breast milk","weaning","lactation"], prefer: ["review","guideline"] },
  { pattern: P("غذا|تغذیه|وعده|میان وعده|صبحانه|ناهار|شام|بدغذا|نخوردن غذا|کم اشتها|اشتهای|غذای کمک|کمکی|غذاخوردن|پوره|سرلاک|بد غذا|فینگرفود"), en: ["complementary feeding","feeding","appetite","picky eating","food refusal","nutrition","appetite loss","feeding difficulties"], prefer: ["review","guideline"] },
  { pattern: P("واکسن|واکسیناسیون|ایمن سازی|تزریق واکسن|واکسن زدن|مایه کوبی|ایمنی|مصونیت"), en: ["vaccination","vaccine","immunization","vaccine safety"], prefer: ["guideline","cohort"] },
  { pattern: P("ویتامین|مکمل|آهن|کلسیم|زینک|روی|دی 3|ویتامین د|ویتامین آ|ب کمپلکس|اسید فولیک|فقر آهن|کم خونی|آنمی|مولتی ویتامین|املاح|امگا 3|امگا|ریزمغذی"), en: ["vitamin d","vitamin a","iron deficiency","zinc","calcium","micronutrient","supplement","iron supplementation","vitamin"], prefer: ["rct","meta","guideline"] },
  { pattern: P("تب|دل پیچه|استفراغ|اسهال|یبوست|سرفه|آبریزش بینی|گلودرد|گوش درد|درد شکم|دل درد|کهیر|آلرژی|حساسیت|جوش|بثورات|خارش|آبله مرغان|ورم|سرماخوردگی"), en: ["fever","diarrhea","constipation","cough","otitis media","rash","allergy","dermatitis","colic","vomiting","wheezing","respiratory infection","common cold","pharyngitis"], prefer: ["guideline","review","cohort"] },
  { pattern: P("بازی|حرکت|مهارت|راه رفتن|چهار دست|نشستن|صحبت|تکلم|حرف زدن|غلتیدن|ایستادن|رشد حرکتی|رشد ذهنی|مراحل رشد|موتور|رشد"), en: ["child development","motor skills","developmental milestone","language development","gross motor","fine motor"], prefer: ["review","guideline"] },
  { pattern: P("اضطراب|ترس|خشم|پرخاش|لجبازی|عصبانی|نافرمانی|گریه|خلق|افسردگی|وسواس|اعتماد به نفس|استرس|کج خلقی|جدایی|اضطراب جدایی|روانی|خجالت"), en: ["anxiety","child behavior","tantrum","aggression","separation anxiety","attachment","emotional development"], prefer: ["review","meta","clinical trial"] },
  { pattern: P("مدرسه|مهد کودک|پیش دبستانی|دبستان|معلم|کلاس|درس|تحصیل|یادگیری|تمرکز|حواس پرتی|بیش فعالی|adhd|آموزگار|مشق|خواندن|نوشتن|نارساخوانی|دیسلکسیا"), en: ["adhd","attention deficit","school readiness","learning disability","dyslexia","school performance","academic achievement"], prefer: ["review","meta","rct","guideline"] },
  { pattern: P("موبایل|تلویزیون|تبلت|صفحه نمایش|نمایشگر|کارتون|بازی رایانه|بازی کامپیوتر|اسکرین|گوشی|موبایل|بازی موبایل"), en: ["screen time","screen exposure","television","mobile device","digital media"], prefer: ["cohort","review","guideline"] },
  { pattern: P("پوشک|توالت|دستشویی|توالت رفتن|آموزش توالت|شب ادراری"), en: ["toilet training","enuresis","diaper","potty training"], prefer: ["review","guideline"] },
  { pattern: P("بلوغ|بلوغ زودرس|تاخیر بلوغ|علایم بلوغ|پوبارتی|قاعدگی|عادت ماهانه|جوش صورت|آکنه|موی زائد|بلوغ دیررس|بلوغ زود"), en: ["puberty","precocious puberty","delayed puberty","menarche","pubertal","adolescent","acne"], prefer: ["review","guideline"] },
  { pattern: P("پوسیدگی|دندان|مسواک|فلوراید|دندان پزشک|دندان درآوردن|رویش دندان|دندان شیری|ارتودنسی|فلوراید تراپی"), en: ["dental caries","tooth eruption","oral health","fluoride","toothbrushing","early childhood caries"], prefer: ["review","guideline"] },
  { pattern: P("ویروس|کرونا|کووید|آنفولانزا|سرماخوردگی|عفونت|باکتری|آنتی بیوتیک|دارو|مسکن|پاراستامول|استامینوفن|ایبوپروفن|پنی سیلین|عفونت تنفسی|مننژیت"), en: ["antibiotic","covid","influenza","fever management","paracetamol","ibuprofen","respiratory infection","viral infection","meningitis"], prefer: ["guideline","review","cohort"] },
  { pattern: P("آسم|تنگی نفس|خس خس|برونشیت|اسپاسم تنفسی|تنفس|سرفه مزمن|پنومونی|ذات الریه|سینه پهلو"), en: ["asthma","wheezing","pneumonia","bronchiolitis","respiratory syncytial","croup"], prefer: ["guideline","review"] },
  { pattern: P("رفلاکس|برگشت شیر|بالا آوردن|reflux|GERD"), en: ["gastroesophageal reflux","gerd","regurgitation","reflux"], prefer: ["guideline","review"] },
  { pattern: P("اگزما|درماتیت|آتوپیک|پوست خشک|پوستی|خارش پوست|کرم مرطوب کننده|مرطوب کننده|کهیر"), en: ["atopic dermatitis","eczema","emollient","dry skin","diaper rash","urticaria"], prefer: ["guideline","rct","review"] },
  { pattern: P("خون ریزی|بینی خون|اپیستاکسی|زخم|سوختگی|شکستگی|آسیب|اورژانس|احیا|کمک های اولیه|خفگی|تشنج|صرع|غش"), en: ["epistaxis","nosebleed","seizure","first aid","burn","injury","choking","resuscitation"], prefer: ["guideline","cohort"] },
  { pattern: P("بارداری|باردار|حاملگی|جنین|سزارین|زایمان|نوزاد|نارس|دوقلو|نقایص مادرزادی|پره اکلامپسی|دیابت بارداری|نوزادی"), en: ["pregnancy","newborn","neonate","preterm birth","gestational diabetes","cesarean","birth weight"], prefer: ["cohort","review","guideline"] },
  { pattern: P("شیر گاو|آلرژی شیر|عدم تحمل|لاکتوز|حساسیت غذایی|غذایی آلرژی|آلرژی پروتئین|سلیاک|گلوتن"), en: ["cow milk allergy","food allergy","lactose intolerance","celiac disease","gluten","food hypersensitivity"], prefer: ["guideline","review"] },
  { pattern: P("قلدری|زورگیری|bullying|دعوا|کودک آزاری|فرزند پروری|تربیت|تنبیه|تشویق|والدین|پدر|مادر"), en: ["parenting","discipline","child rearing","bullying","child abuse","parenting style"], prefer: ["meta","review","cohort"] },
  { pattern: P("ورزش|فعالیت بدنی|حرکت بدنی|کم تحرکی|تحرک"), en: ["physical activity","exercise","sedentary","motor activity"], prefer: ["review","meta","guideline"] },
  { pattern: P("دهیدراته|کم آبی|تشنگی|مایعات|نوشیدن آب"), en: ["dehydration","fluid intake","water intake","oral rehydration"], prefer: ["guideline","review"] },
  { pattern: P("روتین|روال|روزانه|روزمره|برنامه|مقررات|قانون|نظم"), en: ["routine","discipline","limit setting","consistent parenting"], prefer: ["review","meta"] },
  { pattern: P("قولنج|کولیک|نفخ|باد شکم|گرفتگی شکم|گریه کولیکی"), en: ["infantile colic","colic","flatulence"], prefer: ["rct","review","meta"] },
  { pattern: P("مهد|جدا شدن|سازگاری|اجتماعی|دوست|هم بازی|تعامل|روز اول مهد"), en: ["childcare","preschool","social development","peer relations","daycare","separation"], prefer: ["cohort","review"] },
  { pattern: P("خود ارضایی|لمس اندام|تن مالی|اندام تناسلی|رفتار جنسی"), en: ["childhood sexual behavior","genital self-stimulation","masturbation"], prefer: ["review","guideline"] },
  { pattern: P("همکاری|اطاعت|دستور پدر|فرمان بردن|گوش دادن|حرف شنوی|حرف شنوی"), en: ["child compliance","obedience","parent-child relationship"], prefer: ["review","meta"] },
  { pattern: P("حسادت|رقابت|خواهر|برادر|فرزند دوم|فرزند جدید"), en: ["sibling rivalry","sibling","new baby","jealousy"], prefer: ["review","cohort"] },
  { pattern: P("نوزاد|شیرخوار|شیرخوارگی"), en: ["infant","newborn","neonate","breastfeeding"], prefer: ["review","guideline"] },
  { pattern: P("نوپا|یک ساله|دو ساله"), en: ["toddler","infant"], prefer: ["review","guideline"] },
  { pattern: P("کودک|کودکان|خردسال|بچه"), en: ["children","child","pediatric"], prefer: ["review","guideline"] },
];

type DetectedKw = {
  tokens: string[];     // all English terms for scoring
  prefer: string[];
  primaryRules: { tokens: string[]; prefer: string[] }[];  // per-rule tokens, primary first (best match)
};

function detectKeywords(all: string): DetectedKw {
  const tokens = new Set<string>();
  const prefer = new Set<string>();
  const matched: { tokens: string[]; prefer: string[]; score: number }[] = [];
  for (const r of KEYWORD_RULES) {
    const m = all.match(r.pattern);
    if (m) {
      // Score rule relevance by specificity: longer rules and more specific tokens rank higher.
      const spec = r.en.reduce((a,t)=>a+t.length,0) + r.en.length * 2;
      matched.push({ tokens: r.en, prefer: r.prefer||[], score: spec });
      for (const t of r.en) tokens.add(t);
      for (const p of (r.prefer||[])) prefer.add(p);
    }
  }
  matched.sort((a,b) => b.score - a.score);
  tokens.add("children"); tokens.add("child"); tokens.add("pediatric");
  return { tokens: Array.from(tokens), prefer: Array.from(prefer), primaryRules: matched };
}

type AgeGroup = "infant" | "toddler" | "preschool" | "child" | "adolescent";

function extractAge(text: string): AgeGroup | null {
  if (/نوزاد|شیرخوار|نوزادی/.test(text)) return "infant";
  if (/نوپا/.test(text)) return "toddler";
  if (/نوجوان|بلوغ/.test(text)) return "adolescent";
  if (/دبستان|مدرسه/.test(text)) return "child";
  if (/مهدکودک|پیشدبستان/.test(text)) return "preschool";
  const m = text.match(/(\d|[۰-۹])\s*(سال|ساله|ماه|ماهه)/);
  if (m) {
    const isMonth = /ماه/.test(m[2]);
    const d = "۰۱۲۳۴۵۶۷۸۹".indexOf(m[1]);
    const n = d >= 0 ? d : parseInt(m[1], 10);
    if (!isNaN(n)) {
      if (isMonth) {
        if (n < 24) return "infant";
        return "toddler";
      }
      if (n < 2) return "infant";
      if (n < 5) return "preschool";
      if (n < 12) return "child";
      return "adolescent";
    }
  }
  return null;
}

function ageFilterClause(age: AgeGroup | null): string {
  switch (age) {
    case "infant":     return `("infant"[MeSH Terms] OR infant[Title/Abstract] OR newborn[Title/Abstract] OR neonate[Title/Abstract])`;
    case "toddler":    return `("child, preschool"[MeSH Terms] OR toddler[Title/Abstract] OR preschool[Title/Abstract])`;
    case "preschool":  return `("child, preschool"[MeSH Terms] OR preschool[Title/Abstract])`;
    case "child":      return `("child"[MeSH Terms] OR school-age[Title/Abstract] OR school child[Title/Abstract])`;
    case "adolescent": return `("adolescent"[MeSH Terms] OR adolescent[Title/Abstract])`;
    default:           return `(child[Title/Abstract] OR children[Title/Abstract] OR pediatric[Title/Abstract] OR paediatric[Title/Abstract] OR infant[Title/Abstract])`;
  }
}

function buildQueries(title: string, body: string): { s2: string[]; pubmed: string[] } {
  const all = `${title} ${body}`;
  const kw = detectKeywords(all);
  const age = extractAge(all);
  const ageClause = ageFilterClause(age);

  const latinTitle = title
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/[\u0600-\u06FF\u0750-\u077F\uFB8A-\uFDFD]/g, " ")
    .replace(/\s+/g, " ").trim();

  // For each primary keyword rule, build a FOCUSED query:
  //   S2: "<primary token> children <prefer>" (first token of that rule is the anchor)
  //   PubMed: "<primary token>[tiab] AND children AND <review-type>"
  const s2: string[] = [];
  const pubmed: string[] = [];
  const topRules = kw.primaryRules.slice(0, 3);
  for (const rule of topRules) {
    const anchor = rule.tokens[0];
    if (!anchor) continue;
    const extras = rule.tokens.slice(1, 3).join(" ");
    const pref = rule.prefer[0] || "systematic review";
    // S2 queries
    s2.push(`${anchor} children ${extras} ${pref}`.replace(/\s+/g," ").slice(0,260));
    if (latinTitle.length > 2) s2.push(`${anchor} children ${latinTitle}`.replace(/\s+/g," ").slice(0,260));
    // PubMed queries
    pubmed.push(`("${anchor}"[Title/Abstract]) AND (children[Title/Abstract] OR pediatric[Title/Abstract]) AND (systematic review[pt] OR meta-analysis[pt] OR review[pt] OR guideline[pt]) AND ${ageClause}`);
    pubmed.push(`("${anchor}"[Title/Abstract]) AND (children[Title/Abstract] OR pediatric[Title/Abstract]) AND (randomized controlled trial[pt] OR cohort study[pt]) AND ${ageClause}`);
  }

  // If no rules matched (shouldn't happen because generic rules exist), add a fallback.
  if (!topRules.length) {
    s2.push("children growth nutrition parents systematic review");
    pubmed.push(`(children[Title/Abstract]) AND (systematic review[pt] OR guideline[pt]) AND ${ageClause}`);
  }

  // Deduplicate and cap.
  return {
    s2: Array.from(new Set(s2)).slice(0, 4),
    pubmed: Array.from(new Set(pubmed)).slice(0, 4),
  };
}

function scoreHit(p: S2Hit, anchorTokens: string[], primaryAnchor?: string): number {
  const titleL = (p.title||"").toLowerCase();
  const hay = `${p.title||""} ${p.abstract||""} ${p.venue||""}`.toLowerCase();
  let s = 0;
  const seen = new Set<string>();
  const meaningful = anchorTokens.filter(t => t.length > 3);
  for (const tok of meaningful) {
    const t = tok.toLowerCase();
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    const inTitle = re.test(titleL) || titleL.includes(t);
    const inHay = re.test(hay) || hay.includes(t);
    if (inHay) {
      if (!seen.has(t)) {
        s += (inTitle ? 8 : 2) + Math.min(3, t.length - 4);
        seen.add(t);
      }
    }
  }
  // Hard requirement: if we had a primary anchor (top keyword), it MUST appear in the title.
  if (primaryAnchor && primaryAnchor.length > 3) {
    const pa = primaryAnchor.toLowerCase();
    const re = new RegExp(`\\b${pa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`);
    if (!re.test(titleL) && !titleL.includes(pa)) s -= 30;
  }
  // Must match at least one meaningful non-generic anchor token in the TITLE.
  const nonGeneric = meaningful.filter(t => !/^(children|child|pediatric|paediatric|infant|adolescent|newborn|toddler|preschool|baby)$/.test(t));
  const anyInTitle = nonGeneric.some(t => {
    const tl = t.toLowerCase();
    return new RegExp(`\\b${tl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(titleL) || titleL.includes(tl);
  });
  if (!anyInTitle) s -= 15;
  // Penalize off-topic adult papers.
  if (!/\b(child|children|pediatric|paediatric|infant|toddler|adolescent|preschool|school-age|neonat|newborn|baby|boys|girls)\b/.test(hay)) s -= 5;
  // Recency
  if ((p.year||0) >= 2018) s += 2;
  if ((p.year||0) >= 2022) s += 1;
  // Identifiers
  const ids = p.externalIds || {};
  if (ids.PubMed) s += 25;
  if (ids.DOI)    s += 10;
  // Publication types
  const types = p.publicationTypes || [];
  if (types.includes("Review")) s += 12;
  if (types.includes("MetaAnalysis") || types.includes("Meta-Analysis")) s += 15;
  if (types.includes("JournalArticle")) s += 5;
  if (types.includes("ClinicalTrial") || types.includes("RandomizedControlledTrial")) s += 4;
  if (types.includes("Editorial") || types.includes("Comment") || types.includes("Letter")) s -= 8;
  // Venue / citations
  const c = Number(p.citationCount) || 0;
  s += Math.min(10, Math.log1p(c)/2);
  if (p.venue && !/arxiv|medrxiv|biorxiv|ssrn|preprint/i.test(p.venue)) s += 4;
  return s;
}

function pubmedToS2(pm: PubMedHit): S2Hit {
  return {
    paperId: `pmid:${pm.pmid}`,
    title: pm.title,
    authors: pm.authors.map(name => ({ name })),
    year: Number(pm.pubdate) || undefined,
    venue: pm.source,
    externalIds: { PubMed: pm.pmid },
    url: `https://pubmed.ncbi.nlm.nih.gov/${pm.pmid}/`,
    citationCount: 0,
  };
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

  let body: any = {};
  try { body = await req.json(); } catch { /* empty */ }
  const token = extractSessionToken(req, body);
  if (!token) return jsonResponse({ error: "Unauthorized" }, 401, origin);
  let validation;
  try { validation = await validateAdminSession(token); }
  catch (ve: any) { console.warn("validateAdminSession threw:", ve?.message||ve); return jsonResponse({error:"Unauthorized"},401,origin); }
  if (!validation?.ok) return jsonResponse({ error: "Unauthorized" }, 401, origin);

  const title = cleanText(body.title);
  const bodyExcerpt = cleanText(body.body || body.excerpt || "");
  const mode = body.mode === "multi" ? "multi" : "single";
  const limit = Math.max(1, Math.min(5, Number(body.limit) || (mode==="multi"?3:1)));
  if (!title) return jsonResponse({ error: "عنوان لازم است" }, 400, origin);

  // Skip extremely short inputs (user bug #3): require at least a few chars in title OR body
  // to avoid hallucinating a source for 1-2 word garbage.
  // Very short inputs (1-2 words, no body) are unlikely to have a real scientific match.
  // For anything slightly longer we try, and the relevance gate at the end decides.
  if (title.length < 4 && !bodyExcerpt) {
    return jsonResponse({ ok:false, error:"عنوان/متن خیلی کوتاه است. لطفاً متن کامل‌تری وارد کنید یا منبع را دستی اضافه کنید." }, 200, origin);
  }

  try {
    const cacheKey = title.slice(0,120);
    const supabase = getSupabaseAdmin();
    const { data: cached } = await supabase
      .from("source_finder_cache")
      .select("results, fetched_at")
      .eq("query_key", cacheKey)
      .maybeSingle();

    let hits: S2Hit[] = [];
    if (cached && (Date.now() - new Date(cached.fetched_at).getTime() < CACHE_TTL_DAYS*86400_000)) {
      hits = Array.isArray(cached.results) ? cached.results : [];
    } else {
      const queries = buildQueries(title, bodyExcerpt);
      const signal = AbortSignal.timeout(25000);
      const merged = new Map<string, S2Hit>();
      let s2RateLimited = false;

      const s2Promises = queries.s2.map(q =>
        fetchSemanticScholar(q, 10, signal).then(batch => {
          batch.forEach(p => { if (p?.paperId && !merged.has(p.paperId)) merged.set(p.paperId, p); });
        }).catch(e => {
          const msg = String((e as Error)?.message||e);
          if (msg.includes("S2_429")) s2RateLimited = true;
          console.warn("find-source S2 failed:", q, msg);
        })
      );
      const pmPromises = queries.pubmed.map(q =>
        fetchPubMed(q, 8, signal).then(pmHits => {
          for (const pm of pmHits) {
            const fakeId = `pmid:${pm.pmid}`;
            if (!merged.has(fakeId)) merged.set(fakeId, pubmedToS2(pm));
          }
        }).catch(e => console.warn("find-source PubMed failed:", String((e as Error)?.message||e)))
      );
      await Promise.all([...s2Promises, ...pmPromises]);
      hits = Array.from(merged.values());

      if (!s2RateLimited) {
        supabase.from("source_finder_cache").upsert({
          query_key: cacheKey,
          results: hits,
          fetched_at: new Date().toISOString(),
        }, { onConflict: "query_key" }).then(() => {}, () => {});
      }
    }

    const kw = detectKeywords(`${title} ${bodyExcerpt}`);
    const anchor = kw.tokens.filter(t => t.length > 3 && !/^(children|child|pediatric)$/.test(t));
    const primaryAnchor = (kw.primaryRules[0]?.tokens[0]) || "";
    const ranked = [...hits].sort((a,b) => scoreHit(b, anchor, primaryAnchor) - scoreHit(a, anchor, primaryAnchor));

    const best = ranked[0];
    const bestScore = best ? scoreHit(best, anchor, primaryAnchor) : -999;
    if (!best || bestScore < 8) {
      return jsonResponse({ ok:false, error:"منبع علمی نزدیکی پیدا نشد. لطفاً دستی وارد کنید یا عنوان/متن مقاله را دقیق‌تر بنویسید." }, 200, origin);
    }

    const picks = ranked.slice(0, limit).map(p => ({
      title: p.title,
      url: pickUrl(p),
      year: p.year || null,
      authors: (p.authors||[]).slice(0,3).map(a=>a.name),
      venue: p.venue || "",
      citationCount: p.citationCount || 0,
    }));

    return jsonResponse({ ok:true, results: picks, top: picks[0] }, 200, origin);
  } catch (e) {
    const msg = String((e as Error)?.message || e);
    console.warn("find-source error:", msg);
    return jsonResponse({ ok:false, error: `جست‌وجو ناموفق بود: ${msg}` }, 502, origin);
  }
});
