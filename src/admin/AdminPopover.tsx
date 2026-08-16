// Popover پنل مدیریت — رندر با Portal روی <body> و موقعیت‌دهی fixed
// علت بازنویسی: نسخه قبلی از position:absolute داخل کارت استفاده می‌کرد؛
// در موبایل داخل کانتینرهای overflow/transform گیر می‌کرد، از لبه صفحه بیرون می‌زد
// و روی فرم‌های ارسال/پرداخت می‌افتاد. Portal + fixed هر دو مشکل را حذف می‌کند.

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type Props = {
  open: boolean;
  onClose: () => void;
  trigger: any;
  children: any;
  width?: number;
  /** برچسب دسترس‌پذیری منو */
  ariaLabel?: string;
};

const GUTTER = 10;

export default function AdminPopover({ open, onClose, trigger, children, width = 244, ariaLabel = 'منوی عملیات' }: Props) {
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [pos, setPos] = useState<{ top: number; left: number; w: number; maxH: number } | null>(null);

  const place = useCallback(() => {
    const a = anchorRef.current;
    if (!a) return;
    const r = a.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    // عرض امن: هرگز از عرض صفحه بیرون نمی‌زند
    const w = Math.min(width, vw - GUTTER * 2);
    const spaceBelow = vh - r.bottom - GUTTER;
    const spaceAbove = r.top - GUTTER;
    const openUp = spaceBelow < 180 && spaceAbove > spaceBelow;
    const maxH = Math.max(140, Math.min(360, openUp ? spaceAbove : spaceBelow));
    const panelH = panelRef.current?.offsetHeight || 0;
    let top = openUp ? r.top - GUTTER - Math.min(panelH || maxH, maxH) : r.bottom + 6;
    top = Math.max(GUTTER, Math.min(top, vh - GUTTER - Math.min(panelH || 120, maxH)));
    // در RTL لبه راست تریگر مبنا است؛ ولی کلمپ به هر دو لبه انجام می‌شود
    let left = r.right - w;
    if (left < GUTTER) left = GUTTER;
    if (left + w > vw - GUTTER) left = Math.max(GUTTER, vw - GUTTER - w);
    setPos({ top, left, w, maxH });
  }, [width]);

  useLayoutEffect(() => { if (open) place(); }, [open, place]);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (panelRef.current?.contains(t)) return;
      if (anchorRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const onScroll = () => place();
    document.addEventListener('pointerdown', onDown, true);
    document.addEventListener('keydown', onKey);
    window.addEventListener('resize', onScroll);
    window.addEventListener('scroll', onScroll, true);
    return () => {
      document.removeEventListener('pointerdown', onDown, true);
      document.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onScroll);
      window.removeEventListener('scroll', onScroll, true);
    };
  }, [open, onClose, place]);

  return (
    <>
      <span ref={anchorRef} style={{ display: 'inline-flex', maxWidth: '100%' }}>{trigger}</span>
      {open && pos && typeof document !== 'undefined' && createPortal(
        <div
          ref={panelRef}
          className="zkad-popover"
          role="menu"
          aria-label={ariaLabel}
          style={{ top: pos.top, left: pos.left, width: pos.w, maxHeight: pos.maxH }}
          onClick={e => e.stopPropagation()}
        >
          {children}
        </div>,
        document.body
      )}
    </>
  );
}
