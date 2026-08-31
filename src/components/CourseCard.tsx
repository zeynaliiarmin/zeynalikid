import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CourseType {
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
  showDiscount?: boolean;
  stock?: number;
  showStock?: boolean;
  popular?: boolean;
  bestseller?: boolean;
  trending?: boolean;
  ageBadge?: boolean;
  features?: string[];
  rating?: number;
  students?: number;
  duration?: string;
  tabId?: string;
  active?: boolean;
  tags?: string[];
}

interface CourseCardProps {
  course: CourseType;
  size?: 'hero' | 'normal' | 'small';
  showStock?: boolean;
  showDiscount?: boolean;
  onTagOverride?: string;
  onCourseClick?: (course: CourseType) => void;
  T?: any;
  lang?: 'fa' | 'en';
  ctaLabel?: string;
  ctaPulse?: boolean;
}

function CountdownTimer({
  targetDate,
  lang,
  onExpire,
}: {
  targetDate: string;
  lang: string;
  onExpire: () => void;
}) {
  const [timeLeft, setTimeLeft] = React.useState<number>(() => {
    const end = new Date(targetDate).getTime();
    return Math.max(0, end - Date.now());
  });

  React.useEffect(() => {
    const end = new Date(targetDate).getTime();
    const iv = setInterval(() => {
      const rem = end - Date.now();
      if (rem <= 0) {
        clearInterval(iv);
        setTimeLeft(0);
        onExpire();
      } else {
        setTimeLeft(rem);
      }
    }, 1000);
    return () => clearInterval(iv);
  }, [targetDate, onExpire]);

  if (timeLeft <= 0) return null;

  const totalSecs = Math.floor(timeLeft / 1000);
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  const hStr = hrs < 10 ? `0${hrs}` : `${hrs}`;
  const mStr = mins < 10 ? `0${mins}` : `${mins}`;
  const sStr = secs < 10 ? `0${secs}` : `${secs}`;
  const rawStr = `${hStr}:${mStr}:${sStr}`;

  const displayStr =
    lang === 'fa'
      ? rawStr.replace(/[0-9]/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[Number(d)])
      : rawStr;

  return (
    <span
      style={{
        fontSize: 11,
        fontWeight: 700,
        color: '#111827',
        background: '#EF4444',
        borderRadius: 9999,
        padding: '2px 8px',
        direction: 'ltr',
        fontFamily: 'Vazirmatn, system-ui',
        display: 'inline-block',
      }}
    >
      {displayStr}
    </span>
  );
}

