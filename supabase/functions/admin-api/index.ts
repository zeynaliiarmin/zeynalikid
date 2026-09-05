// supabase/functions/admin-api/index.ts
// Centralized admin API for the Farzandman admin panel.
// Extended with API Keys management for AI agents (content-api).

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, getOrigin, rejectIfInvalidOrigin,
} from "../_shared/cors.ts";
import {
  validateAdminSession, extractSessionToken,
} from "../_shared/adminAuth.ts";
import { ok, err } from "../_shared/http.ts";

// ──────────────────────────────────────────────────────────────────────────
// Submissions
// ──────────────────────────────────────────────────────────────────────────

async function listSubmissions(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, parseInt(body.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit ?? "50", 10) || 50));
  const offset = (page - 1) * limit;
  const search = typeof body.search === "string" ? body.search.trim() : "";
  const type = typeof body.type === "string" ? body.type : "";
  const sortBy = ["created_at", "updated_at"].includes(body.sortBy) ? body.sortBy : "created_at";
  const sortOrder = body.sortOrder === "asc" ? "asc" : "desc";

  let query = supabase
    .from("submissions")
    .select("id,full_phone,payload,tracking_code,submission_type,order_status,consultation_status,course_id,advisor_code,created_at,updated_at,deleted_at", { count: "exact" });

  if (type === "consultation" || type === "course") {
    query = query.eq("submission_type", type);
  }

  if (typeof body.status === "string" && body.status) {
    query = query.or(
      `order_status.eq.${body.status},consultation_status.eq.${body.status}`,
    );
  }

  if (search) {
    query = query.or(
      `tracking_code.ilike.%${search}%,full_phone.ilike.%${search}%`,
    );
  }

  if(body.deletedOnly===true)query=query.not("deleted_at","is",null);
  else if(body.includeDeleted!==true)query=query.is("deleted_at",null);

  query = query.order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("list_submissions error:", error);
    return err("خطا در دریافت فرم‌ها", origin, 500);
  }

  return ok({
    submissions: data ?? [],
    total: count ?? 0,
    page,
    limit,
  }, origin);
}

async function getSubmission(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .select("id,full_phone,payload,tracking_code,submission_type,order_status,consultation_status,course_id,advisor_code,created_at,updated_at,deleted_at")
    .eq("id", body.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("get_submission error:", error);
    return err("خطا در دریافت فرم", origin, 500);
  }
  if (!data) return err("فرم یافت نشد", origin, 404);
  return ok({ submission: data }, origin);
}

const SUBMISSION_PAYLOAD_WHITELIST = [
  "orderStatus",
  "consultationStatus",
  "priority",
  "unread",
  "isNew",
  "followReminder",
  "followUps",
  "adminNotes",
  "usageInstructions",
  "timeSlot",
  "course",
  "shipping",
  "childInfo",
  "payment",
  "tonguePhotos",
  "editHistory",
  "showCorrectiveTab",
  "correctiveData",
  "corrective",
  "mealPlan",
  "showMealPlan",
  "usagePdfUrl",
  "mealPdfUrl",
  "userNotes",
  "productUsage",
  "category",
];

const SUBMISSION_PAYLOAD_BLOCKLIST = [
  "trackingCode",
  "fullPhone",
  "date",
  "time",
];

