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
const CACHE_VERSION = "v6"; // bump to invalidate stale/poorly-matched cache entries

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
type KWRule = { pattern: RegExp; en: string[]; prefer?: string[]; isGeneric?: boolean };
type Rule = KWRule;

// Build a regex that treats zero-width-joiner and whitespace as equivalent, AND
// uses Persian/Arabic letter boundaries so "دبستان" does NOT match inside "دبستانی"
// and "تب" does NOT match inside "مرتب".
// Persian/Arabic letter boundary — a token starts after a non-letter (start of string,
// whitespace, punctuation, ZWNJ, Latin, digits) and ends before another letter. This
// prevents "در" (in) from matching inside "دختران" or "درس" falsely matching "د ر".
const PB = "(?<![\\u0600-\\u06FF\\u200c\\u064B-\\u0652])";
const PE = "(?![\\u0600-\\u06FF\\u200c\\u064B-\\u0652])";
// Build regex with word boundaries around each alternative so short words like "در",
// "تب", "قد" don't substring-match inside longer words (e.g. "دختران", "مرتب", "مقدار").
const P = (s: string) => {
  const alts = s.split("|").map(a => PB + a.replace(/\s+/g, "[\\s\\u200c]+") + PE);
  return new RegExp(alts.join("|"));
};

