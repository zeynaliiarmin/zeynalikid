import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { type EduItem, typeLabel, isArticleType, buildArticleBlocks } from './edu-data';
import useMediaDuration from '../../hooks/useMediaDuration';
import { computeDurationSeconds, formatDuration } from '../../utils/eduDuration';
import EduCard from './EduCard';
import EduPlayer from './EduPlayer';
import { TextIcon, VideoIcon, AudioIcon, PhotoIcon } from '../Icons';
import { Highlights, RichText } from '../MediaHighlights';
import { extractDirectMediaUrl } from '../../utils/mediaInput';
import PublicBackButton from '../PublicBackButton';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../JsonLd';
import { itemUrl, metaDescOf, seoKeyOf } from '../../lib/seo';

/**
 * مدال جزئیات محتوا — Stage 8
 * موبایل: BottomSheet تمام‌صفحه · دسکتاپ: پنجره وسط (حداکثر ۷۶۰)
 */
const safeSourceUrl=(value:unknown)=>/^https?:\/\//i.test(String(value||'').trim())?String(value).trim():'';

export default function ArticleModal({ item, related, lang, onClose, onOpen, onConsult, views, viewsOf, brand }: {
  item: EduItem; related: EduItem[]; lang: string;
  onClose: () => void; onOpen: (it: EduItem) => void; onConsult: () => void;
  views?: number; viewsOf?: (item: EduItem) => number; brand?: string;
}) {
  const en = lang === 'en';
  // مدت‌زمان خودکار: مقاله = مطالعه متن؛ ویدیو/ویس = مدت واقعی فایل + مطالعه توضیحات
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
  const isArticle = isArticleType(item.type);
  const blocks = isArticle ? buildArticleBlocks(item) : [];
  const paras = (item.body || '').split('\n\n').filter(Boolean);

  // هایلایت‌های بدون position همان گروه بالای متن‌اند؛ موقعیت‌دارها در بین متن رندر می‌شوند.
  const topHighlights = (Array.isArray((item as any).highlights) ? (item as any).highlights : []).filter((h: any) => !(Number(h?.position) > 0));

  // SEO هر محتوا: title + description + canonical + OG + Article JSON-LD
  const pageTitle = `${en ? (item.titleEn || item.title) : item.title} | ${brand || 'سامانه'}`;
  const pageDesc = metaDescOf((en ? (item.descEn || item.desc || item.body) : (item.desc || item.body)) || '');
  const canonical = itemUrl('education', item as any);
  const coverImg = extractDirectMediaUrl((item as any).cover || (item as any).images?.[0]?.url || '', 'image');
  const articleLd = JSON.stringify({
    '@context': 'https://schema.org',
    '@type': isArticle ? 'Article' : (item.type === 'video' ? 'VideoObject' : 'Article'),
    headline: en ? (item.titleEn || item.title) : item.title,
    description: pageDesc,
    ...(coverImg ? { image: [coverImg] } : {}),
    author: { '@type': 'Person', name: en ? (item.authorEn || item.author || brand) : (item.author || brand) },
    inLanguage: en ? 'en' : 'fa',
  });

  // ریست اسکرول هنگام تعویض به محتوای مشابه — کاربر باید ابتدای محتوای جدید را ببیند
  useEffect(() => {
    try {
      const win = document.querySelector('.zke-modal-win') as HTMLElement | null;
      if (win) win.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    } catch { /* no-op */ }
  }, [item?.id]);

  return createPortal(
    <div className="zke-modal" onMouseDown={e => { if (e.currentTarget === e.target) onClose(); }} role="dialog" aria-modal="true" aria-label={en ? item.titleEn : item.title}>
      <Helmet>
        <title>{pageTitle}</title>
        {pageDesc ? <meta name="description" content={pageDesc} /> : null}
        <link rel="canonical" href={canonical} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={en ? (item.titleEn || item.title) : item.title} />
        {pageDesc ? <meta property="og:description" content={pageDesc} /> : null}
        {coverImg ? <meta property="og:image" content={coverImg} /> : null}
        <meta property="og:url" content={canonical} />
        <meta property="og:locale" content={en ? 'en_US' : 'fa_IR'} />
        <meta name="twitter:card" content={coverImg ? 'summary_large_image' : 'summary'} />
        <meta name="twitter:title" content={en ? (item.titleEn || item.title) : item.title} />
        {pageDesc ? <meta name="twitter:description" content={pageDesc} /> : null}
      </Helmet>
      <JsonLd id={`ld-item-${seoKeyOf(item as any) || 'article'}`} data={articleLd} />
      <div className="zke-modal-win">
        <div className="zke-modal-head zk-public-title-row" dir={en ? 'ltr' : 'rtl'}>
          <PublicBackButton lang={en ? 'en' : 'fa'} onBack={onClose} testId="public-education-detail-back" />
          <div className="zke-modal-heading">
            <h2>{en ? item.titleEn : item.title}</h2>
            <span className="zke-modal-type-icon" style={{ color: 'var(--zk-primary, #0F766E)' }} title={typeLabel(item.type, lang)}><Icon size={17} /></span>
          </div>
        </div>

        <div className="zke-article">
          <div className="zke-article-meta">
            {viewsText && <span style={{ color: 'var(--zk-primary, #0F766E)', fontWeight: 700 }}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" /></svg>{viewsText}</span>}
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="3.4" /><path d="M5 20c.7-3.8 3.4-6 7-6s6.3 2.2 7 6" /></svg>{en?(item.authorEn||item.author||'Editorial team'):(item.author||'تیم تحریریه')}</span>
            <span>{en ? item.dateEn : item.date}</span>
            {safeSourceUrl(item.sourceUrl)&&<a href={safeSourceUrl(item.sourceUrl)} target="_blank" rel="noreferrer" style={{color:'var(--zk-primary,#0B5D56)',display:'inline-flex',alignItems:'center',gap:4,fontWeight:700}}><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>{en?'Source':'منبع'}</a>}
            <span><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/></svg> {duration}</span>
          </div>

          {!isArticle && <EduPlayer item={item} kind={item.type === 'video' ? 'video' : item.type === 'image' ? 'image' : 'audio'} lang={lang} />}

          <Highlights highlights={topHighlights.length ? topHighlights : undefined} />
          {isArticle ? (
            <>
              {blocks.length ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                  {blocks.map((b, i) => b.kind === 'para' ? (
                    <RichText key={i} text={b.text} lang={lang} />
                  ) : b.kind === 'highlight' ? (
                    <div key={i}><Highlights highlights={[{ id: `hlpos-${i}`, text: (b as any).text, color: (b as any).color }]} /></div>
                  ) : (
                    <img key={i} src={extractDirectMediaUrl((b as any).url, 'image') || (b as any).url} alt="" loading="lazy" referrerPolicy="no-referrer"
                      onError={(e: any) => { e.currentTarget.style.display = 'none'; }}
                      style={{ width: '100%', height: 'auto', maxHeight: 460, objectFit: 'contain', borderRadius: 14, border: '1px solid var(--zk-border)', display: 'block', background: '#000' }} />
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
            <p>{en ? 'Public content is for awareness only. A private consultation reviews your child’s condition first.' : 'محتوای عمومی فقط برای آگاهی است؛ در مشاوره خصوصی ابتدا شرایط فرزند شما بررسی می‌شود و سپس برنامه مخصوص همان کودک پیشنهاد می‌شود.'}</p>
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