async function updateSubmission(body: any, origin: string, session: any): Promise<Response> {
  if (!body.id || !body.updates || typeof body.updates !== "object") {
    return err("id و updates الزامی است", origin, 400);
  }
  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase
    .from("submissions")
    .select("id, payload")
    .eq("id", body.id)
    .limit(1)
    .maybeSingle();
  if (fetchErr) return err("خطا در دسترسی به فرم", origin, 500);
  if (!existing) return err("فرم یافت نشد", origin, 404);

  const oldPayload = (existing.payload && typeof existing.payload === "object"
    ? existing.payload : {}) as Record<string, any>;

  const updates = body.updates as Record<string, any>;
  const newPayload: Record<string, any> = { ...oldPayload };
  const changedFields: string[] = [];

  for (const key of SUBMISSION_PAYLOAD_WHITELIST) {
    if (key in updates && !SUBMISSION_PAYLOAD_BLOCKLIST.includes(key)) {
      if (JSON.stringify(newPayload[key]) !== JSON.stringify(updates[key])) {
        newPayload[key] = updates[key];
        changedFields.push(key);
      }
    }
  }

  if (changedFields.length > 0) {
    const editEntry = {
      date: new Date().toISOString().slice(0, 10),
      time: new Date().toISOString().slice(11, 19),
      actor: session.ownerPhone,
      fields: changedFields,
    };
    newPayload.editHistory = [
      ...(Array.isArray(oldPayload.editHistory) ? oldPayload.editHistory : []),
      editEntry,
    ];
  }

  const { error: updateErr } = await supabase
    .from("submissions")
    .update({
      payload: newPayload,
      updated_at: new Date().toISOString(),
    })
    .eq("id", body.id);

  if (updateErr) {
    console.error("update_submission error:", updateErr);
    return err("خطا در به‌روزرسانی فرم", origin, 500);
  }

  return ok({
    updated: true,
    id: body.id,
    changedFields,
  }, origin);
}

async function softDeleteSubmission(body: any, origin: string, _session: any): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const supabase = getSupabaseAdmin();
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from("submissions")
    .update({ deleted_at: now, updated_at: now })
    .eq("id", body.id)
    .select("id, deleted_at")
    .limit(1);
  if (error) {
    console.error("soft_delete error:", error);
    return err("خطا در حذف نرم", origin, 500);
  }
  if (!data || data.length === 0) return err("فرم یافت نشد", origin, 404);
  return ok({ softDeleted: true, id: body.id, deletedAt: now }, origin);
}

async function restoreSubmission(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("submissions")
    .update({ deleted_at: null, updated_at: new Date().toISOString() })
    .eq("id", body.id)
    .select("id")
    .limit(1);
  if (error) return err("خطا در بازیابی", origin, 500);
  if (!data || data.length === 0) return err("فرم یافت نشد", origin, 404);
  return ok({ restored: true, id: body.id }, origin);
}

async function permanentDeleteSubmission(body: any, origin: string, _session: any): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) {
    return err("تأیید صریح لازم است (confirm: true)", origin, 400);
  }
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("submissions")
    .delete({ count: "exact" })
    .eq("id", body.id);
  if (error) return err("خطا در حذف دائمی", origin, 500);
  if (count === 0) return err("فرم یافت نشد", origin, 404);
  return ok({ permanentDeleted: true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Settings
// ──────────────────────────────────────────────────────────────────────────

const SETTINGS_SENSITIVE_KEYS = [
  "adminPassword",
  "adminPhone",
  "emergencyToken",
  "merchantId",
  "merchant_id",
  "clientSecret",
  "client_secret",
  "apiKey",
  "api_key",
  "gatewaySecret",
  "gateway_secret",
  "stripeSecretKey",
  "zarinpalMerchantId",
  "idpayApiKey",
  "paypingApiKey",
  "blubankApiKey",
  "cryptoWallets",
];

const SETTINGS_SAVE_BLOCKLIST = [
  "adminPassword",
  "adminPhone",
  "emergencyToken",
  "merchantId",
  "merchant_id",
  "clientSecret",
  "client_secret",
  "apiKey",
  "api_key",
  "gatewaySecret",
  "gateway_secret",
  "stripeSecretKey",
];

function maskSettings(settings: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(settings)) {
    if (SETTINGS_SENSITIVE_KEYS.includes(k)) {
      out[k] = v ? "***MASKED***" : v;
    } else if (k === "cryptoWallets" && v && typeof v === "object") {
      out[k] = Object.fromEntries(
        Object.entries(v).map(([kk, vv]: [string, any]) => [
          kk,
          typeof vv === "string" && vv.length > 8 ? `${vv.slice(0, 4)}...${vv.slice(-4)}` : "***",
        ]),
      );
    } else {
      out[k] = v;
    }
  }
  return out;
}

async function listSettings(_body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("settings")
    .select("key, settings, updated_at")
    .eq("key", "app_settings")
    .limit(1)
    .maybeSingle();
  if (error) return err("خطا در دریافت تنظیمات", origin, 500);
  if (!data) return ok({ settings: {} }, origin);
  return ok({
    settings: maskSettings(data.settings ?? {}),
    updated_at: data.updated_at,
  }, origin);
}

async function saveSettings(body: any, origin: string): Promise<Response> {
  if (!body.settings || typeof body.settings !== "object") {
    return err("settings الزامی است", origin, 400);
  }
  const incoming = body.settings as Record<string, any>;

  const blocked: string[] = [];
  const cleaned: Record<string, any> = {};
  for (const [k, v] of Object.entries(incoming)) {
    if (SETTINGS_SAVE_BLOCKLIST.includes(k)) {
      blocked.push(k);
      continue;
    }
    cleaned[k] = v;
  }

  const supabase = getSupabaseAdmin();

  const { data: existing, error: fetchErr } = await supabase
    .from("settings")
    .select("settings")
    .eq("key", "app_settings")
    .limit(1)
    .maybeSingle();
  if (fetchErr) return err("خطا در دسترسی به تنظیمات", origin, 500);

  const oldSettings = (existing?.settings && typeof existing.settings === "object"
    ? existing.settings : {}) as Record<string, any>;

  const merged: Record<string, any> = { ...oldSettings };
  for (const [k, v] of Object.entries(cleaned)) {
    merged[k] = v;
  }

  const now = new Date().toISOString();
  const { error: updateErr } = await supabase
    .from("settings")
    .upsert({
      key: "app_settings",
      settings: merged,
      updated_at: now,
    }, { onConflict: "key" });

  if (updateErr) {
    console.error("save_settings error:", updateErr);
    return err("خطا در ذخیره تنظیمات", origin, 500);
  }

  return ok({
    saved: true,
    blockedFields: blocked,
    settings: maskSettings(merged),
  }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// User Questions
// ──────────────────────────────────────────────────────────────────────────

async function listQuestions(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, parseInt(body.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit ?? "50", 10) || 50));
  const offset = (page - 1) * limit;
  const status = typeof body.status === "string" ? body.status : "";

  let query = supabase
    .from("user_questions")
    .select("id,phone,question,question_en,voice_note_url,answer,answer_en,page_source,status,created_at,answered_at", { count: "exact" });

  if (status) query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("list_questions error:", error);
    return err("خطا در دریافت سؤالات", origin, 500);
  }

  return ok({ questions: data ?? [], total: count ?? 0, page, limit }, origin);
}

