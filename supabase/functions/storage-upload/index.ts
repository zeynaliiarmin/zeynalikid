// Controlled signed-upload issuer for both public form files and admin media.
// Public callers never receive service_role and can upload only a server-generated
// path with a short-lived token. Admin buckets additionally require a valid session.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { validateAdminSession, extractSessionToken } from "../_shared/adminAuth.ts";
import { handleOptions, jsonResponse, getOrigin, rejectIfInvalidOrigin } from "../_shared/cors.ts";
import { centralRateLimit } from "../_shared/rateLimit.ts";

type Rule = {
  bucket: string;
  folder: string;
  maxBytes: number;
  mimeTypes: string[];
};

const PUBLIC_RULES: Record<string, Rule> = {
  voice: {
    bucket: "voice-notes",
    folder: "voice-notes",
    maxBytes: 5 * 1024 * 1024,
    mimeTypes: ["audio/webm", "audio/ogg", "audio/mp4", "audio/mpeg", "audio/wav", "video/webm"],
  },
  tongue: {
    bucket: "tongue-photos",
    folder: "tongue",
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
  receipt: {
    bucket: "receipts",
    folder: "receipts",
    maxBytes: 6 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp"],
  },
};

const ADMIN_RULES: Record<string, Omit<Rule, "bucket" | "folder">> = {
  images: {
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  media: {
    maxBytes: 8 * 1024 * 1024,
    mimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
  },
  files: {
    maxBytes: 15 * 1024 * 1024,
    mimeTypes: ["application/pdf"],
  },
};

const extensionFor = (mime: string): string => ({
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "application/pdf": "pdf",
  "audio/webm": "webm",
  "video/webm": "webm",
  "audio/ogg": "ogg",
  "audio/mp4": "m4a",
  "audio/mpeg": "mp3",
  "audio/wav": "wav",
}[mime] || "bin");

const randomId = (): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(18));
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
};

const cleanAdminFolder = (value: unknown): string => {
  const raw = String(value || "uploads")
    .replace(/\\/g, "/")
    .replace(/^\/+|\/+$/g, "")
    .replace(/\.{2,}/g, "")
    .replace(/[^a-zA-Z0-9/_-]/g, "-")
    .slice(0, 160);
  return raw || "uploads";
};

serve(async (req) => {
  const options = handleOptions(req);
  if (options) return options;
  const origin = getOrigin(req);
  const _originCheck = rejectIfInvalidOrigin(req, { allowNoOrigin: true }); if (_originCheck) return _originCheck;
  if (req.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405, origin);

  let body: any = {};
  try { body = await req.json(); } catch { return jsonResponse({ error: "درخواست نامعتبر است" }, 400, origin); }

  const mode = body.mode === "admin" ? "admin" : "public";
  const contentType = String(body.contentType || "").toLowerCase().split(";")[0].trim();
  const size = Number(body.size || 0);
  let rule: Rule | null = null;
  let session: Awaited<ReturnType<typeof validateAdminSession>> | null = null;

  if (mode === "admin") {
    const bucket = String(body.bucket || "");
    const adminRule = ADMIN_RULES[bucket];
    if (!adminRule) return jsonResponse({ error: "باکت مجاز نیست" }, 400, origin);
    session = await validateAdminSession(extractSessionToken(req, body));
    if (!session.ok) return jsonResponse({ error: "نشست مدیریت نامعتبر یا منقضی است" }, 401, origin);
    rule = { bucket, folder: cleanAdminFolder(body.folder), ...adminRule };
  } else {
    rule = PUBLIC_RULES[String(body.kind || "")] || null;
    if (!rule) return jsonResponse({ error: "نوع فایل مجاز نیست" }, 400, origin);
    const rl = await centralRateLimit(req, `public-upload:${String(body.kind || "")}`, {
      maxRequests: 20,
      windowMs: 60 * 60_000,
      blockMs: 60 * 60_000,
    });
    if (!rl.ok) return jsonResponse({ error: "تعداد آپلودها بیش از حد مجاز است. لطفاً بعداً تلاش کنید." }, 429, origin);
  }

  if (!Number.isFinite(size) || size < 1 || size > rule.maxBytes) {
    return jsonResponse({ error: "حجم فایل بیشتر از حد مجاز است" }, 413, origin);
  }
  if (!rule.mimeTypes.includes(contentType)) {
    return jsonResponse({ error: "فرمت فایل مجاز نیست" }, 415, origin);
  }

  const path = `${rule.folder}/${Date.now()}-${randomId()}.${extensionFor(contentType)}`;
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.storage.from(rule.bucket).createSignedUploadUrl(path, { upsert: false });
  if (error || !data?.token) {
    console.error("storage-upload signed URL error:", error?.message || "missing token");
    return jsonResponse({ error: "آماده‌سازی آپلود انجام نشد" }, 500, origin);
  }

  const { data: publicData } = supabase.storage.from(rule.bucket).getPublicUrl(path);

  if (mode === "admin" && session?.ok) {
    try {
      await supabase.from("admin_audit_logs").insert({
        actor_phone: session.session.ownerPhone,
        session_id: session.session.sessionId,
        action: "storage_upload_authorized",
        target_type: rule.bucket,
        target_id: path,
        metadata: { contentType, size },
        success: true,
      });
    } catch { /* auditing must not block uploads */ }
  }

  return jsonResponse({
    ok: true,
    bucket: rule.bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    canonicalUrl: publicData.publicUrl,
    maxBytes: rule.maxBytes,
  }, 200, origin);
});
