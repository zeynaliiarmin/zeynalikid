// src/utils/backupUtils.ts
// توابع مشترک ساخت بک‌آپ (Excel/xls + TXT + PNG/WebP + ZIP) برای پنل ادمین.
// این فایل در ZK و AF به اشتراک استفاده می‌شود.
import JSZip from 'jszip';
import { generateFormImage } from './exportFormToImage';

export type BackupFormat = 'excel' | 'txt' | 'image';

const safe = (v: any) => String(v ?? '').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
const digits = (v: any) => String(v ?? '').replace(/[^0-9۰-۹٠-٩]/g, '');
const faNum = (n: number) => String(n).replace(/[0-9]/g, d => '۰۱۲۳۴۵۶۷۸۹'[+d]);

export function submissionsToRows(items: any[]): Record<string, string>[] {
  return items.map((x: any) => {
    const d: Record<string, string> = {};
    d['ردیف'] = '';
    d['نوع'] = x.type === 'course' ? 'ثبت دوره' : 'مشاوره';
    d['کد پیگیری'] = String(x.trackingCode || '');
    d['نام والد'] = safe(x.pName);
    d['نام فرزند'] = safe(x.cName);
    d['سن'] = [x.cAge, x.cAgeM].filter(Boolean).join('/');
    d['جنسیت'] = safe(x.gender);
    d['شماره تماس'] = safe(x.fullPhone);
    d['کشور/شهر'] = safe((x.shipping && (x.shipping.city || x.shipping.country)) || '');
    d['موضوع مشاوره'] = Array.isArray(x.topics) ? x.topics.join('، ') : safe(x.topics);
    d['وضعیت گوارش'] = Array.isArray(x.digestive) ? x.digestive.join('، ') : safe(x.digestive);
    d['اشتها'] = safe(x.appetite);
    d['شرایط خاص'] = Array.isArray(x.specials) ? x.specials.join('، ') : safe(x.specials);
    d['بیماری خاص'] = safe(x.disease);
    d['قد'] = safe(x.height);
    d['وزن'] = safe(x.weight);
    d['دوره'] = safe((x.course && (x.course.name || x.course.title)) || '');
    d['مبلغ'] = safe(x.payment && (x.payment.amount || x.payment.price));
    d['وضعیت پرداخت'] = safe(x.payment && x.payment.status);
    d['روش ارسال'] = safe(x.shipping && x.shipping.method);
    d['وضعیت سفارش'] = safe(x.orderStatus || x.consultationStatus || '');
    d['اولویت'] = safe(x.priority);
    d['دسته'] = safe(x.category);
    d['یادداشت ادمین'] = safe(x.adminNotes);
    d['یادداشت کاربر'] = safe(x.notes);
    d['تاریخ'] = safe(x.date);
    d['ساعت'] = safe(x.time);
    d['شناسه'] = String(x.id || '');
    if (x.similarTo) d['ادامه/فرزند دیگر از'] = String(x.similarTo);
    return d;
  });
}

export function buildExcelBlob(rows: Record<string, string>[]): Blob {
  const keys = rows.length ? Object.keys(rows[0]) : ['نوع', 'کد پیگیری', 'نام والد', 'شماره تماس', 'تاریخ'];
  const esc = (v: any) => String(v ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40"><head><meta charset="utf-8"><style>table{border-collapse:collapse}th,td{border:1px solid #888;padding:4px 6px;font-family:Tahoma,Segoe UI,Arial,sans-serif;font-size:11px}th{background:#eee}</style></head><body><table><thead><tr>${keys.map(k => `<th>${esc(k)}</th>`).join('')}</tr></thead><tbody>${rows.map((r, i) => `<tr><td>${faNum(i + 1)}</td>${keys.slice(1).map(k => `<td>${esc(r[k])}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;
  return new Blob(['\uFEFF' + html], { type: 'application/vnd.ms-excel;charset=utf-8' });
}

export function buildTxtBlob(rows: Record<string, string>[], title: string): Blob {
  const sep = '—'.repeat(50);
  const out: string[] = [title, `تعداد: ${faNum(rows.length)} مورد`, `تولید: ${new Date().toLocaleString('fa-IR')}`, sep, ''];
  rows.forEach((r, i) => {
    out.push(`# ${faNum(i + 1)}`);
    Object.entries(r).forEach(([k, v]) => {
      if (k === 'ردیف') return;
      if (v && String(v).trim()) out.push(`  ${k}: ${v}`);
    });
    out.push('');
  });
  return new Blob(['\uFEFF' + out.join('\n')], { type: 'text/plain;charset=utf-8' });
}

export function triggerDownload(blob: Blob, filename: string) {
  const u = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = u; a.download = filename;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(u), 1500);
}

