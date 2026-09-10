// supabase/functions/content-api/index.ts
// API for AI agents to manage content via API keys created from admin panel security section.
// Free - uses existing Supabase Edge Functions, no extra cost.
// Deploy: supabase functions deploy content-api --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, getOrigin } from "../_shared/cors.ts";
import { POLICY_VERSION, scanContentPolicy, policySummary } from "../_shared/contentPolicy.ts";

// ──────────────────────────────────────────────────────────────────────────
// Self-discovery for AI agents (هویت برند + نقشهٔ قابلیت‌ها)
// ──────────────────────────────────────────────────────────────────────────
const SUPA_URL = Deno.env.get("SUPABASE_URL") || "";
const BRAND = SUPA_URL.includes("kkdrvexwzuuumjezipnd")
  ? { id: "zeynalikid", name_fa: "زینالی‌کید", name_en: "ZeynaliKid", site: "https://zeynalikid.vercel.app" }
  : SUPA_URL.includes("doikoqzarsuprcwkghsq")
  ? { id: "afradikid", name_fa: "فرزند من", name_en: "Farzand Man", site: "https://farzandman.vercel.app" }
  : { id: "generic", name_fa: "وب‌سایت", name_en: "Website", site: "" };

const BASE_URL = SUPA_URL ? `${SUPA_URL.replace(/\/$/, "")}/functions/v1/content-api` : "https://<project-ref>.supabase.co/functions/v1/content-api";

