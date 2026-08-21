/**
 * CourseTimer — تایمر ۱۵ دقیقه‌ای روند ثبت دوره (اعتمادسازی، مثل درگاه‌های پرداخت)
 * فقط نمایشی است: شمارش معکوس را نشان می‌دهد و در ثانیه‌های پایانی قرمز می‌شود.
 * هیچ منطق ذخیره/حذف اطلاعاتی انجام نمی‌دهد.
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
        justifyContent: 'center',
        gap: 8,
        margin: '0 auto 12px',
        maxWidth: 600,
        padding: '10px 14px',
        borderRadius: 16,
        background: urgent ? '#FEF2F2' : 'var(--zk-surface, #fff)',
        border: urgent ? '1.5px solid #FCA5A5' : '1px solid var(--zk-border, #E5E0D8)',
        boxShadow: 'var(--zk-shadow-light, 0 4px 15px rgba(15,23,42,.06))',
        color: urgent ? '#B91C1C' : 'var(--zk-text, #1F2937)',
        fontFamily: 'var(--zk-font, Vazirmatn, Tahoma, sans-serif)',
        fontSize: 13,
        fontWeight: 700,
        animation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
        WebkitAnimation: urgent ? 'zk-timer-pulse 1s ease-in-out infinite' : undefined,
      }}
    >
      <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </svg>
      <span>{rtl ? 'زمان باقی‌مانده برای تکمیل ثبت‌نام:' : 'Time left to complete registration:'}</span>
      <b dir="ltr" style={{ fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace', fontSize: 14, letterSpacing: 1 }}>{mm}:{ss}</b>
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
