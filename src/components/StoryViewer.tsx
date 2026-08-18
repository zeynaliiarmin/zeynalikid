// بازطراحی کامل استوری — چندین هایلایت، هر کدام چند استوری (فقط عکس)
// دو کد دستی (خارجی/داخلی) با قانون VPN + توقف تایمر + جابجایی بین هایلایت‌ها + swipe روان
// جدید: نوار پیشرفت اینستاگرامی + حلقهٔ رنگی/خاکستری + ادامه از جای دیده‌شده + راهنمای اولین ورود +
//       نگه‌داشتن انگشت = توقف تایمر (بدون منوی دانلود/کپی) + ضد دانلود تصویر
import { useCallback, useEffect, useRef, useState } from 'react';
import { detectVpnOn } from '../utils/vpn';
import { extractDirectMediaUrl } from '../utils/mediaInput';
import { markStorySeen, getResumeIndex, hasSeenStoryHint, markStoryHintSeen } from '../utils/storyProgress';

export type StorySlide = { id: string; imageCodeExternal?: string; imageCodeInternal?: string; title?: string; order?: number; active?: boolean };
export type Highlight = { id: string; title: string; coverUrl?: string; coverPosition?: string; coverZoom?: number; stories: StorySlide[]; active?: boolean; order?: number };

const DURATION_MS = 8000; // مدت نمایش هر استوری = ۸ ثانیه
const LONG_PRESS_MS = 400; // حد تشخیص «نگه‌داشتن انگشت»

function resolveImage(slide: StorySlide, vpnOn: boolean): string {
  const ext = extractDirectMediaUrl(slide.imageCodeExternal, 'image');
  const int = extractDirectMediaUrl(slide.imageCodeInternal, 'image');
  if (vpnOn) return ext || int;
  return int || ext;
}

