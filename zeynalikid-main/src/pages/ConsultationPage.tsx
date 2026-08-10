import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useNavigate } from 'react-router-dom';
import VoiceRecorder from '../components/VoiceRecorder';
import useExitGuard from '../hooks/useExitGuard';
import { isSupabaseConfigured, supabase, createSubmission, updateSubmission, fetchSubmissions, trackPageView } from '../lib/supabase';
import { generateTrackingCode, generateUniqueTrackingCode } from '../utils/tracking';
import { validPhone, fullPhone, p2e, digits, getCountryFlag } from '../utils/phone';
import { getTrustFontSize } from '../utils/trustFont';
import { formSuccessMessages, getRandomMessage } from '../config/successMessages';

type Lang = 'fa' | 'en';
type Any = Record<string, any>;

// ─── کامپوننت‌های کمکی (بیرون از تابع اصلی برای جلوگیری از Remount) ───
// FIX: کامپوننت‌های Err از تابع خارج شدند تا در هر رندر دوباره ساخته نشوند.
//       این اصلاح مشکل بسته‌شدن کیبورد بعد از هر کاراکتر را رفع می‌کند.

interface ErrProps { err: any; theme?: any; }
function Err({ err, theme: T }: ErrProps) {
  return <div style={{ fontSize: 11, color: T?.err ?? '#ef4444', marginTop: 4 }}>{err}</div>;
}

// ─── توابع کمکی (بیرون از تابع اصلی) ───
function labelCountryFn(c: any, l: Lang) { return `${getCountryFlag(c)} ${l === 'en' ? (c.nameEn || c.name) : c.name} ${c.code}`; }
function shortCountryFn(c: any) { return `${getCountryFlag(c)} ${c.code}`; }

// ─── Module-level components (stable identity, no remounting) ───
function PlatformIcon({ type, color }: { type: string; color: string }) {
  const paths: any = { phone: 'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.4a2 2 0 0 1-.5 2.1L8 9.4a16 16 0 0 0 6.6 6.6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.4.6A2 2 0 0 1 22 16.9z', whatsapp: 'M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5zM8.5 7.8c.2 3.7 3.1 6.4 6.7 6.8l1-1.7-2.2-1-1 1c-1.3-.5-2.2-1.4-2.8-2.7l1-1-1-2.2-1.7.8z', telegram: 'M21 4 3 11l6 2 2 6 10-15zM9 13l9-7-7 9', instagram: 'M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5zm5 6a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm6-1h.01', rubika: 'M12 2 22 8v8l-10 6L2 16V8l10-6zm0 4-6 3.5v5L12 18l6-3.5v-5L12 6z', bale: 'M4 4h16v11H8l-4 4V4z' };
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d={paths[type] || paths.phone} /></svg>;
}

function Popup({ open, onClose, trigger, children, width, T }: any) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<'top' | 'bottom'>('bottom');
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() };
    const calc = () => { const r = ref.current?.getBoundingClientRect(); if (r) { const below = window.innerHeight - r.bottom; setPlace(below < window.innerHeight * .38 && r.top > below ? 'top' : 'bottom') } };
    calc(); document.addEventListener('mousedown', h); window.addEventListener('resize', calc); window.addEventListener('scroll', calc, true);
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('resize', calc); window.removeEventListener('scroll', calc, true) };
  }, [open, onClose]);
  return <div ref={ref} style={{ position: 'relative' }}>{trigger}{open && <div style={{ position: 'absolute', top: place === 'bottom' ? 'calc(100% + 6px)' : 'auto', bottom: place === 'top' ? 'calc(100% + 6px)' : 'auto', left: 0, right: 'auto', zIndex: 3000, width: width || 260, maxWidth: 'min(33vw, calc(100vw - 34px))', minWidth: 180, maxHeight: '40vh', overflowY: 'auto', overflowX: 'hidden', background: T.pop, border: `1px solid ${T.brd}`, borderRadius: 16, boxShadow: '0 18px 48px rgba(0,0,0,.16)', padding: 8, animation: 'fadeSlide .3s ease both' }}>{children}</div>}</div>;
}

function ContactPanelLocal({ cfg, lang, T, publicText, digits }: any) {
  const c = cfg.contacts || {};
  const icons = cfg.contactIcons || {};
  const custom = (c.custom || []).filter((x: any) => x.title && x.url).sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
  const items = [c.phone && { key: 'phone', title: lang === 'en' ? 'Phone' : 'شماره تماس', url: `tel:${c.phone}`, value: c.phone }, c.whatsapp && { key: 'whatsapp', title: 'WhatsApp', url: `https://wa.me/${digits(c.whatsapp)}`, value: c.whatsapp }, c.telegram && { key: 'telegram', title: 'Telegram', url: `https://t.me/${String(c.telegram).replace('@', '')}`, value: c.telegram }, c.instagram && { key: 'instagram', title: 'Instagram', url: `https://instagram.com/${String(c.instagram).replace('@', '')}`, value: c.instagram }, c.rubika && { key: 'rubika', title: 'Rubika', url: `https://rubika.ir/${String(c.rubika).replace('@', '')}`, value: c.rubika }, c.bale && { key: 'bale', title: 'Bale', url: `https://ble.ir/${String(c.bale).replace('@', '')}`, value: c.bale }, ...custom.map((x: any) => ({ ...x, key: x.key || 'phone' }))].filter(Boolean);
  if (!items.length) return null;
  return <div style={{ marginTop: 12, padding: 12, background: T.soft, border: `1px solid ${T.brd}`, borderRadius: 14 }}><div style={{ fontWeight: 700, color: T.ttl, marginBottom: 9, fontSize: 13, display: 'flex', gap: 7, alignItems: 'center' }}><PlatformIcon type="phone" color={T.acc} />{publicText('contactUs', 'ارتباط با ما')}</div><div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(130px,1fr))', gap: 8 }}>{items.map((it: any, i: number) => { const color = it.color || icons[it.key]?.color || T.acc; return <a key={i} href={it.url} target={it.url?.startsWith('http') ? '_blank' : undefined} rel="noreferrer" style={{ textDecoration: 'none', padding: '10px 11px', borderRadius: 11, border: `1px solid ${color}55`, background: `${color}14`, color, fontWeight: 700, fontSize: 13, display: 'flex', alignItems: 'center', gap: 7, overflow: 'hidden' }}><PlatformIcon type={it.key} color={color} /><span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</span></a>; })}</div></div>;
}