async function updateQuestion(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const allowed: Record<string, any> = {};
  if (typeof body.answer === "string") allowed.answer = body.answer.slice(0, 4000);
  if (typeof body.answer_en === "string") allowed.answer_en = body.answer_en.slice(0, 4000);
  if (typeof body.status === "string" && ["pending", "answered", "archived"].includes(body.status)) {
    allowed.status = body.status;
  }
  if (body.answered_at) allowed.answered_at = body.answered_at;
  else if (allowed.answer) allowed.answered_at = new Date().toISOString();

  if (Object.keys(allowed).length === 0) {
    return err("هیچ فیلد مجازی برای به‌روزرسانی ارسال نشده", origin, 400);
  }

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("user_questions")
    .update(allowed)
    .eq("id", body.id);
  if (error) {
    console.error("update_question error:", error);
    return err("خطا در به‌روزرسانی سؤال", origin, 500);
  }
  return ok({ updated: true, id: body.id, fields: Object.keys(allowed) }, origin);
}

async function deleteQuestion(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) {
    return err("تأیید صریح لازم است (confirm: true)", origin, 400);
  }
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("user_questions")
    .delete({ count: "exact" })
    .eq("id", body.id);
  if (error) return err("خطا در حذف سؤال", origin, 500);
  if (count === 0) return err("سؤال یافت نشد", origin, 404);
  return ok({ deleted: true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Reviews
// ──────────────────────────────────────────────────────────────────────────

async function listReviews(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, parseInt(body.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit ?? "50", 10) || 50));
  const offset = (page - 1) * limit;
  const status = typeof body.status === "string" ? body.status : "";

  let query = supabase
    .from("reviews")
    .select("id,course_id,reviewer_name,rating,comment,status,placements,created_at,updated_at,phone,course_ids,phone_country,public_phone", { count: "exact" });

  if (status) query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("list_reviews error:", error);
    return err("خطا در دریافت نظرات", origin, 500);
  }
  return ok({ reviews: data ?? [], total: count ?? 0, page, limit }, origin);
}

