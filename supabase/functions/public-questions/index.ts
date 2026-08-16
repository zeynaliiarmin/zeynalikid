// supabase/functions/public-questions/index.ts
// Public Edge Function that returns ANSWERED user questions for the public FAQ page
// ("سوالات و تجربیات" community section), with all personal data removed.
//
// Privacy guarantees:
//   - Only questions with status='answered' are returned.
//   - The `phone` column is NEVER returned.
//   - The "[شماره تماس: ...]" prefix (and any line containing it) is stripped from the
//     question text before it is returned, so no PII leaks to the public.
//   - No admin data, token, or secret is ever returned.
//
// Security:
//   - CORS restricted to zeynalikid.vercel.app + *.vercel.app + localhost:5173
//   - Rate limit: 30 req/min per IP
//   - service_role inside the function only
//
// Deploy: supabase functions deploy public-questions --no-verify-jwt

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import {
  handleOptions, jsonResponse, getOrigin,
} from "../_shared/cors.ts";
import {
  rateLimit, rateLimitKey, cleanupExpiredBuckets,
} from "../_shared/rateLimit.ts";

// Strip "[شماره تماس: ...]" from the beginning of the text and any line that
// contains "شماره تماس" (both Persian and Arabic digits variants are covered by
// the generic character class).
function sanitizeQuestion(text: string): string {
  let out = String(text ?? "");
  // Remove a leading "[شماره تماس: ...]" prefix
  out = out.replace(/^\s*\[[^\]]*شماره\s*تماس[^\]]*\]\s*/i, "");
  // Remove any remaining line that mentions a contact number
  out = out
    .split(/\r?\n/)
    .filter((line) => !/شماره\s*تماس/i.test(line))
    .join("\n");
  return out.trim();
}

serve(async (req) => {
  const optionsResp = handleOptions(req);
  if (optionsResp) return optionsResp;
  const origin = getOrigin(req);

  if (req.method !== "GET" && req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, origin);
  }

  // Rate limit: 30 req/min per IP
  cleanupExpiredBuckets();
  const rl = rateLimit(rateLimitKey(req, "public-questions"), {
    maxRequests: 30,
    windowMs: 60_000,
  });
  if (!rl.ok) {
    return jsonResponse(
      { error: "تعداد درخواست‌ها بیش از حد مجاز است. لطفاً یک دقیقه بعد تلاش کنید." },
      429,
      origin,
    );
  }

  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from("user_questions")
      .select("id, question, answer, question_en, answer_en, status, created_at, answered_at")
      .eq("status", "answered")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) {
      console.error("public-questions error:", error);
      return jsonResponse({ error: "خطا در دریافت سوالات" }, 500, origin);
    }

    const questions = (data || []).map((row: any) => ({
      id: row.id,
      question: sanitizeQuestion(row.question),
      question_en: row.question_en ? sanitizeQuestion(row.question_en) : undefined,
      answer: row.answer || "",
      answer_en: row.answer_en || "",
      status: "answered",
      created_at: row.created_at,
      answered_at: row.answered_at || null,
    }));

    return jsonResponse({ questions }, 200, origin);
  } catch (_e) {
    return jsonResponse({ error: "خطای سرور" }, 500, origin);
  }
});
