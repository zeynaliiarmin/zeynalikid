import { useEffect, useState } from 'react';

/**
 * Stage 9 — Install UX ملایم PWA
 * فقط وقتی مرورگر beforeinstallprompt را فایر کند و کاربر قبلاً نصب/رد نکرده باشد.
 * بدون هیچ منطق جدیدی؛ کاملاً ساکت در مرورگرهای بدون پشتیبانی.
 */
export default function InstallPrompt({ lang }: { lang: string }) {
  const en = lang === 'en';
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = () => { try { return sessionStorage.getItem('zk_pwa_dismissed') === '1'; } catch { return false; } };
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      if (!isDismissed()) setVisible(true);
    };
    const onInstalled = () => { setVisible(false); setDeferred(null); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  if (!visible || !deferred) return null;
  const dismiss = () => {
    setVisible(false);
    try { sessionStorage.setItem('zk_pwa_dismissed', '1'); } catch {}
  };
  const install = async () => {
    try { deferred.prompt(); await deferred.userChoice; } catch {}
    dismiss();
  };

  return (
    <div
      role="dialog"
      aria-label={en ? 'Install Zeynalikid app' : 'نصب اپلیکیشن زینالیکید'}
      style={{
        position: 'fixed',
        bottom: 'calc(16px + env(safe-area-inset-bottom, 0px))',
        left: 16,
        right: 16,
        margin: '0 auto',
        width: 'calc(100% - 32px)',
        maxWidth: 440,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        background: 'var(--zk-surface, #fff)',
        color: 'var(--zk-text)',
        border: '1px solid var(--zk-border)',
        borderRadius: 20,
        boxShadow: '0 14px 40px rgba(15,38,60,.16)',
        padding: '12px 14px',
        fontFamily: 'inherit',
        animation: 'fadeSlide .3s ease both',
      }}
      dir={en ? 'ltr' : 'rtl'}
    >
      {/* App Icon — 44×44 with soft teal background */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: 'rgba(15, 118, 110, 0.12)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="26"
          height="26"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--zk-primary, #0F766E)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="7" y="2.5" width="10" height="19" rx="2.5" />
          <path d="M11 18.5h2" />
        </svg>
      </div>

      {/* Text container — NO vertical word wrapping */}
      <div
        style={{
          flex: 1,
          minWidth: 0,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
        }}
      >
        <b
          style={{
            fontSize: 13,
            fontWeight: 800,
            lineHeight: 1.3,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {en ? 'Install Zeynalikid' : 'نصب اپلیکیشن زینالیکید'}
        </b>
        <small
          style={{
            color: 'var(--zk-text-muted)',
            fontSize: 11,
            lineHeight: 1.35,
            display: 'block',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {en ? 'Faster access, right from your home screen' : 'دسترسی سریع‌تر، مثل یک اپلیکیشن'}
        </small>
      </div>

      {/* Install Button — Pill shape with neomorphic shadow */}
      <button
        type="button"
        onClick={install}
        style={{
          minHeight: 42,
          padding: '0 18px',
          borderRadius: 999,
          border: 0,
          background: 'var(--zk-primary, #0F766E)',
          color: '#fff',
          fontFamily: 'inherit',
          fontSize: 13,
          fontWeight: 800,
          cursor: 'pointer',
          boxShadow: '0 3px 8px rgba(15, 118, 110, 0.25)',
          flexShrink: 0,
          whiteSpace: 'nowrap',
        }}
      >
        {en ? 'Install' : 'نصب'}
      </button>

      {/* Dismiss Button — 32×32 circle */}
      <button
        type="button"
        onClick={dismiss}
        aria-label={en ? 'Dismiss' : 'فعلاً نه'}
        style={{
          width: 32,
          height: 32,
          minWidth: 32,
          minHeight: 32,
          borderRadius: '50%',
          border: 0,
          background: 'var(--zk-surface-muted, #f1f5f9)',
          color: 'var(--zk-text-muted)',
          cursor: 'pointer',
          fontSize: 18,
          fontFamily: 'inherit',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
          lineHeight: 1,
        }}
      >
        ×
      </button>
    </div>
  );
}
