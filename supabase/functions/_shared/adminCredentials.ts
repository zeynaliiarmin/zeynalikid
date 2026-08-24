import { getSupabaseAdmin } from "./supabaseClient.ts";

const ITERATIONS = 210_000;

const digitsOnly = (value: string): string => String(value || "")
  .replace(/[۰-۹]/g, (d) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(d)))
  .replace(/[٠-٩]/g, (d) => String("٠١٢٣٤٥٦٧٨٩".indexOf(d)))
  .replace(/\D/g, "");

export function normalizeIranianMobile(raw: string): string | null {
  let digits = digitsOnly(String(raw || "").replace(/[\s\-().]/g, ""));
  if (digits.startsWith("0098")) digits = "0" + digits.slice(4);
  else if (digits.startsWith("98") && digits.length === 12) digits = "0" + digits.slice(2);
  return /^09\d{9}$/.test(digits) ? digits : null;
}

const toBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
};

const fromBase64 = (value: string): Uint8Array => {
  const binary = atob(value);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

async function derive(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await crypto.subtle.deriveBits({ name: "PBKDF2", hash: "SHA-256", salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

function constantTimeEqual(left: Uint8Array, right: Uint8Array): boolean {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index++) diff |= left[index] ^ right[index];
  return diff === 0;
}

export async function makePasswordHash(password: string): Promise<{ hash: string; salt: string; iterations: number }> {
  const salt = crypto.getRandomValues(new Uint8Array(24));
  const hash = await derive(password, salt, ITERATIONS);
  return { hash: toBase64(hash), salt: toBase64(salt), iterations: ITERATIONS };
}

type CredentialRow = {
  owner_phone: string;
  password_hash: string;
  password_salt: string;
  password_iterations: number;
  must_change_password: boolean;
};

async function getCredential(phone: string): Promise<CredentialRow | null> {
  const { data, error } = await getSupabaseAdmin().from("admin_credentials")
    .select("owner_phone,password_hash,password_salt,password_iterations,must_change_password")
    .eq("owner_phone", phone).limit(1).maybeSingle();
  if (error) throw error;
  return data as CredentialRow | null;
}

async function verifyRow(row: CredentialRow, password: string): Promise<boolean> {
  try {
    const actual = await derive(password, fromBase64(row.password_salt), row.password_iterations);
    return constantTimeEqual(actual, fromBase64(row.password_hash));
  } catch {
    return false;
  }
}

/**
 * Verifies the database hash. On the first successful login only, migrates the
 * legacy Edge secret into a PBKDF2 hash so current credentials keep working.
 */
export async function verifyAdminCredentials(phoneRaw: string, password: string): Promise<{ ok: boolean; phone: string; mustChangePassword: boolean }> {
  const phone = normalizeIranianMobile(phoneRaw) || "";
  if (!phone || !password) return { ok: false, phone, mustChangePassword: false };
  const existing = await getCredential(phone);
  if (existing) return { ok: await verifyRow(existing, password), phone, mustChangePassword: existing.must_change_password };

  const legacyPhone = normalizeIranianMobile(Deno.env.get("ADMIN_PHONE") || "") || "";
  const legacyPassword = Deno.env.get("ADMIN_PASSWORD") || "";
  if (!legacyPhone || legacyPhone !== phone || !legacyPassword || legacyPassword !== password) {
    // Run one expensive derivation to reduce observable timing differences.
    await derive(password || "invalid", crypto.getRandomValues(new Uint8Array(24)), ITERATIONS);
    return { ok: false, phone, mustChangePassword: false };
  }

  const generated = await makePasswordHash(password);
  const mustChange = password.length < 12;
  const { error } = await getSupabaseAdmin().from("admin_credentials").upsert({
    owner_phone: phone,
    password_hash: generated.hash,
    password_salt: generated.salt,
    password_iterations: generated.iterations,
    must_change_password: mustChange,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_phone" });
  if (error) throw error;
  return { ok: true, phone, mustChangePassword: mustChange };
}

export async function changeAdminCredentials(
  currentPhone: string,
  currentPassword: string,
  newPhoneRaw: string,
  newPassword: string,
): Promise<{ ok: boolean; phone: string; error?: string }> {
  const verified = await verifyAdminCredentials(currentPhone, currentPassword);
  if (!verified.ok) return { ok: false, phone: verified.phone, error: "invalid_current_password" };

  const nextPhone = newPhoneRaw ? (normalizeIranianMobile(newPhoneRaw) || "") : verified.phone;
  if (!nextPhone) return { ok: false, phone: verified.phone, error: "invalid_phone" };
  if (newPassword && newPassword.length < 12) return { ok: false, phone: verified.phone, error: "weak_password" };

  const current = await getCredential(verified.phone);
  if (!current) return { ok: false, phone: verified.phone, error: "credential_missing" };
  const generated = newPassword ? await makePasswordHash(newPassword) : {
    hash: current.password_hash,
    salt: current.password_salt,
    iterations: current.password_iterations,
  };

  const supabase = getSupabaseAdmin();
  const { error } = await supabase.from("admin_credentials").upsert({
    owner_phone: nextPhone,
    password_hash: generated.hash,
    password_salt: generated.salt,
    password_iterations: generated.iterations,
    must_change_password: false,
    updated_at: new Date().toISOString(),
  }, { onConflict: "owner_phone" });
  if (error) throw error;
  if (nextPhone !== verified.phone) await supabase.from("admin_credentials").delete().eq("owner_phone", verified.phone);
  return { ok: true, phone: nextPhone };
}