async function generateImagesBatch(items: any[], imageFormat: 'webp' | 'jpg' = 'webp', onProgress?: (done: number, total: number) => void): Promise<{ filename: string; blob: Blob }[]> {
  const out: { filename: string; blob: Blob }[] = [];
  for (let i = 0; i < items.length; i++) {
    try {
      const blob = await generateFormImage(items[i], imageFormat);
      const name = `${String(i + 1).padStart(3, '0')}_${String(items[i].trackingCode || items[i].id).replace(/[^\w\u0600-\u06FF-]/g, '_')}.${imageFormat}`;
      out.push({ filename: name, blob });
      onProgress?.(i + 1, items.length);
    } catch (e) {
      console.warn('image failed for', items[i]?.id, e);
    }
    // بدون تاخیر زیاد؛ ولی اجازه دهیم UI رفرش شود
    await new Promise(r => setTimeout(r, 10));
  }
  return out;
}

export async function exportSubsBackup(items: any[], fmt: BackupFormat, opts: { imageFormat?: 'webp' | 'jpg'; onProgress?: (msg: string, done?: number, total?: number) => void } = {}) {
  if (!items.length) throw new Error('موردی برای بک‌آپ انتخاب نشده است');
  const imageFormat = opts.imageFormat || 'webp';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const baseName = `backup_${items.length}_${stamp}`;
  const rows = submissionsToRows(items);

  if (fmt === 'excel') {
    triggerDownload(buildExcelBlob(rows), `${baseName}.xls`);
    return;
  }
  if (fmt === 'txt') {
    triggerDownload(buildTxtBlob(rows, `بک‌آپ اطلاعات فرم‌ها (${faNum(items.length)} مورد)`), `${baseName}.txt`);
    return;
  }

  // image/webp
  opts.onProgress?.('در حال ساخت تصاویر…', 0, items.length);
  const imgs = await generateImagesBatch(items, imageFormat, (d, t) => opts.onProgress?.(`در حال ساخت تصاویر… ${faNum(d)}/${faNum(t)}`, d, t));
  if (!imgs.length) throw new Error('ساخت تصاویر با خطا مواجه شد');

  if (imgs.length <= 10) {
    // دانلود تکی پشت‌سرهم
    imgs.forEach((im, idx) => setTimeout(() => triggerDownload(im.blob, im.filename), idx * 350));
    return;
  }

  // زیپ
  opts.onProgress?.('در حال فشرده‌سازی…', 0, 0);
  const zip = new JSZip();
  const folder = zip.folder(baseName)!;
  // همراه با فایل متنی فهرست
  folder.file('INDEX.txt', buildTxtBlob(rows, `فهرست ${faNum(rows.length)} پرونده (بک‌آپ تصویری)`));
  folder.file('submissions.xls', buildExcelBlob(rows));
  imgs.forEach(im => folder.file(im.filename, im.blob));
  const zblob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (m) => {
    opts.onProgress?.(`در حال فشرده‌سازی… ${Math.round(m.percent)}%`, 0, 0);
  });
  triggerDownload(zblob, `${baseName}.zip`);
}

/**
 * بک‌آپ کامل «داشبورد» شامل: فرم‌ها (مشاوره + دوره)، تنظیمات عمومی (faq، محصولات، دوره‌ها، هایلایت،
 * مجوزها، مقالات آموزشی، تجربه‌ها، رسانه‌ها، خدمات، ترجمه‌ها)، و تصاویر کارت فرم‌ها در یک فایل زیپ.
 */