async function createReview(body: any, origin: string): Promise<Response> {
  const placements = Array.isArray(body.placements)
    ? body.placements.filter((place: unknown) => place === "course_detail" || place === "product_detail")
    : [];
  if (typeof body.reviewer_name !== "string" || !body.reviewer_name.trim()) return err("نام نظر‌دهنده الزامی است", origin, 400);
  if (typeof body.comment !== "string" || !body.comment.trim()) return err("متن نظر الزامی است", origin, 400);
  if (!placements.length) return err("محل نمایش معتبر الزامی است", origin, 400);
  const rating = Number(body.rating);
  if (!Number.isFinite(rating) || rating < 1 || rating > 5) return err("امتیاز نامعتبر است", origin, 400);
  const createdAt = typeof body.created_at === "string" && !Number.isNaN(Date.parse(body.created_at))
    ? new Date(body.created_at).toISOString()
    : new Date().toISOString();
  const row = {
    course_id: typeof body.course_id === "string" ? body.course_id.slice(0, 200) : "عمومی",
    reviewer_name: body.reviewer_name.trim().slice(0, 100),
    rating,
    comment: body.comment.trim().slice(0, 2000),
    status: ["approved", "pending"].includes(body.status) ? body.status : "pending",
    placements,
    course_ids: Array.isArray(body.course_ids) ? body.course_ids.filter((id: unknown) => typeof id === "string" && id.trim()).slice(0, 50) : [],
    phone: typeof body.phone === "string" ? body.phone.slice(0, 40) : "",
    phone_country: typeof body.phone_country === "string" ? body.phone_country.slice(0, 8) : "",
    created_at: createdAt,
  };
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("reviews").insert(row).select("id,course_id,reviewer_name,rating,comment,status,placements,created_at,updated_at,phone,course_ids,phone_country,public_phone").single();
  if (error) {
    console.error("create_review error:", error);
    return err("خطا در ثبت نظر", origin, 500);
  }
  return ok({ review: data }, origin);
}

async function updateReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const allowed: Record<string, any> = {};
  if (["approved", "rejected", "pending"].includes(body.status)) allowed.status = body.status;
  if (Array.isArray(body.placements)) {
    allowed.placements = body.placements.filter((place: unknown) => place === "course_detail" || place === "product_detail");
  }
  if (Array.isArray(body.course_ids)) {
    allowed.course_ids = body.course_ids
      .filter((c: any) => typeof c === "string" && c.trim())
      .slice(0, 50)
      .map((c: string) => c.trim());
  }
  if (typeof body.course_id === "string") allowed.course_id = body.course_id.slice(0, 200);
  if (typeof body.reviewer_name === "string") allowed.reviewer_name = body.reviewer_name.slice(0, 100);
  if (typeof body.comment === "string") allowed.comment = body.comment.slice(0, 2000);
  if (typeof body.phone === "string") allowed.phone = body.phone.slice(0, 40);
  if (typeof body.phone_country === "string") allowed.phone_country = body.phone_country.slice(0, 8);
  if (typeof body.created_at === "string" && !Number.isNaN(Date.parse(body.created_at))) allowed.created_at = new Date(body.created_at).toISOString();
  if (typeof body.rating === "number" && body.rating >= 1 && body.rating <= 5) {
    allowed.rating = body.rating;
  }
  if (Object.keys(allowed).length === 0) {
    return err("هیچ فیلد مجازی ارسال نشده", origin, 400);
  }
  allowed.updated_at = new Date().toISOString();

  const supabase = getSupabaseAdmin();
  const { error } = await supabase
    .from("reviews")
    .update(allowed)
    .eq("id", body.id);
  if (error) {
    console.error("update_review error:", error);
    return err("خطا در به‌روزرسانی نظر", origin, 500);
  }
  return ok({ updated: true, id: body.id, fields: Object.keys(allowed) }, origin);
}

