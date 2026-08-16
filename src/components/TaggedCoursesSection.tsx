/**
 * TaggedCoursesSection — بخش دوره‌های ویژه با تگ
 *
 * امکانات جدید:
 * - استفاده از CourseCard برای نمایش یکپارچه
 * - قیمت تخفیفی + نمایش موجودی
 */

import CourseCard from './CourseCard';

type Lang = 'fa' | 'en';

interface Course {
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
  tagOverride?: string;
  popular?: boolean;
  bestseller?: boolean;
  trending?: boolean;
  active?: boolean;
  tabId?: string;
  ageBadge?: boolean;
}

interface TaggedCoursesSectionProps {
  courses: Course[];
  title: string;
  titleEn?: string;
  tags: string[];
  maxCourses?: number;
  lang: Lang;
  T: any;
  showStock?: boolean;
  showDiscount?: boolean;
}

export default function TaggedCoursesSection({
  courses,
  title,
  titleEn,
  tags,
  maxCourses = 6,
  lang,
  T,
  showStock = true,
  showDiscount = true,
}: TaggedCoursesSectionProps) {
  // فیلتر کردن دوره‌های دارای حداقل یکی از تگ‌ها (popular/bestseller/trending)
  const tagMap: Record<string, keyof Course> = {
    'پرفروش': 'bestseller',
    'پرطرفدار': 'popular',
    'محبوب': 'popular',
  };

  const filteredCourses = courses
    .filter((course) => {
      if (!course.active) return false;
      return tags.some((tag) => {
        const prop = tagMap[tag];
        return prop && course[prop];
      });
    })
    .slice(0, maxCourses);

  if (!filteredCourses.length) return null;

  return (
    <section className="tagged-courses-section">
      {/* هدر بخش */}
      <div className="tagged-section-header">
        <h2 className="tagged-section-title">
          {lang === 'en' ? (titleEn || title) : title}
        </h2>
        <span className="tagged-section-badge">
          {lang === 'en' ? 'Featured' : 'منتخب'}
        </span>
      </div>

      {/* گرید دوره‌ها با CourseCard */}
      <div className="tagged-courses-grid">
        {filteredCourses.map((course) => (
          <CourseCard
            key={course.id}
            course={course}
            size="normal"
            showStock={showStock}
            showDiscount={showDiscount}
            onTagOverride={course.tagOverride}
            T={T}
            lang={lang}
          />
        ))}
      </div>
    </section>
  );
}
