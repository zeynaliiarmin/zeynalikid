import { useState } from 'react';
import { typeLabel, type EduItem } from './edu-data';
import { TextIcon, VideoIcon, AudioIcon } from '../Icons';
import CollapsibleCardText from '../CollapsibleCardText';
import useMediaDuration from '../../hooks/useMediaDuration';
import { computeDurationSeconds, formatDuration } from '../../utils/eduDuration';

const PlayGlyph = ({ size = 22 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z" /></svg>
);
const Wave = () => (
  <span className="zke-wave" aria-hidden="true">
    {[8, 14, 20, 12, 24, 16, 9, 18, 25, 13, 21, 10, 17, 23, 11, 19, 8, 15, 22, 12].map((h, i) => <i key={i} style={{ height: `${h}px` }} />)}
  </span>
);

export default function EduCard({ item, lang, onOpen, views }: { item: EduItem; lang: string; onOpen: (it: EduItem) => void; views?: number }) {
  const en = lang === 'en';
  const isArticle = item.type === 'article' || item.type === 'text' || item.type === 'image';
  const badgeCls = isArticle ? 't-text' : item.type === 'video' ? 't-video' : 't-audio';
  const Icon = isArticle ? TextIcon : item.type === 'video' ? VideoIcon : AudioIcon;
  const cta = isArticle ? (en ? 'Read' : 'مشاهده') : item.type === 'video' ? (en ? 'Watch' : 'پخش') : (en ? 'Listen' : 'شنیدن');
  const viewsText = (typeof views === 'number' && !Number.isNaN(views))
    ? (en ? `${Number(views).toLocaleString('en-US')} views` : `${Number(views).toLocaleString('fa-IR')} بازدید`)
    : null;
  // مدت‌زمان خودکار: مقاله = مطالعهٔ متن؛ ویدیو/ویس = مدت واقعی فایل + مطالعهٔ توضیحات
  const mediaSeconds = useMediaDuration(item as any);
  const duration = formatDuration(item.type, computeDurationSeconds(item as any, mediaSeconds ?? 0), lang);
  // عکس در پیش‌نمایش کارت باید کامل و با ابعاد خودش دیده شود (نه برش‌خورده در قاب ۱۶:۹)
  const isImage = item.type === 'image';
  const [coverFailed, setCoverFailed] = useState(false);
  // اگر ویدیو هیچ تصویر بندانگشتی نداشته باشد و آپارات باشد، poster واقعی از Edge Function گرفته می‌شود
  const aparatHash = (item as any)?._aparatHash || '';
  let coverSrc = item.cover || '';
  if (!coverSrc && aparatHash) {
    try {
      const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/+$/, '');
      if (base) coverSrc = `${base}/functions/v1/aparat-thumb?uid=${encodeURIComponent(aparatHash)}`;
    } catch { coverSrc = ''; }
  }
  return (
    <article className="zke-card">
      <button type="button" className={`zke-cover${isImage ? ' zke-cover--image' : ''}`} onClick={() => onOpen(item)} aria-label={`${typeLabel(item.type, lang)}: ${en ? item.titleEn : item.title}`} style={{ border: 0, padding: 0, cursor: 'pointer', width: '100%' }}>
        {coverSrc && !coverFailed ? <img src={coverSrc} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setCoverFailed(true)} style={isImage ? { width: '100%', height: 'auto', maxHeight: 360, objectFit: 'contain' } : undefined} /> : <span className="zke-cover-ph"><Icon size={44} /></span>}
        <span className={`zke-badge ${badgeCls}`}><Icon size={12} /> {typeLabel(item.type, lang)}</span>
        {item.type === 'video' && <span className="zke-play-ov"><PlayGlyph /></span>}
        {item.type === 'audio' && <Wave />}
      </button>
      <div className="zke-body">
        <h3 className="zke-card-title">{en ? item.titleEn : item.title}</h3>
        <CollapsibleCardText
          text={en ? item.descEn : item.desc}
          className="zke-card-desc"
          background="var(--zk-surface, #fff)"
          moreLabel={en ? 'More…' : 'بیشتر…'}
          lessLabel={en ? 'Less' : 'کمتر'}
          direction={en ? 'ltr' : 'rtl'}
        />
        <div className="zke-meta">
          {viewsText && <span className="zke-meta-views"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>{viewsText}</span>}
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>{en ? item.dateEn : item.date}</span>
          <span>{duration}</span>
        </div>
        <div className="zke-card-cta">
          <button type="button" className="zke-pillbtn" onClick={() => onOpen(item)}>{cta}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: en ? 'none' : 'scaleX(-1)' }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </button>
        </div>
      </div>
    </article>
  );
}