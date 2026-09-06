// supabase/functions/_shared/adminAuth.ts
// Shared admin session validation logic.
// Used by: admin-api, cleanup-receipts (and could be backported to admin-session).
//
// Validates a session token by:
//   1. SHA-256 hashing the input token
//   2. Looking up the hash in admin_sessions
//   3. Checking is_revoked = false, revoked_at IS NULL, expires_at > now
//   4. Updating last_seen_at on both admin_sessions and admin_devices (best-effort)

import { getSupabaseAdmin } from "./supabaseClient.ts";

export interface AdminSession {
  sessionId: string;
  deviceId: string;
  ownerPhone: string;
  expiresAt: string;
}

export async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Validate an admin session token.
 * Returns { ok: true, session } on success, { ok: false } on failure.
 *
 * On success, also updates last_seen_at on the session and device rows
 * (best-effort — failures here are logged but do not invalidate the session).
 */
export async function validateAdminSession(
  sessionToken: string,
): Promise<{ ok: true; session: AdminSession } | { ok: false }> {
  if (!sessionToken || sessionToken.length < 16) return { ok: false };

  const supabase = getSupabaseAdmin();
  const tokenHash = await sha256(sessionToken);

  const { data, error } = await supabase
    .from("admin_sessions")
    .select("id,device_id,owner_phone,expires_at,is_revoked,revoked_at")
    .eq("token_hash", tokenHash)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.warn("validateAdminSession: lookup error or no data", error?.message || error);
    return { ok: false };
  }
  if (data.is_revoked) { console.warn("validateAdminSession: revoked"); return { ok: false }; }
  if (data.revoked_at) { console.warn("validateAdminSession: revoked_at set"); return { ok: false }; }
  if (new Date(data.expires_at).getTime() < Date.now()) {
    console.warn("validateAdminSession: expired", data.expires_at);
    return { ok: false };
  }

  const session: AdminSession = {
    sessionId: data.id,
    deviceId: data.device_id,
    ownerPhone: data.owner_phone,
    expiresAt: data.expires_at,
  };

  // Best-effort: update last_seen_at on session + device.
  // admin_devices might not exist on older deployments — every branch is wrapped individually so
  // a missing/wrong table or RLS error cannot invalidate the session.
  const now = new Date().toISOString();
  try {
    const p1 = supabase.from("admin_sessions").update({ last_seen_at: now }).eq("id", session.sessionId);
    p1.then(r => { if (r.error) console.warn("admin_sessions last_seen update:", r.error.message); }).catch(()=>{});
  } catch (e) {
    console.warn("Could not schedule admin_sessions last_seen update:", e);
  }
  try {
    if (session.deviceId) {
      const p2 = supabase.from("admin_devices").update({ last_seen_at: now }).eq("id", session.deviceId);
      p2.then(r => { if (r.error) console.warn("admin_devices last_seen update:", r.error.message); }).catch(()=>{});
    }
  } catch (e) {
    console.warn("Could not schedule admin_devices last_seen update:", e);
  }

  return { ok: true, session };
}

/**
 * Extract session token. Primary path is the Authorization: Bearer header
 * (canonical, avoids logging bodies). If the header is missing we fall back
 * to body.sessionToken so legacy/cached clients that still send the token
/**
 * Extract the admin session token. Priority:
 *   1. `sessionToken` in the body (JS clients send this explicitly so we can
 *      bypass the auto-injected Supabase ANON/SERVICE key in the Authorization header).
 *   2. `Authorization: Bearer <token>` — but ONLY if it does NOT look like a
 *      Supabase anon/service_role JWT (which supabase-js auto-injects; those are
 *      NOT admin session tokens).
 *
 * Supabase JWTs always start with "eyJ" and are typically 200+ chars. Admin
 * session tokens are 64-char hex (SHA-256) or random tokens from randomToken().
 */
export function extractSessionToken(req: Request, body: any): string {
  // 1) Body takes priority (used by all admin UI helpers — see sourceFinder.ts, plansApi.ts, etc.)
  const bodyTok = String(body?.sessionToken ?? "").trim();
  if (bodyTok.length >= 16) return bodyTok;

  // 2) Authorization header — only treat as admin session if it does NOT look like a JWT.
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    const t = auth.slice(7).trim();
    if (t && !/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(t)) {
      return t;
    }
  }
  return "";
}