async function deleteReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) {
    return err("تأیید صریح لازم است (confirm: true)", origin, 400);
  }
  const supabase = getSupabaseAdmin();
  const { error, count } = await supabase
    .from("reviews")
    .delete({ count: "exact" })
    .eq("id", body.id);
  if (error) return err("خطا در حذف نظر", origin, 500);
  if (count === 0) return err("نظر یافت نشد", origin, 404);
  return ok({ deleted: true, id: body.id }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Page View Stats
// ──────────────────────────────────────────────────────────────────────────

async function listPageViewStats(body:any,origin:string):Promise<Response>{
  const days=Math.min(90,Math.max(1,parseInt(body.days??"30",10)||30));
  const since=new Date(Date.now()-days*24*60*60*1000).toISOString();
  const {data,error}=await getSupabaseAdmin().rpc("admin_page_view_stats",{p_since:since});
  if(error){console.error("page view aggregation error:",error.message);return err("خطا در دریافت آمار بازدید",origin,500)}
  const stats=(data&&typeof data==="object"?data:{}) as any;
  return ok({totalViews:Number(stats.totalViews||0),days,topPages:Array.isArray(stats.topPages)?stats.topPages:[],dailyCounts:Array.isArray(stats.dailyCounts)?stats.dailyCounts:[]},origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Storage file deletion
// ──────────────────────────────────────────────────────────────────────────

const ALLOWED_STORAGE_BUCKETS = new Set(["images", "files", "voice-notes", "tongue-photos", "receipts"]);

async function deleteStorageFiles(body: any, origin: string, _session: any): Promise<Response> {
  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return err("urls الزامی است", origin, 400);
  }
  const supabase = getSupabaseAdmin();
  const byBucket: Record<string, string[]> = {};
  for (const u of body.urls) {
    if (typeof u !== "string" || !u.startsWith("http")) continue;
    const m = u.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const bucket = decodeURIComponent(m[1]);
    const path = decodeURIComponent(m[2]);
    if (!ALLOWED_STORAGE_BUCKETS.has(bucket) || !path) continue;
    (byBucket[bucket] ||= []).push(path);
  }
  let deleted = 0;
  for (const [bucket, paths] of Object.entries(byBucket)) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) {
      console.warn(`delete_storage_files: bucket ${bucket} error:`, error.message);
    } else {
      deleted += paths.length;
    }
  }
  return ok({ deleted }, origin);
}

async function getSignedUrls(body: any, origin: string, _session: any): Promise<Response> {
  if (!Array.isArray(body.urls) || body.urls.length === 0) {
    return err("urls الزامی است", origin, 400);
  }
  const supabase = getSupabaseAdmin();
  const result: Record<string, string> = {};
  for (const u of body.urls.slice(0, 50)) {
    if (typeof u !== "string" || !u.startsWith("http")) continue;
    const m = u.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);
    if (!m) continue;
    const bucket = decodeURIComponent(m[1]);
    const path = decodeURIComponent(m[2]);
    if (!ALLOWED_STORAGE_BUCKETS.has(bucket) || !path) continue;
    try {
      const { data, error } = await supabase.storage.from(bucket).createSignedUrl(path, 60 * 60);
      if (error || !data) continue;
      result[u] = data.signedUrl;
    } catch {
      continue;
    }
  }
  return ok({ urls: result }, origin);
}

async function runMaintenance(_body:any,origin:string):Promise<Response>{const {data,error}=await getSupabaseAdmin().rpc("admin_run_maintenance");if(error)return err("اجرای نگهداری انجام نشد",origin,500);return ok({maintenance:data},origin)}

// ──────────────────────────────────────────────────────────────────────────
// API Keys Management for AI Agents
// ──────────────────────────────────────────────────────────────────────────

const VALID_SCOPES = [
  "reviews",
  "faqs",
  "courses",
  "products",
  "discounts",
  "tags",
  "featured",
  "articles",
  "stories",
  "parent_experiences",
  "multimedia",
  "banners",
  "seo",
  "all"
];

async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer)).map(b=>b.toString(16).padStart(2,"0")).join("");
}

function generateRandomKey(): string {
  // sk_live_ + 32 random alphanumeric + 8 hex
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const randomValues = new Uint8Array(32);
  crypto.getRandomValues(randomValues);
  let rand = "";
  for (let i=0;i<32;i++) rand += chars[randomValues[i] % chars.length];
  const suffix = crypto.randomUUID().replace(/-/g,"").slice(0,8);
  return `sk_live_${rand}${suffix}`;
}

