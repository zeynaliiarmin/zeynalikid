/**
 * ErrorBoundary سراسری — از صفحهٔ سفید جلوگیری می‌کند و خطا را به سیستم لاگ گزارش می‌دهد.
 * در صورت کرش، یک پیام دوستانه + دکمهٔ بارگذاری مجدد نمایش داده می‌شود.
 */
import { Component, type ReactNode } from 'react';
import { reportError } from '../utils/errorLog';

interface Props { children: ReactNode; }
interface State { hasError: boolean; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: { componentStack?: string }): void {
    try {
      reportError('boundary', error?.message || 'render error', `${error?.stack || ''}\n${info?.componentStack || ''}`);
    } catch {
      /* بی‌صدا */
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div style={{ minHeight: '100dvh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Vazirmatn','Tahoma',sans-serif", background: 'var(--zk-bg, #FDF8F3)', color: 'var(--zk-text, #1F2937)', direction: 'rtl', padding: 20, textAlign: 'center' }}>
          <div>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: 'var(--zk-primary-light, #0F766E14)', color: 'var(--zk-primary, #0F766E)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v4M12 16h.01"/></svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, marginBottom: 8 }}>مشکلی پیش آمد</div>
            <div style={{ fontSize: 13, color: 'var(--zk-text-muted, #6B7280)', marginBottom: 16, lineHeight: 1.9 }}>خطایی غیرمنتظره رخ داد و به تیم فنی گزارش شد. لطفاً صفحه را دوباره بارگذاری کنید.</div>
            <button onClick={() => { try { location.reload(); } catch { /* ignore */ } }} style={{ minHeight: 48, padding: '0 28px', borderRadius: 999, border: 0, background: 'var(--zk-primary, #0F766E)', color: 'var(--zk-text-inverse, #fff)', fontWeight: 800, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>بارگذاری مجدد</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
