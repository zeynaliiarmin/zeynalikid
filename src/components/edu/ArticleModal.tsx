import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type EduItem, typeLabel } from './edu-data';
import useMediaDuration from '../../hooks/useMediaDuration';
import { computeDurationSeconds, formatDuration } from '../../utils/eduDuration';
import EduCard from './EduCard';
import EduPlayer from './EduPlayer';
import { TextIcon, VideoIcon, AudioIcon, PhotoIcon } from '../Icons';
import { Highlights, RichText } from '../MediaHighlights';

/**
 * مدال جزئیات محتوا — Stage 8
 * موبایل: BottomSheet تمام‌صفحه · دسکتاپ: پنجره وسط (حداکثر ۷۶۰)
 */
export default function ArticleModal({ item, related, lang, onClose, onOpen, onConsult, views, viewsOf }: {
  item: EduItem; related: EduItem[]; lang: string;
  onClose: () => void; onOpen: (it: EduItem) => void; onConsult: () => void;
  views?: number; viewsOf?: (item: EduItem) => number;
}) {
  const en = lang === 'en';
  // مدت‌زمان خودکار: مقاله = مطالعهٔ متن؛ ویدیو/ویس = مدت واقعی فایل + مطالعهٔ توضیحات
  const mediaSeconds = useMediaDuration(item as any);
  const duration = formatDuration(item.type, computeDurationSeconds(item as any, mediaSeconds ?? 0), lang);
  const viewsText = (typeof views === 'number' && !Number.isNaN(views))
    ? (en ? `${Number(views).toLocaleString('en-US')} views` : `${Number(views).toLocaleString('fa-IR')} بازدید`)
    : null;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev; };
  }, [onClose]);

  const Icon = item.type === 'text' ? TextIcon : item.type === 'video' ? VideoIcon : item.type === 'image' ? PhotoIcon : AudioIcon;
  const paras = (item.body || '').split('\n\n').filter(Boolean);

  return createPortal(
    <div className="zke-modal" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }} role="dialog" aria-modal="true" aria-label={en ? item.titleEn : item.title}>
      <div className="zke-modal-win">
        <div className="zke-modal-head">
          <button type="button" className="zke-back" onClick={onClose}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: en ? 'none' : 'scaleX(-1)' }}><path d="M19 12H5" /><path d="m11 6-6 6 6 6" /></svg>
            {en ? 'Back' : 'بازگشت'}
          </button>
          <h2>{en ? item.titleEn : item.title}</h2>
          <span style={{ color: 'var(--zk-primary, #0F766E)', display: 'inline-flex' }} title={typeLabel(item.type, lang)}><Icon size={17} /></span>
        </div>

        <div className="zke-article">
          <div className="zke-article-meta">
            {viewsText && <span style={{ color: 'var(--zk-primary, #0F766E)', fontWeight: 700 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>{viewsText}</span>}
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" /></svg>{en ? 'Zeynalikid care team' : 'تیم همراهی زینالیکید'}</span>
            <span>{en ? item.dateEn : item.date}</span>
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg> {duration}</span>
          </div>

          {item.type !== 'text' && <EduPlayer item={item} kind={item.type === 'video' ? 'video' : item.type === 'image' ? 'image' : 'audio'} lang={lang} />}

          <Highlights highlights={(item as any).highlights} />
          {item.type === 'text' ? (
            <>
              {paras.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {paras.map((p, i) => (
                    <RichText key={i} text={p} lang={lang} />
                  ))}
                </div>
              ) : (
                <RichText text={en ? item.descEn : item.desc} lang={lang} />
              )}
              {item.quote && <blockquote>{item.quote}</blockquote>}
            </>
          ) : (
            <RichText text={en ? item.descEn : item.desc} lang={lang} />
          )}

          <div className="zke-cta">
            <b>{en ? 'Need a personalized path for your child?' : 'برای فرزندتان مسیر شخصی‌سازی‌شده لازم است؟'}</b>
            <p>{en ? 'Public content is for awareness only. A private consultation reviews your child’s condition first.' : 'محتوای عمومی فقط برای آگاهی است؛ در مشاورهٔ خصوصی ابتدا شرایط فرزند شما بررسی می‌شود و سپس برنامهٔ مخصوص همان کودک پیشنهاد می‌شود.'}</p>
            <button type="button" className="zke-pillbtn" onClick={onConsult}>{en ? 'Free consultation request' : 'درخواست مشاوره'}</button>
          </div>

          {related.length > 0 && (
            <div className="zke-related">
              <h4>{en ? 'Related content' : 'محتوای مرتبط'}</h4>
              <div className="zke-related-row">
                {related.map(r => <EduCard key={r.id} item={r} lang={lang} onOpen={onOpen} views={viewsOf ? viewsOf(r) : undefined} />)}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
