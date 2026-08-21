/**
 * ErrorAlert — کادر هشدار قرمز با وکتور SVG (بدون ایموجی)
 * طراحی موبایل‌فرست، RTL/LTR، با انیمیشن ورود ملایم و شماره پشتیبانی قابل کلیک (tel:).
 * فقط نمایشی است — هیچ تغییری در منطق یا ذخیرهٔ localStorage ایجاد نمی‌کند.
 */
import React, { useEffect, useRef, useState } from 'react';
import { ERROR_ALERT_CONTENT, type ErrorAlertContext } from '../../utils/errorAlertBus';
import './ErrorAlert.css';

interface Props {
  context: ErrorAlertContext;
  phone?: string;
  lang: 'fa' | 'en';
  onClose: () => void;
}

export default function ErrorAlert({ context, phone, lang, onClose }: Props) {
  const rtl = lang === 'fa';
  const copy = ERROR_ALERT_CONTENT[context][lang];
  const [leaving, setLeaving] = useState(false);
  const closeTimer = useRef<number | null>(null);

  const handleClose = () => {
    if (leaving) return;
    setLeaving(true);
    closeTimer.current = window.setTimeout(onClose, 260);
  };

  useEffect(() => () => { if (closeTimer.current) window.clearTimeout(closeTimer.current); }, []);

  const cleanPhone = String(phone || '').replace(/[^\d+]/g, '');

  return (
    <div
      role="alert"
      aria-live="assertive"
      dir={rtl ? 'rtl' : 'ltr'}
      className={`zk-err-alert${leaving ? ' zk-err-alert--out' : ''}`}
    >
      <div className="zk-err-icon" aria-hidden="true">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          <line x1="12" y1="9" x2="12" y2="13" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
      </div>

      <button type="button" className="zk-err-close" onClick={handleClose} aria-label={rtl ? 'بستن هشدار' : 'Close alert'}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="6" x2="6" y2="18" />
          <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
      </button>

      <div className="zk-err-body">
        <div className="zk-err-title">{copy.title}</div>
        <div className="zk-err-message">{copy.message}</div>
      </div>

      <div className="zk-err-footer">
        <span className="zk-err-support-label">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
          </svg>
          {rtl ? 'تماس با پشتیبانی:' : 'Call support:'}
        </span>
        {cleanPhone ? (
          <a className="zk-err-phone" href={`tel:${cleanPhone}`} dir="ltr">
            {String(phone || '').trim()}
          </a>
        ) : (
          <span className="zk-err-phone zk-err-phone--muted" dir="ltr">
            {rtl ? 'پشتیبانی' : 'Support'}
          </span>
        )}
      </div>
    </div>
  );
}
