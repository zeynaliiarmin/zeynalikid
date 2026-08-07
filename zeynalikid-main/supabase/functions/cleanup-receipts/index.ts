// supabase/functions/cleanup-receipts/index.ts
// حذف خودکار عکس‌های فیش قدیمی‌تر از ۱ ماه از باکت images/receipts
// - زمان‌بندی: Deno.cron هر روز ساعت ۲ بامداد
// - همچنین با فراخوانی HTTP (POST) از دکمه دستی پنل مدیریت قابل اجراست.
// دیپلوی:  supabase functions deploy cleanup-receipts --no-verify-jwt
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, apikey, x-client-info",
};

const getClient = () => {
  const supabaseUrl =
    Deno.env.get("SUPABASE_URL") ?? Deno.env.get("VITE_SUPABASE_URL")!;
  const supabaseKey =
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("VITE_SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("VITE_SUPABASE_ANON_KEY")!;
  return createClient(supabaseUrl, supabaseKey);
};

const cleanupOldReceipts = async (): Promise<{ deleted: number; cleanedRows: number }> => {
  const supabase = getClient();
  const oneMonthAgo = new Date();
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);

  // ۱) پیدا کردن عکس‌های قدیمی در Storage
  const { data: files, error: listError } = await supabase.storage
    .from("images")
    .list("receipts", { limit: 1000 });
  if (listError || !files) {
    console.error("Error listing files:", listError);
    return { deleted: 0, cleanedRows: 0 };
  }

  const oldFiles = files.filter((file) => {
    const created = new Date(file.created_at ?? 0);
    return created < oneMonthAgo;
  });
  if (oldFiles.length === 0) {
    console.log("No old files to delete.");
    return { deleted: 0, cleanedRows: 0 };
  }

  // ۲) حذف فایل‌های قدیمی
  const paths = oldFiles.map((f) => `receipts/${f.name}`);
  const { error: deleteError } = await supabase.storage.from("images").remove(paths);
  if (deleteError) {
    console.error("Error deleting files:", deleteError);
    return { deleted: 0, cleanedRows: 0 };
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
  return { deleted: paths.length, cleanedRows };
};

// اجرای زمان‌بندی‌شده: هر روز ساعت ۲ بامداد
try {
  // @ts-ignore - Deno.cron در محیط Edge Functions موجود است
  Deno.cron("Clean up old receipts", "0 2 * * *", async () => {
    await cleanupOldReceipts();
  });
} catch (e) {
  console.warn("Deno.cron unavailable (local dev?):", e);
}

// اجرای دستی از پنل مدیریت (POST)
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const result = await cleanupOldReceipts();
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (_e) {
    return new Response(JSON.stringify({ error: "خطا در پاک‌سازی فیش‌ها." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
