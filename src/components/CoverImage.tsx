/**
 * CoverImage — رندر کاور هایلایت با «مرکز تصویر + زوم»
 * مدل صحیح و بدون ناحیه سیاه:
 *  • تصویر با ابعاد صریح (cover × zoom) رندر می‌شود — بدون کراپِ object-fit
 *  • جابه‌جایی فقط به‌اندازه «سرریز» (overflow) در هر محور است، نه کل اندازه
 *  • بنابراین کادر همیشه پُر می‌ماند و هرگز ناحیه سیاه دیده نمی‌شود
 *
 * coverPosition = "cx% cy%" (نقطه‌ای از تصویر که در مرکز کادر قرار گیرد؛ 0..100)
 * coverZoom     = z (بزرگ‌نمایی نسبت به پوشش پایه cover؛ ۱ = پیش‌فرض)
 */
import { useEffect, useRef, useState } from 'react';

/** هندسه رندر کاور: ابعاد صریح + جابه‌جایی بر اساس سرریز */
export function coverGeometry(W: number, H: number, cx: number, cy: number, z: number, F: number) {
  const s = F / Math.min(W, H);
  const contentW = W * s * z;
  const contentH = H * s * z;
  const overflowX = Math.max(0, contentW - F);
  const overflowY = Math.max(0, contentH - F);
  const shiftX = (0.5 - cx / 100) * overflowX;
  const shiftY = (0.5 - cy / 100) * overflowY;
  return { contentW, contentH, shiftX, shiftY, overflowX, overflowY };
}

export function parseCoverPos(position?: string): { cx: number; cy: number } {
  const parts = String(position || '50% 50%').trim().split(/\s+/);
  const read = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 50; };
  return { cx: Math.max(0, Math.min(100, read(parts[0]))), cy: Math.max(0, Math.min(100, read(parts[1]))) };
}

export default function CoverImage({ src, position, zoom, alt = '', style, onLoadDims, ...rest }: {
  src?: string; position?: string; zoom?: number; alt?: string; style?: React.CSSProperties;
  onLoadDims?: (w: number, h: number) => void; [k: string]: any;
}) {
  const [dims, setDims] = useState<{ w: number; h: number } | null>(null);
  const boxRef = useRef<HTMLDivElement | null>(null);
  const [F, setF] = useState(0);

  useEffect(() => {
    let alive = true;
    setDims(null);
    if (!src) return;
    const el = new Image();
    try { el.referrerPolicy = 'no-referrer'; } catch {}
    el.onload = () => { if (alive && el.naturalWidth) { setDims({ w: el.naturalWidth, h: el.naturalHeight }); try { onLoadDims?.(el.naturalWidth, el.naturalHeight); } catch {} } };
    el.src = src;
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  useEffect(() => {
    const measure = () => { if (boxRef.current) setF(boxRef.current.clientWidth || 0); };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  const { cx, cy } = parseCoverPos(position);
  const z = Math.max(1, Math.min(3, Number(zoom) || 1));
  const W = dims?.w || 0, H = dims?.h || 0;
  const ready = dims && F > 0;
  const g = ready ? coverGeometry(W, H, cx, cy, z, F) : null;

  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', display: 'block', position: 'relative' }}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: g ? `${g.contentW}px` : '100%',
          height: g ? `${g.contentH}px` : '100%',
          maxWidth: 'none',
          maxHeight: 'none',
          objectFit: 'cover',
          objectPosition: '50% 50%',
          transform: g ? `translate(-50%, -50%) translate(${g.shiftX}px, ${g.shiftY}px)` : 'translate(-50%, -50%)',
          transformOrigin: '0 0',
          display: 'block',
          WebkitTouchCallout: 'none',
          WebkitUserSelect: 'none',
          userSelect: 'none',
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
