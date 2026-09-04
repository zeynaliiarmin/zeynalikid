// Bottom-sheet نمایش کامل یک محتوای رسانه‌ای (ویدیو/پادکست/مقاله/عکس)
// — پیش‌نمایش کارت فقط کاور است و پلیر واقعی فقط اینجا ساخته می‌شود.
import { createPortal } from 'react-dom';
import MediaCard from './MediaCard';
import PublicBackButton from './PublicBackButton';

export default function MediaDetailSheet({ item, T, lang, vpnOn, onClose }: {
  item: any; T: any; lang: string; vpnOn?: boolean; onClose: () => void;
}) {
  const isFa = lang === 'fa';
  return createPortal(
    <div onClick={onClose} className="zk-overlay-fade" role="dialog" aria-modal="true" aria-label={isFa ? 'جزئیات محتوا' : 'Content details'} style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="zk-sheet-up" dir={isFa ? 'rtl' : 'ltr'} style={{ width: '100%', maxHeight: '82vh', overflowY: 'auto', background: T.bg || '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '6px 14px calc(16px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -10px 40px rgba(15,23,42,0.3)' }}>
        <div className="zk-public-title-row" style={{ margin: '8px 2px 10px' }}>
          <PublicBackButton lang={isFa ? 'fa' : 'en'} onBack={onClose} testId="public-media-detail-back" />
          <b data-public-page-title style={{ fontSize: 15, color: T.ttl }}>{isFa ? 'جزئیات محتوا' : 'Content details'}</b>
        </div>
        <MediaCard item={item} T={T} lang={lang} vpnOn={vpnOn} secure expanded />
      </div>
    </div>,
    document.body,
  );
}
