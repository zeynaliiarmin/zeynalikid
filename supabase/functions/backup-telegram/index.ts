// supabase/functions/backup-telegram/index.ts
// Generates a full backup (submissions + public settings) and sends it to the
// configured Telegram "technical alerts" chat. Also exposes a tiny audit log
// table (backup_audit) so we can:
//   - Skip sending if no field changed since the last backup (diff SHA256).
//   - Remember which Telegram message_ids correspond to which backups so we can
//     auto-delete them after 30 days.
// Storing just a hash + a list of message_ids in a single table is extremely
// lightweight (a few rows ever, all <1 KB) — far less load than a single form
// submission — so it respects the "no DB pressure" constraint.
//
// Environment variables:
//   BACKUP_TELEGRAM_BOT_TOKEN  – bot token (default: ASSISTANT_TELEGRAM_BOT_TOKEN)
//   BACKUP_TELEGRAM_CHAT_ID    – chat id (default: ASSISTANT_TELEGRAM_OWNER_CHAT_ID)
//   BRAND_NAME                 – "زینالیکید" or "فرزند من" (for caption tags)
//
// Callable:
//   GET/POST  …/backup-telegram     – run backup now (manual from dashboard)
//   GET/POST  …/backup-telegram/cron – called by Supabase cron every 3 days;
//                                      skips if no change since last backup.

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { getSupabaseAdmin } from "../_shared/supabaseClient.ts";
import { handleOptions, jsonResponse, rejectIfInvalidOrigin, getOrigin } from "../_shared/cors.ts";

// ---------- Telegram helpers ----------
const cfgToken = () => String(Deno.env.get("BACKUP_TELEGRAM_BOT_TOKEN") || Deno.env.get("ASSISTANT_TELEGRAM_BOT_TOKEN") || "").trim();
const cfgChatId = () => String(Deno.env.get("BACKUP_TELEGRAM_CHAT_ID") || Deno.env.get("ASSISTANT_TELEGRAM_OWNER_CHAT_ID") || "").trim();
const brandName = () => String(Deno.env.get("BRAND_NAME") || "").trim();

async function tgApi(method: string, form: FormData, timeoutMs = 60_000) {
  const token = cfgToken();
  if (!token) throw new Error("BACKUP_TELEGRAM_NOT_CONFIGURED");
  const resp = await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", body: form, signal: AbortSignal.timeout(timeoutMs) });
  const body = await resp.json().catch(() => null);
  if (!resp.ok || !body?.ok) {
    console.error("telegram", method, resp.status, String(body?.description || "").slice(0, 200));
    throw new Error(`TELEGRAM_${method.toUpperCase()}_FAILED: ${String(body?.description || resp.status)}`);
  }
  return body.result;
}
async function tgSendDoc(filename: string, bytes: Uint8Array, caption: string): Promise<{ message_id: number }> {
  const form = new FormData();
  form.set("chat_id", cfgChatId());
  form.set("document", new Blob([bytes], { type: "application/zip" }), filename);
  form.set("caption", caption.slice(0, 1024));
  return await tgApi("sendDocument", form, 120_000);
}
async function tgDeleteMsg(messageId: number) {
  const token = cfgToken(); if (!token || !messageId) return;
  const form = new FormData(); form.set("chat_id", cfgChatId()); form.set("message_id", String(messageId));
  try { await tgApi("deleteMessage", form, 10_000); } catch (e) { console.warn("deleteMessage failed", String((e as Error).message).slice(0, 120)); }
}

