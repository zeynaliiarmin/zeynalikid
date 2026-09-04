// TrackPage — پیگیری دوره (نسخهٔ A: نئومورفیک گرم + هدر کامل سایت + بازگشت داخل همبرگر)
// همهٔ منطق قبلی حفظ شده: جستجوی Supabase/localStorage، ورود مهمان، تب‌ها (ویرایش/غذا/مصرف/اصلاحی)،
// PDFها، نکات کارشناس، پنل تماس — فقط لایهٔ نمایشی به زبان طراحی جدید ترجمه شد.
import { useAppContext } from '../app/AppContext';
import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';

import { isSupabaseConfigured } from '../lib/supabase';
import { reportError } from '../utils/errorLog';
import { triggerErrorAlert } from '../utils/errorAlertBus';
import { TRACKING_PREFIX } from '../config/project';
import { normalizeTrackingCode } from '../utils/tracking';
import { PhoneIcon, PinIcon, ChatIcon, productVectorIcon } from '../components/Icons';
import './portal.css';
import { designModeFromThemeId, warmZpVars } from '../theme/warmPalettes';
import { PlanView } from '../lib/PlanView';
import { downloadPlanPdf } from '../lib/planPdf';
import EntryBackButton from '../components/EntryBackButton';

const getLS = (k: string, f: any) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : f; } catch { return f; } };
const SUPABASE_URL = (import.meta.env.VITE_SUPABASE_URL as string | undefined) || '';
const SUPABASE_ANON_KEY = (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || '';
const digitsOnly = (v: any) => String(v ?? '').replace(/[۰-۹]/g, (d: any) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g, (d: any) => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g, '');

const readSessionOnce = (key: string) => { try { return sessionStorage.getItem(key) || ''; } catch { return ''; } };

const maskPhonePreview = (stored: string) => {
  const d = digitsOnly(stored);
  if (!d || d.length < 7) return '';
  const last3 = d.slice(-3);
  if (d.startsWith('98')) { const local = '0' + d.slice(2); return local.slice(0, 4) + 'xxxx' + last3; }
  if (d.startsWith('09')) return d.slice(0, 4) + 'xxxx' + last3;
  const prefix = String(stored || '').match(/^(\+\d{1,3})/)?.[0] || '';
  if (prefix) { const rest = d.slice(prefix.replace('+', '').length); return prefix + rest.slice(0, 3) + 'xxxx' + last3; }
  return d.slice(0, 4) + 'xxxx' + last3;
};
const resultPhonePreview = (result: any) => { if (!result) return ''; if (result.maskedPhone) return result.maskedPhone; return maskPhonePreview(String(result.fullPhone || '')); };

export default function TrackPage() {
  const app = useAppContext();
  const { cfg, T, S, css, lang, setLang, setView, publicText, p2e, showContactOn, ContactPanel } = app;
  const [num, setNum] = useState(() => readSessionOnce('zkid_track_prefill'));
  const [phone, setPhone] = useState(() => readSessionOnce('zkid_track_phone_prefill'));
  const [result, setResult] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [rtab, setRtab] = useState<'edit' | 'meal' | 'usage' | 'corrective'>('edit');
  const [correctiveDraft, setCorrectiveDraft] = useState<any>({});
  const [correctiveSaving, setCorrectiveSaving] = useState(false);
  const [correctiveMsg, setCorrectiveMsg] = useState('');
  const [isGuest, setIsGuest] = useState(false);

  const onNumChange = (v: string) => {
    const clean = p2e(v).replace(/^(zk|fm)-?/i, '').replace(/[^a-z0-9]/gi, '').toLowerCase().slice(0, 20);
    setNum(clean);
  };
  const buildCode = () => normalizeTrackingCode(num, TRACKING_PREFIX);

  const localLookup = async (c: string, ph: string) => {
    if (isSupabaseConfigured && SUPABASE_URL && SUPABASE_ANON_KEY) {
      try {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/track-submission`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY },
          body: JSON.stringify({ trackingCode: c, fullPhone: ph }),
        });
        if (response.ok) {
          const data = await response.json();
          return { ...data, _trackingCodeRaw: c, _phoneRaw: ph };
        }
      } catch (e) {
        console.error('Supabase lookup failed:', e);
        reportError('track_lookup', 'Supabase lookup failed', String((e as any)?.message || e)); triggerErrorAlert('track');
      }
    }
    const list: any[] = getLS('zkid_submissions_v2', []);
    const wanted = c.toLowerCase(); const legacy = wanted.startsWith('fm') ? 'zk' + wanted.slice(2) : wanted;
    const found = list.find((x: any) => { const code = String(x.trackingCode || '').toLowerCase(); return code === wanted || code === legacy; });
    if (!found) return { error: lang === 'en' ? 'Phone number or tracking code is incorrect. Please try again.' : 'شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید.' };
    const sd = digitsOnly(found.fullPhone || ''), id = digitsOnly(ph);
    const match = sd.length >= 7 && id.length >= 7 && (sd.endsWith(id) || id.endsWith(sd) || sd.slice(-10) === id.slice(-10));
    if (!match) return { error: lang === 'en' ? 'Phone number or tracking code is incorrect. Please try again.' : 'شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید.' };
    const stored = String(found.fullPhone || '');
    const maskedPhone = maskPhonePreview(stored);
    const eh = found.editHistory || [];
    return {
      trackingCode: found.trackingCode, status: found.orderStatus || (found.payment?.receipt ? 'پرداختشده' : found.course ? 'در انتظار پرداخت' : 'جدید'),
      date: `${found.date || ''} ${found.time || ''}`.trim(), course: found.course ? { title: found.course.title, titleEn: found.course.titleEn } : null,
      usage: found.usageInstructions || '', mealPlan: found.mealPlan || '', showMealPlan: found.showMealPlan === true, sportPlan: found.sportPlan || '', showSportPlan: found.showSportPlan === true,
      usagePdfUrl: found.usagePdfUrl || '', mealPdfUrl: found.mealPdfUrl || '', userNotes: found.userNotes || '', productUsage: found.productUsage || {},
      lastEdit: eh.length ? `${eh[eh.length - 1].date || ''} ${eh[eh.length - 1].time || ''}`.trim() : '', maskedPhone, canEdit: true,
      corrective: found.corrective || null, showCorrectiveTab: !!found.showCorrectiveTab, correctiveData: found.correctiveData || {},
      _trackingCodeRaw: c, _phoneRaw: ph,
    };
  };

  const normalizePhone = (raw: string) => { let d = digitsOnly(raw); if (d.startsWith('0098')) d = d.slice(2); if (d.startsWith('98') && d.length === 12) d = '0' + d.slice(2); if (!d.startsWith('0') && d.startsWith('9') && d.length === 10) d = '0' + d; return d.length >= 7 ? `+98${d.startsWith('0') ? d.slice(1) : d}` : raw; };

  const search = async () => {
    const c = buildCode(); const rawPh = p2e(phone).replace(/[\s\-().]/g, '').trim(); const ph = normalizePhone(rawPh);
    setErr(''); setResult(null);
    if (!/^(ZK|FM)\d{4,8}$/i.test(c) && !/^(ZK|FM)-[A-F0-9]{6}$/i.test(c) && !/^(ZK|FM)-[0-9][a-z0-9]{6,8}$/i.test(c) && !/^(ZK|FM)-[A-Z0-9]{12,20}$/i.test(c)) { setErr(lang === 'en' ? 'Enter the tracking code exactly as shown after registration.' : 'کد پیگیری را دقیقاً مطابق کد نمایشدادهشده بعد از ثبت وارد کنید.'); return; }
    if (digitsOnly(ph).length < 7) { setErr(lang === 'en' ? 'Please enter the phone number used at registration.' : 'لطفاً شماره تماسی که هنگام ثبت وارد کردید را وارد کنید.'); return; }
    setLoading(true);
    try {
      if (isSupabaseConfigured && SUPABASE_URL) {
        try {
          const response = await fetch(`${SUPABASE_URL}/functions/v1/track-submission`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ trackingCode: c, fullPhone: ph }) });
          const data = await response.json().catch(() => ({ error: 'خطای سرور. لطفاً مجدداً تلاش کنید.' }));
          if (!response.ok) { setErr(data?.error || (lang === 'en' ? 'Not found.' : 'یافت نشد.')); return; }
          setResult({ ...data, _trackingCodeRaw: c, _phoneRaw: ph }); setIsGuest(false); setRtab('edit'); return;
        } catch (e) {
          reportError('track_search', 'track-submission failed, falling back to local', String((e as any)?.message || e)); triggerErrorAlert('track');
          const r: any = await localLookup(c, ph); if (r.error) setErr(r.error); else { setResult(r); setIsGuest(false); setRtab('edit'); } return;
        }
      }
      const r: any = await localLookup(c, ph); if (r.error) setErr(r.error); else { setResult(r); setIsGuest(false); setRtab('edit'); }
    } finally { setLoading(false); }
  };

  const enterGuest = () => {
    setIsGuest(true); setErr('');
    setResult({
      trackingCode: 'GUEST', status: lang === 'en' ? 'Guest' : 'مهمان', date: '', course: null,
      usage: '', mealPlan: '', showMealPlan: true, sportPlan: '', showSportPlan: true, userNotes: '', productUsage: {}, maskedPhone: '', canEdit: false, corrective: null,
    });
    setRtab('meal');
  };

  const mealTab: ['meal', string] = ['meal', lang === 'en' ? 'Plans' : 'برنامه‌ها'];
  const rtabs: [('edit' | 'meal' | 'usage' | 'corrective'), string][] = isGuest
    ? [...(result?.showMealPlan || result?.showSportPlan ? [mealTab] : []), ['usage', lang === 'en' ? 'Usage' : 'طریقه مصرف']]
    : [['edit', lang === 'en' ? 'Last Edit' : 'آخرین ویرایش'], ...(result?.showMealPlan || result?.showSportPlan ? [mealTab] : []), ['usage', lang === 'en' ? 'Usage' : 'طریقه مصرف'], ...(result?.showCorrectiveTab ? [['corrective', lang === 'en' ? 'Corrective' : 'اصلاحی'] as ['corrective', string]] : [])];

  useEffect(() => { if (result?.correctiveData) setCorrectiveDraft({ ...result.correctiveData }); }, [result]);

  const correctiveFields: [string, string, string][] = [
    ['height', lang === 'en' ? 'Height (cm)' : 'قد (سانتیمتر)', ''], ['weight', lang === 'en' ? 'Weight (kg)' : 'وزن (کیلوگرم)', ''],
    ['appetite', lang === 'en' ? 'Appetite' : 'اشتها', ''], ['sleep', lang === 'en' ? 'Sleep' : 'خواب', ''],
    ['activity', lang === 'en' ? 'Activity' : 'فعالیت', ''], ['exercise', lang === 'en' ? 'Exercise' : 'ورزش', ''],
    ['puberty', lang === 'en' ? 'Puberty' : 'بلوغ', ''], ['waterIntake', lang === 'en' ? 'Water intake' : 'مصرف آب', ''],
    ['snacks', lang === 'en' ? 'Snacks' : 'تنقلات', ''], ['parentsHeight', lang === 'en' ? "Parents' height" : 'قد والدین', ''],
    ['allergies', lang === 'en' ? 'Allergies' : 'حساسیتها', ''], ['diseases', lang === 'en' ? 'Diseases' : 'بیماریها', ''],
    ['medications', lang === 'en' ? 'Medications' : 'داروها', ''], ['temperament', lang === 'en' ? 'Temperament' : 'طبع', ''],
  ];

  const saveCorrective = async () => {
    if (!result?._trackingCodeRaw || !result?._phoneRaw) { setCorrectiveMsg(lang === 'en' ? 'Unable to save; please search again.' : 'ذخیره ممکن نشد؛ لطفاً دوباره جستجو کنید.'); setTimeout(() => setCorrectiveMsg(''), 3000); return; }
    setCorrectiveSaving(true); setCorrectiveMsg('');
    try {
      if (isSupabaseConfigured && SUPABASE_URL) {
        const response = await fetch(`${SUPABASE_URL}/functions/v1/update-corrective`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON_KEY}`, 'apikey': SUPABASE_ANON_KEY }, body: JSON.stringify({ trackingCode: result._trackingCodeRaw, fullPhone: result._phoneRaw, correctiveData: correctiveDraft }) });
        const data = await response.json().catch(() => ({ error: 'خطای سرور' }));
        if (!response.ok) { setCorrectiveMsg(data?.error || (lang === 'en' ? 'Could not save.' : 'ذخیره انجام نشد.')); return; }
        setResult((r: any) => ({ ...r, correctiveData: data.correctiveData || correctiveDraft }));
        setCorrectiveMsg(lang === 'en' ? 'Saved successfully' : 'با موفقیت ذخیره شد');
      } else {
        const list = getLS('zkid_submissions_v2', []);
        const updated = list.map((x: any) => String(x.trackingCode || '').toUpperCase() === result.trackingCode ? { ...x, correctiveData: { ...(x.correctiveData || {}), ...correctiveDraft } } : x);
        localStorage.setItem('zkid_submissions_v2', JSON.stringify(updated));
        setResult((r: any) => ({ ...r, correctiveData: { ...(r.correctiveData || {}), ...correctiveDraft } }));
        setCorrectiveMsg(lang === 'en' ? 'Saved successfully' : 'با موفقیت ذخیره شد');
      }
    } catch (e) {
      reportError('track_corrective', 'Could not save corrective info', String((e as any)?.message || e)); triggerErrorAlert('track');
      setCorrectiveMsg(lang === 'en' ? 'Could not save.' : 'ذخیره انجام نشد.');
    } finally {
      setCorrectiveSaving(false);
      setTimeout(() => setCorrectiveMsg(''), 3000);
    }
  };

  useEffect(() => {
    try {
      const isGuestFlag = sessionStorage.getItem('zkid_track_guest');
      const isAutoFlag = sessionStorage.getItem('zkid_track_auto');
      sessionStorage.removeItem('zkid_track_guest');
      sessionStorage.removeItem('zkid_track_auto');
      sessionStorage.removeItem('zkid_track_prefill');
      sessionStorage.removeItem('zkid_track_phone_prefill');
      if (isGuestFlag) { enterGuest(); return; }
      if (isAutoFlag && num && digitsOnly(phone).length >= 7) { search(); }
    } catch { }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getGuestMeal = () => {
    if (cfg.guestMealPlan) return cfg.guestMealPlan;
    const products = (cfg.products?.list || []) as any[];
    return products.map((p: any) => `${p.name}: ${p.description || ''}`).filter(Boolean).join('\n\n') || (lang === 'en' ? 'The meal plan has not been added yet.' : 'برنامه غذایی هنوز ثبت نشده است.');
  };
  const getGuestUsage = () => {
    if (cfg.guestUsage) return cfg.guestUsage;
    const products = (cfg.products?.list || []) as any[];
    return products.map((p: any) => `${p.name}: ${p.description || ''}`).filter(Boolean).join('\n\n') || (lang === 'en' ? 'Usage instructions have not been added yet.' : 'طریقه مصرف هنوز ثبت نشده است.');
  };

  // پالت اختصاصی همین دیزاین در همین حالت (روشن/تاریک) — دقیقاً از فایل design-A-warm
  const zpTheme = designModeFromThemeId(T.id);
  const zp = warmZpVars(zpTheme.design, zpTheme.dark);
  const darkGlass = zpTheme.dark;
  const acc = zp['--zp-acc'];
  const mem = [zp['--zp-mem0'], zp['--zp-mem1'], zp['--zp-mem2']];
  const rootVars: any = { ...zp };

  const brand = String(cfg?.browserTitle || cfg?.siteTitle || (lang === 'en' ? 'Farzandman' : 'فرزند من')).replace(/[“”"]/g, '').trim();
  const glassCard: any = { background: darkGlass ? 'rgba(15,23,42,0.55)' : 'rgba(255,255,255,.90)', border: `1px solid ${darkGlass ? 'rgba(255,255,255,.2)' : T.brd}`, borderRadius: 16 };

  const infoRows: [string, string][] = [
    [lang === 'en' ? 'Tracking code' : 'کد پیگیری', String(result?.trackingCode || '')],
    [lang === 'en' ? 'Status' : 'وضعیت دوره', String(result?.status || '')],
    [lang === 'en' ? 'Registration date' : 'تاریخ ثبت', String(result?.date || '—')],
    ...(result?.course ? ([[lang === 'en' ? 'Course' : 'دورهٔ ثبتشده', lang === 'en' ? (result.course.titleEn || result.course.title) : result.course.title]] as [string, string][]) : []),
    ...(resultPhonePreview(result) ? ([[lang === 'en' ? 'Registered phone' : 'شمارهٔ ثبتشده', resultPhonePreview(result)]] as [string, string][]) : []),
  ];
  const progressWidth = String(result?.status || '').includes('پرداخت') || String(result?.status || '').includes('done') ? '100%' : String(result?.status || '').includes('جدید') ? '25%' : '65%';

  return (
    <div className="zp-root" dir={lang === 'fa' ? 'rtl' : 'ltr'} style={{ ...rootVars, ['--zkgl-acc' as any]: acc }} aria-label="track-page">
      <Helmet><title>{lang === 'en' ? `Track your course | ${brand}` : `پیگیری دوره | ${brand}`}</title><meta name="description" content={lang === 'en' ? 'Track your course registration with your tracking code and phone number.' : `وارد کردن کد پیگیری و مشاهدهٔ وضعیت دورهٔ ${brand}`} /><meta name="robots" content="noindex, follow" /></Helmet>
      <style>{css}</style>
      <div className="zp-bg"><div className="zp-fam" /><svg viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="8%" cy="12%" r="62" fill={mem[0] || '#F1E4FC'} opacity=".6" />
        <circle cx="94%" cy="30%" r="40" fill={mem[1] || '#DCEFFC'} opacity=".5" />
        <path d="M -5 100 Q 30 78 65 100 T 135 100" stroke={mem[1] || '#DCEFFC'} strokeWidth="3" fill="none" opacity=".5" />
        <circle cx="18%" cy="80%" r="8" fill={mem[2] || '#E2F6EC'} opacity=".6" />
        <path d="M 40 -5 Q 48 30 40 60" stroke={mem[0] || '#F1E4FC'} strokeWidth="3" fill="none" opacity=".5" />
      </svg></div>
      {/* هدر صفحه: همان هدر صفحات عمومی (از App.tsx رندر می‌شود) */}

      <div className="zp-content">
        <div className="zp-card" style={{ maxWidth: 400 }}>
          <div style={{ textAlign: 'center' }}><span className="zp-chip"><svg viewBox="0 0 24 24"><path d="M12 8v4l3 3" /><circle cx="12" cy="12" r="9" /></svg>{lang === 'en' ? 'TRACK COURSE' : 'پیگیری دوره'}</span></div>
          <div className="zp-entry-title-row zk-public-title-row"><EntryBackButton lang={lang} /><h1 className="zp-h1">{lang === 'en' ? 'Track your course' : 'پیگیری ثبتنام'}</h1></div>
          <p className="zp-sub">{lang === 'en' ? 'Enter your tracking code and the phone number used at registration.' : <>کد پیگیری و شمارهٔ تماس هنگام ثبت را وارد کنید تا <b>وضعیت دوره</b> و <b>گام بعدی</b> را ببینید.</>}</p>
          <div className="zp-field">
            <span className="zp-lbl zp-entry-field-label">{lang === 'en' ? 'Tracking code' : 'کد پیگیری'}</span>
            <div className="zp-box zp-bigv"><span className="zp-fic"><svg viewBox="0 0 24 24"><path d="M4.5 7v10M8 7v10M10.5 7v6M13 7v10M15.5 7v6M19.5 7v10" /></svg></span><input className="zp-entry-field-input zp-entry-code-input" dir="ltr" placeholder="مثلاً ۱۲۷۳۹" value={num} onChange={(e) => onNumChange(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} maxLength={20} style={{ fontFamily: 'ui-monospace,SFMono-Regular,Menlo,monospace', letterSpacing: '3px' }} /><span className="zp-tag">{TRACKING_PREFIX}</span></div>
          </div>
          <div className="zp-field">
            <span className="zp-lbl zp-entry-field-label">{lang === 'en' ? 'Phone number' : 'شماره تماس'}</span>
            <div className="zp-box zp-bigv zp-phonebox"><span className="zp-fic"><PhoneIcon size={19} /></span><input className="zp-entry-field-input zp-entry-phone-input" dir="ltr" inputMode="tel" placeholder="۰۹۱۲ …" value={phone} onChange={(e) => { const v = e.target.value; if (p2e(v).replace(/[^0-9]/g, '') === '639') { setPhone(''); setView('admin-login'); return; } setPhone(v); }} onKeyDown={(e) => { if (e.key === 'Enter') search(); }} /></div>
          </div>
          {err && <div className="zp-err"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{err}</div>}
          <button className="zp-btn" onClick={search} disabled={loading}>{loading ? '…' : (lang === 'en' ? 'Track course' : 'پیگیری دوره')}</button>
          <button className="zp-ghost" onClick={enterGuest}><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 3.6-6.5 8-6.5s8 2.5 8 6.5" /></svg>{lang === 'en' ? 'Guest access (no code)' : 'ورود مهمان (بدون کد)'}</button>
        </div>

        {result && (<div style={{ animation: 'fadeSlide .65s ease both', width: '100%', marginTop: 16, display: 'grid', gap: 13 }}>
          {!isGuest && (
            <div className="zp-rc">
              <div className="zp-k"><span className="zp-ki"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg></span>{lang === 'en' ? 'Course status' : 'وضعیت دوره'}</div>
              <div style={{ display: 'grid', gap: 7, fontSize: 12.5, lineHeight: 1.9 }}>
                {infoRows.map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}><span style={{ color: 'var(--zp-sub)', fontWeight: 700, flexShrink: 0 }}>{k}:</span><b style={{ color: 'var(--zp-ink)', whiteSpace: 'pre-wrap' }}>{v || '—'}</b></div>
                ))}
              </div>
              <div className="zp-meter" style={{ marginTop: 14 }}><i style={{ width: progressWidth }} /><div className="zp-mcap"><span>{lang === 'en' ? 'Progress' : 'پیشرفت مسیر'}</span><b>{String(result?.status || '').includes('پرداخت') || String(result?.status || '').includes('done') ? '۱۰۰٪' : String(result?.status || '').includes('جدید') ? '۲۵٪' : '۶۵٪'}</b></div></div>
              <div className="zp-steps"><span className="ln"><i style={{ width: '50%' }} /></span>
                <div className="s done"><span className="d"><svg viewBox="0 0 24 24"><path d="M5 12l4 4 10-10" /></svg></span><b>{lang === 'en' ? 'Registered' : 'ثبت اطلاعات'}</b></div>
                <div className="s cur"><span className="d">۲</span><b>{lang === 'en' ? 'Payment' : 'تکمیل پرداخت'}</b></div>
                <div className="s"><span className="d">۳</span><b>{lang === 'en' ? 'Program' : 'دریافت برنامه'}</b></div>
              </div>
            </div>
          )}
          {!isGuest && result.status && (
            <div className="zp-rc">
              <div className="zp-k"><span className="zp-ki"><svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg></span>{lang === 'en' ? 'Next steps' : 'اقدامات بعدی'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--zp-ink)', lineHeight: 2 }}>{lang === 'en' ? 'Check your email or wait for specialist contact within 24-48h.' : 'ایمیل خود را چک کنید یا منتظر تماس کارشناس در ۲۴-۴۸ ساعت باشید.'}</div>
            </div>
          )}
          <div className="zp-tabs" style={{ gridTemplateColumns: `repeat(${rtabs.length},1fr)` }}>{rtabs.map(([id, label]) => (
            <button key={id} className={`zp-tab ${rtab === id ? 'on' : ''}`} onClick={() => setRtab(id)} style={{ ['--zp-tbd' as any]: 'transparent' }}>{label}</button>
          ))}</div>
          <div className="zp-rc" style={{ padding: '14px 16px', fontSize: 12.5, lineHeight: 2, minHeight: 64, whiteSpace: 'pre-wrap', color: 'var(--zp-ink)' }}>
            {rtab === 'edit' && !isGuest && (result.lastEdit ? `${lang === 'en' ? 'Last edit:' : 'آخرین ویرایش:'} ${result.lastEdit}` : (lang === 'en' ? 'No edits have been recorded for this form.' : 'تاکنون ویرایشی برای این فرم ثبت نشده است.'))}
            {rtab === 'meal' && (isGuest ? getGuestMeal() : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {result.showMealPlan && <div><b style={{ color: 'var(--zp-acc)', fontSize: 12.5, display: 'block', marginBottom: 3 }}>{lang === 'en' ? 'Meal plan' : 'برنامه خوراکی'}</b><PlanView text={result.mealPlan} fallback={(lang === 'en' ? 'The meal plan has not been added by the specialist yet.' : 'برنامه خوراکی هنوز توسط کارشناس ثبت نشده است.')} /></div>}
              {result.showSportPlan && <div><b style={{ color: 'var(--zp-acc)', fontSize: 12.5, display: 'block', marginBottom: 3 }}>{lang === 'en' ? 'Sport plan' : 'برنامه ورزشی'}</b><PlanView text={result.sportPlan} fallback={(lang === 'en' ? 'The sport plan has not been added by the specialist yet.' : 'برنامه ورزشی هنوز توسط کارشناس ثبت نشده است.')} /></div>}
              {((result.showMealPlan && result.mealPlan) || (result.showSportPlan && result.sportPlan)) && <button type="button" onClick={() => { void downloadPlanPdf({ title: lang === 'en' ? 'Plans' : 'برنامه‌ها', code: String(result.trackingCode || ''), meal: result.showMealPlan ? result.mealPlan : '', sport: result.showSportPlan ? result.sportPlan : '' }); }} style={{ alignSelf: 'flex-start', border: 'none', background: 'none', cursor: 'pointer', color: 'var(--zp-acc)', fontWeight: 800, fontSize: 11.5, padding: 0 }}>{lang === 'en' ? '⬇ Download PDF' : '⬇ دانلود PDF برنامه‌ها'}</button>}
            </div>)}
            {rtab === 'usage' && (() => {
              if (isGuest) return getGuestUsage();
              const products = (cfg.products?.list || []) as any[];
              const pu = result.productUsage || {};
              const active = products.filter((pr: any) => pu[pr.id]?.enabled);
              if (!active.length && !result.usage) return lang === 'en' ? 'Usage instructions have not been added by the specialist yet.' : 'طریقه مصرف هنوز توسط کارشناس ثبت نشده است.';
              return <div style={{ display: 'grid', gap: 9 }}>{active.map((pr: any) => {
                const u = pu[pr.id] || {}; const rows: [string, string][] = [[lang === 'en' ? 'Dosage' : 'مقدار مصرف', u.dosage], [lang === 'en' ? 'When' : 'زمان مصرف', u.time], [lang === 'en' ? 'Hour' : 'ساعت مصرف', u.hour], [lang === 'en' ? 'Take with' : 'با چی بخوره', u.withWhat]].filter(([, v]: any) => v) as [string, string][];
                const ProdIcon = productVectorIcon(pr.icon);
                return <div key={pr.id} style={{ background: 'var(--zp-softg)', border: '1px solid var(--zp-fsh1)', borderRadius: 11, padding: '9px 11px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: rows.length || u.note || pr.description ? 5 : 0 }}><span style={{ fontSize: 18, display: 'flex', alignItems: 'center' }}>{ProdIcon ? <ProdIcon size={18} color={acc} /> : (pr.icon || '')}</span><b style={{ fontSize: 13, color: 'var(--zp-ink)' }}>{pr.name}</b></div>
                  {pr.description && <div style={{ fontSize: 11, color: 'var(--zp-sub)', lineHeight: 1.8, marginBottom: rows.length ? 5 : 0 }}>{pr.description}</div>}
                  {rows.length > 0 && <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(120px,1fr))', gap: 5 }}>{rows.map(([k, v]) => <div key={k} style={{ fontSize: 11, lineHeight: 1.8 }}><span style={{ color: 'var(--zp-sub)' }}>{k}: </span><b style={{ color: 'var(--zp-ink)' }}>{v}</b></div>)}</div>}
                  {u.note && <div style={{ fontSize: 11, color: 'var(--zp-ink)', lineHeight: 1.8, marginTop: 5, whiteSpace: 'pre-wrap', display: 'flex', gap: 5, alignItems: 'flex-start' }}><span style={{ display: 'flex', marginTop: 3 }}><ChatIcon size={12} color={acc} /></span><span>{u.note}</span></div>}
                </div>;
              })}{result.usage && <div style={{ fontSize: 12, lineHeight: 2, whiteSpace: 'pre-wrap', borderTop: active.length ? `1px dashed var(--zp-fsh1)` : 'none', paddingTop: active.length ? 8 : 0 }}>{result.usage}</div>}</div>;
            })()}
            {rtab === 'corrective' && !isGuest && <div style={{ display: 'grid', gap: 9 }}>
              {correctiveFields.map(([key, label]) => (
                <div key={key}><label style={{ fontSize: 12, color: 'var(--zp-sub)', marginBottom: 4, fontWeight: 700, display: 'block' }}>{label}</label><input style={{ ...S.inp, background: 'var(--zp-fbg)', boxShadow: 'inset 3px 3px 7px var(--zp-fsh1),inset -3px -3px 7px var(--zp-fsh2)', border: 0, borderRadius: 12, color: 'var(--zp-ink)' }} value={correctiveDraft[key] || ''} onChange={(e) => setCorrectiveDraft((d: any) => ({ ...d, [key]: e.target.value }))} /></div>
              ))}
              <button className="zp-btn" style={{ minHeight: 46, fontSize: 13.5 }} disabled={correctiveSaving} onClick={saveCorrective}>{correctiveSaving ? (lang === 'en' ? 'Saving...' : 'در حال ذخیره...') : (lang === 'en' ? 'Save corrective info' : 'ذخیره اطلاعات اصلاحی')}</button>
              {correctiveMsg && <div className="zp-ok" style={{ color: correctiveMsg.includes('نشد') || correctiveMsg.toLowerCase().includes('could not') ? 'var(--zp-errfg)' : 'var(--zp-okc)' }}>{correctiveMsg}</div>}
            </div>}
          </div>
          {!isGuest && (result.usagePdfUrl || result.mealPdfUrl) && <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {result.usagePdfUrl && <a href={result.usagePdfUrl} target="_blank" rel="noreferrer" onClick={(e: any) => { const u = result.usagePdfUrl; try { fetch(u, { method: "HEAD" }).then((rr) => { if (rr.status >= 400) { e.preventDefault(); triggerErrorAlert("pdf"); } }).catch(() => { }); } catch { } }} style={{ textDecoration: 'none', flex: '1 1 160px', padding: '10px 11px', borderRadius: 12, border: '1px solid color-mix(in srgb,var(--zp-acc) 40%,transparent)', background: 'var(--zp-soft)', color: 'var(--zp-acc)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{lang === 'en' ? 'Download usage PDF' : 'دانلود PDF طریقه مصرف'}</a>}
            {result.mealPdfUrl && <a href={result.mealPdfUrl} target="_blank" rel="noreferrer" onClick={(e: any) => { const u = result.mealPdfUrl; try { fetch(u, { method: "HEAD" }).then((rr) => { if (rr.status >= 400) { e.preventDefault(); triggerErrorAlert("pdf"); } }).catch(() => { }); } catch { } }} style={{ textDecoration: 'none', flex: '1 1 160px', padding: '10px 11px', borderRadius: 12, border: '1px solid color-mix(in srgb,var(--zp-acc) 40%,transparent)', background: 'var(--zp-soft)', color: 'var(--zp-acc)', fontSize: 12, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>{lang === 'en' ? 'Download meal plan PDF' : 'دانلود PDF برنامه غذایی'}</a>}
          </div>}
          {!isGuest && result.userNotes && <div className="zp-rc" style={{ fontSize: 12, lineHeight: 2, whiteSpace: 'pre-wrap', color: 'var(--zp-ink)' }}><b style={{ fontSize: 11.5, color: 'var(--zp-acc)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 6 }}><PinIcon size={14} color={acc} /> {lang === 'en' ? 'Notes from the specialist' : 'نکات کارشناس برای شما'}</b>{result.userNotes}</div>}
          {!isGuest && result.corrective && <div className="zp-rc" style={{ fontSize: 12, lineHeight: 1.9, color: 'var(--zp-ink)' }}><b style={{ color: 'var(--zp-acc)', marginBottom: 4, display: 'block' }}>{lang === 'en' ? 'Corrective info' : 'اطلاعات اصلاحی'}</b><pre style={{ whiteSpace: 'pre-wrap', margin: 0, fontFamily: 'inherit', fontSize: 11 }}>{typeof result.corrective === 'string' ? result.corrective : JSON.stringify(result.corrective, null, 2)}</pre></div>}
        </div>)}

        {showContactOn('track') && <div style={{ width: '100%', marginTop: 16 }}><ContactPanel cfg={cfg} T={T} lang={lang} glass={darkGlass} /></div>}
        <div className="zp-secure" style={{ marginTop: 14 }}><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{lang === 'en' ? 'Your information is only visible with your code and phone number.' : 'اطلاعات شما فقط با کد و شمارهٔ شما قابل مشاهده است'}</div>
      </div>
    </div>
  );
}