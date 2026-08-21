/**
 * CourseTimer — تایمر ۱۵ دقیقه‌ای روند ثبت دوره (اعتمادسازی، مثل درگاه‌های پرداخت)
 * فقط نمایشی است. طراحی خنثی و کم‌ارتفاع تا فقط «دیده شود» نه جلب توجه؛
 * در ۶۰ ثانیهٔ پایانی قرمز تپنده می‌شود.
 */
import { useEffect, useState } from 'react';

export default function CourseTimer({ deadline, lang }: { deadline: number; lang: 'fa' | 'en' }) {
  const [remaining, setRemaining] = useState(() => Math.max(0, deadline - Date.now()));

  useEffect(() => {
    const tick = () => setRemaining(Math.max(0, deadline - Date.now()));
    tick();
    const iv = window.setInterval(tick, 1000);
    return () => window.clearInterval(iv);
  }, [deadline]);

  const total = Math.ceil(remaining / 1000);
  const mm = String(Math.floor(total / 60)).padStart(2, '0');
  const ss = String(total % 60).padStart(2, '0');
  const urgent = total < 60;
  const rtl = lang === 'fa';

  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      role="timer"
      aria-label={rtl ? 'زمان باقی‌مانده برای تکمیل ثبت‌نام' : 'Remaining time to complete registration'}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 10,
        maxWidth: 600,
        margin: '0 auto',
        padding: '5px 12px',
        borderRadius: 10,
        background: urgent ? 'linear-gradient(135deg,#DC2626,#B91C1C)' : 'var(--zk-surface, #FFFFFF)',
        border: urgent ? '1px solid rgba(255,255,255,.3)' : '1px solid var(--zk-border, #E5E0D8)',
        boxShadow: urgent ? '0 4px 14px rgba(220,38,38,.3)' : 'none',
        color: urgent ? '#fff' : 'var(--zk-text-muted, #4B5563)',
        fontFamily: 'var(--zk-font, Vazirmatn, Tahoma, sans-serif)',
        fontSize: 11.5,
        fontWeight: 600,
        animation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
        WebkitAnimation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span style={{ whiteSpace: 'nowrap' }}>{rtl ? 'زمان باقی‌مانده برای تکمیل ثبت‌نام' : 'Time left to complete registration'}</span>
      </span>
      <b dir="ltr" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 12.5, letterSpacing: 1, flexShrink: 0 }}>{mm}:{ss}</b>
      <style>{`
        @keyframes zk-timer-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.02); } }
        @-webkit-keyframes zk-timer-pulse { 0%,100% { -webkit-transform: scale(1); } 50% { -webkit-transform: scale(1.02); } }
        @media (prefers-reduced-motion: reduce) {
          [role="timer"] { animation: none !important; -webkit-animation: none !important; }
        }
      `}</style>
    </div>
  );
}
