import React from 'react';
import CourseCard from './CourseCard';

interface FeaturedCourse {
  id: string;
  tabId: string;
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
  tagOverride?: string;
  popular?: boolean;
  bestseller?: boolean;
  trending?: boolean;
  ageBadge?: boolean;
  features?: string[];
  rating?: number;
  students?: number;
  duration?: string;
}

interface FeaturedCoursesProps {
  courses: FeaturedCourse[];
  heroCourseId: string;
  title: string;
  T: any;
  lang: string;
  showStock?: boolean;
  showDiscount?: boolean;
}

export default function FeaturedCourses({
  courses,
  heroCourseId,
  title,
  T,
  lang,
  showStock = true,
  showDiscount = true,
}: FeaturedCoursesProps) {
  if (!courses || courses.length === 0) return null;

  const heroCourse = courses.find(c => c.id === heroCourseId) || courses[0];
  const otherCourses = courses.filter(c => c.id !== heroCourseId).slice(0, 4);

  return (
    <section style={{ marginTop: 26, width: '100%' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, paddingInline: 4 }}>
        <div>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: 'var(--zk-text)', margin: 0 }}>{title}</h2>
        </div>
        <span style={{ fontSize: 10, background: 'var(--zk-primary-light)', color: 'var(--zk-primary)', padding: '3px 10px', borderRadius: 999, fontWeight: 700 }}>
          {lang === 'en' ? 'Featured' : 'منتخب'}
        </span>
      </div>

      {/* Desktop: hero + side cards */}
      <div className="featured-desktop" style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div>
          <CourseCard
            course={heroCourse}
            size="hero"
            showStock={showStock}
            showDiscount={showDiscount}
            onTagOverride={heroCourse.tagOverride}
            T={T}
            lang={lang as any}
          />
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {otherCourses.slice(0, 2).map((course) => (
            <CourseCard
              key={course.id}
              course={course}
              size="normal"
              showStock={showStock}
              showDiscount={showDiscount}
              onTagOverride={course.tagOverride}
              T={T}
              lang={lang as any}
            />
          ))}
        </div>
      </div>

      {/* Mobile: horizontal swipe with new CourseCard (Stage 2) */}
      <div className="featured-mobile" style={{ display: 'none' }}>
        <div tabIndex={0} role="region" aria-label={lang==='en'?'Featured courses':'دوره‌های منتخب'} style={{
          display: 'flex',
          gap: 12,
          overflowX: 'auto',
          paddingBottom: 12,
          scrollSnapType: 'x mandatory',
          WebkitOverflowScrolling: 'touch',
          overscrollBehaviorX: 'contain',
        }}>
          {[heroCourse, ...otherCourses].map((course, idx) => (
            <div key={idx} style={{ flex: '0 0 82%', scrollSnapAlign: 'start', minWidth: 260 }}>
              <CourseCard
                course={course}
                size="normal"
                showStock={showStock}
                showDiscount={showDiscount}
                onTagOverride={course.tagOverride}
                T={T}
                lang={lang as any}
              />
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @media (max-width: 768px) {
          .featured-desktop { display: none !important; }
          .featured-mobile { display: block !important; }
        }
        @media (min-width: 769px) {
          .featured-mobile { display: none !important; }
        }
      `}</style>
    </section>
  );
}
