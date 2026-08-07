import { useEffect, useRef, useState, useCallback } from 'react';
import { defaultSettings as configDefaultSettings } from '../config/defaultSettings';

// ─── بخش خدمات ما ───
// حالت لیست: آیتم‌ها عمودی، یکی زیر دیگری
// حالت کاروسل: افقی، هر اسلاید یک آیتم، حرکت خودکار، سوایپ دستی غیرفعال

interface ServiceItem { id: string; title: string; description: string; icon?: string; isVisible?: boolean; isDefault?: boolean; }
interface CarouselColumn { id: string; items: ServiceItem[]; }

interface Props {
  T: any;
  lang: string;
  publicText?: (k: string, fb?: string) => string;
  mode?: 'list' | 'carousel' | 'static';
  listItems?: ServiceItem[];
  carouselSettings?: {
    columns: number;
    columnsData: CarouselColumn[];
    autoScrollInterval: number;
    autoScrollEnabled: boolean;
    pauseOnSwipe: number;
  };
}

// ─── وکتورهای SVG اختصاصی برای هر خدمت (بر اساس عنوان واقعی) ──
const serviceIcons: Record<string, React.ReactNode> = {
  // ۱. فعال‌سازی رشد قد — نمودار صعودی
  'فعال‌سازی رشد قد': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  ),
  // ۲. برنامه تغذیه شخصی‌سازی‌شده — بشقاب با قلب
  'برنامه تغذیه شخصی‌سازی‌شده': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8h1a4 4 0 010 8h-1" />
      <path d="M2 8h16v9a4 4 0 01-4 4H6a4 4 0 01-4-4V8z" />
      <line x1="6" y1="1" x2="6" y2="4" />
      <line x1="10" y1="1" x2="10" y2="4" />
      <line x1="14" y1="1" x2="14" y2="4" />
    </svg>
  ),
  // ۳. کنترل وزن و اصلاح رشد قدی — ترازو
  'کنترل وزن و اصلاح رشد قدی': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18" />
      <path d="M7 8l5-5 5 5" />
      <rect x="3" y="14" width="18" height="7" rx="2" />
      <path d="M8 14v-2a4 4 0 018 0v2" />
    </svg>
  ),
  // ۴. تحلیل طبع و مزاج (زبان‌شناسی) — ذره‌بین روی زبان
  'تحلیل طبع و مزاج (زبان‌شناسی)': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
      <path d="M8 11c0-1.5 1.5-3 3-3s3 1.5 3 3-1.5 3-3 3" />
    </svg>
  ),
  // ۵. تقویت سیستم ایمنی — سپر با علامت تأیید
  'تقویت سیستم ایمنی': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 11 14 15 10" />
    </svg>
  ),
  // ۶. پایش تخصصی رشد قد و وزن — نمودار میله‌ای
  'پایش تخصصی رشد قد و وزن': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
      <line x1="2" y1="20" x2="22" y2="20" />
    </svg>
  ),
  // ۷. توانمندسازی والدین — کتاب باز
  'توانمندسازی والدین': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" />
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  ),
  // ۸. برنامه ورزشی (در صورت نیاز) — فرد در حال دویدن
  'برنامه ورزشی (در صورت نیاز)': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="5" r="3" />
      <path d="M12 8v3l4 4" />
      <path d="M12 11l-4 4" />
      <path d="M8 15l-2 6" />
      <path d="M16 15l2 6" />
    </svg>
  ),
  // ۹. تنظیم خواب و آرام‌سازی — ماه و ستاره
  'تنظیم خواب و آرام‌سازی': (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
      <polygon points="17 3 18.5 6 21 6.5 19 8.5 19.5 11 17 9.5 14.5 11 15 8.5 13 6.5 15.5 6" />
    </svg>
  ),
};

// آیکون پیش‌فرض برای خدماتی که عنوانشان مطابقت ندارد
const defaultIconSvg = (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

// دریافت آیکون وکتوری مناسب برای هر خدمت — بر اساس عنوان یا آیکون ایموجی fallback
const getServiceIcon = (item: ServiceItem, accentColor: string) => {
  // ابتدا بر اساس عنوان دقیق
  const iconSvg = serviceIcons[item.title] || defaultIconSvg;
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      width: 44, height: 44, borderRadius: '50%',
      background: `linear-gradient(135deg, ${accentColor}22, ${accentColor}08)`,
      border: `2px solid ${accentColor}33`,
      color: accentColor,
      flexShrink: 0,
    }}>
      {iconSvg}
    </div>
  );
};

