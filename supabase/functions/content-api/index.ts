// supabase/functions/content-api/index.ts
// API for AI agents to manage content via API keys created from admin panel security section.
// Free - uses existing Supabase Edge Functions, no extra cost.
// Deploy: supabase functions deploy content-api --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, getOrigin } from "../_shared/cors.ts";

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
  "articles","stories","parent_experiences","multimedia","banners","seo","all"
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

  if (!action) return err("action الزامی است", origin, 400);

  // Special actions that don't require API key? No, all require API key except pending check also requires key
  // Extract and validate API key for all actions
  const apiKeyPlain = extractApiKey(req, body);
  const validation = await validateApiKey(apiKeyPlain);
  if (!validation.ok) {
    return err(validation.error, origin, validation.status);
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
    if (a.includes("seo")) return "seo";
    if (a.includes("pending")) return "all";
    return "all";
  })();

  if (!hasScope(apiKey.scopes, resourceFromAction) && !["check_pending","execute_pending","list_pending"].includes(action)) {
    await logAudit(apiKey.id, action, resourceFromAction, null, { error:"scope denied" }, req, false);
    return err(`دسترسی به ${resourceFromAction} برای این کلید مجاز نیست. Scopes: ${apiKey.scopes.join(",")}`, origin, 403);
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
            articles:"delete_article", highlights:"delete_highlight", stories:"delete_highlight",
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
        let results: any[] = [];
        for (const id of ids) {
          const map: Record<string,string> = {
            reviews:"update_review", faqs:"update_faq", courses:"update_course",
            products:"update_product", media:"update_media", highlights:"update_highlight",
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
            products:"create_product", media:"create_media", highlights:"create_highlight",
          };
          const hKey = map[resType] || `create_${resType}`;
          const handler = HANDLERS[hKey];
          if (handler) {
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
              const r = await h(it, o);
              const j = await r.json();
              results.push(j);
            }
          }
          return ok({ created: results.length, results }, o);
        }
        // If we reach here, it needs approval but we are in direct path - create pending
        return await handleWithApprovalCheck(req, apiKey, resType, op, count, ids, payload, async ()=>ok({}), b, o);
      };
      const result = await handleWithApprovalCheck(req, apiKey, resType, op, count, ids, payload, actualHandler, body, origin);
      return result;
    }

    // Single operations with approval check for delete/edit >1? For single, count=1 so no approval needed, but we still use wrapper for consistency
    const handler = HANDLERS[action];
    if (!handler) return err(`action نامعتبر: ${action}`, origin, 400);

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
