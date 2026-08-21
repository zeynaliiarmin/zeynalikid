/**
 * ErrorLogsPanel — نمایش خطاهای ثبت‌شدهٔ فرانت‌اند (فقط ادمین)
 * خواندن از طریق Edge Function «admin-error-logs» با نشست ادمین انجام می‌شود.
 * کاملاً فقط‌خواندنی — هیچ حذف/نوشتنی از اینجا انجام نمی‌شود.
 */
import { useEffect, useState } from 'react';
import { getAdminSessionToken } from '../utils/adminSession';

const ADMIN_ERROR_LOGS_URL = `${(import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/$/, '')}/functions/v1/admin-error-logs`;

interface ErrorLog { id: number; kind: string; message: string; stack?: string; page_path?: string; user_agent?: string; lang?: string; created_at: string; }

export default function ErrorLogsPanel({ T, S }: { T: any; S: any }) {
  const [logs, setLogs] = useState<ErrorLog[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

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

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const toggle = (id: number) => setExpanded(prev => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const fmtDate = (iso: string) => { try { return new Date(iso).toLocaleString('fa-IR'); } catch { return iso; } };

  const kindLabel = (k: string) => ({ error: 'خطا', unhandledrejection: 'Promise', boundary: 'کرش صفحه' } as any)[k] || k;

  return (
    <div style={{ display: 'grid', gap: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
        <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.9, margin: 0 }}>
          خطاهای ثبت‌شدهٔ کاربران در سایت (به‌صورت خودکار، بدون هیچ دادهٔ حساس مثل شماره یا کارت). خطاهای قدیمی‌تر از ۱۵ روز خودکار پاک می‌شوند.
        </p>
        <button type="button" onClick={load} disabled={loading} style={{ minHeight: 40, padding: '0 14px', borderRadius: 10, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>{loading ? 'در حال دریافت...' : 'به‌روزرسانی'}</button>
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
          {logs.map((l) => (
            <div key={l.id} style={{ border: `1px solid ${T.brd}`, borderRadius: 12, background: T.card, padding: '10px 12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span style={{ fontSize: 10, fontWeight: 800, padding: '2px 8px', borderRadius: 999, background: T.soft, color: T.acc, whiteSpace: 'nowrap' }}>{kindLabel(l.kind)}</span>
                <span style={{ fontSize: 12, color: T.mut, whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</span>
                <span style={{ fontSize: 11, color: T.mut }} dir="ltr">{l.page_path || '—'}</span>
                {l.lang && <span style={{ fontSize: 10, color: T.mut, border: `1px solid ${T.brd}`, borderRadius: 6, padding: '1px 6px' }}>{l.lang}</span>}
              </div>
              <div style={{ fontSize: 12.5, color: T.txt, fontWeight: 700, marginTop: 6, lineHeight: 1.8, wordBreak: 'break-word' }}>{l.message || '(بدون پیام)'}</div>
              {l.stack && (
                <button type="button" onClick={() => toggle(l.id)} style={{ marginTop: 6, border: 0, background: 'transparent', color: T.acc, cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, fontWeight: 700, padding: 0 }}>
                  {expanded.has(l.id) ? 'پنهان کردن جزئیات' : 'نمایش جزئیات فنی'}
                </button>
              )}
              {l.stack && expanded.has(l.id) && (
                <pre style={{ marginTop: 8, marginBottom: 0, padding: 10, background: '#0F1722', color: '#E2E8F0', borderRadius: 10, fontSize: 11, lineHeight: 1.7, whiteSpace: 'pre-wrap', wordBreak: 'break-word', direction: 'ltr', textAlign: 'left', maxHeight: 300, overflowY: 'auto' }}>{l.stack}</pre>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
