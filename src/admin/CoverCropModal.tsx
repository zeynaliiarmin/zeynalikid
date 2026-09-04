// تنظیم کادر کاور هایلایت (شبیه کراپ کاور اینستاگرام) — در یک مودال تمام‌صفحه
//
// مدل رندر: تصویر با ابعاد صریح (cover × zoom) + جابه‌جایی به‌اندازه «سرریز».
// این مدل کادر را همیشه پُر نگه می‌دارد و هرگز ناحیه سیاه ایجاد نمی‌کند
// (برخلاف object-fit:cover + scale که تصویر را پیش از transform کراپ می‌کرد).
//
// مقدار ذخیره‌شده: coverPosition = "cx% cy%" (0..100) + coverZoom = z (1..3).
// دقیقاً همان چیزی که CoverImage (سایت + پیش‌نمایش پنل) رندر می‌کند.
//
// ⚠️ این کامپوننت باید در ماژول مستقل (خارج از بدنه AdminPanel) بماند تا remount نشود.
import { useEffect, useRef, useState } from 'react';
import { coverGeometry } from '../components/CoverImage';

const COVER_FRAME = 280;
const MAX_ZOOM = 3;

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export default function CoverCropModal({ T, src, position, zoom, onClose, onApply }: {
  T: any; src: string; position: string; zoom: number;
  onClose: () => void; onApply: (coverPosition: string, coverZoom: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [cx, setCx] = useState(50);
  const [cy, setCy] = useState(50);
  const [z, setZ] = useState(() => clamp(Number(zoom) || 1, 1, MAX_ZOOM));
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; z: number; midX: number; midY: number; cx: number; cy: number } | null>(null);
  const drag = useRef<{ sx: number; sy: number; cx: number; cy: number } | null>(null);
  const cxRef = useRef(cx); const cyRef = useRef(cy); const zRef = useRef(z);
  useEffect(() => { cxRef.current = cx; }, [cx]);
  useEffect(() => { cyRef.current = cy; }, [cy]);
  useEffect(() => { zRef.current = z; }, [z]);

  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const coverScale = Math.max(COVER_FRAME / W, COVER_FRAME / H);

  // بازه مجاز مرکز تصویر: اگر در آن محور سرریز وجود دارد، 0..100 آزاد است؛
  // در غیر این صورت (تصویر دقیقاً منطبق) فقط ۵۰.
  const rangeFor = (size: number, zv: number): { lo: number; hi: number } => {
    const scaled = size * coverScale * zv;
    if (scaled <= COVER_FRAME) return { lo: 50, hi: 50 };
    return { lo: 0, hi: 100 };
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

  // مقداردهی اولیه از کادر ذخیره‌شده
  useEffect(() => {
   if (!img) return;
   const parts = String(position || '50% 50%').trim().split(/\s+/);
   const readP = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 50; };
   const zv = clamp(Number(zoom) || 1, 1, MAX_ZOOM);
   zRef.current = zv;
   const rx = rangeFor(W, zv); const ry = rangeFor(H, zv);
   cxRef.current = clamp(readP(parts[0]), rx.lo, rx.hi);
   cyRef.current = clamp(readP(parts[1]), ry.lo, ry.hi);
   setZ(zv); setCx(cxRef.current); setCy(cyRef.current);
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  // اعمال نهایی (z + clamp هر دو محور)
  const commit = (ncx: number, ncy: number, nz: number) => {
   const zv = clamp(nz, 1, MAX_ZOOM);
   zRef.current = zv;
   const rx = rangeFor(W, zv); const ry = rangeFor(H, zv);
   cxRef.current = clamp(ncx, rx.lo, rx.hi);
   cyRef.current = clamp(ncy, ry.lo, ry.hi);
   setZ(zv); setCx(cxRef.current); setCy(cyRef.current);
  };

  // زوم حول مرکز کادر (اسلایدر/اسکرول)
  const applyZoom = (zv: number) => {
   commit(cxRef.current, cyRef.current, zv);
  };

  // درگ مطلق: از نقطه شروع با جابه‌جایی کل — حساسیت بر اساس سرریز (۱ پیکسل انگشت = ۱ پیکسل تصویر)
  const applyDrag = (startCx: number, startCy: number, dx: number, dy: number) => {
   const g = coverGeometry(W, H, 50, 50, zRef.current, COVER_FRAME);
   const nx = g.overflowX > 0 ? startCx - (dx * 100) / g.overflowX : startCx;
   const ny = g.overflowY > 0 ? startCy - (dy * 100) / g.overflowY : startCy;
   commit(nx, ny, zRef.current);
  };

  const reset = () => commit(50, 50, 1);

  const onPointerDown = (e: React.PointerEvent) => {
   if (!img || !frameRef.current) return;
   e.preventDefault();
   try { frameRef.current.setPointerCapture(e.pointerId); } catch {}
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinch.current = {
     dist: dist || 1,
     z: zRef.current,
     midX: (pts[0].x + pts[1].x) / 2,
     midY: (pts[0].y + pts[1].y) / 2,
     cx: cxRef.current,
     cy: cyRef.current,
    };
    drag.current = null;
   } else {
    drag.current = { sx: e.clientX, sy: e.clientY, cx: cxRef.current, cy: cyRef.current };
   }
  };

  const onPointerMove = (e: React.PointerEvent) => {
   if (!img || !pointers.current.has(e.pointerId)) return;
   e.preventDefault();
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

   if (pointers.current.size >= 2 && pinch.current) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    const midX = (pts[0].x + pts[1].x) / 2;
    const midY = (pts[0].y + pts[1].y) / 2;
    const nz = clamp(pinch.current.z * (dist / pinch.current.dist), 1, MAX_ZOOM);
    zRef.current = nz;
    const g = coverGeometry(W, H, 50, 50, nz, COVER_FRAME);
    const rx = rangeFor(W, nz); const ry = rangeFor(H, nz);
    const nx = g.overflowX > 0 ? pinch.current.cx - ((midX - pinch.current.midX) * 100) / g.overflowX : pinch.current.cx;
    const ny = g.overflowY > 0 ? pinch.current.cy - ((midY - pinch.current.midY) * 100) / g.overflowY : pinch.current.cy;
    cxRef.current = clamp(nx, rx.lo, rx.hi);
    cyRef.current = clamp(ny, ry.lo, ry.hi);
    setZ(zRef.current); setCx(cxRef.current); setCy(cyRef.current);
    return;
   }

   if (drag.current && pointers.current.size === 1) {
    applyDrag(drag.current.cx, drag.current.cy, e.clientX - drag.current.sx, e.clientY - drag.current.sy);
   }
  };

  const onPointerUp = (e: React.PointerEvent) => {
   pointers.current.delete(e.pointerId);
   try { frameRef.current?.releasePointerCapture(e.pointerId); } catch {}
   if (pointers.current.size < 2) pinch.current = null;
   if (pointers.current.size === 0) drag.current = null;
   else if (pointers.current.size === 1) {
    const pt = [...pointers.current.values()][0];
    drag.current = { sx: pt.x, sy: pt.y, cx: cxRef.current, cy: cyRef.current };
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

  const g = coverGeometry(W, H, cx, cy, z, COVER_FRAME);

  return (
   <div role="dialog" aria-modal="true" onClick={onClose} style={{ position: 'fixed', inset: 0, zIndex: 9800, background: 'rgba(15,23,42,.72)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}>
    <div onClick={(e) => e.stopPropagation()} style={{ width: 'min(420px,100%)', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', background: T.card || '#fff', borderRadius: 20, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,.3)' }}>
     <b style={{ display: 'block', marginBottom: 4, color: T.ttl, fontSize: 16 }}>تنظیم کادر کاور</b>
     <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.9, margin: '0 0 12px' }}>
      با <b>یک انگشت</b> عکس را داخل دایره جابه‌جا کنید و با <b>دو انگشت</b> (پینچ) بزرگ‌نمایی را کم/زیاد کنید. اگر در جهتی جابه‌جا نمی‌شود، بزرگ‌نمایی را کمی بیشتر کنید تا آن جهت هم آزاد شود. روی کامپیوتر با اسکرول ماوس زوم کنید.
     </p>
     <div
      ref={frameRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
      style={{ width: COVER_FRAME, height: COVER_FRAME, borderRadius: '50%', overflow: 'hidden', background: T.inp || T.soft || '#fff', position: 'relative', touchAction: 'none', cursor: img ? 'grab' : 'default', margin: '0 auto 12px', boxShadow: `0 0 0 3px ${T.acc || '#0f766e'}`, WebkitUserSelect: 'none', userSelect: 'none' }}
     >
      {img ? (
       <img src={src} alt="" referrerPolicy="no-referrer" draggable={false}
        style={{ position: 'absolute', left: '50%', top: '50%', width: `${g.contentW}px`, height: `${g.contentH}px`, maxWidth: 'none', maxHeight: 'none', objectFit: 'cover', objectPosition: '50% 50%', transform: `translate(-50%, -50%) translate(${g.shiftX}px, ${g.shiftY}px)`, transformOrigin: '0 0', pointerEvents: 'none', display: 'block' }} />
      ) : loadError ? (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.err, fontSize: 12, padding: 12, textAlign: 'center' }}>تصویر بارگذاری نشد — لینک کاور را بررسی کنید</div>
      ) : (
       <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: T.mut, fontSize: 12 }}>در حال آماده‌سازی…</div>
      )}
     </div>
     <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
      <span style={{ fontSize: 11, color: T.mut, whiteSpace: 'nowrap' }}>بزرگ‌نمایی</span>
      <input type="range" min={1} max={MAX_ZOOM} step={0.05} value={z} onChange={(e) => applyZoom(Number(e.target.value))} style={{ flex: 1, accentColor: T.acc || '#0f766e' }} />
      <span style={{ fontSize: 11, color: T.mut, direction: 'ltr', minWidth: 42, textAlign: 'center' }}>{z.toFixed(2)}x</span>
     </div>
     <div style={{ display: 'flex', gap: 8 }}>
      <button type="button" onClick={reset} disabled={!img} style={{ minHeight: 44, padding: '8px 14px', borderRadius: 11, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>بازنشانی</button>
      <button type="button" onClick={onClose} style={{ flex: 1, minHeight: 44, borderRadius: 11, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>انصراف</button>
      <button type="button" disabled={!img} onClick={confirm} style={{ flex: 1, minHeight: 44, borderRadius: 11, border: 0, background: T.acc || '#0f766e', color: 'var(--zkad-acc-contrast, #fff)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>تأیید کادر</button>
     </div>
    </div>
   </div>
  );
}
