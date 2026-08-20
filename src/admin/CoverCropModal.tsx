// تنظیم کادر کاور هایلایت (شبیه کراپ کاور اینستاگرام) — در یک مودال تمام‌صفحه
//
// مدل رندر: object-fit: cover + object-position: 50% 50% + transform: translate(dx,dy) scale(z)
// این مدل (برخلاف object-position تنها) امکان جابه‌جایی در هر دو جهت را می‌دهد:
//   • با زوم = ۱، محورِ سرریزدار جابه‌جا می‌شود و محورِ دقیقاً منطبق ثابت می‌ماند (تصویر کامل دیده می‌شود).
//   • با زوم > ۱، هر دو محور آزاد می‌شوند و می‌توانید تا گوشه‌های تصویر حرکت کنید.
// مقدار ذخیره‌شده: coverPosition = "cx% cy%" (نقطهٔ تصویر در مرکز کادر) + coverZoom = z.
// این دقیقاً همان چیزی است که CoverImage (سایت + پیش‌نمایش پنل) رندر می‌کند → آنچه می‌بینید همان است که ذخیره می‌شود.
//
// ⚠️ این کامپوننت باید در ماژول مستقل (خارج از بدنهٔ AdminPanel) بماند تا remount نشود.
import { useEffect, useRef, useState } from 'react';

