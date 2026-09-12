import { useState } from 'react';
import { typeLabel, type EduItem } from './edu-data';
import { seoKeyOf } from '../../lib/seo';
import { TextIcon, VideoIcon, AudioIcon } from '../Icons';
import CollapsibleCardText from '../CollapsibleCardText';
import useMediaDuration from '../../hooks/useMediaDuration';
import { computeDurationSeconds, formatDuration } from '../../utils/eduDuration';

const Wave = () => (
  <span className="zke-wave" aria-hidden="true">
    {[8, 14, 20, 12, 24, 16, 9, 18, 25, 13, 21, 10, 17, 23, 11, 19, 8, 15, 22, 12].map((h, i) => <i key={i} style={{ height: `${h}px` }} />)}
  </span>
);

export default function EduCard({ item, lang, onOpen, views }: { item: EduItem; lang: string; onOpen: (it: EduItem) => void; views?: number }) {
  // لینک واقعی <a href> برای خزنده‌ها (کلیک کاربر: همان رفتار مودال/.navigate، بدون redirect سخت)
  const seoHref=`/education/${encodeURIComponent(seoKeyOf(item))}`;
  const en = lang === 'en';
  const isArticle = item.type === 'article' || item.type === 'text' || item.type === 'image';
  const badgeCls = isArticle ? 't-text' : item.type === 'video' ? 't-video' : 't-audio';
  const Icon = isArticle ? TextIcon : item.type === 'video' ? VideoIcon : AudioIcon;
  // کارت فقط جزئیات را باز می‌کند؛ پخش، در صفحه جزئیات با کنترل خودِ پلتفرم انجام می‌شود.
  const cta = en ? 'View details' : 'مشاهده جزئیات';
  const viewsText = (typeof views === 'number' && !Number.isNaN(views))
    ? (en ? `${Number(views).toLocaleString('en-US')} views` : `${Number(views).toLocaleString('fa-IR')} بازدید`)
    : null;
  // مدت‌زمان خودکار: مقاله = مطالعه متن؛ ویدیو/ویس = مدت واقعی فایل + مطالعه توضیحات
  const mediaSeconds = useMediaDuration(item as any);
  const duration = formatDuration(item.type, computeDurationSeconds(item as any, mediaSeconds ?? 0), lang);
  // عکس در پیش‌نمایش کارت باید کامل و با ابعاد خودش دیده شود (نه برش‌خورده در قاب ۱۶:۹)
  const isImage = item.type === 'image';
  const [coverStage, setCoverStage] = useState(0);
  // اگر ویدیو هیچ تصویر بندانگشتی نداشته باشد و آپارات باشد، poster واقعی از Edge Function گرفته می‌شود
  const aparatHash = (item as any)?._aparatHash || '';
  let thumbFn = '';
  if (aparatHash) {
    try {
      const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/+$/, '');
      if (base) thumbFn = `${base}/functions/v1/aparat-thumb?uid=${encodeURIComponent(aparatHash)}`;
    } catch { thumbFn = ''; }
  }
  const coverSrc = coverStage === 0 ? (item.cover || thumbFn) : coverStage === 1 ? thumbFn : '';
  const coverFailed = !coverSrc;
  return (
    <article className="zke-card">
      <a href={seoHref} className={`zke-cover${isImage ? ' zke-cover--image' : ''}`} onClick={(e) => { e.preventDefault(); onOpen(item); }} aria-label={`${typeLabel(item.type, lang)}: ${en ? item.titleEn : item.title}`} style={{ border: 0, padding: 0, cursor: 'pointer', width: '100%', display: 'block', textDecoration: 'none', color: 'inherit', fontFamily: 'inherit', background: 'none' }}>
        {coverSrc && !coverFailed ? <img src={coverSrc} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setCoverStage((s) => (s === 0 && item.cover && thumbFn ? 1 : 2))} style={isImage ? { width: '100%', height: 'auto', maxHeight: 360, objectFit: 'contain' } : undefined} /> : <span className="zke-cover-ph"><Icon size={44} /></span>}
        <span className={`zke-badge ${badgeCls}`}><Icon size={12} /> {typeLabel(item.type, lang)}</span>
        {item.type === 'audio' && <Wave />}
      </a>
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
          {(item.author || item.authorEn) && <span title={en?'Author':'نویسنده'}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" /></svg>{en ? (item.authorEn || item.author) : (item.author || item.authorEn)}</span>}
          {item.sourceUrl && /^https?:\/\//i.test(String(item.sourceUrl)) && <a href={String(item.sourceUrl)} target="_blank" rel="noreferrer" style={{color:'var(--zk-primary-text,var(--zk-primary,#0B5D56))',display:'inline-flex',alignItems:'center',gap:4}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>{en?'Source':'منبع'}</a>}
          <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3.5 2" /></svg>{en ? item.dateEn : item.date}</span>
          <span>{duration}</span>
        </div>
        <div className="zke-card-cta">
          <a href={seoHref} className="zke-pillbtn" onClick={(e) => { e.preventDefault(); onOpen(item); }} style={{ textDecoration: 'none' }}>{cta}
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: en ? 'none' : 'scaleX(-1)' }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
          </a>
        </div>
      </div>
    </article>
  );
}