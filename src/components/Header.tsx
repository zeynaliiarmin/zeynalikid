import React, { useState, useEffect } from 'react';
import { fetchUserQuestions } from '../lib/supabase';
import { useNavigate, useLocation } from 'react-router-dom';
import { getUserSession, clearUserSession } from '../utils/userPortal';
import { BellIcon } from './Icons';

type Lang = 'fa' | 'en';

type Props = {
  T: any;
  lang: Lang;
  setLang: (l: Lang) => void;
  adminAuthed?: boolean;
  onAdminQuestions?: () => void;
  /** فقط در حالت «پنل کاربر» — دکمهٔ آدمک/خروج در هدر صفحات عمومی */
  portalMode?: boolean;
  /** کاربر همین حالا فرم مشاوره را موفقیت‌آمیز ثبت کرده (صفحهٔ تأیید) */
  consultationComplete?: boolean;
  /** جایگاه دکمهٔ دستیار کنار آدمک در هدر */
  assistantSlot?: boolean;
};

export default function Header({
  T,
  lang,
  setLang,
  adminAuthed,
  onAdminQuestions,
  portalMode,
  consultationComplete,
  assistantSlot,
}: Props) {
  void setLang;
  const topH = T.topbarHeight || 64;
  const [pendingCount, setPendingCount] = useState(0);
  const navigate = useNavigate();
  const loc = useLocation();
  const [signedIn, setSignedIn] = useState(() => !!getUserSession());
  useEffect(() => {
    const sync = () => setSignedIn(!!getUserSession());
    window.addEventListener('zk-portal-session', sync);
    return () => window.removeEventListener('zk-portal-session', sync);
  }, []);
  useEffect(() => { window.dispatchEvent(new Event('zk-header-slot')); });
  const path = (loc.pathname || '/').replace(/\/+$/, '') || '/';
  const onPortal = path === '/track' || path === '/portal';
  const inFlow = ['/form', '/consultation', '/child-info', '/course-shipping', '/course-payment', '/course-payment/verify'].includes(path);
  const consultDoneHere = (path === '/form' || path === '/consultation') && consultationComplete === true;
  // دکمه فقط برای کاربرِ واردشده؛ در میانهٔ فرم ثبت دوره/مشاوره پنهان (حواس پرت نشود) — در صفحهٔ تأییدها نمایان
  const showUserBtn = portalMode === true && signedIn && (onPortal || !inFlow || consultDoneHere);
  const showLogout = showUserBtn && onPortal;

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
      dir={lang === 'en' ? 'rtl' : 'ltr'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1200,
        background: T.hdr || 'rgba(253,248,243,0.62)',
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
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
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
                  color: 'var(--zk-text-inverse, #fff)',
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
        {showUserBtn ? (
          <button
            type="button"
            onClick={() => {
              if (showLogout) { try { clearUserSession(); } catch { /* ignore */ } navigate('/'); }
              else { try { navigate('/portal'); } catch { /* ignore */ } }
            }}
            aria-label={showLogout ? (lang === 'en' ? 'Log out' : 'خروج از پنل') : (lang === 'en' ? 'Parent panel' : 'پنل والد')}
            title={showLogout ? (lang === 'en' ? 'Log out of your panel' : 'خروج از پنل کاربری') : (lang === 'en' ? 'Go to your panel' : 'پنل کاربری — دوره‌ها و برنامه‌ها')}
            style={{ width: 38, height: 38, borderRadius: T.btnRadius || 12, border: 'none', background: 'transparent', color: T.txt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, fontFamily: 'inherit' }}
          >
            {showLogout ? (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" /></svg>
            ) : (
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4.5 21c1.4-3.8 4.2-5.8 7.5-5.8s6.1 2 7.5 5.8" /></svg>
            )}
          </button>
        ) : null}
        {assistantSlot ? <span id="zka-header-slot" aria-hidden="true" /> : null}
      </div>

      <div
        aria-label={lang === 'fa' ? 'زینالیکید' : 'zeynalikid'}
        style={{
          fontSize: 'clamp(17px, 4.2vw, 21px)',
          fontWeight: 800,
          color: T.ttl || T.accText || 'var(--zk-primary)',
          letterSpacing: '0.3px',
          userSelect: 'none',
          fontFamily: "'Vazirmatn', Tahoma, sans-serif",
          whiteSpace: 'nowrap',
        }}
      >
        {lang === 'fa' ? 'زینالیکید' : 'zeynalikid'}
      </div>

      <div aria-hidden="true" style={{ width: 44, height: 44, flexShrink: 0 }} />
    </header>
  );
}
