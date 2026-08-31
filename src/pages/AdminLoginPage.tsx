// AdminLoginPage — ورود مدیریت (نسخهٔ A: نئومورفیک گرم + هدر کامل + بازگشت داخل همبرگر)
import { useAppContext } from '../app/AppContext';
import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import { biometricSupported, enrollAdminBiometric, hasAdminBiometric, verifyAdminBiometric } from '../utils/adminBiometric';
import { loginAdminSession, getAdminSessionToken, validateAdminSession } from '../utils/adminSession';
import './portal.css';
import { designModeFromThemeId, warmZpVars } from '../theme/warmPalettes';

export default function AdminLoginPage() {
  const app = useAppContext();
  const { T, css, setView, goHome, p2e, lang, setLang, cfg } = app;
  const en = lang === 'en';
  const brand = String(cfg?.browserTitle || cfg?.siteTitle || (en ? 'Admin' : 'مدیریت')).replace(/[“”"]/g, '').trim();
  const [aPhone, setAPhone] = useState(''); const [aPwd, setAPwd] = useState(''); const [aErr, setAErr] = useState(''); const [showPwd, setShowPwd] = useState(false); const [bioBusy, setBioBusy] = useState(false);
  const phoneRef = useRef<HTMLInputElement>(null); const pwdRef = useRef<HTMLInputElement>(null);
  const done = () => setView('admin');

  const ok = async () => {
    const enteredPhone = (phoneRef.current?.value || aPhone || '').trim(); const enteredPassword = (pwdRef.current?.value || aPwd || '').trim();
    if (!enteredPhone || !enteredPassword) { setAErr(en ? 'Phone number and password are required.' : 'شماره تماس و رمز عبور الزامی است'); return; }
    try {
      await loginAdminSession(enteredPhone, enteredPassword); setAErr('');
      if (biometricSupported() && !hasAdminBiometric() && confirm(en ? 'Enable fingerprint or Face ID sign-in on this device?' : 'آیا ورود با اثر انگشت یا Face ID را روی این دستگاه فعال میکنید؟')) {
        try { await enrollAdminBiometric(enteredPhone) } catch { }
      }
      done();
    } catch (e: any) { setAErr(e?.message || (en ? 'Secure connection failed.' : 'اتصال امن به سرور انجام نشد')); }
  };
  const bio = async () => {
    setBioBusy(true); setAErr('');
    try {
      if (getAdminSessionToken()) { const s = await validateAdminSession().catch(() => ({ valid: false })); if (s?.valid) { done(); return; } }
      if (await verifyAdminBiometric()) {
        if (getAdminSessionToken()) { const s = await validateAdminSession().catch(() => ({ valid: false })); if (s?.valid) { done(); return; } }
        setAErr(en ? 'Sign in once with your phone and password on this device; biometric sign-in will work afterwards.' : 'برای اولین ورود روی این دستگاه، یکبار با شماره و رمز وارد شوید؛ ورود بعدی با اثر انگشت / Face ID انجام میشود.');
      } else setAErr(en ? 'Biometric verification was not completed.' : 'تأیید بیومتریک انجام نشد');
    } catch { setAErr(en ? 'Fingerprint or Face ID was not verified.' : 'اثر انگشت یا Face ID تأیید نشد'); } finally { setBioBusy(false); }
  };

  // پالت اختصاصی همین دیزاین در همین حالت (روشن/تاریک) — دقیقاً از فایل design-A-warm
  // پوستهٔ این صفحه با دیزاین انتخابی سایت رنگ می‌شود، اما روشن/تاریک بودنش را
  // همان حالتِ پوستهٔ مدیریتی (T) تعیین می‌کند تا کارت و هدر با هم بمانند.
  const zpTheme = designModeFromThemeId(T.id);
  const zpDesign = String((app as any).publicDesign || zpTheme.design);
  const zpDark = zpTheme.dark;
  const zp = warmZpVars(zpDesign, zpDark);
  const acc = zp['--zp-acc'];
  const darkGlass = zpDark;
  const mem = [zp['--zp-mem0'], zp['--zp-mem1'], zp['--zp-mem2']];
  const rootVars: any = { ...zp };

  return (
    <div className="zp-root" dir={en ? 'ltr' : 'rtl'} style={{ ...rootVars, ['--zkgl-acc' as any]: acc, alignItems: 'center' }} aria-label="admin-login">
      <Helmet><title>{en ? `Admin sign in | ${brand}` : `ورود مدیریت | ${brand}`}</title><meta name="robots" content="noindex, nofollow" /></Helmet>
      <style>{css}</style>
      <div className="zp-bg"><div className="zp-fam" /><svg viewBox="0 0 390 800" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
        <circle cx="8%" cy="14%" r="80" fill={mem[0] || '#F1E4FC'} opacity=".5" />
        <circle cx="92%" cy="20%" r="52" fill={mem[1] || '#DCEFFC'} opacity=".4" />
        <circle cx="86%" cy="84%" r="96" fill={mem[2] || '#E2F6EC'} opacity=".4" />
        <circle cx="12%" cy="90%" r="40" fill={mem[0] || '#F1E4FC'} opacity=".45" />
      </svg></div>
      {/* هدر صفحه: همان هدر صفحات عمومی (از App.tsx رندر می‌شود) */}
      <div className="zp-content" style={{ justifyContent: 'center', paddingTop: 8 }}>
        <div className="zp-card" style={{ maxWidth: 400 }}>
          <div style={{ textAlign: 'center', marginBottom: 4 }}><span className="zp-chip"><svg viewBox="0 0 24 24"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /></svg>{en ? 'ADMIN ONLY' : 'فقط برای تیم مدیریت'}</span></div>
          <h1 className="zp-h1">{en ? 'Admin panel' : 'پنل مدیریت'}</h1>
          <p className="zp-sub">{en ? `${brand} — restricted access` : `${brand} — دسترسی محدود. ورود فقط برای مالک و تیم مجاز.`}</p>
          <div className="zp-field">
            <span className="zp-lbl">{en ? 'Phone number' : 'شماره تماس'}</span>
            <div className="zp-box"><span className="zp-fic"><svg viewBox="0 0 24 24"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3 19.5 19.5 0 0 1-6-6 19.8 19.8 0 0 1-3-8.7A2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.9.5 2.8.7a2 2 0 0 1 1.7 2z" /></svg></span><input className="zp-login-phone" dir="ltr" inputMode="tel" autoComplete="username" ref={phoneRef} placeholder="۰۹۱۲ …" value={aPhone} onChange={(e) => setAPhone(p2e(e.target.value))} onKeyDown={(e) => { if (e.key === 'Enter') ok(); }} /></div>
          </div>
          <div className="zp-field">
            <span className="zp-lbl">{en ? 'Password' : 'رمز عبور'}</span>
            <div className="zp-box"><span className="zp-fic"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="4" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg></span><input ref={pwdRef} dir="ltr" type={showPwd ? 'text' : 'password'} autoComplete="current-password" placeholder="••••••••" value={aPwd} onChange={(e) => setAPwd(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') ok(); }} style={{ letterSpacing: '2px' }} /><button type="button" className="zp-eye" onClick={() => setShowPwd(v => !v)}>{showPwd ? (en ? 'Hide' : 'پنهان') : (en ? 'Show' : 'نمایش')}</button></div>
          </div>
          {aErr && <div className="zp-err" role="alert"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9" /><path d="M12 8v4M12 16h.01" /></svg>{aErr}</div>}
          <button className="zp-btn" onClick={ok}>{en ? 'Sign in' : 'ورود به پنل'}</button>
          {hasAdminBiometric() && <button type="button" className="zp-ghost" onClick={bio} disabled={bioBusy}><svg viewBox="0 0 24 24"><path d="M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z" /><path d="M5 21a7 7 0 0 1 14 0" /></svg>{bioBusy ? (en ? 'Verifying…' : 'در حال تأیید…') : (en ? 'Fingerprint / Face ID' : 'ورود با اثر انگشت / Face ID')}</button>}
          <button type="button" className="zp-link" onClick={goHome}>{en ? 'Back to home' : 'بازگشت به صفحهٔ اصلی'}</button>
          <div className="zp-secure"><svg viewBox="0 0 24 24"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>{en ? 'Your session is encrypted · failed sign-ins are logged' : 'نشست شما رمزنگاری میشود · ورود ناموفق ثبت میشود'}</div>
        </div>
      </div>
    </div>
  );
}