// PortalHeader — هدر کامل صفحات پنل کاربر / پیگیری / ورود مدیریت
// دقیقاً مثل هدر واقعی سایت: «فا» + پشتیبانی (چت) در راست، لوگو وسط، همبرگر در چپ؛
// دکمهٔ بازگشت داخل منوی همبرگری با فلش رو به راست (درست برای فارسی/RTL)
import React, { useEffect, useRef, useState } from 'react';

export interface PortalHeaderProps {
  brand: string;
  lang: 'fa' | 'en';
  setLang: (l: 'fa' | 'en') => void;
  T: any;
  darkGlass?: boolean;
  onHome?: () => void;
  onCourses?: () => void;
  onSupport?: () => void;
  onTrack?: () => void;
  /** بازگشت — داخل منو قرار می‌گیرد */
  onBack?: () => void;
  backLabel?: string;
}

export default function PortalHeader({ brand, lang, setLang, T, darkGlass, onHome, onCourses, onSupport, onTrack, onBack, backLabel = 'بازگشت' }: PortalHeaderProps) {
  const rtl = lang === 'fa';
  const acc = T.acc || '#7A12D4';
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | TouchEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('click', close);
    document.addEventListener('touchstart', close);
    return () => { document.removeEventListener('click', close); document.removeEventListener('touchstart', close); };
  }, [open]);

  const btn: React.CSSProperties = {
    width: 44, height: 44, borderRadius: 15, display: 'grid', placeItems: 'center',
    background: darkGlass ? 'rgba(255,255,255,.09)' : 'rgba(255,255,255,.6)',
    border: `1px solid ${darkGlass ? 'rgba(255,255,255,.14)' : 'rgba(0,0,0,.06)'}`,
    color: darkGlass ? '#fff' : T.txt, fontFamily: 'inherit', fontSize: 13, fontWeight: 900,
    cursor: 'pointer', boxShadow: darkGlass ? '0 4px 14px rgba(0,0,0,.3)' : '0 4px 14px rgba(0,0,0,.08)',
    transition: '.16s',
  } as React.CSSProperties;
  const icon = { width: 19, height: 19, stroke: 'currentColor', fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const menuBg = darkGlass ? 'linear-gradient(165deg,#241C33,#1D1627)' : 'linear-gradient(165deg,#fff,#FBF8F3)';
  const menuBd = darkGlass ? 'rgba(255,255,255,.08)' : 'rgba(255,255,255,.8)';
  const menuItem: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '12px 13px', borderRadius: 15,
    background: 'transparent', border: 0, color: darkGlass ? '#F2EAFC' : T.txt, fontFamily: 'inherit',
    fontSize: 13.5, fontWeight: 800, cursor: 'pointer', textAlign: 'start',
  } as React.CSSProperties;
  const miIcon = { width: 17, height: 17, stroke: darkGlass ? '#C9A2F8' : acc, fill: 'none', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' } as const;
  const item = (label: string, path: string, cb?: () => void, back = false) => (
    <button type="button" className="zp-mi" style={{ ...menuItem, color: back ? (darkGlass ? '#C9A2F8' : acc) : menuItem.color, justifyContent: back ? 'flex-start' : undefined }}
      onClick={() => { setOpen(false); cb && cb(); }}>
      <svg viewBox="0 0 24 24" style={miIcon}><path d={path} /></svg>
      {label}
    </button>
  );

  return (
    <div className="zp-topbar" dir={rtl ? 'rtl' : 'ltr'}>
      <div className="zp-g-r">
        <button type="button" className="zp-sq" style={btn} aria-label="Language"
          onClick={() => setLang(lang === 'fa' ? 'en' : 'fa')}>{lang === 'fa' ? 'فا' : 'EN'}</button>
        <button type="button" className="zp-sq" style={btn} aria-label="Support" onClick={onSupport}>
          <svg viewBox="0 0 24 24" style={icon}><path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-3.2-.6L4 21l1.6-4.4a8.2 8.2 0 0 1-1.1-4.1A8.4 8.4 0 0 1 13 4.1a8.4 8.4 0 0 1 8 7.4z" /><path d="M8.5 10.5h7M8.5 13.5h4.5" /></svg>
        </button>
      </div>
      <button type="button" className="zp-brand" onClick={onHome} style={{ background: 'transparent', border: 0, cursor: 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', gap: 9 }}>
        <span className="zp-logo" aria-hidden="true">
          <span className="zp-h" style={{ background: `linear-gradient(135deg,${darkGlass ? '#C9A2F8' : acc},${T.grad2 || '#DF1A6F'})` }} />
          <span className="zp-l" style={{ background: `linear-gradient(160deg,${T.grad2 || '#DF1A6F'},#0F766E)` }} />
        </span>
        <span className="zp-mark" style={{ color: darkGlass ? '#fff' : acc }}>{brand}</span>
      </button>
      <div className="zp-g-l" ref={boxRef}>
        <button type="button" className="zp-sq zp-burger" style={btn} aria-label="Menu" aria-expanded={open}
          onClick={(e) => { e.stopPropagation(); setOpen(v => !v); }}>
          <svg viewBox="0 0 24 24" style={icon}><path d="M4 7h16M4 12h16M4 17h10" /></svg>
        </button>
        {open && (
          <div className="zp-menu" style={{ background: menuBg, border: `1px solid ${menuBd}` }}>
            {onHome && item(lang === 'en' ? 'Home' : 'صفحهٔ اصلی', 'M3 11 12 3l9 8' + 'M5 10v10h14V10', onHome)}
            {onCourses && item(lang === 'en' ? 'Courses' : 'مشاهدهٔ دوره‌ها', 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5z', onCourses)}
            {onTrack && item(lang === 'en' ? 'My account' : 'پنل کاربر', 'M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A7 7 0 0 1 12.5 3z', onTrack)}
            {onSupport && item(lang === 'en' ? 'Support' : 'مشاوره و پشتیبانی', 'M21 11.5a8.4 8.4 0 0 1-8.5 8.4 8.9 8.9 0 0 1-3.2-.6L4 21l1.6-4.4a8.2 8.2 0 0 1-1.1-4.1A8.4 8.4 0 0 1 13 4.1a8.4 8.4 0 0 1 8 7.4z', onSupport)}
            {onBack && (
              <>
                <div className="zp-msep" style={{ background: darkGlass ? 'rgba(255,255,255,.09)' : 'rgba(0,0,0,.07)' }} />
                {item(backLabel, 'M9 6l6 6-6 6', onBack, true)}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
