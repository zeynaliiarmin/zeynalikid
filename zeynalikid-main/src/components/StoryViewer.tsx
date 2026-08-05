// اصلاح ۱۸+۲۰: بازطراحی کامل استوری — چندین هایلایت، هر کدام چند استوری (فقط عکس)
// دو کد دستی (خارجی/داخلی) با قانون VPN + توقف تایمر + جابجایی بین هایلایت‌ها + swipe روان
import { useCallback, useEffect, useRef, useState } from 'react';
import { detectVpnOn } from '../utils/vpn';

export type StorySlide = { id: string; imageCodeExternal?: string; imageCodeInternal?: string; title?: string; order?: number; active?: boolean };
export type Highlight = { id: string; title: string; coverUrl?: string; stories: StorySlide[]; active?: boolean; order?: number };

const DURATION_MS = 8000;

function resolveImage(slide: StorySlide, vpnOn: boolean): string {
  const ext = (slide.imageCodeExternal || '').trim();
  const int = (slide.imageCodeInternal || '').trim();
  if (vpnOn) return ext || int;
  return int || ext;
}

function SlideMedia({ src, onReady }: { src: string; onReady?: () => void }) {
  const looksLikeHtml = /^<\s*[a-zA-Z]/.test(src);
  if (looksLikeHtml) return <div style={{ width: '100%', height: '100%', overflow: 'hidden' }} dangerouslySetInnerHTML={{ __html: src }} />;
  return <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} draggable={false} onLoad={() => onReady?.()} />;
}

// ─── StoryViewer: اسلایدشو تمام‌صفحه ───
export default function StoryViewer({ highlights, startHighlight = 0, T, onClose, vpnOn = false }: {
  highlights: Highlight[]; startHighlight?: number; T: any; onClose: () => void; vpnOn?: boolean;
}) {
  const active = highlights.filter(h => h.active !== false && h.stories?.some(s => s.active !== false));
  const [hIdx, setHIdx] = useState(Math.min(startHighlight, active.length - 1));
  const [sIdx, setSIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number>(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  const hl = active[hIdx];
  const stories = (hl?.stories || []).filter(s => s.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
  const slide = stories[sIdx];

  // اصلاح ۲۰: تایمر با توقف/ادامه
  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    const remaining = DURATION_MS - elapsedRef.current;
    timerRef.current = window.setTimeout(() => { elapsedRef.current = 0; next(); }, remaining);
  }, []);

  const pauseTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    elapsedRef.current += Date.now() - startRef.current;
  }, []);

  // Progress bar
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      const el = elapsedRef.current + (Date.now() - startRef.current);
      setProgress(Math.min(100, (el / DURATION_MS) * 100));
    }, 50);
    return () => clearInterval(iv);
  }, [paused, sIdx, hIdx]);

  const goTo = useCallback((hi: number, si: number) => {
    clearTimeout(timerRef.current);
    elapsedRef.current = 0;
    setHIdx(hi); setSIdx(si); setProgress(0);
  }, []);

  const next = useCallback(() => {
    if (sIdx < stories.length - 1) goTo(hIdx, sIdx + 1);
    else if (hIdx < active.length - 1) goTo(hIdx + 1, 0);
    else onClose();
  }, [sIdx, hIdx, stories.length, active.length, goTo, onClose]);

  const prev = useCallback(() => {
    if (sIdx > 0) goTo(hIdx, sIdx - 1);
    else if (hIdx > 0) { const prevHl = active[hIdx - 1]; const prevStories = (prevHl?.stories || []).filter(s => s.active !== false); goTo(hIdx - 1, Math.max(0, prevStories.length - 1)); }
  }, [sIdx, hIdx, active, goTo]);

  useEffect(() => { startTimer(); return () => clearTimeout(timerRef.current); }, [sIdx, hIdx]);

  // Keyboard
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [next, prev, onClose]);

  // Touch/swipe — اصلاح ۲۰: swipe روان، فقط افقی، تشخیص جهت و pause هنگام لمس
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; setPaused(true); pauseTimer(); };
  const onTouchMove = (e: React.TouchEvent) => { e.preventDefault(); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    // فقط در صورتی که حرکت افقی واضح‌تر از عمودی باشد
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 0) prev(); else next(); }
    setPaused(false); startTimer();
  };

  if (!slide) return null;
  const imgSrc = resolveImage(slide, vpnOn);

  // اصلاح ۲۰: کلیک چپ/راست — با جداسازی منطقه‌ها و feedback بصری
  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev(); else next();
  };

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column', touchAction: 'none' }}
      onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}
      onMouseDown={() => { setPaused(true); pauseTimer(); }} onMouseUp={() => { setPaused(false); startTimer(); }}>
      {/* نوار پیشرفت */}
      <div style={{ display: 'flex', gap: 3, padding: '8px 10px 4px' }}>
        {stories.map((_, i) => (
          <div key={i} style={{ flex: 1, height: 3, borderRadius: 2, background: 'rgba(255,255,255,.25)', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: i < sIdx ? '100%' : i === sIdx ? `${progress}%` : '0%', transition: i === sIdx ? 'none' : 'width .2s' }} />
          </div>
        ))}
      </div>
      {/* هدر */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.soft, border: `2px solid ${T.acc}`, overflow: 'hidden', flexShrink: 0 }}>
          {hl?.coverUrl && <img src={hl.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
        </div>
        <span style={{ color: '#fff', fontSize: 13, fontWeight: 700, flex: 1 }}>{hl?.title || ''}</span>
        {paused && <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,.15)' }}>⏸ متوقف</span>}
        <button onClick={onClose} style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 22, cursor: 'pointer', padding: 4 }}></button>
      </div>
      {/* تصویر */}
      <div onClick={handleClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden' }}>
        {imgSrc ? <SlideMedia src={imgSrc} /> : <div style={{ color: '#888', fontSize: 14 }}>تصویر یافت نشد</div>}
      </div>
      {/* عنوان اسلاید */}
      {slide.title && <div style={{ textAlign: 'center', padding: '8px 16px', color: '#fff', fontSize: 13 }}>{slide.title}</div>}
    </div>
  );
}

