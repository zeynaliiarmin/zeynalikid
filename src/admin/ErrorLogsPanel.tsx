/**
 * ErrorLogsPanel — نمایش خطاهای ثبت‌شدهٔ فرانت‌اند (فقط ادمین)
 * خواندن/پاک‌سازی از طریق Edge Function «admin-error-logs» با نشست ادمین انجام می‌شود.
 * هر خطا یک دکمهٔ کپی دارد که با کپی موفق، به‌صورت بصری تغییر می‌کند.
 */
import { useEffect, useState } from 'react';
import { getAdminSessionToken } from '../utils/adminSession';

const ADMIN_ERROR_LOGS_URL = `${(import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '')}/functions/v1/admin-error-logs`;

interface ErrorLog { id: number; kind: string; message: string; stack?: string; page_path?: string; user_agent?: string; lang?: string; created_at: string; }

// عناوین فارسی برای تمام نوع‌های خطای شناخته‌شده
const KIND_LABELS: Record<string, string> = {
  error: 'خطای صفحه',
  unhandledrejection: 'خطای Promise',
  boundary: 'کرش صفحه',
  registration: 'خطای ثبت اطلاعات',
  course_register: 'خطای ثبت دوره',
  consult_submit: 'خطای ثبت مشاوره',
  consult_submit_fatal: 'خطای جدی ثبت مشاوره',
  consult_update: 'خطای به‌روزرسانی مشاوره',
  consult_voice: 'خطای ویس مشاوره',
  upload_file: 'خطای آپلود فایل',
  voice_upload: 'خطای آپلود ویس',
  receipt_upload: 'خطای آپلود فیش',
  tongue_upload: 'خطای آپلود عکس زبان',
  payment_gateway: 'خطای درگاه پرداخت',
  payment_finalize: 'خطای نهایی‌سازی پرداخت',
  ask_question: 'خطای ثبت سوال',
  submit_review: 'خطای ثبت نظر',
  track_lookup: 'خطای جستجوی پیگیری',
  track_search: 'خطای صفحه پیگیری',
  track_corrective: 'خطای ذخیرهٔ اصلاحی',
  track_pdf_sign: 'خطای دانلود PDF',
};

// توضیح فارسی کوتاه: خطا مربوط به چه چیزی است و چه عملکردی ممکن است مختل شود
const KIND_DESCRIPTIONS: Record<string, string> = {
  error: 'یک خطای غیرمنتظرهٔ صفحه رخ داده است.',
  unhandledrejection: 'یک عملیات ناهمگام (Promise) بدون مدیریت خطا شکست خورد.',
  boundary: 'بخشی از صفحه دچار کرش شد و به‌جای آن پیام خطا نمایش داده شد.',
  registration: 'ثبت اطلاعات (دوره یا مشاوره) با خطا مواجه شد؛ ممکن است ثبت نهایی نشده باشد.',
  course_register: 'ذخیرهٔ ثبت دوره روی سرور ناموفق بود؛ ثبت به‌صورت موقت محلی ذخیره شد.',
  consult_submit: 'ذخیرهٔ فرم مشاوره روی سرور ناموفق بود.',
  consult_submit_fatal: 'ثبت فرم مشاوره با خطای جدی متوقف شد.',
  consult_update: 'به‌روزرسانی فرم مشاوره قبلی ناموفق بود.',
  consult_voice: 'آپلود یادداشت صوتی فرم مشاوره ناموفق بود.',
  upload_file: 'آپلود فایل (عکس/فیش) روی فضای ذخیره‌سازی ناموفق بود.',
  voice_upload: 'آپلود ویس ناموفق بود.',
  receipt_upload: 'آپلود فیش واریزی ناموفق بود؛ پرداخت ممکن است ثبت نشود.',
  tongue_upload: 'آپلود عکس زبان ناموفق بود؛ ارزیابی ممکن است به تأخیر بیفتد.',
  payment_gateway: 'اتصال به درگاه پرداخت ناموفق بود؛ کاربر نمی‌تواند پرداخت کند.',
  payment_finalize: 'نهایی‌سازی پرداخت/ثبت‌نام ناموفق بود.',
  ask_question: 'ثبت سوال کاربر ناموفق بود؛ سوال ممکن است به پنل نرسیده باشد.',
  submit_review: 'ثبت نظر ناموفق بود؛ نظر ممکن است ذخیره نشده باشد.',
  track_lookup: 'جستجوی کد پیگیری در سرور ناموفق بود.',
  track_search: 'باز کردن نتیجهٔ پیگیری ناموفق بود.',
  track_corrective: 'ذخیرهٔ اطلاعات اصلاحی ناموفق بود.',
  track_pdf_sign: 'ساخت لینک دانلود PDF ناموفق بود؛ فایل ممکن است قابل دانلود نباشد.',
};

