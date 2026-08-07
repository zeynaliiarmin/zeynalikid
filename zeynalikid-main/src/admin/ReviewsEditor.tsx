import React, { useState, useEffect } from 'react';
import {
  ReviewItem,
  fetchReviews,
  approveReview,
  rejectReview,
  deleteReview,
} from '../lib/supabase';

export default function ReviewsEditor({ app }: { app: any }) {
  const { T, S, AdminBtn, Box } = app;
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await fetchReviews('all');
      setReviews(data || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filtered = reviews.filter((r) => statusFilter === 'all' || r.status === statusFilter);

  const getStatusBadge = (status: string) => {
    if (status === 'approved') return { background: '#D1FAE5', color: '#065F46', label: 'تأییدشده' };
    if (status === 'rejected') return { background: '#FEE2E2', color: '#991B1B', label: 'ردشده' };
    return { background: '#FEF3C7', color: '#92400E', label: 'در انتظار' };
  };

  return (
    <Box title="مدیریت نظرات والدین و دوره‌ها">
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {[
          { id: 'all', label: `همه (${reviews.length})` },
          { id: 'pending', label: `در انتظار (${reviews.filter((r) => r.status === 'pending').length})` },
          { id: 'approved', label: `تأییدشده (${reviews.filter((r) => r.status === 'approved').length})` },
          { id: 'rejected', label: `ردشده (${reviews.filter((r) => r.status === 'rejected').length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id as any)}
            style={{
              padding: '8px 14px',
              borderRadius: T.btnRadius || 12,
              border: `1px solid ${statusFilter === tab.id ? T.acc : T.brd}`,
              background: statusFilter === tab.id ? `${T.acc}15` : T.card,
              color: statusFilter === tab.id ? T.acc : T.txt,
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: 24, color: T.mut }}>در حال بارگذاری نظرات...</div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 32, color: T.mut }}>هیچ نظری یافت نشد.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {filtered.map((r) => {
            const st = getStatusBadge(r.status);
            return (
              <div
                key={r.id}
                style={{
                  background: T.card,
                  borderRadius: T.cardRadius || 14,
                  border: `1px solid ${T.brd}`,
                  padding: 16,
                  boxShadow: T.neuOut,
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div>
                    <span style={{ fontSize: 14, fontWeight: 800, color: T.txt }}>{r.reviewer_name}</span>
                    <span style={{ fontSize: 12, color: T.mut, marginInlineStart: 8 }}>
                      دوره: {r.course_id || 'عمومی'} • امتیاز: {r.rating} / ۵
                    </span>
                  </div>
                  <span style={{ ...st, padding: '2px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700 }}>
                    {st.label}
                  </span>
                </div>
                {r.comment && (
                  <div style={{ fontSize: 13, color: T.mut, marginBottom: 12, whiteSpace: 'pre-wrap' }}>
                    {r.comment}
                  </div>
                )}
                <div style={{ display: 'flex', gap: 8 }}>
                  {r.status !== 'approved' && (
                    <button
                      type="button"
                      style={{ ...AdminBtn(), background: T.ok, color: '#fff', border: 0 }}
                      onClick={async () => {
                        await approveReview(r.id);
                        load();
                      }}
                    >
                      تأیید
                    </button>
                  )}
                  {r.status !== 'rejected' && (
                    <button
                      type="button"
                      style={{ ...AdminBtn(), background: T.warn, color: '#fff', border: 0 }}
                      onClick={async () => {
                        await rejectReview(r.id);
                        load();
                      }}
                    >
                      رد
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ ...AdminBtn(), color: T.err, border: `1px solid ${T.err}33`, background: `${T.err}10` }}
                    onClick={async () => {
                      if (confirm('حذف شود؟')) {
                        await deleteReview(r.id);
                        load();
                      }
                    }}
                  >
                    حذف
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Box>
  );
}
