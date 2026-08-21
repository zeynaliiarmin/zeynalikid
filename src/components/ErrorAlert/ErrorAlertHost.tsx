/**
 * ErrorAlertHost — میزبان هشدار خطا
 * به bus رویداد گوش می‌دهد، شماره پشتیبانی را از تنظیمات پنل (cfg.contacts.phone) می‌خواند
 * و کادر هشدار را رندر می‌کند. فقط یک هشدار در لحظه نمایش داده می‌شود.
 */
import React from 'react';
import { useErrorHandler } from '../../hooks/useErrorHandler';
import ErrorAlert from './ErrorAlert';

export default function ErrorAlertHost({ cfg, lang }: { cfg: any; lang: 'fa' | 'en' }) {
  const { alert, dismiss } = useErrorHandler();
  if (!alert) return null;

  const phone = String((cfg?.contacts?.phone) || '').trim();

  return <ErrorAlert context={alert.context} phone={phone} lang={lang} onClose={dismiss} />;
}
