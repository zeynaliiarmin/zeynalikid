import React, { useState, useEffect } from 'react';
import {
  UserQuestion,
  fetchUserQuestions,
  answerUserQuestion,
  archiveUserQuestion,
  deleteUserQuestion,
} from '../lib/supabase';

export default function UserQuestionsEditor({ app }: { app: any }) {
  const { T, S, AdminBtn, Box } = app;
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);

  const loadQuestions = async () => {
    setLoading(true);
    try {
      const data = await fetchUserQuestions('all');
      setQuestions(data || []);
      const ansMap: Record<number, string> = {};
      (data || []).forEach((q) => {
        ansMap[q.id] = q.answer || '';
      });
      setAnswers(ansMap);
    } catch (e) {
      console.error('Failed loading user questions:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadQuestions();
  }, []);

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const archivedCount = questions.filter((q) => q.status === 'archived').length;

  const filtered = questions
    .filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        return (
          q.question.toLowerCase().includes(kw) ||
          (q.answer && q.answer.toLowerCase().includes(kw)) ||
          (q.page_source && q.page_source.toLowerCase().includes(kw))
        );
      }
      return true;
    })
    .sort((a, b) => {
      const ta = new Date(a.created_at).getTime();
      const tb = new Date(b.created_at).getTime();
      return sortOrder === 'newest' ? tb - ta : ta - tb;
    });

  const pageSize = 20;
  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleAnswerSubmit = async (q: UserQuestion) => {
    const ansText = answers[q.id] || '';
    if (!ansText.trim()) {
      alert('لطفاً متن پاسخ را وارد کنید.');
      return;
    }
    await answerUserQuestion(q.id, ansText.trim());
    await loadQuestions();
    alert('پاسخ با موفقیت ثبت شد.');
  };

  const handleArchive = async (id: number) => {
    await archiveUserQuestion(id);
    await loadQuestions();
  };

  const handleDelete = async (id: number) => {
    if (!confirm('آیا از حذف این سؤال اطمینان دارید؟')) return;
    await deleteUserQuestion(id);
    await loadQuestions();
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'pending') {
      return { background: '#FEF3C7', color: '#92400E', borderRadius: 6, padding: '2px 8px', fontSize: 11 };
    }
    if (status === 'answered') {
      return { background: '#D1FAE5', color: '#065F46', borderRadius: 6, padding: '2px 8px', fontSize: 11 };
    }
    return { background: T.inp, color: T.mut, borderRadius: 6, padding: '2px 8px', fontSize: 11 };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending') return 'در انتظار پاسخ';
    if (status === 'answered') return 'پاسخ داده‌شده';
    return 'بایگانی‌شده';
  };

  const fmtDate = (dString?: string) => {
    if (!dString) return '—';
    try {
      return new Date(dString).toLocaleDateString('fa-IR');
    } catch {
      return dString;
    }
  };

  return (
    <div>
      <Box title="مدیریت سوالات کاربران (Ask a Question)">
        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { id: 'all', label: `همه (${questions.length})` },
            { id: 'pending', label: `در انتظار (${pendingCount})` },
            { id: 'answered', label: `پاسخ‌داده‌شده (${answeredCount})` },
            { id: 'archived', label: `بایگانی (${archivedCount})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id as any);
                setPage(1);
              }}
              style={{
                padding: '8px 14px',
                borderRadius: T.btnRadius || 12,
                border: `1px solid ${statusFilter === tab.id ? T.acc : T.brd}`,
                background: statusFilter === tab.id ? `${T.acc}15` : T.card,
                color: statusFilter === tab.id ? T.acc : T.txt,
                fontWeight: 700,
                fontSize: 13,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search and Sort */}
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(200px, 1fr) 180px', gap: 10, marginBottom: 16 }}>
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="جستجو در متن سؤال یا پاسخ..."
            style={S.inp}
          />
          <select
            value={sortOrder}
            onChange={(e) => {
              setSortOrder(e.target.value as any);
              setPage(1);
            }}
            style={S.inp}
          >
            <option value="newest">جدیدترین اول</option>
            <option value="oldest">قدیمی‌ترین اول</option>
          </select>
        </div>

        {/* Question List */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 24, color: T.mut, fontSize: 14 }}>در حال بارگذاری سؤالات...</div>
        ) : paginated.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 32, color: T.mut, fontSize: 14 }}>هیچ سؤالی در این وضعیت یافت نشد.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {paginated.map((q) => (
              <div
                key={q.id}
                style={{
                  background: T.card,
                  border: `1px solid ${T.brd}`,
                  borderRadius: T.cardRadius || 14,
                  padding: 16,
                  boxShadow: T.neuOut,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={getStatusBadgeStyle(q.status)}>{getStatusLabel(q.status)}</span>
                      <span style={{ fontSize: 11, color: T.mut }}>تاریخ: {fmtDate(q.created_at)}</span>
                      <span style={{ fontSize: 11, color: T.mut }}>صفحه مبدأ: <b>{q.page_source || '—'}</b></span>
                    </div>
                    <div style={{ fontSize: 15, fontWeight: 800, color: T.txt, lineHeight: 1.7 }}>
                      {q.question}
                    </div>
                  </div>
                </div>

                {/* Voice note preview */}
                {q.voice_note_url && (
                  <div style={{ margin: '8px 0 12px', background: T.soft, padding: 10, borderRadius: 10 }}>
                    <div style={{ fontSize: 12, color: T.mut, marginBottom: 4 }}>یادداشت صوتی کاربر:</div>
                    <audio controls src={q.voice_note_url} style={{ width: '100%' }} />
                  </div>
                )}

                {/* Answer Field */}
                <div style={{ marginTop: 12 }}>
                  <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 6, fontWeight: 700 }}>
                    پاسخ مشاور / ادمین:
                  </label>
                  <textarea
                    rows={3}
                    style={{ ...S.ta, minHeight: 70 }}
                    value={answers[q.id] || ''}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                    placeholder="متن پاسخ خود را اینجا بنویسید..."
                  />
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  <button
                    type="button"
                    style={{ ...AdminBtn(), background: T.acc, color: '#fff', border: 0 }}
                    onClick={() => handleAnswerSubmit(q)}
                  >
                    ثبت پاسخ
                  </button>
                  {q.status !== 'archived' && (
                    <button
                      type="button"
                      style={AdminBtn()}
                      onClick={() => handleArchive(q.id)}
                    >
                      بایگانی
                    </button>
                  )}
                  <button
                    type="button"
                    style={{ ...AdminBtn(), color: T.err, border: `1px solid ${T.err}33`, background: `${T.err}10` }}
                    onClick={() => handleDelete(q.id)}
                  >
                    حذف
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 18 }}>
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              style={AdminBtn()}
            >
              قبلی
            </button>
            <span style={{ fontSize: 13, color: T.mut }}>
              صفحه {currentPage} از {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              style={AdminBtn()}
            >
              بعدی
            </button>
          </div>
        )}
      </Box>
    </div>
  );
}
