import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import ReviewSection from './ReviewSection';
import StickyAnchorNav, { detailSectionStyle, detailSectionTitleStyle } from './StickyAnchorNav';
import AskQuestionForm from './AskQuestionForm';
import MediaCard from './MediaCard';
import MediaDetailSheet from './MediaDetailSheet';
import CourseCard from './CourseCard';
import { submitUserQuestion } from '../lib/supabase';
import { balancedRandomMix, mediaTypeOf } from '../utils/mediaPlacement';
import { defaultSettings as configDefaultSettings } from '../config/defaultSettings';

// ─── کارت پیش‌نمایش پرسش متداول — هم‌ابعاد کارت نظرات (عرض ۷۸٪ / maxWidth 300)
// سؤال کامل نمایش داده می‌شود؛ پاسخ حداکثر ۳ خط. اگر سؤال خیلی طولانی باشد:
// ۲ خط سؤال + ۲ خط پاسخ + دکمهٔ «بیشتر» (باز شدن bottom sheet کامل).
function FaqPreviewCard({ item, isFa, T, onMore }: { item: any; isFa: boolean; T: any; onMore: () => void }) {
  const q = String(item?.question || '');
  const a = String(item?.answer || '');
  const qLong = q.length > 90;
  const qLines = qLong ? 2 : 8;
  const aLines = qLong ? 2 : 3;
  const needMore = qLong || a.length > 60;
  return (
    <div onClick={onMore} style={{ flex: '0 0 78%', maxWidth: 300, scrollSnapAlign: 'start', background: T.card || 'var(--zk-surface)', border: `1px solid ${T.brd || 'var(--zk-border)'}`, borderRadius: 14, padding: 14, cursor: 'pointer', minHeight: 150, display: 'flex', flexDirection: 'column', boxShadow: T.neuOut || '0 4px 15px rgba(15,23,42,.05)', direction: isFa ? 'rtl' : 'ltr', animation: 'fadeSlide .5s ease both', WebkitAnimation: 'fadeSlide .5s ease both' }}>
      <div style={{ fontSize: 13.5, fontWeight: 800, color: T.txt || 'var(--zk-text)', lineHeight: 1.8, display: '-webkit-box', WebkitLineClamp: qLines, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{q}</div>
      <div style={{ marginTop: 8, fontSize: 12.5, color: T.mut || 'var(--zk-text-muted)', lineHeight: 1.8, display: '-webkit-box', WebkitLineClamp: aLines, WebkitBoxOrient: 'vertical', overflow: 'hidden', flex: 1 }}>{a || (isFa ? 'پاسخ…' : 'Answer…')}</div>
      <div style={{ marginTop: 8, fontSize: 11.5, color: T.acc || 'var(--zk-primary)', fontWeight: 800, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>{needMore ? (isFa ? 'بیشتر' : 'More') : (isFa ? 'مشاهده پاسخ' : 'View answer')}</span>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
      </div>
    </div>
  );
}

interface Course {
  id: string;
  title: string;
  titleEn?: string;
  desc?: string;
  descEn?: string;
  image?: string;
  aspectRatio?: string;
  objectPosition?: string;
  price?: string;
  priceNum?: number;
  discountedPrice?: number;
  discountEnd?: string;
  duration?: string;
  features?: string[];
  rating?: number;
  students?: number;
  tabId?: string;
}

interface Props {
  course: Course;
  T: any;
  lang: 'fa' | 'en';
  onClose?: () => void;
  onRegister?: () => void;
  onConsult?: () => void;
  countries?: any[];
  // محتوای آموزشی مرتبط و تجربه والدین مرتبط (بین جزئیات دوره و نظرات)
  educationalMedia?: any[];
  parentExperienceMedia?: any[];
  mediaVpnOn?: boolean;
  // اگر کاربر با لینک ارجاع آمده، دکمه مشاوره رایگان در ابتدای صفحه پنهان می‌شود
  hasReferral?: boolean;
  // مشاور ارجاع‌دهنده (برای نمایش کادر معرفی در ابتدای جزئیات دوره)
  referralConsultant?: any;
  // باز کردن دورهٔ دیگر (برای بخش «دوره‌های مشابه»)
  onOpenCourse?: (course: any) => void;
}

export default function CourseDetailView({ course, T, lang, onClose, onRegister, onConsult, countries, educationalMedia = [], parentExperienceMedia = [], mediaVpnOn = false, hasReferral = false, referralConsultant = null, onOpenCourse }: Props) {
  const isFa = lang === 'fa';
  const cfg: any = (() => {
    try {
      const v = localStorage.getItem('zkid_settings_v2');
      return v ? JSON.parse(v) : configDefaultSettings;
    } catch {
      return configDefaultSettings;
    }
  })();

  const title = isFa ? course.title : (course.titleEn || course.title);
  const legacyCourseFaqs = ((isFa ? cfg?.courseTabFaqs : cfg?.courseTabFaqsEn) || []).filter((item: any) => item.tab === course.tabId);
  const selectedCourseFaqs = ((isFa ? cfg?.faqItems : cfg?.faqItemsEn) || []).filter((item: any) => Array.isArray(item.placements) && item.placements.includes(`course:${course.tabId}`));
  const courseFaqs = [...legacyCourseFaqs, ...selectedCourseFaqs];
  // دوره‌های مشابه/مرتبط هم‌تب (هماهنگ با پنل مدیریت — اگر تب/دوره جدیدی اضافه شود خودکار نمایش داده می‌شود)
  const relatedCourses = React.useMemo(() => {
    const tabs = Array.isArray(cfg?.courseTabs) ? cfg.courseTabs : [];
    const sameTab = tabs.filter((t: any) => t?.id === course.tabId);
    const list = sameTab.flatMap((t: any) =>
      (Array.isArray(t?.courses) ? t.courses : [])
        .filter((c: any) => c?.active !== false && c?.id !== course.id)
        .map((c: any) => ({ ...c, tabId: t.id }))
    );
    return list.slice(0, 6);
  }, [cfg, course.tabId, course.id]);
  const desc = isFa ? course.desc : (course.descEn || course.desc);
  const [imageFailed, setImageFailed] = useState(false);
  const [askOpen, setAskOpen] = useState(false);
  const [showAllEdu, setShowAllEdu] = useState(false);
  const [showAllFaq, setShowAllFaq] = useState(false);
  const [faqSheet, setFaqSheet] = useState<any>(null);
  const [sheetItem, setSheetItem] = useState<any>(null);
  const [eduAllTab, setEduAllTab] = useState<string>('all');
  const faqOverlayPushedRef = React.useRef(false);
  // ── دکمه‌های ابتدای صفحه (ثبت مستقیم / مشاوره) + تپش بعد از کلیک روی CTA پایین ──
  const enrollTopRef = React.useRef<HTMLButtonElement>(null);
  const consultTopRef = React.useRef<HTMLButtonElement>(null);
  const [pulseTarget, setPulseTarget] = useState<'enroll' | 'consult' | null>(null);
  const scrollToTopAndPulse = (target: 'enroll' | 'consult') => {
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch { try { window.scrollTo(0, 0); } catch {} }
    setPulseTarget(null);
    requestAnimationFrame(() => requestAnimationFrame(() => setPulseTarget(target)));
    window.setTimeout(() => setPulseTarget(null), 2600);
  };
  const [eduTab, setEduTab] = useState<string>('all');
  // گروه‌بندی محتوای آموزشی بر اساس نوع: مقاله (شامل متن/عکس قدیمی)، پادکست، ویدیو
  const eduByType = React.useMemo(() => {
    const g: Record<string, any[]> = { article: [], audio: [], video: [] };
    (educationalMedia || []).forEach((it: any) => {
      const t = (it.type === 'article' || it.type === 'text' || it.type === 'image') ? 'article' : (it.type === 'audio' ? 'audio' : 'video');
      (g[t] = g[t] || []).push(it);
    });
    return g;
  }, [educationalMedia]);
  // تب‌هایی که فقط شامل نوع‌های دارای محتوا هستند
  const eduTabs = React.useMemo(() => {
    const list: { id: string; label: string }[] = [];
    if (eduByType.article.length) list.push({ id: 'article', label: isFa ? 'مقاله' : 'Articles' });
    if (eduByType.audio.length) list.push({ id: 'audio', label: isFa ? 'پادکست' : 'Podcasts' });
    if (eduByType.video.length) list.push({ id: 'video', label: isFa ? 'ویدیو' : 'Videos' });
    return list;
  }, [eduByType, isFa]);
  // ۵ محتوای آموزشی افقیِ متوازنِ رندوم از تب فعال (ترکیبی از مقاله/ویدیو/پادکست)
  const eduPreview = React.useMemo(() => {
    if (eduTab === 'all') return balancedRandomMix(educationalMedia, 5);
    const pool = eduByType[eduTab] || [];
    const arr = [...pool];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [educationalMedia, eduTab, eduByType]);
  useEffect(() => { setImageFailed(false); }, [course.image]);
  const showCourseImage = !!String(course.image || '').trim() && !imageFailed;
  const discountEndTime = course.discountEnd ? new Date(course.discountEnd).getTime() : 0;
  const hasActiveDiscount = !!course.discountedPrice && (!discountEndTime || Number.isNaN(discountEndTime) || discountEndTime > Date.now());

  // Accordion state for syllabus
  const [openSyllabus, setOpenSyllabus] = useState<number[]>([0]);

  const toggleSyllabus = (index: number) => {
    setOpenSyllabus(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  const navTopOffset = Number(T?.topbarHeight) || 64;
  const anchorItems = [
    { id: 'course-detail-intro', label: isFa ? 'معرفی' : 'Intro' },
    { id: 'course-detail-syllabus', label: isFa ? 'جزئیات دوره' : 'Course details' },
    { id: 'course-detail-reviews', label: isFa ? 'نظرات' : 'Reviews' },
    { id: 'course-detail-faq', label: isFa ? 'پرسش‌های متداول' : 'FAQ' },
    ...(relatedCourses.length ? [{ id: 'course-detail-related', label: isFa ? 'دوره‌های مشابه' : 'Similar courses' }] : []),
  ];

  // ۵ پرسش متداول رندوم برای پیش‌نمایش افقی (هر بار تغییر می‌کند)
  const faqPreview = React.useMemo(() => {
    const arr = [...courseFaqs];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [courseFaqs.length]); // eslint-disable-line react-hooks/exhaustive-deps

  // باز/بستن صفحهٔ «مشاهده همه پرسش‌ها» با مدیریت دکمه back گوشی
  const openShowAllFaq = () => {
    if (!faqOverlayPushedRef.current) {
      try { window.history.pushState({ zkFaqOverlay: true }, ''); } catch {}
      faqOverlayPushedRef.current = true;
    }
    setShowAllFaq(true);
  };
  const closeShowAllFaq = () => {
    if (faqOverlayPushedRef.current) {
      faqOverlayPushedRef.current = false;
      try { window.history.back(); } catch {}
    }
    setShowAllFaq(false);
  };
  React.useEffect(() => {
    const onPop = () => {
      if (faqOverlayPushedRef.current) {
        faqOverlayPushedRef.current = false;
        setShowAllFaq(false);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Enhanced syllabus with short content for accordion (4 items)
  const syllabusItems = (course.features && course.features.length > 0)
    ? course.features.map((f: string, idx: number) => ({
        title: f,
        content: isFa 
          ? 'توضیح کوتاه و کاربردی برای این جلسه همراه با تمرین‌های خانگی و پیگیری هفتگی.'
          : 'Short practical explanation with home exercises and weekly follow-up.'
      }))
    : [
        { title: isFa ? 'جلسه ۱: ارزیابی اولیه' : 'Session 1: Initial Assessment', content: isFa ? 'بررسی عکس زبان، قد، وزن و عادات غذایی فرزند شما.' : 'Review of tongue photo, height, weight and eating habits.' },
        { title: isFa ? 'جلسه ۲: برنامه تغذیه' : 'Session 2: Nutrition Plan', content: isFa ? 'طراحی برنامه مکمل و تغذیه اختصاصی بر اساس طبع کودک.' : 'Custom supplement and nutrition plan based on child’s temperament.' },
        { title: isFa ? 'جلسه ۳: پیگیری رشد' : 'Session 3: Growth Tracking', content: isFa ? 'پیگیری هفتگی و تنظیم برنامه بر اساس پیشرفت واقعی.' : 'Weekly tracking and plan adjustment based on real progress.' },
        { title: isFa ? 'جلسه ۴: حمایت والدین' : 'Session 4: Parental Support', content: isFa ? 'آموزش همراهی والدین و پاسخ به سوالات روزمره.' : 'Parent coaching and answers to daily questions.' }
      ];

  // Stage 11: hardcoded reviews حذف شد — ReviewSection واقعی استفاده می‌شود




  return (
    <div style={{ background: 'var(--zk-surface)', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--zk-border)', boxShadow: 'var(--zk-shadow-medium)' }}>
      {/* کارت معرفی مشاور ارجاع‌دهنده در ابتدای جزئیات دوره */}
      {hasReferral && referralConsultant && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', background: '#FFF7ED', borderBottom: '1px solid #FED7AA' }}>
          {referralConsultant.showPhoto !== false && (referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl) ? (
            <img src={referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl} alt={isFa ? referralConsultant.name : (referralConsultant.nameEn || referralConsultant.name)} style={{ width: 56, height: 56, objectFit: 'cover', objectPosition: 'center 18%', borderRadius: '50%', border: '2px solid #FB923C', flexShrink: 0 }} />
          ) : null}
          <div style={{ minWidth: 0 }}>
            <span style={{ display: 'inline-block', fontSize: 10, fontWeight: 800, color: '#C2410C', marginBottom: 2 }}>{isFa ? 'شما توسط این مشاور مشاوره شده‌اید' : 'You are advised by'}</span>
            <strong style={{ display: 'block', fontSize: 14, color: 'var(--zk-text)', fontWeight: 800, lineHeight: 1.4 }}>{isFa ? referralConsultant.name : (referralConsultant.nameEn || referralConsultant.name)}</strong>
            {(isFa ? (referralConsultant.introText || referralConsultant.desc) : (referralConsultant.introTextEn || referralConsultant.descEn || referralConsultant.introText || referralConsultant.desc)) ? <span style={{ display: 'block', fontSize: 12, color: 'var(--zk-text-muted)', lineHeight: 1.7, marginTop: 4 }}>{isFa ? (referralConsultant.introText || referralConsultant.desc) : (referralConsultant.introTextEn || referralConsultant.descEn || referralConsultant.introText || referralConsultant.desc)}</span> : null}
          </div>
        </div>
      )}
      {/* تصویر قهرمان فقط برای دوره‌ای که عکس اختصاصی دارد. */}
      {showCourseImage ? (
        <div style={{ position: 'relative', aspectRatio: course.aspectRatio || '16 / 9', background: 'var(--zk-surface-muted)' }}>
          <img
            src={course.image}
            alt={title}
            onError={() => setImageFailed(true)}
            style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: course.objectPosition || 'center', display: 'block' }}
          />
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, rgba(0,0,0,0.1), rgba(15,23,42,0.35))' }} />
          <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
            <button
              onClick={onClose}
              aria-label={isFa ? 'بازگشت' : 'Back'}
              style={{
                background: 'rgba(255,255,255,0.95)',
                border: 0,
                borderRadius: 999,
                width: 38,
                height: 38,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>
        </div>
      ) : (
        <div style={{ padding: '12px 12px 0', display: 'flex', justifyContent: 'flex-start' }}>
          <button
            onClick={onClose}
            aria-label={isFa ? 'بازگشت' : 'Back'}
            style={{
              background: 'var(--zk-surface)',
              color: 'var(--zk-text)',
              border: '1px solid var(--zk-border)',
              borderRadius: 999,
              width: 38,
              height: 38,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: 'var(--zk-shadow-light)',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        </div>
      )}

      {/* Header info */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 11, padding: '2px 9px', borderRadius: 999, background: 'var(--zk-primary-light)', color: 'var(--zk-primary)', fontWeight: 700 }}>{isFa ? 'دوره تخصصی' : 'Specialized Course'}</span>
          {course.duration && <span style={{ fontSize: 11, color: 'var(--zk-text-muted)' }}>{course.duration}</span>}
        </div>

        <h1 style={{ fontSize: 21, fontWeight: 800, margin: '6px 0 4px', lineHeight: 1.25 }}>{title}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#F59E0B"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span style={{ fontWeight: 700 }}>{course.rating || 4.8}</span>
          </div>
          <span style={{ color: 'var(--zk-text-muted)', fontSize: 12.5 }}>{course.students || 1240} {isFa ? 'والد همراه' : 'families'}</span>
        </div>

        {/* Price + CTA row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 }}>
          <div>
            {hasActiveDiscount ? (
              <>
                <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--zk-primary)' }}>{(course.discountedPrice || 0).toLocaleString()} {isFa ? 'تومان' : 'T'}</span>
                <span style={{ marginLeft: 8, textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: 13 }}>{course.price}</span>
              </>
            ) : (
              <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--zk-primary)' }}>{course.price || '—'}</span>
            )}
          </div>

          <button ref={enrollTopRef} onClick={onRegister} style={{ background: 'var(--zk-primary)', color: '#fff', border: 0, padding: '11px 24px', borderRadius: 999, fontWeight: 800, fontSize: 14, minHeight: 48, animation: (hasReferral || pulseTarget === 'enroll') ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined, WebkitAnimation: (hasReferral || pulseTarget === 'enroll') ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined }}>
            {isFa ? 'ثبت مستقیم این دوره' : 'Direct enrollment'}
          </button>
        </div>
        {!hasReferral && onConsult && (
          <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'flex-start' }}>
            <button ref={consultTopRef} onClick={onConsult} style={{ minHeight: 38, padding: '8px 16px', borderRadius: 999, border: '1px solid var(--zk-border)', background: 'transparent', color: 'var(--zk-text-muted)', fontWeight: 700, fontSize: 12.5, cursor: 'pointer', fontFamily: 'inherit', animation: pulseTarget === 'consult' ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined, WebkitAnimation: pulseTarget === 'consult' ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined }}>
              {isFa ? 'مشاوره رایگان' : 'Free consult'}
            </button>
          </div>
        )}
      </div>

      <StickyAnchorNav
        items={anchorItems}
        topOffset={navTopOffset}
        maxWidth={960}
        lang={lang}
        ariaLabel={isFa ? 'بخش‌های صفحه جزئیات دوره' : 'Course detail sections'}
      />

      {/* همهٔ محتوا در یک جریان پیوسته؛ ناوبری فقط پس از رسیدن کاربر به این محدوده ظاهر می‌شود. */}
      <div style={{ padding: '0 16px 24px' }}>
        <section id="course-detail-intro" data-detail-section style={{ ...detailSectionStyle(navTopOffset), borderTop: 0 }}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'معرفی دوره' : 'Course introduction'}</h2>
            <p style={{ fontSize: 13.5, lineHeight: 1.75, color: 'var(--zk-text)' }}>{desc}</p>
            <div style={{ marginTop: 14 }}>
              <div style={{ fontWeight: 700, marginBottom: 6, fontSize: 13.5 }}>{isFa ? 'ویژگی‌ها' : 'Features'}</div>
              <div style={{ display: 'grid', gap: 6 }}>
                {(course.features || syllabusItems.map(s => s.title)).slice(0, 5).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--zk-primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About the Instructor — Stage 11 dynamic setting */}
            {(!hasReferral && cfg?.courseInstructor?.show !== false) && (
              <div style={{ 
                marginTop: 20, 
                padding: '20px 22px', 
                background: 'var(--zk-surface)', 
                border: '1px solid var(--zk-border)', 
                borderRadius: 24, 
                boxShadow: 'var(--zk-shadow-light)',
                display: 'flex',
                gap: 14,
                alignItems: 'center'
              }}>
                <img 
                  src={cfg?.courseInstructor?.photoUrl || "/images/specialist/specialist-trust.webp"} 
                  alt={isFa ? (cfg?.courseInstructor?.name || 'امیر افرادی') : (cfg?.courseInstructor?.nameEn || 'Amir Afradi')} 
                  style={{ 
                    width: 72, 
                    height: 72, 
                    borderRadius: '999px', 
                    objectFit: 'cover', 
                    border: '1px solid var(--zk-border)',
                    flexShrink: 0
                  }} 
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: 'var(--zk-text)', marginBottom: 3 }}>
                    {isFa ? (cfg?.courseInstructor?.name || 'امیر افرادی') : (cfg?.courseInstructor?.nameEn || 'Amir Afradi')}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--zk-text-muted)', lineHeight: 1.6 }}>
                    {isFa 
                      ? (cfg?.courseInstructor?.desc || 'متخصص رشد و تغذیه کودک و نوجوان، همراه خانواده‌ها در مسیر رشد سالم') 
                      : (cfg?.courseInstructor?.descEn || 'Child & Adolescent Growth and Nutrition Specialist — guiding families on healthy growth journeys')}
                  </div>
                </div>
              </div>
            )}
        </section>

        <section id="course-detail-syllabus" data-detail-section style={detailSectionStyle(navTopOffset)}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'جزئیات دوره' : 'Course details'}</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {syllabusItems.map((item, i) => {
              const isOpen = openSyllabus.includes(i);
              return (
                <div 
                  key={i} 
                  style={{ 
                    border: '1px solid var(--zk-border)', 
                    borderRadius: 20, 
                    overflow: 'hidden',
                    background: 'var(--zk-surface)',
                    boxShadow: 'var(--zk-shadow-light)'
                  }}
                >
                  <button
                    onClick={() => toggleSyllabus(i)}
                    style={{
                      width: '100%',
                      minHeight: 48,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 18px',
                      background: 'transparent',
                      border: 0,
                      textAlign: 'inherit',
                      fontFamily: 'inherit',
                      fontSize: 14,
                      fontWeight: 700,
                      color: 'var(--zk-text)',
                      cursor: 'pointer',
                      direction: isFa ? 'rtl' : 'ltr'
                    }}
                  >
                    <span style={{ flex: 1, textAlign: isFa ? 'right' : 'left' }}>{item.title}</span>
                    <svg 
                      width="18" 
                      height="18" 
                      viewBox="0 0 24 24" 
                      fill="none" 
                      stroke="var(--zk-primary)" 
                      strokeWidth="3" 
                      strokeLinecap="round" 
                      strokeLinejoin="round"
                      style={{ 
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', 
                        transition: 'transform 220ms ease',
                        flexShrink: 0,
                        marginInlineStart: 10
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  
                  {/* Expandable content with soft transition */}
                  <div 
                    style={{ 
                      maxHeight: isOpen ? '120px' : '0',
                      overflow: 'hidden',
                      transition: 'max-height 230ms ease',
                      background: 'var(--zk-surface-muted)'
                    }}
                  >
                    <div style={{ 
                      padding: '14px 18px 16px', 
                      fontSize: 13.2, 
                      lineHeight: 1.6, 
                      color: 'var(--zk-text-muted)',
                      borderTop: '1px solid var(--zk-border)'
                    }}>
                      {item.content}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* محتوای آموزشی مرتبط — بعد از جزئیات دوره و قبل از نظرات (افقی + تب نوع + مشاهده همه + صفحه جدا) */}
        {educationalMedia.length > 0 && (
          <section id="course-detail-education" data-detail-section style={detailSectionStyle(navTopOffset)}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
              <h2 style={{ ...detailSectionTitleStyle, marginBottom: 0 }}>{isFa ? 'محتوای آموزشی مرتبط' : 'Related educational content'}</h2>
              {/* تب‌های نوع محتوا — فقط تب‌هایی که محتوا دارند */}
              {eduTabs.length > 1 && (
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  <button type="button" onClick={() => setEduTab('all')} style={{ minHeight: 34, padding: '7px 14px', borderRadius: 999, border: `1px solid ${eduTab === 'all' ? 'var(--zk-primary)' : 'var(--zk-border)'}`, background: eduTab === 'all' ? 'var(--zk-primary-light)' : 'transparent', color: eduTab === 'all' ? 'var(--zk-primary)' : 'var(--zk-text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800 }}>
                    {isFa ? 'همه' : 'All'}
                  </button>
                  {eduTabs.map((t) => (
                    <button key={t.id} type="button" onClick={() => setEduTab(t.id)} style={{ minHeight: 34, padding: '7px 14px', borderRadius: 999, border: `1px solid ${eduTab === t.id ? 'var(--zk-primary)' : 'var(--zk-border)'}`, background: eduTab === t.id ? 'var(--zk-primary-light)' : 'transparent', color: eduTab === t.id ? 'var(--zk-primary)' : 'var(--zk-text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800 }}>
                      {t.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', direction: isFa ? 'rtl' : 'ltr', marginTop: 10 }}>
              {eduPreview.map((item: any, index: number) => (
                <div key={`${item._mediaSource || 'education'}:${item.id || index}`} style={{ flex: '0 0 78%', maxWidth: 300, scrollSnapAlign: 'start', direction: isFa ? 'rtl' : 'ltr' }}>
                  <MediaCard item={{ ...item, description: item.descriptionCourses || item.description }} T={T} lang={lang} vpnOn={mediaVpnOn} secure onMore={() => setSheetItem({ ...item, description: item.descriptionCourses || item.description })} />
                </div>
              ))}
              {(eduTab === 'all' ? educationalMedia : (eduByType[eduTab] || [])).length > 5 && (
                <button
                  type="button"
                  onClick={() => setShowAllEdu(true)}
                  style={{ flex: '0 0 78%', maxWidth: 300, scrollSnapAlign: 'start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 160 }}
                >
                  <span style={{ width: 64, height: 64, borderRadius: '50%', border: `2px solid var(--zk-primary)`, background: 'var(--zk-primary-light)', color: 'var(--zk-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--zk-primary)' }}>{isFa ? 'مشاهده همه' : 'View all'}</span>
                </button>
              )}
            </div>
          </section>
        )}

        {/* صفحهٔ جداگانهٔ «مشاهده همه» محتوای آموزشی — تمام‌صفحه با فیلتر نوع */}
        {showAllEdu && createPortal(
          <div className="zk-overlay-fade" style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'var(--zk-surface, #fff)', display: 'flex', flexDirection: 'column' }}>
            <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', flexDirection: 'column', gap: 10, padding: 'calc(12px + env(safe-area-inset-top,0px)) 16px 12px', background: 'var(--zk-surface, #fff)', borderBottom: '1px solid var(--zk-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <button type="button" onClick={() => setShowAllEdu(false)} aria-label={isFa ? 'بازگشت' : 'Back'} style={{ width: 38, height: 38, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface-muted)', color: 'var(--zk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M15 18l-6-6 6-6" /></svg>
                </button>
                <b style={{ fontSize: 16, fontWeight: 900, color: 'var(--zk-text)' }}>{isFa ? 'محتوای آموزشی' : 'Educational content'}</b>
              </div>
              <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
                {[{ id: 'all', label: isFa ? 'همه' : 'All' }, ...eduTabs]
                  .filter((t) => t.id === 'all' || educationalMedia.some((x: any) => mediaTypeOf(x) === t.id))
                  .map((t) => (
                    <button key={t.id} type="button" onClick={() => setEduAllTab(t.id)} style={{ minHeight: 34, padding: '7px 14px', borderRadius: 999, border: `1px solid ${eduAllTab === t.id ? 'var(--zk-primary)' : 'var(--zk-border)'}`, background: eduAllTab === t.id ? 'var(--zk-primary-light)' : 'transparent', color: eduAllTab === t.id ? 'var(--zk-primary)' : 'var(--zk-text-muted)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 800, whiteSpace: 'nowrap', flexShrink: 0 }}>
                      {t.label}
                    </button>
                  ))}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px calc(24px + env(safe-area-inset-bottom,0px))' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'flex-start', maxWidth: 1080, margin: '0 auto' }}>
                {educationalMedia
                  .filter((item: any) => eduAllTab === 'all' || mediaTypeOf(item) === eduAllTab)
                  .map((item: any, index: number) => (
                    <div key={`${item._mediaSource || 'education'}:${item.id || index}`} style={{ animation: 'fadeSlide .45s ease both', WebkitAnimation: 'fadeSlide .45s ease both', animationDelay: `${Math.min(index, 8) * 40}ms` }}>
                      <MediaCard item={{ ...item, description: item.descriptionCourses || item.description }} T={T} lang={lang} vpnOn={mediaVpnOn} secure onMore={() => setSheetItem({ ...item, description: item.descriptionCourses || item.description })} />
                    </div>
                  ))}
              </div>
            </div>
          </div>,
          document.body,
        )}

        <section id="course-detail-reviews" data-detail-section style={detailSectionStyle(navTopOffset)}>
          {/* تجربه و رضایت والدین مرتبط — در ابتدای تب نظرات */}
          {parentExperienceMedia.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <h2 style={detailSectionTitleStyle}>{isFa ? 'تجربه و رضایت والدین مرتبط' : 'Related parent experiences'}</h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'flex-start' }}>
                {parentExperienceMedia.map((item: any, index: number) => (
                  <MediaCard key={`${item._mediaSource || 'experience'}:${item.id || index}`} item={{ ...item, description: item.descriptionCourses || item.description }} T={T} lang={lang} vpnOn={mediaVpnOn} secure onMore={() => setSheetItem({ ...item, description: item.descriptionCourses || item.description })} />
                ))}
              </div>
            </div>
          )}
          <ReviewSection
            T={{acc:'#0F766E',card:'#fff',brd:'#E5E0D8',mut:'#4B5563',txt:'#1F2937',ttl:'#0F766E',inp:'#fff',soft:'#CCFBF1',btnRadius:14,cardRadius:18,inputRadius:12,neuOut:'0 4px 15px rgba(15,23,42,.06)',neuIn:'inset 2px 2px 5px rgba(15,23,42,.05)',ok:'#14B8A6',err:'#DC2626',warn:'#F59E0B',grad:'linear-gradient(135deg,#0F766E,#0EA5E9)'}}
            lang={isFa ? 'fa' : 'en'}
            courseId={course?.id || ''}
            countries={countries}
          />
        </section>

        <section id="course-detail-faq" data-detail-section style={detailSectionStyle(navTopOffset)}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'پرسش‌های متداول' : 'Frequently asked questions'}</h2>
          {courseFaqs.length ? (
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', direction: isFa ? 'rtl' : 'ltr' }}>
              {faqPreview.map((item: any, index: number) => (
                <FaqPreviewCard key={item.id || index} item={item} isFa={isFa} T={T} onMore={() => setFaqSheet(item)} />
              ))}
              {courseFaqs.length > 5 && (
                <button
                  type="button"
                  onClick={openShowAllFaq}
                  style={{ flex: '0 0 78%', maxWidth: 300, scrollSnapAlign: 'start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 118, direction: isFa ? 'rtl' : 'ltr' }}
                >
                  <span style={{ width: 58, height: 58, borderRadius: '50%', border: '2px solid var(--zk-primary)', background: 'var(--zk-primary-light)', color: 'var(--zk-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></svg>
                  </span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: 'var(--zk-primary)' }}>{isFa ? 'مشاهده همه' : 'View all'}</span>
                </button>
              )}
            </div>
          ) : (
            <div style={{ fontSize: 13.5, color: 'var(--zk-text-muted)' }}>{isFa ? 'هنوز پرسش متداولی برای این دسته از دوره‌ها ثبت نشده است.' : 'No FAQs have been added for this course category yet.'}</div>
          )}
          {/* باکس «سوال دارم» — در انتهای کادر پرسش‌های متداول */}
          <div style={{ marginTop: 14, padding: '13px 14px', border: '1px solid var(--zk-border)', borderRadius: 16, background: 'var(--zk-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ flex: '1 1 190px' }}>
              <b style={{ display: 'block', color: 'var(--zk-text)', fontSize: 13.5, marginBottom: 3 }}>{isFa ? 'پاسخ پرسش خود را پیدا نکردید؟' : 'Could not find your answer?'}</b>
              <span style={{ color: 'var(--zk-text-muted)', fontSize: 12, lineHeight: 1.7 }}>{isFa ? 'سؤال متنی یا صوتی خود را همراه شماره تماس برای کارشناس ارسال کنید.' : 'Send your text or voice question and phone number to our specialist.'}</span>
            </div>
            <button type="button" onClick={() => setAskOpen(true)} style={{ minHeight: 44, padding: '9px 18px', borderRadius: 999, border: '1px solid var(--zk-primary)', background: 'var(--zk-surface)', color: 'var(--zk-primary)', fontFamily: 'inherit', fontSize: 13, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap' }}>
              {isFa ? 'سؤال دارم' : 'Ask a question'}
            </button>
          </div>
          {askOpen && !showAllFaq && <AskQuestionForm T={T} lang={lang} pageSource={`course:${course.id}`} countries={countries} onClose={() => setAskOpen(false)} onSubmit={async (question, voiceNoteUrl, phone) => { await submitUserQuestion(question, voiceNoteUrl, `course:${course.id}`, phone); }} />}
        </section>

        {/* دوره‌های مشابه/مرتبط هم‌تب — بعد از پرسش‌های متداول (هماهنگ با پنل مدیریت) */}
        {relatedCourses.length > 0 && (
          <section id="course-detail-related" data-detail-section style={detailSectionStyle(navTopOffset)}>
            <h2 style={detailSectionTitleStyle}>{isFa ? 'دوره‌های مشابه' : 'Similar courses'}</h2>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', direction: isFa ? 'rtl' : 'ltr' }}>
              {relatedCourses.map((c: any) => (
                <div key={c.id} style={{ flex: '0 0 260px', scrollSnapAlign: 'start', direction: isFa ? 'rtl' : 'ltr' }}>
                  <CourseCard course={c} size="normal" T={T} lang={lang} onCourseClick={(cr: any) => onOpenCourse?.(cr)} />
                </div>
              ))}
            </div>
          </section>
        )}
      </div>

      {/* صفحهٔ جداگانهٔ «مشاهده همه پرسش‌ها» — تمام‌صفحه با دکمه برگشت */}
      {showAllFaq && createPortal(
        <div className="zk-overlay-fade" style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'var(--zk-surface, #fff)', display: 'flex', flexDirection: 'column' }}>
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top,0px)) 16px 12px', background: 'var(--zk-surface, #fff)', borderBottom: '1px solid var(--zk-border)' }}>
            <button type="button" onClick={closeShowAllFaq} aria-label={isFa ? 'بازگشت' : 'Back'} style={{ width: 38, height: 38, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface-muted)', color: 'var(--zk-text)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <b style={{ fontSize: 16, fontWeight: 900, color: 'var(--zk-text)' }}>{isFa ? 'پرسش‌های متداول' : 'Frequently asked questions'}</b>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 760, margin: '0 auto' }}>
              {courseFaqs.map((item: any) => (
                <details key={item.id} style={{ border: '1px solid var(--zk-border)', borderRadius: 14, padding: '11px 13px', background: 'var(--zk-surface)' }}>
                  <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13.5 }}>{item.question}</summary>
                  <p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.9, color: 'var(--zk-text-muted)' }}>{item.answer}</p>
                </details>
              ))}
              {/* دکمهٔ «سوال دارم» در انتهای همه پرسش‌ها — باز شدن پاپ‌آپ پرسش */}
              <button type="button" onClick={() => setAskOpen(true)} style={{ marginTop: 8, minHeight: 48, borderRadius: 14, border: '1px solid var(--zk-primary)', background: 'var(--zk-primary-light)', color: 'var(--zk-primary)', fontFamily: 'inherit', fontSize: 14, fontWeight: 800, cursor: 'pointer' }}>
                {isFa ? 'سوال دارم' : 'Ask a question'}
              </button>
            </div>
          </div>
          {askOpen && <AskQuestionForm T={T} lang={lang} pageSource={`course:${course.id}`} countries={countries} onClose={() => setAskOpen(false)} onSubmit={async (question, voiceNoteUrl, phone) => { await submitUserQuestion(question, voiceNoteUrl, `course:${course.id}`, phone); }} />}
        </div>,
        document.body,
      )}

      {/* Bottom-sheet: نمایش کامل یک پرسش و پاسخ */}
      {faqSheet && createPortal(
        <div style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,.5)', display: 'flex', alignItems: 'flex-end', justifyContent: 'center' }} onClick={() => setFaqSheet(null)}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 640, maxHeight: '80vh', overflowY: 'auto', background: 'var(--zk-surface, #fff)', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '18px 16px calc(18px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -10px 40px rgba(0,0,0,.2)' }}>
            <div style={{ width: 44, height: 5, borderRadius: 999, background: 'var(--zk-border)', margin: '0 auto 14px' }} />
            <b style={{ display: 'block', fontSize: 15, fontWeight: 900, color: 'var(--zk-text)', lineHeight: 1.8, marginBottom: 12 }}>{faqSheet.question}</b>
            <p style={{ margin: 0, fontSize: 13.5, lineHeight: 2, color: 'var(--zk-text-muted)' }}>{faqSheet.answer}</p>
            <button type="button" onClick={() => setFaqSheet(null)} style={{ marginTop: 16, width: '100%', minHeight: 46, borderRadius: 12, border: '1px solid var(--zk-border)', background: 'var(--zk-surface-muted)', color: 'var(--zk-text)', fontWeight: 800, fontSize: 13.5, cursor: 'pointer', fontFamily: 'inherit' }}>
              {isFa ? 'بستن' : 'Close'}
            </button>
          </div>
        </div>,
        document.body,
      )}

      {/* Bottom sheet «بیشتر» — نمایش کامل محتوا از پایین (مثل نظرات) */}
      {sheetItem && <MediaDetailSheet item={sheetItem} T={T} lang={lang} vpnOn={mediaVpnOn} onClose={() => setSheetItem(null)} />}

      {/* Sticky CTA on mobile — safe-area aware */}
      <div style={{ 
        position: 'sticky', 
        bottom: 0, 
        background: 'rgba(253,248,243,0.96)', 
        borderTop: '1px solid var(--zk-border)', 
        padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', 
        display: 'flex', 
        gap: 10, 
        zIndex: 10 
      }}>
        {!hasReferral && onConsult && (
          <button onClick={() => scrollToTopAndPulse('consult')} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface)', fontWeight: 700, fontSize: 13.5 }}>
            {isFa ? 'مشاوره رایگان' : 'Free consult'}
          </button>
        )}
        <button onClick={() => scrollToTopAndPulse('enroll')} style={{ flex: 1, minHeight: 46, borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', fontWeight: 700, fontSize: 13.5, animation: hasReferral ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined, WebkitAnimation: hasReferral ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined }}>
          {isFa ? 'ثبت مستقیم این دوره' : 'Direct enrollment'}
        </button>
      </div>
    </div>
  );
}
