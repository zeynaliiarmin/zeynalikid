import { useEffect, useRef, useState } from 'react';

/**
 * ZkDialog — جایگزین مدرن و هماهنگ‌با‌طراحی برای alert()/confirm() بومی مرورگر.
 *
 * استفاده:
 *   import { zkAlert, zkConfirm } from '../components/ZkDialog';
 *   zkAlert("ذخیره شد");
 *   if (zkConfirm("مطمئنی حذف کنم؟")) { ... }
 *
 * نکته: تابع‌ها async/await لازم ندارند اما چون از Promise استفاده می‌کنند،
 * در onClick/onChange لازم است آن را به async callback تبدیل کنید
 * (اسکریپت نصب این کار را به‌طور خودکار انجام می‌دهد).
 */
export type DialogType = 'alert' | 'confirm';
export interface DialogOptions {
  title?: string;
  okText?: string;
  cancelText?: string;
  tone?: 'info' | 'warn' | 'danger';
}

interface DialogState {
  open: boolean;
  type: DialogType;
  message: string;
  title?: string;
  okText: string;
  cancelText: string;
  tone: 'info' | 'warn' | 'danger';
  resolve?: (v: boolean) => void;
}

let openDialog: ((s: Omit<DialogState, 'open' | 'resolve'>) => Promise<boolean>) | null = null;

export function zkAlert(message: string, opts: DialogOptions = {}): Promise<void> {
  if (!openDialog) {
    window.alert(message);
    return Promise.resolve();
  }
  return openDialog({
    type: 'alert',
    message,
    title: opts.title,
    okText: opts.okText || 'تأیید',
    cancelText: opts.cancelText || 'انصراف',
    tone: opts.tone || 'info',
  }).then(() => undefined);
}

export function zkConfirm(message: string, opts: DialogOptions = {}): Promise<boolean> {
  if (!openDialog) return Promise.resolve(window.confirm(message));
  return openDialog({
    type: 'confirm',
    message,
    title: opts.title,
    okText: opts.okText || 'تأیید',
    cancelText: opts.cancelText || 'انصراف',
    tone: opts.tone || 'warn',
  });
}

export default function ZkDialog() {
  const [state, setState] = useState<DialogState | null>(null);
  const dialogRef = useRef<HTMLDivElement | null>(null);
  const okRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    openDialog = (s) =>
      new Promise<boolean>((resolve) => {
        setState({ open: true, ...s, resolve });
        setTimeout(() => okRef.current?.focus(), 30);
      });
    return () => { openDialog = null; };
  }, []);

  useEffect(() => {
    if (!state) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close(false);
      if (e.key === 'Enter' && state.type === 'alert') close(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const close = (v: boolean) => {
    state?.resolve?.(v);
    setState((s) => (s ? { ...s, open: false, resolve: undefined } : s));
  };

  if (!state || !state.open) return null;

  const toneColor =
    state.tone === 'danger' ? '#DC2626' :
    state.tone === 'warn' ? '#D97706' :
    '#0F766E';

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-labelledby="zk-dialog-title"
      style={{
        position: 'fixed', inset: 0, zIndex: 2147483000,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(4px)',
        display: 'grid', placeItems: 'center', padding: 20,
        animation: 'zk-dialog-fade 150ms ease-out',
      }}
      onClick={(e) => { if (e.target === dialogRef.current) close(state.type === 'alert'); }}
    >
      <style>{`
        @keyframes zk-dialog-fade { from { opacity: 0 } to { opacity: 1 } }
        @keyframes zk-dialog-pop { from { transform: translateY(12px) scale(.98); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }
      `}</style>
      <div
        style={{
          width: '100%', maxWidth: 380, background: '#ffffff', color: '#0F172A',
          borderRadius: 18, padding: '22px 20px 16px', direction: 'rtl',
          boxShadow: '0 20px 60px rgba(2,6,23,0.25), 0 2px 8px rgba(2,6,23,0.08)',
          fontFamily: 'Vazirmatn, system-ui, sans-serif',
          animation: 'zk-dialog-pop 180ms ease-out',
        }}
      >
        {state.title && (
          <h3 id="zk-dialog-title" style={{ margin: '0 0 10px', fontSize: 16, fontWeight: 800, color: toneColor }}>
            {state.title}
          </h3>
        )}
        <p style={{ margin: state.title ? '0 0 16px' : '4px 0 18px', fontSize: 13.5, lineHeight: 2, color: '#334155', whiteSpace: 'pre-wrap' }}>
          {state.message}
        </p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          {state.type === 'confirm' && (
            <button
              type="button"
              onClick={() => close(false)}
              style={{
                minWidth: 86, padding: '10px 14px', borderRadius: 12, cursor: 'pointer',
                border: '1px solid #E2E8F0', background: '#F8FAFC', color: '#475569',
                fontSize: 13, fontWeight: 700,
              }}
            >
              {state.cancelText}
            </button>
          )}
          <button
            ref={okRef}
            type="button"
            onClick={() => close(true)}
            style={{
              minWidth: 86, padding: '10px 16px', borderRadius: 12, cursor: 'pointer',
              border: 'none', background: toneColor, color: '#fff',
              fontSize: 13, fontWeight: 800,
              boxShadow: `0 6px 14px ${toneColor}55`,
            }}
          >
            {state.okText}
          </button>
        </div>
      </div>
    </div>
  );
}