// کپی متن با fallback برای مرورگرهای قدیمی
async function copyText(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) { await navigator.clipboard.writeText(text); return true; }
  } catch { /* fallback */ }
  try {
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.focus(); ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch { return false; }
}

export default function ErrorLogsPanel({ T, S }: { T: any; S: any }) {
  const [logs, setLogs] = useState<ErrorLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [clearing, setClearing] = useState(false);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const load = async () => {
    setLoading(true); setErr('');
    try {
      const token = getAdminSessionToken();
      if (!token) { setErr('نشست ادمین یافت نشد. دوباره وارد شوید.'); setLoading(false); return; }
      const resp = await fetch(ADMIN_ERROR_LOGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ limit: 100 }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) { setErr(body?.error || 'خطا در دریافت لاگ‌ها'); setLoading(false); return; }
      setLogs(Array.isArray(body?.logs) ? body.logs : []);
    } catch {
      setErr('خطا در ارتباط با سرور.');
    } finally {
      setLoading(false);
    }
  };

  // پاک‌سازی همهٔ خطاها (فقط ادمین)
  const clearAll = async () => {
    if (!window.confirm('همهٔ خطاهای گزارش‌شده پاک شوند؟ این عملیات قابل بازگشت نیست.')) return;
    setClearing(true); setErr('');
    try {
      const token = getAdminSessionToken();
      if (!token) { setErr('نشست ادمین یافت نشد. دوباره وارد شوید.'); setClearing(false); return; }
      const resp = await fetch(ADMIN_ERROR_LOGS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ action: 'clear' }),
      });
      const body = await resp.json().catch(() => ({}));
      if (!resp.ok) { setErr(body?.error || 'خطا در پاک‌سازی لاگ‌ها'); setClearing(false); return; }
      setLogs([]);
    } catch {
      setErr('خطا در ارتباط با سرور.');
    } finally {
      setClearing(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString('fa-IR'); } catch { return iso; } };

  const kindLabel = (k: string) => KIND_LABELS[k] || (k && typeof k === 'string' ? String(k).replace(/_/g, ' ') : 'خطا');

  // متن کامل قابل کپی برای هر خطا
  const buildCopyText = (l: ErrorLog) => {
    const lines = [
      `نوع خطا: ${kindLabel(l.kind)} (${l.kind})`,
      `پیام: ${l.message || '—'}`,
      `صفحه: ${l.page_path || '—'}`,
      `زبان: ${l.lang === 'fa' ? 'فارسی' : l.lang === 'en' ? 'انگلیسی' : l.lang || '—'}`,
      `زمان: ${fmtDate(l.created_at)}`,
      l.stack ? `جزئیات فنی:\n${l.stack}` : '',
    ].filter(Boolean);
    return lines.join('\n');
  };

  const handleCopy = async (l: ErrorLog) => {
    const ok = await copyText(buildCopyText(l));
    if (ok) {
      setCopiedId(l.id);
      window.setTimeout(() => setCopiedId((cur) => (cur === l.id ? null : cur)), 2000);
    }
  };

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.9, margin: 0, minWidth: 0, flex: '1 1 240px' }}>
          خطاهای ثبت‌شدهٔ کاربران در سایت (به‌صورت خودکار، بدون هیچ دادهٔ حساس مثل شماره یا کارت). خطاهای قدیمی‌تر از ۱۵ روز خودکار پاک می‌شوند.
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={load} disabled={loading} style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>{loading ? 'در حال دریافت...' : 'به‌روزرسانی'}</button>
          <button type="button" onClick={clearAll} disabled={clearing || !logs?.length} style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: '1px solid var(--zkad-err)', background: 'var(--zkad-tag-err-bg)', color: 'var(--zkad-tag-err-tx)', cursor: clearing || !logs?.length ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontWeight: 800, opacity: clearing || !logs?.length ? 0.6 : 1 }}>{clearing ? 'در حال پاک‌سازی...' : 'پاک‌سازی خطاها'}</button>
        </div>
      </div>

      {err && <div style={{ padding: 10, borderRadius: 10, background: `${T.err}12`, border: `1px solid ${T.err}`, color: T.err, fontSize: 12 }}>{err}</div>}

      {!err && logs === null && <div style={{ fontSize: 12, color: T.mut }}>در حال بارگذاری...</div>}

      {logs !== null && logs.length === 0 && (
        <div style={{ padding: 20, borderRadius: 12, border: `1px solid ${T.brd}`, background: T.card, textAlign: 'center', color: T.mut, fontSize: 13 }}>
          هنوز هیچ خطایی ثبت نشده است. عالیه! ✅
        </div>
      )}

      {logs !== null && logs.length > 0 && (
        <div style={{ display: 'grid', gap: 8 }}>
          {logs.map((l) => {
            const desc = KIND_DESCRIPTIONS[l.kind];
            return (
              <div key={l.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, background: T.card, padding: '10px 12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: T.soft, color:T.accText, whiteSpace: 'nowrap' }}>{kindLabel(l.kind)}</span>
                  <span style={{ fontSize: 12, color: T.mut, whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</span>
                  <span style={{ fontSize: 11, color: T.mut }} dir="ltr">{l.page_path || '—'}</span>
                  {l.lang && <span style={{ fontSize: 10, color: T.mut, border: `1px solid ${T.brd}`, borderRadius: 6, padding: '1px 6px' }}>{l.lang === 'fa' ? 'فارسی' : 'انگلیسی'}</span>}
                  <button
                    type="button"
                    onClick={() => handleCopy(l)}
                    title="کپی متن خطا"
                    style={{
                      marginInlineStart: 'auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 6,
                      minHeight: 30,
                      padding: '0 10px',
                      borderRadius: 8,
                      border: copiedId === l.id ? '1px solid #86efac' : `1px solid ${T.brd}`,
                      background: copiedId === l.id ? '#dcfce7' : T.soft,
                      color: copiedId === l.id ? '#15803d' : T.ttl,
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      fontSize: 11,
                      fontWeight: 700,
                      transition: 'all .2s ease',
                    }}
                  >
                    {copiedId === l.id ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
                        کپی شد
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                        کپی
                      </>
                    )}
                  </button>
                </div>
                {desc && <div style={{ fontSize: 11.5, color: T.mut, lineHeight: 1.8, marginTop: 6, padding: '6px 10px', background: T.soft, borderRadius: 8 }}>💡 {desc}</div>}
                <div style={{ fontSize: 12.5, color: T.txt, fontWeight: 700, marginTop: 6, lineHeight: 1.8, wordBreak: 'break-word' }}>{l.message || '(بدون پیام)'}</div>
                {l.stack && (
                  <button type="button" onClick={() => toggle(l.id)} style={{ marginTop: 6, border: 0, background: 'transparent', color:T.accText, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, padding: 0 }}>
                    {expanded.has(l.id) ? 'پنهان کردن جزئیات' : 'نمایش جزئیات فنی'}
                  </button>
                )}
                {l.stack && expanded.has(l.id) && (
                  <pre style={{ marginTop: 8, marginBottom: 0, padding: 10, background: T.inp, color: T.txt, border: `1px solid ${T.brd}`, borderRadius: 10, fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'ltr', textAlign: 'left', maxHeight: 300, overflowY: 'auto' }}>{l.stack}</pre>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
