/**
 * GlassTopBar — نوار بالای شیشه‌ای برای صفحات ورود ادمین و پیگیری
 * جایگزین هدر/منوی سایت در این صفحات تا ظاهر با طراحی گلسمورفیسم هماهنگ بماند.
 * شامل: دکمهٔ بازگشت + نام برند + سوییچر زبان (فا/EN) — همه به سبک شیشه‌ای.
 */
import React from 'react';

interface Props {
  brand: string;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  onBack?: () => void;
  backLabel?: string;
  /** نمایش سوییچر زبان (برای صفحهٔ ورود ادمین خاموش است) */
  showLang?: boolean;
}

export default function GlassTopBar({ brand, lang, setLang, onBack, backLabel = 'بازگشت', showLang = true }: Props) {
  const rtl = lang === 'fa';
  return (
    <div className="zkgl-topbar" dir={rtl ? 'rtl' : 'ltr'}>
      {onBack ? (
        <button type="button" className="zkgl-topbtn" onClick={onBack} aria-label={backLabel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rtl ? 'none' : 'scaleX(-1)', display: 'block' }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>{backLabel}</span>
        </button>
      ) : (
        <span className="zkgl-topspacer" aria-hidden="true" />
      )}
      <span className="zkgl-topbrand">{brand}</span>
      {showLang ? (
        <div className="zkgl-lang" role="group" aria-label="Language">
          <button type="button" className={lang === 'fa' ? 'zkgl-lang-on' : ''} onClick={() => setLang('fa')}>فا</button>
          <span className="zkgl-langsep" aria-hidden="true">/</span>
          <button type="button" className={lang === 'en' ? 'zkgl-lang-on' : ''} onClick={() => setLang('en')}>EN</button>
        </div>
      ) : (
        <span className="zkgl-topspacer" aria-hidden="true" />
      )}
    </div>
  );
}
