// اصلاح ۳۱: پنل «آمار بازدید» — نمایش بازدید کل / این ماه / امروز + صفحات پربازدید (اختیاری)
// ثبت بازدید در جدول Supabase به‌نام page_views انجام می‌شود (نگاه کنید به src/lib/supabase.ts (trackPageView/fetchPageViewStats)).
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, fetchPageViewStats } from '../lib/supabase';
import { ZkChartIcon, ZkWarnIcon, ZkStarIcon } from './adminIcons';

type Stats = {
  total: number;
  thisMonth: number;
  today: number;
  topPages: { page_path: string; count: number }[];
  loading: boolean;
  error: string;
};

const pageLabels: Record<string, string> = {
  '/': 'صفحه اصلی',
  '/courses': 'معرفی دوره‌ها',
  '/child-info': 'اطلاعات فرزند',
  '/course-shipping': 'اطلاعات ارسال',
  '/course-payment': 'پرداخت',
  '/course-confirm': 'تأیید ثبت‌نام',
  '/course-done': 'اتمام ثبت‌نام',
  '/track': 'پیگیری',
  '/experience': 'تجربه والدین',
  '/licenses': 'مجوزها',
  '/education': 'آموزش‌ها',
  '/about': 'درباره ما',
  '/contact': 'ارتباط با ما',
  '/form': 'فرم مشاوره (پروژه ثانویه)',
};

const CACHE_KEY = 'zk_admin_analytics_cache_v1';
const CACHE_TTL = 60_000; // ۶۰ ثانیه

function readCache(): Stats | null {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { ts, data } = JSON.parse(raw);
    if (!data || Date.now() - ts > CACHE_TTL) return null;
    return { ...data, loading: false, error: '' };
  } catch {
    return null;
  }
}

function writeCache(s: Stats) {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ ts: Date.now(), data: s }));
  } catch { /* ignore */ }
}

export default function AnalyticsPanel({ T, S }: { T: any; S: any }) {
  // ابتدا از کش نمایش بده (فوری) — بعد در پس‌زمینه به‌روزرسانی کن
  const cached = readCache();
  const [stats, setStats] = useState<Stats>(() => cached ?? {
    total: 0,
    thisMonth: 0,
    today: 0,
    topPages: [],
    loading: true,
    error: '',
  });
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStats((prev) => ({ ...prev, loading: false, error: 'Supabase تنظیم نشده است — آمار بازدید فقط با اتصال به Supabase در دسترس است.' }));
      return;
    }
    let alive = true;
    setRefreshing(true);
    fetchPageViewStats()
      .then((s) => {
        if (!alive) return;
        const next = { ...s, loading: false, error: '' };
        setStats(next);
        writeCache(next);
      })
      .catch((e) => {
        console.warn('Could not fetch analytics:', e);
        if (!alive) return;
        setStats((prev) => ({ ...prev, loading: false, error: 'دریافت آمار بازدید ممکن نشد. اطمینان حاصل کنید جدول page_views در Supabase ساخته شده باشد.' }));
      })
      .finally(() => {
        if (alive) setRefreshing(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Stage 7B: کارت‌های آمار بازدید هم‌خانواده KPI کارت‌های داشبورد
  const Card = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div className="zkad-stat-card">
      <div className="zkad-stat-lbl">{label}</div>
      <div className="zkad-stat-num" style={{ color }}>{value.toLocaleString('fa-IR')}</div>
    </div>
  );

  if (stats.loading && !cached) {
    return <div className="zkad-loading"><span className="zkad-spin"/>در حال بارگذاری آمار...</div>;
  }

  const doRefresh = () => {
    setRefreshing(true);
    fetchPageViewStats()
      .then((s) => {
        const next = { ...s, loading: false, error: '' };
        setStats(next);
        writeCache(next);
      })
      .catch(() => {
        setStats((prev) => ({ ...prev, loading: false, error: 'دریافت آمار بازدید ممکن نشد.' }));
      })
      .finally(() => setRefreshing(false));
  };

  return (
    <div>
      <h3 style={{ color: T.ttl, marginBottom: 16, fontWeight: 800, display:'flex', alignItems:'center', gap:8, justifyContent:'space-between', flexWrap:'wrap' }}>
        <span style={{ display:'inline-flex', alignItems:'center', gap:8 }}><ZkChartIcon size={16} color={T.ttl}/> آمار بازدید</span>
        <button type="button" onClick={doRefresh} disabled={refreshing} title="به‌روزرسانی آمار"
          style={{ minHeight:36, padding:'6px 14px', borderRadius:8, border:`1px solid ${T.brd}`, background:T.card, color:T.accText, fontSize:12, fontWeight:700, cursor:'pointer', fontFamily:'inherit', display:'inline-flex', alignItems:'center', gap:6 }}>
          {refreshing ? 'در حال به‌روزرسانی…' : '↻ به‌روزرسانی'}
        </button>
      </h3>

      {stats.error && (
        <div style={{ background: `${T.warn}18`, border: `1px solid ${T.warn}`, color: T.warn, borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12, fontWeight: 700, display:'flex', alignItems:'center', gap:6 }}>
          <ZkWarnIcon size={15}/> <span>{stats.error}</span>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="بازدید کل (همیشه)" value={stats.total} color={T.ttl} />
        <Card label="بازدید این ماه" value={stats.thisMonth} color={T.acc} />
        <Card label="بازدید امروز" value={stats.today} color={T.ok} />
      </div>

      {stats.topPages.length > 0 && (
        <div style={{ background: T.badge, borderRadius: 14, padding: 12, border: `1px solid ${T.brd}` }}>
          <b style={{ fontSize: 13, color: T.ttl, display:'inline-flex', alignItems:'center', gap:6 }}><ZkStarIcon size={14} color={T.ttl}/> صفحات پربازدید (این ماه)</b>
          <div style={{ marginTop: 8 }}>
            {stats.topPages.map((p, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  padding: '7px 2px',
                  borderBottom: i < stats.topPages.length - 1 ? `1px solid ${T.brd}` : 'none',
                  fontSize: 12,
                }}
              >
                <span style={{ color: T.txt }}>{pageLabels[p.page_path] ? `${pageLabels[p.page_path]} (${p.page_path})` : p.page_path || '/'}</span>
                <span style={{ color: T.mut, fontWeight: 700 }}>{p.count.toLocaleString('fa-IR')} بازدید</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <p style={{ fontSize: 10.5, color: T.mut, marginTop: 14, lineHeight: 1.8 }}>
        ثبت بازدید هر بار که کاربر یک صفحهٔ عمومی (به‌جز پنل مدیریت) را باز می‌کند، به‌صورت بی‌صدا و غیرمسدودکننده در جدول <code>page_views</code> ذخیره می‌شود؛ بازدید فرم مشاورهٔ پروژه ثانویه نیز در همین جدول ثبت می‌شود.
      </p>
    </div>
  );
}
