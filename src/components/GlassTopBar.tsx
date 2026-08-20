/**
 * GlassTopBar — نوار بالای شیشه‌ای برای صفحات ورود ادمین و پیگیری
 * جایگزین هدر/منوی سایت در این صفحات تا ظاهر با طراحی گلسمورفیسم هماهنگ بماند.
 * شامل: دکمهٔ بازگشت (فلش خروج) + نام برند + سوییچر زبان (کارت هوم با طرح شیشه‌ای).
 */
import React from 'react';
import LanguageSwitcher from './LanguageSwitcher';

interface Props {
  brand: string;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  T?: any;
  onBack?: () => void;
  backLabel?: string;
  /** نمایش سوییچر زبان (برای صفحهٔ ورود ادمین خاموش است) */
  showLang?: boolean;
}

export default function GlassTopBar({ brand, lang, setLang, T, onBack, backLabel = 'بازگشت', showLang = true }: Props) {
  const rtl = lang === 'fa';
  return (
    <div className="zkgl-topbar" dir={rtl ? 'rtl' : 'ltr'}>
      {onBack ? (
        <button type="button" className="zkgl-topbtn" onClick={onBack} aria-label={backLabel}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: rtl ? 'scaleX(-1)' : 'none', display: 'block' }}>
            <path d="M15 18l-6-6 6-6" />
          </svg>
          <span>{backLabel}</span>
        </button>
      ) : (
        <span className="zkgl-topspacer" aria-hidden="true" />
      )}
      <span className="zkgl-topbrand">{brand}</span>
      {showLang ? (
        <LanguageSwitcher lang={lang} setLang={setLang} T={T || {}} glass />
      ) : (
        <span className="zkgl-topspacer" aria-hidden="true" />
      )}
    </div>
  );
}
