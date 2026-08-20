import React, { useEffect, useRef, useState } from 'react';
import './zkCta.css';

/**
 * SwapCta — دکمهٔ اصلی با «تعویض نرم متن» روی هاور (دسکتاپ) و تعویض خودکار (موبایل/لمسی).
 * الهام از ترفند Hover-Swap اینستاگرامی، اما بازطراحی‌شده برای پروژه:
 *  • دو طرح مجزا: «مشاوره» (بنفشِ هماهنگ با برند) و «ثبت‌نام دوره» (گرادیان primary/accent تم).
 *  • فقط یک متن در لحظه دیده می‌شود (viewport با ارتفاع دقیق یک خط).
 *  • سلسله‌مراتب با رنگ (mode) نه با درخشش دائمی: دکمهٔ ثبت دوره وقتی تب مشاوره باز است
 *    به حالت محوتر (muted) می‌رود و با بسته شدن تب، با انیمیشن به طرح اصلی برمی‌گردد.
 *  • تپش (pulse) فقط در حالت لینک ارجاع یا بعد از کلیک روی دکمهٔ پایین صفحه فعال می‌شود.
 *  • نسخهٔ لمسی: روی دستگاه‌های بدون هاور، متن به‌آرامی و دوره‌ای عوض می‌شود و هنگام لمس متوقف می‌شود.
 *  • احترام کامل به prefers-reduced-motion.
 */
interface SwapCtaProps {
  /** نوع بصری دکمه */
  variant?: 'consult' | 'enroll';
  /** سلسله‌مراتب رنگی دکمهٔ ثبت‌نام (primary = طرح اصلی، muted = محو وقتی مشاوره در کانون توجه است) */
  mode?: 'primary' | 'muted';
  /** متن پیش‌فرض (و برچسب معنایی دکمه) */
  labelA: string;
  /** متن جایگزین که روی هاور/تعویض خودکار دیده می‌شود */
  labelB: string;
  onClick?: () => void;
  /** تپش قوی (یک‌بار، بعد از کلیک روی CTA پایین / حالت لینک ارجاع) */
  pulse?: boolean;
  id?: string;
  className?: string;
  style?: React.CSSProperties;
  type?: 'button' | 'submit';
  ariaLabel?: string;
}

const SwapCta = React.forwardRef<HTMLButtonElement, SwapCtaProps>(function SwapCta(
  { variant = 'consult', mode = 'primary', labelA, labelB, onClick, pulse = false, id, className = '', style, type = 'button', ariaLabel },
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
    <button ref={ref} id={id} type={type} onClick={onClick} className={cls} data-mode={mode} style={style} aria-label={ariaLabel || labelA}>
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
