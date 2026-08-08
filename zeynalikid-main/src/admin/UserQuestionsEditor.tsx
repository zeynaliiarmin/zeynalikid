import React, { useState, useEffect, useMemo } from 'react';
import {
  UserQuestion,
  fetchUserQuestions,
  answerUserQuestion,
  archiveUserQuestion,
  deleteUserQuestion,
} from '../lib/supabase';

export default function UserQuestionsEditor({ app }: { app: any }) {
  const { T, S, AdminBtn, Box, cfg, saveCfg, setEditCfg } = app;
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered' | 'archived'>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');

  // مودال افزودن به سوالات متداول
  const [faqModalItem, setFaqModalItem] = useState<{
    sourceQId?: number;
    questionFa: string;
    answerFa: string;
    questionEn: string;
    answerEn: string;
    category: string;
    showInHome: boolean;
  } | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  };

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

  const extractPhone = (q: UserQuestion): string => {
    if (q.phone) return q.phone;
    const match = (q.question || '').match(/\[شماره تماس:\s*([^\]]+)\]/);
    return match ? match[1].trim() : '';
  };

  const extractCleanText = (q: UserQuestion): string => {
    const cleaned = (q.question || '')
      .replace(/\[شماره تماس:\s*[^\]]+\]\s*/g, '')
      .trim();
    return cleaned || 'درخواست تماس تلفنی جهت پاسخ به سؤال';
  };

  const pendingCount = questions.filter((q) => q.status === 'pending').length;
  const answeredCount = questions.filter((q) => q.status === 'answered').length;
  const archivedCount = questions.filter((q) => q.status === 'archived').length;

  const filtered = questions
    .filter((q) => {
      if (statusFilter !== 'all' && q.status !== statusFilter) return false;
      if (search.trim()) {
        const kw = search.trim().toLowerCase();
        const phone = extractPhone(q).toLowerCase();
        return (
          q.question.toLowerCase().includes(kw) ||
          phone.includes(kw) ||
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
    showToast('پاسخ با موفقیت ثبت شد.');
  };

  const handleArchive = async (id: number) => {
    await archiveUserQuestion(id);
    await loadQuestions();
    showToast('سؤال با موفقیت بایگانی شد.');
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف کامل این سؤال اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) return;
    try {
      await deleteUserQuestion(id);
      await loadQuestions();
      showToast('سؤال با موفقیت حذف شد.');
    } catch (e) {
      console.error('Delete question fail:', e);
      alert('خطایی در حذف سؤال رخ داد.');
    }
  };

  // باز کردن مودال افزودن به سوالات متداول
  const handleOpenAddToFAQ = (q: UserQuestion) => {
    const cleanQ = extractCleanText(q);
    const existingAns = answers[q.id] || q.answer || '';
    setFaqModalItem({
      sourceQId: q.id,
      questionFa: cleanQ === 'درخواست تماس تلفنی جهت پاسخ به سؤال' ? '' : cleanQ,
      answerFa: existingAns,
      questionEn: q.question_en || '',
      answerEn: q.answer_en || '',
      category: q.page_source === 'education' ? 'آموزش و رشد' : 'رشد قد و تغذیه',
      showInHome: true,
    });
  };

  // ذخیره و انتشار مستقیم در سوالات متداول
  const handleSaveToFAQ = () => {
    if (!faqModalItem) return;
    if (!faqModalItem.questionFa.trim()) {
      alert('لطفاً متن سوال فارسی را وارد فرمایید.');
      return;
    }
    if (!faqModalItem.answerFa.trim()) {
      alert('لطفاً متن پاسخ فارسی را وارد فرمایید.');
      return;
    }

    try {
      const currentCfg = cfg || {};
      const curFaList: any[] = Array.isArray(currentCfg.faqItems) ? [...currentCfg.faqItems] : [];
      const curEnList: any[] = Array.isArray(currentCfg.faqItemsEn) ? [...currentCfg.faqItemsEn] : [];

      const newFaqId = 'faq_' + Date.now();
      const newFaItem = {
        id: newFaqId,
        question: faqModalItem.questionFa.trim(),
        answer: faqModalItem.answerFa.trim(),
        category: faqModalItem.category || 'عمومی',
      };

      curFaList.unshift(newFaItem);

      if (faqModalItem.questionEn.trim() && faqModalItem.answerEn.trim()) {
        curEnList.unshift({
          id: newFaqId + '_en',
          question: faqModalItem.questionEn.trim(),
          answer: faqModalItem.answerEn.trim(),
          category: faqModalItem.category || 'General',
        });
      }

      const updatedCfg = {
        ...currentCfg,
        faqItems: curFaList,
        faqItemsEn: curEnList,
      };

      if (saveCfg) {
        saveCfg(updatedCfg);
      }
      if (setEditCfg) {
        setEditCfg(updatedCfg);
      }

      // وضعیت سوال را به answered تغییر بده
      if (faqModalItem.sourceQId) {
        answerUserQuestion(faqModalItem.sourceQId, faqModalItem.answerFa.trim()).catch(() => {});
        loadQuestions();
      }

      setFaqModalItem(null);
      showToast('با موفقیت به سوالات متداول (FAQ) اضافه و منتشر شد!');
    } catch (err) {
      console.error('Error saving to FAQ:', err);
      alert('خطایی در افزودن به سوالات متداول رخ داد.');
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'pending') {
      return { background: '#FEF3C7', color: '#92400E', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 };
    }
    if (status === 'answered') {
      return { background: '#D1FAE5', color: '#065F46', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 };
    }
    return { background: T.inp || '#F3F4F6', color: T.mut || '#6B7280', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 };
  };

  const getStatusLabel = (status: string) => {
    if (status === 'pending') return 'در انتظار پاسخ';
    if (status === 'answered') return 'پاسخ داده‌شده';
    return 'بایگانی‌شده';
  };

  const fmtDate = (dString?: string) => {
    if (!dString) return '—';
    try {
      const d = new Date(dString);
      return `${d.toLocaleDateString('fa-IR')} ساعت ${d.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' })}`;
    } catch {
      return dString;
    }
  };

  return (
    <div>
      <Box title="مدیریت سوالات و درخواست‌های مخاطبین (سوال دارم)">
        {/* Toast feedback */}
        {toastMsg && (
          <div
            style={{
              padding: '10px 16px',
              background: '#ecfdf5',
              border: '1px solid #10b981',
              color: '#047857',
              borderRadius: 12,
              fontSize: 13,
              fontWeight: 700,
              marginBottom: 14,
              animation: 'fade .25s ease both',
            }}
          >
            ✓ {toastMsg}
          </div>
        )}

        {/* Status Filter Tabs */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14 }}>
          {[
            { id: 'all', label: `همه سوالات (${questions.length})` },
            { id: 'pending', label: `در انتظار پاسخ (${pendingCount})` },
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
                border: `1px solid ${statusFilter === tab.id ? (T.acc || '#0F766E') : (T.brd || '#E5E0D8')}`,
                background: statusFilter === tab.id ? `${T.acc || '#0F766E'}15` : (T.card || '#fff'),
                color: statusFilter === tab.id ? (T.acc || '#0F766E') : (T.txt || '#1F2937'),
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
            placeholder="جستجو در متن سؤال، شماره تماس یا پاسخ..."
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
            {paginated.map((q) => {
              const phone = extractPhone(q);
              const cleanText = extractCleanText(q);
              const isCallbackOnly = cleanText === 'درخواست تماس تلفنی جهت پاسخ به سؤال' || cleanText === 'درخواست تماس تلفنی';

              return (
                <div
                  key={q.id}
                  style={{
                    background: T.card || '#fff',
                    border: `1px solid ${T.brd || '#E5E0D8'}`,
                    borderRadius: T.cardRadius || 14,
                    padding: 16,
                    boxShadow: T.neuOut || '0 4px 15px rgba(0,0,0,0.06)',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        <span style={getStatusBadgeStyle(q.status)}>{getStatusLabel(q.status)}</span>

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: '#e0f2fe',
                              color: '#0369a1',
                              border: '1px solid #bae6fd',
                              borderRadius: 8,
                              padding: '3px 10px',
                              fontSize: 12.5,
                              fontWeight: 800,
                              textDecoration: 'none',
                              direction: 'ltr',
                            }}
                          >
                            <span>📞 {phone}</span>
                            <span style={{ fontSize: 11, color: '#0284c7' }}>(تماس مستقیم)</span>
                          </a>
                        )}

                        <span style={{ fontSize: 11, color: T.mut }}>تاریخ: {fmtDate(q.created_at)}</span>
                        <span style={{ fontSize: 11, color: T.mut }}>صفحه مبدأ: <b>{q.page_source || '—'}</b></span>
                      </div>

                      <div
                        style={{
                          fontSize: 15,
                          fontWeight: isCallbackOnly ? 700 : 800,
                          color: isCallbackOnly ? T.mut : T.txt,
                          lineHeight: 1.7,
                          background: isCallbackOnly ? (T.soft || '#CCFBF1') : 'transparent',
                          padding: isCallbackOnly ? '8px 12px' : 0,
                          borderRadius: isCallbackOnly ? 10 : 0,
                          display: isCallbackOnly ? 'inline-block' : 'block',
                        }}
                      >
                        {isCallbackOnly ? '🔔 درخواست تماس تلفنی کارشناس با شماره بالا جهت پاسخ و راهنمایی' : cleanText}
                      </div>
                    </div>
                  </div>

                  {/* Voice note preview */}
                  {q.voice_note_url && (
                    <div style={{ margin: '8px 0 12px', background: T.soft || '#CCFBF1', padding: 10, borderRadius: 10 }}>
                      <div style={{ fontSize: 12, color: T.mut, marginBottom: 4, fontWeight: 700 }}>یادداشت صوتی ارسالی کاربر:</div>
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
                  <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    <button
                      type="button"
                      style={{ ...AdminBtn(), background: T.acc || '#0F766E', color: '#fff', border: 0 }}
                      onClick={() => handleAnswerSubmit(q)}
                    >
                      ثبت پاسخ
                    </button>

                    {/* دکمه افزودن به سوالات متداول با تمام جزئیات */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        background: '#f0fdf4',
                        color: '#16a34a',
                        border: '1px solid #bbf7d0',
                        fontWeight: 700,
                      }}
                      onClick={() => handleOpenAddToFAQ(q)}
                      title="تبدیل این سوال به پرسش متداول و انتشار در سایت"
                    >
                      ★ افزودن به سوالات متداول (FAQ)
                    </button>

                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        style={{
                          ...AdminBtn(),
                          background: '#0284c7',
                          color: '#fff',
                          border: 0,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        تماس تلفنی با کاربر
                      </a>
                    )}

                    {q.status !== 'archived' && (
                      <button
                        type="button"
                        style={AdminBtn()}
                        onClick={() => handleArchive(q.id)}
                      >
                        بایگانی
                      </button>
                    )}

                    {/* دکمه حذف سوال */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        color: T.err || '#DC2626',
                        border: `1px solid ${(T.err || '#DC2626')}33`,
                        background: `${(T.err || '#DC2626')}10`,
                      }}
                      onClick={() => handleDelete(q.id)}
                      title="حذف کامل این سؤال"
                    >
                      حذف سوال ✕
                    </button>
                  </div>
                </div>
              );
            })}
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

      {/* مودال جامع افزودن به سوالات متداول با تمام جزئیات */}
      {faqModalItem && (
        <div
          onMouseDown={(e) => {
            if (e.currentTarget === e.target) setFaqModalItem(null);
          }}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9900,
            background: 'rgba(15, 30, 45, 0.6)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            animation: 'fade .25s ease both',
          }}
        >
          <div
            style={{
              width: '100%',
              maxWidth: 580,
              maxHeight: '90vh',
              overflowY: 'auto',
              background: T.card || '#fff',
              border: `1px solid ${T.brd || '#E5E0D8'}`,
              borderRadius: T.cardRadius || 20,
              padding: 22,
              boxShadow: T.shadowStrong || '0 24px 60px rgba(0,0,0,.22)',
              animation: 'modalIn .25s ease both',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: 16,
                borderBottom: `1px solid ${T.brd || '#E5E0D8'}`,
                paddingBottom: 12,
              }}
            >
              <div>
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: T.ttl || '#0F766E' }}>
                  ★ افزودن به سوالات متداول (FAQ)
                </h3>
                <p style={{ margin: '4px 0 0', fontSize: 12, color: T.mut || '#6B7280' }}>
                  انتشار این پرسش و پاسخ در صفحه سوالات متداول و صفحه اصلی سایت
                </p>
              </div>
              <button
                type="button"
                onClick={() => setFaqModalItem(null)}
                style={{
                  width: 34,
                  height: 34,
                  borderRadius: 10,
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  background: T.soft || '#CCFBF1',
                  color: T.acc || '#0F766E',
                  cursor: 'pointer',
                  fontSize: 18,
                  fontFamily: 'inherit',
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* فیلد سوال فارسی */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  متن سؤال (فارسی) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <input
                  type="text"
                  style={S.inp}
                  value={faqModalItem.questionFa}
                  onChange={(e) => setFaqModalItem({ ...faqModalItem, questionFa: e.target.value })}
                  placeholder="مثال: آیا مکمل‌های رشد برای کودک ۷ ساله عوارضی ندارند؟"
                />
              </div>

              {/* فیلد پاسخ فارسی */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  متن پاسخ (فارسی) <span style={{ color: '#DC2626' }}>*</span>
                </label>
                <textarea
                  rows={4}
                  style={{ ...S.ta, minHeight: 90 }}
                  value={faqModalItem.answerFa}
                  onChange={(e) => setFaqModalItem({ ...faqModalItem, answerFa: e.target.value })}
                  placeholder="پاسخ کامل، علمی و همراه با آرامش برای نمایش به تمامی والدین..."
                />
              </div>

              {/* دسته‌بندی موضوعی */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  دسته‌بندی موضوعی سؤال
                </label>
                <select
                  style={S.inp}
                  value={faqModalItem.category}
                  onChange={(e) => setFaqModalItem({ ...faqModalItem, category: e.target.value })}
                >
                  <option value="رشد قد و استخوان‌بندی">رشد قد و استخوان‌بندی</option>
                  <option value="بی‌اشتهایی و وزن‌گیری">بی‌اشتهایی و وزن‌گیری</option>
                  <option value="هوش، تمرکز و یادگیری">هوش، تمرکز و یادگیری</option>
                  <option value="آموزش و دوره‌ها">آموزش و دوره‌ها</option>
                  <option value="ارسال، بسته‌بندی و پیگیری">ارسال، بسته‌بندی و پیگیری</option>
                  <option value="عمومی">عمومی</option>
                </select>
              </div>

              {/* ترجمه انگلیسی اختیاری */}
              <details style={{ background: T.soft || '#CCFBF1', padding: 10, borderRadius: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color: T.acc }}>
                  + افزودن ترجمه انگلیسی (Optional English Version)
                </summary>
                <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.txt, marginBottom: 4 }}>
                      Question (English)
                    </label>
                    <input
                      dir="ltr"
                      type="text"
                      style={S.inp}
                      value={faqModalItem.questionEn}
                      onChange={(e) => setFaqModalItem({ ...faqModalItem, questionEn: e.target.value })}
                      placeholder="e.g., Are growth supplements safe for 7-year-olds?"
                    />
                  </div>
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.txt, marginBottom: 4 }}>
                      Answer (English)
                    </label>
                    <textarea
                      dir="ltr"
                      rows={3}
                      style={{ ...S.ta, minHeight: 70 }}
                      value={faqModalItem.answerEn}
                      onChange={(e) => setFaqModalItem({ ...faqModalItem, answerEn: e.target.value })}
                      placeholder="Comprehensive and clear answer in English..."
                    />
                  </div>
                </div>
              </details>

              {/* دکمه‌های اقدام */}
              <div style={{ display: 'flex', gap: 10, marginTop: 14 }}>
                <button
                  type="button"
                  onClick={handleSaveToFAQ}
                  style={{
                    flex: 1,
                    minHeight: 46,
                    borderRadius: T.btnRadius || 12,
                    border: 0,
                    background: T.grad || T.acc || '#0F766E',
                    color: '#fff',
                    fontSize: 14.5,
                    fontWeight: 800,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  ذخیره و انتشار در سوالات متداول
                </button>
                <button
                  type="button"
                  onClick={() => setFaqModalItem(null)}
                  style={{
                    padding: '0 20px',
                    minHeight: 46,
                    borderRadius: T.btnRadius || 12,
                    border: `1px solid ${T.brd || '#E5E0D8'}`,
                    background: T.card || '#fff',
                    color: T.mut || '#6B7280',
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  انصراف
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
