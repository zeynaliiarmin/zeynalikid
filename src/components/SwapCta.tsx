import React, { useEffect, useRef, useState } from 'react';
import './zkCta.css';

/**
 * SwapCta — دکمهٔ اصلی با «تعویض نرم متن» روی هاور (دسکتاپ) و تعویض خودکار (موبایل/لمسی).
 * الهام از ترفند Hover-Swap اینستاگرامی، اما بازطراحی‌شده برای پروژه:
 *  • تمام رنگ‌ها/سایه‌ها از توکن‌های CSS گرفته می‌شوند → با هر تم/دیزاین و حالت تیره خودکار هماهنگ می‌شود.
 *  • دو متن واقعی (نه content جعلی CSS) → دسترس‌پذیر، دو زبانه و بدون لرزش عرض.
 *  • نسخهٔ لمسی: روی دستگاه‌های بدون هاور، متن به‌آرامی و دوره‌ای عوض می‌شود و هنگام لمس متوقف می‌شود.
 *  • احترام کامل به prefers-reduced-motion.
 */
interface SwapCtaProps {
  /** نوع بصری دکمه */
  variant?: 'consult' | 'enroll';
  /** متن پیش‌فرض (و برچسب معنایی دکمه) */
  labelA: string;
  /** متن جایگزین که روی هاور/تعویض خودکار دیده می‌شود */
  labelB: string;
  onClick?: () => void;
  /** فعال بودن انیمیشن تپش (حالت لینک ارجاع / تپش بعد از کلیک CTA پایین) */
  pulse?: boolean;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}

const SwapCta = React.forwardRef<HTMLButtonElement, SwapCtaProps>(function SwapCta(
  { variant = 'consult', labelA, labelB, onClick, pulse = false, className = '', style, type = 'button', ariaLabel },
  ref,
) {
  const [swapped, setSwapped] = useState(false);
  const intervalRef = useRef<number | null>(null);

  // تعویض خودکار متن فقط روی دستگاه‌های لمسی (بدون هاور) — با توقف هنگام لمس.
  useEffect(() => {
    let hoverable = true;
    let reduced = false;
    try {
      hoverable = window.matchMedia('(hover: hover)').matches;
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    } catch { hoverable = true; }
    if (hoverable || reduced) return;

    const stop = () => {
      if (intervalRef.current !== null) { window.clearInterval(intervalRef.current); intervalRef.current = null; }
    };
    const start = () => {
      stop();
      intervalRef.current = window.setInterval(() => setSwapped((v) => !v), 2600);
    };
    start();
    const onDown = () => stop();
    const onUp = () => { stop(); window.setTimeout(() => start(), 1200); };
    const onVis = () => { if (document.hidden) stop(); else start(); };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('pointerup', onUp);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      stop();
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('pointerup', onUp);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, []);

  const cls = [
    'zk-swap-cta',
    variant === 'enroll' ? 'zk-swap-enroll' : 'zk-swap-consult',
    swapped ? 'zk-swap-on' : '',
    pulse ? 'zk-swap-pulse' : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button ref={ref} type={type} onClick={onClick} className={cls} style={style} aria-label={ariaLabel || labelA}>
      <span className="zk-swap-viewport" aria-hidden="true">
        <span className="zk-swap-stack">
          <span className="zk-swap-line">{labelA}</span>
          <span className="zk-swap-line">{labelB}</span>
        </span>
      </span>
    </button>
  );
});

export default SwapCta;