interface CapabilitySpec { fa: string; en: string; actions: string[]; verbs_fa: string; verbs_en: string; }
const CAPABILITY_CATALOG: Record<string, CapabilitySpec> = {
  reviews:   { fa: "نظرات کاربران", en: "reviews", actions: ["list_reviews","get_review","create_review","update_review","delete_review"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  faqs:      { fa: "سؤالات متداول (FAQ)", en: "faqs", actions: ["list_faqs","get_faq","create_faq","update_faq","delete_faq"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  courses:   { fa: "دوره‌ها", en: "courses", actions: ["list_courses","get_course","create_course","update_course","delete_course","set_discount","remove_discount","set_tag","remove_tag","set_featured","unset_featured"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف، تخفیف/برچسب/ویژه", verbs_en: "list, create, update, delete, discounts/tags/featured" },
  products:  { fa: "محصولات", en: "products", actions: ["list_products","get_product","create_product","update_product","delete_product"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  articles:  { fa: "مقالات", en: "articles", actions: ["list_articles","get_media","create_article","update_article","delete_article"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  stories:   { fa: "استوری‌ها و هایلایت‌ها", en: "stories/highlights", actions: ["list_stories","get_highlight","create_story","update_story","delete_story"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  parent_experiences: { fa: "تجربیات والدین", en: "parent experiences", actions: ["list_media","get_media","create_media","update_media","delete_media"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  multimedia:{ fa: "چندرسانه‌ای (رسانه‌ها)", en: "multimedia/media", actions: ["list_media","get_media","create_media","update_media","delete_media"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  education: { fa: "آموزش‌ها", en: "education", actions: ["list_education","get_education","create_education","update_education","delete_education"], verbs_fa: "مشاهده، افزودن، ویرایش، حذف", verbs_en: "list, create, update, delete" },
  banners:   { fa: "بنرها", en: "banners", actions: ["list_banners","update_banner"], verbs_fa: "مشاهده و ویرایش", verbs_en: "list, update" },
  seo:       { fa: "سئو (SEO)", en: "seo", actions: ["list_seo","update_seo"], verbs_fa: "مشاهده و ویرایش", verbs_en: "list, update" },
};
const CAPABILITY_ORDER = ["reviews","faqs","courses","products","articles","stories","parent_experiences","multimedia","education","banners","seo"];

function computeCapabilities(scopes: string[]) {
  const groups: any[] = [];
  const flat = new Set<string>();
  for (const res of CAPABILITY_ORDER) {
    if (!hasScope(scopes, res)) continue;
    const spec = CAPABILITY_CATALOG[res];
    groups.push({ resource: res, label_fa: spec.fa, label_en: spec.en, verbs_fa: spec.verbs_fa, verbs_en: spec.verbs_en, actions: spec.actions });
    for (const a of spec.actions) flat.add(a);
  }
  return { groups, actions: Array.from(flat) };
}

function buildHowTo(exampleAction: string): Record<string, unknown> {
  return {
    method: "POST",
    url: BASE_URL,
    headers: { "Content-Type": "application/json", "Authorization": "Bearer <YOUR_API_KEY>" },
    note_fa: "کلید را همین‌طور (همین کلید دریافتی از پنل) در هدر Authorization به‌صورت Bearer بفرست؛ یا هم‌ارز آن: هدر x-api-key یا فیلد api_key در بدنهٔ JSON.",
    note_en: "Send the key as Authorization: Bearer <key> header (or x-api-key header / api_key JSON field).",
    example: { action: exampleAction },
    example_curl: `curl -X POST "${BASE_URL}" -H "Content-Type: application/json" -H "Authorization: Bearer <YOUR_API_KEY>" -d "{\"action\":\"${exampleAction}\"}"`,
  };
}

function keyScopeSummaryFa(scopes: string[]): string {
  const { groups } = computeCapabilities(scopes);
  if (!groups.length) return "هیچ بخشی";
  if ((scopes||[]).includes("all")) return "همهٔ بخش‌ها";
  return groups.map(g=>g.label_fa).join("، ");
}

function ok(data: any, origin: string, status = 200): Response {
  return new Response(JSON.stringify({ ok: true, ...data }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-api-key, x-client-info",
      "Vary": "Origin",
    },
  });
}

function err(message: string, origin: string, status = 400, extra: Record<string, any> = {}): Response {
  return new Response(JSON.stringify({ ok: false, error: message, ...extra }), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-api-key, x-client-info",
      "Vary": "Origin",
    },
  });
}

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function extractApiKey(req: Request, body: any): string {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) return auth.slice(7).trim();
  const xApi = req.headers.get("x-api-key") ?? "";
  if (xApi) return xApi.trim();
  if (body && typeof body.api_key === "string") return body.api_key.trim();
  if (body && typeof body.apiKey === "string") return body.apiKey.trim();
  return "";
}

const VALID_SCOPES = [
  "reviews","faqs","courses","products","discounts","tags","featured",
  "articles","stories","parent_experiences","multimedia","banners","seo","education","all"
];

const RESOURCE_SCOPE_MAP: Record<string, string[]> = {
  reviews: ["reviews","all"],
  faqs: ["faqs","all"],
  courses: ["courses","all"],
  products: ["products","all"],
  discounts: ["discounts","courses","all"],
  tags: ["tags","courses","all"],
  featured: ["featured","courses","all"],
  articles: ["articles","multimedia","all"],
  stories: ["stories","all"],
  highlights: ["stories","all"],
  parent_experiences: ["parent_experiences","multimedia","all"],
  multimedia: ["multimedia","all"],
  media: ["multimedia","all"],
  education: ["education","multimedia","all"],
  banners: ["banners","all"],
  seo: ["seo","all"],
};

function hasScope(keyScopes: string[], resource: string): boolean {
  if (!keyScopes || keyScopes.length===0) return false;
  if (keyScopes.includes("all")) return true;
  const allowed = RESOURCE_SCOPE_MAP[resource] || [resource, "all"];
  return keyScopes.some(s=>allowed.includes(s));
}

async function validateApiKey(apiKey: string): Promise<{ ok: true, key: any } | { ok: false, error: string, status: number }> {
  if (!apiKey || apiKey.length < 20) return { ok:false, error:"API key نامعتبر است", status:401 };
  const hash = await sha256Hex(apiKey);
  const supabase = getSupabaseAdmin();
  // Clean expired pending first
  try { await supabase.rpc("expire_pending_approvals"); } catch {}
  const { data, error } = await supabase.from("api_keys").select("*").eq("key_hash", hash).limit(1).maybeSingle();
  if (error) {
    console.error("validateApiKey error:", error);
    return { ok:false, error:"خطا در اعتبارسنجی کلید", status:500 };
  }
  if (!data) return { ok:false, error:"API key یافت نشد یا نامعتبر است", status:401 };
  if (data.is_revoked) return { ok:false, error:"این API key باطل شده است (revoked)", status:403 };
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) {
    return { ok:false, error:"این API key منقضی شده است (expired)", status:403 };
  }
  return { ok:true, key:data };
}

async function updateKeyUsage(keyId: string) {
  const supabase = getSupabaseAdmin();
  try {
    await supabase.from("api_keys").update({ last_used_at: new Date().toISOString(), usage_count: supabase.rpc ? undefined : undefined }).eq("id", keyId);
    // Increment usage_count via SQL
    await supabase.rpc("increment_api_key_usage", { key_id: keyId }).catch(async ()=>{
      // fallback
      const { data } = await supabase.from("api_keys").select("usage_count").eq("id", keyId).single();
      const current = data?.usage_count || 0;
      await supabase.from("api_keys").update({ usage_count: current+1, last_used_at: new Date().toISOString() }).eq("id", keyId);
    });
  } catch (e) {
    console.warn("updateKeyUsage failed:", e);
  }
}

async function logAudit(keyId: string, action: string, resource_type: string, resource_id: string | null, details: any, req: Request, success=true) {
  const supabase = getSupabaseAdmin();
  try {
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "";
    const ua = req.headers.get("user-agent") || "";
    // چرخه‌حیات لاگ (قانون مالک): پیش از ثبت رکورد جدید، لاگ‌های قدیمی‌تر از ۳ روز پاک شوند (خودترمیم‌شونده).
    try { await supabase.from("api_audit_logs").delete().lt("created_at", new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString()); } catch {}
    await supabase.from("api_audit_logs").insert({
      api_key_id: keyId,
      action,
      resource_type,
      resource_id: resource_id ? String(resource_id) : null,
      details,
      ip,
      user_agent: ua,
      success,
    });
  } catch (e) {
    console.warn("audit log failed:", e);
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Pending approvals logic
// ──────────────────────────────────────────────────────────────────────────

async function createPendingApproval(apiKeyId: string, operation_type: "bulk_delete"|"bulk_edit"|"bulk_add", resource_type: string, resource_ids: string[], payload: any, count: number, reason?: string): Promise<string> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("api_pending_approvals").insert({
    api_key_id: apiKeyId,
    operation_type,
    resource_type,
    resource_ids,
    payload,
    status: "pending",
    expires_at: new Date(Date.now()+30*60*1000).toISOString(),
    count,
    reason: reason || null,
  }).select("id").single();
  if (error) {
    console.error("createPending error:", error);
    throw new Error("خطا در ایجاد درخواست تایید");
  }
  return data.id;
}

async function checkPendingApproval(pendingId: string, apiKeyId: string): Promise<any> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("api_pending_approvals").select("*").eq("id", pendingId).eq("api_key_id", apiKeyId).maybeSingle();
  if (error) throw new Error("خطا در بررسی وضعیت تایید");
  if (!data) throw new Error("درخواست تایید یافت نشد");
  // Check expiry
  if (data.status === "pending" && new Date(data.expires_at).getTime() < Date.now()) {
    await supabase.from("api_pending_approvals").update({ status:"expired" }).eq("id", pendingId);
    data.status = "expired";
  }
  return data;
}

// ──────────────────────────────────────────────────────────────────────────
// Settings helpers (for courses, products, faqs, media, highlights, etc)
// ──────────────────────────────────────────────────────────────────────────

async function loadSettings(): Promise<{ settings: any, raw: any }> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("settings").select("settings, updated_at").eq("key","app_settings").maybeSingle();
  if (error) throw new Error("خطا در بارگذاری تنظیمات");
  return { settings: data?.settings || {}, raw: data };
}

async function saveSettings(newSettings: any): Promise<void> {
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("settings").upsert({
    key: "app_settings",
    settings: newSettings,
    updated_at: new Date().toISOString(),
  }, { onConflict:"key" });
  if (error) {
    console.error("saveSettings error:", error);
    throw new Error("خطا در ذخیره تنظیمات");
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Reviews (table)
// ──────────────────────────────────────────────────────────────────────────

async function listReviews(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, parseInt(body.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit ?? "50", 10) || 50));
  const offset = (page-1)*limit;
  const status = typeof body.status === "string" ? body.status : "";
  let query = supabase.from("reviews").select("id,course_id,reviewer_name,rating,comment,status,placements,course_ids,created_at", { count:"exact" });
  if (status) query = query.eq("status", status);
  query = query.order("created_at", { ascending:false }).range(offset, offset+limit-1);
  const { data, error, count } = await query;
  if (error) return err("خطا در دریافت نظرات", origin, 500);
  return ok({ reviews: data||[], total: count||0, page, limit }, origin);
}

async function getReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reviews").select("*").eq("id", body.id).maybeSingle();
  if (error) return err("خطا در دریافت نظر", origin, 500);
  if (!data) return err("نظر یافت نشد", origin, 404);
  return ok({ review: data }, origin);
}

async function createReview(body: any, origin: string): Promise<Response> {
  const payload = body.review || body;
  const placements = Array.isArray(payload.placements) ? payload.placements.filter((p:any)=>p==="course_detail"||p==="product_detail") : ["course_detail"];
  if (!payload.reviewer_name || !payload.comment) return err("نام و متن نظر الزامی است", origin, 400);
  const rating = Number(payload.rating) || 5;
  if (rating <1 || rating>5) return err("امتیاز باید بین 1 و 5 باشد", origin, 400);
  const supabase = getSupabaseAdmin();
  const row = {
    course_id: typeof payload.course_id === "string" ? payload.course_id.slice(0,200) : "عمومی",
    reviewer_name: String(payload.reviewer_name).slice(0,100),
    rating,
    comment: String(payload.comment).slice(0,2000),
    status: ["approved","pending"].includes(payload.status) ? payload.status : "pending",
    placements,
    course_ids: Array.isArray(payload.course_ids) ? payload.course_ids.slice(0,50) : [],
    phone: typeof payload.phone === "string" ? payload.phone.slice(0,40) : "",
    phone_country: typeof payload.phone_country === "string" ? payload.phone_country.slice(0,8) : "",
  };
  const { data, error } = await supabase.from("reviews").insert(row).select("*").single();
  if (error) {
    console.error("create_review error:", error);
    return err("خطا در ایجاد نظر", origin, 500);
  }
  return ok({ review: data }, origin);
}

async function updateReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const updates = body.updates || body.review || {};
  const allowed: Record<string, any> = {};
  if (["approved","rejected","pending"].includes(updates.status)) allowed.status = updates.status;
  if (Array.isArray(updates.placements)) allowed.placements = updates.placements.filter((p:any)=>p==="course_detail"||p==="product_detail");
  if (typeof updates.reviewer_name === "string") allowed.reviewer_name = updates.reviewer_name.slice(0,100);
  if (typeof updates.comment === "string") allowed.comment = updates.comment.slice(0,2000);
  if (typeof updates.rating === "number" && updates.rating>=1 && updates.rating<=5) allowed.rating = updates.rating;
  if (Array.isArray(updates.course_ids)) allowed.course_ids = updates.course_ids.slice(0,50);
  if (typeof updates.course_id === "string") allowed.course_id = updates.course_id.slice(0,200);
  if (Object.keys(allowed).length===0) return err("هیچ فیلد مجازی ارسال نشده", origin, 400);
  allowed.updated_at = new Date().toISOString();
  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("reviews").update(allowed).eq("id", body.id);
  if (error) return err("خطا در ویرایش نظر", origin, 500);
  return ok({ updated:true, id: body.id }, origin);
}

async function deleteReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase.from("reviews").delete({ count:"exact" }).eq("id", body.id);
  if (error) return err("خطا در حذف نظر", origin, 500);
  if (count===0) return err("نظر یافت نشد", origin, 404);
  return ok({ deleted:true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// FAQs - manualUserQuestions in settings
// ──────────────────────────────────────────────────────────────────────────

async function listFaqs(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const faqs = Array.isArray(settings.manualUserQuestions) ? settings.manualUserQuestions : [];
  return ok({ faqs, total: faqs.length }, origin);
}

async function createFaq(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const faqs = Array.isArray(settings.manualUserQuestions) ? settings.manualUserQuestions : [];
  const incoming = body.faq || body;
  if (!incoming.question || !incoming.answer) return err("سوال و پاسخ الزامی است", origin, 400);
  const newFaq = {
    id: incoming.id || `faq_${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
    question: String(incoming.question).slice(0,1000),
    answer: String(incoming.answer).slice(0,4000),
    category: incoming.category || "general",
    active: incoming.active !== false,
    order: faqs.length+1,
  };
  const updated = [...faqs, newFaq];
  await saveSettings({ ...settings, manualUserQuestions: updated });
  return ok({ faq: newFaq }, origin);
}

async function updateFaq(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const faqs = Array.isArray(settings.manualUserQuestions) ? settings.manualUserQuestions : [];
  const idx = faqs.findIndex((f:any)=>String(f.id)===String(body.id));
  if (idx===-1) return err("FAQ یافت نشد", origin, 404);
  const updates = body.updates || body.faq || {};
  const updatedFaq = { ...faqs[idx] };
  if (typeof updates.question === "string") updatedFaq.question = updates.question.slice(0,1000);
  if (typeof updates.answer === "string") updatedFaq.answer = updates.answer.slice(0,4000);
  if (typeof updates.category === "string") updatedFaq.category = updates.category;
  if (typeof updates.active === "boolean") updatedFaq.active = updates.active;
  const newList = [...faqs];
  newList[idx] = updatedFaq;
  await saveSettings({ ...settings, manualUserQuestions: newList });
  return ok({ updated:true, faq: updatedFaq }, origin);
}

async function deleteFaq(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const faqs = Array.isArray(settings.manualUserQuestions) ? settings.manualUserQuestions : [];
  const newList = faqs.filter((f:any)=>String(f.id)!==String(body.id));
  if (newList.length===faqs.length) return err("FAQ یافت نشد", origin, 404);
  await saveSettings({ ...settings, manualUserQuestions: newList });
  return ok({ deleted:true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Courses - settings.courseTabs[].courses[]
// ──────────────────────────────────────────────────────────────────────────

async function listCourses(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  const allCourses: any[] = [];
  tabs.forEach((tab:any)=>{
    (tab.courses||[]).forEach((c:any)=>{
      allCourses.push({ ...c, tabId: tab.id, tabTitle: tab.title });
    });
  });
  return ok({ courses: allCourses, total: allCourses.length, tabs }, origin);
}

async function getCourse(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  for (const tab of tabs) {
    const c = (tab.courses||[]).find((x:any)=>String(x.id)===String(body.id));
    if (c) return ok({ course: { ...c, tabId: tab.id, tabTitle: tab.title } }, origin);
  }
  return err("دوره یافت نشد", origin, 404);
}

async function createCourse(body: any, origin: string): Promise<Response> {
  const incoming = body.course || body;
  if (!incoming.title) return err("عنوان دوره الزامی است", origin, 400);
  const tabId = incoming.tabId || incoming.tab_id;
  if (!tabId) return err("tabId الزامی است (شناسه تب دوره)", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  const tabIdx = tabs.findIndex((t:any)=>String(t.id)===String(tabId));
  if (tabIdx===-1) return err("تب یافت نشد", origin, 404);
  const newCourse = {
    id: incoming.id || `c${Date.now()}`,
    title: String(incoming.title).slice(0,200),
    desc: String(incoming.desc || incoming.description || "").slice(0,2000),
    price: String(incoming.price || "").slice(0,50),
    discountedPrice: Number(incoming.discountedPrice) || 0,
    discountEnd: incoming.discountEnd || "",
    features: Array.isArray(incoming.features) ? incoming.features : [],
    image: incoming.image || "",
    active: incoming.active !== false,
    popular: !!incoming.popular,
    bestseller: !!incoming.bestseller,
    trending: !!incoming.trending,
    ageBadge: incoming.ageBadge !== false,
    btnText: incoming.btnText || "ثبت مستقیم این دوره",
    order: (tabs[tabIdx].courses||[]).length+1,
  };
  const newTabs = [...tabs];
  newTabs[tabIdx] = { ...newTabs[tabIdx], courses: [...(newTabs[tabIdx].courses||[]), newCourse] };
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ course: newCourse }, origin);
}

async function updateCourse(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const updates = body.updates || body.course || {};
  const newTabs = tabs.map((tab:any)=>{
    const courses = (tab.courses||[]).map((c:any)=>{
      if (String(c.id)===String(body.id)) {
        found = true;
        const updated = { ...c };
        if (typeof updates.title === "string") updated.title = updates.title.slice(0,200);
        if (typeof updates.desc === "string" || typeof updates.description === "string") updated.desc = String(updates.desc || updates.description).slice(0,2000);
        if (typeof updates.price !== "undefined") updated.price = String(updates.price).slice(0,50);
        if (typeof updates.discountedPrice !== "undefined") updated.discountedPrice = Number(updates.discountedPrice) || 0;
        if (typeof updates.discountEnd !== "undefined") updated.discountEnd = updates.discountEnd;
        if (Array.isArray(updates.features)) updated.features = updates.features;
        if (typeof updates.image === "string") updated.image = updates.image;
        if (typeof updates.active === "boolean") updated.active = updates.active;
        if (typeof updates.popular === "boolean") updated.popular = updates.popular;
        if (typeof updates.bestseller === "boolean") updated.bestseller = updates.bestseller;
        if (typeof updates.trending === "boolean") updated.trending = updates.trending;
        if (typeof updates.ageBadge === "boolean") updated.ageBadge = updates.ageBadge;
        if (typeof updates.btnText === "string") updated.btnText = updates.btnText;
        return updated;
      }
      return c;
    });
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ updated:true, id: body.id }, origin);
}

async function deleteCourse(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const newTabs = tabs.map((tab:any)=>{
    const originalLen = (tab.courses||[]).length;
    const courses = (tab.courses||[]).filter((c:any)=>String(c.id)!==String(body.id));
    if (courses.length !== originalLen) found = true;
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ deleted:true, id: body.id }, origin);
}

// Discounts
async function setDiscount(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id دوره الزامی است", origin, 400);
  if (typeof body.discountedPrice === "undefined") return err("discountedPrice الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const newTabs = tabs.map((tab:any)=>{
    const courses = (tab.courses||[]).map((c:any)=>{
      if (String(c.id)===String(body.id)) {
        found = true;
        return { ...c, discountedPrice: Number(body.discountedPrice)||0, discountEnd: body.discountEnd || "" };
      }
      return c;
    });
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ updated:true, id: body.id, discountedPrice: body.discountedPrice }, origin);
}

async function removeDiscount(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id دوره الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const newTabs = tabs.map((tab:any)=>{
    const courses = (tab.courses||[]).map((c:any)=>{
      if (String(c.id)===String(body.id)) {
        found = true;
        return { ...c, discountedPrice: 0, discountEnd: "" };
      }
      return c;
    });
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ updated:true, id: body.id, discountRemoved:true }, origin);
}

// Tags
async function setTag(body: any, origin: string): Promise<Response> {
  if (!body.id || !body.tag) return err("id و tag الزامی است", origin, 400);
  const validTags = ["popular","bestseller","trending","محبوب","پرفروش","پرطرفدار"];
  // Map Persian to English keys
  const tagMap: Record<string,string> = { "محبوب":"popular", "پرفروش":"bestseller", "پرطرفدار":"trending", "popular":"popular", "bestseller":"bestseller", "trending":"trending" };
  const mapped = tagMap[body.tag] || body.tag;
  if (!["popular","bestseller","trending"].includes(mapped)) return err("تگ نامعتبر است (محبوب/پرفروش/پرطرفدار)", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const newTabs = tabs.map((tab:any)=>{
    const courses = (tab.courses||[]).map((c:any)=>{
      if (String(c.id)===String(body.id)) {
        found = true;
        return { ...c, [mapped]: true };
      }
      return c;
    });
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ updated:true, id: body.id, tag: mapped }, origin);
}

async function removeTag(body: any, origin: string): Promise<Response> {
  if (!body.id || !body.tag) return err("id و tag الزامی است", origin, 400);
  const tagMap: Record<string,string> = { "محبوب":"popular", "پرفروش":"bestseller", "پرطرفدار":"trending", "popular":"popular", "bestseller":"bestseller", "trending":"trending" };
  const mapped = tagMap[body.tag] || body.tag;
  if (!["popular","bestseller","trending"].includes(mapped)) return err("تگ نامعتبر", origin, 400);
  const { settings } = await loadSettings();
  const tabs = Array.isArray(settings.courseTabs) ? settings.courseTabs : [];
  let found = false;
  const newTabs = tabs.map((tab:any)=>{
    const courses = (tab.courses||[]).map((c:any)=>{
      if (String(c.id)===String(body.id)) {
        found = true;
        return { ...c, [mapped]: false };
      }
      return c;
    });
    return { ...tab, courses };
  });
  if (!found) return err("دوره یافت نشد", origin, 404);
  await saveSettings({ ...settings, courseTabs: newTabs });
  return ok({ updated:true, id: body.id, tagRemoved: mapped }, origin);
}

// Featured
async function setFeatured(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id دوره الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const featured = settings.featuredCourses || { enabled:true, courseIds:[] };
  const ids = Array.isArray(featured.courseIds) ? featured.courseIds : [];
  if (!ids.includes(String(body.id))) ids.push(String(body.id));
  const newFeatured = { ...featured, courseIds: ids.slice(0,5), enabled: featured.enabled !== false };
  await saveSettings({ ...settings, featuredCourses: newFeatured });
  return ok({ featured:true, id: body.id }, origin);
}

async function unsetFeatured(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id دوره الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const featured = settings.featuredCourses || { courseIds:[] };
  const ids = (Array.isArray(featured.courseIds) ? featured.courseIds : []).filter((x:string)=>String(x)!==String(body.id));
  const newFeatured = { ...featured, courseIds: ids };
  await saveSettings({ ...settings, featuredCourses: newFeatured });
  return ok({ featured:false, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Products
// ──────────────────────────────────────────────────────────────────────────

async function listProducts(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const productsCfg = settings.products && typeof settings.products === "object" ? settings.products : {};
  const list = Array.isArray(productsCfg.list) ? productsCfg.list : (Array.isArray(productsCfg.items) ? productsCfg.items : []);
  return ok({ products: list, total: list.length }, origin);
}

async function createProduct(body: any, origin: string): Promise<Response> {
  const incoming = body.product || body;
  if (!incoming.name && !incoming.title) return err("نام محصول الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const productsCfg = settings.products && typeof settings.products === "object" ? settings.products : { list:[] };
  const list = Array.isArray(productsCfg.list) ? productsCfg.list : (Array.isArray(productsCfg.items) ? productsCfg.items : []);
  const newProduct = {
    id: incoming.id || `p${Date.now()}`,
    name: String(incoming.name || incoming.title).slice(0,200),
    title: String(incoming.title || incoming.name).slice(0,200),
    description: String(incoming.description || incoming.desc || "").slice(0,2000),
    price: String(incoming.price || "").slice(0,50),
    discountedPrice: Number(incoming.discountedPrice) || 0,
    category: incoming.category || "",
    image: incoming.image || "",
    isVisible: incoming.isVisible !== false,
    active: incoming.active !== false,
    showOnHome: !!incoming.showOnHome,
    features: Array.isArray(incoming.features) ? incoming.features : [],
    order: list.length+1,
  };
  const newList = [...list, newProduct];
  await saveSettings({ ...settings, products: { ...productsCfg, list: newList, items: [] } });
  return ok({ product: newProduct }, origin);
}

async function updateProduct(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const productsCfg = settings.products && typeof settings.products === "object" ? settings.products : { list:[] };
  const list = Array.isArray(productsCfg.list) ? productsCfg.list : (Array.isArray(productsCfg.items) ? productsCfg.items : []);
  const idx = list.findIndex((p:any)=>String(p.id)===String(body.id));
  if (idx===-1) return err("محصول یافت نشد", origin, 404);
  const updates = body.updates || body.product || {};
  const updated = { ...list[idx] };
  if (typeof updates.name === "string" || typeof updates.title === "string") { updated.name = String(updates.name || updates.title).slice(0,200); updated.title = String(updates.title || updates.name).slice(0,200); }
  if (typeof updates.description === "string" || typeof updates.desc === "string") updated.description = String(updates.description || updates.desc).slice(0,2000);
  if (typeof updates.price !== "undefined") updated.price = String(updates.price).slice(0,50);
  if (typeof updates.discountedPrice !== "undefined") updated.discountedPrice = Number(updates.discountedPrice)||0;
  if (typeof updates.category === "string") updated.category = updates.category;
  if (typeof updates.image === "string") updated.image = updates.image;
  if (typeof updates.isVisible === "boolean") updated.isVisible = updates.isVisible;
  if (typeof updates.active === "boolean") updated.active = updates.active;
  if (typeof updates.showOnHome === "boolean") updated.showOnHome = updates.showOnHome;
  if (Array.isArray(updates.features)) updated.features = updates.features;
  const newList = [...list];
  newList[idx] = updated;
  await saveSettings({ ...settings, products: { ...productsCfg, list: newList, items: [] } });
  return ok({ updated:true, product: updated }, origin);
}

async function deleteProduct(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const productsCfg = settings.products && typeof settings.products === "object" ? settings.products : { list:[] };
  const list = Array.isArray(productsCfg.list) ? productsCfg.list : (Array.isArray(productsCfg.items) ? productsCfg.items : []);
  const newList = list.filter((p:any)=>String(p.id)!==String(body.id));
  if (newList.length===list.length) return err("محصول یافت نشد", origin, 404);
  await saveSettings({ ...settings, products: { ...productsCfg, list: newList, items: [] } });
  return ok({ deleted:true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Media / Articles / Multimedia
// ──────────────────────────────────────────────────────────────────────────

async function listMedia(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const mediaItems = Array.isArray(settings.mediaItems) ? settings.mediaItems : [];
  return ok({ media: mediaItems, total: mediaItems.length }, origin);
}

async function createMedia(body: any, origin: string): Promise<Response> {
  const incoming = body.media || body.article || body;
  if (!incoming.title) return err("عنوان الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const mediaItems = Array.isArray(settings.mediaItems) ? settings.mediaItems : [];
  const newItem = {
    id: incoming.id || `m${Date.now()}`,
    title: String(incoming.title).slice(0,300),
    description: String(incoming.description || "").slice(0,5000),
    type: incoming.type || "video",
    platforms: incoming.platforms || {},
    displayMode: incoming.displayMode || "both",
    categories: Array.isArray(incoming.categories) ? incoming.categories : [],
    isVisible: incoming.isVisible !== false,
    order: mediaItems.length+1,
  };
  const updated = [...mediaItems, newItem];
  await saveSettings({ ...settings, mediaItems: updated });
  return ok({ media: newItem }, origin);
}

async function updateMedia(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const mediaItems = Array.isArray(settings.mediaItems) ? settings.mediaItems : [];
  const idx = mediaItems.findIndex((m:any)=>String(m.id)===String(body.id));
  if (idx===-1) return err("محتوا یافت نشد", origin, 404);
  const updates = body.updates || body.media || {};
  const updated = { ...mediaItems[idx] };
  if (typeof updates.title === "string") updated.title = updates.title.slice(0,300);
  if (typeof updates.description === "string") updated.description = updates.description.slice(0,5000);
  if (typeof updates.type === "string") updated.type = updates.type;
  if (typeof updates.platforms === "object") updated.platforms = updates.platforms;
  if (Array.isArray(updates.categories)) updated.categories = updates.categories;
  if (typeof updates.isVisible === "boolean") updated.isVisible = updates.isVisible;
  const newList = [...mediaItems];
  newList[idx] = updated;
  await saveSettings({ ...settings, mediaItems: newList });
  return ok({ updated:true, media: updated }, origin);
}

async function deleteMedia(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const mediaItems = Array.isArray(settings.mediaItems) ? settings.mediaItems : [];
  const newList = mediaItems.filter((m:any)=>String(m.id)!==String(body.id));
  if (newList.length===mediaItems.length) return err("محتوا یافت نشد", origin, 404);
  await saveSettings({ ...settings, mediaItems: newList });
  return ok({ deleted:true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Highlights / Stories
// ──────────────────────────────────────────────────────────────────────────

async function listHighlights(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const sh = settings.storyHighlights && typeof settings.storyHighlights === "object" ? settings.storyHighlights : {};
  const highlights = Array.isArray(sh.highlights) ? sh.highlights : [];
  return ok({ highlights, total: highlights.length }, origin);
}

async function createHighlight(body: any, origin: string): Promise<Response> {
  const incoming = body.highlight || body;
  if (!incoming.title) return err("عنوان هایلایت الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const sh = settings.storyHighlights && typeof settings.storyHighlights === "object" ? settings.storyHighlights : { highlights:[] };
  const highlights = Array.isArray(sh.highlights) ? sh.highlights : [];
  const newHl = {
    id: incoming.id || `hl${Date.now()}`,
    title: String(incoming.title).slice(0,200),
    coverUrl: incoming.coverUrl || "",
    active: incoming.active !== false,
    order: highlights.length+1,
    stories: Array.isArray(incoming.stories) ? incoming.stories : [],
  };
  const updated = [...highlights, newHl];
  await saveSettings({ ...settings, storyHighlights: { ...sh, highlights: updated } });
  return ok({ highlight: newHl }, origin);
}

async function updateHighlight(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const sh = settings.storyHighlights && typeof settings.storyHighlights === "object" ? settings.storyHighlights : { highlights:[] };
  const highlights = Array.isArray(sh.highlights) ? sh.highlights : [];
  const idx = highlights.findIndex((h:any)=>String(h.id)===String(body.id));
  if (idx===-1) return err("هایلایت یافت نشد", origin, 404);
  const updates = body.updates || body.highlight || {};
  const updated = { ...highlights[idx] };
  if (typeof updates.title === "string") updated.title = updates.title.slice(0,200);
  if (typeof updates.coverUrl === "string") updated.coverUrl = updates.coverUrl;
  if (typeof updates.active === "boolean") updated.active = updates.active;
  if (Array.isArray(updates.stories)) updated.stories = updates.stories;
  const newList = [...highlights];
  newList[idx] = updated;
  await saveSettings({ ...settings, storyHighlights: { ...sh, highlights: newList } });
  return ok({ updated:true, highlight: updated }, origin);
}

async function deleteHighlight(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const sh = settings.storyHighlights && typeof settings.storyHighlights === "object" ? settings.storyHighlights : { highlights:[] };
  const highlights = Array.isArray(sh.highlights) ? sh.highlights : [];
  const newList = highlights.filter((h:any)=>String(h.id)!==String(body.id));
  if (newList.length===highlights.length) return err("هایلایت یافت نشد", origin, 404);
  await saveSettings({ ...settings, storyHighlights: { ...sh, highlights: newList } });
  return ok({ deleted:true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Banners & SEO (simple settings keys)
// ──────────────────────────────────────────────────────────────────────────

async function listBanners(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const images = settings.images || {};
  return ok({ banners: images }, origin);
}

async function updateBanner(body: any, origin: string): Promise<Response> {
  if (!body.key) return err("key بنر الزامی است (hero, trustBox, courseDefault, specialist, homeAvatar, aboutHero)", origin, 400);
  const { settings } = await loadSettings();
  const images = settings.images || {};
  const current = images[body.key] || {};
  const updates = body.updates || body.banner || {};
  const updated = { ...current };
  if (typeof updates.url === "string") updated.url = updates.url;
  if (typeof updates.alt === "string") updated.alt = updates.alt;
  if (typeof updates.enabled === "boolean") updated.enabled = updates.enabled;
  if (typeof updates.aspectRatio === "string") updated.aspectRatio = updates.aspectRatio;
  if (typeof updates.objectPosition === "string") updated.objectPosition = updates.objectPosition;
  const newImages = { ...images, [body.key]: updated };
  await saveSettings({ ...settings, images: newImages });
  return ok({ updated:true, banner: updated, key: body.key }, origin);
}

async function listSeo(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const seo = settings.seo || settings.translations || {};
  return ok({ seo }, origin);
}

async function updateSeo(body: any, origin: string): Promise<Response> {
  const updates = body.updates || body.seo || body;
  if (!updates || typeof updates !== "object") return err("داده سئو الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const seo = settings.seo || {};
  const merged = { ...seo, ...updates };
  await saveSettings({ ...settings, seo: merged });
  return ok({ updated:true, seo: merged }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Pending handling for content-api
// ──────────────────────────────────────────────────────────────────────────

async function handleWithApprovalCheck(
  req: Request,
  apiKey: any,
  resourceType: string,
  operation: "delete"|"edit"|"add",
  count: number,
  ids: string[],
  payload: any,
  actualHandler: (body:any, origin:string)=>Promise<Response>,
  body: any,
  origin: string
): Promise<Response> {
  const needsApproval = (operation==="delete" && count>1) || (operation==="edit" && count>1) || (operation==="add" && count>10);
  if (needsApproval) {
    const opMap: Record<string, "bulk_delete"|"bulk_edit"|"bulk_add"> = { delete:"bulk_delete", edit:"bulk_edit", add:"bulk_add" };
    const pendingId = await createPendingApproval(apiKey.id, opMap[operation], resourceType, ids, payload, count, body.reason);
    await logAudit(apiKey.id, `request_${operation}_${resourceType}`, resourceType, null, { count, ids, pending_id: pendingId, requires_approval:true }, req, true);
    return ok({
      requires_approval: true,
      pending_id: pendingId,
      message: `این درخواست (${operation} ${count} مورد از نوع ${resourceType}) نیاز به تایید شما از پنل مدیریت دارد. لطفاً در پنل مدیریت بخش امنیت، درخواست را تایید کنید و سپس به ایجنت بگویید تایید شد. این درخواست تا 30 دقیقه معتبر است.`,
      count,
      operation,
      resource_type: resourceType,
      expires_in: "30 minutes",
    }, origin, 202);
  }
  // Direct execution
  const res = await actualHandler(body, origin);
  return res;
}

// ──────────────────────────────────────────────────────────────────────────
// Router for content-api
// ──────────────────────────────────────────────────────────────────────────


// ──────────────────────────────────────────────────────────────────────────
// Education — «آموزش‌ها» (settings.education.items)
//   آیتم‌ها در صفحهٔ عمومی «آموزش و همراهی والدین» رندر می‌شوند
//   (mediaPlacement.getMediaItemsForDestination). شرط نمایش:
//   mediaCategories شامل "education" + active/isVisible !== false.
// ──────────────────────────────────────────────────────────────────────────
const EDU_DEFAULT_AUTHOR = "\u0622\u0631\u0645\u06cc\u0646 \u0632\u06cc\u0646\u0627\u0644\u06cc";
const EDU_DEFAULT_AUTHOR_EN = "Armin Zeinali";

function normalizeEduType(t: string): string {
  const type = String(t || "article").toLowerCase();
  if (type === "text" || type === "image" || type === "article") return "article";
  if (type === "audio" || type === "podcast") return "audio";
  return type;
}

function todayFaDate(): string {
  try {
    return new Intl.DateTimeFormat("fa-IR-u-nu-latn", { year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
  } catch { return new Date().toISOString().slice(0, 10); }
}

async function listEducation(body: any, origin: string): Promise<Response> {
  const { settings } = await loadSettings();
  const edu = settings.education && typeof settings.education === "object" ? settings.education : {};
  const items = Array.isArray(edu.items) ? edu.items : [];
  let list = [...items];
  if (body.type && body.type !== "all") {
    const want = normalizeEduType(String(body.type));
    list = list.filter((x: any) => normalizeEduType(String(x?.type || "article")) === want);
  }
  if (body.search) {
    const q = String(body.search).toLowerCase();
    list = list.filter((x: any) => [x?.title, x?.titleEn, x?.desc, x?.description, x?.body, ...(Array.isArray(x?.keywords) ? x.keywords : [])]
      .filter(Boolean).join(" ").toLowerCase().includes(q));
  }
  if (body.include_hidden !== true) list = list.filter((x: any) => x?.active !== false && x?.isVisible !== false);
  const total = list.length;
  const limitRaw = Number(body?.limit);
  const offsetRaw = Number(body?.offset);
  if (Number.isFinite(limitRaw) || Number.isFinite(offsetRaw)) {
    const offset = Math.max(0, Number.isFinite(offsetRaw) ? offsetRaw : 0);
    const limit = Math.max(1, Math.min(200, Number.isFinite(limitRaw) ? limitRaw : 50));
    return ok({ education: list.slice(offset, offset + limit), total }, origin);
  }
  return ok({ education: list, total }, origin);
}

async function createEducation(body: any, origin: string): Promise<Response> {
  const incoming = body.item || body.education || body.article_obj || {};
  if (!incoming.title) return err("عنوان (title) الزامی است", origin, 400);
  const desc = String(incoming.desc ?? incoming.description ?? incoming.body ?? "").trim();
  if (!desc) return err("متن محتوا (desc یا description یا body) الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const eduRaw = settings.education && typeof settings.education === "object" ? settings.education : {};
  const items = Array.isArray(eduRaw.items) ? eduRaw.items : [];
  const maxOrder = items.reduce((m: number, x: any) => Math.max(m, Number(x?.order) || 0), 0);
  const keywords = Array.isArray(incoming.keywords)
    ? incoming.keywords.map((k: any) => String(k).trim()).filter(Boolean).slice(0, 20) : [];
  const newItem: Record<string, any> = {
    ...incoming,
    id: incoming.id ? String(incoming.id) : `edu_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type: normalizeEduType(String(incoming.type || "article")),
    title: String(incoming.title).slice(0, 300),
    desc,
    description: desc,
    keywords,
    author: incoming.author || EDU_DEFAULT_AUTHOR,
    authorEn: incoming.authorEn || EDU_DEFAULT_AUTHOR_EN,
    minutes: Number(incoming.minutes) || 0,
    date: incoming.date || todayFaDate(),
    dateEn: incoming.dateEn || incoming.date || todayFaDate(),
    cover: (incoming.cover && String(incoming.cover).trim()) || (incoming.imageUrl && String(incoming.imageUrl).trim()) || "",
    imageUrl: (incoming.imageUrl && String(incoming.imageUrl).trim()) || (incoming.cover && String(incoming.cover).trim()) || "",
    images: Array.isArray(incoming.images) ? incoming.images : [],
    platforms: incoming.platforms && typeof incoming.platforms === "object" ? incoming.platforms : {},
    displayMode: incoming.displayMode || "both",
    categories: Array.isArray(incoming.categories) ? incoming.categories : (incoming.category ? [String(incoming.category)] : []),
    mediaCategories: ["education"],
    mediaCategory: "education",
    isVisible: incoming.isVisible !== false,
    active: incoming.active !== false,
    order: maxOrder + 1,
    created_via: "content-api",
  };
  if (Array.isArray(incoming.highlights)) {
    const palette = new Set(["#DCFCE7", "#FEF9C3", "#FFE4E6", "#DBEAFE", "#FFEDD5", "#F3E8FF", "#CCFBF1", "#E2E8F0"]);
    newItem.highlights = incoming.highlights
      .map((h: any) => ({ id: String(h?.id || "hl" + Math.random().toString(36).slice(2, 7)), text: String(h?.text || "").slice(0, 500), color: palette.has(String(h?.color)) ? String(h!.color) : "#DCFCE7" }))
      .filter((h: any) => h.text.trim())
      .slice(0, 6);
  }
  if (incoming.quote) newItem.quote = String(incoming.quote).slice(0, 2000);
  if (incoming.sourceUrl) newItem.sourceUrl = String(incoming.sourceUrl).slice(0, 2000);
  if (incoming.slug) newItem.slug = String(incoming.slug).slice(0, 200);
  if (incoming.titleEn) newItem.titleEn = String(incoming.titleEn).slice(0, 300);
  if (incoming.descEn || incoming.descriptionEn) newItem.descEn = String(incoming.descEn || incoming.descriptionEn).slice(0, 30000);
  const updatedEdu = { ...eduRaw, items: [...items, newItem] };
  await saveSettings({ ...settings, education: updatedEdu });
  return ok({ education: newItem, note: "آیتم در مقصد «آموزش‌ها» (صفحهٔ آموزش و همراهی والدین) ثبت و بلافاصله نمایش داده می‌شود." }, origin);
}

async function updateEducation(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const eduRaw = settings.education && typeof settings.education === "object" ? settings.education : {};
  const items = Array.isArray(eduRaw.items) ? eduRaw.items : [];
  const idx = items.findIndex((x: any) => String(x.id) === String(body.id));
  if (idx === -1) return err("آیتم آموزشی یافت نشد", origin, 404);
  const updates = body.updates || body.item || body.education || {};
  const updatedItem: Record<string, any> = { ...items[idx] };
  const strFields = ["title", "titleEn", "desc", "description", "descEn", "body", "author", "authorEn", "date", "dateEn", "cover", "category", "sourceUrl", "quote", "slug", "reviewedAt", "imageUrl", "shortDescription"];
  for (const f of strFields) {
    if (typeof updates[f] === "string") {
      updatedItem[f] = f === "title" || f === "titleEn" ? updates[f].slice(0, 300) : String(updates[f]).slice(0, 30000);
    }
  }
  if (typeof updates.type === "string") updatedItem.type = normalizeEduType(updates.type);
  if (Array.isArray(updates.keywords)) updatedItem.keywords = updates.keywords.map((k: any) => String(k).trim()).filter(Boolean).slice(0, 20);
  if (Array.isArray(updates.categories)) updatedItem.categories = updates.categories;
  if (typeof updates.images !== "undefined" && Array.isArray(updates.images)) updatedItem.images = updates.images;
  if (updates.platforms && typeof updates.platforms === "object") updatedItem.platforms = updates.platforms;
  if (typeof updates.displayMode === "string") updatedItem.displayMode = updates.displayMode;
  if (typeof updates.isVisible === "boolean") updatedItem.isVisible = updates.isVisible;
  if (typeof updates.active === "boolean") updatedItem.active = updates.active;
  if (updates.minutes !== undefined) updatedItem.minutes = Number(updates.minutes) || 0;
  if (typeof updates.order === "number" || typeof updates.order === "string") {
    const n = Number(updates.order); if (Number.isFinite(n) && n >= 0) updatedItem.order = n;
  }
  if (Array.isArray(updates.highlights)) {
    const palette = new Set(["#DCFCE7","#FEF9C3","#FFE4E6","#DBEAFE","#FFEDD5","#F3E8FF","#CCFBF1","#E2E8F0"]);
    updatedItem.highlights = updates.highlights
      .map((h: any) => ({
        text: String(h?.text ?? "").slice(0, 500),
        color: h?.color && typeof h.color === "string" && palette.has(h.color) ? h.color : "#DCFCE7",
      }))
      .filter((h: any) => h.text)
      .slice(0, 6);
  }
  // desc و description همیشه همگام می‌مانند
  if (typeof updates.desc === "string" || typeof updates.description === "string") {
    const nd = String(updates.desc ?? updates.description);
    updatedItem.desc = nd;
    updatedItem.description = nd;
  }
  // cover ↔ imageUrl همیشه همگام — admin و content-api دو راه ورود دارند
  {
    const c = String(updatedItem.cover || "").trim();
    const iu = String(updatedItem.imageUrl || "").trim();
    if (c && c !== iu) updatedItem.imageUrl = c;
    else if (!c && iu) updatedItem.cover = iu;
  }
  // مقصد هرگز تغییر نمی‌کند (آیتم آموزشی باید در آموزش‌ها بماند)
  updatedItem.mediaCategories = ["education"];
  updatedItem.mediaCategory = "education";
  const newList = [...items];
  newList[idx] = updatedItem;
  await saveSettings({ ...settings, education: { ...eduRaw, items: newList } });
  return ok({ updated: true, education: updatedItem }, origin);
}

async function deleteEducation(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const { settings } = await loadSettings();
  const eduRaw = settings.education && typeof settings.education === "object" ? settings.education : {};
  const items = Array.isArray(eduRaw.items) ? eduRaw.items : [];
  const newList = items.filter((x: any) => String(x.id) !== String(body.id));
  if (newList.length === items.length) return err("آیتم آموزشی یافت نشد", origin, 404);
  await saveSettings({ ...settings, education: { ...eduRaw, items: newList } });
  return ok({ deleted: true, id: body.id }, origin);
}

const HANDLERS: Record<string, (body:any, origin:string)=>Promise<Response>> = {
  // Reviews
  list_reviews: listReviews,
  get_review: getReview,
  create_review: createReview,
  update_review: updateReview,
  delete_review: deleteReview,
  // FAQs
  list_faqs: listFaqs,
  get_faq: async (b,o)=>{ const { settings } = await loadSettings(); const faqs = Array.isArray(settings.manualUserQuestions)?settings.manualUserQuestions:[]; const f = faqs.find((x:any)=>String(x.id)===String(b.id)); if(!f) return err("FAQ یافت نشد",o,404); return ok({ faq:f },o); },
  create_faq: createFaq,
  update_faq: updateFaq,
  delete_faq: deleteFaq,
  // Courses
  list_courses: listCourses,
  get_course: getCourse,
  create_course: createCourse,
  update_course: updateCourse,
  delete_course: deleteCourse,
  set_discount: setDiscount,
  remove_discount: removeDiscount,
  set_tag: setTag,
  remove_tag: removeTag,
  set_featured: setFeatured,
  unset_featured: unsetFeatured,
  // Products
  list_products: listProducts,
  get_product: async (b,o)=>{ const { settings } = await loadSettings(); const pc = settings.products && typeof settings.products==="object"?settings.products:{}; const list = Array.isArray(pc.list)?pc.list:(Array.isArray(pc.items)?pc.items:[]); const p = list.find((x:any)=>String(x.id)===String(b.id)); if(!p) return err("محصول یافت نشد",o,404); return ok({ product:p },o); },
  create_product: createProduct,
  update_product: updateProduct,
  delete_product: deleteProduct,
  // Media / Articles
  list_media: listMedia,
  list_articles: listMedia,
  list_multimedia: listMedia,
  get_media: async (b,o)=>{ const { settings } = await loadSettings(); const list = Array.isArray(settings.mediaItems)?settings.mediaItems:[]; const m = list.find((x:any)=>String(x.id)===String(b.id)); if(!m) return err("محتوا یافت نشد",o,404); return ok({ media:m },o); },
  create_media: createMedia,
  create_article: createMedia,
  update_media: updateMedia,
  update_article: updateMedia,
  delete_media: deleteMedia,
  delete_article: deleteMedia,
  // Education (آموزش‌ها)
  list_education: listEducation,
  list_educations: listEducation,
  get_education: async (b,o)=>{ const { settings } = await loadSettings(); const edu = settings.education && typeof settings.education==="object"?settings.education:{}; const items = Array.isArray(edu.items)?edu.items:[]; const x = items.find((it:any)=>String(it.id)===String(b.id)); if(!x) return err("آیتم آموزشی یافت نشد",o,404); return ok({ education:x },o); },
  create_education: createEducation,
  update_education: updateEducation,
  delete_education: deleteEducation,
  // Highlights
  list_highlights: listHighlights,
  list_stories: listHighlights,
  get_highlight: async (b,o)=>{ const { settings } = await loadSettings(); const sh = settings.storyHighlights && typeof settings.storyHighlights==="object"?settings.storyHighlights:{}; const list = Array.isArray(sh.highlights)?sh.highlights:[]; const h = list.find((x:any)=>String(x.id)===String(b.id)); if(!h) return err("هایلایت یافت نشد",o,404); return ok({ highlight:h },o); },
  create_highlight: createHighlight,
  create_story: createHighlight,
  update_highlight: updateHighlight,
  update_story: updateHighlight,
  delete_highlight: deleteHighlight,
  delete_story: deleteHighlight,
  // Banners & SEO
  list_banners: listBanners,
  update_banner: updateBanner,
  list_seo: listSeo,
  update_seo: updateSeo,
};

serve(async (req)=>{
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  // Support both GET (for pending check) and POST
  let body: any = {};
  let action = "";
  if (req.method === "GET") {
    const url = new URL(req.url);
    action = url.searchParams.get("action") || "";
    body = {
      pending_id: url.searchParams.get("pending_id") || url.searchParams.get("id") || "",
      id: url.searchParams.get("id") || "",
    };
  } else if (req.method === "POST") {
    try { body = await req.json(); } catch { return err("بدنه JSON نامعتبر", origin, 400); }
    action = body.action || "";
  } else {
    return err("Method not allowed", origin, 405);
  }

  // ریشهٔ عمومی: GET بدون اکشن → راهنمای اتصال برای ایجنت‌های هوش مصنوعی (بدون کلید)
  if (!action) {
    const publicGuide = {
      service: "content-api",
      brand: BRAND,
      description_fa: "این سرویس، رابط مدیریت محتوای «" + BRAND.name_fa + "» برای ایجنت‌های هوش مصنوعی است" + (BRAND.site ? " (" + BRAND.site + ")" : "") + ". کلید لازم را صاحب سایت از «پنل مدیریت ← امنیت ← ساخت API key» می‌سازد و در اختیار تو می‌گذارد.",
      description_en: `Content management API of ${BRAND.name_en} for AI agents. The site owner creates your API key in Admin Panel → Security → Create API key.`,
      how_to_authenticate: buildHowTo("list_education"),
      first_steps_fa: [
        "قدم ۱) action را whoami بگذار و با کلیدت صدا بزن تا ببینی به کدام بخش‌ها دسترسی داری.",
        "قدم ۲) action را get_policy بخوان تا قوانین محتوایی برند را بدانی؛ بدون رعایت آنها ایجاد/ویرایش با ارور 422 رد می‌شود.",
        "قدم ۳) برای هر بخش دسترسی که داری، اکشن‌های list/get/create/update/delete با الگوی <verb>_<resource> موجود است.",
      ],
      first_steps_en: [
        "1) Call action=whoami with your key to see exactly which sections your key can manage.",
        "2) Call action=get_policy to read the mandatory content rules (violations are blocked with HTTP 422).",
        "3) Use list/get/create/update/delete_<resource> actions for each section you have access to.",
      ],
      known_resources: ["reviews","faqs","courses","products","articles","stories","parent_experiences","multimedia","education","banners","seo"],
      bulk_pattern_fa: "عملیات دسته‌جمعی: bulk_create_<resource>، bulk_update_<resource>، bulk_delete_<resource> (bulk_delete بالای ۲ آیتم نیازمند تأیید صاحب سایت است).",
    };
    return ok({ guide: publicGuide }, origin, 200);
  }

  // Special actions that don't require API key? No, all require API key except pending check also requires key
  // Extract and validate API key for all actions
  const apiKeyPlain = extractApiKey(req, body);
  const validation = await validateApiKey(apiKeyPlain);
  if (!validation.ok) {
    return err(validation.error, origin, validation.status, {
      hint_fa: "این سرویس content-api سایت " + BRAND.name_fa + " است — نه رمز پنل، نه کلید Stripe/Paystack. کلید صحیح را از «پنل مدیریت ← امنیت» سایت بگیر و با هدر Authorization: Bearer <key> بفرست. ریشهٔ سرویس را GET کن تا راهنمای کامل را ببینی.",
      hint_en: "This is the " + BRAND.name_en + " content-api. Authenticate with an API key generated in the site's Admin Panel → Security page (Authorization: Bearer <key>). GET this URL for the full guide.",
    });
  }
  const apiKey = validation.key;

  // Update usage
  updateKeyUsage(apiKey.id);

  // Determine resource type for scope check
  const resourceFromAction = (() => {
    const a = action.toLowerCase();
    if (a.includes("review")) return "reviews";
    if (a.includes("faq")) return "faqs";
    if (a.includes("course") || a.includes("discount") || a.includes("tag") || a.includes("featured")) return "courses";
    if (a.includes("product")) return "products";
    if (a.includes("media") || a.includes("article") || a.includes("multimedia") || a.includes("parent_experience")) return "multimedia";
    if (a.includes("highlight") || a.includes("story")) return "stories";
    if (a.includes("banner")) return "banners";
    if (a.includes("education")) return "education";
    if (a.includes("seo")) return "seo";
    if (a.includes("pending")) return "all";
    return "all";
  })();

  if (!hasScope(apiKey.scopes, resourceFromAction) && !["check_pending","execute_pending","list_pending","get_policy","get_content_policy","whoami","capabilities","describe","me","describe_resource"].includes(action)) {
    await logAudit(apiKey.id, action, resourceFromAction, null, { error:"scope denied" }, req, false);
    return err(`دسترسی به ${resourceFromAction} برای این کلید مجاز نیست. Scopes: ${apiKey.scopes.join(",")}`, origin, 403, { hint_fa:"برای دیدن فهرست دقیق بخش‌های مجاز، action را whoami بگذار و دوباره صدا بزن.", hint_en:"Call action=whoami to see exactly which sections this key can access." });
  }

  // ─── اکشن متای خودتوضیحی (برای همهٔ کلیدهای معتبر، بدون نیاز به اسکوپ) ───
  // شمای کامل فیلدهای محتوا — برای همهٔ کلیدهای معتبر (بدون نیاز به اسکوپ)
  if (action === "describe_resource") {
    const res = String(body.resource || body.section || body.type || "education").toLowerCase().trim();
    const educationSchema = {
      display_fa: "در صفحهٔ «آموزش» (/education) — کارت‌ها title+desc+cover+keywords می‌خوانند؛ کلیک کارت → مودال کامل با meta + متن + تصاویر بین‌ پاراگراف.",
      renderer_rules_fa: [
        "متن‌ها ساده (بدون HTML)؛ <img>، <p>، <div>، <span>، <a href>، <strong>، <br> و هر برچسب دیگر به‌صورت متنِ خام نمایش داده می‌شود و غلط است.",
        "نشانه‌گذاری درون‌خطی مجاز: **متن** → بولد/کلفت | *متن* → کج/ایتالیک | __متن__ → زیرخط | [متن لینک](https://example.com) → لینک خارجی | [متن لینک](/form) → لینک داخلی سایت",
        "لینک‌های داخلی سایت که می‌توان توی متن به آنها اشاره داد: /courses (دوره‌ها) · /education (آموزش‌ها) · /experience (تجربه والدین) · /form (فرم مشاوره رایگان) · /products (محصولات) · /faq (سؤالات متداول) · /about · /contact · /privacy",
        "قاعدهٔ لینک‌سازی: اگر توی متن از دورهٔ مرتبط/فرم مشاوره/بخش دیگری نام بردی، آن عبارت را به‌صورت لینک داخلی بنویس؛ مثلا [دوره‌های تخصصی](/courses) یا [درخواست مشاوره رایگان](/form) یا اشارهٔ دیگر — این قابلیت برای همهٔ بخش‌ها به‌جز نظرات کاربران فعال است.",
        "پاراگراف‌ها در body با دو خط خالی (\\n\\n) جدا می‌شوند.",
      ],
      fields: [
        { field:"title", type:"string", required:true, where_fa:"کارت + عنوان مقاله", rules_fa:"۴ تا ۳۰۰ کاراکتر، فارسی، بدون HTML" },
        { field:"titleEn", type:"string", required:false, where_fa:"عنوان انگلیسی (lang=en)", rules_fa:"اختیاری" },
        { field:"desc", type:"string", required:true, where_fa:"خلاصهٔ کوتاه روی کارت (sync با description)", rules_fa:"متن ساده، نشانه‌گذاری ساده مجاز" },
        { field:"body", type:"string", required:true, where_fa:"متن کامل مقاله", rules_fa:"بدون HTML؛ پاراگراف‌ها با \\n\\n؛ نشانه‌گذاری ساده مجاز" },
        { field:"cover", type:"string(URL)", required:true, where_fa:"تصویر جلد مقاله — در کارت، بالای مقاله، و پنل مدیریت (فیلد «کاور مقاله») قرار می‌گیرد", rules_fa:"فقط URL مستقیم، هرگز HTML — api خودکار imageUrl(قدیمی) ↔ cover را هم‌همگام می‌کند" },
        { field:"images", type:"array<{url:string, position:number, alt?:string}>", required:false, where_fa:"تصاویر بین توضیحات — وقتی مقاله بلند است و عکس مرتبط با موضوع پیدا کردی، عکس را اینجا بگذار (نه توی body)", rules_fa:"position: 0=بالا، 1=بعد از پاراگراف اول، 2=بعد از پاراگراف دوم، ... — فقط URL مستقیم" },
        { field:"quote", type:"string", required:false, where_fa:"نقل‌قول برجسته (blockquote) در انتهای متن", rules_fa:"یک جملهٔ کوتاه تأمل‌برانگیز" },
        { field:"highlights", type:"array<{text:string, color:string}>", required:false, where_fa:"«هایلایت‌های متن (جملات رنگی جلب‌توجه)» — همان بخش موجود در پنل مدیریت؛ در نمایش قبل یا بعد از توضیحات/متن کامل به‌ترتیب ظاهر می‌شوند تا جملات مهم به چشم مخاطب بیایند و بخش‌ها از هم جدا بمانند و متن خسته‌کننده نشود", rules_fa:"رنگ پاستیلی انتخاب کن تا متن داخل با رنگ هایلایت خوانا بماند؛ حداکثر ۶ × ۵۰۰؛ color فقط از پالت ۸تایی زیر" },
        { field:"sourceUrl", type:"string(URL)", required:true, where_fa:"دکمهٔ «منبع» در متا (اعتبار مقاله/سئو)", rules_fa:"از AAP CDC WHO NIDDK PubMed NIH — همیشه لازم" },
        { field:"author / authorEn", type:"string", required:true, where_fa:"نویسنده در متا", rules_fa:"نام تحریریه برند" },
        { field:"minutes", type:"number", required:false, where_fa:"مدت مطالعه", rules_fa:"عدد صحیح (۳ تا ۱۵)" },
        { field:"date / dateEn", type:"string", required:true, where_fa:"تاریخ در متا", rules_fa:"شمسی/میلادی" },
        { field:"keywords", type:"string[]", required:false, where_fa:"جست‌و‌جو + سئو", rules_fa:"تا ۲۰ کلمهٔ کوتاه" },
        { field:"slug", type:"string", required:true, where_fa:"اشتراک/سئو", rules_fa:"لاتین کوچک + خط تیره" },
        { field:"categories / category", type:"string[]", required:false, where_fa:"فیلترهای صفحه", rules_fa:"فارسی: «اشتها», «رشد قد», «خواب», ..." },
        { field:"type", type:"string", required:true, where_fa:"قالب نمایش", rules_fa:"article" },
        { field:"order", type:"number", required:false, where_fa:"ترتیب نمایش", rules_fa:"number" },
        { field:"active / isVisible", type:"boolean", required:true, rules_fa:"true" },
      ],
      highlight_palette_fa: ["#DCFCE7 (سبز ملایم → نکتهٔ کاربردی)","#FEF9C3 (زرد ملایم → توجه/یادآوری)","#DBEAFE (آبی ملایم → اطلاعهٔ علمی)","#FFE4E6 (صورتی ملایم → هشدار)","#FFEDD5 (نارنجی ملایم → هشدار ملایم)","#F3E8FF (بنفش ملایم → نکتهٔ تخصصی)","#CCFBF1 (فیروزه‌ای ملایم → اقدام سلامت)","#E2E8F0 (خاکستری ملایم → یادداشت)"],
      dos_fa: [
        "همیشه منبع معتبر را در sourceUrl بگذار؛ در body فقط اسم منبع به‌صورت متن ذکر کن.",
        "تصویر جلد فقط در cover؛ تصاویر میانی فقط در images[] با position منطقی.",
        "جملات کلیدی را در highlights با رنگ مناسب ماهیت‌بندی کن (حداکثر ۳-۴).",
        "یک quote کوتاه و جذاب در فیلد quote بگذار تا در انتهای مقاله برجسته شود.",
        "slug یکتا (لاتین + خط تیره)، keywords ۶-۱۰ کلمه، desc ۲-۳ خطی جذاب.",
        "لحن برند: آمیانهٔ مؤدبانه (میتونه، واسه، بچه، خونه)؛ قوانین کامل با get_policy.",
        "کلمات کلیدی/عبارت‌های مهم در متن را به صفحات مرتبط لینک کن: [دوره‌های تخصصی](/courses) [از بخش آموزش‌ها](/education) [درخواست مشاوره رایگان](/form) [مراکز تماس](/contact).",
        "هر مقاله اگر جملهٔ کلیدی/هشداری دارد ۱-۲ ردیف highlights هم بگذار؛۵۰۰ کاراکتر × حداکثر ۶ ؛ رنگ فقط از پالت ۸تایی.",
      ],
      donts_fa: [
        "HTML (<img>, <p>, <div>, <a href>, <strong>, <br> و...) در هیچ فیلد نگذار.",
        "تصویر را در body با <img> نگذار.",
        "«به پزشک مراجعه کنید» نگو — بگو «با واحد مشاورهٔ مجموعه در میان بگذار».",
        "دوز دقیق دارو/مکمل و ادعای درمان قطعی/۱۰۰٪ هیچ‌وقت ننویس.",
        "اطلاعات شخصی (موبایل/کارت) در متن نگذار.",
      ],
      example: {
        title:"کم‌اشتهایی واقعی یا دوره‌ای؟ راهنمای خانواده",
        desc:"اگه بچه‌ت غذا را نمی‌خوره، اول صبر و نظم لازمه…",
        body:"پاراگراف اول…\\n\\n**نکتهٔ مهم:** …\\n\\nپاراگراف دوم…",
        cover:"https://i.imageupload.app/abcd1234.jpeg",
        images:[{ url:"https://i.imageupload.app/xyz567.jpeg", position:0, alt:"مهمان سفرهٔ خانه" },{ url:"https://i.imageupload.app/qrs890.jpeg", position:2 }],
        quote:"سفرهٔ آرام، کلید خوش‌اشتهایی بچه است.",
        highlights:[{ text:"یادداشت: لرزش اشتها در دو سه روز طبیعیه.", color:"#DCFCE7" },{ text:"هشدار: وزن‌کم‌کردن شدید یا بی‌حالی = فوراً با مشاوره تماس.", color:"#FEF9C3" }],
        sourceUrl:"https://www.healthychildren.org/English/ages-stages/toddler/nutrition/Pages/default.aspx",
        slug:"low-appetite-or-phase",
        keywords:["اشتها","بدغذایی","بچه","سفره"],
        categories:["اشتها"],
        type:"article",
        minutes:8,
      },
    };
    return ok({
      resource: res,
      schema: res.includes("edu") || res === "article" ? educationSchema : { generic_note_fa:"همین قواعد متنِ ساده + نشانه‌گذاری در همهٔ بخش‌ها؛ برای education اکشن را مجدد با resource:'education' فراخوانی کن." },
      brand: BRAND,
      note_fa: "قبل از create/update، دادهٔ قدیمی همان بخش را با list_ بخوان و لحن/ساختار را مطابق بکن.",
    }, origin);
  }

  // خودشناسی کلید — برای همهٔ کلیدهای معتبر (خواندنی، بدون نیاز به اسکوپ)
  if (action === "whoami" || action === "capabilities" || action === "describe" || action === "me") {
    const caps = computeCapabilities(apiKey.scopes || []);
    const summary = keyScopeSummaryFa(apiKey.scopes || []);
    await logAudit(apiKey.id, action, "@meta", null, { read:true }, req, true);
    return ok({
      service: "content-api",
      brand: BRAND,
      base_url: BASE_URL,
      key: {
        name: apiKey.name || "",
        prefix: apiKey.key_prefix || "",
        scopes: apiKey.scopes || [],
        is_revoked: !!apiKey.is_revoked,
        expires_at: apiKey.expires_at || null,
      },
      capabilities: caps.groups,
      flat_actions: caps.actions,
      summary_fa: "من به این موارد دسترسی دارم: " + summary + " — و می‌توانم در این بخش‌ها فهرست بگیرم، بسازم، ویرایش و حذف کنم (بنر/سئو فقط ویرایش).",
      summary_en: "This key is connected to the " + BRAND.name_en + " content-api and can manage: " + summary + ".",
      next_step_fa: "قوانین محتوای برند را با اکشن get_policy بخوان؛ هر متن نقض‌کننده با ارور 422 برگردانده می‌شود و ذخیره نمی‌شود.",
      how_to_call: buildHowTo(caps.actions.find(a=>a.startsWith("list_")) || "get_policy"),
      bulk_note_fa: "برای کار دسته‌جمعی: bulk_create_/bulk_update_/bulk_delete_ + <resource>. حذف دسته‌جمعیِ بالای ۲ آیتم نیازمند تأیید مالک در پنل است.",
      schema_hint_fa: "قبل از نوشتن مقالهٔ آموزش (یا هر بخش دیگر)، action=describe_resource با body={resource:'education'} را بزن — شمای فیلدهای cover/images/highlights/sourceUrl/quote را با مثال برمی‌گرداند و از HTML بودن متن جلوگیری می‌کند.",
      inline_markup_note_fa: "متن‌ها ساده بنویس (بدون HTML): **بولد/کلفت** *کج/ایتالیک* __زیرخط__ [لینک خارجی](https://...) [لینک داخلی](/form)/[متن](/courses)/[متن](/education) — برای جزئیات عکس/هایلایت/صفحات داخلی قبل از نوشتن حتماً describe_resource را بخوان.",
    }, origin);
  }

  if (action === "get_policy" || action === "get_content_policy") {
    await logAudit(apiKey.id, action, "@meta", null, { read:true }, req, true);
    return ok({ policy: policySummary(), api_version: 1 }, origin);
  }

  // ─── لایهٔ اجباری قوانین محتوا (قبل از هر نوع handler) ───
  const isWriteAction = action.startsWith("create_") || action.startsWith("update_") ||
    action.startsWith("set_") || action.startsWith("bulk_create_") || action.startsWith("bulk_update_");
  if (isWriteAction) {
    const policyViolations = scanContentPolicy(body);
    if (policyViolations.length) {
      await logAudit(apiKey.id, action, resourceFromAction, (body && body.id) || null,
        { policy_blocked: policyViolations.map(v=>v.rule) }, req, false);
      return err(
        "قوانین محتوایی برند رعایت نشده است؛ این درخواست ذخیره نشد. جزئیات نقض در policy_violations آمده است — متن کامل قوانین را با اکشن get_policy بخوانید و پس از اصلاح دوباره تلاش کنید.",
        origin, 422,
        { policy_violations: policyViolations, policy_version: POLICY_VERSION },
      );
    }
  }

  try {
    // Handle pending check / execute
    if (action === "check_pending" || action === "get_pending") {
      if (!body.pending_id && !body.id) return err("pending_id الزامی است", origin, 400);
      const pending = await checkPendingApproval(body.pending_id || body.id, apiKey.id);
      return ok({ pending }, origin);
    }

    if (action === "execute_pending") {
      if (!body.pending_id && !body.id) return err("pending_id الزامی است", origin, 400);
      const pendingId = body.pending_id || body.id;
      const pending = await checkPendingApproval(pendingId, apiKey.id);
      if (pending.status !== "approved") {
        return err(`این درخواست هنوز تایید نشده است. وضعیت فعلی: ${pending.status}`, origin, 400, { status: pending.status, pending });
      }
      // Execute based on stored payload
      const stored = pending.payload || {};
      const resType = pending.resource_type;
      const opType = pending.operation_type;
      // Reconstruct body for handler
      let execAction = "";
      let execBody: any = {};
      if (opType === "bulk_delete") {
        // For bulk delete, we need to delete each id
        const ids = pending.resource_ids || [];
        let results: any[] = [];
        for (const id of ids) {
          const handlerKey = `delete_${resType.replace(/s$/,"")}`; // crude
          // Map resource_type to delete action
          const map: Record<string,string> = {
            reviews:"delete_review", faqs:"delete_faq", courses:"delete_course",
            products:"delete_product", media:"delete_media", multimedia:"delete_media",
            articles:"delete_article", highlights:"delete_highlight", stories:"delete_highlight", education:"delete_education",
          };
          const hKey = map[resType] || `delete_${resType}`;
          const handler = HANDLERS[hKey];
          if (handler) {
            try {
              const r = await handler({ id }, origin);
              const rj = await r.json();
              results.push({ id, ok: rj.ok });
            } catch (e) {
              results.push({ id, ok:false, error:String(e) });
            }
          }
        }
        // Mark pending as executed? Keep approved but log
        await getSupabaseAdmin().from("api_pending_approvals").update({ reason:"executed" }).eq("id", pendingId);
        await logAudit(apiKey.id, `execute_bulk_delete_${resType}`, resType, null, { pending_id: pendingId, results }, req, true);
        return ok({ executed:true, results, pending_id: pendingId }, origin);
      } else if (opType === "bulk_edit") {
        const ids = pending.resource_ids || [];
        const updates = stored.updates || stored;
        const pendEditViol = scanContentPolicy({ updates });
        if (pendEditViol.length) {
          await logAudit(apiKey.id, `execute_bulk_edit_${resType}`, resType, null, { pending_id: pendingId, policy_blocked: pendEditViol.map(v=>v.rule) }, req, false);
          return err("قوانین محتوایی برند در این درخواست گروهی نقض شده است؛ اجرا متوقف شد.", origin, 422, { policy_violations: pendEditViol, policy_version: POLICY_VERSION, pending_id: pendingId });
        }
        let results: any[] = [];
        for (const id of ids) {
          const map: Record<string,string> = {
            reviews:"update_review", faqs:"update_faq", courses:"update_course",
            products:"update_product", media:"update_media", highlights:"update_highlight", education:"update_education",
          };
          const hKey = map[resType] || `update_${resType}`;
          const handler = HANDLERS[hKey];
          if (handler) {
            try {
              const r = await handler({ id, updates }, origin);
              const rj = await r.json();
              results.push({ id, ok: rj.ok });
            } catch (e) {
              results.push({ id, ok:false, error:String(e) });
            }
          }
        }
        await logAudit(apiKey.id, `execute_bulk_edit_${resType}`, resType, null, { pending_id: pendingId, results }, req, true);
        return ok({ executed:true, results, pending_id: pendingId }, origin);
      } else if (opType === "bulk_add") {
        const items = Array.isArray(stored.items) ? stored.items : (Array.isArray(stored) ? stored : [stored]);
        let results: any[] = [];
        for (const item of items) {
          const map: Record<string,string> = {
            reviews:"create_review", faqs:"create_faq", courses:"create_course",
            products:"create_product", media:"create_media", highlights:"create_highlight", education:"create_education",
          };
          const hKey = map[resType] || `create_${resType}`;
          const handler = HANDLERS[hKey];
          if (handler) {
            const itemViol = scanContentPolicy(item);
            if (itemViol.length) { results.push({ ok:false, policy_blocked:true, violations:itemViol }); continue; }
            try {
              const r = await handler(item, origin);
              const rj = await r.json();
              results.push({ ok: rj.ok, data: rj });
            } catch (e) {
              results.push({ ok:false, error:String(e) });
            }
          }
        }
        await logAudit(apiKey.id, `execute_bulk_add_${resType}`, resType, null, { pending_id: pendingId, results }, req, true);
        return ok({ executed:true, results, pending_id: pendingId }, origin);
      }
      return err("نوع عملیات گروهی نامشخص", origin, 400);
    }

    // Bulk operations detection for approval flow
    const isBulkDelete = action.startsWith("bulk_delete_");
    const isBulkUpdate = action.startsWith("bulk_update_");
    const isBulkCreate = action.startsWith("bulk_create_");

    if (isBulkDelete || isBulkUpdate || isBulkCreate) {
      const resType = action.replace("bulk_delete_","").replace("bulk_update_","").replace("bulk_create_","");
      let count = 0;
      let ids: string[] = [];
      let payload: any = body;
      if (isBulkDelete) {
        ids = Array.isArray(body.ids) ? body.ids.map(String) : (Array.isArray(body.resource_ids) ? body.resource_ids.map(String) : []);
        count = ids.length;
      } else if (isBulkUpdate) {
        ids = Array.isArray(body.ids) ? body.ids.map(String) : [];
        count = ids.length;
        payload = { updates: body.updates };
      } else if (isBulkCreate) {
        const items = Array.isArray(body.items) ? body.items : (Array.isArray(body.reviews) ? body.reviews : (Array.isArray(body.faqs) ? body.faqs : (Array.isArray(body.courses) ? body.courses : (Array.isArray(body.products) ? body.products : []))));
        count = items.length || (Array.isArray(body) ? body.length : 0);
        payload = { items };
        ids = [];
      }
      const op = isBulkDelete ? "delete" as const : isBulkUpdate ? "edit" as const : "add" as const;
      // For bulk, always go through approval check (since count>1 or >10)
      const actualHandler = async (b:any, o:string)=>{
        // This will be executed only if not requiring approval, but for bulk we want to execute only after approval via execute_pending
        // So for bulk, we should directly create pending if needed, not execute
        // However if count is within limits (e.g., delete 1, add 5), we can allow direct
        if (op==="delete" && count===1) {
          const singleHandler = HANDLERS[`delete_${resType.replace(/s$/,"")}`] || HANDLERS[`delete_${resType}`];
          if (singleHandler) return await singleHandler({ id: ids[0] }, o);
        }
        if (op==="edit" && count===1) {
          const singleHandler = HANDLERS[`update_${resType.replace(/s$/,"")}`] || HANDLERS[`update_${resType}`];
          if (singleHandler) return await singleHandler({ id: ids[0], updates: body.updates }, o);
        }
        if (op==="add" && count<=10) {
          let results:any[]=[];
          const items = payload.items || [];
          for (const it of items) {
            const h = HANDLERS[`create_${resType.replace(/s$/,"")}`] || HANDLERS[`create_${resType}`];
            if (h) {
              const itViol = scanContentPolicy(it);
              if (itViol.length) { results.push({ ok:false, policy_blocked:true, violations: itViol }); continue; }
              const r = await h(it, o);
              const j = await r.json();
              results.push(j);
            }
          }
          return ok({ created: results.length, results }, o);
        }
        // If we reach here, it needs approval but we are in direct path - create pending
        return await handleWithApprovalCheck(req, apiKey, resType, op, count, ids, payload, async ()=>ok({}, o), b, o);
      };
      const result = await handleWithApprovalCheck(req, apiKey, resType, op, count, ids, payload, actualHandler, body, origin);
      return result;
    }

    // Single operations with approval check for delete/edit >1? For single, count=1 so no approval needed, but we still use wrapper for consistency
    const handler = HANDLERS[action];
    if (!handler) return err(`action نامعتبر: ${action}`, origin, 400, { hint_fa:"برای دیدن اکشن‌های در دسترس با کلیدت، action را whoami بگذار. راهنمای کامل: ریشهٔ همین تابع را GET کن.", hint_en:"Unknown action. Call action=whoami (with your key) or GET this endpoint for the guide + action catalog." });

    // Determine operation type for single
    let opType: "delete"|"edit"|"add" = "edit";
    if (action.startsWith("delete_")) opType = "delete";
    else if (action.startsWith("create_") || action.startsWith("set_")) opType = "add";
    else if (action.startsWith("update_") || action.startsWith("remove_") || action.startsWith("unset_")) opType = "edit";
    else opType = "edit"; // list/get are read, no approval needed

    const isRead = action.startsWith("list_") || action.startsWith("get_");
    if (isRead) {
      const res = await handler(body, origin);
      await logAudit(apiKey.id, action, resourceFromAction, body.id || null, { read:true }, req, res.ok);
      return res;
    }

    // For single write, count=1 except bulk add handled above
    let count = 1;
    let ids: string[] = body.id ? [String(body.id)] : [];
    let payloadForPending = body;

    // Special case: if body contains items array for single create bulk?
    if (action.startsWith("create_") && Array.isArray(body.items)) {
      count = body.items.length;
      payloadForPending = { items: body.items };
    }

    const result = await handleWithApprovalCheck(req, apiKey, resourceFromAction, opType, count, ids, payloadForPending, handler, body, origin);
    // Log audit if not requiring approval (i.e., status !=202)
    if (result.status !== 202) {
      const j = await result.clone().json().catch(()=>({}));
      await logAudit(apiKey.id, action, resourceFromAction, body.id || null, { body, result: j }, req, j.ok !== false);
    }
    return result;

  } catch (e) {
    console.error(`content-api error in ${action}:`, e);
    await logAudit(apiKey.id, action, resourceFromAction, null, { error: String(e) }, req, false);
    return err("خطای داخلی سرور", origin, 500);
  }
});
