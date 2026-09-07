// src/sections/ReferralConsultModal.tsx
// Stage-3 refactor: پاپ‌آپ «شما قبلاً توسط X مشاوره شده‌اید» در حالت ارجاع.
// منطق تشخیص tab/course و labelها و دکمه‌ها عیناً از App.tsx استخراج شده —
// این کامپوننت هیچ setStateی انجام نمی‌دهد؛ callbackها از بالا می‌آیند.
import { useNavigate } from 'react-router-dom';
import { Modal, MiniIcon } from '../app/appSupport';
import { fillReferralText, findTabByCode } from '../utils/referral';

interface ReferralConsultModalProps {
  T: Record<string, any>;
  lang: 'fa' | 'en';
  open: boolean;
  consultant: Record<string, any> | null;
  target: Record<string, any> | null;
  reason: string;
  setReason: (v: string) => void;
  showReason: boolean;
  setShowReason: (v: boolean) => void;
  onClose: () => void;
  onViewCourses: () => void;
  setView: (v: string) => void;
  cfg: Record<string, any>;
}

export default function ReferralConsultModal({
  T, lang, open, consultant, target, reason, setReason, showReason, setShowReason,
  onClose, onViewCourses, setView, cfg,
}: ReferralConsultModalProps) {
  const navigate = useNavigate();
  if (!open || !consultant) return null;

  const tab = target?.tabCode ? findTabByCode(cfg.courseTabs || [], target.tabCode) : null;
  const isDir = tab && typeof target?.courseIndex === 'number';
  const courseTitle = lang === 'en' ? (tab?.titleEn || tab?.title) : tab?.title;
  const mainLabel = isDir && tab
    ? (cfg.referral?.texts?.popupPrimaryCourse
      ? fillReferralText(cfg.referral.texts.popupPrimaryCourse, { course: courseTitle })
      : (lang === 'en' ? `View details & enroll in ${courseTitle}` : `مشاهده جزئیات و ثبت ${courseTitle}`))
    : tab
    ? (cfg.referral?.texts?.popupPrimaryTab
      ? fillReferralText(cfg.referral.texts.popupPrimaryTab, { tab: courseTitle })
      : (lang === 'en' ? `View & compare ${courseTitle} courses` : `مشاهده و مقایسه دوره‌های ${courseTitle}`))
    : (cfg.referral?.texts?.popupPrimaryBase || (lang === 'en' ? 'View & browse courses' : 'مشاهده و معرفی دوره‌ها'));

  const primary = () => {
    onClose();
    setShowReason(false);
    try { navigate('/courses'); } catch { setView('courses'); }
    if (onViewCourses) onViewCourses();
  };

  const submitReason = () => {
    if (!reason.trim()) return;
    try { sessionStorage.setItem('zk_referral_reconsult_reason', reason.trim()); } catch {}
    onClose();
    setShowReason(false);
    try { navigate('/form'); } catch { setView('form'); }
  };

  const consultantName = lang === 'en' ? (consultant.nameEn || consultant.name) : consultant.name;

  return (
    <Modal T={T} onClose={() => { onClose(); setShowReason(false); }} closeLabel={lang === 'en' ? 'Close' : 'بستن'} max={480}>
      <div style={{ textAlign: 'center', padding: '6px 2px' }}>
        <div style={{ width: 52, height: 52, borderRadius: '50%', background: `${T.acc}15`, color: T.accText, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
          <MiniIcon type="course" T={T} />
        </div>
        <h3 style={{ color: T.ttl, fontSize: 16, margin: '0 0 8px', fontWeight: 800, lineHeight: 1.6 }}>
          {cfg.referral?.texts?.popupTitle
            ? fillReferralText(cfg.referral.texts.popupTitle, { consultant: consultantName })
            : (lang === 'en'
              ? `You have already been advised by ${consultantName}. No need for a new consultation request.`
              : `شما قبلاً توسط ${consultantName} مشاوره شده‌اید؛ نیازی به درخواست مشاوره جدید نیست.`)}
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginTop: 16 }}>
          <button
            type="button"
            onClick={primary}
            style={{
              minHeight: 52, padding: '12px 16px', borderRadius: 14,
              background: 'var(--zk-primary)', color: 'var(--zk-text-inverse, #fff)',
              border: 0, fontWeight: 800, fontSize: 14.5, cursor: 'pointer', fontFamily: 'inherit',
              animation: 'zk-hero-pulse 2.4s ease-in-out 3',
              WebkitAnimation: 'zk-hero-pulse 2.4s ease-in-out 3',
              animationFillMode: 'forwards', WebkitAnimationFillMode: 'forwards',
            }}
          >
            {mainLabel}
          </button>
          <button
            type="button"
            onClick={() => setShowReason(true)}
            style={{ minHeight: 48, padding: '11px 16px', borderRadius: 14, background: T.card, border: `1px solid ${T.brd}`, color: T.txt, fontWeight: 700, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {cfg.referral?.texts?.reconsultLabel || (lang === 'en' ? 'I need a consultation again' : 'مجدداً درخواست مشاوره دارم')}
          </button>
        </div>
        {showReason && (
          <div style={{ marginTop: 14, animation: 'fadeSlide .3s ease both', textAlign: 'right' }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.ttl, marginBottom: 8 }}>
              {cfg.referral?.texts?.reconsultQuestion || (lang === 'en' ? 'Why do you need a consultation again?' : 'به چه دلیلی مجدداً درخواست مشاوره دارید؟')}
            </label>
            <textarea
              dir="auto"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={lang === 'en' ? 'Please describe your reason...' : 'لطفاً دلیل خود را بنویسید...'}
              style={{ width: '100%', padding: '11px 12px', background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 12, color: T.txt, fontSize: 14, fontFamily: 'inherit', minHeight: 80, resize: 'vertical', boxSizing: 'border-box' }}
            />
            <button
              type="button"
              onClick={submitReason}
              disabled={!reason.trim()}
              style={{
                width: '100%', minHeight: 48, marginTop: 8, padding: '11px 16px', borderRadius: 14,
                background: reason.trim() ? 'var(--zk-primary)' : `${T.acc}33`,
                color: reason.trim() ? 'var(--zk-text-inverse, #fff)' : T.mut,
                border: 0, fontWeight: 800, fontSize: 14, cursor: reason.trim() ? 'pointer' : 'not-allowed', fontFamily: 'inherit',
              }}
            >
              {lang === 'en' ? 'Continue to consultation form' : 'ادامه به فرم مشاوره'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
}
