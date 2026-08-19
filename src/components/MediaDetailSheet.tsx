// Bottom-sheet نمایش کامل یک محتوای رسانه‌ای (ویدیو/پادکست/مقاله/عکس)
// — مثل bottom sheet نظرات: از پایین صفحه باز می‌شود و اطلاعات کامل را نشان می‌دهد.
import { createPortal } from 'react-dom';
import MediaCard from './MediaCard';

export default function MediaDetailSheet({ item, T, lang, vpnOn, onClose }: {
  item: any; T: any; lang: string; vpnOn?: boolean; onClose: () => void;
}) {
  const isFa = lang === 'fa';
  return createPortal(
    <div onClick={onClose} className="zk-overlay-fade" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={(e) => e.stopPropagation()} className="zk-sheet-up" style={{ width: '100%', maxHeight: '82vh', overflowY: 'auto', background: T.bg || '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: '6px 14px calc(16px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -10px 40px rgba(15,23,42,0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', margin: '8px 2px 10px' }}>
          <b style={{ fontSize: 15, color: T.ttl }}>{isFa ? 'جزئیات محتوا' : 'Content details'}</b>
          <button type="button" onClick={onClose} aria-label={isFa ? 'بستن' : 'Close'} style={{ border: 0, background: T.soft, width: 34, height: 34, borderRadius: '50%', color: T.txt, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        <MediaCard item={item} T={T} lang={lang} vpnOn={vpnOn} secure expanded />
      </div>
    </div>,
    document.body,
  );
}