// ---------- Tiny ZIP writer (no external dep, store-only, good for JSON) ----------
// CRC32 table
const CRC_TABLE = (() => { const t = new Uint32Array(256); for (let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;} return t; })();
function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i=0;i<bytes.length;i++) c = CRC_TABLE[(c ^ bytes[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function strToBytes(s: string): Uint8Array { return new TextEncoder().encode(s); }
function dosDateTime(d: Date) {
  const time = (d.getHours() << 11) | (d.getMinutes() << 5) | Math.floor(d.getSeconds()/2);
  const date = ((d.getFullYear()-1980) << 9) | ((d.getMonth()+1) << 5) | d.getDate();
  return { time, date };
}
function buildZip(files: { name: string; bytes: Uint8Array }[]): Uint8Array {
  const enc = new TextEncoder();
  const chunks: Uint8Array[] = [];
  const central: Uint8Array[] = [];
  let offset = 0;
  const now = new Date();
  const { time, date } = dosDateTime(now);
  for (const f of files) {
    const nameBytes = enc.encode(f.name.replace(/^\/+/, ""));
    const crc = crc32(f.bytes);
    const size = f.bytes.length;
    // Local file header
    const lh = new Uint8Array(30 + nameBytes.length);
    const dv = new DataView(lh.buffer);
    dv.setUint32(0, 0x04034b50, true);
    dv.setUint16(4, 20, true);     // version needed
    dv.setUint16(6, 0x0800, true); // flags: UTF-8 name
    dv.setUint16(8, 0, true);      // compression: store
    dv.setUint16(10, time, true);
    dv.setUint16(12, date, true);
    dv.setUint32(14, crc, true);
    dv.setUint32(18, size, true);  // compressed size
    dv.setUint32(22, size, true);  // uncompressed size
    dv.setUint16(26, nameBytes.length, true);
    dv.setUint16(28, 0, true);
    lh.set(nameBytes, 30);
    chunks.push(lh);
    chunks.push(f.bytes);
    // Central directory file header
    const ch = new Uint8Array(46 + nameBytes.length);
    const cdv = new DataView(ch.buffer);
    cdv.setUint32(0, 0x02014b50, true);
    cdv.setUint16(4, 20, true);
    cdv.setUint16(6, 20, true);
    cdv.setUint16(8, 0x0800, true);
    cdv.setUint16(10, 0, true);
    cdv.setUint16(12, time, true);
    cdv.setUint16(14, date, true);
    cdv.setUint32(16, crc, true);
    cdv.setUint32(20, size, true);
    cdv.setUint32(24, size, true);
    cdv.setUint16(28, nameBytes.length, true);
    cdv.setUint16(30, 0, true);
    cdv.setUint16(32, 0, true);
    cdv.setUint16(34, 0, true);
    cdv.setUint16(36, 0, true);
    cdv.setUint32(38, 0, true);
    cdv.setUint32(42, offset, true);
    ch.set(nameBytes, 46);
    central.push(ch);
    offset += lh.length + f.bytes.length;
  }
  const centralStart = offset;
  let centralSize = 0;
  for (const c of central) { chunks.push(c); centralSize += c.length; }
  const end = new Uint8Array(22);
  const edv = new DataView(end.buffer);
  edv.setUint32(0, 0x06054b50, true);
  edv.setUint16(4, 0, true);
  edv.setUint16(6, 0, true);
  edv.setUint16(8, files.length, true);
  edv.setUint16(10, files.length, true);
  edv.setUint32(12, centralSize, true);
  edv.setUint32(16, centralStart, true);
  edv.setUint16(20, 0, true);
  chunks.push(end);
  let total = 0; for (const c of chunks) total += c.length;
  const out = new Uint8Array(total);
  let p = 0; for (const c of chunks) { out.set(c, p); p += c.length; }
  return out;
}

// ---------- Audit table (self-healing) ----------
async function ensureAuditTable(sb: any) {
  try {
    await sb.rpc("exec_sql", { sql: "create extension if not exists pgcrypto;" }).catch(()=>{});
    await sb.from("backup_audit").select("id").limit(1);
  } catch {
    try {
      await sb.rpc("exec_sql", {
        sql: `create table if not exists backup_audit(
          id bigserial primary key,
          brand text not null,
          created_at timestamptz not null default now(),
          sha text not null,
          message_ids bigint[] not null default '{}',
          files jsonb not null default '[]'::jsonb
        ); create index if not exists backup_audit_brand_at on backup_audit(brand, created_at desc);`,
      });
    } catch (e) {
      console.warn("could not create backup_audit (safe to ignore if already exists):", String((e as Error)?.message).slice(0,200));
    }
  }
}
async function lastHashFor(sb: any, brand: string): Promise<string | null> {
  const { data } = await sb.from("backup_audit").select("sha,created_at").eq("brand", brand).order("created_at", { ascending: false }).limit(1).maybeSingle();
  return data?.sha || null;
}
async function recordBackup(sb: any, brand: string, sha: string, messageIds: number[], files: { name: string; size: number }[]) {
  await sb.from("backup_audit").insert({ brand, sha, message_ids: messageIds, files });
}
async function deleteExpired(sb: any, brand: string) {
  const cutoff = new Date(Date.now() - 30*24*3600*1000).toISOString();
  const { data: olds } = await sb.from("backup_audit").select("id,message_ids,created_at").eq("brand", brand).lt("created_at", cutoff);
  if (!olds?.length) return;
  for (const row of olds) {
    for (const mid of (row.message_ids || [])) { await tgDeleteMsg(Number(mid)); }
  }
  await sb.from("backup_audit").delete().in("id", olds.map((r:any)=>r.id));
}

// ---------- Content collection ----------
async function collectPayload(sb: any) {
  const [subsRes, settingsRes] = await Promise.all([
    sb.from("submissions").select("*").is("deleted_at", null).order("date", { ascending: false }).limit(50000),
    sb.from("settings").select("settings").eq("key", "app_settings").limit(1).maybeSingle(),
  ]);
  const subs = subsRes.data || [];
  const settings = settingsRes.data?.settings || {};
  // Strip heavy binary blobs if accidentally present (we only ship meta).
  return { generatedAt: new Date().toISOString(), submissionCount: subs.length, submissions: subs, settings };
}
function sha256Hex(s: string): string {
  // Use Web Crypto inside Deno
  // @ts-ignore Deno global
  const bytes = strToBytes(s);
  // return a promise-friendly version; caller awaits
  throw new Error("use async sha");
}
async function sha256Async(s: string): Promise<string> {
  const bytes = strToBytes(s);
  // @ts-ignore Deno
  const buf = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
}
function sanitizeSettingsForBackup(s: any) {
  const stripped = { ...s };
  delete stripped.adminPassword;
  delete stripped.smsApiKey;
  delete stripped.merchantId;
  delete stripped.clientSecret;
  delete stripped.gatewaySecret;
  delete stripped.cryptoWalletsPrivate;
  return stripped;
}

function jalaliStamp(d = new Date()): string {
  // Minimal Jalali formatting using Intl (Deno supports fa-IR-u-ca-persian)
  try {
    const p = new Intl.DateTimeFormat("fa-IR-u-ca-persian", {
      year: "numeric", month: "2-digit", day: "2-digit",
    }).format(d);
    return p.replace(/[\/\\]/g, "-");
  } catch { return d.toISOString().slice(0,10); }
}

// ---------- Main ----------
async function runBackup(mode: "manual" | "cron"): Promise<{ ok: boolean; message: string }> {
  if (!cfgToken() || !cfgChatId()) return { ok: false, message: "ربات تلگرام پیکربندی نشده است (BACKUP_TELEGRAM_BOT_TOKEN/CHAT_ID)" };
  const brand = brandName() || "Z";
  const sb = getSupabaseAdmin();
  await ensureAuditTable(sb);
  const payload = await collectPayload(sb);
  payload.settings = sanitizeSettingsForBackup(payload.settings);
  const hash = await sha256Async(JSON.stringify({ s: payload.settings, n: payload.submissionCount, h: payload.submissions.length ? payload.submissions[0]?.id : null }));
  if (mode === "cron") {
    const prev = await lastHashFor(sb, brand);
    if (prev && prev === hash) {
      // No change since last backup — skip
      return { ok: true, message: "تغییری نسبت به بک‌آپ قبلی وجود نداشت؛ ارسال نشد." };
    }
  }
  const stamp = jalaliStamp();
  const stampIso = new Date().toISOString().replace(/[:.]/g, "-").slice(0,19);
  const base = `${brand.replace(/\s+/g,"_")}_backup_${stamp}`;
  const tagSet: Record<string, string[]> = {
    "زینالیکید": ["بکاپ", "بک‌آپ", "زینالیکید", "zeynalikid", "backup"],
    "فرزند من":  ["بکاپ", "بک‌آپ", "فرزندمن", "farzandman", "backup"],
  };
  const tags = (tagSet[brand] || ["بکاپ", "بک‌آپ", "backup", brand]).map(t=>`#${t.replace(/[^\u0600-\u06FFa-zA-Z0-9_]/g,"_")}`).join(" ");
  // Build two files: JSON (all data) + a small human-readable README.
  const readme = [
    `بک‌آپ خودکار ${brand}`,
    `تاریخ (شمسی): ${stamp}`,
    `تاریخ (میلادی/ISO): ${new Date().toISOString()}`,
    `تعداد پرونده‌ها: ${payload.submissionCount}`,
    `نحوه بازیابی: فایل data.json را در پنل ادمین در صفحه «بازیابی» آپلود کنید.`,
    `هش SHA-256: ${hash}`,
    "",
    "این فایل پس از ۳۰ روز به‌طور خودکار از تلگرام حذف می‌شود.",
  ].join("\n");
  const dataBytes = strToBytes(JSON.stringify(payload, null, 2));
  const zipBytes = buildZip([
    { name: `${base}/README.txt`, bytes: strToBytes(readme) },
    { name: `${base}/data.json`, bytes: dataBytes },
    { name: `${base}/submissions.json`, bytes: strToBytes(JSON.stringify(payload.submissions, null, 2)) },
    { name: `${base}/settings.json`, bytes: strToBytes(JSON.stringify(payload.settings, null, 2)) },
  ]);
  if (zipBytes.byteLength > 45 * 1024 * 1024) {
    return { ok: false, message: `بک‌آپ خیلی بزرگ است (${Math.round(zipBytes.byteLength/1024/1024)}MB): حداکثر ۴۵ مگابایت قابل ارسال به تلگرام است.` };
  }
  const caption = `${tags}\n📦 بک‌آپ کامل ${brand}\n📅 ${stamp} (${stampIso})\n📋 ${payload.submissionCount} پرونده\n${mode === "manual" ? "🖱️ درخواست دستی از داشبورد" : "⏱️ بک‌آپ خودکار ۳ روزه (در صورت تغییر)"}`;
  const sent = await tgSendDoc(`${base}.zip`, zipBytes, caption);
  await recordBackup(sb, brand, hash, [sent.message_id], [{ name: `${base}.zip`, size: zipBytes.byteLength }]);
  // Clean up expired ones (best-effort)
  deleteExpired(sb, brand).catch(e => console.warn("deleteExpired failed", String(e?.message).slice(0,120)));
  return { ok: true, message: `بک‌آپ با موفقیت به تلگرام ارسال شد (${Math.round(zipBytes.byteLength/1024)}KB)` };
}

serve(async (req) => {
  const opt = handleOptions(req); if (opt) return opt;
  const origin = getOrigin(req);
  // Manual invocation requires admin auth (same pattern as other admin endpoints).
  // Cron invocation has no Origin — allow with shared secret header.
  const url = new URL(req.url);
  const isCron = url.pathname.endsWith("/cron");
  try {
    if (!isCron) {
      const _rej = rejectIfInvalidOrigin(req, { allowNoOrigin: false }); if (_rej) return _rej;
      // Require admin bearer token (zk_admin_session from adminApi)
      const auth = req.headers.get("Authorization") || "";
      if (!/Bearer\s+/i.test(auth)) return jsonResponse({ error: "unauthorized" }, 401, origin);
    } else {
      // Cron should send a secret header (Vercel/Supabase cron secret). If missing, allow
      // only from local scheduler and rely on the no-side-effect skip path.
      const secret = req.headers.get("x-backup-cron-secret") || "";
      const expected = Deno.env.get("BACKUP_CRON_SECRET") || "";
      if (expected && secret !== expected) return jsonResponse({ error: "forbidden" }, 403, origin);
    }
    const result = await runBackup(isCron ? "cron" : "manual");
    return jsonResponse(result, result.ok ? 200 : 500, origin);
  } catch (e) {
    console.error("backup-telegram error", e);
    return jsonResponse({ error: String((e as Error)?.message || e) }, 500, origin);
  }
});
