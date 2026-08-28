import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export type ImageCropperProps = {
  src: string;
  aspectRatio?: string;
  circular?: boolean;
  title?: string;
  fileName?: string;
  outputLongSide?: number;
  allowAspectChange?: boolean;
  onAspectRatioChange?: (value: string) => void;
  onCancel: () => void;
  onDone: (file: File) => void | Promise<void>;
  T: any;
};

type Point = { x: number; y: number };
type LoadedImage = HTMLImageElement;

const CROP_ASPECT_OPTIONS = [
  { label: 'آزاد (نسبت اصلی عکس)', value: '' },
  { label: 'مربع (۱:۱)', value: '1 / 1' },
  { label: '۴:۳', value: '4 / 3' },
  { label: '۳:۴', value: '3 / 4' },
  { label: '۱۶:۹', value: '16 / 9' },
  { label: '۹:۱۶', value: '9 / 16' },
  { label: 'هیرو (۱.۰۵:۱)', value: '1.05 / 1' },
];

export function parseAspectRatio(value?: string): number | null {
  const raw = String(value || '').trim();
  if (!raw) return null;
  const parts = raw.split('/').map((part) => Number(part.trim()));
  if (parts.length === 2 && parts[0] > 0 && parts[1] > 0) return parts[0] / parts[1];
  const direct = Number(raw);
  return Number.isFinite(direct) && direct > 0 ? direct : null;
}

function viewportFor(ratio: number) {
  const maxWidth = 320;
  const maxHeight = 340;
  let width = maxWidth;
  let height = width / ratio;
  if (height > maxHeight) {
    height = maxHeight;
    width = height * ratio;
  }
  return { width: Math.round(width), height: Math.round(height) };
}

