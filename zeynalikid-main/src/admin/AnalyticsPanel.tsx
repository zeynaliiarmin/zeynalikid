// اصلاح ۳۱: پنل «آمار بازدید» — نمایش بازدید کل / این ماه / امروز + صفحات پربازدید (اختیاری)
// ثبت بازدید در جدول Supabase به‌نام page_views انجام می‌شود (نگاه کنید به src/lib/supabase.ts → trackPageView/fetchPageViewStats).
import { useEffect, useState } from 'react';
import { isSupabaseConfigured, fetchPageViewStats } from '../lib/supabase';

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

export default function AnalyticsPanel({ T, S }: { T: any; S: any }) {
  const [stats, setStats] = useState<Stats>({
    total: 0,
    thisMonth: 0,
    today: 0,
    topPages: [],
    loading: true,
    error: '',
  });

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setStats((prev) => ({ ...prev, loading: false, error: 'Supabase تنظیم نشده است — آمار بازدید فقط با اتصال به Supabase در دسترس است.' }));
      return;
    }
    let alive = true;
    fetchPageViewStats()
      .then((s) => {
        if (!alive) return;
        setStats({ ...s, loading: false, error: '' });
      })
      .catch((e) => {
        console.warn('Could not fetch analytics:', e);
        if (!alive) return;
        setStats((prev) => ({ ...prev, loading: false, error: 'دریافت آمار بازدید ممکن نشد. اطمینان حاصل کنید جدول page_views در Supabase ساخته شده باشد.' }));
      });
    return () => {
      alive = false;
    };
  }, []);

  const Card = ({ label, value, color }: { label: string; value: number; color: string }) => (
    <div style={{ background: T.soft, borderRadius: 14, padding: 16, border: `1px solid ${T.brd}`, boxShadow: T.neuOut }}>
      <div style={{ fontSize: 11, color: T.mut, marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 800, color }}>{value.toLocaleString('fa-IR')}</div>
    </div>
  );

  if (stats.loading) {
    return <div style={{ padding: 20, textAlign: 'center', color: T.mut }}>در حال بارگذاری آمار...</div>;
  }

  return (
    <div>
      <h3 style={{ color: T.ttl, marginBottom: 16, fontWeight: 800 }}>📊 آمار بازدید</h3>

      {stats.error && (
        <div style={{ background: `${T.warn}18`, border: `1px solid ${T.warn}`, color: T.warn, borderRadius: 10, padding: 10, marginBottom: 14, fontSize: 12, fontWeight: 700 }}>
          ⚠️ {stats.error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <Card label="بازدید کل (همیشه)" value={stats.total} color={T.ttl} />
        <Card label="بازدید این ماه" value={stats.thisMonth} color={T.acc} />
        <Card label="بازدید امروز" value={stats.today} color={T.ok} />
      </div>

      {stats.topPages.length > 0 && (
        <div style={{ background: T.badge, borderRadius: 14, padding: 12, border: `1px solid ${T.brd}` }}>
          <b style={{ fontSize: 13, color: T.ttl }}>📌 صفحات پربازدید (این ماه)</b>
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
