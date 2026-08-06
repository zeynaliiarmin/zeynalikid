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
        position: 'fixed', bottom: 'calc(14px + env(safe-area-inset-bottom, 0px))',
        insetInlineStart: '50%', transform: 'translateX(50%)', zIndex: 1200,
        display: 'flex', alignItems: 'center', gap: 10,
        background: 'var(--zk-surface, #fff)', color: 'var(--zk-text)',
        border: '1px solid var(--zk-border)', borderRadius: 16,
        boxShadow: 'var(--zk-shadow-medium, 0 5px 20px rgba(0,0,0,.1))',
        padding: '10px 14px', maxWidth: 'min(92vw, 420px)',
        fontFamily: 'inherit', animation: 'fadeSlide .3s ease both',
      }}
      dir={en ? 'ltr' : 'rtl'}
    >
      <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--zk-primary, #0F766E)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="7" y="2.5" width="10" height="19" rx="2.5" /><path d="M11 18.5h2" />
      </svg>
      <div style={{ flex: 1, minWidth: 0 }}>
        <b style={{ fontSize: 12.5, display: 'block' }}>{en ? 'Install Zeynalikid' : 'نصب اپلیکیشن زینالیکید'}</b>
        <small style={{ color: 'var(--zk-text-muted)', fontSize: 10.5 }}>{en ? 'Faster access, right from your home screen' : 'دسترسی سریع‌تر، مثل یک اپلیکیشن'}</small>
      </div>
      <button type="button" onClick={install} style={{ minHeight: 40, padding: '8px 14px', borderRadius: 999, border: 0, background: 'var(--zk-primary, #0F766E)', color: '#fff', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, cursor: 'pointer' }}>
        {en ? 'Install' : 'نصب'}
      </button>
      <button type="button" onClick={dismiss} aria-label={en ? 'Dismiss' : 'فعلاً نه'} style={{ minHeight: 40, minWidth: 40, border: 0, background: 'transparent', color: 'var(--zk-text-muted)', cursor: 'pointer', fontSize: 16, fontFamily: 'inherit' }}>×</button>
    </div>
  );
}