const COVER_FRAME = 280;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function CoverCropModal({ T, src, position, zoom, onClose, onApply }: {
  T: any; src: string; position: string; zoom: number;
  onClose: () => void; onApply: (coverPosition: string, coverZoom: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [cx, setCx] = useState(50);
  const [cy, setCy] = useState(50);
  const [z, setZ] = useState(() => Math.max(1, Math.min(3, Number(zoom) || 1)));
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; z: number } | null>(null);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number } | null>(null);
  const cxRef = useRef(cx); const cyRef = useRef(cy); const zRef = useRef(z);
  useEffect(() => { cxRef.current = cx; }, [cx]);
  useEffect(() => { cyRef.current = cy; }, [cy]);
  useEffect(() => { zRef.current = z; }, [z]);

  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const coverScale = Math.max(COVER_FRAME / W, COVER_FRAME / H);

  // بازهٔ مجاز مرکز تصویر برای یک محور (بر حسب درصد) تا کادر همیشه پوشیده بماند
  const axisRange = (size: number): { lo: number; hi: number } => {
    const scaled = size * coverScale * zRef.current;
    if (scaled <= COVER_FRAME) return { lo: 50, hi: 50 };
    const lo = 100 * (COVER_FRAME / 2) / scaled;
    return { lo, hi: 100 - lo };
  };

  useEffect(() => {
   let alive = true;
   setLoadError(false);
   setImg(null);
   if (!src) return;
   const el = new Image();
   try { el.referrerPolicy = 'no-referrer'; } catch {}
   el.onload = () => { if (alive && el.naturalWidth) setImg(el); };
   el.onerror = () => { if (alive) setLoadError(true); };
   el.src = src;
   return () => { alive = false; };
  }, [src]);

  // مقداردهی اولیه از کادر ذخیره‌شده (مرکز + زوم)
  useEffect(() => {
   if (!img) return;
   const parts = String(position || '50% 50%').trim().split(/\s+/);
   const readP = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 50; };
   let px = clamp(readP(parts[0]), 0, 100);
   let py = clamp(readP(parts[1]), 0, 100);
   const zv = clamp(Number(zoom) || 1, 1, 3);
   zRef.current = zv;
   const rx = axisRange(W); const ry = axisRange(H);
   cxRef.current = clamp(px, rx.lo, rx.hi);
   cyRef.current = clamp(py, ry.lo, ry.hi);
   setZ(zv); setCx(cxRef.current); setCy(cyRef.current);
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  const applyZoom = (zv: number) => {
   const nz = clamp(zv, 1, 3);
   zRef.current = nz;
   const rx = axisRange(W); const ry = axisRange(H);
   cxRef.current = clamp(cxRef.current, rx.lo, rx.hi);
   cyRef.current = clamp(cyRef.current, ry.lo, ry.hi);
   setZ(nz); setCx(cxRef.current); setCy(cyRef.current);
  };

  // جابه‌جایی با درگ: حرکت انگشت به راست → تصویر به راست → مرکز به سمت چپ می‌رود (cx کاهش)
  const applyPanBy = (dx: number, dy: number) => {
   const scaledW = W * coverScale * zRef.current;
   const scaledH = H * coverScale * zRef.current;
   const rx = axisRange(W); const ry = axisRange(H);
   cxRef.current = clamp(cxRef.current - dx * 100 / scaledW, rx.lo, rx.hi);
   cyRef.current = clamp(cyRef.current - dy * 100 / scaledH, ry.lo, ry.hi);
   setCx(cxRef.current); setCy(cyRef.current);
  };

  const reset = () => {
   zRef.current = 1;
   const rx = axisRange(W); const ry = axisRange(H);
   cxRef.current = clamp(50, rx.lo, rx.hi);
   cyRef.current = clamp(50, ry.lo, ry.hi);
   setZ(1); setCx(cxRef.current); setCy(cyRef.current);
  };

  const onPointerDown = (e: React.PointerEvent) => {
   if (!img || !frameRef.current) return;
   e.preventDefault();
   try { frameRef.current.setPointerCapture(e.pointerId); } catch {}
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinch.current = { dist: dist || 1, z: zRef.current };
    drag.current = null;
   } else {
    drag.current = { x: e.clientX, y: e.clientY, cx: cxRef.current, cy: cyRef.current };
   }
  };
  const onPointerMove = (e: React.PointerEvent) => {
   if (!img || !pointers.current.has(e.pointerId)) return;
   e.preventDefault();
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2 && pinch.current) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    applyZoom(pinch.current.z * (dist / pinch.current.dist));
    return;
   }
   if (drag.current && pointers.current.size === 1) {
    applyPanBy(e.clientX - drag.current.x, e.clientY - drag.current.y);
   }
  };
  const onPointerUp = (e: React.PointerEvent) => {
   pointers.current.delete(e.pointerId);
   try { frameRef.current?.releasePointerCapture(e.pointerId); } catch {}
   if (pointers.current.size < 2) pinch.current = null;
   if (pointers.current.size === 0) drag.current = null;
   else if (pointers.current.size === 1) {
    const pt = [...pointers.current.values()][0];
    drag.current = { x: pt.x, y: pt.y, cx: cxRef.current, cy: cyRef.current };
   }
  };
  const onWheel = (e: React.WheelEvent) => {
   e.preventDefault();
   applyZoom(zRef.current * (e.deltaY < 0 ? 1.08 : 0.92));
  };

  const confirm = () => {
   onApply(`${Math.round(cx * 10) / 10}% ${Math.round(cy * 10) / 10}%`, Math.round(z * 100) / 100);
   onClose();
  };

  const dx = (0.5 - cx / 100) * W * coverScale * z;
  const dy = (0.5 - cy / 100) * H * coverScale * z;

  return (
   <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9800, background: 'rgba(15,23,42,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,100%)', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', background: T.card || '#fff', borderRadius: 20, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
     <b style={{ display: 'block', marginBottom: 4, color: T.ttl, fontSize: 16 }}>تنظیم کادر کاور</b>
     <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.9, margin: '0 0 12px' }}>
      با <b>یک انگشت</b> عکس را داخل دایره جابه‌جا کنید و با <b>دو انگشت</b> (پینچ) بزرگ‌نمایی را کم/زیاد کنید. برای رسیدن به لبه‌ها و گوشه‌ها، بزرگ‌نمایی را بیشتر کنید. روی کامپیوتر با اسکرول ماوس زوم کنید.
     </p>
     <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{ width: COVER_FRAME, height: COVER_FRAME, borderRadius: '50%', overflow: 'hidden', background: '#111827', position: 'relative', touchAction: 'none', cursor: img ? 'grab' : 'default', margin: '0 auto 12px', boxShadow: `0 0 0 3px ${T.acc || '#0f766e'}`, WebkitUserSelect: 'none', userSelect: 'none' }}
     >
      {img ? (
       <img src={src} alt="" referrerPolicy="no-referrer" draggable={false}
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: '50% 50%', transform: `translate(${dx}px, ${dy}px) scale(${z})`, transformOrigin: '50% 50%', pointerEvents: 'none', display: 'block' }} />
      ) : loadError ? (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', fontSize: 12, padding: 12, textAlign: 'center' }}>تصویر بارگذاری نشد — لینک کاور را بررسی کنید</div>
      ) : (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>در حال آماده‌سازی…</div>
      )}
     </div>
     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: T.mut, whiteSpace: 'nowrap' }}>بزرگ‌نمایی</span>
      <input type="range" min={1} max={3} step={0.05} value={z} onChange={(e) => applyZoom(Number(e.target.value))} style={{ flex: 1, accentColor: T.acc || '#0f766e' }} />
      <span style={{ fontSize: 11, color: T.mut, direction: 'ltr', minWidth: 42, textAlign: 'center' }}>{z.toFixed(2)}x</span>
     </div>
     <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" onClick={reset} disabled={!img} style={{ minHeight: 44, padding: '8px 14px', borderRadius: 11, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>بازنشانی</button>
      <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 44, borderRadius: 11, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>انصراف</button>
      <button type="button" disabled={!img} onClick={confirm} style={{ flex: 1, minHeight: 44, borderRadius: 11, border: 0, background: T.acc || '#0f766e', color: '#fff', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تأیید کادر</button>
     </div>
    </div>
   </div>
  );
}