export default function CourseCard({
  course,
  size = 'normal',
  showStock = true,
  showDiscount = true,
  onTagOverride,
  onCourseClick,
  T,
  lang = 'fa',
  ctaLabel,
  ctaPulse
}: CourseCardProps) {
  const navigate = useNavigate();
  const isHero = size === 'hero';
  const isSmall = size === 'small';

  const priceNum = course.priceNum || Number(String(course.price || '').replace(/[^0-9]/g, '')) || 0;
  const isDiscountExpired = React.useCallback(() => {
    if (!course.discountEnd) return false;
    const end = new Date(course.discountEnd).getTime();
    return !Number.isNaN(end) && end <= Date.now();
  }, [course.discountEnd]);
  const [expired, setExpired] = React.useState<boolean>(isDiscountExpired);
  React.useEffect(() => { setExpired(isDiscountExpired()); }, [isDiscountExpired]);
  const handleExpire = React.useCallback(() => { setExpired(true); }, []);
  const [imageFailed, setImageFailed] = React.useState(false);
  React.useEffect(() => { setImageFailed(false); }, [course.image]);
  const discountedPrice = course.discountedPrice || 0;
  const discountPercent = discountedPrice && priceNum > 0 ? Math.round(((priceNum - discountedPrice) / priceNum) * 100) : 0;
  const hasDiscount = !expired && showDiscount && discountedPrice > 0 && discountPercent > 0;

  const getTag = () => {
    if (onTagOverride) return { label: onTagOverride, color: '#F59E0B' };
    if (course.bestseller) return { label: lang === 'en' ? 'Best seller' : 'پرفروش', color: '#EF4444' };
    if (course.popular) return { label: lang === 'en' ? 'Popular' : 'محبوب', color: '#F59E0B' };
    if (course.trending) return { label: lang === 'en' ? 'Trending' : 'پرطرفدار', color: '#14B8A6' };
    return null;
  };

  const tag = getTag();

  const handleClick = () => {
    if (onCourseClick) onCourseClick(course);
    else if (course.tabId) navigate('/courses', { state: { tabId: course.tabId, courseId: course.id } });
    else navigate('/courses');
  };

  const stockValue = typeof course.stock === 'number' ? course.stock : -1;
  const imageSrc = String(course.image || '').trim();
  const showImage = !!imageSrc && !imageFailed;

  // New Stage 2 Design: Mobile-first, 16:9 image top, pill CTAs, 3 shadows, clean
  return (
    <article
      onClick={handleClick}
      className={`zk-course-card zk-course-card--${size}`}
      style={{
        background: 'var(--zk-surface)',
        border: '1px solid var(--zk-border)',
        borderRadius: isHero ? '22px' : '20px',
        overflow: 'hidden',
        boxShadow: 'var(--zk-shadow-light)',
        color: 'var(--zk-text)',
        cursor: 'pointer',
        display: isSmall ? 'flex' : 'block',
        minWidth: 0,
        transition: 'box-shadow .2s ease, transform .2s ease',
      }}
    >
      {/* بخش تصویر فقط وقتی برای خود همین دوره عکس ثبت شده باشد ساخته می‌شود. */}
      {showImage && (
        <div
          style={{
            position: 'relative',
            height: isSmall ? '82px' : undefined,
            aspectRatio: isSmall ? undefined : (course.aspectRatio || '16 / 9'),
            background: 'var(--zk-surface-muted)',
            flex: isSmall ? '0 0 98px' : undefined,
            overflow: 'hidden',
          }}
        >
          <img
            src={imageSrc}
            alt={lang === 'en' ? (course.titleEn || course.title) : course.title}
            loading="lazy"
          decoding="async"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              objectPosition: course.objectPosition || 'center',
              display: 'block',
            }}
            onError={() => setImageFailed(true)}
          />

          {/* Top overlay bar for tags / discount / timer */}
          <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
            {tag && (
              <span style={{
                background: tag.color,
                color: '#111827',
                padding: '3px 9px',
                borderRadius: '999px',
                fontSize: '10.5px',
                fontWeight: 700,
                letterSpacing: '0.2px',
              }}>
                {tag.label}
              </span>
            )}

            {hasDiscount && (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{
                  background: '#F59E0B',
                  color: '#111827',
                  padding: '2px 8px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 700,
                }}>
                  {discountPercent}% {lang === 'en' ? 'off' : 'تخفیف'}
                </span>
                {course.discountEnd && <CountdownTimer targetDate={course.discountEnd} lang={lang} onExpire={handleExpire} />}
              </span>
            )}
          </div>

          {/* Duration / age badge on image bottom */}
          {!isSmall && (course.duration || course.ageBadge !== false) && (
            <div style={{
              position: 'absolute',
              bottom: 8,
              left: 8,
              display: 'flex',
              gap: 6,
              alignItems: 'center',
            }}>
              {course.duration && (
                <span style={{
                  background: 'color-mix(in srgb, var(--zk-surface) 92%, transparent)',
                  color: 'var(--zk-text)',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}>
                  {course.duration}
                </span>
              )}
              {course.ageBadge !== false && (
                <span style={{
                  background: 'rgba(15,118,110,0.9)',
                  color: '#fff',
                  padding: '1px 7px',
                  borderRadius: '999px',
                  fontSize: '10px',
                  fontWeight: 600,
                }}>
                  {lang === 'en' ? '2-17y' : '۲ تا ۱۷ سال'}
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      <div style={{
        padding: isHero ? '15px 14px 16px' : isSmall ? '9px 10px' : '13px 13px 14px',
        minWidth: 0,
        flex: isSmall ? 1 : undefined,
      }}>
        {!showImage && !isSmall && (tag || hasDiscount) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 7, marginBottom: 8 }}>
            {tag ? (
              <span style={{ background: tag.color, color: '#111827', padding: '3px 9px', borderRadius: 999, fontSize: 10.5, fontWeight: 700 }}>{tag.label}</span>
            ) : <span />}
            {hasDiscount && (
              <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                <span style={{ background: '#F59E0B', color: '#111827', padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>
                  {discountPercent}% {lang === 'en' ? 'off' : 'تخفیف'}
                </span>
                {course.discountEnd && <CountdownTimer targetDate={course.discountEnd} lang={lang} onExpire={handleExpire} />}
              </span>
            )}
          </div>
        )}

        <h3 style={{
          fontSize: isHero ? '16.5px' : isSmall ? '12.5px' : '14.5px',
          fontWeight: 800,
          color: 'var(--zk-text)',
          margin: '0 0 6px',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: isSmall ? 'nowrap' : undefined,
        }}>
          {lang === 'en' ? (course.titleEn || course.title) : course.title}
        </h3>

        {!showImage && !isSmall && (course.duration || course.ageBadge !== false) && (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 7 }}>
            {course.duration && <span style={{ background: 'var(--zk-surface-muted)', color: 'var(--zk-text-muted)', padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{course.duration}</span>}
            {course.ageBadge !== false && <span style={{ background: 'var(--zk-primary-light)', color:'var(--zk-primary-text)', padding: '2px 7px', borderRadius: 999, fontSize: 10, fontWeight: 600 }}>{lang === 'en' ? '2-17y' : '۲ تا ۱۷ سال'}</span>}
          </div>
        )}

        {isHero && course.desc && (
          <p style={{
            fontSize: '12.5px',
            color: 'var(--zk-text-muted)',
            lineHeight: 1.6,
            margin: '0 0 10px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
          }}>
            {lang === 'en' ? (course.descEn || course.desc) : course.desc}
          </p>
        )}

        {/* Rating + students */}
        {!isSmall && (course.rating || course.students) && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
            {course.rating && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
                {/* SVG Star */}
                <svg width="14" height="14" viewBox="0 0 24 24" fill={T.warn} stroke={T.warn} strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--zk-text)' }}>{course.rating}</span>
              </div>
            )}
            {course.students && (
              <span style={{ fontSize: '11.5px', color: 'var(--zk-text-muted)' }}>
                {course.students} {lang === 'en' ? 'families' : 'والد همراه'}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: isSmall ? 0 : 8 }}>
          {hasDiscount ? (
            <>
              <span style={{ color:'var(--zk-primary-text)', fontWeight: 800, fontSize: isHero ? '17px' : '14.5px' }}>
                {discountedPrice.toLocaleString()} {lang === 'en' ? 'T' : 'تومان'}
              </span>
              <span style={{ textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: isHero ? '12px' : '11px' }}>
                {priceNum.toLocaleString()}
              </span>
            </>
          ) : course.price ? (
            <span style={{ color:'var(--zk-primary-text)', fontWeight: 800, fontSize: isHero ? '15px' : '13.5px' }}>
              {course.price} {lang === 'en' ? 'Toman' : 'تومان'}
            </span>
          ) : null}
        </div>

        {/* Stock */}
        {!isSmall && showStock && stockValue >= 0 && (
          <div style={{
            margin: '2px 0 8px',
            fontSize: '11.5px',
            fontWeight: 700,
            color: stockValue > 0 ? 'var(--zk-success)' : 'var(--zk-error)',
          }}>
            {stockValue > 0 ? `${stockValue} ${lang === 'en' ? 'left' : 'عدد باقی مانده'}` : (lang === 'en' ? 'Sold out' : 'ناموجود')}
          </div>
        )}

        {/* CTA */}
        {!isSmall && (
          // دکمهٔ واقعی (نه مربع متنی): با کیبورد و صفحه‌خوان هم باز می‌شود و
          // هیچ کنترل تعاملی داخل کنترل دیگر قرار نمی‌گیرد.
          <button
            type="button"
            onClick={(ev) => { ev.stopPropagation(); handleClick(); }}
            aria-label={`${ctaLabel || (lang === 'en' ? 'View course' : 'مشاهده دوره')}${course.title ? ` — ${course.title}` : ''}`}
            style={{
            background: 'var(--zk-primary)',
            color: 'var(--zk-text-inverse, #fff)',
            minHeight: 44,
            padding: '10px 16px',
            borderRadius: '999px',
            fontSize: ctaPulse ? '14px' : '13.5px',
            fontWeight: ctaPulse ? 800 : 700,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .2s ease',
            animation: ctaPulse ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined,
            WebkitAnimation: ctaPulse ? 'zk-hero-pulse 1.6s ease-in-out infinite' : undefined,
            border: 0, width: '100%', fontFamily: 'inherit', cursor: 'pointer',
          }}>
            {ctaLabel || (lang === 'en' ? 'View course' : 'مشاهده دوره')}
          </button>
        )}
      </div>
    </article>
  );
}