function storiesOf(hl: Highlight | undefined): StorySlide[] {
  return (hl?.stories || []).filter(s => s.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
}

function SlideMedia({ src, onReady }: { src: string; onReady?: () => void }) {
  return (
    <img
      src={src}
      alt=""
      referrerPolicy="no-referrer"
      draggable={false}
      onContextMenu={(e) => e.preventDefault()}
      onDragStart={(e) => e.preventDefault()}
      style={{
        width: '100%', height: '100%', objectFit: 'contain', background: '#000',
        WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none',
        pointerEvents: 'none',
      }}
      onLoad={() => onReady?.()}
    />
  );
}

// ─── StoryViewer: اسلایدشو تمام‌صفحه ───
export default function StoryViewer({ highlights, startHighlight = 0, T, onClose, vpnOn = false, lang = 'fa' }: {
  highlights: Highlight[]; startHighlight?: number; T: any; onClose: () => void; vpnOn?: boolean; lang?: 'fa' | 'en';
}) {
  const active = highlights.filter(h => h.active !== false && h.stories?.some(s => s.active !== false)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [hIdx, setHIdx] = useState(() => Math.min(startHighlight, Math.max(0, active.length - 1)));
  const [sIdx, setSIdx] = useState(0);
  const [paused, setPaused] = useState(false);
  const [progress, setProgress] = useState(0);
  const timerRef = useRef<number>(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  // رفرنس‌ها برای جلوگیری از stale-closure در تایمر خودکار
  const hIdxRef = useRef(hIdx); hIdxRef.current = hIdx;
  const sIdxRef = useRef(sIdx); sIdxRef.current = sIdx;
  const activeRef = useRef(active); activeRef.current = active;
  const onCloseRef = useRef(onClose); onCloseRef.current = onClose;
  const currentRef = useRef<{ hi: number; si: number } | null>(null);

  const hl = active[hIdx];
  const stories = storiesOf(hl);
  const storiesRef = useRef(stories); storiesRef.current = stories;
  const slide = stories[sIdx];

  // راهنمای اولین ورود — فقط یک‌بار برای هر دستگاه
  const [showHint, setShowHint] = useState(() => !hasSeenStoryHint());
  const dismissHint = useCallback(() => { setShowHint(false); markStoryHintSeen(); }, []);
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(dismissHint, 6000);
    return () => clearTimeout(t);
  }, [showHint, dismissHint]);

  // ثبت «دیده‌شدن» فقط وقتی استوری به پایان برسد / از آن رد شویم
  const markSeenAt = useCallback((hi: number, si: number) => {
    const act = activeRef.current;
    const h = act[hi];
    const st = storiesOf(h);
    if (h?.id && st[si]?.id) markStorySeen(h.id, st[si].id);
  }, []);

  // شروع از اولین استوریِ دیده‌نشده (اگر همه دیده شده باشند از اول پخش می‌شود)
  useEffect(() => {
    const act = activeRef.current;
    if (!act.length) return;
    const hi0 = Math.min(startHighlight, act.length - 1);
    const st = storiesOf(act[hi0]);
    const resume = getResumeIndex(act[hi0]?.id || '', st.map((s) => s.id));
    const si0 = resume > 0 ? resume : 0;
    currentRef.current = { hi: hi0, si: si0 };
    if (si0 !== 0) setSIdx(si0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const goTo = useCallback((hi: number, si: number, markPrev = true) => {
    clearTimeout(timerRef.current);
    elapsedRef.current = 0;
    if (markPrev && currentRef.current) markSeenAt(currentRef.current.hi, currentRef.current.si);
    currentRef.current = { hi, si };
    setHIdx(hi); setSIdx(si); setProgress(0);
  }, [markSeenAt]);

  const next = useCallback(() => {
    const hi = hIdxRef.current, si = sIdxRef.current;
    const st = storiesRef.current, act = activeRef.current;
    if (si < st.length - 1) goTo(hi, si + 1);
    else if (hi < act.length - 1) goTo(hi + 1, 0);
    else { markSeenAt(hi, si); onCloseRef.current(); }
  }, [goTo, markSeenAt]);

  const prev = useCallback(() => {
    const hi = hIdxRef.current, si = sIdxRef.current;
    if (si > 0) goTo(hi, si - 1, false);
    else if (hi > 0) { const pst = storiesOf(activeRef.current[hi - 1]); goTo(hi - 1, Math.max(0, pst.length - 1), false); }
  }, [goTo]);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    const remaining = DURATION_MS - elapsedRef.current;
    timerRef.current = window.setTimeout(() => { elapsedRef.current = 0; next(); }, remaining);
  }, [next]);

  const pauseTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    elapsedRef.current += Date.now() - startRef.current;
  }, []);

  // نوار پیشرفت — پرشدن لحظه‌ای
  useEffect(() => {
    if (paused) return;
    const iv = setInterval(() => {
      const el = elapsedRef.current + (Date.now() - startRef.current);
      setProgress(Math.min(100, (el / DURATION_MS) * 100));
    }, 50);
    return () => clearInterval(iv);
  }, [paused, sIdx, hIdx]);

  // تایمر خودکار هر استوری
  useEffect(() => { startTimer(); return () => clearTimeout(timerRef.current); }, [sIdx, hIdx, startTimer]);

  // کیبورد
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [next, prev, onClose]);

  // ── نگه‌داشتن انگشت = توقف تایمر؛ رها کردن = ادامه از همان‌جا؛ swipe = جابه‌جایی ──
  const pressStartRef = useRef(0);
  const skipClickRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);

  const beginHold = useCallback(() => { pressStartRef.current = Date.now(); skipClickRef.current = false; setPaused(true); pauseTimer(); }, [pauseTimer]);
  const endHold = useCallback(() => { setPaused(false); startTimer(); }, [startTimer]);

  const onPointerDown = (e: React.PointerEvent) => {
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    if (!swipeStartRef.current) swipeStartRef.current = { x: e.clientX, y: e.clientY };
    beginHold();
  };
  const onPointerUp = (e: React.PointerEvent) => {
    const held = Date.now() - pressStartRef.current;
    if (swipeStartRef.current) {
      const diffX = e.clientX - swipeStartRef.current.x;
      const diffY = e.clientY - swipeStartRef.current.y;
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        skipClickRef.current = true;
        if (diffX > 0) prev(); else next();
      }
    }
    if (held > LONG_PRESS_MS) skipClickRef.current = true; // نگه‌داشتن طولانی → ناوبری نشود
    swipeStartRef.current = null;
    endHold();
  };

  if (!slide) return null;
  const imgSrc = resolveImage(slide, vpnOn);
  const highlightCover = extractDirectMediaUrl(hl?.coverUrl, 'image') || resolveImage(stories[0] || slide, vpnOn);

  const handleClick = (e: React.MouseEvent) => {
    if (skipClickRef.current) { skipClickRef.current = false; return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev(); else next();
  };

  const isEn = lang === 'en';

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column',
      touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
      animation: 'zk-story-in .25s ease both', WebkitAnimation: 'zk-story-in .25s ease both',
    }}
      onPointerDown={onPointerDown} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}>
      {/* نوار پیشرفت اینستاگرامی: هر بخش = یک استوری؛ کامل‌شده سفید، فعال در حال پر شدن، بقیه کم‌نور */}
      <div style={{ display: 'flex', gap: 4, padding: '10px 10px 6px' }}>
        {stories.map((_, i) => {
          const done = i < sIdx;
          const current = i === sIdx;
          return (
            <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.35)', overflow: 'hidden' }}>
              <div style={{ height: '100%', borderRadius: 2, background: '#fff', width: done ? '100%' : current ? `${progress}%` : '0%', transition: current ? 'none' : 'width .25s ease' }} />
            </div>
          );
        })}
      </div>
      {/* هدر */}
      <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.soft, border: `2px solid ${T.acc}`, overflow: 'hidden', flexShrink: 0 }}>
          {highlightCover && <img src={highlightCover} alt="" referrerPolicy="no-referrer" draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: (hl as any).coverPosition || 'center', transform: (hl as any).coverZoom ? `scale(${(hl as any).coverZoom})` : undefined, WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }} />}
        </div>
        <span key={hIdx} style={{ color: '#fff', fontSize: 13, fontWeight: 700, flex: 1, animation: 'zk-story-slide .3s ease both', WebkitAnimation: 'zk-story-slide .3s ease both' }}>{hl?.title || ''}</span>
        {paused && <span style={{ color: 'rgba(255,255,255,.85)', fontSize: 11, fontWeight: 800, padding: '3px 9px', borderRadius: 6, background: 'rgba(255,255,255,.16)' }}>⏸ {isEn ? 'Paused' : 'متوقف'}</span>}
        <button onClick={onClose} aria-label={isEn ? 'Close' : 'بستن'} style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 26, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
      </div>
      {/* تصویر — با انیمیشن تغییر استوری/هایلایت */}
      <div key={`${hIdx}-${sIdx}`} onClick={handleClick} onContextMenu={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', animation: 'zk-story-slide .3s ease both', WebkitAnimation: 'zk-story-slide .3s ease both' }}>
        {imgSrc ? <SlideMedia src={imgSrc} /> : <div style={{ color: '#888', fontSize: 14 }}>{isEn ? 'Image not found' : 'تصویر یافت نشد'}</div>}
      </div>
      {/* عنوان اسلاید */}
      {slide.title && <div style={{ textAlign: 'center', padding: '8px 16px', color: '#fff', fontSize: 13 }}>{slide.title}</div>}

      {/* راهنمای اولین ورود */}
      {showHint && (
        <div onClick={(e) => { e.stopPropagation(); dismissHint(); }} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#fff', textAlign: 'center' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'zk-hint-pulse 1.4s ease-in-out infinite', WebkitAnimation: 'zk-hint-pulse 1.4s ease-in-out infinite' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{isEn ? 'Previous' : 'قبلی'}</span>
            </div>
            <div style={{ maxWidth: 260 }}>
              <div style={{ fontSize: 14, fontWeight: 800, marginBottom: 8 }}>{isEn ? 'How to browse stories' : 'چطور بین استوری‌ها بچرخید'}</div>
              <div style={{ fontSize: 12.5, lineHeight: 1.9, opacity: .95 }}>
                {isEn
                  ? 'Tap the right side of the screen for the next story and the left side for the previous one. Swipe left or right to move between highlights. Hold the image to pause.'
                  : 'برای استوری بعدی روی سمت راست و برای قبلی روی سمت چپ صفحه بزنید. با کشیدن انگشت به چپ یا راست، بین هایلایت‌ها جابه‌جا می‌شوید. با نگه‌داشتن انگشت روی عکس، پخش متوقف می‌شود.'}
              </div>
              <div style={{ marginTop: 12, display: 'inline-block', padding: '8px 18px', borderRadius: 999, background: '#fff', color: '#111', fontSize: 12.5, fontWeight: 800 }}>{isEn ? 'Got it' : 'متوجه شدم'}</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'zk-hint-pulse 1.4s ease-in-out infinite', WebkitAnimation: 'zk-hint-pulse 1.4s ease-in-out infinite' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{isEn ? 'Next' : 'بعدی'}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── نوار هایلایت‌ها (دایره‌ها) با حلقهٔ رنگی/خاکستری ───
export function StoryHighlightsBar({ highlights, T, lang }: { highlights: Highlight[]; T: any; lang: 'fa' | 'en' }) {
  const active = (highlights || []).filter(h => h.active !== false && h.stories?.some(s => s.active !== false)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [vpnOn, setVpnOn] = useState(false);
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zk_story_progress_v1') || '{}'); } catch { return {}; }
  });
  useEffect(() => { detectVpnOn().then(v => setVpnOn(v)).catch(() => setVpnOn(false)); }, []);
  useEffect(() => { if (openIdx === null) { try { setProgress(JSON.parse(localStorage.getItem('zk_story_progress_v1') || '{}')); } catch { setProgress({}); } } }, [openIdx]);

  if (!active.length) return null;
  return (
    <>
      <style>{`
        .zk-hl-btn{background:transparent;border:0;padding:0;cursor:pointer;font-family:inherit;display:flex;flex-direction:column;align-items:center;gap:4px;flex-shrink:0;-webkit-tap-highlight-color:transparent}
        .zk-hl-ring{width:58px;height:58px;border-radius:50%;padding:2.5px;box-sizing:content-box;position:relative;overflow:hidden;transition:transform .18s ease}
        .zk-hl-btn:active .zk-hl-ring{transform:scale(.88)}
        .zk-hl-spin{position:absolute;inset:-26px;background:conic-gradient(from 0deg,#feda75,#fa7e1e,#d62976,#962fbf,#4f5bd5,#feda75);animation:zk-ring-spin 5s linear infinite;-webkit-animation:zk-ring-spin 5s linear infinite}
        .zk-hl-inner{position:relative;z-index:1;width:100%;height:100%;border-radius:50%;overflow:hidden;display:flex;align-items:center;justify-content:center}
      `}</style>
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0 12px', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory' }}>
        {active.map((hl, i) => {
          const stories = storiesOf(hl);
          const firstStory = stories[0];
          const previewUrl = extractDirectMediaUrl(hl.coverUrl, 'image') || (firstStory ? resolveImage(firstStory, vpnOn) : '');
          const seenSet = new Set((progress?.[hl.id]?.seen) || []);
          const seen = stories.length > 0 && stories.every((s) => seenSet.has(s.id));
          return (
            <button key={hl.id} className="zk-hl-btn" onClick={() => setOpenIdx(i)} style={{ scrollSnapAlign: 'start' }}>
              <div className="zk-hl-ring" style={{ background: seen ? 'rgba(148,163,184,.55)' : '#fff' }}>
                {!seen && <span className="zk-hl-spin" aria-hidden="true" />}
                <div className="zk-hl-inner" style={{ background: T.card }}>
                  {previewUrl ? <img src={previewUrl} alt="" referrerPolicy="no-referrer" draggable={false} onContextMenu={(e) => e.preventDefault()} style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: (hl as any).coverPosition || 'center', transform: (hl as any).coverZoom ? `scale(${(hl as any).coverZoom})` : undefined, WebkitTouchCallout: 'none', WebkitUserSelect: 'none', userSelect: 'none' }} /> : <span style={{ fontSize: 18, color: T.acc }}>✦</span>}
                </div>
              </div>
              <span style={{ fontSize: 10, color: seen ? T.mut : T.ttl, fontWeight: seen ? 500 : 700, maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hl.title}</span>
            </button>
          );
        })}
      </div>
      {openIdx !== null && <StoryViewer highlights={active} startHighlight={openIdx} T={T} lang={lang} onClose={() => setOpenIdx(null)} vpnOn={vpnOn} />}
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