export async function exportFullBackup(opts: {
  subs: any[]; cfg: any; imageFormat?: 'webp' | 'jpg';
  onProgress?: (msg: string, done?: number, total?: number) => void;
  includeImages?: boolean;
}) {
  const { subs, cfg } = opts;
  const imageFormat = opts.imageFormat || 'webp';
  const now = new Date();
  const stampFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).replace(/\//g, '-');
  const baseName = `FULL_BACKUP_${stampFa}`;
  opts.onProgress?.('آماده‌سازی بک‌آپ کامل…', 0, 0);

  const zip = new JSZip();
  const root = zip.folder(baseName)!;
  // 1) index / README
  const readme = [
    'بک‌آپ کامل سایت',
    `تاریخ (شمسی): ${stampFa}`,
    `تاریخ (میلادی): ${now.toISOString()}`,
    `تعداد پرونده‌ها: ${faNum(subs.length)}`,
    '',
    'ساختار فایل:',
    '  README.txt               — این فایل',
    '  submissions/index.xls    — تمام فرم‌ها و دوره‌ها (اکسل)',
    '  submissions/index.txt    — متن فرم‌ها (TXT)',
    '  submissions/images/*.webp— تصویر هر کارت',
    '  settings/config.json     — تمام تنظیمات عمومی (شامل faq، محتوا، دوره‌ها، محصولات، هایلایت، مجوزها، مقالات، تجربه‌ها، رسانه‌ها، ترجمه‌ها)',
    '  settings/faqs.json       — سوالات متداول',
    '  settings/courses.json    — اطلاعات دوره‌ها',
    '  settings/products.json   — محصولات',
    '  settings/highlights.json — هایلایت‌ها',
    '  settings/licenses.json   — مجوزها',
    '  settings/education.json  — مقالات آموزشی',
    '  settings/experience.json — تجربه والدین',
    '  settings/media.json      — ویدیو/ویس/عکس',
    '  settings/translations.json— ترجمه‌ها',
    '  portal/users.json        — ثبت‌نام‌های پنل کاربر (کد پیگیری/نام/شماره)',
    '',
  ].join('\n');
  root.file('README.txt', new Blob([readme], { type: 'text/plain;charset=utf-8' }));

  // 2) submissions
  const rows = submissionsToRows(subs);
  root.folder('submissions')!.file('index.xls', buildExcelBlob(rows));
  root.folder('submissions')!.file('index.txt', buildTxtBlob(rows, 'همه فرم‌ها و دوره‌ها'));
  if (opts.includeImages !== false && subs.length > 0) {
    opts.onProgress?.('در حال ساخت تصاویر پرونده‌ها…', 0, subs.length);
    const imgs = await generateImagesBatch(subs, imageFormat, (d, t) => opts.onProgress?.(`تصویر پرونده‌ها ${faNum(d)}/${faNum(t)}`, d, t));
    const sfolder = root.folder('submissions/images')!;
    imgs.forEach(im => sfolder.file(im.filename, im.blob));
  }

  // 3) settings / public content
  const pick = (key: string) => { try { return (cfg as any)?.[key]; } catch { return undefined; } };
  const settingsFolder = root.folder('settings')!;
  const writeJson = (name: string, val: any) => {
    settingsFolder.file(name, new Blob([JSON.stringify(val ?? null, null, 2)], { type: 'application/json;charset=utf-8' }));
  };
  writeJson('config.json', cfg);
  writeJson('faqs.json', { fa: pick('faqItems'), en: pick('faqItemsEn') });
  writeJson('courses.json', { tabs: pick('courseTabs'), tagged: pick('taggedCourses'), featured: pick('featuredCourses'), tabFaqs: { fa: pick('courseTabFaqs'), en: pick('courseTabFaqsEn') }, instructor: pick('courseInstructor') });
  writeJson('products.json', pick('products'));
  writeJson('highlights.json', pick('storyHighlights'));
  writeJson('licenses.json', pick('licenses'));
  writeJson('education.json', pick('education'));
  writeJson('experience.json', pick('experience'));
  writeJson('media.json', pick('mediaItems'));
  writeJson('services.json', pick('services'));
  writeJson('contacts.json', pick('contacts'));
  writeJson('trust.json', { messages: pick('trustMessages'), display: pick('trustDisplay'), trustbox: pick('trustBox') });
  writeJson('translations.json', pick('translations'));
  writeJson('images.json', pick('images'));
  writeJson('design.json', { designSystem: pick('designSystem'), theme: pick('theme'), publicThemeMode: pick('publicThemeMode') });
  writeJson('consultants.json', pick('consultants'));
  writeJson('referral.json', pick('referral'));
  writeJson('consultTopics.json', pick('consultTopics'));
  writeJson('formFields.json', { formFields: pick('formFields'), digestiveOptions: pick('digestiveOptions'), appetiteOptions: pick('appetiteOptions'), specialConditions: pick('specialConditions'), categories: pick('categories') });
  writeJson('shipping.json', { shippingMethods: pick('shippingMethods'), delivery: pick('delivery'), banks: pick('banks') });

  // 4) portal users (از localStorage)
  try {
    const portalUsers: any[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && /^zk_portal_session/i.test(k)) {
        try { portalUsers.push(JSON.parse(localStorage.getItem(k) || '')); } catch { /* ignore */ }
      }
    }
    root.folder('portal')!.file('users.json', new Blob([JSON.stringify(portalUsers, null, 2)], { type: 'application/json;charset=utf-8' }));
  } catch { /* ignore */ }

  opts.onProgress?.('در حال فشرده‌سازی نهایی…', 0, 0);
  const zblob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 6 } }, (m) => {
    opts.onProgress?.(`در حال فشرده‌سازی… ${Math.round(m.percent)}%`, 0, 0);
  });
  triggerDownload(zblob, `${baseName}.zip`);
}