function parseExpiry(body: any): { expires_at: string | null, error?: string } {
  // Supports: expires_in: "1d","7d","30d","90d","365d","never"
  // Or expires_at: ISO string
  // Or expires_in_days: number
  if (body.expires_at) {
    if (body.expires_at === "never" || body.expires_at === null) return { expires_at: null };
    const d = new Date(body.expires_at);
    if (isNaN(d.getTime())) return { expires_at: null, error: "تاریخ انقضا نامعتبر است" };
    if (d.getTime() <= Date.now()) return { expires_at: null, error: "تاریخ انقضا باید در آینده باشد" };
    return { expires_at: d.toISOString() };
  }
  if (body.expires_in) {
    const v = String(body.expires_in).toLowerCase();
    if (v === "never" || v === "unlimited") return { expires_at: null };
    const map: Record<string, number> = { "1d":1, "7d":7, "30d":30, "90d":90, "365d":365, "1y":365 };
    if (map[v]) {
      const d = new Date(Date.now() + map[v]*24*60*60*1000);
      return { expires_at: d.toISOString() };
    }
    return { expires_at: null, error: "مقدار expires_in نامعتبر است" };
  }
  if (typeof body.expires_in_days === "number") {
    if (body.expires_in_days <=0) return { expires_at: null };
    const d = new Date(Date.now() + body.expires_in_days*24*60*60*1000);
    return { expires_at: d.toISOString() };
  }
  // default 30 days if not specified? But per spec user chooses, we default to 30d if not provided
  return { expires_at: new Date(Date.now()+30*24*60*60*1000).toISOString() };
}

async function createApiKey(body: any, origin: string, session: any): Promise<Response> {
  const name = typeof body.name === "string" ? body.name.trim().slice(0,100) : "";
  if (!name) return err("نام API الزامی است", origin, 400);
  let scopes: string[] = Array.isArray(body.scopes) ? body.scopes : [];
  if (!scopes.length) scopes = ["all"];
  // Validate scopes
  scopes = scopes.map((s:string)=>String(s).toLowerCase()).filter(s=>VALID_SCOPES.includes(s));
  if (!scopes.length) return err("حداقل یک scope معتبر انتخاب کنید", origin, 400);
  if (scopes.includes("all")) scopes = ["all"];

  const expiry = parseExpiry(body);
  if (expiry.error) return err(expiry.error, origin, 400);

  const plainKey = generateRandomKey();
  const hash = await sha256Hex(plainKey);
  const prefix = plainKey.slice(0,12); // sk_live_ + 4 chars

  const supabase = getSupabaseAdmin();
  // Expire old pending first
  try { await supabase.rpc("expire_pending_approvals"); } catch {}

  const { data, error } = await supabase.from("api_keys").insert({
    name,
    key_hash: hash,
    key_prefix: prefix,
    scopes,
    expires_at: expiry.expires_at,
    created_by: session.ownerPhone,
  }).select("id,name,key_prefix,scopes,expires_at,created_at,is_revoked").single();

  if (error) {
    console.error("create_api_key error:", error);
    if (error.code === "23505") return err("کلید تکراری، دوباره تلاش کنید", origin, 500);
    return err("خطا در ایجاد کلید", origin, 500);
  }

  // Return plain key ONLY ONCE
  return ok({
    api_key: plainKey,
    key_info: data,
    warning: "این کلید فقط یک‌بار نمایش داده می‌شود. آن را در جای امن ذخیره کنید. در مراجعه بعدی فقط پیشوند و نام نمایش داده خواهد شد.",
  }, origin);
}

async function listApiKeys(_body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  try { await supabase.rpc("expire_pending_approvals"); } catch {}
  const { data, error } = await supabase.from("api_keys")
    .select("id,name,key_prefix,scopes,is_revoked,expires_at,created_at,last_used_at,usage_count,created_by")
    .order("created_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("list_api_keys error:", error);
    return err("خطا در دریافت لیست کلیدها", origin, 500);
  }
  // Compute status
  const now = Date.now();
  const enriched = (data||[]).map((k:any)=>{
    let status = "active";
    if (k.is_revoked) status = "revoked";
    else if (k.expires_at && new Date(k.expires_at).getTime() < now) status = "expired";
    return { ...k, status };
  });
  return ok({ api_keys: enriched }, origin);
}

