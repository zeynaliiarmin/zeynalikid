import React from 'react';
import { useNavigate } from 'react-router-dom';

interface CourseType {
  id: string;
  title: string;
  titleEn?: string;
  desc?: string;
  descEn?: string;
  image?: string;
  price?: string;
  priceNum?: number;
  discountedPrice?: number;
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
}

const FALLBACK_IMAGE = '/images/course-default.jpg';

// Topic images mapping (use existing assets)
const getTopicImage = (course: CourseType, fallback: string) => {
  const title = (course.title || '').toLowerCase();
  const tab = (course.tabId || '').toLowerCase();
  if (title.includes('قد') || tab.includes('height') || title.includes('growth')) return '/images/asset13c-topic-growth.webp';
  if (title.includes('اشتها') || tab.includes('appetite')) return '/images/asset13c-topic-appetite.webp';
  if (title.includes('تمرکز') || title.includes('ذهن') || tab.includes('mind')) return '/images/asset13c-topic-focus.webp';
  return course.image || fallback;
};

export default function CourseCard({
  course,
  size = 'normal',
  showStock = true,
  showDiscount = true,
  onTagOverride,
  onCourseClick,
  T,
  lang = 'fa'
}: CourseCardProps) {
  const navigate = useNavigate();
  const isHero = size === 'hero';
  const isSmall = size === 'small';

  const priceNum = course.priceNum || Number(String(course.price || '').replace(/[^0-9]/g, '')) || 0;
  const discountedPrice = course.discountedPrice || 0;
  const discountPercent = discountedPrice && priceNum > 0 ? Math.round(((priceNum - discountedPrice) / priceNum) * 100) : 0;
  const hasDiscount = showDiscount && discountedPrice > 0 && discountPercent > 0;

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
  const imageSrc = getTopicImage(course, FALLBACK_IMAGE);

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
      {/* Image area - 16:9 on mobile, topic-aware */}
      <div
        style={{
          position: 'relative',
          height: isSmall ? '82px' : isHero ? '178px' : '148px',
          background: 'var(--zk-surface-muted)',
          flex: isSmall ? '0 0 98px' : undefined,
          overflow: 'hidden',
        }}
      >
        <img
          src={imageSrc}
          alt={lang === 'en' ? (course.titleEn || course.title) : course.title}
          loading="lazy"
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            display: 'block',
          }}
          onError={(e: any) => {
            if (e.currentTarget.src !== FALLBACK_IMAGE) e.currentTarget.src = FALLBACK_IMAGE;
          }}
        />

        {/* Top overlay bar for tags / discount / timer */}
        <div style={{ position: 'absolute', top: 8, left: 8, right: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
          {tag && (
            <span style={{
              background: tag.color,
              color: '#fff',
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
            <span style={{
              background: '#F59E0B',
              color: '#fff',
              padding: '2px 8px',
              borderRadius: '999px',
              fontSize: '10px',
              fontWeight: 700,
            }}>
              {discountPercent}% تخفیف
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
                background: 'rgba(255,255,255,0.92)',
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

      {/* Body */}
      <div style={{
        padding: isHero ? '15px 14px 16px' : isSmall ? '9px 10px' : '13px 13px 14px',
        minWidth: 0,
      }}>
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
                <svg width="14" height="14" viewBox="0 0 24 24" fill="#F59E0B" stroke="#F59E0B" strokeWidth="1">
                  <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                </svg>
                <span style={{ fontSize: '12.5px', fontWeight: 700, color: 'var(--zk-text)' }}>{course.rating}</span>
              </div>
            )}
            {course.students && (
              <span style={{ fontSize: '11.5px', color: 'var(--zk-text-muted)' }}>
                {course.students} {lang === 'en' ? 'students' : 'دانشجو'}
              </span>
            )}
          </div>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginBottom: isSmall ? 0 : 8 }}>
          {hasDiscount ? (
            <>
              <span style={{ color: 'var(--zk-primary)', fontWeight: 800, fontSize: isHero ? '17px' : '14.5px' }}>
                {discountedPrice.toLocaleString()} {lang === 'en' ? 'T' : 'تومان'}
              </span>
              <span style={{ textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: isHero ? '12px' : '11px' }}>
                {priceNum.toLocaleString()}
              </span>
            </>
          ) : course.price ? (
            <span style={{ color: 'var(--zk-primary)', fontWeight: 800, fontSize: isHero ? '15px' : '13.5px' }}>
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
          <div style={{
            background: 'var(--zk-primary)',
            color: '#fff',
            minHeight: 44,
            padding: '10px 16px',
            borderRadius: '999px',
            fontSize: '13.5px',
            fontWeight: 700,
            textAlign: 'center',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all .2s ease',
          }}>
            {lang === 'en' ? 'View course' : 'مشاهده دوره'}
          </div>
        )}
      </div>
    </article>
  );
}
