import React, { useMemo, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import StarRatingInput from './StarRatingInput';
import { ReviewItem, fetchReviews, submitReview } from '../lib/supabase';
import { defaultCountries } from '../config/defaultSettings';
import {
  detectReviewCountryCode,
  formatPersianReviewDate,
  isValidReviewPhone,
  maskReviewPhone,
  normalizeReviewPhone,
  reviewCountryByCode,
  reviewCountryFlag,
} from '../utils/reviewPresentation';

export interface ReviewSectionProps {
  T: any;
  lang: 'fa' | 'en';
  courseId?: string;
  placement?: 'course_detail' | 'product_detail';
  countries?: any[];
}

const StarSvg = ({ filled, color = 'var(--zk-primary)', size = 16 }: { filled: boolean; color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill={filled ? color : 'none'} stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

// برش متن به حداکثر ۴ خط: اگر بیش از ۴ خط بود، با سه‌نقطه و دکمه «بیشتر»
function CommentBody({ comment, expandable, expanded, onMore, inSheet }: { comment?: string; expandable: boolean; expanded: boolean; onMore?: () => void; inSheet?: boolean }) {
  if (!comment) return null;
  if (expanded || inSheet) {
    return <div className={expanded ? 'zk-expand' : ''} style={{ fontSize: 13, color: 'var(--zk-text-muted)', lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{comment}</div>;
  }
  return (
    <div>
      <div style={{ fontSize: 13, color: 'var(--zk-text-muted)', lineHeight: 1.9, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical' as any, overflow: 'hidden' }}>{comment}</div>
      {expandable && onMore && (
        <button type="button" onClick={onMore} style={{ border: 0, background: 'transparent', color: 'var(--zk-primary, #0F766E)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 800, padding: '3px 0 0' }}>
          {comment.length > 0 ? 'بیشتر' : ''}
        </button>
      )}
    </div>
  );
}

export default function ReviewSection({ T, lang, courseId, placement = 'course_detail', countries: suppliedCountries }: ReviewSectionProps) {
  const isFa = lang === 'fa';
  const countries = suppliedCountries?.length ? suppliedCountries : defaultCountries as any[];
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [sheetReview, setSheetReview] = useState<ReviewItem | null>(null);
  const showAllPushedRef = React.useRef(false);
  const formRef = React.useRef<HTMLFormElement | null>(null);
  const scrollToForm = () => { formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }); };

  // باز کردن صفحهٔ «مشاهده همه» با push یک state در history تا دکمهٔ back/مرورگر فقط همین صفحه را ببندد
  const openShowAll = () => {
    if (!showAllPushedRef.current) {
      try { window.history.pushState({ zkReviewsPage: true }, ''); } catch {}
      showAllPushedRef.current = true;
    }
    try { (window as any).__zkReviewsOverlayOpen = true; } catch {}
    setShowAll(true);
  };

  // بستن صفحهٔ «مشاهده همه» و برگشت به بخش نظراتِ همان دوره (نه فهرست دوره‌ها)
  const closeShowAll = () => {
    showAllPushedRef.current = false;
    try { (window as any).__zkReviewsOverlayOpen = false; } catch {}
    setShowAll(false);
    // برگشت به بخش نظراتِ دورهٔ انتخاب‌شده
    window.setTimeout(() => {
      const sec = document.getElementById('course-detail-reviews') || document.getElementById('product-detail-reviews');
      if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 60);
  };

  // وقتی کاربر دکمهٔ back گوشی/مرورگر را روی صفحهٔ «مشاهده همه» بزند، فقط آن صفحه بسته شود
  React.useEffect(() => {
    const onPop = () => {
      if (showAllPushedRef.current) {
        showAllPushedRef.current = false;
        try { (window as any).__zkReviewsOverlayOpen = false; } catch {}
        setShowAll(false);
        window.setTimeout(() => {
          const sec = document.getElementById('course-detail-reviews') || document.getElementById('product-detail-reviews');
          if (sec) sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 60);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ۵ نظر رندوم برای نمایش در تب نظرات (هر بار تغییر می‌کند)
  const previewReviews = useMemo(() => {
    const arr = [...reviews];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr.slice(0, 5);
  }, [reviews]);

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const list = await fetchReviews('approved');
        if (!active) return;
        const filtered = (list || []).filter((review) => {
          const targetIds: string[] = Array.isArray(review.course_ids) ? review.course_ids : [];
          if (targetIds.length > 0) {
            if (!targetIds.includes(courseId || '') && !targetIds.includes('عمومی') && !targetIds.includes('all')) return false;
          } else if (courseId && review.course_id && review.course_id !== 'عمومی' && review.course_id !== courseId) {
            return false;
          }
          const places = Array.isArray(review.placements) && review.placements.length ? review.placements : ['course_detail'];
          return places.includes(placement);
        });
        setReviews(filtered);
      } catch (error) {
        console.error('load reviews error:', error);
      }
    };
    load();
    return () => { active = false; };
  }, [courseId, placement]);

  const sortedReviews = useMemo(() => [...reviews].sort((a, b) => {
    const left = new Date(a.created_at || 0).getTime();
    const right = new Date(b.created_at || 0).getTime();
    return sortOrder === 'oldest' ? left - right : right - left;
  }), [reviews, sortOrder]);

  const avgRating = reviews.length > 0
    ? (reviews.reduce((total, review) => total + review.rating, 0) / reviews.length).toFixed(1)
    : '۵.۰';

  const detectedCountryCode = detectReviewCountryCode(phone, countries);
  const detectedCountry = reviewCountryByCode(countries, detectedCountryCode);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    if (!comment.trim()) {
      alert(isFa ? 'لطفاً متن نظر را بنویسید.' : 'Please write your comment.');
      return;
    }
    if (!isValidReviewPhone(phone, detectedCountryCode)) {
      alert(isFa ? 'لطفاً شماره تماس معتبر وارد کنید. برای شماره خارجی، کد کشور را نیز وارد کنید.' : 'Please enter a valid phone number, including the country code for international numbers.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(
        courseId || 'عمومی',
        name.trim(),
        rating,
        comment.trim(),
        [placement],
        normalizeReviewPhone(phone, detectedCountryCode),
        courseId ? [courseId] : [],
        detectedCountryCode,
      );
      setName('');
      setPhone('');
      setComment('');
      setRating(5);
      setSuccess(true);
      window.setTimeout(() => setSuccess(false), 5000);
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  // بررسی اینکه نظر از ۳ خط بیشتر است (تقریبی: بیش از ~۱۸۰ کاراکتر)
  const isLong = (c?: string) => (c || '').length > 180;

  const reviewCardContent = (review: ReviewItem, opts: { inSheet?: boolean; inPage?: boolean } = {}) => {
    const maskedPhone = maskReviewPhone(review.phone || review.public_phone, review.phone_country);
    const long = isLong(review.comment);
    const expanded = expandedIds.has(String(review.id));
    return (
      <>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginBottom: 8 }}>
          <span style={{ fontSize: 13, fontWeight: 800, color: T.txt, minWidth: 0 }}>{review.reviewer_name}</span>
          {maskedPhone && (
            <span data-public-review-phone dir="ltr" style={{ fontSize: 12, color: T.mut, whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
              {reviewCountryFlag(review.phone_country, countries)} ({maskedPhone})
            </span>
          )}
        </div>
        <div aria-label={`${review.rating} / 5`} style={{ display: 'flex', gap: 2, direction: 'ltr', justifyContent: 'flex-end', marginBottom: review.comment ? 8 : 4 }}>
          {[1, 2, 3, 4, 5].map((star) => <StarSvg key={star} filled={star <= review.rating} color={T.warn} size={14} />)}
        </div>
        <CommentBody comment={review.comment} expandable={long} expanded={expanded} inSheet={opts.inSheet} onMore={() => opts.inPage ? toggleExpand(String(review.id)) : setSheetReview(review)} />
        <time dateTime={review.created_at} style={{ display: 'block', borderTop: `1px solid ${T.brd}`, marginTop: 10, paddingTop: 8, fontSize: 10.5, color: T.mut }}>
          {isFa ? 'تاریخ ثبت: ' : 'Submitted: '}{formatPersianReviewDate(review.created_at, isFa)}
        </time>
      </>
    );
  };

  // جهت اسکرول افقی: در فارسی برعکس حالت فعلی (به سمت چپ شروع می‌شود)، در انگلیسی ltr
  const horizDir: any = isFa ? 'rtl' : 'ltr';
  // جهت فلش دکمه مشاهده همه: در فارسی به سمت چپ (جایی که اسکرول ادامه می‌یابد)
  const arrowDir = isFa ? 'left' : 'right';

  return (
    <div style={{ marginTop: 24 }}>
      <style>{`
        @keyframes zk-sheet-up { from { transform: translateY(100%); opacity: 0.4; } to { transform: translateY(0); opacity: 1; } }
        @keyframes zk-fade-in { from { opacity: 0; } to { opacity: 1; } }
        @keyframes zk-expand { from { opacity: 0.3; } to { opacity: 1; } }
        .zk-sheet-up { animation: zk-sheet-up 0.3s cubic-bezier(0.16,1,0.3,1) both; }
        .zk-overlay-fade { animation: zk-fade-in 0.25s ease both; }
        .zk-expand { animation: zk-expand 0.35s ease both; }
      `}</style>
      {/* هدر بخش نظرات: عنوان + میانگین امتیاز درشت و بولد + تعداد + دکمه ثبت نظر */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 17, fontWeight: 900, color: T.ttl, margin: 0 }}>{isFa ? 'نظرات والدین و کاربران' : 'Parent & User Reviews'}</h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 6, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 17, fontWeight: 900, color:T.accText }}>
              {reviews.length > 0 ? `★ ${avgRating}` : '★ —'}
            </span>
            <span style={{ fontSize: 13, color: T.txt, fontWeight: 700 }}>{isFa ? 'از ۵' : '/ 5'}</span>
            <span style={{ fontSize: 12, color: T.mut }}>{isFa ? `(${reviews.length} نظر ثبت‌شده)` : `(${reviews.length} reviews)`}</span>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <button type="button" onClick={scrollToForm} style={{ minHeight: 40, padding: '0 16px', borderRadius: 999, border: 0, background: T.grad || T.acc, color: '#fff', fontWeight: 800, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>
            {isFa ? 'ثبت نظر' : 'Write a review'}
          </button>
          {showAll && (
            <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: T.mut }}>
              <span>{isFa ? 'مرتب‌سازی:' : 'Sort:'}</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')} style={{ minHeight: 36, borderRadius: 9, border: `1px solid ${T.brd}`, background: T.inp || T.card, color: T.txt, padding: '0 9px', fontFamily: 'inherit' }}>
                <option value="newest">{isFa ? 'جدیدترین' : 'Newest'}</option>
                <option value="oldest">{isFa ? 'قدیمی‌ترین' : 'Oldest'}</option>
              </select>
            </label>
          )}
        </div>
      </div>

      {reviews.length > 0 ? (
        <div style={{ marginBottom: 20 }}>
          {/* حالت پیش‌فرض: اسکرول افقیِ ۵ نظر + دکمه مشاهده همه (به‌عنوان کارت ششم) */}
          <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 10, WebkitOverflowScrolling: 'touch', scrollSnapType: 'x mandatory', direction: horizDir }}>
            {previewReviews.map((review) => (
              <article key={review.id} data-review-id={review.id} style={{ flex: '0 0 78%', maxWidth: 300, scrollSnapAlign: 'start', background: T.card, borderRadius: T.cardRadius || 14, border: `1px solid ${T.brd}`, padding: 14, boxShadow: T.neuOut, direction: 'rtl' }}>
                {reviewCardContent(review, {})}
              </article>
            ))}
            {/* دکمه مشاهده همه — به‌عنوان کارت ششم، کنار آخرین نظر */}
            {reviews.length > 5 && (
              <button
                type="button"
                onClick={openShowAll}
                aria-label={isFa ? 'مشاهده همه' : 'View all'}
                style={{ flex: '0 0 39%', maxWidth: 150, scrollSnapAlign: 'start', border: 0, background: 'transparent', cursor: 'pointer', fontFamily: 'inherit', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6, padding: 14 }}
              >
                <span style={{ width: 46, height: 46, borderRadius: '50%', border: `2px solid ${T.acc}`, background: T.soft, color:T.accText, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}>
                    <path d="M5 12h14" />
                    <path d="m13 6 6 6-6 6" />
                  </svg>
                </span>
                <span style={{ fontSize: 13, fontWeight: 800, color:T.accText }}>{isFa ? 'مشاهده همه' : 'View all'}</span>
              </button>
            )}
          </div>
        </div>
      ) : (
        <div style={{ background: T.card, borderRadius: T.cardRadius || 14, border: `1px solid ${T.brd}`, padding: 18, textAlign: 'center', color: T.mut, fontSize: 13, marginBottom: 20 }}>
          {isFa ? 'هنوز نظری برای این مورد ثبت نشده است. شما اولین نفر باشید!' : 'No reviews yet. Be the first to leave a review!'}
        </div>
      )}

      {/* صفحهٔ جداگانهٔ «مشاهده همه نظرات» — تمام‌صفحه، با هدر و دکمه برگشت، نظرات به‌صورت عمودی */}
      {showAll && createPortal(
        <div className="zk-overlay-fade" style={{ position: 'fixed', inset: 0, zIndex: 99998, background: T.card || '#fff', display: 'flex', flexDirection: 'column' }}>
          {/* هدر صفحهٔ نظرات */}
          <div style={{ position: 'sticky', top: 0, zIndex: 5, display: 'flex', alignItems: 'center', gap: 12, padding: 'calc(12px + env(safe-area-inset-top,0px)) 16px 12px', background: T.card || '#fff', borderBottom: `1px solid ${T.brd}` }}>
            <button type="button" onClick={closeShowAll} aria-label={isFa ? 'بازگشت' : 'Back'} style={{ width: 38, height: 38, borderRadius: 999, border: `1px solid ${T.brd}`, background: T.soft, color: T.txt, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}><path d="M15 18l-6-6 6-6" /></svg>
            </button>
            <div style={{ flex: 1, minWidth: 0 }}>
              <b style={{ display: 'block', fontSize: 16, fontWeight: 900, color: T.ttl }}>{isFa ? 'نظرات' : 'Reviews'}</b>
              <span style={{ fontSize: 12, color:T.accText, fontWeight: 800 }}>{reviews.length > 0 ? `★ ${avgRating} ${isFa ? 'از ۵' : '/ 5'}` : ''} • ({reviews.length} {isFa ? 'نظر' : 'reviews'})</span>
            </div>
            <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: T.mut }}>
              <span>{isFa ? 'مرتب‌سازی:' : 'Sort:'}</span>
              <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')} style={{ minHeight: 36, borderRadius: 9, border: `1px solid ${T.brd}`, background: T.inp || T.card, color: T.txt, padding: '0 9px', fontFamily: 'inherit' }}>
                <option value="newest">{isFa ? 'جدیدترین' : 'Newest'}</option>
                <option value="oldest">{isFa ? 'قدیمی‌ترین' : 'Oldest'}</option>
              </select>
            </label>
          </div>
          {/* فهرست عمودی همه نظرات */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '16px 14px calc(24px + env(safe-area-inset-bottom,0px))' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 760, margin: '0 auto' }}>
              {sortedReviews.map((review) => (
                <article key={review.id} data-review-id={review.id} style={{ background: T.card, borderRadius: T.cardRadius || 14, border: `1px solid ${T.brd}`, padding: 14, boxShadow: T.neuOut }}>
                  {reviewCardContent(review, { inPage: true })}
                </article>
              ))}
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* Bottom-sheet: نمایش کامل نظر از پایین (فقط در تب نظرات وقتی «بیشتر» زده می‌شود) */}
      {sheetReview && createPortal(
        <div onClick={() => setSheetReview(null)} className="zk-overlay-fade" style={{ position: 'fixed', inset: 0, zIndex: 99999, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'flex-end' }}>
          <div onClick={(e) => e.stopPropagation()} className="zk-sheet-up" style={{ width: '100%', maxHeight: '75vh', overflowY: 'auto', background: T.card || '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: '18px 18px calc(18px + env(safe-area-inset-bottom,0px))', boxShadow: '0 -10px 40px rgba(15,23,42,0.3)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <b style={{ fontSize: 15, color: T.ttl }}>{isFa ? 'نظر کامل' : 'Full review'}</b>
              <button type="button" onClick={() => setSheetReview(null)} style={{ border: 0, background: T.soft, width: 34, height: 34, borderRadius: '50%', color: T.txt, fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
            </div>
            <div style={{ background: T.soft, borderRadius: 14, border: `1px solid ${T.brd}`, padding: 14 }}>
              {reviewCardContent(sheetReview, { inSheet: true })}
            </div>
          </div>
        </div>,
        document.body,
      )}

      <form ref={formRef} onSubmit={handleSubmit} style={{ background: T.soft, borderRadius: T.cardRadius || 16, border: `1px solid ${T.brd}`, padding: 16, boxShadow: T.neuIn }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ttl, marginBottom: 12 }}>{isFa ? 'ثبت نظر جدید' : 'Leave a Review'}</div>
        {success ? (
          <div style={{ padding: '12px 14px', background: `${T.ok}18`, border: `1px solid ${T.ok}44`, color: T.ok, borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            {isFa ? 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.' : 'Your review was submitted and will appear after approval.'}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>{isFa ? 'امتیاز شما:' : 'Your Rating:'}</label>
              <StarRatingInput value={rating} onChange={setRating} lang={lang} />
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>{isFa ? 'نام و نام خانوادگی' : 'Your Name'}</label>
                <input type="text" value={name} onChange={(event) => setName(event.target.value)} placeholder={isFa ? 'نام شما (اختیاری)' : 'Your name (optional)'} style={{ width: '100%', padding: '10px 12px', borderRadius: T.inputRadius || 10, border: `1px solid ${T.brd}`, background: T.inp, color: T.txt, fontSize: 14, outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>{isFa ? 'شماره تماس' : 'Phone Number'} *</label>
                <input type="tel" inputMode="tel" required dir="ltr" value={phone} onChange={(event) => setPhone(event.target.value)} placeholder={isFa ? '09193344411' : '09193344411'} style={{ width: '100%', padding: '10px 12px', borderRadius: T.inputRadius || 10, border: `1px solid ${T.brd}`, background: T.inp, color: T.txt, fontSize: 14, outline: 'none', fontFamily: 'inherit', textAlign: 'left', boxSizing: 'border-box' }} />
              </div>
            </div>
            {phone && <small style={{ display: 'block', fontSize: 10.5, color: T.mut, marginTop: -4, marginBottom: 4 }}>{reviewCountryFlag(detectedCountryCode, countries)} {isFa ? `کشور تشخیص‌داده‌شده: ${detectedCountry?.name || 'سایر'} • نمایش عمومی: ${maskReviewPhone(normalizeReviewPhone(phone, detectedCountryCode), detectedCountryCode) || '—'}` : `Detected country: ${detectedCountry?.nameEn || 'Other'} • Public: ${maskReviewPhone(normalizeReviewPhone(phone, detectedCountryCode), detectedCountryCode) || '—'}`}</small>}
            <small style={{ display: 'block', fontSize: 11, color: T.mut, marginBottom: 10 }}>{isFa ? 'برای اطمینان از صحت نظر، فقط شماره تماس خواسته می‌شود و در سایت نمایش داده نمی‌شود؛ اطلاعات شما محفوظ می‌ماند.' : 'Your phone number is requested only to verify the review and is never shown publicly.'}</small>
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>{isFa ? 'متن نظر' : 'Comment'} *</label>
              <textarea rows={2} value={comment} onChange={(event) => setComment(event.target.value)} placeholder={isFa ? 'نظر یا تجربه خود را بنویسید...' : 'Write your comment...'} style={{ width: '100%', padding: '10px 12px', borderRadius: T.inputRadius || 10, border: `1px solid ${T.brd}`, background: T.inp, color: T.txt, fontSize: 14, outline: 'none', fontFamily: 'inherit', resize: 'vertical', boxSizing: 'border-box' }} />
            </div>
            <button type="submit" disabled={submitting || !comment.trim() || !phone.trim()} style={{ padding: '12px 24px', borderRadius: T.btnRadius || 12, border: 0, background: submitting || !comment.trim() || !phone.trim() ? T.brd : T.grad || T.acc, color: submitting || !comment.trim() || !phone.trim() ? T.mut : '#fff', fontWeight: 800, fontSize: 14, cursor: submitting || !comment.trim() || !phone.trim() ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {submitting ? (isFa ? 'در حال ارسال...' : 'Submitting...') : (isFa ? 'ارسال نظر' : 'Submit Review')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
