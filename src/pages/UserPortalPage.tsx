// UserPortalPage — پنل کاربر: ثبت‌نام (شماره + نام واقعی + کد تأیید) / ورود با کد پیگیری / داشبورد
// زبان طراحی: نسخهٔ A (نئومورفیک گرم + بنفش + ممفیس) — اما چیدمان کاملاً متمایز از صفحهٔ پیگیری
import { useAppContext } from '../app/AppContext';
import { Fragment, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CountryCodePicker from '../components/CountryCodePicker';
import { getCountryFlag } from '../utils/phone';
import { isSupabaseConfigured } from '../lib/supabase';
import { portalStart, portalConfirm, portalLogin, portalHistory, portalPhonePreview, portalUpdateInfo } from '../lib/userPortalApi';
import { TURNSTILE_SITE_KEY, TRACKING_PREFIX } from '../config/project';
import TurnstileGate from '../components/TurnstileGate';
import {
  getUserSession, setUserSession, clearUserSession, normalizePhoneForServer, validateFullName,
  maskPhoneLocal, takePortalNext, setPortalNext, digitsOnly, getUserSession as readSession,
  normalizeLoginCode,
} from '../utils/userPortal';
import './portal.css';
import { designModeFromThemeId, warmZpVars } from '../theme/warmPalettes';
import { PlanView } from '../lib/PlanView';
import { downloadPlanPdf } from '../lib/planPdf';

type AuthView = 'login' | 'register';
type RegStep = 'form' | 'otp';

const EDIT_FIELDS: Array<[string, string, string]> = [
  ['childName', 'نام کودک', 'Child name'],
  ['age', 'سن', 'Age'],
  ['gender', 'جنسیت', 'Gender'],
  ['height', 'قد (سانتی‌متر)', 'Height (cm)'],
  ['weight', 'وزن (کیلوگرم)', 'Weight (kg)'],
  ['appetite', 'اشتها', 'Appetite'],
  ['sleep', 'خواب', 'Sleep'],
  ['activity', 'فعالیت روزانه', 'Daily activity'],
  ['disease', 'بیماری / عارضه / جراحی', 'Disease / surgery'],
  ['digest', 'دفع و اجابت مزاج', 'Digestion'],
  ['allergies', 'حساسیت غذایی', 'Food allergies'],
  ['medications', 'دارو', 'Medications'],
  ['notes', 'توضیحات تکمیلی', 'Additional notes'],
];

const empty = { o: 0, p: 0, c: 0 };

export default function UserPortalPage() {
  const app = useAppContext();
  const { cfg, T, css, lang, setLang, setView, p2e, countries, validPhone, fullPhone, phonePlaceholder } = app;
  const en = lang === 'en';
  const brand = String(cfg?.browserTitle || cfg?.siteTitle || (en ? 'ZeynaliKid' : 'زینالیکید')).replace(/[“”"]/g, '').trim();

  const [auth, setAuth] = useState<AuthView>('login');
  const [step, setStep] = useState<RegStep>('form');
  const [phone, setPhone] = useState('');
  const [cc, setCc] = useState('+98');
  const [code, setCode] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [otpPreview, setOtpPreview] = useState('');
  const [otpMode, setOtpMode] = useState<'off' | 'test' | 'live'>(String((cfg as any)?.userPortal?.otpMode || 'test') as any);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [session, setSession] = useState<any>(() => getUserSession());
  const [items, setItems] = useState<any[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [copied, setCopied] = useState(false);
  // R19: فیلترها، انتخاب رکورد، تب‌های چسبان، ویرایش، تگ معرفی‌کننده
  const [filter, setFilter] = useState('');
  const [selId, setSelId] = useState('');
  const [tabId, setTabId] = useState('');
  const [stuck, setStuck] = useState(false);
  const [advisor, setAdvisor] = useState('');
  const [editOn, setEditOn] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState('');
  const [editForm, setEditForm] = useState<Record<string, string>>({});
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const barRef = useRef<HTMLDivElement | null>(null);
  const [nextPath, setNextPath] = useState(() => takePortalNext());
  const [phonePreview, setPhonePreview] = useState('');
  // پذیرای همه شکل‌ها: FM-1x2tsvy / F1x2tsvy / M-1x2tsvy / 1x2tsvy / هر خطای فاصله و خط تیره
  // همان قاعدهٔ سرور: حذف نویز + گرفتن بدنهٔ کد از اولین رقم به بعد («FM-1x2»، «F 1x2»، «1x2» یکی می‌شوند)
  const codeCore = normalizeLoginCode;
  const faMinLetters = Math.max(2, Math.min(8, Number((cfg as any)?.userPortal?.minNameWords) || 3));
  const captchaOn = (cfg as any)?.userPortal?.captchaEnabled === true;
  const [captchaToken, setCaptchaToken] = useState('');
  const [captchaAttempt, setCaptchaAttempt] = useState(0);
  // هندلرها باید پایدار بمانند: اگر هر رندر تابع تازه‌ای بسازد، افکتِ گیت کپچا دوباره اجرا و
  // دوباره state را عوض می‌کند ⇒ حلقهٔ بی‌پایان رندر ⇒ کندی/قفل شدن کل گوشی.
  const onCaptchaVerify = useCallback((t: string) => setCaptchaToken(t), []);
  const onCaptchaReset = useCallback(() => setCaptchaToken(''), []);
  // فقط وقتی واقعاً ارسالی شکست می‌خورد کپچا از نو ساخته می‌شود
  const retryCaptcha = useCallback(() => { setCaptchaToken(''); setCaptchaAttempt((a) => a + 1); }, []);
  // درِ مخفی پنل مدیریت: فقط در فیلد شماره تماس و فقط وقتی کلّ مقدار دقیقاً ۶۳۹ باشد
  const onPhoneInput = (v: string) => {
    if (p2e(String(v || '')).replace(/[^0-9]/g, '') === '639') { setPhone(''); setView('admin-login'); return; }
    // تشخیص هوشمند کشور از خودِ شماره: 09xx / 9xx / 98xx / 0098 / ‎+98 → ایران؛ ‎+cc دیگر → سوییچ خودکار پرچم
    try {
      const dig = p2e(String(v || '')).replace(/\D/g, '');
      const isIrShape = (dig.length === 10 || dig.length === 11 || dig.length === 12 || dig.length === 14)
        && /^(0098)?(98)?0?9\d{9}$/.test(dig);
      if (isIrShape) { if (cc !== '+98') setCc('+98'); }
      else if (/^\s*\+/.test(String(v || '')) && dig.length >= 9) {
        const m = (countries || []).map((c: any) => ({ c, d: String(c.code || '').replace(/\D/g, '') }))
          .filter((x: any) => x.d.length >= 1 && x.d !== '98' && dig.startsWith(x.d))
          .sort((a: any, b: any) => b.d.length - a.d.length)[0];
        if (m && m.c.code !== cc) setCc(m.c.code);
      }
    } catch { /* بی‌خطر */ }
    setPhone(v);
  };
  const ctryNow = () => countries.find((c: any) => c.code === cc) || countries[0];

  useEffect(() => { setOtpMode(String((cfg as any)?.userPortal?.otpMode || 'test') as any); }, [cfg]);
  useEffect(() => { const s = readSession(); setSession(s); }, []);
  useEffect(() => {
    if (auth !== 'login') { setPhonePreview(''); return; }
    const core = codeCore(code);
    if (core.length < 4) { setPhonePreview(''); return; }
    const timer = window.setTimeout(async () => {
      try { const r = await portalPhonePreview(TRACKING_PREFIX + '-' + core.toLowerCase()); setPhonePreview(r.found && r.maskedPhone ? String(r.maskedPhone) : ''); }
      catch { setPhonePreview(''); }
    }, 550);
    return () => window.clearTimeout(timer);
  }, [code, auth]);
  const loadHistory = useCallback(async (s?: any) => {
    const sess = s || getUserSession();
    if (!sess) return;
    try {
      const r = await portalHistory(sess.phone, sess.code);
      setItems(r.items || []);
      setAdvisor(String((r as any).advisorName || ''));
    } catch (e: any) {
      // نشست محلی نامعتبر شد؟ فقط تاریخچه خراب است — کاربر همچنان وارد است
      console.warn('history failed', e);
    } finally { setLoaded(true); }
  }, []);
  useEffect(() => { if (session) void loadHistory(session); }, [session, loadHistory]);
  useEffect(() => {
    if (!selId) { setStuck(false); return; }
    const onScroll = () => {
      const s = sentinelRef.current, b = barRef.current;
      if (!s || !b) return;
      setStuck(b.getBoundingClientRect().top > s.getBoundingClientRect().bottom + 1);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    return () => { window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onScroll); };
  }, [selId, tabId, editOn]);

  // پالت اختصاصی همین دیزاین در همین حالت (روشن/تاریک) — دقیقاً از فایل design-A-warm
  const zpTheme = designModeFromThemeId(T.id);
  const zp = warmZpVars(zpTheme.design, zpTheme.dark);
  const darkGlass = zpTheme.dark;
  const acc = zp['--zp-acc'];
  const mem = [zp['--zp-mem0'], zp['--zp-mem1'], zp['--zp-mem2']];
  const rootVars: any = { ...zp };

  const doLogin = async () => {
    setErr(''); setBusy(true);
    try {
      const localNum = digitsOnly(phone);
      if (!validPhone(localNum, ctryNow())) throw new Error(en ? 'Enter a valid phone number for the selected country.' : 'شمارهٔ تماس برای کشور انتخاب‌شده معتبر نیست.');
      const ph = normalizePhoneForServer(fullPhone(cc, localNum));
      if (!ph) throw new Error(en ? 'Enter a valid phone number.' : 'شمارهٔ تماس معتبر وارد کنید.');
      if (captchaOn && !captchaToken) throw new Error(en ? 'Complete the security check first.' : 'ابتدا بررسی امنیتی را تکمیل کنید.');
      const core = codeCore(code);
      if (core.length < 4 || core.length > 20) throw new Error(en ? 'Enter the tracking code exactly as shown.' : 'کد پیگیری را دقیقاً وارد کنید.');
      const r = await portalLogin(ph, TRACKING_PREFIX + '-' + core.toLowerCase(), captchaToken);
      const s = { code: String(r.code), fullName: String(r.fullName), phone: ph, loginAt: Date.now() };
      setUserSession(s); setSession(s);
    } catch (e: any) { setErr(e?.message || 'خطا در ورود'); if (captchaOn) retryCaptcha(); } finally { setBusy(false); }
  };

  const doStart = async () => {
    setErr(''); setBusy(true);
    try {
      const localNum = digitsOnly(phone);
      if (!validPhone(localNum, ctryNow())) throw new Error(en ? 'Enter a valid phone number for the selected country.' : 'شمارهٔ تماس برای کشور انتخاب‌شده معتبر نیست.');
      const ph = normalizePhoneForServer(fullPhone(cc, localNum));
      if (!ph) throw new Error(en ? 'Enter a valid phone number.' : 'شمارهٔ تماس معتبر وارد کنید.');
      if (captchaOn && !captchaToken) throw new Error(en ? 'Complete the security check first.' : 'ابتدا بررسی امنیتی را تکمیل کنید.');
      const chk = validateFullName(fullName, lang, faMinLetters);
      if (!chk.ok) throw new Error(chk.error as string);
      // اگر مخاطب از لینک مشاور آمده، کد ارجاع همراه ثبت‌نام فرستاده می‌شود تا سمت مشاور ثبت شود
      const r = await portalStart(fullName, ph, captchaToken || undefined, String(app.referralConsultant?.referralCode || ''));
      if (r.exists) { setErr(en ? 'This phone number is already registered — please sign in.' : 'این شماره قبلاً ثبتنام کرده؛ لطفاً وارد شوید.'); setAuth('login'); return; }
      setOtpMode(String(r.otpMode || 'off') as any);
      setOtpPreview(String(r.otpPreview || ''));
      if (r.otpMode === 'off') {
        const s = { code: String(r.code), fullName: String(r.fullName || fullName), phone: ph, loginAt: Date.now() };
        setUserSession(s); setSession(s);
      } else {
        setStep('otp');
      }
    } catch (e: any) { setErr(e?.message || 'خطا در ثبتنام'); if (captchaOn) retryCaptcha(); } finally { setBusy(false); }
  };

  const doConfirm = async () => {
    setErr(''); setBusy(true);
    try {
      const ph = normalizePhoneForServer(fullPhone(cc, digitsOnly(phone)));
      const r = await portalConfirm(ph, otp.trim());
      const s = { code: String(r.code), fullName: String(r.fullName || fullName), phone: ph, loginAt: Date.now() };
      setUserSession(s); setSession(s); setStep('form');
    } catch (e: any) { setErr(e?.message || 'کد تأیید اشتباه است.'); } finally { setBusy(false); }
  };

  const logout = () => { clearUserSession(); setSession(null); setItems([]); setLoaded(false); setAuth('login'); setStep('form'); setOtp(''); };

  const copyCode = async () => {
    try { await navigator.clipboard.writeText(String(session?.code || '')); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* ignore */ }
  };

  const counts = useMemo<Record<string, number>>(() => {
    const list = items || [];
    return {
      courses: list.filter((x: any) => x.type === 'course').length,
      pending: list.filter((x: any) => /انتظار|جدید|ناقص/.test(String(x.status || ''))).length,
      consults: list.filter((x: any) => x.type === 'consultation').length,
    };
  }, [items]);
  const filtered = useMemo(() => {
    const list = items || [];
    if (filter === 'courses') return list.filter((x: any) => x.type === 'course');
    if (filter === 'consults') return list.filter((x: any) => x.type === 'consultation');
    if (filter === 'pending') return list.filter((x: any) => /انتظار|جدید|ناقص/.test(String(x.status || '')));
    return list;
  }, [items, filter]);
  const childFirst = (it: any): string => {
    const rows = (it && it.form) || [];
    const pick = (re: RegExp) => { const r = rows.find((f: any) => re.test(String(f.label || ''))); return r ? String(r.value || '').trim().split(/\s+/)[0] : ''; };
    return pick(/نام کودک|نام فرزند/) || pick(/نام و نام خانوادگی/);
  };

  const goto = (p: string) => { setNextPath(''); setView(p); };

  const I = ({ d, s = 17 }: { d: string; s?: number }) => (
    <svg viewBox="0 0 24 24" width={s} height={s} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>
  );

  return (
    <div className="zp-root" dir={lang === 'fa' ? 'rtl' : 'ltr'} style={{ ...rootVars, ['--zkgl-acc' as any]: acc }} aria-label="user-portal">
      <Helmet><title>{en ? `User portal | ${brand}` : `پنل کاربر | ${brand}`}</title><meta name="robots" content="noindex, follow" /></Helmet>
      <style>{css}</style>
      <div className="zp-bg"><div className="zp-fam" /><svg viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="8%" cy="12%" r="62" fill={mem[0] || '#F1E4FC'} opacity=".5" />
        <circle cx="94%" cy="70%" r="44" fill={mem[2] || '#E2F6EC'} opacity=".45" />
        <circle cx="20%" cy="82%" r="8" fill={mem[2] || '#E2F6EC'} opacity=".6" />
      </svg></div>
      {/* هدر صفحه: همان هدر صفحات عمومی (از App.tsx رندر می‌شود) */}

      <div className="zp-content">
        {!session && (
          <div className="zp-card" style={{ maxWidth: 400 }}>
            <div style={{ textAlign: 'center' }}>
              <span className="zp-chip"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9c0-.5 0-1-.1-1.4A7 7 0 0 1 12.5 3z" /></svg>{en ? 'USER PORTAL' : 'پنل کاربر'}</span>
            </div>
            <h1 className="zp-h1">{en ? 'Welcome' : 'به پنل کاربر خوش آمدید'}</h1>
            <p className="zp-sub">{en ? 'Sign in with your phone and tracking code, or register once to get your own tracking code.' : 'با شماره تماس و کد پیگیری وارد شوید؛ یا یکبار ثبتنام کنید تا کد پیگیری اختصاصی خودتان را بگیرید.'}</p>
            <div className="zp-tabs" style={{ gridTemplateColumns: '1fr 1fr' }}>
              <button type="button" className={`zp-tab ${auth === 'login' ? 'on' : ''}`} onClick={() => { setAuth('login'); setErr(''); }}>{en ? 'Sign in' : 'ورود'}</button>
              <button type="button" className={`zp-tab ${auth === 'register' ? 'on' : ''}`} onClick={() => { setAuth('register'); setErr(''); setStep('form'); }}>{en ? 'Register' : 'ثبتنام'}</button>
            </div>

            {auth === 'login' && (<>
              <div className="zp-field">
                <span className="zp-lbl">{en ? 'Tracking code' : 'کد پیگیری'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M4.5 7v10M8 7v10M10.5 7v6M13 7v10M15.5 7v6M19.5 7v10" /></span><input dir="ltr" inputMode="text" placeholder="12739" value={code} onChange={(e) => setCode(p2e(e.target.value).toUpperCase().replace(/[^A-Z0-9 -]/g, '').slice(0, 26))} onKeyDown={(e) => e.key === 'Enter' && doLogin()} style={{ fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: '2px' }} /><span className="zp-tag">{TRACKING_PREFIX}</span></div>
              </div>
              <div className="zp-field">
                <div className="zp-label"><span className="zp-lbl">{en ? 'Phone number' : 'شماره تماس'}</span>{phonePreview ? <small className="zp-lblpreview" aria-live="polite">{en ? 'Registered with:' : 'ثبت‌نام با:'} <b dir="ltr">{phonePreview}</b></small> : null}</div>
                <div className="zp-box"><span className="zp-fic"><I d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" /></span><input dir="ltr" inputMode="tel" placeholder={phonePlaceholder(cc, lang)} value={phone} onChange={(e) => onPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} /><CountryCodePicker flat T={T} countries={countries} lang={lang} value={cc} onChange={setCc} /></div>
              </div>
              {err && <div className="zp-err"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{err}</div>}
{captchaOn && <TurnstileGate key={`${auth}:${captchaAttempt}`} variant="auth" siteKey={TURNSTILE_SITE_KEY} lang={lang} T={T} includeCrypto={false} onVerify={onCaptchaVerify} onReset={onCaptchaReset} />}
              <button className="zp-btn" onClick={doLogin} disabled={busy}>{busy ? <span className="zp-dots" role="status" aria-label={en?'Please wait…':'در حال بررسی…'}><i/><i/><i/></span> : (en ? 'Sign in' : 'ورود به پنل')}</button>
              <button type="button" className="zp-link zp-underline" onClick={() => { setAuth('register'); setErr(''); setStep('form'); }}>{en ? 'Not registered yet? Create an account first' : 'اگر ثبت‌نام نکردید، ابتدا ثبت‌نام کنید'}</button>
            </>)}

            {auth === 'register' && step === 'form' && (<>
              <div className="zp-field">
                <span className="zp-lbl">{en ? 'Full name' : 'نام و نام خانوادگی'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M5 21a7 7 0 0 1 14 0" /></span><input placeholder={en ? 'e.g. Ali Mohammad Rezaei' : 'مثلاً: علی محمد رضایی'} value={fullName} onChange={(e) => setFullName(e.target.value)} /></div>
              </div>
              <div className="zp-field">
                <span className="zp-lbl">{en ? 'Phone number' : 'شماره تماس'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" /></span><input dir="ltr" inputMode="tel" placeholder={phonePlaceholder(cc, lang)} value={phone} onChange={(e) => onPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doStart()} /><CountryCodePicker flat T={T} countries={countries} lang={lang} value={cc} onChange={setCc} /></div>
              </div>
              {err && <div className="zp-err"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{err}</div>}
{captchaOn && <TurnstileGate key={`${auth}:${captchaAttempt}`} variant="auth" siteKey={TURNSTILE_SITE_KEY} lang={lang} T={T} includeCrypto={false} onVerify={onCaptchaVerify} onReset={onCaptchaReset} />}
              <button className="zp-btn" onClick={doStart} disabled={busy}>{busy ? <span className="zp-dots" role="status" aria-label={en?'Please wait…':'در حال ارسال…'}><i/><i/><i/></span> : (otpMode === 'off' ? (en ? 'Sign up' : 'ثبت‌نام') : (en ? 'Register and get the code' : 'ثبت‌نام و دریافت کد تأیید'))}</button>
              {otpMode !== 'off' && <div className="zp-hint">{en ? 'If you have not registered before, this button creates your profile.' : 'اگر تا حالا ثبت‌نام نکرده باشید، با زدن همین دکمه پروفایل شما ساخته می‌شود.'}</div>}
              {otpMode === 'test' && !busy && <div className="zp-secure" style={{ marginTop: 12 }}>حالت تست — پس از اتصال پنل پیامکی، کد برای شما پیامک میشود</div>}
            </>)}

            {auth === 'register' && step === 'otp' && (<>
              <h1 className="zp-h1" style={{ fontSize: 18 }}>{en ? 'Enter the verification code' : 'کد تأیید را وارد کنید'}</h1>
              <p className="zp-sub">{en ? `A 6-digit code was sent to ${maskPhoneLocal(normalizePhoneForServer(fullPhone(cc, digitsOnly(phone))))}` : `کد ۶ رقمی به شمارهٔ ${maskPhoneLocal(normalizePhoneForServer(fullPhone(cc, digitsOnly(phone))))} ارسال شد.`}</p>
              {otpMode === 'test' && otpPreview && (
                <div className="zp-note" style={{ marginBottom: 14, justifyContent: 'center' }}>
                  <svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /><path d="M9 12l2 2 4-4" /></svg>
                  <span>{en ? 'Test mode — your code:' : 'حالت تست — کد شما:'} <b style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: 3, fontSize: 16 }}>{otpPreview}</b></span>
                </div>
              )}
              <div className="zp-field">
                <span className="zp-lbl">{en ? 'Verification code' : 'کد تأیید'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M12 8v4M12 16h.01 M4 4h16v16H4z" /></span><input dir="ltr" inputMode="numeric" maxLength={6} placeholder="••••••" value={otp} onChange={(e) => setOtp(p2e(e.target.value).replace(/\D/g, '').slice(0, 6))} onKeyDown={(e) => e.key === 'Enter' && doConfirm()} style={{ fontFamily: 'ui-monospace,monospace', letterSpacing: 6, fontSize: 16 }} /></div>
              </div>
              {err && <div className="zp-err"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{err}</div>}
              <button className="zp-btn" onClick={doConfirm} disabled={busy}>{busy ? <span className="zp-dots" role="status" aria-label={en?'Please wait…':'در حال تأیید…'}><i/><i/><i/></span> : (en ? 'Verify and continue' : 'تأیید و ادامه')}</button>
              <button className="zp-link" onClick={() => { setStep('form'); setErr(''); }}>{en ? 'Change phone / resend' : 'تغییر شماره / ارسال دوباره'}</button>
            </>)}
          </div>
        )}

        {session && (<>
          {nextPath && (
            <div className="zp-note" style={{ marginBottom: 12, width: '100%' }}>
              <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6" /></svg>
              <span style={{ flex: 1 }}>{en ? 'You are signed in — continue your registration.' : 'وارد شدید — برای ادامهٔ ثبتنام، دوباره اقدام کنید.'}</span>
              <button type="button" className="zp-ghost" style={{ marginTop: 0, width: 'auto', minHeight: 38, padding: '8px 16px', fontSize: 12.5 }} onClick={() => { const p = nextPath; setPortalNext(''); setNextPath(''); goto(p); }}>{en ? 'Continue' : 'ادامهٔ ثبتنام'}</button>
            </div>
          )}
          <div className="zp-hero">
            <div style={{ display: 'flex', alignItems: 'center', gap: 13, position: 'relative', zIndex: 2 }}>
              <span className="zp-avatar">{String(session.fullName || '؟').trim().charAt(0)}</span>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 17, fontWeight: 900 }}>{session.fullName}</div>
                <div style={{ fontSize: 11.5, opacity: .85, marginTop: 2 }} dir="ltr">{maskPhoneLocal(session.phone)}</div>
              </div>
            </div>
            <button type="button" onClick={copyCode} className="zp-codechip" style={{ position: 'relative', zIndex: 2 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="9" width="12" height="12" rx="2.5" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
              <span style={{ fontSize: 11 }}>{en ? 'Your tracking code (tap to copy)' : 'کد پیگیری شما (برای کپی بزنید)'}</span>
              <b style={{ marginInlineStart: 'auto', fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: 2 }}>{session.code}</b>
            </button>
            {copied && <div style={{ position: 'relative', zIndex: 2, marginTop: 6, fontSize: 11, fontWeight: 800, opacity: .9 }}>{en ? 'Copied' : 'کپی شد'}</div>}
            {advisor ? <div className="zp-advchip">🤝 {en ? `Referred by ${advisor}` : `با معرفیِ ${advisor}`}</div> : null}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginBottom: 12 }}>
            <button className="zp-btn" style={{ minHeight: 46, fontSize: 13.5 }} onClick={() => goto('courses')}>{en ? 'Register a course' : 'ثبت دورهٔ جدید'}</button>
            <button className="zp-ghost" style={{ marginTop: 0, minHeight: 46, fontSize: 13.5 }} onClick={() => goto('form')}>{en ? 'Consultation' : 'درخواست مشاوره'}</button>
          </div>

          <div className="zp-stats">
            {([['courses', en ? 'Courses' : 'دوره‌ها'], ['pending', en ? 'Pending approval' : 'در انتظار تأیید'], ['consults', en ? 'Consultations' : 'مشاوره‌ها']] as Array<[string, string]>).map(([k, lbl]) => (
              <button key={k} type="button" className={`zp-stat zp-filt${filter === k ? ' on' : ''}`} onClick={() => { setFilter(filter === k ? '' : k); setSelId(''); setTabId(''); setEditOn(false); }}>
                <b>{counts[k]}</b><span>{lbl}</span>
              </button>
            ))}
          </div>

          {(() => {
            const sel = selId ? (filtered.find((x: any) => x.id === selId) || null) : null;
            const usage = sel?.usage || { rows: [], instructions: '' };
            const hasUsage = !!(sel && (String(usage.instructions || '').trim() || (usage.rows || []).length));
            const reports = sel?.reports || { followUps: [], corrective: [] };
            const hasCorr = !!(sel && sel.correctiveEnabled === true && (((reports.corrective || []).length) || ((reports.followUps || []).length)));
            const formRows: any[] = (sel && sel.form) || [];
            const childName = childFirst(sel);
            const tabs: Array<{ id: string; label: string }> = [];
            if (sel) {
              if (hasUsage) tabs.push({ id: 'usage', label: en ? 'Usage' : 'طریقه مصرف' });
              if (sel.mealPlan) tabs.push({ id: 'meal', label: en ? 'Meal plan' : 'برنامه غذایی' });
              if (sel.sportPlan) tabs.push({ id: 'sport', label: String(sel.sportPlan).trim().startsWith('🌳') ? (en ? 'Daily activity' : 'فعالیت روزانه') : (en ? 'Sport plan' : 'برنامه ورزشی') });
              tabs.push({ id: 'info', label: en ? 'Information' : 'اطلاعات' });
              if (hasCorr || sel.userNotes) tabs.push({ id: 'reports', label: en ? 'Reports' : 'گزارش‌ها' });
            }
            const activeTab = tabs.some((t) => t.id === tabId) ? tabId : (tabs[0]?.id || '');
            return (<>
              {sel && (
                <div className="zp-tabwrap">
                  <div ref={sentinelRef} style={{ height: 1 }} />
                  <div ref={barRef} className={`zp-rec-tabs${stuck ? ' zp-stuck' : ''}`} style={{ top: `calc(${Number((T as any)?.topbarHeight) || 64}px + var(--zk-safe-top, 0px))` }}>
                    <b className="zp-rec-tabs-title">{childName ? (en ? `${childName}’s plan` : `برنامه ${childName}جان`) : (en ? 'Record' : 'سابقه')}</b>
                    {tabs.map((t) => <button key={t.id} type="button" className={activeTab === t.id ? 'on' : ''} onClick={() => setTabId(t.id)}>{t.label}</button>)}
                    <button type="button" className="zp-rec-tabs-x" aria-label={en ? 'Close' : 'بستن'} onClick={() => { setSelId(''); setTabId(''); setEditOn(false); }}>×</button>
                  </div>
                  <div className="zp-rec-tab-body">
                    {activeTab === 'usage' && (
                      <div className="zp-sec"><b className="zp-sech">💊 {en ? 'Product usage instructions' : 'طریقهٔ مصرف محصولات'}</b>
                        {(usage.rows || []).map((u: any, ui: number) => (
                          <div key={ui} style={{ fontSize: 11.5 }}>
                            <b>{u.name}</b>
                            {(u.lines || []).map((ln: string, li: number) => <div key={li} style={{ color: 'var(--zp-sub)', paddingInlineStart: 8 }}>{ln}</div>)}
                          </div>
                        ))}
                        {usage.instructions ? <div style={{ fontSize: 11.5, whiteSpace: 'pre-wrap' }}>{usage.instructions}</div> : null}
                      </div>
                    )}
                    {activeTab === 'meal' && sel.mealPlan ? (<div className="zp-sec"><b className="zp-sech">🍽 {en ? 'Meal plan' : 'برنامه خوراکی'}</b><PlanView text={sel.mealPlan} small /></div>) : null}
                    {activeTab === 'sport' && sel.sportPlan ? (<div className="zp-sec"><b className="zp-sech">{String(sel.sportPlan).trim().startsWith('🌳') ? `🌳 ${en ? 'Daily activity (under 6)' : 'فعالیت روزانه (زیر ۶ سال)'}` : `🏃 ${en ? 'Sport plan' : 'برنامه ورزشی'}`}</b><PlanView text={sel.sportPlan} small /></div>) : null}
                    {activeTab === 'reports' && (
                      <div className="zp-sec"><b className="zp-sech">🛠 {en ? 'Reports & advisor notes' : 'گزارش‌ها و نکات کارشناس'}</b>
                        {(reports.followUps || []).map((fup: any) => <div key={fup.step} style={{ fontSize: 11.5 }}>{en ? `Step ${fup.step}: ` : `مرحلهٔ ${fup.step}: `}{fup.state}</div>)}
                        {(reports.corrective || []).map((c: any) => <div key={c.label} style={{ fontSize: 11.5 }}>{c.label}: <b>{c.value}</b></div>)}
                        {sel.userNotes ? <div style={{ whiteSpace: 'pre-wrap', fontSize: 11.5, marginTop: 4 }}>📝 {sel.userNotes}</div> : null}
                      </div>
                    )}
                    {activeTab === 'info' && (
                      <div className="zp-sec">
                        <b className="zp-sech">📋 {en ? 'Your submitted information' : 'اطلاعات ثبت‌شدهٔ شما'}</b>
                        {!editOn && (<>
                          <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '3px 10px', fontSize: 11.5 }}>
                            {formRows.map((f: any) => (<Fragment key={f.label}><span style={{ color: 'var(--zp-sub)', fontWeight: 700 }}>{f.label}</span><span style={{ color: 'var(--zp-ink)' }}>{f.value}</span></Fragment>))}
                          </div>
                          <button type="button" className="zp-ghost" style={{ marginTop: 8, minHeight: 34, fontSize: 12, width: 'max-content', paddingInline: 16 }} onClick={() => { const init: Record<string, string> = {}; for (const [key, faL, enL] of EDIT_FIELDS) { const want = en ? enL : faL; const r = formRows.find((f: any) => String(f.label || '').trim() === want || String(f.label || '').startsWith(want)); init[key] = key === 'gender' ? (String(r?.value || '').includes('دختر') || String(r?.value || '').toLowerCase() === 'girl' ? 'female' : (String(r?.value || '').includes('پسر') || String(r?.value || '').toLowerCase() === 'boy') ? 'male' : '') : String(r?.value || ''); } setEditForm(init); setEditErr(''); setEditOn(true); }}>{en ? '✏️ Edit information' : '✏️ ویرایش اطلاعات'}</button>
                        </>)}
                        {editOn && (
                          <div style={{ display: 'grid', gap: 8, marginTop: 4 }}>
                            {EDIT_FIELDS.map(([key, faL, enL]) => (
                              <label key={key} className="zp-edit-row"><span>{en ? enL : faL}</span>
                                {key === 'gender' ? (
                                  <select dir={en ? 'ltr' : 'rtl'} value={editForm[key] || ''} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))}>
                                    <option value="">{en ? 'No change' : 'بدون تغییر'}</option><option value="male">{en ? 'Boy' : 'پسر'}</option><option value="female">{en ? 'Girl' : 'دختر'}</option>
                                  </select>
                                ) : key === 'notes' ? (
                                  <textarea rows={3} value={editForm[key] ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
                                ) : (
                                  <input value={editForm[key] ?? ''} onChange={(e) => setEditForm((f) => ({ ...f, [key]: e.target.value }))} />
                                )}
                              </label>
                            ))}
                            {editErr ? <div className="zp-err" style={{ margin: 0 }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{editErr}</div> : null}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                              <button type="button" className="zp-btn" style={{ minHeight: 40, fontSize: 13 }} disabled={editBusy} onClick={async () => { if (!session) return; setEditBusy(true); setEditErr(''); try { await portalUpdateInfo(session.phone, session.code, String(sel.id), editForm); setEditOn(false); await loadHistory(session); } catch (e: any) { setEditErr(e?.message || (en ? 'Save failed.' : 'ذخیره نشد.')); } finally { setEditBusy(false); } }}>{editBusy ? (en ? 'Saving…' : 'ذخیره…') : (en ? 'Save changes' : 'ذخیرهٔ تغییرات')}</button>
                              <button type="button" className="zp-ghost" style={{ marginTop: 0, minHeight: 40, fontSize: 13 }} onClick={() => { setEditOn(false); setEditErr(''); }}>{en ? 'Cancel' : 'انصراف'}</button>
                            </div>
                            <small style={{ color: 'var(--zp-sub)', fontSize: 10.5, lineHeight: 1.8 }}>{en ? 'Changes are recorded in the expert panel as «edited» and are comparable with the previous version.' : 'تغییرات در پنل متخصص به‌عنوان «edited» ثبت می‌شود و با نسخهٔ قبلی قابل مقایسه است.'}</small>
                          </div>
                        )}
                      </div>
                    )}
                    {(formRows.length > 0 || hasUsage || sel.mealPlan || sel.sportPlan) ? (
                      <button type="button" className="zp-ghost" style={{ marginTop: 2, minHeight: 34, fontSize: 12 }} onClick={() => { void downloadPlanPdf({ title: sel.type === 'course' ? (en ? 'Course information' : 'اطلاعات دوره') : (en ? 'Consultation information' : 'اطلاعات مشاوره'), code: String(sel.code || sel.id || ''), meal: sel.mealPlan || '', sport: sel.sportPlan || '', userNotes: sel.userNotes || '', form: formRows, usage, reports: hasCorr ? reports : undefined }); }}>📄 {en ? 'Download full PDF' : 'دریافت PDF کامل پرونده'}</button>
                    ) : null}
                  </div>
                </div>
              )}
              <div style={{ width: '100%', display: 'grid', gap: 12 }}>
                <div className="zp-rc">
                  <div className="zp-k"><span className="zp-ki"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H4z M8 20h8" /></svg></span>{sel ? (en ? 'Select another record' : 'انتخاب رکورد دیگر') : (en ? 'My records' : 'سوابق من')}</div>
                  {!loaded && <div style={{ fontSize: 12, color: 'var(--zp-sub)' }}>{en ? 'Loading…' : 'در حال بارگذاری…'}</div>}
                  {loaded && filtered.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--zp-sub)', lineHeight: 2 }}>{en ? 'Nothing in this section yet — register a course or request a consultation.' : 'موردی در این دسته نیست — یک دوره ثبت کنید یا مشاوره بگیرید.'}</div>}
                  {filtered.map((it: any) => (
                    <button key={it.id} type="button" className={`zp-rec-row${selId === it.id ? ' sel' : ''}`} onClick={() => { if (selId === it.id) { setSelId(''); setTabId(''); setEditOn(false); } else { setSelId(it.id); setTabId(''); setEditOn(false); setEditErr(''); } }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: 1 }}>
                        <b style={{ fontSize: 13, color: 'var(--zp-ink)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{it.title}</b>
                        <span className="zp-sdot" style={{ padding: '3px 10px', fontSize: 10.5 }}><i />{it.status}</span>
                      </span>
                      <span style={{ fontSize: 11, color: 'var(--zp-sub)', fontWeight: 700, whiteSpace: 'nowrap' }}>{it.date}{it.amount ? ` · ${it.amount}` : ''}</span>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" style={{ flexShrink: 0, transform: en ? 'scaleX(-1)' : 'none', color: 'var(--zp-sub)' }}><path d="M9 6l6 6-6 6" /></svg>
                    </button>
                  ))}
                </div>
                <button type="button" className="zp-link" onClick={logout}>{en ? 'Sign out' : 'خروج از پنل'}</button>
              </div>
            </>);
          })()}
        </>)}

        {!isSupabaseConfigured && (
          <div className="zp-err" style={{ marginTop: 14, width: '100%' }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{en ? 'User portal requires server connection.' : 'پنل کاربر به اتصال سرور نیاز دارد.'}</div>
        )}
      </div>
    </div>
  );
}