export default function ServicesSection({ T, lang, publicText, mode, listItems, carouselSettings }: Props) {
  const isRtl = lang === 'fa';
  const defaults: any = configDefaultSettings as any;

  // ─── جمع‌آوری آیتم‌ها ───
  const safeListItems = (() => {
    if (mode === 'carousel') {
      const settings = carouselSettings?.columnsData?.length ? carouselSettings : defaults.carouselSettings;
      const cols = settings?.columnsData || [];
      const all: ServiceItem[] = [];
      cols.forEach((col: CarouselColumn) => {
        (col.items || []).forEach((item: ServiceItem) => {
          if (item.isVisible !== false && !all.find((x: ServiceItem) => x.id === item.id)) {
            all.push(item);
          }
        });
      });
      return all.length ? all : (defaults.listSettings?.items || []).filter((x: ServiceItem) => x.isVisible !== false);
    }
    return (listItems && listItems.length ? listItems : defaults.listSettings?.items || []) as ServiceItem[];
  })();

  const safeCarouselSettings = (carouselSettings?.columnsData?.length ? carouselSettings : defaults.carouselSettings) || {
    columns: 2, columnsData: [], autoScrollInterval: 8, autoScrollEnabled: true, pauseOnSwipe: 3,
  };

  // ═══════════════════════════════════════════════
  // حالت لیست — نمایش عمودی ساده
  // ══════════════════════════════════════════════
  if (mode !== 'carousel') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {safeListItems.map((item: ServiceItem) => (
          <div key={item.id} style={{
            display: 'flex', alignItems: 'flex-start', gap: 12,
            background: T.card, borderRadius: 16, padding: '12px 14px',
            boxShadow: T.neuOut,
          }}>
            {getServiceIcon(item, T.acc)}
            <div style={{ flex: 1, minWidth: 0, textAlign: isRtl ? 'right' : 'left' }}>
              <b style={{ display: 'block', fontSize: 13, color: T.txt, marginBottom: 3, lineHeight: 1.6 }}>{item.title}</b>
              <span style={{ fontSize: 11, color: T.mut, lineHeight: 1.8 }}>{item.description}</span>
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // حالت کاروسل افقی — هر اسلاید یک آیتم
  // ═══════════════════════════════════════════════
  const items = safeListItems;
  const autoInterval = (safeCarouselSettings.autoScrollInterval || 8) * 1000;
  const autoEnabled = safeCarouselSettings.autoScrollEnabled !== false;

  const [current, setCurrent] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const timerRef = useRef<number>(0);
  const total = items.length;

  // حرکت به اسلاید بعدی
  const goNext = useCallback(() => {
    if (total <= 1 || isAnimating) return;
    setIsAnimating(true);
    setCurrent(prev => (prev + 1) % total);
    setTimeout(() => setIsAnimating(false), 600);
  }, [total, isAnimating]);

  // حرکت به اسلاید قبلی
  const goPrev = useCallback(() => {
    if (total <= 1 || isAnimating) return;
    setIsAnimating(true);
    setCurrent(prev => (prev - 1 + total) % total);
    setTimeout(() => setIsAnimating(false), 600);
  }, [total, isAnimating]);

  // حرکت خودکار
  useEffect(() => {
    if (!autoEnabled || total <= 1) return;
    timerRef.current = window.setInterval(() => {
      goNext();
    }, autoInterval);
    return () => clearInterval(timerRef.current);
  }, [autoEnabled, autoInterval, total, goNext]);

  // ریست تایمر هنگام تغییر دستی
  const handleManualNav = useCallback((dir: 1 | -1) => {
    clearInterval(timerRef.current);
    if (dir === 1) goNext(); else goPrev();
    if (autoEnabled && total > 1) {
      timerRef.current = window.setInterval(() => { goNext(); }, autoInterval);
    }
  }, [goNext, goPrev, autoEnabled, autoInterval, total]);

  if (total === 0) return null;

  // استایل کارت خدمت
  const renderItemCard = (item: ServiceItem, isActive: boolean) => (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      textAlign: 'center',
      gap: 8,
      padding: '12px 16px',
      width: '100%',
      height: '100%',
      boxSizing: 'border-box',
      opacity: isActive ? 1 : 0.3,
      transform: isActive ? 'scale(1)' : 'scale(0.92)',
      transition: 'opacity 0.5s ease, transform 0.5s ease',
    }}>
      {/* آیکون وکتور */}
      {getServiceIcon(item, T.acc)}
      {/* عنوان */}
      <b style={{
        fontSize: 12, fontWeight: 700, color: T.txt,
        lineHeight: 1.4, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
      }}>
        {item.title}
      </b>
      {/* توضیحات */}
      <span style={{
        fontSize: 10, color: T.mut, lineHeight: 1.6, margin: 0,
        display: '-webkit-box', WebkitLineClamp: 2,
        WebkitBoxOrient: 'vertical', overflow: 'hidden',
        maxWidth: 240,
      }}>
        {item.description}
      </span>
    </div>
  );

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        position: 'relative',
        width: '100%',
        overflow: 'hidden',
        borderRadius: 16,
        background: `${T.soft}88`,
        border: `1px solid ${T.brd}`,
        userSelect: 'none',
        //  اصلاح ۴: اجازه اسکرول عمودی صفحه هنگام لمس کاروسل
        touchAction: 'pan-y',
        WebkitTouchCallout: 'none',
        WebkitUserSelect: 'none',
        msUserSelect: 'none',
      }}
    >
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}`}</style>
      {/* ─── ناحیه اصلی کاروسل ─── */}
      <div style={{
        position: 'relative',
        //  اصلاح ۱: کاهش ارتفاع به نصف (از 260 به 130)
        height: 130,
        overflow: 'hidden',
      }}>
        {/* نوار آیتم‌ها — حرکت افقی با translateX */}
        <div style={{
          display: 'flex',
          flexDirection: 'row',
          height: '100%',
          //  اصلاح ۲ و ۳: جهت صحیح حرکت در RTL و LTR
          transform: isRtl ? `translateX(${current * 100}%)` : `translateX(-${current * 100}%)`,
          transition: 'transform 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        }}>
          {items.map((item: ServiceItem, idx: number) => (
            <div key={item.id} style={{
              flex: '0 0 100%',
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}>
              {renderItemCard(item, idx === current)}
            </div>
          ))}
        </div>

        {/*  اصلاح ۲ و ۳: دکمه قبلی (چپ در LTR، راست در RTL) */}
        {total > 1 && (
          <button
            onClick={() => handleManualNav(-1)}
            aria-label={isRtl ? 'قبلی' : 'Previous'}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [isRtl ? 'right' : 'left']: 8,
              width: 32, height: 32,
              borderRadius: '50%',
              border: `1px solid ${T.brd}`,
              background: `${T.card}dd`,
              backdropFilter: 'blur(8px)',
              color: T.acc,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: T.neuOut,
              zIndex: 3,
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* در فارسی جهت فلش معکوس می‌شود (به سمت راست) */}
              <polyline points={isRtl ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
            </svg>
          </button>
        )}

        {/*  اصلاح ۲ و ۳: دکمه بعدی (راست در LTR، چپ در RTL) */}
        {total > 1 && (
          <button
            onClick={() => handleManualNav(1)}
            aria-label={isRtl ? 'بعدی' : 'Next'}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [isRtl ? 'left' : 'right']: 8,
              width: 32, height: 32,
              borderRadius: '50%',
              border: `1px solid ${T.brd}`,
              background: `${T.card}dd`,
              backdropFilter: 'blur(8px)',
              color: T.acc,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: T.neuOut,
              zIndex: 3,
              padding: 0,
              transition: 'all 0.2s ease',
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              {/* در فارسی جهت فلش معکوس می‌شود (به سمت چپ) */}
              <polyline points={isRtl ? "15 18 9 12 15 6" : "9 18 15 12 9 6"} />
            </svg>
          </button>
        )}
      </div>

      {/* ── نشانگرهای نقطه‌ای (dots) در مرکز پایین ─── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        padding: '10px 12px',
        background: `${T.card}ee`,
        borderTop: `1px solid ${T.brd}`,
      }}>
        {/*  اصلاح ۶: نقاط در مرکز با جلوگیری از تبدیل به مستطیل عمودی */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
          {items.map((_: ServiceItem, idx: number) => (
            <button
              key={idx}
              onClick={() => {
                if (idx === current) return;
                clearInterval(timerRef.current);
                setCurrent(idx);
                if (autoEnabled && total > 1) {
                  timerRef.current = window.setInterval(() => { goNext(); }, autoInterval);
                }
              }}
              aria-label={`اسلاید ${idx + 1}`}
              style={{
                width: idx === current ? 20 : 7,
                height: 7,
                minWidth: 0,
                minHeight: 0,
                borderRadius: 9999,
                border: 'none',
                background: idx === current ? T.acc : `${T.mut}44`,
                cursor: 'pointer',
                padding: 0,
                transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                opacity: idx === current ? 1 : 0.45,
                boxShadow: idx === current ? `0 2px 6px ${T.acc}44` : 'none',
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
