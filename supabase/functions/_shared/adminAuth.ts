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

  if (error || !data) return { ok: false };
  if (data.is_revoked) return { ok: false };
  if (data.revoked_at) return { ok: false };
  if (new Date(data.expires_at).getTime() < Date.now()) return { ok: false };

  const session: AdminSession = {
    sessionId: data.id,
    deviceId: data.device_id,
    ownerPhone: data.owner_phone,
    expiresAt: data.expires_at,
  };

  // Best-effort: update last_seen_at on session + device
  const now = new Date().toISOString();
  try {
    await Promise.all([
      supabase.from("admin_sessions").update({ last_seen_at: now }).eq("id", session.sessionId),
      supabase.from("admin_devices").update({ last_seen_at: now }).eq("id", session.deviceId),
    ]);
  } catch (e) {
    console.warn("Could not update last_seen_at:", e);
  }

  return { ok: true, session };
}

/**
 * Extract session token from the Authorization Bearer header only.
 * The former body.sessionToken fallback is intentionally removed: sending
 * tokens in JSON bodies risks leaking them to request logs and analytics.
 * Canonical form: Authorization: Bearer <token>
 */
export function extractSessionToken(req: Request, _body: any): string {
  const auth = req.headers.get("Authorization") ?? "";
  if (auth.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim();
  }
  return "";
}