/**
 * ارسال بک‌آپ کامل به تلگرام از طریق endpoint سرور (توکن هرگز در کلاینت لو نمی‌رود).
 * همچنین به‌طور خودکار پیام‌های قدیمی‌تر از ۳۰ روز را حذف می‌کند.
 */
const BACKUP_LOG_KEY = 'zk_telegram_backup_log_v1';
const AUTO_BACKUP_EVERY_MS = 3 * 24 * 3600 * 1000; // 3 days
const EXPIRE_AFTER_MS = 30 * 24 * 3600 * 1000; // 30 days

interface BackupLogEntry { brand: string; sha: string; messageId: number; sentAt: number; filename: string }

function readBackupLog(): BackupLogEntry[] {
  try { return JSON.parse(sessionStorage.getItem(BACKUP_LOG_KEY) || localStorage.getItem(BACKUP_LOG_KEY) || '[]'); } catch { return []; }
}
function writeBackupLog(list: BackupLogEntry[]) {
  try { localStorage.setItem(BACKUP_LOG_KEY, JSON.stringify(list.slice(-100))); } catch {}
}
async function sha256(s: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function callBackupApi(body: any, adminToken: string) {
  const resp = await fetch('/api/backup-telegram', { method: 'POST', headers: { 'Content-Type': 'application/json', 'X-Admin-Token': adminToken }, body: JSON.stringify(body) });
  const j = await resp.json().catch(() => ({}));
  if (!resp.ok || !j.ok) throw new Error(j.error || `HTTP ${resp.status}`);
  return j;
}

export async function requestTelegramBackup(onProgress?: (msg: string) => void): Promise<{ ok: boolean; message?: string }> {
  try {
    onProgress?.('در حال آماده‌سازی بک‌آپ…');
    // gather from the current page by reading window.__APP_SSG_SETTINGS__ if present, else fetchSettings
    let settings: any = {};
    try { settings = (window as any).__APP_SSG_SETTINGS__ || {}; } catch {}
    if (!settings || !Object.keys(settings).length) {
      const { fetchSettings } = await import('../lib/supabase');
      settings = (await fetchSettings()) || {};
    }
    // Collect submissions from localStorage only (server-side fetch requires admin token; we keep a local full copy in localStorage).
    const KEYS = ['zk_subs', 'zk_subs_v2', 'zkid_subs'];
    let subs: any[] = [];
    for (const k of KEYS) { try { const v = JSON.parse(localStorage.getItem(k) || '[]'); if (Array.isArray(v) && v.length > subs.length) subs = v; } catch {} }
    // admin password token (from admin session if available)
    let adminToken = '';
    try { adminToken = (import.meta as any).env?.VITE_BACKUP_SHARED_SECRET || localStorage.getItem('zk_admin_session_token') || sessionStorage.getItem('zk_admin_session_token') || ''; } catch {}
    const hash = await sha256(JSON.stringify({ s: Object.keys(settings).sort(), n: subs.length, first: subs[0]?.id, last: subs[subs.length-1]?.id }));
    const brand = String(settings?.siteTitle || (location.hostname.includes('farzandman') ? 'فرزند من' : 'زینالیکید'));
    onProgress?.('در حال ارسال به تلگرام…');
    const r = await callBackupApi({ action: 'send', payload: { submissions: subs, settings, meta: { brand, sha: hash, auto: false } } }, adminToken);
    const log = readBackupLog();
    log.push({ brand, sha: hash, messageId: r.message_id, sentAt: Date.now(), filename: r.filename });
    writeBackupLog(log);
    // purge expired (best effort)
    for (const old of log.filter(e => Date.now() - e.sentAt > EXPIRE_AFTER_MS)) {
      try { await callBackupApi({ action: 'delete', message_id: old.messageId }, adminToken); } catch {}
    }
    writeBackupLog(log.filter(e => Date.now() - e.sentAt <= EXPIRE_AFTER_MS));
    return { ok: true, message: `بک‌آپ به تلگرام ارسال شد (${Math.round(r.size/1024)}KB)` };
  } catch (e: any) {
    return { ok: false, message: String(e?.message || e) };
  }
}

/** بک‌آپ خودکار: هر وقت ادمین داشبورد را باز می‌کند و از آخرین بک‌آپ ۳ روز گذشته و محتوا تغییر کرده، بی‌صدا یک بک‌آپ می‌فرستد. */
export async function maybeAutoBackupToTelegram(getSubs: ()=>any[], getCfg: ()=>any): Promise<{sent:boolean; message?:string}> {
  try {
    let adminToken = '';
    try { adminToken = (import.meta as any).env?.VITE_BACKUP_SHARED_SECRET || localStorage.getItem('zk_admin_session_token') || sessionStorage.getItem('zk_admin_session_token') || ''; } catch {}
    if (!adminToken) return { sent:false };
    const subs = getSubs() || [];
    const cfg = getCfg() || {};
    const brand = String(cfg?.siteTitle || (location.hostname.includes('farzandman') ? 'فرزند من' : 'زینالیکید'));
    const log = readBackupLog().filter(e => e.brand === brand);
    const last = log.sort((a,b)=>b.sentAt-a.sentAt)[0];
    if (last && Date.now() - last.sentAt < AUTO_BACKUP_EVERY_MS) return { sent:false };
    const hash = await sha256(JSON.stringify({ s: Object.keys(cfg).sort(), n: subs.length, first: subs[0]?.id, last: subs[subs.length-1]?.id }));
    if (last && last.sha === hash) return { sent:false };
    // Send silently
    const r = await callBackupApi({ action: 'send', payload: { submissions: subs, settings: cfg, meta: { brand, sha: hash, auto: true } } }, adminToken);
    const all = readBackupLog();
    all.push({ brand, sha: hash, messageId: r.message_id, sentAt: Date.now(), filename: r.filename });
    // Purge expired
    for (const old of all.filter(e => Date.now() - e.sentAt > EXPIRE_AFTER_MS)) {
      try { await callBackupApi({ action: 'delete', message_id: old.messageId }, adminToken); } catch {}
    }
    writeBackupLog(all.filter(e => Date.now() - e.sentAt <= EXPIRE_AFTER_MS));
    return { sent:true, message:'بک‌آپ خودکار ۳روزه به تلگرام ارسال شد' };
  } catch (e: any) {
    return { sent:false, message: String(e?.message||e) };
  }
}