// ─── نوار هایلایت‌ها (دایره‌ها) ───
export function StoryHighlightsBar({ highlights, T, lang }: { highlights: Highlight[]; T: any; lang: 'fa' | 'en' }) {
  const active = (highlights || []).filter(h => h.active !== false && h.stories?.some(s => s.active !== false)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [vpnOn, setVpnOn] = useState(false);
  useEffect(() => { detectVpnOn().then(v => setVpnOn(v)).catch(() => setVpnOn(false)); }, []);

  if (!active.length) return null;
  return (
    <>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0 12px', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
        {active.map((hl, i) => (
          <button key={hl.id} onClick={() => setOpenIdx(i)} style={{ scrollSnapAlign: 'start', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, border: 0, background: 'transparent', cursor: 'pointer', padding: 0, flexShrink: 0, fontFamily: 'inherit' }}>
            <div style={{ width: 56, height: 56, borderRadius: '50%', padding: 2, background: T.grad, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <div style={{ width: '100%', height: '100%', borderRadius: '50%', background: T.card, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                {hl.coverUrl ? <img src={hl.coverUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} draggable={false} /> : <span style={{ fontSize: 20 }}></span>}
              </div>
            </div>
            <span style={{ fontSize: 10, color: T.mut, fontWeight: 600, maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hl.title}</span>
          </button>
        ))}
      </div>
      {openIdx !== null && <StoryViewer highlights={active} startHighlight={openIdx} T={T} onClose={() => setOpenIdx(null)} vpnOn={vpnOn} />}
    </>
  );
}

// Backward compatibility: اگر از ساختار قدیمی (items بدون highlights) استفاده شود
export function LegacyStoryHighlightsBar({ items, T, lang }: { items: any[]; T: any; lang: 'fa' | 'en' }) {
  const highlights: Highlight[] = [{
    id: 'legacy', title: 'استوری', stories: (items || []).map((it: any) => ({
      id: it.id, imageCodeExternal: it.embedCode || '', imageCodeInternal: it.embedCode || '',
      title: it.title, order: it.order, active: it.active,
    })), active: true,
  }];
  return <StoryHighlightsBar highlights={highlights} T={T} lang={lang} />;
}
