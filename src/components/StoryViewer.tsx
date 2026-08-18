// بازطراحی کامل استوری — چندین هایلایت، هر کدام چند استوری (فقط عکس)
// دو کد دستی (خارجی/داخلی) با قانون VPN + توقف تایمر + جابجایی بین هایلایت‌ها + swipe روان
// جدید: حلقهٔ رنگی/خاکستری شبیه اینستاگرام + ادامه از جای دیده‌شده + راهنمای اولین ورود + انیمیشن تغییر هایلایت
import { useCallback, useEffect, useRef, useState } from 'react';
import { detectVpnOn } from '../utils/vpn';
import { extractDirectMediaUrl } from '../utils/mediaInput';
import { markStorySeen, getResumeIndex, hasSeenStoryHint, markStoryHintSeen } from '../utils/storyProgress';

export type StorySlide = { id: string; imageCodeExternal?: string; imageCodeInternal?: string; title?: string; order?: number; active?: boolean };
export type Highlight = { id: string; title: string; coverUrl?: string; coverPosition?: string; coverZoom?: number; stories: StorySlide[]; active?: boolean; order?: number };

const DURATION_MS = 8000;

// گرادیان رنگی حلقهٔ استوری (شبیه اینستاگرام)
const RING_GRADIENT = 'conic-gradient(from 0deg, #feda75, #fa7e1e, #d62976, #962fbf, #4f5bd5, #feda75)';

function resolveImage(slide: StorySlide, vpnOn: boolean): string {
  const ext = extractDirectMediaUrl(slide.imageCodeExternal, 'image');
  const int = extractDirectMediaUrl(slide.imageCodeInternal, 'image');
  if (vpnOn) return ext || int;
  return int || ext;
}

function SlideMedia({ src, onReady }: { src: string; onReady?: () => void }) {
  return <img src={src} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain', background: '#000' }} draggable={false} onLoad={() => onReady?.()} />;
}

