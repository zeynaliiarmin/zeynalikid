// تنظیم کادر کاور هایلایت (شبیه کراپ کاور اینستاگرام) — در یک مودال تمام‌صفحه
// حرکت با یک انگشت (جابه‌جایی) و دو انگشت (پینچ زوم)؛ اسکرول ماوس هم زوم می‌کند.
//
// ⚠️ نکتهٔ کلیدی: این مودال دقیقاً با همان مدل رندرِ سایت کار می‌کند:
//   object-fit: cover + object-position + transform: scale(zoom)
// یعنی «آنچه در کادر می‌بینی، دقیقاً همان است که در سایت و پیش‌نمایش پنل نمایش داده می‌شود»
// (بدون هیچ تبدیل ریاضی بین مدل‌ها که باعث می‌شد تنظیم به‌نظر «ریست» شود).
//
// ⚠️ این کامپوننت باید در ماژول مستقل (خارج از بدنهٔ AdminPanel) بماند؛ تعریف داخل
// بدنهٔ AdminPanel باعث می‌شد با هر رندر مجدد، هویت کامپوننت عوض شود و React آن را
// unmount/remount کند (از دست رفتن جابه‌جایی/زوم و پرش).
import { useEffect, useRef, useState } from 'react';

const COVER_FRAME = 280;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function CoverCropModal({ T, src, position, zoom, onClose, onApply }: {
  T: any; src: string; position: string; zoom: number;
  onClose: () => void; onApply: (coverPosition: string, coverZoom: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  // pos = object-position (درصد)؛ scale = همان coverZoom سایت
  const [pos, setPos] = useState<{ x: number; y: number }>({ x: 50, y: 50 });
  const [scale, setScale] = useState(() => Number(zoom) || 1);
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const posRef = useRef(pos);
  const scaleRef = useRef(scale);
  useEffect(() => { posRef.current = pos; }, [pos]);
  useEffect(() => { scaleRef.current = scale; }, [scale]);

  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const coverScale = Math.max(COVER_FRAME / W, COVER_FRAME / H);
  const overflowX = Math.max(0, W * coverScale - COVER_FRAME);
  const overflowY = Math.max(0, H * coverScale - COVER_FRAME);

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

  // مقداردهی اولیه از کادر ذخیره‌شده (object-position + zoom) — بدون تبدیل
  useEffect(() => {
   if (!img) return;
   const parts = String(position || '50% 50%').trim().split(/\s+/);
   const readP = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 50; };
   const px = clamp(readP(parts[0]), 0, 100);
   const py = clamp(readP(parts[1]), 0, 100);
   const zv = clamp(Number(zoom) || 1, 1, 3);
   posRef.current = { x: px, y: py };
   scaleRef.current = zv;
   setPos({ x: px, y: py });
   setScale(zv);
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  const applyScale = (zv: number) => {
   const nz = clamp(zv, 1, 3);
   scaleRef.current = nz;
   setScale(nz);
  };

  // جابه‌جایی: dx>0 (انگشت به راست) → تصویر به راست می‌رود → نمای سمت چپ → position کاهش می‌یابد
  const applyPanBy = (dx: number, dy: number) => {
   const p = posRef.current;
   const z = scaleRef.current || 1;
   let nx = p.x, ny = p.y;
   if (overflowX > 1) nx = clamp(p.x - (dx / overflowX) * 100 / z, 0, 100);
   if (overflowY > 1) ny = clamp(p.y - (dy / overflowY) * 100 / z, 0, 100);
   const np = { x: nx, y: ny };
   posRef.current = np; setPos(np);
  };

  const reset = () => {
   posRef.current = { x: 50, y: 50 };
   scaleRef.current = 1;
   setPos({ x: 50, y: 50 });
   setScale(1);
  };

  const onPointerDown = (e: React.PointerEvent) => {
   if (!img || !frameRef.current) return;
   e.preventDefault();
   try { frameRef.current.setPointerCapture(e.pointerId); } catch {}
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinch.current = { dist: dist || 1, scale: scaleRef.current };
    drag.current = null;
   } else {
    drag.current = { x: e.clientX, y: e.clientY, px: posRef.current.x, py: posRef.current.y };
   }
  };
  const onPointerMove = (e: React.PointerEvent) => {
   if (!img || !pointers.current.has(e.pointerId)) return;
   e.preventDefault();
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2 && pinch.current) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    applyScale(pinch.current.scale * (dist / pinch.current.dist));
    return;
   }
   if (drag.current && pointers.current.size === 1) {
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const p = posRef.current;
    const z = scaleRef.current || 1;
    let nx = p.x, ny = p.y;
    if (overflowX > 1) nx = clamp(drag.current.px - (dx / overflowX) * 100 / z, 0, 100);
    if (overflowY > 1) ny = clamp(drag.current.py - (dy / overflowY) * 100 / z, 0, 100);
    const np = { x: nx, y: ny };
    posRef.current = np; setPos(np);
   }
  };
  const onPointerUp = (e: React.PointerEvent) => {
   pointers.current.delete(e.pointerId);
   try { frameRef.current?.releasePointerCapture(e.pointerId); } catch {}
   if (pointers.current.size < 2) pinch.current = null;
   if (pointers.current.size === 0) drag.current = null;
   else if (pointers.current.size === 1) {
    const pt = [...pointers.current.values()][0];
    drag.current = { x: pt.x, y: pt.y, px: posRef.current.x, py: posRef.current.y };
   }
  };
  const onWheel = (e: React.WheelEvent) => {
   e.preventDefault();
   applyScale(scaleRef.current * (e.deltaY < 0 ? 1.08 : 0.92));
  };

  const confirm = () => {
   onApply(`${Math.round(pos.x * 10) / 10}% ${Math.round(pos.y * 10) / 10}%`, Math.round(scale * 100) / 100);
   onClose();
  };

  return (
   <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9800, background: 'rgba(15,23,42,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,100%)', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', background: T.card || '#fff', borderRadius: 20, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
     <b style={{ display: 'block', marginBottom: 4, color: T.ttl, fontSize: 16 }}>تنظیم کادر کاور</b>
     <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.9, margin: '0 0 12px' }}>
      با <b>یک انگشت</b> عکس را داخل دایره جابه‌جا کنید و با <b>دو انگشت</b> (پینچ) بزرگ‌نمایی را کم/زیاد کنید. روی کامپیوتر با اسکرول ماوس زوم کنید.
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
        style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: `${pos.x}% ${pos.y}%`, transform: `scale(${scale})`, pointerEvents: 'none', display: 'block' }} />
      ) : loadError ? (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fca5a5', fontSize: 12, padding: 12, textAlign: 'center' }}>تصویر بارگذاری نشد — لینک کاور را بررسی کنید</div>
      ) : (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: 12 }}>در حال آماده‌سازی…</div>
      )}
     </div>
     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: T.mut, whiteSpace: 'nowrap' }}>بزرگ‌نمایی</span>
      <input type="range" min={1} max={3} step={0.05} value={scale} onChange={(e) => applyScale(Number(e.target.value))} style={{ flex: 1, accentColor: T.acc || '#0f766e' }} />
      <span style={{ fontSize: 11, color: T.mut, direction: 'ltr', minWidth: 42, textAlign: 'center' }}>{scale.toFixed(2)}x</span>
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
