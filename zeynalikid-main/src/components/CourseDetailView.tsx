import React, { useState, useRef, useEffect } from 'react';
import ReviewSection from './ReviewSection';
import { defaultSettings as configDefaultSettings } from '../config/defaultSettings';

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
}

export default function CourseDetailView({ course, T, lang, onClose, onRegister, onConsult, countries }: Props) {
  const [activeTab, setActiveTab] = useState<'intro' | 'syllabus' | 'reviews' | 'faq'>('intro');
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
  const desc = isFa ? course.desc : (course.descEn || course.desc);
  const [imageFailed, setImageFailed] = useState(false);
  useEffect(() => { setImageFailed(false); }, [course.image]);
  const showCourseImage = !!String(course.image || '').trim() && !imageFailed;
  const discountEndTime = course.discountEnd ? new Date(course.discountEnd).getTime() : 0;
  const hasActiveDiscount = !!course.discountedPrice && (!discountEndTime || Number.isNaN(discountEndTime) || discountEndTime > Date.now());

  // Accordion state for syllabus
  const [openSyllabus, setOpenSyllabus] = useState<number[]>([0]);

  // Tab bar refs for swipe + auto-scroll
  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  const toggleSyllabus = (index: number) => {
    setOpenSyllabus(prev =>
      prev.includes(index)
        ? prev.filter(i => i !== index)
        : [...prev, index]
    );
  };

  // Auto-scroll active tab into view (smooth) on change — mobile swipe friendly
  useEffect(() => {
    const activeBtn = tabRefs.current[activeTab];
    const container = tabBarRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const scrollLeft = activeBtn.offsetLeft - (containerRect.width / 2) + (btnRect.width / 2);
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [activeTab]);

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
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#111" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'none' : 'scaleX(-1)' }}>
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
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'none' : 'scaleX(-1)' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 14 }}>
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

          <button onClick={onRegister} style={{ background: 'var(--zk-primary)', color: '#fff', border: 0, padding: '11px 24px', borderRadius: 999, fontWeight: 700, fontSize: 14, minHeight: 48 }}>
            {isFa ? 'ثبت‌نام این دوره' : 'Enroll now'}
          </button>
        </div>
      </div>

      {/* Tabs — swipeable on mobile (scroll-snap + touch) */}
      <div 
        ref={tabBarRef}
        style={{ 
          display: 'flex', 
          borderBottom: '1px solid var(--zk-border)', 
          paddingInline: 6, 
          overflowX: 'auto',
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          gap: 6
        }}
      >
        {(['intro', 'syllabus', 'reviews', 'faq'] as const).map(tab => (
          <button
            key={tab}
            ref={el => { tabRefs.current[tab] = el; }}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '10px 12px',
              fontWeight: activeTab === tab ? 800 : 500,
              color: activeTab === tab ? 'var(--zk-primary)' : 'var(--zk-text-muted)',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === tab ? '3px solid var(--zk-primary)' : '3px solid transparent',
              background: 'transparent',
              whiteSpace: 'nowrap',
              fontSize: 13.5,
              minHeight: 46,
              scrollSnapAlign: 'center',
              flexShrink: 0,
              transition: 'all .2s ease',
            }}
          >
            {tab === 'intro' && (isFa ? 'معرفی' : 'Intro')}
            {tab === 'syllabus' && (isFa ? 'جزئیات دوره' : 'Course Details')}
            {tab === 'reviews' && (isFa ? 'نظرات' : 'Reviews')}
            {tab === 'faq' && (isFa ? 'سوالات متداول دوره' : 'FAQ')}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 16px 20px' }}>
        {activeTab === 'intro' && (
          <>
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
            {(cfg?.courseInstructor?.show !== false) && (
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
          </>
        )}

        {activeTab === 'syllabus' && (
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
        )}

                {activeTab === 'reviews' && (
          <ReviewSection
            T={{acc:'#0F766E',card:'#fff',brd:'#E5E0D8',mut:'#4B5563',txt:'#1F2937',ttl:'#0F766E',inp:'#fff',soft:'#CCFBF1',btnRadius:14,cardRadius:18,inputRadius:12,neuOut:'0 4px 15px rgba(15,23,42,.06)',neuIn:'inset 2px 2px 5px rgba(15,23,42,.05)',ok:'#14B8A6',err:'#DC2626',warn:'#F59E0B',grad:'linear-gradient(135deg,#0F766E,#0EA5E9)'}}
            lang={isFa ? 'fa' : 'en'}
            courseId={course?.id || ''}
            countries={countries}
          />
        )}

        {activeTab === 'faq' && (
          <div style={{ display: 'grid', gap: 8 }}>
            {courseFaqs.length ? courseFaqs.map((item: any) => <details key={item.id} style={{ border: '1px solid var(--zk-border)', borderRadius: 14, padding: '11px 13px', background: 'var(--zk-surface)' }}><summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 13.5 }}>{item.question}</summary><p style={{ margin: '10px 0 0', fontSize: 13, lineHeight: 1.9, color: 'var(--zk-text-muted)' }}>{item.answer}</p></details>) : <div style={{ fontSize: 13.5, color: 'var(--zk-text-muted)' }}>{isFa ? 'هنوز سوال متداولی برای این دسته از دوره‌ها ثبت نشده است.' : 'No FAQs have been added for this course category yet.'}</div>}
          </div>
        )}
      </div>

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
        <button onClick={onConsult} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface)', fontWeight: 700, fontSize: 13.5 }}>
          {isFa ? 'مشاوره رایگان' : 'Free consult'}
        </button>
        <button onClick={onRegister} style={{ flex: 1, minHeight: 46, borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', fontWeight: 700, fontSize: 13.5 }}>
          {isFa ? 'ثبت‌نام این دوره' : 'Enroll'}
        </button>
      </div>
    </div>
  );
}
