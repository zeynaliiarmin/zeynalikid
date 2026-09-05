// supabase/functions/cleanup-receipts/index.ts
// حذف خودکار عکس‌های فیش قدیمی‌تر از ۱ ماه از باکت images/receipts
//
// Security:
//   - فقط ادمین با sessionToken معتبر می‌تواند این Function را صدا بزند
//   - CORS فقط برای zeynalikid.vercel.app و previewهای *.vercel.app
//   - قبل از حذف، تعداد فایل‌های هدف را گزارش می‌دهد (در پاسخ)
//   - هیچ فایل غیرمرتبطی حذف نمی‌شود (فقط receipts/)
//   - service_role داخل Function فقط
//
// زمان‌بندی: Deno.cron هر روز ساعت ۲ بامداد (نیازی به auth ندارد — internal)
// دستی: POST با sessionToken از پنل ادمین
//
// Deploy: supabase functions deploy cleanup-receipts --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin, rejectIfInvalidOrigin,
} from "../_shared/cors.ts";

const digitsOnly = (v: string) =>
  String(v ?? "")
    .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
    .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
    .replace(/\D/g, "");

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate an admin session token by calling the same DB logic as admin-session.
 * Returns { ok, ownerPhone?, sessionId?, deviceId? } or { ok: false }.
 */
async function validateAdminSession(sessionToken: string): Promise<{
  ok: boolean;
  ownerPhone?: string;
  sessionId?: string;
  deviceId?: string;
}> {
  if (!sessionToken) return { ok: false };
  const supabase = getSupabaseAdmin();
  const tokenHash = await sha256(sessionToken);
  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id,device_id,owner_phone,expires_at,is_revoked,revoked_at")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();
  if (error || !data) return { ok: false };
  if (data.is_revoked) return { ok: false };
  if (data.revoked_at) return { ok: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false };
  return {
    ok: true,
    ownerPhone: data.owner_phone,
    sessionId: data.id,
    deviceId: data.device_id,
  };
}

/**
 * Extract session token from either Authorization Bearer header or JSON body.
 */
function extractSessionToken(req: Request, body: any): string {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  if (body && typeof body.sessionToken === "string") {
    return body.sessionToken;
  }
  return "";
}

const cleanupOldReceipts = async (): Promise<{ deleted: number; cleanedRows: number; targetFiles: number }> => {
  const supabase = getSupabaseAdmin();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // ۱) پیدا کردن عکس‌های قدیمی در Storage
  const { data: files, error: listError } = await supabase.storage
    .from("images")
    .list("receipts", { limit: 1000 });
  if (listError || !files) {
    console.error("Error listing files:", listError);
    return { deleted: 0, cleanedRows: 0, targetFiles: 0 };
  }

  const oldFiles = files.filter((file) => {
    const created = new Date(file.created_at ?? 0);
    return created < oneMonthAgo;
  });

  if (oldFiles.length === 0) {
    console.log("No old files to delete.");
    return { deleted: 0, cleanedRows: 0, targetFiles: 0 };
  }

  // ۲) حذف فایل‌های قدیمی
  const paths = oldFiles.map((f) => `receipts/${f.name}`);
  const { error: deleteError } = await supabase.storage.from("images").remove(paths);
  if (deleteError) {
    console.error("Error deleting files:", deleteError);
    return { deleted: 0, cleanedRows: 0, targetFiles: oldFiles.length };
  }
  console.log(`Deleted ${paths.length} old receipt images.`);

  // ۳) به‌روزرسانی دیتابیس: خالی کردن receipt در payload فرم‌هایی که فیش‌شان حذف شد
  let cleanedRows = 0;
  const deletedNames = new Set(oldFiles.map((f) => f.name));
  const { data: rows } = await supabase
    .from("submissions")
    .select("id, payload")
    .not("payload->payment->>receipt", "is", null);
  const now = new Date().toISOString();
  for (const row of rows || []) {
    const payload = (row?.payload && typeof row.payload === "object" ? row.payload : {}) as Record<string, any>;
    const receipt = String(payload?.payment?.receipt || "");
    if (!receipt) continue;
    const name = receipt.split("/receipts/")[1];
    if (!name || !deletedNames.has(decodeURIComponent(name))) continue;
    const newPayload = {
      ...payload,
      payment: { ...(payload.payment || {}), receipt: "", receipt_image: "", receiptDeletedAt: now },
    };
    const { error } = await supabase.from("submissions").update({ payload: newPayload }).eq("id", row.id);
    if (!error) cleanedRows++;
  }
  console.log(`Cleaned ${cleanedRows} database rows.`);
  return { deleted: paths.length, cleanedRows, targetFiles: oldFiles.length };
};

// اجرای زمان‌بندی‌شده: هر روز ساعت ۲ بامداد (internal — no auth needed)
try {
  // @ts-ignore - Deno.cron در محیط Edge Functions موجود است
  Deno.cron("Clean up old receipts", "0 2 * * *", async () => {
    await cleanupOldReceipts();
  });
} catch (e) {
  console.warn("Deno.cron unavailable (local dev?):", e);
}

// اجرای دستی از پنل مدیریت (POST با sessionToken)
serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  try {
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }

    // احراز هویت ادمین
    const sessionToken = extractSessionToken(req, body);
    if (!sessionToken) {
      return jsonResponse({ error: "نشست وارد نشده است." }, 401, origin);
    }
    const session = await validateAdminSession(sessionToken);
    if (!session.ok) {
      return jsonResponse({ error: "نشست نامعتبر یا منقضی است." }, 401, origin);
    }

    // Optionally support dry-run mode: only report count, don't delete
    const dryRun = body.dryRun === true;

    if (dryRun) {
      const supabase = getSupabaseAdmin();
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      const { data: files } = await supabase.storage
        .from("images")
        .list("receipts", { limit: 1000 });
      const oldFiles = (files || []).filter((f) => new Date(f.created_at ?? 0) < oneMonthAgo);
      return jsonResponse({
        ok: true,
        dryRun: true,
        targetFiles: oldFiles.length,
        oldestFile: oldFiles[0]?.created_at ?? null,
      }, 200, origin);
    }

    const result = await cleanupOldReceipts();
    return jsonResponse({
      ok: true,
      ...result,
      performedBy: session.ownerPhone,
    }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطا در پاک‌سازی فیش‌ها." }, 500, origin);
  }
});
