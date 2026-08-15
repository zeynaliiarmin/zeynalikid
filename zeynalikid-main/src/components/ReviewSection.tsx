import React, { useMemo, useState, useEffect } from 'react';
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

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: T.ttl, margin: 0 }}>{isFa ? 'نظرات والدین و کاربران' : 'Parent & User Reviews'}</h3>
          <div style={{ fontSize: 12, color: T.mut, marginTop: 4 }}>
            {isFa ? `میانگین امتیاز ${avgRating} از ۵ • (${reviews.length} نظر ثبت‌شده)` : `Average rating ${avgRating} / 5 • (${reviews.length} reviews)`}
          </div>
        </div>
        <label style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: T.mut }}>
          <span>{isFa ? 'مرتب‌سازی:' : 'Sort:'}</span>
          <select value={sortOrder} onChange={(event) => setSortOrder(event.target.value as 'newest' | 'oldest')} style={{ minHeight: 36, borderRadius: 9, border: `1px solid ${T.brd}`, background: T.inp || T.card, color: T.txt, padding: '0 9px', fontFamily: 'inherit' }}>
            <option value="newest">{isFa ? 'جدیدترین' : 'Newest'}</option>
            <option value="oldest">{isFa ? 'قدیمی‌ترین' : 'Oldest'}</option>
          </select>
        </label>
      </div>

      {sortedReviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {sortedReviews.map((review) => {
            const maskedPhone = maskReviewPhone(review.phone || review.public_phone, review.phone_country);
            return (
              <article key={review.id} data-review-id={review.id} style={{ background: T.card, borderRadius: T.cardRadius || 14, border: `1px solid ${T.brd}`, padding: 14, boxShadow: T.neuOut }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, direction: 'rtl', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 800, color: T.txt, minWidth: 0 }}>{review.reviewer_name}</span>
                  {maskedPhone && (
                    <span data-public-review-phone dir="ltr" style={{ fontSize: 12, color: T.mut, whiteSpace: 'nowrap', fontFamily: 'ui-monospace, SFMono-Regular, Menlo, monospace' }}>
                      {reviewCountryFlag(review.phone_country, countries)} ({maskedPhone})
                    </span>
                  )}
                </div>
                <div aria-label={`${review.rating} / 5`} style={{ display: 'flex', gap: 2, direction: 'ltr', justifyContent: 'flex-end', marginBottom: review.comment ? 8 : 4 }}>
                  {[1, 2, 3, 4, 5].map((star) => <StarSvg key={star} filled={star <= review.rating} color="#F59E0B" size={14} />)}
                </div>
                {review.comment && <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.9, whiteSpace: 'pre-wrap' }}>{review.comment}</div>}
                <time dateTime={review.created_at} style={{ display: 'block', borderTop: `1px solid ${T.brd}`, marginTop: 10, paddingTop: 8, fontSize: 10.5, color: T.mut }}>
                  {isFa ? 'تاریخ ثبت: ' : 'Submitted: '}{formatPersianReviewDate(review.created_at, isFa)}
                </time>
              </article>
            );
          })}
        </div>
      ) : (
        <div style={{ background: T.card, borderRadius: T.cardRadius || 14, border: `1px solid ${T.brd}`, padding: 18, textAlign: 'center', color: T.mut, fontSize: 13, marginBottom: 20 }}>
          {isFa ? 'هنوز نظری برای این مورد ثبت نشده است. شما اولین نفر باشید!' : 'No reviews yet. Be the first to leave a review!'}
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ background: T.soft, borderRadius: T.cardRadius || 16, border: `1px solid ${T.brd}`, padding: 16, boxShadow: T.neuIn }}>
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ttl, marginBottom: 12 }}>{isFa ? 'ثبت نظر جدید' : 'Leave a Review'}</div>
        {success ? (
          <div style={{ padding: '12px 14px', background: '#10b98118', border: '1px solid #10b98144', color: '#10b981', borderRadius: 12, fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            {isFa ? 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.' : 'Your review was submitted and will appear after approval.'}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>{isFa ? 'امتیاز شما:' : 'Your Rating:'}</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button type="button" key={star} onClick={() => setRating(star)} style={{ border: 0, background: 'transparent', padding: 4, cursor: 'pointer' }}>
                    <StarSvg filled={star <= rating} color="#F59E0B" size={24} />
                  </button>
                ))}
              </div>
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
