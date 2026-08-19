// تنظیم کادر کاور هایلایت (شبیه کراپ کاور اینستاگرام) — در یک مودال تمام‌صفحه
// حرکت با یک انگشت (جابه‌جایی) و دو انگشت (پینچ زوم)؛ اسکرول ماوس هم زوم می‌کند.
// حین حرکت فقط state داخلی آپدیت می‌شود (بدون re-render والد) تا حرکت روان باشد؛
// مقدار نهایی فقط با دکمهٔ «تأیید کادر» به پنل منتقل می‌شود.
//
// ⚠️ این کامپوننت باید در ماژول مستقل (خارج از بدنهٔ AdminPanel) بماند؛ تعریف داخل
// بدنهٔ AdminPanel باعث می‌شد با هر رندر مجدد، هویت کامپوننت عوض شود و React آن را
// unmount/remount کند (از دست رفتن جابه‌جایی/زوم و پرش).
import { useEffect, useRef, useState } from 'react';

const COVER_FRAME = 280;

function clampCoverPan(W: number, H: number, coverScale: number, z: number, x: number, y: number) {
  const S = coverScale * z;
  const maxX = Math.max(0, (W * S - COVER_FRAME) / 2);
  const maxY = Math.max(0, (H * S - COVER_FRAME) / 2);
  return { x: Math.max(-maxX, Math.min(maxX, x)), y: Math.max(-maxY, Math.min(maxY, y)) };
}

export default function CoverCropModal({ T, src, position, zoom, onClose, onApply }: {
  T: any; src: string; position: string; zoom: number;
  onClose: () => void; onApply: (coverPosition: string, coverZoom: number) => void;
}) {
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [z, setZ] = useState(() => Number(zoom) || 1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const frameRef = useRef<HTMLDivElement | null>(null);
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinch = useRef<{ dist: number; z: number; panX: number; panY: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const zRef = useRef(z);
  const panRef = useRef(pan);
  const initRef = useRef({ position, zoom });
  useEffect(() => { zRef.current = z; }, [z]);
  useEffect(() => { panRef.current = pan; }, [pan]);
  useEffect(() => { initRef.current = { position, zoom }; }, [position, zoom]);

  const W = img?.naturalWidth || 1;
  const H = img?.naturalHeight || 1;
  const coverScale = Math.max(COVER_FRAME / W, COVER_FRAME / H);

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
   const { position: pos, zoom: z0 } = initRef.current;
   const parts = String(pos || '50% 50%').trim().split(/\s+/);
   const readP = (s: string) => { const n = parseFloat(s); return Number.isFinite(n) ? n : 50; };
   const px = Math.max(0, Math.min(100, readP(parts[0])));
   const py = Math.max(0, Math.min(100, readP(parts[1])));
   const zv = Math.max(1, Math.min(3, Number(z0) || 1));
   const baseWinX = W - COVER_FRAME / coverScale;
   const baseWinY = H - COVER_FRAME / coverScale;
   const cx = (px / 100) * baseWinX + COVER_FRAME / (2 * coverScale);
   const cy = (py / 100) * baseWinY + COVER_FRAME / (2 * coverScale);
   const S = coverScale * zv;
   const np = clampCoverPan(W, H, coverScale, zv, (W / 2 - cx) * S, (H / 2 - cy) * S);
   zRef.current = zv; panRef.current = np;
   setZ(zv); setPan(np);
   // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [img]);

  const applyZoom = (zv: number) => {
   const nz = Math.max(1, Math.min(3, zv));
   const oldS = coverScale * zRef.current;
   const newS = coverScale * nz;
   const np = clampCoverPan(W, H, coverScale, nz, panRef.current.x * (newS / oldS), panRef.current.y * (newS / oldS));
   zRef.current = nz; panRef.current = np;
   setZ(nz); setPan(np);
  };

  const applyPan = (x: number, y: number) => {
   const np = clampCoverPan(W, H, coverScale, zRef.current, x, y);
   panRef.current = np; setPan(np);
  };

  const reset = () => {
   const np = clampCoverPan(W, H, coverScale, 1, 0, 0);
   zRef.current = 1; panRef.current = np;
   setZ(1); setPan(np);
  };

  const onPointerDown = (e: React.PointerEvent) => {
   if (!img || !frameRef.current) return;
   e.preventDefault();
   try { frameRef.current.setPointerCapture(e.pointerId); } catch {}
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
    pinch.current = { dist: dist || 1, z: zRef.current, panX: panRef.current.x, panY: panRef.current.y };
    drag.current = null;
   } else {
    drag.current = { x: e.clientX, y: e.clientY, px: panRef.current.x, py: panRef.current.y };
   }
  };
  const onPointerMove = (e: React.PointerEvent) => {
   if (!img || !pointers.current.has(e.pointerId)) return;
   e.preventDefault();
   pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
   if (pointers.current.size >= 2 && pinch.current) {
    const pts = [...pointers.current.values()];
    const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
    const nz = Math.max(1, Math.min(3, pinch.current.z * (dist / pinch.current.dist)));
    const oldS = coverScale * pinch.current.z;
    const newS = coverScale * nz;
    const np = clampCoverPan(W, H, coverScale, nz, pinch.current.panX * (newS / oldS), pinch.current.panY * (newS / oldS));
    zRef.current = nz; panRef.current = np;
    setZ(nz); setPan(np);
    return;
   }
   if (drag.current && pointers.current.size === 1) {
    applyPan(drag.current.px + (e.clientX - drag.current.x), drag.current.py + (e.clientY - drag.current.y));
   }
  };
  const onPointerUp = (e: React.PointerEvent) => {
   pointers.current.delete(e.pointerId);
   try { frameRef.current?.releasePointerCapture(e.pointerId); } catch {}
   if (pointers.current.size < 2) pinch.current = null;
   if (pointers.current.size === 0) drag.current = null;
   else if (pointers.current.size === 1) {
    const pt = [...pointers.current.values()][0];
    drag.current = { x: pt.x, y: pt.y, px: panRef.current.x, py: panRef.current.y };
   }
  };
  const onWheel = (e: React.WheelEvent) => {
   e.preventDefault();
   applyZoom(zRef.current * (e.deltaY < 0 ? 1.08 : 0.92));
  };

  const confirm = () => {
   const S = coverScale * z;
   const cx = W / 2 - pan.x / S;
   const cy = H / 2 - pan.y / S;
   const baseWinX = W - COVER_FRAME / coverScale;
   const baseWinY = H - COVER_FRAME / coverScale;
   let px = 50, py = 50;
   if (baseWinX > 1) px = Math.max(0, Math.min(100, (cx - COVER_FRAME / (2 * coverScale)) / baseWinX * 100));
   if (baseWinY > 1) py = Math.max(0, Math.min(100, (cy - COVER_FRAME / (2 * coverScale)) / baseWinY * 100));
   onApply(`${Math.round(px * 10) / 10}% ${Math.round(py * 10) / 10}%`, Math.round(z * 100) / 100);
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
        style={{ position: 'absolute', left: '50%', top: '50%', width: W, height: H, maxWidth: 'none', maxHeight: 'none', transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) scale(${coverScale * z})`, transformOrigin: 'center center', pointerEvents: 'none', display: 'block' }} />
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