async function revokeApiKey(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) return err("تأیید صریح لازم است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("api_keys")
    .update({ is_revoked: true })
    .eq("id", body.id)
    .select("id,name,key_prefix,is_revoked")
    .single();
  if (error) {
    console.error("revoke_api_key error:", error);
    return err("خطا در ابطال کلید", origin, 500);
  }
  if (!data) return err("کلید یافت نشد", origin, 404);
  // Also expire pending approvals for this key
  try {
    await supabase.from("api_pending_approvals").update({ status: "rejected", decided_at: new Date().toISOString(), reason: "کلید ابطال شد" }).eq("api_key_id", body.id).eq("status","pending");
  } catch {}
  return ok({ revoked: true, key: data }, origin);
}

async function listPendingApprovals(_body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  try { await supabase.rpc("expire_pending_approvals"); } catch {}
  const { data, error } = await supabase.from("api_pending_approvals")
    .select("id,api_key_id,operation_type,resource_type,resource_ids,payload,status,requested_at,expires_at,decided_at,decided_by,count,reason")
    .order("requested_at", { ascending: false })
    .limit(100);
  if (error) {
    console.error("list_pending error:", error);
    return err("خطا در دریافت درخواست‌ها", origin, 500);
  }
  // Join api_keys for display
  const keyIds = [...new Set((data||[]).map((d:any)=>d.api_key_id))];
  let keysMap: Record<string, any> = {};
  if (keyIds.length) {
    const { data: keys } = await supabase.from("api_keys").select("id,name,key_prefix").in("id", keyIds);
    keysMap = Object.fromEntries((keys||[]).map((k:any)=>[k.id,k]));
  }
  const enriched = (data||[]).map((d:any)=>({ ...d, api_key: keysMap[d.api_key_id] || null }));
  return ok({ pending: enriched }, origin);
}

async function approvePending(body: any, origin: string, session: any): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) return err("تأیید صریح لازم است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data: pending, error: fetchErr } = await supabase.from("api_pending_approvals").select("*").eq("id", body.id).maybeSingle();
  if (fetchErr) return err("خطا در دسترسی", origin, 500);
  if (!pending) return err("درخواست یافت نشد", origin, 404);
  if (pending.status !== "pending") return err(`این درخواست قبلاً ${pending.status} شده است`, origin, 400);
  if (new Date(pending.expires_at).getTime() < Date.now()) {
    await supabase.from("api_pending_approvals").update({ status: "expired" }).eq("id", body.id);
    return err("این درخواست منقضی شده است", origin, 400);
  }
  const { error: updErr } = await supabase.from("api_pending_approvals").update({
    status: "approved",
    decided_at: new Date().toISOString(),
    decided_by: session.ownerPhone,
  }).eq("id", body.id);
  if (updErr) return err("خطا در تایید", origin, 500);
  return ok({ approved: true, id: body.id }, origin);
}

async function rejectPending(body: any, origin: string, session: any): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  if (body.confirm !== true) return err("تأیید صریح لازم است", origin, 400);
  const supabase = getSupabaseAdmin();
  const { data: pending, error: fetchErr } = await supabase.from("api_pending_approvals").select("id,status,expires_at").eq("id", body.id).maybeSingle();
  if (fetchErr) return err("خطا در دسترسی", origin, 500);
  if (!pending) return err("درخواست یافت نشد", origin, 404);
  if (pending.status !== "pending") return err(`این درخواست قبلاً ${pending.status} شده است`, origin, 400);
  const { error: updErr } = await supabase.from("api_pending_approvals").update({
    status: "rejected",
    decided_at: new Date().toISOString(),
    decided_by: session.ownerPhone,
    reason: typeof body.reason === "string" ? body.reason.slice(0,500) : "رد شده توسط ادمین",
  }).eq("id", body.id);
  if (updErr) return err("خطا در رد", origin, 500);
  return ok({ rejected: true, id: body.id }, origin);
}

