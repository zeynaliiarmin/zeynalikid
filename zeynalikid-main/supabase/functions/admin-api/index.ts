// supabase/functions/admin-api/index.ts
// Centralized admin API for the Zeynalikid admin panel.
//
// All admin CRUD operations go through this function. Each request must:
//   1. Provide a sessionToken (Authorization Bearer or body.sessionToken)
//   2. Be validated against admin_sessions (hash + expiry + revoked check)
//   3. Update last_seen_at on session + device
//   4. Then perform the requested action with service_role (server-side only)
//
// Service Role Key NEVER leaves this function. No token_hash, credential,
// or sensitive data is ever returned in the response.
//
// Deploy: supabase functions deploy admin-api --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, getOrigin,
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
    .select("id, full_phone, payload, created_at, updated_at, deleted_at", { count: "exact" });

  if (type === "consultation" || type === "course") {
    query = query.eq("payload->>type", type);
  }

  if (typeof body.status === "string" && body.status) {
    query = query.or(
      `payload->>orderStatus.eq.${body.status},payload->>consultationStatus.eq.${body.status}`,
    );
  }

  if (search) {
    query = query.or(
      `payload->>trackingCode.ilike.%${search}%,full_phone.ilike.%${search}%`,
    );
  }

  if (body.includeDeleted !== true) {
    query = query.is("deleted_at", null);
  }

  query = query.order(sortBy, { ascending: sortOrder === "asc" })
    .range(offset, offset + limit - 1);

  const { data, error, count } = await query;

  if (error) {
    console.error("list_submissions error:", error);
    return err("خطا در دریافت فرم‌ها", origin, 500);
  }

  const masked = (data || []).map((row: any) => {
    const phone = String(row.full_phone ?? "");
    const last4 = phone.slice(-4);
    return {
      ...row,
      full_phone: phone ? `****${last4}` : "",
    };
  });

  return ok({
    submissions: masked,
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
    .select("*")
    .eq("id", body.id)
    .limit(1)
    .maybeSingle();
  if (error) {
    console.error("get_submission error:", error);
    return err("خطا در دریافت فرم", origin, 500);
  }
  if (!data) return err("فرم یافت نشد", origin, 404);
  const phone = String(data.full_phone ?? "");
  return ok({
    submission: { ...data, full_phone: phone ? `****${phone.slice(-4)}` : "" },
  }, origin);
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
    .select("*", { count: "exact" });

  if (status) query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("list_questions error:", error);
    return err("خطا در دریافت سؤالات", origin, 500);
  }

  const masked = (data || []).map((q: any) => {
    const phone = String(q.phone ?? "");
    return { ...q, phone: phone ? `****${phone.slice(-4)}` : "" };
  });

  return ok({ questions: masked, total: count ?? 0, page, limit }, origin);
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
    .select("*", { count: "exact" });

  if (status) query = query.eq("status", status);

  query = query.order("created_at", { ascending: false }).range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error("list_reviews error:", error);
    return err("خطا در دریافت نظرات", origin, 500);
  }
  return ok({ reviews: data ?? [], total: count ?? 0, page, limit }, origin);
}

async function updateReview(body: any, origin: string): Promise<Response> {
  if (!body.id) return err("id الزامی است", origin, 400);
  const allowed: Record<string, any> = {};
  if (["approved", "rejected", "pending"].includes(body.status)) allowed.status = body.status;
  if (Array.isArray(body.placements)) allowed.placements = body.placements;
  if (typeof body.reviewer_name === "string") allowed.reviewer_name = body.reviewer_name.slice(0, 100);
  if (typeof body.comment === "string") allowed.comment = body.comment.slice(0, 2000);
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

async function listPageViewStats(body: any, origin: string): Promise<Response> {
  const supabase = getSupabaseAdmin();
  const days = Math.min(90, Math.max(1, parseInt(body.days ?? "30", 10) || 30));
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("page_views")
    .select("page_path, created_at")
    .gte("created_at", since)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("list_page_view_stats error:", error);
    return err("خطا در دریافت آمار بازدید", origin, 500);
  }

  const byPage: Record<string, number> = {};
  const byDay: Record<string, number> = {};
  let totalViews = 0;
  for (const row of data ?? []) {
    const path = row.page_path || "/";
    byPage[path] = (byPage[path] ?? 0) + 1;
    const day = (row.created_at as string).slice(0, 10);
    byDay[day] = (byDay[day] ?? 0) + 1;
    totalViews++;
  }

  const topPages = Object.entries(byPage)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 50)
    .map(([path, count]) => ({ page_path: path, views: count }));

  const dailyCounts = Object.entries(byDay)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([day, count]) => ({ date: day, views: count }));

  return ok({
    totalViews,
    days,
    topPages,
    dailyCounts,
  }, origin);
}

// ──────────────────────────────────────────────────────────────────────────
// Router
// ──────────────────────────────────────────────────────────────────────────

const ACTION_HANDLERS: Record<string, (body: any, origin: string, session: any) => Promise<Response>> = {
  list_submissions: listSubmissions,
  get_submission: getSubmission,
  update_submission: updateSubmission,
  soft_delete_submission: softDeleteSubmission,
  restore_submission: restoreSubmission,
  permanent_delete_submission: permanentDeleteSubmission,
  list_settings: listSettings,
  save_settings: saveSettings,
  list_questions: listQuestions,
  update_question: updateQuestion,
  delete_question: deleteQuestion,
  list_reviews: listReviews,
  update_review: updateReview,
  delete_review: deleteReview,
  list_page_view_stats: listPageViewStats,
};

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

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

  try {
    return await handler(body, origin, sessionResult.session);
  } catch (e) {
    console.error(`Unexpected error in action ${body.action}:`, e);
    return err("خطای داخلی سرور", origin, 500);
  }
});
