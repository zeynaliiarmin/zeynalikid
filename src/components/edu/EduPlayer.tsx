import { useEffect, useRef, useState } from 'react';
import { type EduItem } from './edu-data';
import { ManualEmbed } from '../MediaCard';

const PlayGlyph = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
);
const PauseGlyph = ({ size = 24 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6.5" y="5" width="4" height="14" rx="1.4" /><rect x="13.5" y="5" width="4" height="14" rx="1.4" /></svg>
);

const fmt = (s: number) => {
  const m = Math.floor(s / 60), ss = Math.floor(s % 60);
  return `${String(m).padStart(2, '0')}:${String(ss).padStart(2, '0')}`;
};

/**
 * پلیر ویدیو/پادکست — Stage 8
 * اگر آیتم url/manualCode واقعی داشته باشد همان محتوای موجود (ManualEmbed) رندر می‌شود؛
 * در غیر این صورت UI پلیر نمایشی با هندلرهای آماده برای اتصال در مراحل بعد.
 */
export default function EduPlayer({ item, kind, lang }: { item: EduItem; kind: 'video' | 'audio' | 'image'; lang: string }) {
  const en = lang === 'en';
  const hasReal = !!(item.url || (item as any).manualCode);
  const [playing, setPlaying] = useState(false);
  const [t, setT] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [soonNote, setSoonNote] = useState(false);
  const toastTimer = useRef<any>(0);
  const total = (item.minutes || 5) * 60;

  // حالت نمایشی (بدون فایل واقعی): Play فقط یک یادآور ملایم نشان می‌دهد — بدون ارور
  const onPlay = () => {
    if (hasReal) { setPlaying(v => !v); return; }
    setSoonNote(true);
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSoonNote(false), 2600);
  };
  useEffect(() => () => clearTimeout(toastTimer.current), []);

  // برای ویدیو: اگر تصویر بندانگشتی/کاور داشته باشد، اول پیش‌نمایش (فریم اول / thumbnail) نشان داده
  // می‌شود و با زدن دکمهٔ پخش، پخش واقعی شروع می‌شود. اگر هیچ تصویر بندانگشتی انتخاب نشده باشد،
  // دکمهٔ میانی حذف و پلیر خودِ آپارات/یوتیوب مستقیماً نمایش داده می‌شود تا با یک ضربه (دکمهٔ پخش
  // خود پلتفرم) ویدیو پخش شود.
  if (hasReal) {
    const code = (item as any).manualCode || item.url || '';
    // بندانگشتی «واقعی» = چیزی که ادمین برای ویدیو تنظیم کرده (cover/thumbnail).
    // cover خودکارِ ساخته‌شده از فریم اول ویدیو (با فلگ _autoCover) ملاک پیش‌نمایش نیست
    // تا پلیر خودِ آپارات/یوتیوب مستقیم با یک دکمه نمایش داده شود.
    const realThumb = ((item as any).thumbnail)
      || ((item as any)._autoCover ? '' : (item.cover || ''));
    const hasThumb = !!realThumb;
    if (kind === 'video' && hasThumb && !playing) {
      return (
        <div className="zke-player" style={{ border: 0, padding: 0, background: 'transparent' }}>
          <button
            type="button"
            onClick={onPlay}
            aria-label={en ? 'Play video' : 'پخش ویدیو'}
            style={{ position: 'relative', width: '100%', minHeight: 210, aspectRatio: '16 / 9', border: 0, padding: 0, cursor: 'pointer', background: '#000', borderRadius: 12, overflow: 'hidden', display: 'block' }}
          >
            {realThumb ? (
              <img src={realThumb} alt="" referrerPolicy="no-referrer" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(145deg,#0F766E22,#0EA5E911)' }} />
            )}
            <span style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(0,0,0,0.55)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <PlayGlyph size={28} />
              </span>
            </span>
          </button>
          <p className="zke-player-note" style={{ color: 'var(--zk-text-muted)', fontSize: 11.5 }}>{en ? 'Preview — tap play to watch.' : 'پیش‌نمایش — برای پخش روی دکمه بزنید.'}</p>
        </div>
      );
    }
    return (
      <div className="zke-player" style={{ border: 0, padding: 0, background: 'transparent' }}>
        <ManualEmbed code={code} type={kind} minHeight={kind === 'audio' ? 90 : 220} />
      </div>
    );
  }

  const soon = kind === 'video'
    ? (en ? 'This video will be uploaded soon — the player is ready to connect.' : 'ویدیو به‌زودی بارگذاری می‌شود — چارچوب پخش آمادهٔ اتصال است.')
    : kind === 'image'
    ? (en ? 'This image will be uploaded soon.' : 'تصویر این قسمت به‌زودی بارگذاری می‌شود.')
    : (en ? 'The audio file will be uploaded soon — the player is ready to connect.' : 'فایل صوتی این قسمت به‌زودی بارگذاری می‌شود — پلیر برای اتصال آماده است.');

  return (
    <div className="zke-player">
      <div className="zke-player-top">
        <button type="button" className="zke-playbtn" aria-label={playing ? (en ? 'Pause' : 'توقف') : (en ? 'Play' : 'پخش')} onClick={onPlay}>
          {playing ? <PauseGlyph /> : <PlayGlyph />}
        </button>
        <div className="zke-progress" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={Math.round(t)}>
          <i style={{ width: `${Math.min(100, (t / total) * 100)}%` }} />
        </div>
        <span className="zke-times" dir="ltr">{fmt(t)} / {fmt(total)}</span>
      </div>
      <div className="zke-player-tools">
        <button type="button" className="zke-tool" onClick={() => setSpeed(s => (s === 1 ? 1.5 : s === 1.5 ? 2 : 1))} title={en ? 'Playback speed' : 'سرعت پخش'}>
          <span dir="ltr">{speed}x</span>
        </button>
        <button type="button" className="zke-tool" onClick={() => {}} title={en ? 'Download (coming soon)' : 'دانلود (به‌زودی)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3.5V15" /><path d="m7 10.5 5 5 5-5" /><path d="M4 20.5h16" /></svg>
          {en ? 'Download' : 'دانلود'}
        </button>
        <button type="button" className="zke-tool" onClick={() => {}} title={en ? 'Share (coming soon)' : 'اشتراک (به‌زودی)'}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="6" cy="12" r="2.5" /><circle cx="17" cy="6" r="2.5" /><circle cx="17" cy="18" r="2.5" /><path d="m8.3 10.8 6.4-3.6M8.3 13.2l6.4 3.6" /></svg>
          {en ? 'Share' : 'اشتراک'}
        </button>
      </div>
      {soonNote && <p className="zke-player-note" role="status" style={{ color: 'var(--zk-primary, #0F766E)', fontWeight: 700, animation: 'zkeFade .25s ease both' }}>{en ? 'This episode will be published soon — thanks for staying with us.' : 'این قسمت به‌زودی منتشر می‌شود؛ سپاس که همراه ما می‌مانید.'}</p>}
      <p className="zke-player-note">{soon}</p>
    </div>
  );
}