async function listApiAuditLogs(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const page = Math.max(1, parseInt(body.page ?? "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(body.limit ?? "50", 10) || 50));
  const offset = (page-1)*limit;
  const { data, error, count } = await supabase.from("api_audit_logs")
    .select("id,api_key_id,action,resource_type,resource_id,details,ip,created_at,success", { count:"exact" })
    .order("created_at", { ascending:false })
    .range(offset, offset+limit-1);
  if (error) {
    console.error("list_audit error:", error);
    return err("خطا در دریافت لاگ‌ها", origin, 500);
  }
  // Join keys
  const keyIds = [...new Set((data||[]).map((d:any)=>d.api_key_id).filter(Boolean))];
  let keysMap: Record<string, any> = {};
  if (keyIds.length) {
    const { data: keys } = await supabase.from("api_keys").select("id,name,key_prefix").in("id", keyIds);
    keysMap = Object.fromEntries((keys||[]).map((k:any)=>[k.id,k]));
  }
  const enriched = (data||[]).map((d:any)=>({ ...d, api_key: keysMap[d.api_key_id] || null }));
  return ok({ logs: enriched, total: count ?? 0, page, limit }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────────────

const MUTATING_ACTIONS=new Set(['update_submission','soft_delete_submission','restore_submission','permanent_delete_submission','delete_storage_files','save_settings','update_question','delete_question','create_review','update_review','delete_review','run_maintenance','create_api_key','revoke_api_key','approve_pending','reject_pending']);
const ACTION_HANDLERS:Record<string,(body:any,origin:string,session:any)=>Promise<Response>>={
  list_submissions: listSubmissions,
  get_submission: getSubmission,
  update_submission: updateSubmission,
  soft_delete_submission: softDeleteSubmission,
  restore_submission: restoreSubmission,
  permanent_delete_submission: permanentDeleteSubmission,
  delete_storage_files: deleteStorageFiles,
  get_signed_urls: getSignedUrls,
  list_settings: listSettings,
  save_settings: saveSettings,
  list_questions: listQuestions,
  update_question: updateQuestion,
  delete_question: deleteQuestion,
  list_reviews: listReviews,
  create_review: createReview,
  update_review: updateReview,
  delete_review: deleteReview,
  list_page_view_stats:listPageViewStats,
  run_maintenance:runMaintenance,
  // API Keys
  create_api_key: createApiKey,
  list_api_keys: listApiKeys,
  revoke_api_key: revokeApiKey,
  list_pending_approvals: listPendingApprovals,
  approve_pending: approvePending,
  reject_pending: rejectPending,
  list_api_audit_logs: listApiAuditLogs,
};

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return err("Method not allowed", origin, 405);
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return err("بدنه درخواست JSON معتبر نیست", origin, 400);
  }

  if (!body || typeof body.action !== "string") {
    return err("action نامعتبر است", origin, 400);
  }

  // Auth: validate admin session
  const sessionToken = extractSessionToken(req, body);
  if (!sessionToken) {
    return err("نشست وارد نشده است.", origin, 401);
  }
  const sessionResult = await validateAdminSession(sessionToken);
  if (!sessionResult.ok) {
    return err("نشست نامعتبر یا منقضی است.", origin, 401);
  }

  // Route to handler
  const handler = ACTION_HANDLERS[body.action];
  if (!handler) {
    return err(`action نامعتبر: ${body.action}`, origin, 400);
  }

  try{
    const response=await handler(body,origin,sessionResult.session);
    if(MUTATING_ACTIONS.has(body.action)){
      try{await getSupabaseAdmin().from('admin_audit_logs').insert({actor_phone:sessionResult.session.ownerPhone,session_id:String(sessionResult.session.sessionId),action:body.action,target_type:String(body.resource_type||body.action),target_id:body.id!=null?String(body.id):null,metadata:{status:response.status,count:Array.isArray(body.ids)?body.ids.length:undefined},success:response.ok})}catch{}
    }
    return response;
  }catch(e){
    console.error(`Unexpected error in action ${body.action}:`,e);
    if(MUTATING_ACTIONS.has(body.action)){try{await getSupabaseAdmin().from('admin_audit_logs').insert({actor_phone:sessionResult.session.ownerPhone,session_id:String(sessionResult.session.sessionId),action:body.action,target_type:String(body.action),target_id:body.id!=null?String(body.id):null,metadata:{unexpected:true},success:false})}catch{}}
    return err("خطای داخلی سرور",origin,500);
  }
});