// ─── FIX: Stable Form Components for Consultation (module-level, no remount) ───
const StableFieldLocal = memo(function StableFieldLocal({label,value,onChange,ph,type='text',required=false,S,T,trVal}:any){
  const _tr = trVal || ((s:any)=>String(s||''));
  const isNumeric = /phone|whatsapp|شماره|کارت|شبا|قیمت|price|کد|postal|zip|سن|قد|وزن|age|height|weight/i.test(String(label||''));
  const handleChange = (e:any)=>{
    const raw=e.target.value;
    const v = isNumeric ? p2e(raw).replace(/[^0-9]/g,'') : raw;
    onChange?.(v);
  };
  return <div style={{marginBottom:13}}><label style={S.lbl}>{_tr(label)}{required&&<span style={{color:T.err,marginInlineStart:4}}>*</span>}</label><input type={type} style={S.inp} value={value ?? ''} onChange={handleChange} placeholder={_tr(ph)} inputMode={isNumeric?'numeric':undefined} /></div>;
});
const StableSelectBoxLocal = memo(function StableSelectBoxLocal({label,items,val,setVal,multi=false,S,T,trVal,cfg,lang}:any){
  const [open,setOpen]=useState(false);
  const _tr = trVal || ((s:any)=>String(s||''));
  const txt = multi ? (Array.isArray(val)?val:[]).join('، ') : val;
  const choose = useCallback((it:string)=>{
    if(multi) setVal((Array.isArray(val)?val:[]).includes(it) ? (val as string[]).filter((x:string)=>x!==it) : [...(Array.isArray(val)?val:[]), it]);
    else { setVal(it); setOpen(false); }
  },[multi,setVal,val]);
  return <div><label style={S.lbl}>{label}</label><Popup open={open} onClose={()=>setOpen(false)} T={T} trigger={<button type="button" onClick={()=>setOpen(v=>!v)} style={{...S.inp,textAlign:'inherit',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:txt?T.txt:T.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{txt?String(txt).split('، ').map(_tr).join('، '):(cfg? '- انتخاب کنید...' : 'انتخاب کنید...')}</span><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></button>}>{(items||[]).map((it:string)=><button key={String(it)} onClick={()=>choose(it)} style={{display:'block',width:'100%',padding:'9px 10px',background:(multi?(Array.isArray(val)?val:[]).includes(it):val===it)?T.soft:'transparent',border:0,borderRadius:9,color:(multi?(Array.isArray(val)?val:[]).includes(it):val===it)?T.acc:T.txt,cursor:'pointer',fontFamily:'inherit',textAlign:'right',fontSize:13}}>{_tr(it)}</button>)}</Popup></div>;
});
const StableCountrySelectLocal = memo(function StableCountrySelectLocal({value,onChange,small=true,T,countries,lang}:any){
  const [open,setOpen]=useState(false);
  const choose = useCallback((v:string)=>{ onChange(v); setOpen(false); },[onChange]);
  return <Popup open={open} onClose={()=>setOpen(false)} T={T} width={'33vw'} trigger={<button type="button" onClick={()=>setOpen(v=>!v)} style={{height:44,minWidth:small?68:120,padding:'0 8px',background:T.inp,border:`1px solid ${T.brd}`,borderRadius:10,color:T.acc,cursor:'pointer',fontSize:14,fontFamily:'inherit',fontWeight:700,whiteSpace:'nowrap',order:-1}}>{shortCountryFn((countries||[]).find((x:any)=>x.code===value)||(countries||[])[0])}</button>}>{(countries||[]).map((c:any)=><button key={c.id||c.code} onClick={()=>choose(c.code)} style={{display:'block',width:'100%',padding:'9px 10px',background:value===c.code?T.soft:'transparent',border:0,borderRadius:9,color:value===c.code?T.acc:T.txt,cursor:'pointer',textAlign:'right',fontFamily:'inherit',fontSize:13}}>{labelCountryFn(c, lang)}</button>)}</Popup>;
});


export default function ConsultationPage({ app }: { app: any }) {
  const {
    cfg, T, S, css, lang, setLang, view, setView,
    countries, APP_B_URL, publicText, trVal,
    showContactOn, ContactPanel, Footer,
    CountrySelect, MiniIcon, MemphisBg,
    setFd: _setFd, fd: _fd,
  } = app;

  const navigate = useNavigate();

  // ─── Local form state (independent of main app fd) ───
  const emptyFd = () => ({
    topics: [] as string[], pName: '', cc: '+98', pPhone: '',
    gender: '', age: '', height: '', weight: '',
    digest: [] as string[], appetite: '', disease: '',
    specials: [] as string[], notes: '',
  });

  const SK = { settings: 'zkid_settings_v2', subs: 'zkid_submissions_v2' };
  const getLS = (k: string, f: any) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f } catch { return f } };
  const setLS = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { } };
  const uid = () => Date.now() + Math.floor(Math.random() * 9999);
  const today = () => new Date().toLocaleDateString('fa-IR');
  const now = () => new Date().toLocaleTimeString('fa-IR');

  const clearPublicFormDrafts = () => {
    try {
      const keep = new Set([SK.settings, SK.subs, 'zkid_lang']);
      const patterns = ['draft', 'courseForm', 'consultForm', 'shippingForm', 'paymentForm', 'publicForm', 'zkid_course', 'zkid_form'];
      [localStorage, sessionStorage].forEach(store => {
        for (let i = store.length - 1; i >= 0; i--) {
          const k = store.key(i) || '';
          if (!keep.has(k) && patterns.some(p => k.toLowerCase().includes(p.toLowerCase()))) store.removeItem(k);
        }
      })
    } catch { }
  };

  const [formView, setFormView] = useState<'form' | 'success'>('form');
  const [showCt, setShowCt] = useState(false);
  const [fd, setFd] = useState<any>(() => {
    try {
      const draft = getLS('zkid_form_draft', null);
      if (draft && typeof draft === 'object' && draft.topics) return { ...emptyFd(), ...draft };
    } catch { }
    return emptyFd();
  });
  const [errs, setErrs] = useState<any>({});
  const [lastId, setLastId] = useState<any>(null);
  const [lastTrack, setLastTrack] = useState('');
  const [tsSlot, setTsSlot] = useState('');
  const [showCred, setShowCred] = useState(false);
  const [successMsgRnd, setSuccessMsgRnd] = useState(() => {
    try {
      const isEn = lang === 'en';
      const list = isEn
        ? ((cfg.consultationSuccessSentencesEn && Array.isArray(cfg.consultationSuccessSentencesEn) && cfg.consultationSuccessSentencesEn.length > 0) ? cfg.consultationSuccessSentencesEn : (cfg.consultationSuccessSentences && Array.isArray(cfg.consultationSuccessSentences) && cfg.consultationSuccessSentences.length > 0 ? cfg.consultationSuccessSentences : formSuccessMessages))
        : ((cfg.consultationSuccessSentences && Array.isArray(cfg.consultationSuccessSentences) && cfg.consultationSuccessSentences.length > 0) ? cfg.consultationSuccessSentences : formSuccessMessages);
      return getRandomMessage(list);
    } catch { return getRandomMessage(formSuccessMessages); }
  });
  const [trackCopied, setTrackCopied] = useState(false);
  const [copyToast, setCopyToast] = useState('');
  const usedMsgIdx = useRef<number[]>([]);
  const [dupEntry, setDupEntry] = useState<any>(null);
  const [editId, setEditId] = useState<any>(null);
  const editEntryRef = useRef<any>(null);
  const [allowNewChild, setAllowNewChild] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [emergencyModalOpen, setEmergencyModalOpen] = useState(false);
  const subsCacheRef = useRef<any[] | null>(null);

  // Exit guard
  const isDirty = fd.topics.length > 0 || fd.pName.trim() !== '' || fd.pPhone.trim() !== '' || fd.gender !== '' || fd.age !== '' || fd.height !== '' || fd.weight !== '' || fd.notes.trim() !== '' || fd.disease.trim() !== '' || (fd.digest && fd.digest.length > 0) || fd.appetite !== '' || (fd.specials && fd.specials.length > 0);
  useExitGuard(isDirty, lang === 'fa' ? 'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید؟' : 'You have unsaved changes. Are you sure?');

  // Auto-save draft
  useEffect(() => { try { setLS('zkid_form_draft', fd); } catch { } }, [fd]);

  // Track page view
  useEffect(() => { try { trackPageView(formView === 'success' ? '/form-success' : '/form') } catch { } }, [formView]);

  // Load submissions cache
  const loadSubs = async (): Promise<any[]> => {
    if (isSupabaseConfigured) { try { return await fetchSubmissions() } catch { return getLS(SK.subs, []) } }
    return getLS(SK.subs, []);
  };
  useEffect(() => {
    let alive = true;
    loadSubs().then(l => { if (alive) subsCacheRef.current = l }).catch(() => { });
    return () => { alive = false };
  }, []);

  // FIX: حذف اسکرول خودکار وسط‌صفحه — این listener باعث می‌شد هر فیلد با focus به وسط صفحه اسکرول شود
  // مرورگر به‌صورت native کیبورد موبایل را هندل می‌کند؛ نیازی به scrollIntoView با block:center نیست
  // اگر در آینده نیاز به اسکرول ملایم بود، از {block:'nearest', behavior:'auto'} بدون setTimeout استفاده شود
  useEffect(() => {}, []);

  // URL topic preselect
  useEffect(() => {
    try {
      const q = new URLSearchParams(window.location.search);
      const t = q.get('topic');
      const map: Any = { height: 'رشد قد', appetite: 'بی‌اشتهایی / بدغذایی', mind: 'هوش و ذهن' };
      const name = map[t || ''];
      if (name) setFd((f: any) => f.topics.includes(name) ? f : { ...f, topics: [...f.topics, name] });
    } catch { }
  }, []);

  const pickNextMsg = () => {
    const isEn = lang === 'en';
    const list = isEn
      ? ((cfg.consultationSuccessSentencesEn && Array.isArray(cfg.consultationSuccessSentencesEn) && cfg.consultationSuccessSentencesEn.length > 0) ? cfg.consultationSuccessSentencesEn : (cfg.consultationSuccessSentences && Array.isArray(cfg.consultationSuccessSentences) && cfg.consultationSuccessSentences.length > 0 ? cfg.consultationSuccessSentences : formSuccessMessages))
      : ((cfg.consultationSuccessSentences && Array.isArray(cfg.consultationSuccessSentences) && cfg.consultationSuccessSentences.length > 0) ? cfg.consultationSuccessSentences : formSuccessMessages);
    const total = list.length;
    if (!total) { setSuccessMsgRnd('به جمع خانواده زینالیکید خوش آمدید'); return; }
    if (usedMsgIdx.current.length >= total) usedMsgIdx.current = [];
    const avail = Array.from({ length: total }, (_, i) => i).filter(i => !usedMsgIdx.current.includes(i));
    const idx = avail[Math.floor(Math.random() * avail.length)];
    usedMsgIdx.current = [...usedMsgIdx.current, idx];
    setSuccessMsgRnd(list[idx] || 'به جمع خانواده زینالیکید خوش آمدید');
  };

  const similarityScore = (a: any, b: any) => {
    let sc = 0;
    const an = String(a.pName || '').trim(), bn = String(b.pName || '').trim();
    if (an && bn && (an === bn || an.includes(bn) || bn.includes(an))) sc += 0.4;
    const aa = +p2e(a.age || 0), ba = +p2e(b.age || 0);
    if (aa && ba && Math.abs(aa - ba) <= 1) sc += 0.3;
    const at = a.topics || [], bt = b.topics || [];
    if (at.some((t: string) => bt.includes(t))) sc += 0.3;
    return sc;
  };

  const country = countries?.find((c: any) => c.code === fd.cc) || countries?.[0];
  const hasCt = Object.values(cfg.contacts || {}).some((v: any) => Array.isArray(v) ? v.length : v);

  // ─── Navigate to courses internally (no external redirect) ───
  const goToCourses = () => {
    if (isDirty && !confirm(lang === 'en' ? 'You have unsaved changes. Are you sure you want to leave?' : 'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید می‌خواهید خارج شوید؟')) return;
    clearPublicFormDrafts();
    // Pass parent info to courses page via URL params
    const q = new URLSearchParams();
    if (fd.pName) q.set('pname', fd.pName);
    if (fd.pPhone) { q.set('cc', fd.cc || '+98'); q.set('phone', p2e(fd.pPhone)); }
    const qs = q.toString();
    navigate(qs ? `/courses?${qs}` : '/courses');
  };

  const resetForm = () => {
    if (isDirty && formView === 'form' && !confirm(lang === 'en' ? 'You have unsaved changes. Are you sure you want to clear the form?' : 'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید می‌خواهید فرم را پاک کنید؟')) return;
    clearPublicFormDrafts();
    try { localStorage.removeItem('zkid_form_draft'); } catch { }
    setFd(emptyFd());
    setErrs({});
    setLastId(null);
    setLastTrack('');
    setTsSlot('');
    setShowCt(false);
    setEditId(null);
    editEntryRef.current = null;
    setAllowNewChild(false);
    setDupEntry(null);
    setFormView('form');
  };

  const validateConsult = () => {
    const e: any = {};
    const ff = cfg.formFields;
    const minAge = Number(ff?.age?.min ?? 2) || 2;
    const maxAge = Number(ff?.age?.max ?? 17) || 17;
    if (!fd.topics.length) e.topics = lang === 'en' ? 'Select at least one topic' : 'حداقل یک موضوع مشاوره انتخاب کنید';
    if (ff?.parentPhone?.show !== false && ff?.parentPhone?.required !== false && !validPhone(fd.pPhone, country)) e.pPhone = lang === 'en' ? 'Phone number is invalid for selected country' : 'شماره تماس برای کشور انتخاب شده معتبر نیست';
    if (!fd.gender) e.gender = lang === 'en' ? 'Select gender' : 'جنسیت فرزند را انتخاب کنید';
    const ag = +p2e(fd.age);
    if (ff?.age?.show !== false && (!fd.age || isNaN(ag) || ag < minAge || ag > maxAge)) e.age = lang === 'en' ? `Age must be ${minAge} to ${maxAge}` : `سن ${minAge} تا ${maxAge} سال`;
    Object.entries(ff || {}).forEach(([k, v]: any) => {
      if (v.show !== false && v.required && k !== 'parentPhone' && k !== 'age' && !fd[k]) e[k] = 'این فیلد الزامی است';
    });
    setErrs(e);
    return !Object.keys(e).length;
  };

  const doSubmit = async (allowNewChildOverride?: boolean) => {
    if (!validateConsult() || submitting) return;
    setSubmitting(true);
    try {
      const fp = fullPhone(fd.cc, fd.pPhone);
      const list = subsCacheRef.current || await loadSubs();
      const effectiveAllowNewChild = allowNewChildOverride ?? allowNewChild;
      if (!editId && !effectiveAllowNewChild) {
        const dup = list.find((x: any) => digits(x.fullPhone || '') === digits(fp) && x.gender === fd.gender && x.gender);
        if (dup) { setDupEntry(dup); setSubmitting(false); return; }
      }
      const prevSame = list.find((x: any) => digits(x.fullPhone || '') === digits(fp) && x.trackingCode);
      if (editId) {
        const prev = editEntryRef.current || {};
        const trackingCode = prev.trackingCode || prevSame?.trackingCode || generateUniqueTrackingCode(list.map((x: any) => String(x.trackingCode || '')).filter(Boolean), cfg.trackingDigitCount || 5);
        const updated = {
          ...prev, ...fd, fullPhone: fp, trackingCode, date: today(), time: now(), unread: true,
          editHistory: [...(prev.editHistory || []), { prevId: prev.id, date: today(), time: now(), data: { pName: prev.pName, age: prev.age, gender: prev.gender, height: prev.height, weight: prev.weight, topics: prev.topics, notes: prev.notes, disease: prev.disease } }]
        };
        if (isSupabaseConfigured) {
          updateSubmission(editId, updated as any).catch(e => {
            console.warn('update failed, falling back to localStorage', e);
            const subs = getLS(SK.subs, []);
            setLS(SK.subs, subs.map((x: any) => x.id === editId ? { ...x, ...updated } : x));
          });
        } else {
          const subs = getLS(SK.subs, []);
          setLS(SK.subs, subs.map((x: any) => x.id === editId ? { ...x, ...updated } : x));
        }
        if (subsCacheRef.current) subsCacheRef.current = subsCacheRef.current.map((x: any) => x.id === editId ? { ...x, ...updated } : x);
        setLastId(editId);
        setLastTrack(trackingCode);
      } else {
        const existingCodes = list.map((x: any) => String(x.trackingCode || '')).filter(Boolean);
        const trackingCode = effectiveAllowNewChild ? generateUniqueTrackingCode(existingCodes, cfg.trackingDigitCount || 5) : (prevSame?.trackingCode || generateUniqueTrackingCode(existingCodes, cfg.trackingDigitCount || 5));
        let similarTo: any = null;
        if (effectiveAllowNewChild) {
          const sim = list.find((x: any) => digits(x.fullPhone || '') === digits(fp) && similarityScore(x, fd) >= 0.7);
          if (sim) similarTo = sim.id;
        }
        const sameNumberAll = list.filter((x: any) => digits(x.fullPhone || '') === digits(fp));
        const hasCoursePrev = sameNumberAll.some((x: any) => x.type === 'course');
        const consultCountPrev = sameNumberAll.filter((x: any) => x.type === 'consultation').length;
        const courseCountPrev = sameNumberAll.filter((x: any) => x.type === 'course').length;
        const autoPriority = (hasCoursePrev || consultCountPrev >= 1 || courseCountPrev >= 1) ? 'high' : 'normal';

        // Upload voice note
        let voice_note_url = '';
        let voiceUploadFailed = false;
        if (voiceBlob) {
          if (isSupabaseConfigured && supabase) {
            try {
              const ext = voiceBlob.type.includes('webm') ? 'webm' : voiceBlob.type.includes('mp4') ? 'mp4' : 'webm';
              const vp = `voice-notes/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
              const { error: ve } = await supabase.storage.from('voice-notes').upload(vp, voiceBlob, { contentType: voiceBlob.type, upsert: false });
              if (!ve) {
                const { data: vu } = supabase.storage.from('voice-notes').getPublicUrl(vp);
                voice_note_url = vu.publicUrl;
              } else { voiceUploadFailed = true; }
            } catch (e) {
              console.warn('voice upload fail', e);
              voiceUploadFailed = true;
            }
          }
        }

        const entry = {
          id: uid(), trackingCode, type: 'consultation', date: today(), time: now(),
          ...fd, fullPhone: fp, voice_note_url,
          category: 'مشاوره اولیه', consultationStatus: 'مشاوره اولیه',
          consultationStatusChangedAt: new Date().toISOString(),
          priority: autoPriority, unread: true, isNew: true, followReminder: true,
          similarTo, followUps: [null, null, null, null, null],
          adminNotes: voiceUploadFailed ? '(یادداشت صوتی در ارسال اولیه با خطا مواجه شد)' : '',
          usageInstructions: '', timeSlot: '', course: null, shipping: null, payment: null, editHistory: []
        };

        if (isSupabaseConfigured) {
          createSubmission(entry as any).catch(e => {
            console.warn('Could not save submission to Supabase, falling back to localStorage', e);
            const subs = getLS(SK.subs, []);
            setLS(SK.subs, [...subs, entry]);
          });
          setLastId(entry.id);
        } else {
          const subs = getLS(SK.subs, []);
          setLS(SK.subs, [...subs, entry]);
          setLastId(entry.id);
        }
        if (subsCacheRef.current) subsCacheRef.current = [...subsCacheRef.current, entry];
        setLastTrack(trackingCode);
      }
      setEditId(null);
      editEntryRef.current = null;
      setAllowNewChild(false);
      pickNextMsg();
      clearPublicFormDrafts();
      setFormView('success');
    } catch (e) {
      console.error('submit failed', e);
      setEmergencyModalOpen(true);
    } finally {
      setSubmitting(false);
    }
  };

  const chooseDupEdit = () => {
    const d = dupEntry;
    if (!d) return;
    setFd({ topics: d.topics || [], pName: d.pName || '', cc: d.cc || '+98', pPhone: d.pPhone || '', gender: d.gender || '', age: d.age || '', height: d.height || '', weight: d.weight || '', digest: d.digest || [], appetite: d.appetite || '', disease: d.disease || '', specials: d.specials || [], notes: d.notes || '' });
    setEditId(d.id);
    editEntryRef.current = d;
    setAllowNewChild(false);
    setDupEntry(null);
  };
  const chooseDupNo = () => setDupEntry(null);
  const chooseDupNewChild = () => { setAllowNewChild(true); setEditId(null); editEntryRef.current = null; setDupEntry(null); doSubmit(true); };

  const updateTimeSlot = (nv: string) => {
    setTsSlot(nv);
    if (!lastId) return;
    if (isSupabaseConfigured) {
      updateSubmission(lastId, { timeSlot: nv } as any).catch(e => console.warn('Could not update time slot', e));
    } else {
      const subs = getLS(SK.subs, []);
      setLS(SK.subs, subs.map((y: any) => y.id === lastId ? { ...y, timeSlot: nv } : y));
    }
  };

  const fallbackCopy = (value: string) => {
    const ta = document.createElement('textarea');
    ta.value = value;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '-1000px';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.focus();
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    if (!ok) throw new Error('copy failed');
  };

  const copyTrack = async () => {
    if (!lastTrack) return;
    try {
      try { if (navigator.clipboard?.writeText) await navigator.clipboard.writeText(lastTrack); else fallbackCopy(lastTrack); } catch { fallbackCopy(lastTrack); }
      setTrackCopied(true);
      setCopyToast(lang === 'en' ? 'Tracking code copied' : 'کد پیگیری کپی شد');
      setTimeout(() => { setTrackCopied(false); setCopyToast(''); }, 3000);
    } catch {
      setCopyToast(lang === 'en' ? 'Copy failed; please copy manually' : 'کپی انجام نشد؛ لطفاً دستی کپی کنید');
      setTimeout(() => setCopyToast(''), 3000);
    }
  };

  const showContactOnPage = (p: string) => hasCt && cfg.contactVisibility?.[p];
  const phoneExamples: Record<string, string> = { '+98': '09123456789', '+1': '2125550123', '+44': '07700900000', '+49': '030123456', '+46': '0701234567', '+41': '0791234567', '+47': '41234567', '+33': '0612345678', '+61': '0412345678', '+971': '0501234567', '+90': '05321234567', '+31': '0612345678', '+91': '9876543210', '+93': '0701234567', '+': 'Enter phone number' };
  const phonePlaceholder = (code: string, l: Lang) => phoneExamples[code] || (l === 'en' ? 'Enter phone number' : 'شماره تماس');

  const labelCountry = labelCountryFn;
  const shortCountry = shortCountryFn;




  // FIX: Stable components — module-level identity, direct controlled (no buffered local)
  const Field = useCallback((props:any)=><StableFieldLocal {...props} S={S} T={T} trVal={trVal} />, [S,T,trVal]);
  const SelectBox = useCallback((props:any)=><StableSelectBoxLocal {...props} S={S} T={T} trVal={trVal} cfg={cfg} lang={lang} />, [S,T,cfg,lang,trVal]);
  const CountrySelectLocal = useCallback((props:any)=><StableCountrySelectLocal {...props} T={T} countries={countries} lang={lang} />, [T,countries,lang]);

  // LS kept for textarea
  const LS: any = useMemo(() => ({
    ...S,
    page: { ...S?.page, position: 'relative' as const },
    ta: { ...S?.ta, width: '100%', padding: '12px 14px', background: T.inp, border: `1px solid ${T.brd}`, borderRadius: 12, color: T.txt, fontSize: 16, outline: 'none', boxSizing: 'border-box' as const, minHeight: 100, resize: 'vertical' as const, fontFamily: 'inherit', boxShadow: T.neuIn },
  }), [S, T]);

  // FIX: TopicChips inlined as stable rendering function to avoid nested component remount
  const TopicChips = useCallback(()=>{
    const all = (cfg.consultTopics || []);
    const chip = (x: string) => <button key={x} onClick={() => setFd({ ...fd, topics: fd.topics.includes(x) ? fd.topics.filter((y: string) => y !== x) : [...fd.topics, x] })} style={{ padding: lang === 'en' ? '7px 8px' : '7px 6px', borderRadius: 18, border: `1px solid ${fd.topics.includes(x) ? T.acc : T.brd}`, background: fd.topics.includes(x) ? T.soft : 'transparent', color: fd.topics.includes(x) ? T.acc : T.mut, cursor: 'pointer', fontSize: lang === 'en' ? 10 : 11, fontWeight: 700, fontFamily: 'inherit', whiteSpace: 'nowrap', height: 34, transition: 'all .65s', flex: '0 0 auto', maxWidth: lang === 'en' ? 132 : 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}>{trVal(x)}</button>;
    if (lang === 'en') return <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap', overflowX: 'auto', paddingBottom: 4, WebkitOverflowScrolling: 'touch' }}>{all.map(chip)}</div>;
    const first = all.slice(0, 4), rest = all.slice(4);
    return <><div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.max(1, first.length)}, 1fr)`, gap: 5, marginBottom: rest.length ? 6 : 2 }}>{first.map(chip)}</div>{rest.length > 0 && <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>{rest.map(chip)}</div>}</>;
  }, [cfg.consultTopics, fd.topics, lang, T, trVal])

  // FIX: Inline render to avoid Unstable Nested Component remount (FormPage/SuccessPage as nested components cause entire form to remount on each keystroke)
  if (formView === 'form') return <><MemphisBg T={T} /><div style={{ ...S.page, position: 'relative' }}>
      <Helmet>
        <title>فرم مشاوره رشد و تغذیه کودک | زینالیکید</title>
        <meta name="description" content="فرم مشاوره تخصصی رشد قد، بهبود اشتها، تقویت هوش و تمرکز کودکان و نوجوانان" />
        <meta name="keywords" content="فرم مشاوره کودک, رشد قد, بهبود اشتها, تقویت هوش, زینالیکید" />
      </Helmet>
      <style>{css}</style>
      <div style={{ ...S.card, marginTop: 0 }}>
        {/* Specialist photo + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 16 }}>
          {cfg.showSpecialistPhoto && <div style={{ flexShrink: 0, position: 'relative', width: 72, height: 72, borderRadius: '50%', padding: 3, background: T.grad, boxShadow: `0 6px 16px ${T.acc}33` }}>
            <img src={cfg.photoUrl || '/specialist-photo.webp'} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', border: `2px solid ${T.card}` }} />
          </div>}
          <div style={{ flex: 1, minWidth: 0 }}>
            <h1 style={{ fontSize: 16, margin: '0 0 6px', color: T.ttl, fontWeight: 800, lineHeight: 1.7, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{publicText('heroTitle')}</h1>
            <p style={{ fontSize: 12, color: T.mut, lineHeight: 1.55, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{publicText('heroDesc')}</p>
          </div>
        </div>

        {/* Notice */}
        <div style={{ background: T.soft, borderRadius: 12, padding: 12, fontSize: 12, lineHeight: 1.9, marginBottom: 15, boxShadow: T.neuIn }}>{publicText('noticeText')}</div>

        {/* Topics */}
        <div style={S.sec}><MiniIcon type="course" T={T} />{publicText('consultTopic', 'موضوع مشاوره')} <span style={{ color: T.err }}>*</span></div>
        {TopicChips()}
        <p style={{ fontSize: 10, color: T.mut, margin: '5px 0' }}>{publicText('multi', 'می‌توانید چند مورد انتخاب کنید')}</p>
        {errs.topics && <Err err={errs.topics} theme={T} />}
        <div style={S.div} />

        {/* Parent info */}
        <div style={S.sec}><MiniIcon type="user" T={T} />{publicText('parentInfo', 'اطلاعات والد / سرپرست')}</div>
        {cfg.formFields?.parentName?.show !== false && <Field label={cfg.formFields.parentName.label} value={fd.pName} onChange={(v: string) => setFd({ ...fd, pName: v })} ph={cfg.formFields.parentName.placeholder} />}
        {cfg.formFields?.parentPhone?.show !== false && <div style={{ marginBottom: 13 }}>
          <label style={S.lbl}>{trVal(cfg.formFields.parentPhone.label)} <span style={{ color: T.err }}>*</span></label>
          <div style={{ display: 'flex', gap: 5, alignItems: 'stretch', direction: 'ltr' }}>
            <CountrySelectLocal value={fd.cc} onChange={(v: string) => setFd({ ...fd, cc: v })} />
            <input dir="ltr" style={{ ...S.inp, flex: 1, borderColor: errs.pPhone ? T.err : T.brd }} value={fd.pPhone} onChange={e => setFd({ ...fd, pPhone: p2e(e.target.value).replace(/[^0-9]/g, '') })} placeholder={phonePlaceholder(fd.cc, lang)} inputMode="numeric" />
          </div>
          {errs.pPhone && <Err err={errs.pPhone} theme={T} />}
        </div>}
        <div style={S.div} />

        {/* Child info */}
        <div style={S.sec}><MiniIcon type="user" T={T} />{publicText('childInfo', 'اطلاعات فرزند')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,2fr) 105px', gap: 12, alignItems: 'start', marginBottom: 13 }}>
          <div>
            <label style={S.lbl}>{publicText('gender', 'جنسیت')} <span style={{ color: T.err }}>*</span></label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 7 }}>
              {([['male', publicText('boy', 'پسر')], ['female', publicText('girl', 'دختر')]] as any[]).map((x: any) => <button key={x[0]} onClick={() => setFd({ ...fd, gender: x[0] })} style={{ padding: '10px 8px', borderRadius: 12, border: 'none', background: fd.gender === x[0] ? T.soft : T.card, color: fd.gender === x[0] ? T.acc : T.mut, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit', fontWeight: 700, boxShadow: fd.gender === x[0] ? T.neuIn : T.neuOut }}>{x[1]}</button>)}
            </div>
            {errs.gender && <Err err={errs.gender} theme={T} />}
          </div>
          {cfg.formFields?.age?.show !== false && <div>
            <label style={S.lbl}>{publicText('age', cfg.formFields?.age?.label)} <span style={{ color: T.err }}>*</span></label>
            <input type="number" min={Number(cfg.formFields?.age?.min ?? 2) || 2} max={Number(cfg.formFields?.age?.max ?? 17) || 17} style={{ ...S.inp, borderColor: errs.age ? T.err : T.brd }} value={fd.age} onChange={e => setFd({ ...fd, age: p2e(e.target.value).replace(/[^0-9]/g, '') })} placeholder={trVal(cfg.formFields?.age?.placeholder)} inputMode="numeric" />
            {errs.age && <Err err={errs.age} theme={T} />}
          </div>}
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          {cfg.formFields?.height?.show !== false && <Field label={publicText('height', cfg.formFields?.height?.label)} value={fd.height} onChange={(v: string) => setFd({ ...fd, height: v })} ph={cfg.formFields?.height?.placeholder} type="number" />}
          {cfg.formFields?.weight?.show !== false && <Field label={publicText('weight', cfg.formFields?.weight?.label)} value={fd.weight} onChange={(v: string) => setFd({ ...fd, weight: v })} ph={cfg.formFields?.weight?.placeholder} type="number" />}
        </div>
        <div style={S.div} />

        {/* Health info */}
        <div style={S.sec}>{publicText('healthInfo', 'وضعیت تغذیه و سلامت')}</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <SelectBox label={publicText('digest', 'مشکل گوارشی')} multi items={cfg.digestiveOptions || []} val={fd.digest} setVal={(v: any) => setFd({ ...fd, digest: v })} />
          <SelectBox label={publicText('appetite', 'وضعیت اشتها')} items={cfg.appetiteOptions || []} val={fd.appetite} setVal={(v: any) => setFd({ ...fd, appetite: v })} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 12 }}>
          {cfg.formFields?.disease?.show !== false && <Field label={publicText('disease', cfg.formFields?.disease?.label)} value={fd.disease} onChange={(v: string) => setFd({ ...fd, disease: v })} ph={cfg.formFields?.disease?.placeholder} />}
          <SelectBox label={publicText('specials', 'شرایط خاص')} multi items={cfg.specialConditions || []} val={fd.specials} setVal={(v: any) => setFd({ ...fd, specials: v })} />
        </div>

        {/* Notes + Voice recorder */}
        {cfg.formFields?.notes?.show !== false && <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 6, marginBottom: 7 }}>
            <label style={{ fontSize: 14, color: T.mut, fontWeight: 700 }}>{publicText('notes', cfg.formFields?.notes?.label)}</label>
            <VoiceRecorder T={T} lang={lang} maxDuration={90} onRecorded={(blob: Blob) => setVoiceBlob(blob)} onRemoved={() => setVoiceBlob(null)} />
          </div>
          <textarea style={LS.ta} value={fd.notes} onChange={e => setFd({ ...fd, notes: e.target.value })} placeholder={trVal(cfg.formFields?.notes?.placeholder)} />
        </div>}

        <p style={{ fontSize: 10, color: T.mut, textAlign: 'center' }}>{publicText('required', 'فیلدهای دارای * الزامی هستند')}</p>
        {Object.keys(errs).length > 0 && <div style={{ background: `${T.err}12`, border: `1px solid ${T.err}`, borderRadius: 12, padding: 12, marginBottom: 12, color: T.err, fontSize: 12 }}>
          {Object.values(errs).map((x: any, i) => <div key={i}>- {x}</div>)}
        </div>}
        <button style={S.btn} onClick={() => doSubmit()}>{publicText('submitBtnText')}</button>
      </div>

      {/* Duplicate modal */}
      {dupEntry && <div onMouseDown={e => { if (e.currentTarget === e.target) setDupEntry(null) }} style={{ position: 'fixed', inset: 0, zIndex: 9000, background: 'rgba(30,20,30,.45)', backdropFilter: 'blur(3px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fade .35s ease both' }}>
        <div style={{ width: '100%', maxWidth: 420, background: T.pop, border: `1px solid ${T.brd}`, borderRadius: 20, padding: 20, boxShadow: '0 24px 60px rgba(0,0,0,.22)', animation: 'modalIn .35s ease both' }}>
          <h3 style={{ color: T.ttl, marginTop: 0, fontSize: 15 }}>{lang === 'en' ? 'Duplicate form detected' : 'فرم تکراری شناسایی شد'}</h3>
          <p style={{ fontSize: 13, color: T.txt, lineHeight: 2 }}>
            {lang === 'en'
              ? `A form was already submitted with this phone number${dupEntry.pName ? ` by "${dupEntry.pName}"` : ''} for a child (${dupEntry.age || '—'} years old, ${dupEntry.gender === 'male' ? 'boy' : 'girl'}). Do you need to edit the information?`
              : `با این شماره تماس قبلاً${dupEntry.pName ? ` توسط «${dupEntry.pName}»` : ''} برای فرزندی (${dupEntry.age || '—'} ساله، ${dupEntry.gender === 'male' ? 'پسر' : 'دختر'}) فرم ثبت شده است. آیا نیاز به ویرایش اطلاعات دارید؟`}
          </p>
          <button style={{ ...S.btn, marginBottom: 8 }} onClick={chooseDupEdit}>{lang === 'en' ? 'Edit information' : 'ویرایش اطلاعات'}</button>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <button style={S.btnGhost} onClick={chooseDupNo}>{lang === 'en' ? 'No' : 'خیر'}</button>
            <button style={S.btnGhost} onClick={chooseDupNewChild}>{lang === 'en' ? 'It is for my other child' : 'برای فرزند دیگرم هست'}</button>
          </div>
        </div>
      </div>}

      {/* Emergency modal */}
      {emergencyModalOpen && <div onMouseDown={e => { if (e.currentTarget === e.target) setEmergencyModalOpen(false) }} style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(15,30,45,.65)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, animation: 'fade .3s ease both', direction: lang === 'fa' ? 'rtl' : 'ltr' }}>
        <div style={{ width: '100%', maxWidth: 440, background: T.card || '#fff', border: `2px solid ${T.err || '#DC2626'}`, borderRadius: 20, padding: '24px 20px', boxShadow: '0 24px 60px rgba(0,0,0,.25)', textAlign: 'center', animation: 'modalIn .3s ease both' }}>
          <h3 style={{ fontSize: 16.5, fontWeight: 800, color: T.err || '#DC2626', lineHeight: 1.7, margin: '0 0 10px' }}>{lang === 'fa' ? 'لطفاً با این شماره تماس بگیرید' : 'Please call this phone number'}</h3>
          <p style={{ fontSize: 13, color: T.txt, lineHeight: 1.9, margin: '0 0 16px' }}>{lang === 'fa' ? 'اطلاعات شما ثبت شده اما در اتصال به سرور مشکلی رخ داده؛ کارشناسان ما آماده‌اند درخواست شما را تلفنی نهایی کنند.' : 'Your info is saved locally. Please contact our support team directly.'}</p>
          <div style={{ background: T.soft, borderRadius: 14, padding: '12px 14px', marginBottom: 14, border: `1px solid ${T.brd}` }}>
            <div style={{ fontSize: 12, color: T.mut, marginBottom: 4 }}>شماره تماس مستقیم:</div>
            <a href={`tel:${cfg.adminPhone || cfg.contacts?.phone || '09125703684'}`} style={{ fontSize: 20, fontWeight: 800, color: T.acc, textDecoration: 'none', letterSpacing: '1px', display: 'block', direction: 'ltr' }}>{cfg.adminPhone || cfg.contacts?.phone || '09125703684'}</a>
          </div>
          <div style={{ display: 'grid', gap: 8 }}>
            <a href={`tel:${cfg.adminPhone || cfg.contacts?.phone || '09125703684'}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 46, borderRadius: 12, background: T.grad, color: '#fff', textDecoration: 'none', fontSize: 14.5, fontWeight: 800 }}>تماس تلفنی مستقیم</a>
            <button type="button" onClick={() => setEmergencyModalOpen(false)} style={{ minHeight: 42, borderRadius: 12, border: `1px solid ${T.brd}`, background: 'transparent', color: T.mut, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}>{lang === 'fa' ? 'بستن و تلاش مجدد' : 'Close and retry'}</button>
          </div>
        </div>
      </div>}
    </div></>;
  if (formView === 'success') return <><MemphisBg T={T} /><div style={{ ...S.page, flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start', paddingBottom: 16 }}>
      <Helmet>
        <title>ثبت موفقیت‌آمیز فرم مشاوره | زینالیکید</title>
        <meta name="description" content="فرم مشاوره شما با موفقیت ثبت شد." />
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <style>{css}</style>
      <div style={{ ...S.card, maxWidth: 460, textAlign: 'center', padding: '20px 18px', marginTop: 0 }}>
        {/* Success checkmark */}
        <div style={{ margin: '2px auto 12px', width: 78, height: 78, borderRadius: '50%', background: 'linear-gradient(135deg,#10b981,#06b6d4)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 16px 38px rgba(16,185,129,.3), 4px 4px 10px rgba(0,0,0,.08)', animation: 'modalIn .4s ease both' }}>
          <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <h2 style={{ color: T.ttl, fontSize: 17, margin: '0 0 5px', fontWeight: 800 }}>{publicText('successMsg')}</h2>
        <p style={{ color: T.mut, fontSize: 12.5, lineHeight: 1.8, margin: '0 0 8px' }}>{publicText('successSubMsg')}</p>

        {/* Tracking code */}
        {lastTrack && <div style={{ background: '#facc1518', borderRadius: 12, padding: '9px 11px', marginBottom: 8, textAlign: 'right', boxShadow: T.neuIn }}>
          <div style={{ fontSize: 11, color: '#ca8a04', fontWeight: 800, lineHeight: 1.8, marginBottom: 3 }}>{lang === 'en' ? 'Please save your tracking code:' : 'حتماً کد پیگیری را ذخیره کنید:'}</div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
            <span style={{ fontSize: 10, color: T.mut }}>{lang === 'en' ? 'Tracking code:' : 'کد پیگیری:'}</span>
            <b dir="ltr" onClick={copyTrack} title={lang === 'en' ? 'Click to copy' : 'برای کپی کلیک کنید'} style={{ fontSize: 17, color: T.acc, letterSpacing: '2px', fontFamily: 'monospace,-apple-system,"Courier New"', cursor: 'pointer' }}>{lastTrack}</b>
            <button onClick={copyTrack} title={lang === 'en' ? 'Copy' : 'کپی'} style={{ width: 26, height: 26, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', background: trackCopied ? '#16a34a' : 'rgba(255,255,255,.9)', color: trackCopied ? '#fff' : '#111', fontSize: 13, transition: 'all .3s ease', flexShrink: 0, border: 0, fontFamily: 'inherit' }}>{trackCopied ? (lang === 'en' ? 'Copied' : 'کپی شد') : (lang === 'en' ? 'Copy' : 'کپی')}</button>
          </div>
        </div>}

        {/* Time slot selection */}
        {(cfg.timeSlots || []).length > 0 && <div style={{ background: T.soft, borderRadius: 14, padding: '9px 11px', marginBottom: 8, textAlign: 'right', boxShadow: T.neuIn }}>
          <b style={{ fontSize: 11.5, color: T.txt }}>{publicText('timeSlotLabel')}</b>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 7, justifyContent: 'center' }}>
            {(cfg.timeSlots || []).map((x: string) => <button key={x} onClick={() => updateTimeSlot(tsSlot === x ? '' : x)} style={{ padding: '6px 12px', borderRadius: 20, border: 'none', background: tsSlot === x ? T.soft : T.card, color: tsSlot === x ? T.acc : T.mut, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, boxShadow: tsSlot === x ? T.neuIn : T.neuOut }}>{trVal(x)}</button>)}
          </div>
        </div>}

        {/* Direct course registration — INTERNAL NAVIGATION */}
        <button style={{ ...S.btn, marginBottom: 8, padding: 14, fontSize: 16 }} onClick={goToCourses}>
          <MiniIcon type="course" T={{ acc: '#fff' }} /> {publicText('directCourseBtn')}
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: showContactOnPage('consultSuccess') ? '1fr 1fr' : '1fr', gap: 8 }}>
          <button style={{ ...S.btnGhost, padding: 11 }} onClick={resetForm}>{publicText('newFormBtn')}</button>
          {showContactOnPage('consultSuccess') && <button style={{ ...S.btnGhost, padding: 11 }} onClick={() => setShowCt(v => !v)}>{publicText('contactBtn')}</button>}
        </div>

        <p style={{ color: T.mut, fontSize: getTrustFontSize(String(successMsgRnd), 13), lineHeight: 2, margin: '8px 0 0', textAlign: 'right', background: T.soft, borderRadius: 12, padding: '9px 11px', boxShadow: T.neuIn, overflow: 'hidden' }}>{successMsgRnd}</p>
        {showCt && showContactOnPage('consultSuccess') && <ContactPanelLocal cfg={cfg} lang={lang} T={T} publicText={publicText} digits={digits} />}
      </div>
      <div style={{ marginTop: 'auto', width: '100%', maxWidth: 600 }}>
        <Footer cfg={cfg} T={T} lang={lang} setView={setView} />
      </div>
      {copyToast && <div style={{ position: 'fixed', bottom: 18, left: '50%', transform: 'translateX(-50%)', zIndex: 9999, background: T.pop, border: `1px solid ${copyToast.includes('نشد') || copyToast.includes('failed') ? T.err : T.ok}`, color: copyToast.includes('نشد') || copyToast.includes('failed') ? T.err : T.ok, borderRadius: 12, padding: '10px 16px', fontSize: 13, fontWeight: 800, boxShadow: '0 14px 35px rgba(0,0,0,.18)', animation: 'fadeSlide .35s ease both' }}>{copyToast}</div>}
    </div></>;
  return null;
}