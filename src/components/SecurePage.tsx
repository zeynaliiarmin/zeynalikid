import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';

type Lang = 'fa' | 'en';

type SecurePageProps = {
  children: ReactNode;
  pageTitle: string;
  T: any;
  /** یادداشتِ همیشگیِ پایینِ صفحه (اگر ندهید، متنِ پیش‌فرض نمایش داده می‌شود) */
  warningMessage?: string;
  lang?: Lang;
  /**
   * محافظت از محتوا: جلوگیری از کپی/برش/کشیدنِ تصویر و منویِ راست‌کلیک،
   * و نمایشِ یک پیامِ محترمانه هنگامِ نگه‌داشتنِ طولانی روی متن یا تصویر.
   */
  protect?: boolean;
  /** غیرفعال کردنِ زومِ صفحه بدون اختلال در اسکرول (ویژهٔ صفحهٔ مجوزها) */
  noZoom?: boolean;
};

/**
 * متنِ هشدار — عمداً «ملایم و محترمانه» نوشته شده است.
 * گفته نمی‌شود «شما نمی‌توانید عکس دانلود کنید یا متن کپی کنید»؛ چون چنین جمله‌ای
 * کنجکاوی و لجبازیِ مخاطب را بیشتر می‌کند. instead: بر حریمِ خصوصیِ خانواده‌ها،
 * اعتمادِ صاحبانِ محتوا و پیشگیری از سوءاستفاده تأکید می‌شود.
 */
const NOTICE = {
  fa: {
    title: 'پاسداشتِ حریمِ خصوصی',
    body: 'این مستندات با رضایت و اعتمادِ صاحبانشان منتشر شده‌اند. برای پاسداشتِ حریمِ شخصیِ خانواده‌ها و پیشگیری از هرگونه سوءاستفاده، امکانِ مشاهدهٔ این صفحه تنها در همین‌جا فراهم است. از درک و همراهیِ شما صمیمانه سپاس‌گزاریم.',
    action: 'متوجه شدم',
  },
  en: {
    title: 'Respecting privacy',
    body: 'These documents are published with the consent and trust of their owners. To honour the privacy of the families involved and to help prevent any misuse, this page may only be viewed here. Thank you sincerely for your understanding.',
    action: 'I understand',
  },
} as const;

/** فیلدهایی که کاربر باید بتواند در آن‌ها بنویسد و از آن‌ها کپی کند */
const EDITABLE = 'input, textarea, select, [contenteditable="true"]';
/** کنترل‌هایی که نگه‌داشتنِ طولانی روی آن‌ها نباید پیام نشان دهد (پخش‌کنندهٔ ویدیو و…) */
const INTERACTIVE = 'video, audio, iframe, button, a, input, textarea, select, [role="button"]';

function isEditableTarget(node: EventTarget | null): boolean {
  try {
    return !!(node as Element | null)?.closest?.(EDITABLE);
  } catch {
    return false;
  }
}

/**
 * A respectful privacy notice, not fake DRM. Browser key blocking and disabled
 * selection cannot prevent screenshots, but they do harm accessibility and mobile UX.
 */
