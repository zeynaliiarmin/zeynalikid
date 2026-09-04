/**
 * StarRatingInput — امتیازدهی ستاره‌ای تعاملی با انیمیشن
 * الهام از نمونه «star-rating»:
 *  • انتخاب ستاره → حلقه نبض + پر شدن فنری + برچسب متنی («خیلی بد … عالی»)
 *  • هاور → پیش‌نمایش پر شدن ستاره‌ها (دسکتاپ)؛ لمس → انتخاب مستقیم
 *  • فقط transform/opacity انیمیت می‌شود → سبک و بدون تأثیر منفی روی سرعت
 *  • دسترس‌پذیر: radiogroup + aria-checked + احترام به prefers-reduced-motion
 *  • رنگ طلایی (#F59E0B) هماهنگ با ستاره‌های فعلی سایت
 */
import React, { useState } from 'react';

const LABELS_FA = ['خیلی بد', 'بد', 'متوسط', 'خوب', 'عالی'];
const LABELS_EN = ['Terrible', 'Poor', 'Okay', 'Good', 'Excellent'];
const STAR_POINTS = '12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2';

interface Props {
  value: number;
  onChange: (v: number) => void;
  lang: 'fa' | 'en';
  size?: number;
}

export default function StarRatingInput({ value, onChange, lang, size = 30 }: Props) {
  const isFa = lang === 'fa';
  const [hover, setHover] = useState<number | null>(null);
  const [ringTick, setRingTick] = useState(0);
  const labels = isFa ? LABELS_FA : LABELS_EN;
  const effective = hover ?? value;
  const activeLabel = labels[effective - 1] || '';

  const pick = (star: number) => {
    setRingTick((t) => t + 1);
    onChange(star);
  };

  return (
    <div className="zkr-root">
      <style>{`
        .zkr-root{display:inline-flex;align-items:center;gap:12px;min-height:44px}
        .zkr-stars{display:flex;gap:2px;direction:ltr}
        .zkr-star{border:0;background:transparent;padding:3px;cursor:pointer;color:var(--zk-text-subtle,#94A3B8);border-radius:10px;transition:transform .15s var(--zk-ease,cubic-bezier(.2,0,0,1)),color .2s ease;-webkit-tap-highlight-color:transparent;display:inline-flex}
        .zkr-star:hover,.zkr-star:focus-visible{transform:translateY(-2px);outline:none}
        .zkr-star:focus-visible{box-shadow:0 0 0 2px var(--zk-accent,#0EA5E9)}
        .zkr-star.zkr-filled{color:var(--zk-warning)}
        .zkr-star svg{display:block;overflow:visible}
        .zkr-fill{transform:scale(0);transform-origin:center;transform-box:fill-box;transition:transform .28s cubic-bezier(.34,1.56,.64,1)}
        .zkr-filled .zkr-fill{transform:scale(1);animation:zkr-fill .42s cubic-bezier(.34,1.56,.64,1) both}
        .zkr-ring{stroke:var(--zk-warning);stroke-width:2.4;transform-origin:center;transform-box:fill-box;animation:zkr-ring .6s ease-out both}
        .zkr-label{min-width:58px;font-size:12.5px;font-weight:800;color:var(--zk-warning);animation:zkr-label .3s ease both}
        @keyframes zkr-ring{0%{transform:scale(.6);opacity:.9}70%{transform:scale(1.45);opacity:0}100%{transform:scale(1.45);opacity:0}}
        @-webkit-keyframes zkr-ring{0%{-webkit-transform:scale(.6);opacity:.9}70%{-webkit-transform:scale(1.45);opacity:0}100%{-webkit-transform:scale(1.45);opacity:0}}
        @keyframes zkr-fill{0%{transform:scale(0)}55%{transform:scale(1.28)}75%{transform:scale(.92)}100%{transform:scale(1)}}
        @-webkit-keyframes zkr-fill{0%{-webkit-transform:scale(0)}55%{-webkit-transform:scale(1.28)}75%{-webkit-transform:scale(.92)}100%{-webkit-transform:scale(1)}}
        @keyframes zkr-label{from{opacity:0;transform:translateY(4px)}to{opacity:1;transform:translateY(0)}}
        @-webkit-keyframes zkr-label{from{opacity:0;-webkit-transform:translateY(4px)}to{opacity:1;-webkit-transform:translateY(0)}}
        @media (prefers-reduced-motion: reduce){
          .zkr-ring,.zkr-fill,.zkr-label{animation:none!important;-webkit-animation:none!important;transition:none!important}
          .zkr-fill{transform:scale(1)!important}
        }
      `}</style>
      <div className="zkr-stars" role="radiogroup" aria-label={isFa ? 'امتیاز شما' : 'Your rating'}>
        {[1, 2, 3, 4, 5].map((star) => {
          const filled = star <= effective;
          const selected = star === value;
          return (
            <button
              type="button"
              key={star}
              role="radio"
              aria-checked={selected}
              aria-label={`${star} ${isFa ? 'از ۵' : 'out of 5'} — ${labels[star - 1]}`}
              className={`zkr-star${filled ? ' zkr-filled' : ''}`}
              style={{ width: size, height: size }}
              onMouseEnter={() => setHover(star)}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover(star)}
              onBlur={() => setHover(null)}
              onClick={() => pick(star)}
            >
              <svg viewBox="0 0 24 24" width={size - 6} height={size - 6} aria-hidden="true" focusable="false">
                {selected && (
                  <circle key={ringTick} className="zkr-ring" cx="12" cy="12" r="10" fill="none" />
                )}
                <polygon className="zkr-stroke" points={STAR_POINTS} fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
                <polygon className="zkr-fill" points={STAR_POINTS} fill="currentColor" stroke="none" />
              </svg>
            </button>
          );
        })}
      </div>
      <div className="zkr-label" key={effective} dir={isFa ? 'rtl' : 'ltr'}>
        {activeLabel}
      </div>
    </div>
  );
}