const KEYWORD_RULES: KWRule[] = [
  // ----- Specific topic rules (these anchor real queries) -----
  { pattern: P("قد|رشد قد|کوتاهی قد|قد کوتاه|افزایش قد|نرسیدن به قد|قدکوتاه"), en: ["short stature","height growth","linear growth","growth velocity","growth failure"], prefer: ["review","guideline"] },
  { pattern: P("وزن|اضافه وزن|کم وزنی|چاق|لاغر|چاقی|کاهش وزن|افزایش وزن|وزن گیری|کم وزنی|وزن کم"), en: ["obesity","weight gain","underweight","weight loss","overweight","failure to thrive","growth faltering"], prefer: ["review","guideline"] },
  { pattern: P("خواب|خوابیدن|بی خوابی|بدخوابی|ساعت خواب|کم خوابی|شب بیداری|خواب آلود|کابوس|دندان قروچه|نمی خوابد|دیر می خوابد"), en: ["sleep","insomnia","night waking","nightmare","bedtime","sleep duration","sleep hygiene"], prefer: ["review","meta"] },
  { pattern: P("شیر مادر|شیر خشک|شیر خوردن|از شیر گرفتن|قطع شیر|دوشیدن|پستان|مکیدن|شیردهی"), en: ["breastfeeding","formula","breast milk","weaning","lactation"], prefer: ["review","guideline"] },
  { pattern: P("غذا|تغذیه|وعده|میان وعده|صبحانه|ناهار|شام|بدغذا|نخوردن غذا|کم اشتها|اشتهای|غذای کمک|کمکی|غذاخوردن|پوره|سرلاک|بد غذا|فینگرفود|بد غذایی|رژیم غذایی"), en: ["complementary feeding","feeding behavior","appetite","picky eating","food refusal","child nutrition","feeding difficulties"], prefer: ["review","guideline"] },
  { pattern: P("بادام|بادوم"), en: ["almond"], prefer: ["review","cohort"] },
  { pattern: P("گردو"), en: ["walnut"], prefer: ["review","cohort"] },
  { pattern: P("پسته"), en: ["pistachio"], prefer: ["review","cohort"] },
  { pattern: P("فندق"), en: ["hazelnut"], prefer: ["review","cohort"] },
  { pattern: P("آجیل|مغزها|مغزها"), en: ["tree nuts","tree nut allergy","nut consumption"], prefer: ["review","cohort"] },
  { pattern: P("تخم مرغ|گوشت|مرغ|ماهی|سویا|حبوبات|عدس|لوبیا|نخود"), en: ["egg protein","animal protein","legume intake","soy protein","fish consumption","red meat protein"], prefer: ["review","cohort"] },
  { pattern: P("میوه|سبزی|سبزیجات|فیبر|فیبر|میوه ها|میوه ها"), en: ["fruit intake","vegetable intake","dietary fiber","fruit vegetable consumption"], prefer: ["review","cohort"] },
  { pattern: P("قند|شکر|نمک|چربی|روغن|کره|چرب|شیرین|نوشابه|آبمیوه|فست فود|تنقلات|هله هوله"), en: ["sugar intake","salt intake","fat intake","sugar sweetened beverage","processed food","junk food"], prefer: ["review","cohort"] },
  { pattern: P("آلرژی غذایی|آلرژی غذا|حساسیت غذایی|حساسیت به غذا|آلرژی به"), en: ["food allergy","food hypersensitivity","allergen introduction","food allergen"], prefer: ["guideline","review"] },
  { pattern: P("واکسن|واکسیناسیون|ایمن سازی|تزریق واکسن|واکسن زدن|مایه کوبی"), en: ["vaccination","vaccine","immunization","vaccine safety"], prefer: ["guideline","cohort"] },
  { pattern: P("ویتامین|مکمل|آهن|کلسیم|زینک|روی|دی 3|ویتامین د|ویتامین آ|ب کمپلکس|اسید فولیک|فقر آهن|کم خونی|آنمی|مولتی ویتامین|املاح|امگا 3|امگا|ریزمغذی|مکمل یاری"), en: ["vitamin d","vitamin a","iron deficiency","zinc supplementation","calcium intake","micronutrient supplementation","omega 3"], prefer: ["rct","meta","guideline"] },
  // Each common symptom gets its OWN rule so the FIRST English token matches that
  // symptom (not whichever word happened to come first in a big OR list).
  { pattern: P("تب"), en: ["fever"], prefer: ["guideline","review"] },
  { pattern: P("یبوست"), en: ["constipation"], prefer: ["guideline","review"] },
  { pattern: P("اسهال"), en: ["diarrhea"], prefer: ["guideline","review"] },
  { pattern: P("استفراغ|بالا آوردن|تهوع"), en: ["vomiting"], prefer: ["guideline","review"] },
  { pattern: P("سرفه"), en: ["cough"], prefer: ["guideline","review"] },
  { pattern: P("گلودرد|گلو درد"), en: ["sore throat","pharyngitis"], prefer: ["guideline","review"] },
  { pattern: P("گوش درد|گوش درد"), en: ["otitis media","ear pain"], prefer: ["guideline","review"] },
  { pattern: P("درد شکم|دل درد|دل پیچه|دلپیچه"), en: ["abdominal pain","recurrent abdominal pain"], prefer: ["guideline","review"] },
  { pattern: P("آبریزش بینی|سرماخوردگی"), en: ["common cold","respiratory infection"], prefer: ["review","cohort"] },
  { pattern: P("ورم"), en: ["edema","swelling"], prefer: ["review"] },
  { pattern: P("کهیر"), en: ["urticaria","hives"], prefer: ["guideline","review"] },
  { pattern: P("آلرژی|حساسیت|جوش|بثورات|خارش|آبله مرغان|حساسیتی"), en: ["allergy","hypersensitivity","rash","atopy","anaphylaxis"], prefer: ["guideline","review"] },
  { pattern: P("مهارت|راه رفتن|چهار دست|نشستن|صحبت|تکلم|حرف زدن|غلتیدن|ایستادن|رشد حرکتی|رشد ذهنی|مراحل رشد|موتور"), en: ["child development","motor skills","developmental milestone","language development","gross motor","fine motor"], prefer: ["review","guideline"] },
  { pattern: P("اضطراب|ترس|خشم|پرخاش|لجبازی|عصبانی|نافرمانی|گریه|خلق|افسردگی|وسواس|اعتماد به نفس|استرس|کج خلقی|جدایی|اضطراب جدایی|روانی|خجالت"), en: ["anxiety","child behavior","tantrum","aggression","separation anxiety","attachment","emotional development"], prefer: ["review","meta","clinical trial"] },
  { pattern: P("مدرسه|مهد کودک|پیش دبستانی|دبستان|معلم|کلاس|درس|تحصیل|یادگیری|تمرکز|حواس پرتی|بیش فعالی|adhd|آموزگار|مشق|خواندن|نوشتن|نارساخوانی|دیسلکسیا"), en: ["adhd","attention deficit","school readiness","learning disability","dyslexia","school performance","academic achievement"], prefer: ["review","meta","rct","guideline"] },
  { pattern: P("موبایل|تلویزیون|تبلت|صفحه نمایش|نمایشگر|کارتون|بازی رایانه|بازی کامپیوتر|اسکرین|گوشی|موبایل|بازی موبایل"), en: ["screen time","screen exposure","television","mobile device","digital media"], prefer: ["cohort","review","guideline"] },
  { pattern: P("پوشک|توالت|دستشویی|توالت رفتن|آموزش توالت|شب ادراری"), en: ["toilet training","enuresis","diaper","potty training"], prefer: ["review","guideline"] },
  { pattern: P("بلوغ|بلوغ زودرس|تاخیر بلوغ|علایم بلوغ|پوبارتی|قاعدگی|عادت ماهانه|جوش صورت|آکنه|موی زائد|بلوغ دیررس|بلوغ زود"), en: ["precocious puberty","puberty","delayed puberty","menarche","pubertal development","acne"], prefer: ["review","guideline"] },
  { pattern: P("پوسیدگی|دندان|مسواک|فلوراید|دندان پزشک|دندان درآوردن|رویش دندان|دندان شیری|ارتودنسی|فلوراید تراپی"), en: ["dental caries","tooth eruption","oral health","fluoride","toothbrushing","early childhood caries"], prefer: ["review","guideline"] },
  { pattern: P("ویروس|کرونا|کووید|آنفولانزا|سرماخوردگی|عفونت|باکتری|آنتی بیوتیک|دارو|مسکن|پاراستامول|استامینوفن|ایبوپروفن|پنی سیلین|عفونت تنفسی|مننژیت"), en: ["antibiotic","covid","influenza","fever management","paracetamol","ibuprofen","respiratory infection","viral infection","meningitis"], prefer: ["guideline","review","cohort"] },
  { pattern: P("آسم|تنگی نفس|خس خس|برونشیت|اسپاسم تنفسی|تنفس|سرفه مزمن|پنومونی|ذات الریه|سینه پهلو"), en: ["asthma","wheezing","pneumonia","bronchiolitis","respiratory syncytial","croup"], prefer: ["guideline","review"] },
  { pattern: P("رفلاکس|برگشت شیر|بالا آوردن|reflux|GERD"), en: ["gastroesophageal reflux","gerd","regurgitation","reflux"], prefer: ["guideline","review"] },
  { pattern: P("اگزما|درماتیت|آتوپیک|پوست خشک|پوستی|خارش پوست|کرم مرطوب کننده|مرطوب کننده|کهیر"), en: ["atopic dermatitis","eczema","emollient","dry skin","diaper rash","urticaria"], prefer: ["guideline","rct","review"] },
  { pattern: P("خون ریزی|بینی خون|اپیستاکسی|زخم|سوختگی|شکستگی|آسیب|اورژانس|احیا|کمک های اولیه|خفگی|تشنج|صرع|غش"), en: ["epistaxis","nosebleed","seizure","first aid","burn","injury","choking","resuscitation"], prefer: ["guideline","cohort"] },
  { pattern: P("بارداری|باردار|حاملگی|جنین|سزارین|زایمان|نوزاد|نارس|دوقلو|نقایص مادرزادی|پره اکلامپسی|دیابت بارداری"), en: ["pregnancy","newborn","neonate","preterm birth","gestational diabetes","cesarean","birth weight"], prefer: ["cohort","review","guideline"] },
  { pattern: P("شیر گاو|آلرژی شیر|آلرژی به شیر|عدم تحمل شیر|حساسیت به شیر|پروتئین شیر گاو|cow milk|حساسیت به شیر خشک|پروتئین شیر"), en: ["cow milk allergy","cow milk protein allergy","cow's milk allergy"], prefer: ["guideline","review"] },
  { pattern: P("پروتئین"), en: ["protein","dietary protein"], prefer: ["review"] },
  { pattern: P("عدم تحمل|لاکتوز|عدم تحمل لاکتوز"), en: ["lactose intolerance"], prefer: ["review","guideline"] },
  { pattern: P("سلیاک|گلوتن"), en: ["celiac disease","gluten"], prefer: ["guideline","review"] },
  { pattern: P("قلدری|زورگیری|bullying|دعوا|کودک آزاری|فرزند پروری|تربیت|تنبیه|تشویق|والدین|پدر|مادر"), en: ["parenting","discipline","child rearing","bullying","child abuse","parenting style"], prefer: ["meta","review","cohort"] },
  { pattern: P("ورزش|فعالیت بدنی|حرکت بدنی|کم تحرکی|تحرک|بازی کردن|فعالیت فیزیکی"), en: ["physical activity","exercise","sedentary behavior","motor activity"], prefer: ["review","meta","guideline"] },
  { pattern: P("دهیدراته|کم آبی|تشنگی|مایعات|نوشیدن آب|آب رسانی"), en: ["dehydration","fluid intake","water intake","oral rehydration"], prefer: ["guideline","review"] },
  { pattern: P("روتین|روال|روزانه|روزمره|برنامه|مقررات|قانون|نظم"), en: ["routine","discipline","limit setting","consistent parenting"], prefer: ["review","meta"] },
  { pattern: P("قولنج|کولیک|نفخ|باد شکم|گرفتگی شکم|گریه کولیکی"), en: ["infantile colic","colic","flatulence"], prefer: ["rct","review","meta"] },
  { pattern: P("همکاری|اطاعت|دستور پدر|فرمان بردن|گوش دادن|حرف شنوی"), en: ["child compliance","obedience","parent-child relationship"], prefer: ["review","meta"] },
  { pattern: P("حسادت|رقابت|خواهر|برادر|فرزند دوم|فرزند جدید"), en: ["sibling rivalry","sibling","new baby","jealousy"], prefer: ["review","cohort"] },
  { pattern: P("بازی"), en: ["play","child play","play activity","pretend play"], prefer: ["review","cohort"] },
  // ----- Generic age-only rules (must NEVER be the sole anchor) -----
  { pattern: P("نوزاد|شیرخوار|شیرخوارگی|نوزادی"), en: ["infant","newborn","neonate"], prefer: ["review","guideline"], isGeneric: true },
  { pattern: P("نوپا"), en: ["toddler"], prefer: ["review","guideline"], isGeneric: true },
  { pattern: P("کودک|کودکان|خردسال|بچه|فرزند"), en: ["children","child","pediatric"], prefer: ["review","guideline"], isGeneric: true },
  { pattern: P("نوجوان|بلوغ|نوجوانی"), en: ["adolescent","teen","youth"], prefer: ["review"], isGeneric: true },
];

