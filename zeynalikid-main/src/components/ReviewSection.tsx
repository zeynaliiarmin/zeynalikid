import React, { useState, useEffect } from 'react';
import { ReviewItem, fetchReviews, submitReview } from '../lib/supabase';

export interface ReviewSectionProps {
  T: any;
  lang: 'fa' | 'en';
  courseId?: string;
  placement?: string; // 'home' | 'courses' | 'course_detail' | 'consultation' | 'faq' | 'about' | 'track'
}

const StarSvg = ({
  filled,
  color = 'var(--zk-primary)',
  size = 16,
}: {
  filled: boolean;
  color?: string;
  size?: number;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill={filled ? color : 'none'}
    stroke={color}
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    style={{ display: 'inline-block', verticalAlign: 'middle', flexShrink: 0 }}
  >
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export default function ReviewSection({ T, lang, courseId, placement = 'course_detail' }: ReviewSectionProps) {
  const isFa = lang === 'fa';
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [comment, setComment] = useState('');
  const [rating, setRating] = useState(5);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  // نرمال‌سازی شماره موبایل ایرانی (پشتیبانی از ارقام فارسی/عربی و +98)
  const normalizePhone = (raw: string): string => {
    let d = raw.replace(/[۰-۹]/g, (c) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(c).toString())
      .replace(/[٠-٩]/g, (c) => '٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString())
      .replace(/[\s\-().]/g, '');
    if (d.startsWith('0098')) d = '0' + d.slice(4);
    else if (d.startsWith('+98')) d = '0' + d.slice(3);
    else if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2);
    return d;
  };

  useEffect(() => {
    let active = true;
    const load = async () => {
      try {
        const list = await fetchReviews('approved');
        if (!active) return;
        const filtered = (list || []).filter((r) => {
          // فیلتر دوره‌های خاص: اگر course_ids تنظیم شده باشد، نظر فقط در همان دوره‌ها نمایش داده می‌شود
          const cids: string[] = Array.isArray((r as any).course_ids) ? (r as any).course_ids : [];
          if (cids.length > 0) {
            const onThisCourse = cids.includes(courseId || '') || cids.includes('عمومی') || cids.includes('all');
            if (!onThisCourse) return false;
          } else {
            if (courseId && r.course_id && r.course_id !== 'عمومی' && r.course_id !== courseId) {
              return false;
            }
          }
          if (placement) {
            const places = r.placements || ['course_detail', 'courses', 'home'];
            if (!places.includes(placement) && !places.includes('all_places')) {
              return false;
            }
          }
          return true;
        });
        setReviews(filtered);
      } catch (e) {
        console.error('load reviews error:', e);
      }
    };
    load();
    return () => {
      active = false;
    };
  }, [courseId, placement]);

  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
      : '۵.۰';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || submitting) return;
    // شماره تماس برای ثبت نظر در سایت الزامی است (فقط برای پنل ادمین؛ هنگام پخش از نظر حذف می‌شود)
    const normPhone = normalizePhone(phone);
    if (!/^09\d{9}$/.test(normPhone)) {
      alert(isFa ? 'لطفاً شماره تماس معتبر وارد کنید (مثال: 09123456789).' : 'Please enter a valid phone number.');
      return;
    }
    setSubmitting(true);
    try {
      await submitReview(courseId || 'عمومی', name.trim(), rating, comment.trim(), [
        placement || 'course_detail',
        'courses',
        'home',
      ], normPhone);
      setName('');
      setPhone('');
      setComment('');
      setRating(5);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 5000);
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ marginTop: 24 }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 16,
          flexWrap: 'wrap',
          gap: 10,
        }}
      >
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 800, color: T.ttl, margin: 0 }}>
            {isFa ? 'نظرات والدین و کاربران' : 'Parent & User Reviews'}
          </h3>
          <div style={{ fontSize: 12, color: T.mut, marginTop: 4 }}>
            {isFa
              ? `میانگین امتیاز ${avgRating} از ۵ • (${reviews.length} نظر ثبت‌شده)`
              : `Average rating ${avgRating} / 5 • (${reviews.length} reviews)`}
          </div>
        </div>
      </div>

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {reviews.map((r) => (
            <div
              key={r.id}
              style={{
                background: T.card,
                borderRadius: T.cardRadius || 14,
                border: `1px solid ${T.brd}`,
                padding: 14,
                boxShadow: T.neuOut,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 6,
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 800, color: T.txt }}>
                  {r.reviewer_name}
                </span>
                <div style={{ display: 'flex', gap: 2 }}>
                  {[1, 2, 3, 4, 5].map((st) => (
                    <StarSvg key={st} filled={st <= r.rating} color="#F59E0B" size={14} />
                  ))}
                </div>
              </div>
              {r.comment && (
                <div style={{ fontSize: 13, color: T.mut, lineHeight: 1.8, whiteSpace: 'pre-wrap' }}>
                  {r.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div
          style={{
            background: T.card,
            borderRadius: T.cardRadius || 14,
            border: `1px solid ${T.brd}`,
            padding: 18,
            textAlign: 'center',
            color: T.mut,
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          {isFa
            ? 'هنوز نظری برای این دوره ثبت نشده است. شما اولین نفر باشید!'
            : 'No reviews yet. Be the first to leave a review!'}
        </div>
      )}

      {/* Review Submission Form */}
      <form
        onSubmit={handleSubmit}
        style={{
          background: T.soft,
          borderRadius: T.cardRadius || 16,
          border: `1px solid ${T.brd}`,
          padding: 16,
          boxShadow: T.neuIn,
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 800, color: T.ttl, marginBottom: 12 }}>
          {isFa ? 'ثبت نظر جدید' : 'Leave a Review'}
        </div>

        {success ? (
          <div
            style={{
              padding: '12px 14px',
              background: '#10b98118',
              border: '1px solid #10b98144',
              color: '#10b981',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              textAlign: 'center',
            }}
          >
            {isFa
              ? 'نظر شما ثبت شد و پس از تأیید نمایش داده می‌شود.'
              : 'Your review was submitted and will appear after approval.'}
          </div>
        ) : (
          <>
            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>
                {isFa ? 'امتیاز شما:' : 'Your Rating:'}
              </label>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1, 2, 3, 4, 5].map((st) => (
                  <button
                    type="button"
                    key={st}
                    onClick={() => setRating(st)}
                    style={{
                      border: 0,
                      background: 'transparent',
                      padding: 4,
                      cursor: 'pointer',
                    }}
                  >
                    <StarSvg filled={st <= rating} color="#F59E0B" size={24} />
                  </button>
                ))}
              </div>
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>
                {isFa ? 'نام و نام خانوادگی' : 'Your Name'} *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={isFa ? 'نام شما...' : 'Enter your name...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: T.inputRadius || 10,
                  border: `1px solid ${T.brd}`,
                  background: T.inp,
                  color: T.txt,
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>
                {isFa ? 'شماره تماس' : 'Phone Number'} *
              </label>
              <input
                type="tel"
                inputMode="numeric"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder={isFa ? '09123456789' : '09123456789'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: T.inputRadius || 10,
                  border: `1px solid ${T.brd}`,
                  background: T.inp,
                  color: T.txt,
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  direction: 'ltr',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                }}
              />
              <small style={{ display: 'block', fontSize: 10.5, color: T.mut, marginTop: 3 }}>
                {isFa ? 'شماره شما فقط در پنل مدیریت دیده می‌شود و در سایت نمایش داده نمی‌شود.' : 'Your number is only visible to admins and never published.'}
              </small>
            </div>

            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 5, fontWeight: 700 }}>
                {isFa ? 'متن نظر' : 'Comment'}
              </label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder={isFa ? 'نظر یا تجربه خود را بنویسید...' : 'Write your comment...'}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  borderRadius: T.inputRadius || 10,
                  border: `1px solid ${T.brd}`,
                  background: T.inp,
                  color: T.txt,
                  fontSize: 14,
                  outline: 'none',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            <button
              type="submit"
              disabled={!name.trim() || submitting}
              style={{
                padding: '12px 24px',
                borderRadius: T.btnRadius || 12,
                border: 0,
                background: !name.trim() || submitting ? T.brd : T.grad || T.acc,
                color: !name.trim() || submitting ? T.mut : '#fff',
                fontWeight: 800,
                fontSize: 14,
                cursor: !name.trim() || submitting ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {submitting
                ? isFa
                  ? 'در حال ارسال...'
                  : 'Submitting...'
                : isFa
                ? 'ارسال نظر'
                : 'Submit Review'}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
