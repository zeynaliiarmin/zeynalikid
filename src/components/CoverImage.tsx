/**
 * CoverImage — رندر کاور هایلایت با «مرکز تصویر + زوم»
 * مدل جدید: object-fit: cover + object-position: 50% 50% + transform: translate(...) scale(z)
 * برخلاف object-position تنها (که فقط روی یک محور جابه‌جایی می‌داد)، این مدل امکان
 * حرکت آزاد در هر دو جهت را فراهم می‌کند — دقیقاً همان چیزی که در مودال کراپ دیده می‌شود.
 *
 * coverPosition = "cx% cy%" (نقطه‌ای از تصویر که باید در مرکز کادر قرار گیرد)
 * coverZoom     = z (بزرگ‌نمایی نسبت به پوشش پایهٔ cover؛ ۱ = پیش‌فرض)
 */
import { useEffect, useRef, useState } from 'react';

export function coverTransform(W: number, H: number, cx: number, cy: number, z: number, F: number): string {
  const s = F / Math.min(W, H);
  const dx = (0.5 - cx / 100) * W * s * z;
  const dy = (0.5 - cy / 100) * H * s * z;
  return `translate(${dx}px, ${dy}px) scale(${z})`;
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
  const W = dims?.w || 1, H = dims?.h || 1;
  const transform = dims && F > 0 ? coverTransform(W, H, cx, cy, z, F) : (z > 1 ? `scale(${z})` : undefined);

  return (
    <div ref={boxRef} style={{ width: '100%', height: '100%', overflow: 'hidden', borderRadius: 'inherit', display: 'block' }}>
      <img
        src={src}
        alt={alt}
        referrerPolicy="no-referrer"
        draggable={false}
        style={{
          width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%',
          transform, transformOrigin: '50% 50%', display: 'block',
          WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
          ...style,
        }}
        {...rest}
      />
    </div>
  );
}
