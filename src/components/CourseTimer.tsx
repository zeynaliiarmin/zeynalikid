/**
 * CourseTimer — تایمر ۱۵ دقیقه‌ای روند ثبت دوره (اعتمادسازی، مثل درگاه‌های پرداخت)
 * فقط نمایشی است: شمارش معکوس را نشان می‌دهد و در ثانیه‌های پایانی قرمز می‌شود.
 * طراحی واضح و متمایز تا در جریان صفحه همیشه دیده شود (نه اینکه زیر هدر/محو باشد).
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
        padding: '10px 16px',
        borderRadius: 16,
        background: urgent
          ? 'linear-gradient(135deg,#DC2626,#B91C1C)'
          : 'linear-gradient(135deg, var(--zk-primary, #0F766E), var(--zk-accent, #0EA5E9))',
        border: '1px solid rgba(255,255,255,0.28)',
        boxShadow: urgent ? '0 8px 24px rgba(220,38,38,.35)' : '0 8px 24px rgba(15,118,110,.28)',
        color: '#fff',
        fontFamily: 'var(--zk-font, Vazirmatn, Tahoma, sans-serif)',
        fontSize: 13,
        fontWeight: 700,
        animation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
        WebkitAnimation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
        <span style={{ whiteSpace: 'nowrap' }}>{rtl ? 'زمان باقی‌مانده برای تکمیل ثبت‌نام' : 'Time left to complete registration'}</span>
      </span>
      <b dir="ltr" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 16, letterSpacing: 1, flexShrink: 0 }}>{mm}:{ss}</b>
      <style>{`
        @keyframes zk-timer-pulse { 0%,100% { transform: scale(1); } 50% { transform: scale(1.015); } }
        @-webkit-keyframes zk-timer-pulse { 0%,100% { -webkit-transform: scale(1); } 50% { -webkit-transform: scale(1.015); } }
        @media (prefers-reduced-motion: reduce) {
          [role="timer"] { animation: none !important; -webkit-animation: none !important; }
        }
      `}</style>
    </div>
  );
}
