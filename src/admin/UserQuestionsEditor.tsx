import React, { useState, useEffect } from 'react';
import {
  UserQuestion,
  fetchUserQuestions,
  answerUserQuestion,
  archiveUserQuestion,
  deleteUserQuestion,
} from '../lib/supabase';
import FAQManagementEditor from './FAQManagementEditor';
import { adminGetSignedUrls } from '../lib/adminApi';
import { zkAlert, zkConfirm } from '../components/ZkDialog';

// فیلد پاسخ — کامپوننت جدا با state محلی تا تایپ باعث re-render کل لیست نشود (رفع fg)
const AnswerField = React.memo(function AnswerField({ initial, onCommit, T, S }: { initial: string; onCommit: (v: string) => void; T: any; S: any }) {
  const [val, setVal] = React.useState(initial);
  React.useEffect(() => { setVal(initial); }, [initial]);
  return (
    <div style={{ marginTop: 12 }}>
      <label style={{ display: 'block', fontSize: 12, color: T.mut, marginBottom: 6, fontWeight: 700 }}>
        پاسخ مشاور / ادمین:
      </label>
      <textarea
        rows={3}
        style={{ ...S.ta, minHeight: 70 }}
        value={val}
        onChange={(e) => setVal(e.target.value)}
        onBlur={() => { if (val !== initial) onCommit(val); }}
        placeholder="متن پاسخ خود را اینجا بنویسید..."
      />
    </div>
  );
});

