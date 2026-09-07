// src/sections/CourseShipModal.tsx
// Stage-3 refactor: مودال «انتخاب مقصد ارسال» که در App.tsx به‌صورت inline
// در return تعریف شده بود. Stage-5: استایل‌های تکراری دکمه به کامپوننت اتمی
// PrimaryButton/GhostButton منتقل شدند؛ رفتار دقیقاً مثل قبل است.
import { Modal, MiniIcon } from '../app/appSupport';
import { PrimaryButton, GhostButton } from '../components/ui/atoms';

interface CourseShipModalProps {
  T: Record<string, any>;
  S: Record<string, any>;
  lang: 'fa' | 'en';
  shipModal: Record<string, any> | null;
  onClose: () => void;
  onChooseIran: (cr: any) => void;
  onChooseIntl: (cr: any) => void;
  publicText: (k: string, fb: string) => string;
}

export default function CourseShipModal({
  T, S, lang, shipModal, onClose, onChooseIran, onChooseIntl, publicText,
}: CourseShipModalProps) {
  if (!shipModal) return null;
  return (
    <Modal T={T} onClose={onClose} closeLabel={publicText('backBtn', 'بازگشت')}>
      <div style={{ textAlign: 'center', padding: '10px 6px' }}>
        <div style={{ width: 64, height: 64, borderRadius: '50%', background: `${T.acc}15`, color: T.accText, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <MiniIcon type="truck" T={T} />
        </div>
        <h3 style={{ color: T.ttl, fontSize: 18, margin: '0 0 8px', fontWeight: 800 }}>
          {publicText('chooseDest', 'لطفاً مقصد ارسال را انتخاب کنید')}
        </h3>
        <p style={{ fontSize: 13, color: T.mut, margin: '0 0 20px', lineHeight: 1.8 }}>
          {lang === 'en'
            ? 'Please select whether the order will be shipped inside Iran or internationally. Payment and shipping options will adjust based on your selection.'
            : 'ارسال برای داخل ایران انجام می‌شود یا خارج از کشور؟ روش ارسال و درگاه‌های پرداخت بر اساس انتخاب شما تنظیم خواهند شد.'}
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <PrimaryButton
            onClick={() => onChooseIran(shipModal)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, fontSize: 15 }}
          >
            <span>🇮🇷</span>
            <span>{publicText('sendIran', 'ارسال برای ایران')}</span>
          </PrimaryButton>
          <GhostButton
            onClick={() => onChooseIntl(shipModal)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, minHeight: 52, fontSize: 15 }}
          >
            <span>🌐</span>
            <span>{publicText('sendIntl', 'ارسال برای خارج از ایران')}</span>
          </GhostButton>
        </div>
      </div>
    </Modal>
  );
}
