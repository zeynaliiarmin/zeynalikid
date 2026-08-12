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
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

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
  const handleDeleteManual = (idx: number) => {
    if (!confirm('این سؤال دستی حذف شود؟')) return;
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

  // Bulk select handlers
  const toggleSelectOne = (id: number) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
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
    if (!confirm(`آیا ${selectedIds.length} سوال انتخاب‌شده بایگانی شوند؟`)) return;
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
    if (!confirm(`آیا ${selectedIds.length} سوال انتخاب‌شده حذف شوند؟ این عمل غیرقابل بازگشت است.`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) await deleteUserQuestion(id);
      await loadQuestions();
      setSelectedIds([]);
      showToast(`${selectedIds.length} سوال حذف شد.`);
    } finally { setLoading(false); }
  };

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
      setSelectedIds((prev) => prev.filter((x) => x !== id));
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

  const FAQManagement = () => {
    const fa:any[] = Array.isArray((cfg as any)?.faqItems) ? (cfg as any).faqItems : [];
    const en:any[] = Array.isArray((cfg as any)?.faqItemsEn) ? (cfg as any).faqItemsEn : [];
    const tabs:any[] = ((cfg as any)?.courseTabs || []).filter((t:any) => t.active !== false);
    const destinations = [{id:'home',label:'home'}, {id:'faq',label:'FAQ'}, ...tabs.map((t:any)=>({id:`course:${t.id}`,label:t.title||t.id}))];
    const save = (patch:any, msg='تغییرات FAQ ذخیره شد.') => { const next={...(cfg as any),...patch}; setEditCfg?.(next); saveCfg?.(next); showToast(msg); };
    const update = (key:string,list:any[],i:number,patch:any) => {const next=[...list];next[i]={...next[i],...patch};setEditCfg?.({...cfg,[key]:next});};
    const toggleDestination=(key:string,list:any[],i:number,id:string,checked:boolean)=>{const current=Array.isArray(list[i]?.placements)?list[i].placements:['home','faq'];update(key,list,i,{placements:checked?[...new Set([...current,id])]:current.filter((x:string)=>x!==id)});};
    const card=(item:any,i:number,key:string,list:any[],isEn=false)=><div style={{border:`1px solid ${T.brd||'#d7e1e7'}`,borderRadius:12,padding:9,background:T.badge||T.card,minWidth:0}}>
      <input dir={isEn?'ltr':undefined} value={item?.question||''} onChange={e=>item&&update(key,list,i,{question:e.target.value})} placeholder={isEn?'Question':'سوال'} disabled={!item} style={{...S.inp,marginBottom:6,fontSize:13}}/>
      <textarea dir={isEn?'ltr':undefined} value={item?.answer||''} onChange={e=>item&&update(key,list,i,{answer:e.target.value})} placeholder={isEn?'Answer':'پاسخ'} disabled={!item} style={{...S.ta,minHeight:68,fontSize:12}}/>
      {item&&<div style={{display:'flex',gap:7,flexWrap:'wrap',marginTop:7,fontSize:10.5,lineHeight:1.4}}>{destinations.map(x=><label key={x.id} style={{display:'inline-flex',gap:3,alignItems:'center',cursor:'pointer',whiteSpace:'nowrap'}}><input type="checkbox" checked={!Array.isArray(item.placements)||item.placements.includes(x.id)} onChange={e=>toggleDestination(key,list,i,x.id,e.target.checked)} style={{width:13,height:13,margin:0}}/>{x.label}</label>)}</div>}
    </div>;
    const pairCount=Math.max(fa.length,en.length);
    const addPair=()=>{const id=`faq_${Date.now()}_${Math.random().toString(36).slice(2,5)}`;save({faqItems:[...fa,{id,question:'',answer:'',placements:['home','faq']}],faqItemsEn:[...en,{id:`${id}_en`,question:'',answer:'',placements:['home','faq']}]},'یک جفت سوال فارسی و انگلیسی افزوده شد.');};
    const movePair=(i:number,d:-1|1)=>{const j=i+d;if(j<0||j>=pairCount)return;const a=[...fa],b=[...en];[a[i],a[j]]=[a[j],a[i]];[b[i],b[j]]=[b[j],b[i]];save({faqItems:a,faqItemsEn:b},'ترتیب جفت سوال تغییر کرد.');};
    const deletePair=(i:number)=>save({faqItems:fa.filter((_:any,j:number)=>j!==i),faqItemsEn:en.filter((_:any,j:number)=>j!==i)},'جفت سوال حذف شد.');
    return <Box title="مدیریت سوالات متداول (FAQ)"><div className="zkad-qu-faq-head"><h4 style={{color:T.ttl,margin:0,textAlign:'right'}}>فارسی ({fa.length})</h4><h4 style={{color:T.ttl,margin:0,textAlign:'left'}}>English ({en.length})</h4></div><div style={{display:'flex',flexDirection:'column',gap:10}}>{Array.from({length:pairCount},(_,i)=><div key={i} style={{border:`1px solid ${T.brd||'#d7e1e7'}`,borderRadius:14,padding:8,background:T.soft||'#f5fbfb'}}><div className="zkad-qu-faq-pair">{card(fa[i],i,'faqItems',fa)}{card(en[i],i,'faqItemsEn',en,true)}</div><div style={{display:'flex',justifyContent:'center',gap:6,marginTop:7}}><button type="button" style={{...AdminBtn(),padding:'4px 9px'}} disabled={i===0} onClick={()=>movePair(i,-1)}>↑</button><button type="button" style={{...AdminBtn(),padding:'4px 9px'}} disabled={i===pairCount-1} onClick={()=>movePair(i,1)}>↓</button><button type="button" style={{...AdminBtn(),padding:'4px 9px',color:T.err||'#dc2626'}} onClick={()=>deletePair(i)}>حذف</button></div></div>)}</div><button type="button" style={{...AdminBtn(),marginTop:12}} onClick={addPair}>+ افزودن سوال جدید</button><button type="button" style={{...AdminBtn(),marginTop:12,marginInlineStart:8,background:T.acc||'#0f766e',color:'#fff',border:0}} onClick={()=>save({},'همه سوالات متداول ذخیره و منتشر شد.')}>ذخیره</button></Box>;
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

        {/* Status Filter Tabs — responsive (zkad-qu-tabs) */}
        <div className="zkad-qu-tabs" style={{ marginBottom: 14 }}>
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
            background: hasSomeSelected ? '#eff6ff' : (T.card || '#fff'),
            border: `1px solid ${hasSomeSelected ? '#93c5fd' : (T.brd || '#E5E0D8')}`,
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
            <span style={{ fontSize: 12, color: hasSomeSelected ? '#1e40af' : T.mut }}>
              {hasSomeSelected ? `${selectedIds.length} سوال انتخاب شد` : `${filtered.length} سوال فیلترشده`}
            </span>
          </div>
          {hasSomeSelected && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <button type="button" onClick={handleBulkArchive} style={{ ...AdminBtn(), padding: '6px 12px', background: '#f59e0b', color: '#fff', border: 0, fontSize: 12, fontWeight: 700 }}>
                بایگانی انتخابی ({selectedIds.length})
              </button>
              <button type="button" onClick={handleBulkDelete} style={{ ...AdminBtn(), padding: '6px 12px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', fontSize: 12, fontWeight: 700 }}>
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
                    background: isSelected ? '#eff6ff' : (T.card || '#fff'),
                    border: `1px solid ${isSelected ? '#93c5fd' : (T.brd || '#E5E0D8')}`,
                    borderRadius: T.cardRadius || 14,
                    padding: 16,
                    boxShadow: isSelected ? '0 4px 12px rgba(59,130,246,0.15)' : (T.neuOut || '0 4px 15px rgba(0,0,0,0.06)'),
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, marginBottom: 10 }}>
                    <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer', background: isSelected ? '#dbeafe' : (T.soft || '#F4F1EA'), padding: '4px 8px', borderRadius: 8, border: `1px solid ${isSelected ? '#93c5fd' : 'transparent'}` }}>
                      <input type="checkbox" checked={isSelected} onChange={() => toggleSelectOne(q.id)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
                      <span style={{ fontSize: 12, fontWeight: 700 }}>{isSelected ? 'انتخاب شد' : 'انتخاب'}</span>
                    </label>
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

      <FAQManagement />

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
