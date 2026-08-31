// UserPortalPage — پنل کاربر: ثبت‌نام (شماره + نام واقعی + کد تأیید) / ورود با کد پیگیری / داشبورد
// زبان طراحی: نسخهٔ A (نئومورفیک گرم + بنفش + ممفیس) — اما چیدمان کاملاً متمایز از صفحهٔ پیگیری
import { useAppContext } from '../app/AppContext';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import CountryCodePicker from '../components/CountryCodePicker';
import { getCountryFlag } from '../utils/phone';
import { isSupabaseConfigured } from '../lib/supabase';
import { portalStart, portalConfirm, portalLogin, portalHistory } from '../lib/userPortalApi';
import { TURNSTILE_SITE_KEY, TRACKING_PREFIX } from '../config/project';
import TurnstileGate from '../components/TurnstileGate';
import {
  getUserSession, setUserSession, clearUserSession, normalizePhoneForServer, validateFullName,
  maskPhoneLocal, takePortalNext, setPortalNext, digitsOnly, getUserSession as readSession,
} from '../utils/userPortal';
import './portal.css';
import { designModeFromThemeId, warmZpVars } from '../theme/warmPalettes';

type AuthView = 'login' | 'register';
type RegStep = 'form' | 'otp';

const empty = { o: 0, p: 0, c: 0 };

