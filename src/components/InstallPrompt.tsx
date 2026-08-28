import { useEffect, useState } from 'react';

/**
 * Stage 9/11 — Install UX ملایم PWA (بهینه‌سازی‌شده برای موبایل‌فرست و RTL/LTR واقعی)
 * فقط وقتی مرورگر beforeinstallprompt را فایر کند و کاربر قبلاً نصب/رد نکرده باشد.
 * بدون هیچ منطق جدیدی؛ کاملاً ساکت در مرورگرهای بدون پشتیبانی.
 */
export default function InstallPrompt({ lang }: { lang: string }) {
  const en = lang === 'en';
  const [deferred, setDeferred] = useState<any>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const isDismissed = () => {
      try {
        return sessionStorage.getItem('zk_pwa_dismissed') === '1';
      } catch {
        return false;
      }
    };
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setDeferred(e);
      if (!isDismissed()) setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferred(null);
    };
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
    try {
      sessionStorage.setItem('zk_pwa_dismissed', '1');
    } catch {}
  };

  const install = async () => {
    try {
      deferred.prompt();
      await deferred.userChoice;
    } catch {}
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
        background: 'var(--zk-surface, #ffffff)',
        color: 'var(--zk-text, #1E293B)',
        border: '1px solid var(--zk-border, rgba(0,0,0,0.08))',
        borderRadius: 20,
        boxShadow: '0 14px 40px rgba(15, 38, 60, 0.16), 0 4px 12px rgba(15, 38, 60, 0.08)',
        padding: '12px 14px',
        fontFamily: 'inherit',
        animation: 'fadeSlide .35s cubic-bezier(0.16, 1, 0.3, 1) both',
        boxSizing: 'border-box',
      }}
      dir={en ? 'ltr' : 'rtl'}
    >
      {/* آیکون اپلیکیشن در کادر نرم */}
      <div
        style={{
          width: 44,
          height: 44,
          borderRadius: 13,
          background: 'var(--zk-primary-soft, rgba(15, 118, 110, 0.12))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--zk-primary, #0F766E)"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="5" y="2" width="14" height="20" rx="3" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
        </svg>
      </div>

      {/* بخش متنی با جلوگیری از شکستن کلمات */}
      <div style={{ flex: '1 1 auto', minWidth: 0 }}>
        <strong
          style={{
            display: 'block',
            fontSize: 13.5,
            fontWeight: 800,
            color: 'var(--zk-text, #1E293B)',
            lineHeight: 1.35,
            marginBottom: 2,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {en ? 'Install Zeynalikid' : 'نصب اپلیکیشن زینالیکید'}
        </strong>
        <span
          style={{
            display: 'block',
            fontSize: 11.5,
            color: 'var(--zk-text-muted, #64748B)',
            lineHeight: 1.4,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {en ? 'Faster access from your home screen' : 'دسترسی سریع‌تر، مثل یک اپلیکیشن'}
        </span>
      </div>

      {/* دکمه‌های عملیات */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
        <button
          type="button"
          onClick={install}
          style={{
            minHeight: 38,
            padding: '0 16px',
            borderRadius: 9999,
            border: 'none',
            background: 'var(--zk-primary, #0F766E)',
            color: 'var(--zk-text-inverse, #ffffff)',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 800,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(15, 118, 110, 0.22)',
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
          }}
        >
          {en ? 'Install' : 'نصب'}
        </button>
        <button
          type="button"
          onClick={dismiss}
          aria-label={en ? 'Dismiss' : 'بستن'}
          style={{
            width: 32,
            height: 32,
            borderRadius: 0,
            border: 'none',
            background: 'transparent',
            color: 'var(--zk-text-muted, #64748B)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: 18,
            fontFamily: 'inherit',
            lineHeight: 1,
            padding: 0,
            transition: 'background 0.2s ease',
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}