// ─── StoryViewer: اسلایدشو تمام‌صفحه ───
export default function StoryViewer({ highlights, startHighlight = 0, T, onClose, vpnOn = false, lang = 'fa' }: {
  highlights: Highlight[]; startHighlight?: number; T: any; onClose: () => void; vpnOn?: boolean; lang?: 'fa' | 'en';
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

  // راهنمای اولین ورود — فقط یک‌بار برای هر دستگاه
  const [showHint, setShowHint] = useState(() => !hasSeenStoryHint());
  const dismissHint = useCallback(() => { setShowHint(false); markStoryHintSeen(); }, []);
  useEffect(() => {
    if (!showHint) return;
    const t = setTimeout(dismissHint, 6000);
    return () => clearTimeout(t);
  }, [showHint, dismissHint]);

  // ثبت «دیده‌شدن» استوری فعال (پیشرفت ذخیره می‌شود تا ادامه از همان‌جا ممکن باشد)
  useEffect(() => {
    if (hl?.id && slide?.id) markStorySeen(hl.id, slide.id);
  }, [hl?.id, slide?.id]);

  // شروع از اولین استوریِ دیده‌نشده (اگر همه دیده شده باشند از اول پخش می‌شود)
  useEffect(() => {
    if (!active.length) return;
    const hl0 = active[Math.min(startHighlight, active.length - 1)];
    const st = (hl0?.stories || []).filter((s: any) => s.active !== false).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
    const resume = getResumeIndex(hl0?.id || '', st.map((s: any) => s.id));
    if (resume > 0) setSIdx(resume);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startTimer = useCallback(() => {
    startRef.current = Date.now();
    const remaining = DURATION_MS - elapsedRef.current;
    timerRef.current = window.setTimeout(() => { elapsedRef.current = 0; next(); }, remaining);
  }, []);

  const pauseTimer = useCallback(() => {
    clearTimeout(timerRef.current);
    elapsedRef.current += Date.now() - startRef.current;
  }, []);

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

  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); if (e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', h); return () => window.removeEventListener('keydown', h);
  }, [next, prev, onClose]);

  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const onTouchStart = (e: React.TouchEvent) => { touchStartX.current = e.touches[0].clientX; touchStartY.current = e.touches[0].clientY; setPaused(true); pauseTimer(); };
  const onTouchMove = (e: React.TouchEvent) => { e.preventDefault(); };
  const onTouchEnd = (e: React.TouchEvent) => {
    const diffX = e.changedTouches[0].clientX - touchStartX.current;
    const diffY = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) { if (diffX > 0) prev(); else next(); }
    setPaused(false); startTimer();
  };

  if (!slide) return null;
  const imgSrc = resolveImage(slide, vpnOn);
  const highlightCover = extractDirectMediaUrl(hl?.coverUrl, 'image') || resolveImage(stories[0] || slide, vpnOn);

  const handleClick = (e: React.MouseEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev(); else next();
  };

  const isEn = lang === 'en';

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column', touchAction: 'none', animation: 'zk-story-in .25s ease both', WebkitAnimation: 'zk-story-in .25s ease both' }}
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
          {highlightCover && <img src={highlightCover} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: (hl as any).coverPosition || 'center', transform: (hl as any).coverZoom ? `scale(${(hl as any).coverZoom})` : undefined }} />}
        </div>
        <span key={hIdx} style={{ color: '#fff', fontSize: 13, fontWeight: 700, flex: 1, animation: 'zk-story-slide .3s ease both', WebkitAnimation: 'zk-story-slide .3s ease both' }}>{hl?.title || ''}</span>
        {paused && <span style={{ color: 'rgba(255,255,255,.8)', fontSize: 12, fontWeight: 800, padding: '2px 8px', borderRadius: 6, background: 'rgba(255,255,255,.15)' }}>{isEn ? 'Paused' : 'متوقف'}</span>}
        <button onClick={onClose} aria-label={isEn ? 'Close' : 'بستن'} style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 26, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
      </div>
      {/* تصویر — با انیمیشن تغییر استوری/هایلایت */}
      <div key={`${hIdx}-${sIdx}`} onClick={handleClick} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', animation: 'zk-story-slide .3s ease both', WebkitAnimation: 'zk-story-slide .3s ease both' }}>
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
                  ? 'Tap the right side of the screen for the next story and the left side for the previous one. Swipe left or right to move between highlights.'
                  : 'برای استوری بعدی روی سمت راست و برای قبلی روی سمت چپ صفحه بزنید. با کشیدن انگشت به چپ یا راست، بین هایلایت‌ها جابه‌جا می‌شوید.'}
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
          const stories = (hl.stories || []).filter((story) => story.active !== false).sort((a, b) => (a.order || 0) - (b.order || 0));
          const firstStory = stories[0];
          const previewUrl = extractDirectMediaUrl(hl.coverUrl, 'image') || (firstStory ? resolveImage(firstStory, vpnOn) : '');
          const seenSet = new Set((progress?.[hl.id]?.seen) || []);
          const seen = stories.length > 0 && stories.every((s) => seenSet.has(s.id));
          return (
            <button key={hl.id} className="zk-hl-btn" onClick={() => setOpenIdx(i)} style={{ scrollSnapAlign: 'start' }}>
              <div className="zk-hl-ring" style={{ background: seen ? 'rgba(148,163,184,.55)' : '#fff' }}>
                {!seen && <span className="zk-hl-spin" aria-hidden="true" />}
                <div className="zk-hl-inner" style={{ background: T.card }}>
                  {previewUrl ? <img src={previewUrl} alt="" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: (hl as any).coverPosition || 'center', transform: (hl as any).coverZoom ? `scale(${(hl as any).coverZoom})` : undefined }} draggable={false} /> : <span style={{ fontSize: 18, color: T.acc }}>✦</span>}
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