export default function UserPortalPage() {
  const app = useAppContext();
  const { cfg, T, css, lang, setLang, setView, p2e, countries, validPhone, fullPhone, phonePlaceholder } = app;
  const en = lang === 'en';
  const brand = String(cfg?.browserTitle || cfg?.siteTitle || (en ? 'Farzandman' : 'فرزند من')).replace(/[“”"]/g, '').trim();

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
  const [nextPath, setNextPath] = useState(() => takePortalNext());
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
    setPhone(v);
  };
  const ctryNow = () => countries.find((c: any) => c.code === cc) || countries[0];

  useEffect(() => { setOtpMode(String((cfg as any)?.userPortal?.otpMode || 'test') as any); }, [cfg]);
  useEffect(() => { const s = readSession(); setSession(s); }, []);
  useEffect(() => {
    if (!session) return;
    let alive = true;
    (async () => {
      try {
        const r = await portalHistory(session.phone, session.code);
        if (alive) { setItems(r.items || []); }
      } catch (e: any) {
        // نشست محلی نامعتبر شد؟ فقط تاریخچه خراب است — کاربر همچنان وارد است
        console.warn('history failed', e);
      } finally { if (alive) setLoaded(true); }
    })();
    return () => { alive = false; };
  }, [session]);

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
      const c = String(code).trim().toUpperCase();
      if (!/^(?:(?:FM|ZK)-?)?[A-Z0-9]{4,20}$/i.test(c)) throw new Error(en ? 'Enter the tracking code exactly as shown.' : 'کد پیگیری را دقیقاً وارد کنید.');
      const r = await portalLogin(phone, c, captchaToken);
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

  const stats = useMemo(() => {
    const list = items || [];
    return {
      all: list.length,
      pending: list.filter((x: any) => String(x.status || '').includes('انتظار') || String(x.status || '').includes('جدید') || String(x.status || '').includes('ناقص')).length,
      consults: list.filter((x: any) => x.type === 'consultation').length,
    };
  }, [items]);

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
                <span className="zp-lbl">{en ? 'Phone number' : 'شماره تماس'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" /></span><input dir="ltr" inputMode="tel" placeholder={phonePlaceholder(cc, lang)} value={phone} onChange={(e) => onPhoneInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && doLogin()} /><CountryCodePicker flat T={T} countries={countries} lang={lang} value={cc} onChange={setCc} /></div>
              </div>
              <div className="zp-field">
                <span className="zp-lbl">{en ? 'Tracking code' : 'کد پیگیری'}</span>
                <div className="zp-box"><span className="zp-fic"><I d="M4.5 7v10M8 7v10M10.5 7v6M13 7v10M15.5 7v6M19.5 7v10" /></span><input dir="ltr" inputMode="text" placeholder="12739" value={code} onChange={(e) => setCode(p2e(e.target.value).toUpperCase())} onKeyDown={(e) => e.key === 'Enter' && doLogin()} style={{ fontFamily: 'ui-monospace,Menlo,monospace', letterSpacing: '2px' }} /><span className="zp-tag">{TRACKING_PREFIX}</span></div>
              </div>
              {err && <div className="zp-err"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{err}</div>}
{captchaOn && <TurnstileGate key={`${auth}:${captchaAttempt}`} variant="auth" siteKey={TURNSTILE_SITE_KEY} lang={lang} T={T} includeCrypto={false} onVerify={onCaptchaVerify} onReset={onCaptchaReset} />}
              <button className="zp-btn" onClick={doLogin} disabled={busy}>{busy ? '…' : (en ? 'Sign in' : 'ورود به پنل')}</button>
              <button className="zp-ghost" onClick={() => { setAuth('register'); setErr(''); setStep('form'); }}>
                <svg viewBox="0 0 24 24"><path d="M12 5v14M5 12h14" /></svg>{en ? 'Register for the first time' : 'اولین بار است؛ ثبتنام کنید'}
              </button>
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
              <button className="zp-btn" onClick={doStart} disabled={busy}>{busy ? '…' : (en ? 'Send verification code' : 'ارسال کد تأیید')}</button>
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
              <button className="zp-btn" onClick={doConfirm} disabled={busy}>{busy ? '…' : (en ? 'Verify and continue' : 'تأیید و ادامه')}</button>
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
          </div>

          <div className="zp-stats">
            <div className="zp-stat"><b>{stats.all}</b><span>{en ? 'Records' : 'دورهها و فرمها'}</span></div>
            <div className="zp-stat"><b>{stats.pending}</b><span>{en ? 'Pending' : 'در انتظار پرداخت'}</span></div>
            <div className="zp-stat"><b>{stats.consults}</b><span>{en ? 'Consultations' : 'مشاورهها'}</span></div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, width: '100%', marginBottom: 16 }}>
            <button className="zp-btn" style={{ minHeight: 46, fontSize: 13.5 }} onClick={() => goto('courses')}>{en ? 'Register a course' : 'ثبت دورهٔ جدید'}</button>
            <button className="zp-ghost" style={{ marginTop: 0, minHeight: 46, fontSize: 13.5 }} onClick={() => goto('form')}>{en ? 'Consultation' : 'درخواست مشاوره'}</button>
          </div>

          <div style={{ width: '100%', display: 'grid', gap: 12 }}>
            <div className="zp-rc">
              <div className="zp-k"><span className="zp-ki"><svg viewBox="0 0 24 24"><path d="M4 4h16v12H4z M8 20h8" /></svg></span>{en ? 'My records' : 'سوابق من'}</div>
              {!loaded && <div style={{ fontSize: 12, color: 'var(--zp-sub)' }}>{en ? 'Loading…' : 'در حال بارگذاری…'}</div>}
              {loaded && items.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--zp-sub)', lineHeight: 2 }}>{en ? 'No records yet — register a course or request a consultation.' : 'هنوز سابقهای ثبت نشده — یک دوره ثبت کنید یا مشاوره بگیرید.'}</div>}
              {items.map((it: any) => (
                <div key={it.id} style={{ borderTop: '1px dashed var(--zp-fsh1)', padding: '10px 2px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <b style={{ fontSize: 13, color: 'var(--zp-ink)' }}>{it.title}</b>
                    <span className="zp-sdot" style={{ padding: '3px 10px', fontSize: 11, marginInlineStart: 'auto' }}><i />{it.status}</span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--zp-sub)', fontWeight: 700 }}>{it.date} {it.time && `· ${it.time}`}{it.amount ? ` · ${it.amount}` : ''}</div>
                </div>
              ))}
            </div>
            <button type="button" className="zp-link" onClick={logout}>{en ? 'Sign out' : 'خروج از پنل'}</button>
          </div>
        </>)}

        {!isSupabaseConfigured && (
          <div className="zp-err" style={{ marginTop: 14, width: '100%' }}><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{en ? 'User portal requires server connection.' : 'پنل کاربر به اتصال سرور نیاز دارد.'}</div>
        )}
      </div>
    </div>
  );
}