type DetectedKw = {
  tokens: string[];     // all English tokens for scoring
  prefer: string[];
  primaryRules: { tokens: string[]; prefer: string[] }[];
  specificRules: { tokens: string[]; prefer: string[] }[];
  hasSpecific: boolean;
};

function detectKeywords(all: string): DetectedKw {
  const tokens = new Set<string>();
  const prefer = new Set<string>();
  const matched: { tokens: string[]; prefer: string[]; score: number; isGeneric: boolean }[] = [];
  for (const r of KEYWORD_RULES) {
    const m = all.match(r.pattern);
    if (m) {
      // Multi-word phrases are the most specific anchors; single-word tokens are weaker.
      // Generic (age-only) rules always lose to specific rules.
      const primary = r.en[0] || "";
      let spec = (primary.includes(" ") ? 1000 : 0)
        + primary.length * 5
        + r.en.reduce((a,t)=>a+t.length,0)
        + r.en.length * 2;
      if (r.isGeneric) spec = -1;  // generic rules are NEVER anchors for queries
      matched.push({ tokens: r.en, prefer: r.prefer||[], score: spec, isGeneric: !!r.isGeneric });
      for (const t of r.en) tokens.add(t);
      for (const p of (r.prefer||[])) prefer.add(p);
    }
  }
  tokens.add("children"); tokens.add("child"); tokens.add("pediatric");
  const specificRules = matched.filter(r => !r.isGeneric);
  // primaryRules = sorted specific rules by specificity desc (higher = more specific)
  const primaryRules = [...specificRules].sort((a,b) => b.score - a.score);
  return {
    tokens: Array.from(tokens),
    prefer: Array.from(prefer),
    primaryRules,
    specificRules,
    hasSpecific: specificRules.length > 0,
  };
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
    default:           return `(child[Title/Abstract] OR children[Title/Abstract] OR pediatric[Title/Abstract] OR paediatric[Title/Abstract] OR infant[Title/Abstract] OR neonate[Title/Abstract] OR newborn[Title/Abstract] OR adolescent[Title/Abstract])`;
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

  // For each primary keyword rule, build a TIGHT query:
  //   S2: repeat anchor twice to bias title matches; do NOT append unrelated extra words that
  //       confuse the engine.
  //   PubMed: anchor MUST be in TITLE ([ti]). We request more PubMed hits than S2 because
  //       PubMed filtering is more reliable.
  const pubmed: string[] = [];
  // Sort matched rules by specificity: multi-word primary anchors first (e.g. "precocious
  // puberty" over "adhd" or "puberty"), then by total token length, then by token count.
  // This prevents generic rules like "adhd" from dominating when a more specific rule
  // like "precocious puberty" is also present.
  const topRules = [...kw.specificRules]
    .sort((a,b) => {
      const aMulti = a.tokens[0]?.includes(" ") ? 1 : 0;
      const bMulti = b.tokens[0]?.includes(" ") ? 1 : 0;
      if (aMulti !== bMulti) return bMulti - aMulti;
      const aLen = a.tokens[0]?.length || 0;
      const bLen = b.tokens[0]?.length || 0;
      if (bLen !== aLen) return bLen - aLen;
      return b.tokens.length - a.tokens.length;
    })
    .slice(0, 3);
  for (const rule of topRules) {
    const anchor = rule.tokens[0];
    if (!anchor) continue;
    const isMulti = anchor.includes(" ");
    const anchorWords = anchor.split(/\s+/);
    // Build all phrase variants: exact, hyphenated (first two words), possessive,
    // AND-of-all-words. e.g. "cow milk allergy" →
    //   "cow milk allergy"  "cow-milk allergy"  "cow's milk allergy"
    //   "cow"[ti] AND "milk"[ti] AND "allergy"[ti]
    const variants: string[] = [`"${anchor}"[Title]`];
    if (isMulti) {
      if (anchorWords.length >= 2) {
        variants.push(`"${anchorWords[0]}-${anchorWords.slice(1).join(' ')}"[Title]`);
        variants.push(`"${anchorWords[0]}'s ${anchorWords.slice(1).join(' ')}"[Title]`);
      }
      variants.push(anchorWords.map(w => `"${w}"[Title]`).join(" AND "));
    }
    const anyVariant = variants.join(" OR ");
    const allWordsInTiab = anchorWords.map(w => `"${w}"[Title/Abstract]`).join(" AND ");
    const allWordsInTitle = anchorWords.map(w => `"${w}"[Title]`).join(" AND ");
    const pedTiab = "(children[Title/Abstract] OR pediatric[Title/Abstract] OR paediatric[Title/Abstract] OR infant[Title/Abstract] OR neonate[Title/Abstract] OR newborn[Title/Abstract] OR adolescent[Title/Abstract])";
    const pedTitle = "(children[Title] OR pediatric[Title] OR paediatric[Title] OR infant[Title] OR neonate[Title] OR newborn[Title] OR adolescent[Title] OR girls[Title] OR boys[Title])";
    const rev = "(systematic review[pt] OR meta-analysis[pt] OR review[pt] OR guideline[pt] OR practice guideline[pt] OR consensus[Title])";
    // 1) Any variant in title + pediatric in title + review/guideline
    pubmed.push(`(${anyVariant}) AND ${pedTitle} AND ${rev}`);
    // 2) Any variant in title + pediatric anywhere
    pubmed.push(`(${anyVariant}) AND ${pedTiab} AND ${rev} AND ${ageClause}`);
    // 3) Any variant + pediatric in title (any pub type)
    pubmed.push(`(${anyVariant}) AND ${pedTitle}`);
    // 4) All anchor words in Title + pediatric (very strict but matches "cow's milk protein allergy")
    if (isMulti) pubmed.push(`(${allWordsInTitle}) AND ${pedTiab} AND ${rev}`);
    // 5) All anchor words in tiab + pediatric tiab + review
    if (isMulti) pubmed.push(`(${allWordsInTiab}) AND ${pedTiab} AND ${rev}`);
    // 5) Single-word symptoms: require management/treatment to narrow
    if (!isMulti) {
      pubmed.push(`("${anchor}"[Title]) AND ${pedTiab} AND (guideline[pt] OR review[pt]) AND (management[tiab] OR treatment[tiab] OR approach[tiab])`);
    }
    // 6) Loose: any variant in title + pediatric anywhere, no type filter
    pubmed.push(`(${anyVariant}) AND ${pedTiab}`);
  }

  // If NO specific rules matched, return empty — the caller will refuse to search instead of inventing.
  if (!topRules.length) {
    return { s2: [], pubmed: [] };
  }

  // Deduplicate and cap.
  return {
    s2: [],
    pubmed: Array.from(new Set(pubmed)).slice(0, 9),
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
  // The primary anchor MUST appear in the title — every returned paper should be
  // about the main topic. If a paper has the anchor only in abstract/venue it's
  // almost certainly off-topic.
  if (primaryAnchor && primaryAnchor.length > 2) {
    const pa = primaryAnchor.toLowerCase();
    let inTitle = titleL.includes(pa);
    if (!inTitle && /^[a-z][a-z-]+$/.test(pa)) {
      inTitle = new RegExp(`\\b${pa.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(titleL);
    }
    if (!inTitle) s -= 200; // huge penalty: without anchor in title it cannot be the right paper
    else s += 20;
  }
  // Count how many other specific anchor tokens appear in the title (more matches = better).
  const nonGeneric = meaningful.filter(t => !/^(children|child|pediatric|paediatric|infant|adolescent|newborn|toddler|preschool|baby|boys|girls)$/.test(t));
  let titleHits = 0;
  for (const t of nonGeneric) {
    const tl = t.toLowerCase();
    if (tl === primaryAnchor.toLowerCase()) continue; // already counted above
    const inT = titleL.includes(tl) || (/^[a-z][a-z-]+$/.test(tl) && new RegExp(`\\b${tl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`).test(titleL));
    if (inT) titleHits++;
  }
  s += Math.min(10, titleHits * 3);
  // Penalize off-topic adult papers.
  if (!/\b(child|children|pediatric|paediatric|infant|toddler|adolescent|preschool|school-age|neonat|newborn|baby|boys|girls)\b/.test(hay)) s -= 5;
  // Penalize disease-specific papers that mention the anchor but are NOT general pediatric
  // guidance (e.g. "fever in TB", "fever in cancer", "fever, aphthous stomatitis (PFAPA)").
  // These are the #1 source of false positives when a generic symptom (fever, cough,
  // rash) is the anchor.
  const offTopic = [
    "tuberculosis","neutropenia","cancer","oncology","leukemia","chemotherapy",
    "pfapa","periodic fever","familial mediterranean","fmf",
    "transplant","hematopoietic","sickle cell","cystic fibrosis",
    "malaria","dengue","hiv","kawasaki",  // keep kawasaki as slight negative (still a fever disease)
    "appendicitis","meningitis","sepsis",  // specific disease — not general fever management
    "vitamin d supplementation",          // don't let vit D trial pop up for "cough" or "fever"
  ];
  for (const bad of offTopic) {
    if (titleL.includes(bad)) s -= 25;
  }
  // Reward titles that contain child/pediatric/infant directly in the TITLE
  // (paper is explicitly about children, not just mentioning them in abstract).
  if (/\b(children|child|pediatric|paediatric|infant|adolescent|toddler|newborn|neonatal|baby)\b/.test(titleL)) s += 15;
  // Reward titles that look like reviews/guidelines about the topic in children,
  // by boosting common "in children" / "pediatric" constructions in the title.
  if (/\b(in children|in infants|in pediatric|in paediatric|children and|in childhood|pediatric)\b/.test(titleL)) s += 8;
  // Boost titles that contain a "review/guideline/management/consensus" signal.
  if (/\b(review|guideline|consensus|management|recommendation|approach|meta-analysis|systematic)\b/i.test(titleL)) s += 6;
  // Penalize papers about a DIFFERENT condition (specific diagnosis in title that is NOT
  // the anchor) when the anchor is a generic symptom (fever/cough/sleep/constipation).
  // This prevents returning ADHD papers for "sleep", TB papers for "fever", etc.
  const distractors = [
    "attention deficit","adhd","methylphenidate",
    "tuberculosis","malaria","dengue","hiv","kawasaki","meningitis",
    "sickle cell","cystic fibrosis","leukemia","cancer","neutropenia",
    "diabetes","epilepsy","autism",
  ];
  for (const bad of distractors) {
    // Only penalize if the anchor itself is NOT this distractor
    if (primaryAnchor && titleL.includes(bad) && !primaryAnchor.toLowerCase().includes(bad.split(" ")[0])) {
      s -= 30;
    }
  }
  // Recency
  if ((p.year||0) >= 2018) s += 2;
  if ((p.year||0) >= 2022) s += 1;
  // Identifiers — PubMed/DOI confirm peer-reviewed publication (moderate bonus).
  const ids = p.externalIds || {};
  if (ids.PubMed) s += 10;
  if (ids.DOI)    s += 4;
  // Publication types
  const types = p.publicationTypes || [];
  if (types.includes("Review")) s += 4;
  if (types.includes("MetaAnalysis") || types.includes("Meta-Analysis")) s += 6;
  if (types.includes("Guideline") || types.includes("PracticeGuideline")) s += 8;
  if (types.includes("JournalArticle")) s += 2;
  if (types.includes("ClinicalTrial") || types.includes("RandomizedControlledTrial")) s += 2;
  if (types.includes("Editorial") || types.includes("Comment") || types.includes("Letter")) s -= 10;
  if (types.includes("CaseReports")) s -= 6;
  // Venue / citations
  const c = Number(p.citationCount) || 0;
  s += Math.min(5, Math.log1p(c)/3);
  if (p.venue && !/arxiv|medrxiv|biorxiv|ssrn|preprint/i.test(p.venue)) s += 2;
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
    const cacheKey = `${CACHE_VERSION}::${title.slice(0,120)}`;
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
      // If buildQueries returned empty (no specific keyword detected), fall through to the
      // guard below which returns an error — do not search at all.
      if (!queries.s2.length && !queries.pubmed.length) {
        return jsonResponse({ ok:false, error:"منبع علمی نزدیکی پیدا نشد (کلیدواژهٔ موضوعی تشخیص داده نشد). لطفاً عنوان را با ذکر موضوع دقیق‌تر بنویسید یا منبع را دستی وارد کنید." }, 200, origin);
      }
      const signal = AbortSignal.timeout(25000);
      const merged = new Map<string, S2Hit>();
      let s2RateLimited = false;

      // S2 is intentionally disabled: for Persian pediatric queries its relevance
      // ranking returns far too many off-topic hits (vitamin-D, ADHD, etc.) that drown
      // out PubMed's precise title-anchored matches. PubMed alone is sufficient and
      // more accurate for this use case.
      const s2Promises: Promise<void>[] = [];
      s2RateLimited = true; // treat as rate-limited to prevent caching a PubMed-only set
      // Ask PubMed for more candidates per query (15) so we don't miss the well-matched
      // guideline/review paper that would have been ranked #9+.
      const pmPromises = queries.pubmed.map(q =>
        fetchPubMed(q, 15, signal).then(pmHits => {
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
          meta: { version: CACHE_VERSION },
        }, { onConflict: "query_key" }).then(() => {}, () => {});
      }
    }

    const kw = detectKeywords(`${title} ${bodyExcerpt}`);
    // Hard guard: if only generic (age-only) rules matched, we have no actual topic → refuse to invent a source.
    if (!kw.hasSpecific) {
      return jsonResponse({ ok:false, error:"منبع علمی نزدیکی پیدا نشد (کلیدواژهٔ موضوعی تشخیص داده نشد). لطفاً عنوان را با ذکر موضوع دقیق‌تر بنویسید یا منبع را دستی وارد کنید." }, 200, origin);
    }
    // Anchor for scoring = tokens from specific rules only (exclude generic age terms so they don't dilute matching).
    const genericSet = new Set<string>();
    for (const r of KEYWORD_RULES) if (r.isGeneric) for (const t of r.en) genericSet.add(t.toLowerCase());
    const anchor = kw.specificRules.flatMap(r => r.tokens).filter(t => t.length > 3 && !genericSet.has(t.toLowerCase()));
    const primaryAnchor = (kw.specificRules[0]?.tokens[0]) || "";
    const ranked = [...hits].sort((a,b) => scoreHit(b, anchor, primaryAnchor) - scoreHit(a, anchor, primaryAnchor));

    const best = ranked[0];
    const bestScore = best ? scoreHit(best, anchor, primaryAnchor) : -999;
    if (!best || bestScore < 5) {
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