export default function SecurePage({ children, pageTitle, T, warningMessage, lang = 'fa', protect = false, noZoom = false }: SecurePageProps) {
  const message =
    warningMessage ||
    `محتوای صفحه ${pageTitle} با رضایت صاحبان محتوا منتشر شده است؛ لطفاً حریم خصوصی آن‌ها را رعایت کنید.`;
  const [noticeOpen, setNoticeOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const closeRef = useRef<HTMLButtonElement | null>(null);
  const longPressRef = useRef<number | null>(null);
  // اگر نگه‌داشتنِ طولانی پیام را باز کرده باشد، کلیکِ بعدی‌اش را خنثی می‌کنیم
  const suppressClickRef = useRef(false);

  const copy = NOTICE[lang] || NOTICE.fa;

  const openNotice = useCallback(() => {
    setNoticeOpen(true);
  }, []);

  // ── پیام را با Esc هم می‌شود بست ──
  useEffect(() => {
    if (!noticeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setNoticeOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [noticeOpen]);

  // ── تمرکز روی دکمهٔ بستن، برای دسترسی‌پذیری ──
  useEffect(() => {
    if (noticeOpen) {
      const id = window.setTimeout(() => closeRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [noticeOpen]);

  // ── غیرفعال کردنِ زوم، بدون آسیب به اسکرول ──
  // فقط حرکت‌هایِ چندانگشتی و میانبرهایِ بزرگ‌نمایی مسدود می‌شوند؛
  // اسکرولِ تک‌انگشتی (pan-y) کاملاً آزاد می‌ماند.
  useEffect(() => {
    if (!noZoom) return undefined;
    const root = document.documentElement;
    const prevTouchAction = root.style.touchAction;
    root.style.touchAction = 'pan-x pan-y';

    const block = (e: Event) => {
      if (e.cancelable) e.preventDefault();
    };
    const onTouchMove = (e: TouchEvent) => {
      // بیش از یک انگشت یعنی کاربر قصدِ زوم دارد؛ یک انگشت یعنی اسکرول
      if (e.touches.length > 1 && e.cancelable) e.preventDefault();
    };
    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey && e.cancelable) e.preventDefault();
    };
    const onKeyDown = (e: KeyboardEvent) => {
      const plus = e.key === '+' || e.key === '=' || e.key === 'Add';
      const minus = e.key === '-' || e.key === 'Subtract';
      const zero = e.key === '0';
      if ((e.ctrlKey || e.metaKey) && (plus || minus || zero)) e.preventDefault();
    };

    document.addEventListener('gesturestart', block, { passive: false });
    document.addEventListener('gesturechange', block, { passive: false });
    document.addEventListener('gestureend', block, { passive: false });
    document.addEventListener('touchmove', onTouchMove, { passive: false });
    document.addEventListener('wheel', onWheel, { passive: false });
    document.addEventListener('keydown', onKeyDown);

    return () => {
      root.style.touchAction = prevTouchAction;
      document.removeEventListener('gesturestart', block);
      document.removeEventListener('gesturechange', block);
      document.removeEventListener('gestureend', block);
      document.removeEventListener('touchmove', onTouchMove);
      document.removeEventListener('wheel', onWheel);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [noZoom]);

  // ── جلوگیری از کپی/برش/کشیدن/انتخاب و نمایشِ پیام هنگامِ نگه‌داشتنِ طولانی ──
  useEffect(() => {
    if (!protect) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    const guard = (e: Event) => {
      // در فیلدهایِ نوشتاری، رفتارِ طبیعیِ مرورگر حفظ می‌شود
      if (isEditableTarget(e.target)) return;
      if (e.cancelable) e.preventDefault();
      openNotice();
    };
    const onContextMenu = (e: MouseEvent) => guard(e);
    const onCopy = (e: ClipboardEvent) => guard(e);
    const onCut = (e: ClipboardEvent) => guard(e);
    const onDragStart = (e: DragEvent) => guard(e);
    const onSelectStart = (e: Event) => guard(e);

    const clearLongPress = () => {
      if (longPressRef.current !== null) {
        window.clearTimeout(longPressRef.current);
        longPressRef.current = null;
      }
    };
    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) {
        clearLongPress();
        return;
      }
      const target = e.target as Element | null;
      // روی کنترل‌هایِ تعاملی (ویدیو، دکمه، لینک) مزاحم نمی‌شویم
      try {
        if (target?.closest?.(INTERACTIVE) && !isEditableTarget(target)) return;
      } catch {
        /* بی‌صدا */
      }
      clearLongPress();
      longPressRef.current = window.setTimeout(() => {
        longPressRef.current = null;
        suppressClickRef.current = true;
        openNotice();
      }, 480);
    };
    const onTouchMove = () => clearLongPress();
    const onTouchEnd = () => clearLongPress();
    // نگه‌داشتنِ طولانی با ماوس هم (بدون حرکت) پیام می‌آورد
    const onMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const target = e.target as Element | null;
      try {
        if (target?.closest?.(INTERACTIVE) || isEditableTarget(target)) return;
      } catch {
        /* بی‌صدا */
      }
      clearLongPress();
      longPressRef.current = window.setTimeout(() => {
        longPressRef.current = null;
        suppressClickRef.current = true;
        openNotice();
      }, 700);
    };
    const onMouseUp = () => clearLongPress();
    const onClickCapture = (e: MouseEvent) => {
      if (suppressClickRef.current) {
        suppressClickRef.current = false;
        if (e.cancelable) e.preventDefault();
        e.stopPropagation();
      }
    };

    root.addEventListener('contextmenu', onContextMenu);
    root.addEventListener('copy', onCopy);
    root.addEventListener('cut', onCut);
    root.addEventListener('dragstart', onDragStart);
    root.addEventListener('selectstart', onSelectStart);
    root.addEventListener('touchstart', onTouchStart, { passive: true });
    root.addEventListener('touchmove', onTouchMove, { passive: true });
    root.addEventListener('touchend', onTouchEnd, { passive: true });
    root.addEventListener('touchcancel', onTouchEnd, { passive: true });
    root.addEventListener('mousedown', onMouseDown);
    root.addEventListener('mouseup', onMouseUp);
    root.addEventListener('click', onClickCapture, true);

    return () => {
      clearLongPress();
      root.removeEventListener('contextmenu', onContextMenu);
      root.removeEventListener('copy', onCopy);
      root.removeEventListener('cut', onCut);
      root.removeEventListener('dragstart', onDragStart);
      root.removeEventListener('selectstart', onSelectStart);
      root.removeEventListener('touchstart', onTouchStart);
      root.removeEventListener('touchmove', onTouchMove);
      root.removeEventListener('touchend', onTouchEnd);
      root.removeEventListener('touchcancel', onTouchEnd);
      root.removeEventListener('mousedown', onMouseDown);
      root.removeEventListener('mouseup', onMouseUp);
      root.removeEventListener('click', onClickCapture, true);
    };
  }, [protect, openNotice]);

  return (
    <div style={{ position: 'relative' }} ref={rootRef}>
      <div>{children}</div>
      <aside
        role="note"
        style={{
          margin: '14px auto 0',
          maxWidth: 760,
          padding: '10px 12px',
          borderRadius: 12,
          background: T?.soft || '#FEF3C7',
          border: `1px solid ${T?.brd || '#F59E0B55'}`,
          color: T?.txt || '#713F12',
          fontSize: 11.5,
          lineHeight: 1.8,
          textAlign: 'center',
        }}
      >
        {message}
      </aside>

      {noticeOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="zk-privacy-notice-title"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setNoticeOpen(false);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 4000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
            background: 'rgba(12,26,40,.55)',
            backdropFilter: 'blur(3px)',
            WebkitBackdropFilter: 'blur(3px)',
            animation: 'zk-notice-fade .22s ease both',
          }}
        >
          <div
            dir={lang === 'en' ? 'ltr' : 'rtl'}
            style={{
              width: '100%',
              maxWidth: 380,
              background: 'var(--zk-card, #fff)',
              color: 'var(--zk-text, #1F2937)',
              borderRadius: 18,
              padding: '22px 20px 18px',
              boxShadow: '0 24px 60px rgba(8,20,34,.34)',
              border: '1px solid var(--zk-border, #E5E7EB)',
              textAlign: 'center',
              animation: 'zk-notice-pop .26s cubic-bezier(.16,1,.3,1) both',
            }}
          >
            <div
              style={{
                width: 52,
                height: 52,
                borderRadius: '50%',
                margin: '0 auto 12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'var(--zk-primary-light, rgba(15,118,110,.10))',
                color: 'var(--zk-primary, #0F766E)',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 3l7.5 3v5.2c0 4.3-3 8.1-7.5 9.8-4.5-1.7-7.5-5.5-7.5-9.8V6z" />
                <path d="M9.2 12.2l2 2 3.6-3.8" />
              </svg>
            </div>
            <div
              id="zk-privacy-notice-title"
              style={{ fontSize: 15.5, fontWeight: 800, color: 'var(--zk-title, #111827)', marginBottom: 8 }}
            >
              {copy.title}
            </div>
            <p style={{ fontSize: 13, lineHeight: 2, color: 'var(--zk-text-muted, #4B5563)', margin: '0 0 16px' }}>
              {copy.body}
            </p>
            <button
              ref={closeRef}
              type="button"
              onClick={() => setNoticeOpen(false)}
              style={{
                minHeight: 46,
                width: '100%',
                border: 0,
                borderRadius: 12,
                background: 'var(--zk-primary, #0F766E)',
                color: 'var(--zk-text-inverse, #fff)',
                fontWeight: 800,
                fontSize: 14,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {copy.action}
            </button>
          </div>
        </div>
      )}

      <style>{`@keyframes zk-notice-fade{from{opacity:0}to{opacity:1}}@keyframes zk-notice-pop{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:translateY(0) scale(1)}}`}</style>
    </div>
  );
}
