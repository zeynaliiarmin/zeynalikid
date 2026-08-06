import React, { useState, useEffect } from 'react';
import LanguageSwitcher from './LanguageSwitcher';
import { fetchUserQuestions } from '../lib/supabase';
import { BellIcon } from './Icons';

type Lang = 'fa' | 'en';

type Props = {
  T: any;
  lang: Lang;
  setLang: (l: Lang) => void;
  adminAuthed?: boolean;
  onAdminQuestions?: () => void;
};

export default function Header({
  T,
  lang,
  setLang,
  adminAuthed,
  onAdminQuestions,
}: Props) {
  const topH = T.topbarHeight || 64;
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    if (!adminAuthed) return;
    let active = true;
    const loadCount = async () => {
      try {
        const list = await fetchUserQuestions('pending');
        if (active) setPendingCount((list || []).length);
      } catch (e) {
        console.error('count fail', e);
      }
    };
    loadCount();
    const iv = setInterval(loadCount, 30000);
    return () => {
      active = false;
      clearInterval(iv);
    };
  }, [adminAuthed]);

  return (
    <header
      dir="ltr"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        background: T.hdr || 'rgba(253,248,243,0.94)',
        backdropFilter: 'blur(18px) saturate(160%)',
        WebkitBackdropFilter: 'blur(18px) saturate(160%)',
        borderBottom: `1px solid ${T.brd || 'var(--zk-border)'}`,
        boxShadow: T.shadowLight || '0 3px 12px rgba(15,23,42,0.06)',
        padding: 'calc(6px + var(--zk-safe-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 6px max(14px, env(safe-area-inset-left, 0px))',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        minHeight: topH,
        height: `calc(${topH}px + var(--zk-safe-top, 0px))`,
        boxSizing: 'border-box',
        fontFamily: 'var(--zk-font)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {adminAuthed && (
          <button
            type="button"
            onClick={onAdminQuestions}
            aria-label={lang === 'en' ? 'User Questions' : 'سوالات کاربران'}
            title={lang === 'en' ? 'User Questions' : 'سوالات کاربران'}
            style={{
              position: 'relative',
              width: 38,
              height: 38,
              borderRadius: T.btnRadius || 12,
              border: `1px solid ${T.brd}`,
              background: T.card || '#fff',
              color: T.txt,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
              fontFamily: 'inherit',
            }}
          >
            <BellIcon size={20} color={T.txt} />
            {pendingCount > 0 && (
              <span
                style={{
                  position: 'absolute',
                  top: -4,
                  [lang === 'en' ? 'right' : 'left']: -4,
                  width: 18,
                  height: 18,
                  borderRadius: 9,
                  background: T.err || '#e53e3e',
                  color: '#fff',
                  fontSize: 10,
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  lineHeight: 1,
                }}
              >
                {pendingCount >= 10 ? '۹+' : pendingCount}
              </span>
            )}
          </button>
        )}
        <LanguageSwitcher lang={lang} setLang={setLang} T={T} />
      </div>

      <div
        aria-label="Zeynalikid"
        style={{
          fontSize: 'clamp(17px, 4.2vw, 21px)',
          fontWeight: 800,
          color: T.ttl || T.acc || 'var(--zk-primary)',
          letterSpacing: '0.3px',
          userSelect: 'none',
          fontFamily: "'Vazirmatn', Tahoma, sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        Zeynalikid
      </div>

      <div aria-hidden="true" style={{ width: 44, height: 44, flexShrink: 0 }} />
    </header>
  );
}