export default function ImageCropper({
  src,
  aspectRatio,
  circular = false,
  title = 'تنظیم کادر تصویر',
  fileName = 'cropped-image.webp',
  outputLongSide = 1600,
  allowAspectChange = false,
  onAspectRatioChange,
  onCancel,
  onDone,
  T,
}: ImageCropperProps) {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [naturalRatio, setNaturalRatio] = useState(1);
  const ratio = parseAspectRatio(aspectRatio) || naturalRatio || 1;
  const view = useMemo(() => viewportFor(ratio), [ratio]);
  const [scale, setScale] = useState(1);
  const [minScale, setMinScale] = useState(1);
  const [pos, setPos] = useState<Point>({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const pointers = useRef<Map<number, Point>>(new Map());
  const pinch = useRef<{ dist: number; scale: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const scaleRef = useRef(1);
  const minRef = useRef(1);
  const posRef = useRef<Point>({ x: 0, y: 0 });

  useEffect(() => { scaleRef.current = scale; }, [scale]);
  useEffect(() => { minRef.current = minScale; }, [minScale]);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const clampScale = useCallback((value: number, minimum: number) => (
    Math.min(Math.max(value, minimum), minimum * 4)
  ), []);

  const clampPosition = useCallback((point: Point, nextScale: number, image = img) => {
    if (!image) return point;
    const maxX = Math.max(0, (image.naturalWidth * nextScale - view.width) / 2);
    const maxY = Math.max(0, (image.naturalHeight * nextScale - view.height) / 2);
    return {
      x: Math.max(-maxX, Math.min(maxX, point.x)),
      y: Math.max(-maxY, Math.min(maxY, point.y)),
    };
  }, [img, view.height, view.width]);

  const applyScale = useCallback((requested: number) => {
    const next = clampScale(requested, minRef.current);
    scaleRef.current = next;
    setScale(next);
    setPos((current) => {
      const clamped = clampPosition(current, next);
      posRef.current = clamped;
      return clamped;
    });
  }, [clampPosition, clampScale]);

  useEffect(() => {
    let alive = true;
    setLoadError(false);
    setImg(null);
    const element = new Image();
    element.crossOrigin = 'anonymous';
    element.onload = () => {
      if (!alive) return;
      const loadedRatio = element.naturalWidth / element.naturalHeight || 1;
      setNaturalRatio(loadedRatio);
      setImg(element);
    };
    element.onerror = () => { if (alive) setLoadError(true); };
    element.src = src;
    return () => { alive = false; };
  }, [src]);

  // نسبت «آزاد» بعد از خواندن ابعاد واقعی مشخص می‌شود؛ سپس حداقل زوم Cover محاسبه می‌گردد.
  useEffect(() => {
    if (!img) return;
    const cover = Math.max(view.width / img.naturalWidth, view.height / img.naturalHeight);
    minRef.current = cover;
    scaleRef.current = cover;
    posRef.current = { x: 0, y: 0 };
    setMinScale(cover);
    setScale(cover);
    setPos({ x: 0, y: 0 });
  }, [img, view.height, view.width]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    try { event.currentTarget.setPointerCapture(event.pointerId); } catch {}
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (pointers.current.size >= 2) {
      const points = [...pointers.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinch.current = { dist: distance || 1, scale: scaleRef.current };
      drag.current = null;
    } else {
      drag.current = { x: event.clientX, y: event.clientY, px: posRef.current.x, py: posRef.current.y };
    }
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!pointers.current.has(event.pointerId)) return;
    event.preventDefault();
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });

    if (pointers.current.size >= 2 && pinch.current) {
      const points = [...pointers.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      applyScale(pinch.current.scale * (distance / pinch.current.dist));
      return;
    }

    if (drag.current && pointers.current.size === 1) {
      const requested = {
        x: drag.current.px + (event.clientX - drag.current.x),
        y: drag.current.py + (event.clientY - drag.current.y),
      };
      const clamped = clampPosition(requested, scaleRef.current);
      posRef.current = clamped;
      setPos(clamped);
    }
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    try { event.currentTarget.releasePointerCapture(event.pointerId); } catch {}
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size === 0) drag.current = null;
    if (pointers.current.size === 1) {
      const point = [...pointers.current.values()][0];
      drag.current = { x: point.x, y: point.y, px: posRef.current.x, py: posRef.current.y };
    }
  };

  const reset = () => {
    scaleRef.current = minRef.current;
    posRef.current = { x: 0, y: 0 };
    setScale(minRef.current);
    setPos({ x: 0, y: 0 });
  };

  const confirm = useCallback(async () => {
    if (!img) return;
    setBusy(true);
    try {
      const sourceWidth = view.width / scale;
      const sourceHeight = view.height / scale;
      // تصویر کوچک را بی‌دلیل بزرگ نکن؛ سقف خروجی فقط برای تصاویر بزرگ اعمال می‌شود.
      const sourceLongSide = Math.max(1, Math.round(Math.max(sourceWidth, sourceHeight)));
      const finalLongSide = Math.min(outputLongSide, sourceLongSide);
      const outWidth = ratio >= 1 ? finalLongSide : Math.max(1, Math.round(finalLongSide * ratio));
      const outHeight = ratio >= 1 ? Math.max(1, Math.round(finalLongSide / ratio)) : finalLongSide;
      const canvas = document.createElement('canvas');
      canvas.width = outWidth;
      canvas.height = outHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('canvas');

      const sourceX = img.naturalWidth / 2 - (view.width / 2 + pos.x) / scale;
      const sourceY = img.naturalHeight / 2 - (view.height / 2 + pos.y) / scale;
      ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, outWidth, outHeight);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((value) => value ? resolve(value) : reject(new Error('export')), 'image/webp', 0.92);
      });
      await onDone(new File([blob], fileName, { type: 'image/webp' }));
    } catch (error) {
      console.warn('image crop failed', error);
      alert('تنظیم کادر تصویر انجام نشد. دوباره تلاش کنید.');
    } finally {
      setBusy(false);
    }
  }, [fileName, img, onDone, outputLongSide, pos.x, pos.y, ratio, scale, view.height, view.width]);

  const zoomPercent = minScale > 0 ? Math.round(((scale / minScale) - 1) / 3 * 100) : 0;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 9500, background: 'rgba(15,23,42,.68)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 14 }}
      onClick={onCancel}
    >
      <div
        onClick={(event) => event.stopPropagation()}
        style={{ width: 'min(440px,100%)', maxHeight: 'calc(100dvh - 28px)', overflowY: 'auto', background: T.card || '#fff', borderRadius: 20, padding: 16, boxShadow: '0 20px 50px rgba(0,0,0,.28)' }}
      >
        <b style={{ display: 'block', marginBottom: 7, color: T.ttl, fontSize: 16 }}>{title}</b>
        <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.8, margin: '0 0 12px' }}>
          با یک انگشت عکس را جابه‌جا کنید. برای نزدیک/دور شدن از دو انگشت روی عکس استفاده کنید.
        </p>

        {allowAspectChange && onAspectRatioChange && (
          <label style={{ display: 'block', marginBottom: 12, color: T.ttl, fontSize: 12, fontWeight: 700 }}>
            نسبت کادر
            <select
              aria-label="نسبت کادر تصویر"
              value={aspectRatio || ''}
              onChange={(event) => onAspectRatioChange(event.target.value)}
              style={{ display: 'block', width: '100%', minHeight: 44, marginTop: 5, border: `1px solid ${T.brd}`, borderRadius: 10, background: T.soft || T.card, color: T.ttl, fontFamily: 'inherit', padding: '8px 10px' }}
            >
              {CROP_ASPECT_OPTIONS.map((option) => <option key={option.label} value={option.value}>{option.label}</option>)}
            </select>
          </label>
        )}

        <div
          data-testid="image-crop-viewport"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
          onWheel={(event) => {
            event.preventDefault();
            applyScale(scaleRef.current * (event.deltaY < 0 ? 1.08 : 0.92));
          }}
          style={{
            width: view.width,
            height: view.height,
            maxWidth: '100%',
            margin: '0 auto 12px',
            borderRadius: circular ? '50%' : 14,
            overflow: 'hidden',
            position: 'relative',
            background: T.inp || T.soft || '#fff',
            touchAction: 'none',
            cursor: 'grab',
            boxShadow: `0 0 0 3px ${T.acc || '#0f766e'}`,
          }}
        >
          {img && (
            <img
              data-testid="image-crop-source"
              src={src}
              alt=""
              draggable={false}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: img.naturalWidth,
                height: img.naturalHeight,
                maxWidth: 'none',
                maxHeight: 'none',
                objectFit: 'fill',
                transform: `translate(-50%, -50%) translate(${pos.x}px, ${pos.y}px) scale(${scale})`,
                transformOrigin: 'center center',
                userSelect: 'none',
                pointerEvents: 'none',
              }}
            />
          )}
          {img && !circular && (
            <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', backgroundImage: 'linear-gradient(to right, transparent 33.1%, rgba(255,255,255,.38) 33.3%, transparent 33.6%, transparent 66.4%, rgba(255,255,255,.38) 66.7%, transparent 66.9%), linear-gradient(to bottom, transparent 33.1%, rgba(255,255,255,.38) 33.3%, transparent 33.6%, transparent 66.4%, rgba(255,255,255,.38) 66.7%, transparent 66.9%)' }} />
          )}
          {!img && !loadError && <div style={{ color: T.mut, fontSize: 12, position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>در حال آماده‌سازی تصویر…</div>}
          {loadError && <div style={{ color: T.err, fontSize: 12, lineHeight: 1.8, textAlign: 'center', padding: 20, position: 'absolute', inset: 0, display: 'grid', placeItems: 'center' }}>خواندن این تصویر ممکن نشد. دوباره آن را از حافظهٔ گوشی انتخاب کنید.</div>}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <span style={{ fontSize: 11, color: T.mut }}>دور</span>
          <input
            aria-label="میزان بزرگ‌نمایی تصویر"
            type="range"
            min="0"
            max="100"
            value={Math.max(0, Math.min(100, zoomPercent))}
            onChange={(event) => applyScale(minRef.current * (1 + 3 * Number(event.target.value) / 100))}
            style={{ width: '100%', accentColor: T.acc || '#0f766e' }}
          />
          <span style={{ fontSize: 11, color: T.mut }}>نزدیک</span>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
          <button type="button" onClick={reset} disabled={!img || busy} style={{ minHeight: 42, padding: '8px 14px', borderRadius: 10, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit' }}>
            بازنشانی
          </button>
          <span style={{ flex: 1 }} />
          <span style={{ alignSelf: 'center', color: T.mut, fontSize: 11, direction: 'ltr' }}>{Math.round(ratio * 100) / 100}:1</span>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button type="button" disabled={busy} onClick={onCancel} style={{ flex: 1, minHeight: 46, borderRadius: 11, border: `1px solid ${T.brd}`, background: T.soft, color: T.ttl, cursor: 'pointer', fontFamily: 'inherit', fontWeight: 700 }}>
            انصراف
          </button>
          <button type="button" disabled={!img || busy || loadError} onClick={confirm} style={{ flex: 1, minHeight: 46, borderRadius: 11, border: 0, background: T.acc || '#0f766e', color: 'var(--zkad-acc-contrast, #fff)', fontWeight: 800, cursor: 'pointer', fontFamily: 'inherit' }}>
            {busy ? 'در حال ذخیره…' : 'تأیید کادر'}
          </button>
        </div>
      </div>
    </div>
  );
}
