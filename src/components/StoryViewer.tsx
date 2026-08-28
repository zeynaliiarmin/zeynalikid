// بازطراحی کامل استوری — چندین هایلایت، هر کدام چند استوری (فقط عکس)
// دو کد دستی (خارجی/داخلی) با قانون VPN + توقف تایمر + جابجایی بین هایلایت‌ها + swipe روان
// جدید: نوار پیشرفت اینستاگرامی + حلقهٔ رنگی/خاکستری + ادامه از جای دیده‌شده + راهنمای اولین ورود +
//       نگه‌داشتن انگشت = توقف تایمر (بدون منوی دانلود/کپی) + ضد دانلود تصویر
import { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { detectVpnOn } from '../utils/vpn';
import { extractDirectMediaUrl } from '../utils/mediaInput';
import { markStorySeen, getResumeIndex, hasSeenStoryHint, markStoryHintSeen } from '../utils/storyProgress';
import CoverImage from './CoverImage';

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
      onError={() => onReady?.()}
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
  const [loaded, setLoaded] = useState(false); // لود کامل عکس استوری فعلی
  const [closing, setClosing] = useState(false); // انیمیشن خروج (swipe پایین)
  const [holding, setHolding] = useState(false); // نگه‌داشتن انگشت → محو UI و توقف تایمر
  // انیمیشن مکعبی تغییر هایلایت — transition محور (همان مکانیزم انیمیشن خروج که تأیید شده کار می‌کند)
  const [hlDir, setHlDir] = useState<'next' | 'prev' | null>(null);
  const [hlStage, setHlStage] = useState<'out' | 'in' | null>(null);
  const [hlInStart, setHlInStart] = useState(false);
  const hlDirRef = useRef<'next' | 'prev' | null>(null);
  const [endAnim, setEndAnim] = useState(false); // پایان زنجیرهٔ هایلایت‌ها → مکعب محو به صفحه
  const endRef = useRef(false);
  const [dragY, setDragY] = useState(0); // جابه‌جایی عمودی هنگام کشیدن برای خروج
  const [snapping, setSnapping] = useState(false); // بازگشت نرم بعد از کشیدن کوتاه به پایین
  const closingRef = useRef(false);
  const timerRef = useRef<number>(0);
  const startRef = useRef(0);
  const elapsedRef = useRef(0);

  // رفرنس‌ها برای جلوگیری از stale-closure در تایمر خودکار
  const hIdxRef = useRef(hIdx); hIdxRef.current = hIdx;
  const sIdxRef = useRef(sIdx); sIdxRef.current = sIdx;
  const activeRef = useRef(active); activeRef.current = active;
  const vpnOnRef = useRef(vpnOn); vpnOnRef.current = vpnOn;
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
    setLoaded(false);
    setHIdx(hi); setSIdx(si); setProgress(0);
  }, [markSeenAt]);

  // خروج با انیمیشن (swipe پایین) — بعد از پایان انیمیشن واقعاً بسته می‌شود
  const exitStory = useCallback(() => {
    if (closingRef.current) return;
    closingRef.current = true;
    setClosing(true);
    clearTimeout(timerRef.current);
    window.setTimeout(() => onCloseRef.current(), 360);
  }, []);

  // پایان زنجیرهٔ هایلایت‌ها: انیمیشن مکعبِ محو‌شونده و برگشت به صفحهٔ آموزش/تجربه والدین
  // تا مخاطب متوجه شود که آخرین استوریِ آخرین هایلایت بوده است.
  const finishLast = useCallback(() => {
    if (endRef.current) return;
    endRef.current = true;
    markSeenAt(hIdxRef.current, sIdxRef.current);
    clearTimeout(timerRef.current);
    setEndAnim(true);
    window.setTimeout(() => onCloseRef.current(), 520);
  }, [markSeenAt]);

  // تابع تغییر هایلایت با انیمیشن — از طریق ref در دسترس next (برای رفتن خودکار) قرار می‌گیرد
  const startHlChangeRef = useRef<(dir: 'next' | 'prev') => void>(() => {});

  const next = useCallback(() => {
    if (hlDirRef.current) return; // در حال انیمیشن تغییر هایلایت → تایمر خودکار دخالت نکند
    const hi = hIdxRef.current, si = sIdxRef.current;
    const st = storiesRef.current, act = activeRef.current;
    if (si < st.length - 1) goTo(hi, si + 1);
    else if (hi < act.length - 1) startHlChangeRef.current('next'); // آخرین استوری → هایلایت بعدی با انیمیشن مکعب
    else { finishLast(); } // آخرین استوریِ آخرین هایلایت → مکعب محو + برگشت به صفحه
  }, [goTo, markSeenAt]);

  const prev = useCallback(() => {
    const hi = hIdxRef.current, si = sIdxRef.current;
    if (si > 0) goTo(hi, si - 1, false);
    else if (hi > 0) { const pst = storiesOf(activeRef.current[hi - 1]); goTo(hi - 1, Math.max(0, pst.length - 1), false); }
  }, [goTo]);

  // ── تغییر هایلایت با کشیدن انگشت (swipe) — انیمیشن مکعبی مثل اینستاگرام ──
  const startHlChange = useCallback((dir: 'next' | 'prev') => {
    if (hlDirRef.current) return; // حین انیمیشن، ورودی جدید نادیده گرفته شود
    const hi = hIdxRef.current;
    const act = activeRef.current;
    if (dir === 'next' && hi >= act.length - 1) { finishLast(); return; }
    if (dir === 'prev' && hi <= 0) return;
    const newHi = dir === 'next' ? hi + 1 : hi - 1;
    // پیش‌بارگذاری تصویر هایلایت ورودی تا موقع چرخش، spinner ظاهر نشود و انیمیشن لگ نگیرد
    const incoming = storiesOf(act[newHi])[0];
    const incomingSrc = resolveImage(incoming, vpnOnRef.current);
    if (incomingSrc) {
      try {
        const im = new Image();
        im.referrerPolicy = 'no-referrer';
        im.src = incomingSrc;
      } catch { /* ignore */ }
    }
    hlDirRef.current = dir;
    setHlDir(dir); setHlStage('out'); setHlInStart(false);
    clearTimeout(timerRef.current); // جلوگیری از advance خودکار در حین انیمیشن
    window.setTimeout(() => {
      goTo(newHi, 0); // محتوا عوض شود + استوری فعلی «دیده‌شده» ثبت شود
      setHlStage('in');
      requestAnimationFrame(() => requestAnimationFrame(() => setHlInStart(true)));
    }, 180);
  }, [goTo, markSeenAt]);
  startHlChangeRef.current = startHlChange;

  // پایان انیمیشن ورود هایلایت جدید
  useEffect(() => {
    if (hlStage !== 'in' || !hlInStart) return;
    const t = window.setTimeout(() => { setHlDir(null); setHlStage(null); setHlInStart(false); hlDirRef.current = null; }, 280);
    return () => clearTimeout(t);
  }, [hlStage, hlInStart]);

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

  // ── نگه‌داشتن انگشت = توقف تایمر؛ رها کردن = ادامه از همان‌جا؛ swipe = تغییر هایلایت / خروج ──
  const pressStartRef = useRef(0);
  const skipClickRef = useRef(false);
  const swipeStartRef = useRef<{ x: number; y: number } | null>(null);
  const holdTimerRef = useRef(0);
  const activePointerRef = useRef<number | null>(null);
  const dragYRef = useRef(0);

  const beginHold = useCallback(() => {
    pressStartRef.current = Date.now();
    skipClickRef.current = false;
    setPaused(true); pauseTimer();
    holdTimerRef.current = window.setTimeout(() => setHolding(true), LONG_PRESS_MS);
  }, [pauseTimer]);
  const endHold = useCallback(() => {
    clearTimeout(holdTimerRef.current);
    setHolding(false);
    setPaused(false);
    startTimer();
  }, [startTimer]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (activePointerRef.current !== null) return; // فقط اولین انگشت
    activePointerRef.current = e.pointerId;
    try { e.currentTarget.setPointerCapture(e.pointerId); } catch {}
    swipeStartRef.current = { x: e.clientX, y: e.clientY };
    beginHold();
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return;
    e.preventDefault();
    const start = swipeStartRef.current;
    if (!start) return;
    const diffX = e.clientX - start.x;
    const diffY = e.clientY - start.y;
    // کشیدن عمودی به پایین → استوری همراه انگشت پایین می‌آید و محو می‌شود (مثل اینستاگرام)
    if (diffY > 0 && Math.abs(diffY) > Math.abs(diffX)) {
      dragYRef.current = diffY;
      setDragY(diffY);
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (activePointerRef.current !== e.pointerId) return;
    activePointerRef.current = null;
    const held = Date.now() - pressStartRef.current;
    const start = swipeStartRef.current;
    swipeStartRef.current = null;
    if (start) {
      const diffX = e.clientX - start.x;
      const diffY = e.clientY - start.y;
      // کشیدن از بالا به پایین = خروج از استوری‌ها (مثل اینستاگرام)
      if (diffY > 80 && Math.abs(diffY) > Math.abs(diffX)) {
        skipClickRef.current = true;
        endHold();
        exitStory();
        return;
      }
      // کشیدن افقی = تغییر هایلایت (نه استوری) — مثل اینستاگرام
      if (Math.abs(diffX) > 50 && Math.abs(diffX) > Math.abs(diffY)) {
        skipClickRef.current = true;
        dragYRef.current = 0;
        setDragY(0);
        if (diffX > 0) startHlChange('prev'); else startHlChange('next');
        endHold();
        return;
      }
    }
    // کشیدن کوتاه به پایین بدون رسیدن به آستانه → بازگشت نرم به جای اول
    if (dragYRef.current > 4) {
      dragYRef.current = 0;
      setSnapping(true);
      setDragY(0);
      window.setTimeout(() => setSnapping(false), 360);
    }
    if (held > LONG_PRESS_MS) skipClickRef.current = true; // نگه‌داشتن طولانی → ناوبری نشود
    endHold();
  };

  if (!slide) return null;
  const imgSrc = resolveImage(slide, vpnOn);
  const highlightCover = extractDirectMediaUrl(hl?.coverUrl, 'image') || resolveImage(stories[0] || slide, vpnOn);

  const handleClick = (e: React.MouseEvent) => {
    if (hlDirRef.current) return; // حین انیمیشن تغییر هایلایت
    if (skipClickRef.current) { skipClickRef.current = false; return; }
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const x = e.clientX - rect.left;
    if (x < rect.width * 0.35) prev(); else next();
  };

  const isEn = lang === 'en';

  // انیمیشن مکعبی تغییر هایلایت (transition محور)
  const hlIsNext = hlDir === 'next';
  let cubeTransform = 'rotateY(0deg)';
  let cubeOpacity = 1;
  let cubeOrigin = 'center center';
  let cubeTransition = 'transform .24s cubic-bezier(.32,.72,.24,1), opacity .24s ease';
  if (hlStage === 'out') {
    cubeOrigin = hlIsNext ? 'left center' : 'right center';
    cubeTransform = hlIsNext ? 'rotateY(-68deg)' : 'rotateY(68deg)';
    cubeOpacity = 0.3;
    cubeTransition = 'transform .18s cubic-bezier(.55,.06,.68,.19), opacity .18s ease-in';
  } else if (hlStage === 'in') {
    cubeOrigin = hlIsNext ? 'right center' : 'left center';
    if (!hlInStart) {
      cubeTransform = hlIsNext ? 'rotateY(68deg)' : 'rotateY(-68deg)';
      cubeOpacity = 0.3;
      cubeTransition = 'none';
    } else {
      cubeTransform = 'rotateY(0deg)';
      cubeOpacity = 1;
    }
  }

  // رندر با createPortal به body تا استوری از قید stacking-context صفحه خارج شود و
  // بالای هدر ثابت سایت (z-index 1200) بنشیند — در نتیجه هدر پنهان می‌شود و نوار پیشرفت
  // در بالای صفحه دیده می‌شود. بعد از بستن استوری، هدر دوباره نمایان می‌شود.
  return createPortal(
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999, background: '#000', display: 'flex', flexDirection: 'column',
      paddingTop: 'env(safe-area-inset-top, 0px)', paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      touchAction: 'none', userSelect: 'none', WebkitUserSelect: 'none', WebkitTouchCallout: 'none',
      transform: endAnim
        ? 'perspective(1100px) rotateY(-16deg) translateY(26px) scale(.92)'
        : closing ? 'translateY(100%)' : `translateY(${dragY}px)`,
      opacity: (endAnim || closing) ? 0 : Math.max(0, 1 - dragY / (typeof window !== 'undefined' ? window.innerHeight * 0.6 : 500)),
      transformOrigin: 'center center',
      transition: endAnim
        ? 'transform .5s cubic-bezier(.4,0,.2,1), opacity .5s ease'
        : (closing || snapping) ? 'transform .34s cubic-bezier(.4,0,.2,1), opacity .34s ease' : 'none',
    }}
      onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
      onContextMenu={(e) => e.preventDefault()}>
      <div style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, animation: 'zk-story-in .25s ease both', WebkitAnimation: 'zk-story-in .25s ease both' }}>
      {/* نوار پیشرفت + هدر — هنگام نگه‌داشتن انگشت با انیمیشن محو می‌شوند تا تصویر کامل دیده شود */}
      <div style={{ opacity: holding ? 0 : 1, transition: 'opacity .3s ease', pointerEvents: holding ? 'none' : 'auto' }}>
        {/* نوار پیشرفت اینستاگرامی: هر بخش = یک استوری؛ کامل‌شده سفید، فعال در حال پر شدن، بقیه کم‌نور */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 10px 6px', direction: 'ltr' }}>
          {stories.map((_, i) => {
            const done = i < sIdx;
            const current = i === sIdx;
            return (
              <div key={i} style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,.35)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, height: '100%', borderRadius: 2, background: '#fff', width: done ? '100%' : current ? `${progress}%` : '0%', transition: current ? 'none' : 'width .25s ease' }} />
              </div>
            );
          })}
        </div>
        {/* هدر */}
        <div style={{ display: 'flex', alignItems: 'center', padding: '6px 12px', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: '50%', background: T.soft, border: `2px solid ${T.acc}`, overflow: 'hidden', flexShrink: 0 }}>
            {highlightCover && <CoverImage src={highlightCover} position={(hl as any).coverPosition} zoom={(hl as any).coverZoom} onContextMenu={(e:any) => e.preventDefault()} />}
          </div>
          <span key={hIdx} style={{ color: '#fff', fontSize: 13, fontWeight: 700, flex: 1, animation: 'zk-story-slide .3s ease both', WebkitAnimation: 'zk-story-slide .3s ease both' }}>{hl?.title || ''}</span>
          <button onClick={onClose} aria-label={isEn ? 'Close' : 'بستن'} style={{ border: 0, background: 'transparent', color: '#fff', fontSize: 26, cursor: 'pointer', padding: '4px 8px', lineHeight: 1 }}>×</button>
        </div>
      </div>
      {/* تصویر — با انیمیشن مکعبی تغییر هایلایت + لودینگ وسط استوری */}
      <div style={{ flex: 1, minHeight: 0, display: 'flex', perspective: '1400px', overflow: 'hidden' }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative', transform: cubeTransform, opacity: cubeOpacity, transformOrigin: cubeOrigin, transition: cubeTransition, willChange: 'transform, opacity', backfaceVisibility: 'hidden', WebkitBackfaceVisibility: 'hidden' }}>
          <div key={`${hIdx}-${sIdx}`} onClick={handleClick} onContextMenu={(e) => e.preventDefault()} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', overflow: 'hidden', position: 'relative', animation: hlDir ? 'none' : 'zk-story-slide .3s ease both', WebkitAnimation: hlDir ? 'none' : 'zk-story-slide .3s ease both' }}>
            {imgSrc ? <SlideMedia src={imgSrc} onReady={() => setLoaded(true)} /> : <div style={{ color: '#888', fontSize: 14 }}>{isEn ? 'Image not found' : 'تصویر یافت نشد'}</div>}
            {imgSrc && !loaded && (
              <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
                <span aria-hidden="true" style={{ width: 42, height: 42, borderRadius: '50%', border: '3px solid rgba(255,255,255,.22)', borderTopColor: '#fff', animation: 'zk-ring-spin .8s linear infinite', WebkitAnimation: 'zk-ring-spin .8s linear infinite' }} />
              </div>
            )}
          </div>
        </div>
      </div>
      {/* عنوان اسلاید — هنگام نگه‌داشتن انگشت محو می‌شود */}
      {slide.title && <div style={{ textAlign: 'center', padding: '8px 16px', color: '#fff', fontSize: 13, opacity: holding ? 0 : 1, transition: 'opacity .3s ease' }}>{slide.title}</div>}
      </div>

      {/* راهنمای اولین ورود */}
      {showHint && (
        <div onClick={(e) => { e.stopPropagation(); dismissHint(); }} style={{ position: 'absolute', inset: 0, zIndex: 60, background: 'rgba(0,0,0,.62)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20, cursor: 'pointer' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, color: '#fff', textAlign: 'center', direction: 'ltr' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, animation: 'zk-hint-pulse 1.4s ease-in-out infinite', WebkitAnimation: 'zk-hint-pulse 1.4s ease-in-out infinite' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>
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
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
              <span style={{ fontSize: 12, fontWeight: 800 }}>{isEn ? 'Next' : 'بعدی'}</span>
            </div>
          </div>
        </div>
      )}
    </div>,
    document.body,
  );
}

// ─── نوار هایلایت‌ها (دایره‌ها) با حلقهٔ رنگی/خاکستری ───
export function StoryHighlightsBar({ highlights, T, lang, mediaCountryMode }: { highlights: Highlight[]; T: any; lang: 'fa' | 'en'; mediaCountryMode?: string }) {
  const active = (highlights || []).filter(h => h.active !== false && h.stories?.some(s => s.active !== false)).sort((a, b) => (a.order || 0) - (b.order || 0));
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const [vpnOn, setVpnOn] = useState(false);
  const [progress, setProgress] = useState(() => {
    try { return JSON.parse(localStorage.getItem('zk_story_progress_v1') || '{}'); } catch { return {}; }
  });
  const storyHistRef = useRef(false);

  // پیروی از تنظیم «تشخیص VPN / کشور کاربر» (mediaCountryMode) مثل بقیهٔ محتواها
  useEffect(() => {
    let alive = true;
    const mode = mediaCountryMode || 'auto';
    if (mode === 'iran') { setVpnOn(false); return; }
    if (mode === 'intl') { setVpnOn(true); return; }
    detectVpnOn().then(v => { if (alive) setVpnOn(v); }).catch(() => { if (alive) setVpnOn(false); });
    return () => { alive = false; };
  }, [mediaCountryMode]);
  useEffect(() => { if (openIdx === null) { try { setProgress(JSON.parse(localStorage.getItem('zk_story_progress_v1') || '{}')); } catch { setProgress({}); } } }, [openIdx]);

  // دکمهٔ Back گوشی/مرورگر باید فقط استوری را ببندد، نه اینکه به صفحهٔ قبل (هوم) برگردد.
  useEffect(() => {
    const onPop = () => { storyHistRef.current = false; setOpenIdx(null); };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);
  const openStory = useCallback((i: number) => {
    if (!storyHistRef.current) {
      try { window.history.pushState({ zkStory: true }, ''); } catch {}
      storyHistRef.current = true;
    }
    setOpenIdx(i);
  }, []);
  const closeStory = useCallback(() => {
    if (storyHistRef.current) {
      storyHistRef.current = false;
      try { window.history.back(); } catch {}
    }
    setOpenIdx(null);
  }, []);

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
      <div style={{ display: 'flex', gap: 12, overflowX: 'auto', padding: '8px 0 12px', WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', direction: 'ltr' }}>
        {active.map((hl, i) => {
          const stories = storiesOf(hl);
          const firstStory = stories[0];
          const previewUrl = extractDirectMediaUrl(hl.coverUrl, 'image') || (firstStory ? resolveImage(firstStory, vpnOn) : '');
          const seenSet = new Set((progress?.[hl.id]?.seen) || []);
          const seen = stories.length > 0 && stories.every((s) => seenSet.has(s.id));
          return (
            <button key={hl.id} className="zk-hl-btn" onClick={() => openStory(i)} style={{ scrollSnapAlign: 'start' }}>
              <div className="zk-hl-ring" style={{ background: seen ? 'rgba(148,163,184,.55)' : T.card }}>
                {!seen && <span className="zk-hl-spin" aria-hidden="true" />}
                <div className="zk-hl-inner" style={{ background: T.card }}>
                  {previewUrl ? <CoverImage src={previewUrl} position={(hl as any).coverPosition} zoom={(hl as any).coverZoom} onContextMenu={(e:any) => e.preventDefault()} /> : <span style={{ fontSize: 18, color: T.acc }}>✦</span>}
                </div>
              </div>
              <span style={{ fontSize: 10, color: seen ? T.mut : T.ttl, fontWeight: seen ? 500 : 700, maxWidth: 62, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hl.title}</span>
            </button>
          );
        })}
      </div>
      {openIdx !== null && <StoryViewer highlights={active} startHighlight={openIdx} T={T} lang={lang} onClose={closeStory} vpnOn={vpnOn} />}
    </>
  );
}

// Backward compatibility: اگر از ساختار قدیمی (items بدون highlights) استفاده شود
export function LegacyStoryHighlightsBar({ items, T, lang, mediaCountryMode }: { items: any[]; T: any; lang: 'fa' | 'en'; mediaCountryMode?: string }) {
  const highlights: Highlight[] = [{
    id: 'legacy', title: 'استوری', stories: (items || []).map((it: any) => ({
      id: it.id, imageCodeExternal: it.embedCode || '', imageCodeInternal: it.embedCode || '',
      title: it.title, order: it.order, active: it.active,
    })), active: true,
  }];
  return <StoryHighlightsBar highlights={highlights} T={T} lang={lang} mediaCountryMode={mediaCountryMode} />;
}