export default function UserQuestionsEditor({ app }: { app: any }) {
  const { T, S, AdminBtn, Box, cfg, saveCfg, setEditCfg } = app;
  const [questions, setQuestions] = useState<UserQuestion[]>([]);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');
  const [search, setSearch] = useState('');
  const [sortOrder, setSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [page, setPage] = useState(1);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [toastMsg, setToastMsg] = useState('');
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [signedVoiceMap,setSignedVoiceMap]=useState<Record<string,string>>({});

  // Private voice notes are rendered only through short-lived signed URLs.
  useEffect(()=>{
    const urls=questions.map(q=>q.voice_note_url).filter((u):u is string=>!!u&&u.startsWith('http'));
    if(!urls.length){setSignedVoiceMap({});return}
    let alive=true;
    adminGetSignedUrls([...new Set(urls)]).then(map=>{if(alive)setSignedVoiceMap(map||{})}).catch(async ()=>{if(alive)setSignedVoiceMap({})});
    return()=>{alive=false};
  },[questions]);

  // Manual frequent questions (added manually by admin)
  const manualList: any[] = Array.isArray((cfg as any)?.manualUserQuestions) ? (cfg as any).manualUserQuestions : [];
  const handleAddManual = () => {
    const newItem = {
      id: 'mq_' + Date.now() + Math.random().toString(36).slice(2, 5),
      question: '',
      answer: '',
      category: 'عمومی',
      active: true,
      order: manualList.length + 1,
    };
    const updated = [...manualList, newItem];
    const nextCfg = { ...(cfg as any), manualUserQuestions: updated };
    if (setEditCfg) setEditCfg(nextCfg);
    if (saveCfg) saveCfg(nextCfg);
    showToast('سؤال دستی جدید افزوده شد — لطفاً متن را تکمیل و ذخیره کنید.');
  };
  const handleUpdateManual = (idx: number, patch: any) => {
    const a = [...manualList];
    a[idx] = { ...a[idx], ...patch };
    const nextCfg = { ...(cfg as any), manualUserQuestions: a };
    if (setEditCfg) setEditCfg(nextCfg);
  };
  const handleDeleteManual = async (idx: number) => {
    if (!(await zkConfirm('این سؤال دستی حذف شود؟'))) return;
    const a = manualList.filter((_: any, j: number) => j !== idx);
    const nextCfg = { ...(cfg as any), manualUserQuestions: a.map((x: any, i: number) => ({ ...x, order: i + 1 })) };
    if (setEditCfg) setEditCfg(nextCfg);
    if (saveCfg) saveCfg(nextCfg);
    showToast('سؤال دستی حذف شد.');
  };
  const handleMoveManual = (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= manualList.length) return;
    const a = [...manualList];
    [a[idx], a[j]] = [a[j], a[idx]];
    const reordered = a.map((x: any, i: number) => ({ ...x, order: i + 1 }));
    const nextCfg = { ...(cfg as any), manualUserQuestions: reordered };
    if (setEditCfg) setEditCfg(nextCfg);
    if (saveCfg) saveCfg(nextCfg);
  };
  const handleSaveManual = () => {
    if (saveCfg) {
      saveCfg({ ...(cfg as any), manualUserQuestions: manualList });
      showToast('سوالات دستی با موفقیت ذخیره و منتشر شد.');
    }
  };

  // مودال افزودن به سوالات متداول
  const [faqModalItem, setFaqModalItem] = useState<{
    sourceQId?: number;
    questionFa: string;
    answerFa: string;
    answerTitle: string;
    questionEn: string;
    answerEn: string;
    answerTitleEn: string;
    categories: string[];
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

  // Bulk select handlers
  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter(async (x) => x !== id) : [...prev, id]));
  };
  const handleSelectAll = () => {
    const ids = filtered.map((q) => q.id);
    setSelectedIds(ids);
    showToast(`تمام ${ids.length} سوال فیلترشده انتخاب شد.`);
  };
  const handleDeselectAll = () => {
    setSelectedIds([]);
    showToast('انتخاب همه لغو شد.');
  };
  const isAllSelected = filtered.length > 0 && filtered.every((q) => selectedIds.includes(q.id));
  const hasSomeSelected = selectedIds.length > 0;

  const handleBulkArchive = async () => {
    if (!selectedIds.length) return;
    if (!(await zkConfirm(`آیا ${selectedIds.length} سوال انتخاب‌شده بایگانی شوند؟`))) return;
    setLoading(true);
    try {
      for (const id of selectedIds) await archiveUserQuestion(id);
      await loadQuestions();
      setSelectedIds([]);
      showToast(`${selectedIds.length} سوال بایگانی شد.`);
    } finally { setLoading(false); }
  };
  const handleBulkDelete = async () => {
    if (!selectedIds.length) return;
    if (!(await zkConfirm(`آیا ${selectedIds.length} سوال انتخاب‌شده حذف شوند؟ این عمل غیرقابل بازگشت است.`))) return;
    setLoading(true);
    try {
      for (const id of selectedIds) await deleteUserQuestion(id);
      await loadQuestions();
      setSelectedIds([]);
      showToast(`${selectedIds.length} سوال حذف شد.`);
    } finally { setLoading(false); }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('آیا از حذف کامل این سؤال اطمینان دارید؟ این عملیات غیرقابل بازگشت است.')) return;
    try {
      await deleteUserQuestion(id);
      await loadQuestions();
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      showToast('سؤال با موفقیت حذف شد.');
    } catch (e) {
      console.error('Delete question fail:', e);
      void zkAlert('خطایی در حذف سؤال رخ داد.');
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
      answerTitle: 'پاسخ کارشناس',
      questionEn: q.question_en || '',
      answerEn: q.answer_en || '',
      answerTitleEn: 'Expert Answer',
      categories: [q.page_source === 'education' ? 'آموزش و رشد' : 'رشد قد و تغذیه'],
      showInHome: true,
    });
  };

  // ذخیره و انتشار مستقیم در سوالات متداول
  const handleSaveToFAQ = () => {
    if (!faqModalItem) return;
    if (!faqModalItem.questionFa.trim()) {
      void zkAlert('لطفاً متن سوال فارسی را وارد فرمایید.');
      return;
    }
    if (!faqModalItem.answerFa.trim()) {
      void zkAlert('لطفاً متن پاسخ فارسی را وارد فرمایید.');
      return;
    }

    try {
      const currentCfg = cfg || {};
      const curFaList: any[] = Array.isArray(currentCfg.faqItems) ? [...currentCfg.faqItems] : [];
      const curEnList: any[] = Array.isArray(currentCfg.faqItemsEn) ? [...currentCfg.faqItemsEn] : [];

      const newFaqId = 'faq_' + Date.now();
      const cats = Array.isArray(faqModalItem.categories) && faqModalItem.categories.length
        ? faqModalItem.categories
        : ['عمومی'];
      const newFaItem = {
        id: newFaqId,
        question: faqModalItem.questionFa.trim(),
        answer: faqModalItem.answerFa.trim(),
        answerTitle: faqModalItem.answerTitle.trim(),
        categories: cats,
        category: cats[0] || 'عمومی',
      };

      curFaList.unshift(newFaItem);

      if (faqModalItem.questionEn.trim() && faqModalItem.answerEn.trim()) {
        curEnList.unshift({
          id: newFaqId + '_en',
          question: faqModalItem.questionEn.trim(),
          answer: faqModalItem.answerEn.trim(),
          answerTitle: faqModalItem.answerTitleEn.trim(),
          categories: cats,
          category: cats[0] || 'General',
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
      void zkAlert('خطایی در افزودن به سوالات متداول رخ داد.');
    }
  };

  const getStatusBadgeStyle = (status: string) => {
    if (status === 'pending') {
      return { background: 'var(--zkad-tag-warn-bg)', color: 'var(--zkad-tag-warn-tx)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 };
    }
    if (status === 'answered') {
      return { background: 'var(--zkad-tag-ok-bg)', color: 'var(--zkad-tag-ok-tx)', borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 700 };
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
              background: 'var(--zkad-tag-ok-bg)',
              border: '1px solid var(--zkad-ok)',
              color: 'var(--zkad-tag-ok-tx)',
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

        {/* Status Filter Tabs — responsive (zkad-qu-tabs) */}
        <div className="zkad-qu-tabs" style={{ marginBottom: 14 }}>
          {[
            { id: 'all', label: `همه سوالات (${questions.length})` },
            { id: 'pending', label: `در انتظار پاسخ (${pendingCount})` },
            { id: 'answered', label: `پاسخ‌داده‌شده (${answeredCount})` },
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

        {/* Bulk Select Toolbar — responsive (zkad-qu-bulk) */}
        <div
          className="zkad-qu-bulk"
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 10,
            padding: '10px 14px',
            background: hasSomeSelected ? 'var(--zkad-tag-info-bg)' : (T.card || '#fff'),
            border: `1px solid ${hasSomeSelected ? 'var(--zkad-info)' : (T.brd || '#E5E0D8')}`,
            borderRadius: 12,
            marginBottom: 14,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', fontWeight: 800, fontSize: 13 }}>
              <input type="checkbox" checked={isAllSelected} onChange={() => (isAllSelected ? handleDeselectAll() : handleSelectAll())} style={{ width: 16, height: 16, cursor: 'pointer' }} />
              <span>{isAllSelected ? 'لغو انتخاب همه' : `انتخاب همه (${filtered.length} سوال)`}</span>
            </label>
            {hasSomeSelected && (
              <button type="button" onClick={handleDeselectAll} style={{ padding: '6px 12px', borderRadius: 8, border: `1px solid ${T.brd}`, background: 'transparent', color: T.mut, fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                لغو انتخاب
              </button>
            )}
            <span style={{ fontSize: 12, color: hasSomeSelected ? 'var(--zkad-tag-info-tx)' : T.mut }}>
              {hasSomeSelected ? `${selectedIds.length} سوال انتخاب شد` : `${filtered.length} سوال فیلترشده`}
            </span>
          </div>
          {hasSomeSelected && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleBulkArchive} style={{ ...AdminBtn(), padding: '6px 12px', background: '#92400e', color: '#fff', border: 0, fontSize: 12, fontWeight: 700 }}>
                بایگانی انتخابی ({selectedIds.length})
              </button>
              <button type="button" onClick={handleBulkDelete} style={{ ...AdminBtn(), padding: '6px 12px', background: 'var(--zkad-tag-err-bg)', color: 'var(--zkad-tag-err-tx)', border: '1px solid var(--zkad-err)', fontSize: 12, fontWeight: 700 }}>
                حذف انتخابی ({selectedIds.length})
              </button>
            </div>
          )}
        </div>

        {/* Search and Sort — responsive (zkad-qu-search) */}
        <div className="zkad-qu-search">
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
              const isSelected = selectedIds.includes(q.id);

              return (
                <div
                  key={q.id}
                  style={{
                    background: isSelected ? 'var(--zkad-selected)' : (T.card || '#fff'),
                    border: `1px solid ${isSelected ? 'var(--zkad-info)' : (T.brd || '#E5E0D8')}`,
                    borderRadius: T.cardRadius || 14,
                    padding: 16,
                    boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : (T.neuOut || '0 4px 15px rgba(0,0,0,0.06)'),
                  }}
                >
                  <div className="zkad-qu-card-top" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <div className="zkad-qu-meta" style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
                        {/* دکمه انتخاب — بدون عنوان، هم‌اندازه فیلد شماره تماس، قبل از وضعیت */}
                        <label className="zkad-qu-check" style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: isSelected ? 'var(--zkad-tag-info-bg)' : (T.soft || '#F4F1EA'), borderRadius: 8, border: `1px solid ${isSelected ? 'var(--zkad-info)' : 'transparent'}`, height: 32, minWidth: 44, padding: '0 10px' }} title={isSelected ? 'لغو انتخاب' : 'انتخاب سوال'}>
                          <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(q.id)} style={{ width: 17, height: 17, cursor: 'pointer', accentColor: T.acc || '#0F766E', margin: 0 }} />
                        </label>

                        <span style={getStatusBadgeStyle(q.status)}>{getStatusLabel(q.status)}</span>

                        {phone && (
                          <a
                            href={`tel:${phone}`}
                            className="zkad-qu-phone"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              background: 'var(--zkad-tag-info-bg)',
                              color: 'var(--zkad-tag-info-tx)',
                              border: '1px solid var(--zkad-info)',
                              borderRadius: 8,
                              padding: '3px 10px',
                              fontSize: 12.5,
                              fontWeight: 800,
                              textDecoration: 'none',
                              direction: 'ltr',
                            }}
                          >
                            <span>📞 {phone}</span>
                            <span className="zkad-qu-phone-call" style={{ fontSize: 11, color: 'inherit' }}>(تماس مستقیم)</span>
                          </a>
                        )}

                        {/* دکمه حذف سوال — فقط آیکون سطل، کنار شماره تماس */}
                        <button
                          type="button"
                          aria-label="حذف سوال"
                          title="حذف کامل این سؤال"
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: 32,
                            minWidth: 32,
                            height: 32,
                            padding: 0,
                            borderRadius: 8,
                            border: `1px solid ${(T.err || '#DC2626')}33`,
                            background: `${(T.err || '#DC2626')}10`,
                            color: T.err || '#DC2626',
                            cursor: 'pointer',
                          }}
                          onClick={() => handleDelete(q.id)}
                        >
                          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                        </button>

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
                      <audio controls src={signedVoiceMap[q.voice_note_url]||''} style={{ width: '100%' }} />
                    </div>
                  )}

                  {/* Answer Field — کامپوننت جدا (رفع fg: تایپ فقط همین فیلد را re-render می‌کند) */}
                  <AnswerField
                    initial={answers[q.id] || ''}
                    onCommit={(v: string) => setAnswers((prev: any) => ({ ...prev, [q.id]: v }))}
                    T={T} S={S}
                  />

                  {/* Action Buttons — تماس تلفنی، سپس افزودن به سوالات متداول */}
                  <div className="zkad-qu-actions" style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap', alignItems: 'center' }}>
                    {phone && (
                      <a
                        href={`tel:${phone}`}
                        style={{
                          ...AdminBtn(),
                          background: '#0369A1',
                          color: '#fff',
                          border: 0,
                          textDecoration: 'none',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        تماس تلفنی
                      </a>
                    )}

                    {/* دکمه افزودن به سوالات متداول با تمام جزئیات */}
                    <button
                      type="button"
                      style={{
                        ...AdminBtn(),
                        background: 'var(--zkad-tag-ok-bg)',
                        color: 'var(--zkad-tag-ok-tx)',
                        border: '1px solid var(--zkad-ok)',
                        fontWeight: 700,
                      }}
                      onClick={() => handleOpenAddToFAQ(q)}
                      title="تبدیل این سوال به پرسش متداول و انتشار در سایت"
                    >
                      ★ افزودن به سوالات متداول
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

      <FAQManagementEditor cfg={cfg} T={T} S={S} AdminBtn={AdminBtn} Box={Box} setEditCfg={setEditCfg} saveCfg={saveCfg} showToast={showToast} />

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
                  color:T.accText || '#0F766E',
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

              {/* عنوان پاسخ سفارشی — با همین عنوان در سایت پخش می‌شود */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  عنوان پاسخ (پیش‌فرض: «پاسخ کارشناس»)
                </label>
                <input
                  type="text"
                  style={S.inp}
                  value={faqModalItem.answerTitle}
                  onChange={(e) => setFaqModalItem({ ...faqModalItem, answerTitle: e.target.value })}
                  placeholder="مثال: پاسخ کارشناس / پاسخ دکتر زینالی / توضیح تکمیلی"
                />
                <small style={{ display: 'block', fontSize: 10.5, color: T.mut, marginTop: 4 }}>
                  این عنوان بالای متن پاسخ در سایت نمایش داده می‌شود.
                </small>
              </div>

              {/* دسته‌بندی موضوعی — چندانتخابی */}
              <div>
                <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: T.txt, marginBottom: 6 }}>
                  دسته‌بندی موضوعی سؤال (چند انتخابی)
                </label>
                <div className="zkad-qu-cats" style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['رشد قد و استخوان‌بندی','بی‌اشتهایی و وزن‌گیری','هوش، تمرکز و یادگیری','آموزش و دوره‌ها','ارسال، بسته‌بندی و پیگیری','عمومی'].map((c) => {
                    const on = Array.isArray(faqModalItem.categories) && faqModalItem.categories.includes(c);
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          const cur = Array.isArray(faqModalItem.categories) ? faqModalItem.categories : [];
                          setFaqModalItem({
                            ...faqModalItem,
                            categories: on ? cur.filter((x) => x !== c) : [...cur, c],
                          });
                        }}
                        style={{
                          padding: '5px 12px',
                          borderRadius: 20,
                          border: `1px solid ${on ? (T.acc || '#0F766E') : (T.brd || '#E5E0D8')}`,
                          background: on ? `${(T.acc || '#0F766E')}18` : (T.card || '#fff'),
                          color: on ? (T.acc || '#0F766E') : (T.mut || '#6B7280'),
                          fontWeight: on ? 800 : 500,
                          fontSize: 12,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 4,
                          fontFamily: 'inherit',
                        }}
                      >
                        <span>{on ? '✓' : '+'}</span>
                        <span>{c}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ترجمه انگلیسی اختیاری */}
              <details style={{ background: T.soft || '#CCFBF1', padding: 10, borderRadius: 12 }}>
                <summary style={{ cursor: 'pointer', fontSize: 12.5, fontWeight: 700, color:T.accText }}>
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
                  <div>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: T.txt, marginBottom: 4 }}>
                      Answer Title (English)
                    </label>
                    <input
                      dir="ltr"
                      type="text"
                      style={S.inp}
                      value={faqModalItem.answerTitleEn}
                      onChange={(e) => setFaqModalItem({ ...faqModalItem, answerTitleEn: e.target.value })}
                      placeholder="e.g., Expert Answer"
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
