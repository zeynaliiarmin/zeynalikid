import { useAppContext } from '../app/AppContext';
import { useState, useRef } from 'react';
import { Helmet } from 'react-helmet-async';
import GlassTopBar from '../components/GlassTopBar';
import { biometricSupported, enrollAdminBiometric, hasAdminBiometric, verifyAdminBiometric } from '../utils/adminBiometric';
import { loginAdminSession, getAdminSessionToken, validateAdminSession } from '../utils/adminSession';

export default function AdminLoginPage(){
 const app=useAppContext();
 const {T,css,setView,goHome,p2e,lang,setLang,cfg}=app;
 const en=lang==='en';
 const brand=String(cfg?.browserTitle||cfg?.siteTitle||(en?'Admin':'مدیریت')).replace(/[“”"]/g,'').trim();
 const [aPhone,setAPhone]=useState(''); const [aPwd,setAPwd]=useState(''); const [aErr,setAErr]=useState(''); const [showPwd,setShowPwd]=useState(false); const [bioBusy,setBioBusy]=useState(false);
 const phoneRef=useRef<HTMLInputElement>(null); const pwdRef=useRef<HTMLInputElement>(null);
 const done=()=>setView('admin');
 const ok=async()=>{
   const enteredPhone=(phoneRef.current?.value||aPhone||'').trim(); const enteredPassword=(pwdRef.current?.value||aPwd||'').trim();
   if(!enteredPhone||!enteredPassword){setAErr(en?'Phone number and password are required.':'شماره تماس و رمز عبور الزامی است');return}
   try{
     await loginAdminSession(enteredPhone,enteredPassword);setAErr('');
     if(biometricSupported()&&!hasAdminBiometric()&&confirm(en?'Enable fingerprint or Face ID sign-in on this device?':'آیا ورود با اثر انگشت یا Face ID را روی این دستگاه فعال می‌کنید؟')){
       try{await enrollAdminBiometric(enteredPhone)}catch{}
     }
     done();
   }catch(e:any){setAErr(e?.message||(en?'Secure connection failed.':'اتصال امن به سرور انجام نشد'))}
 };
 const bio=async()=>{setBioBusy(true);setAErr('');try{
   if(getAdminSessionToken()){const s=await validateAdminSession().catch(()=>({valid:false}));if(s?.valid){done();return}}
   if(await verifyAdminBiometric()){
     if(getAdminSessionToken()){const s=await validateAdminSession().catch(()=>({valid:false}));if(s?.valid){done();return}}
     setAErr(en?'Sign in once with your phone and password on this device; biometric sign-in will work afterwards.':'برای اولین ورود روی این دستگاه، یک‌بار با شماره و رمز وارد شوید؛ ورود بعدی با اثر انگشت / Face ID انجام می‌شود.');
   }else setAErr(en?'Biometric verification was not completed.':'تأیید بیومتریک انجام نشد');
 }catch{setAErr(en?'Fingerprint or Face ID was not verified.':'اثر انگشت یا Face ID تأیید نشد')}finally{setBioBusy(false)}};
 const mem=T.memphis||[T.soft,T.soft,T.soft];
 const darkGlass=T.id==='admin-dark'||T.id==='dark';
 const pageOverlay=darkGlass?'linear-gradient(160deg, rgba(15,23,42,.78), rgba(15,23,42,.58))':'linear-gradient(160deg, rgba(248,250,252,.90), rgba(240,253,250,.84))';
 return <main className={`zkgl-root zkgl-has-topbar zkgl-mode-${darkGlass?'dark':'light'}`} dir={en?'ltr':'rtl'} style={{['--zkgl-acc' as any]:T.acc||'#0F766E',position:'fixed',inset:0,zIndex:1500,alignItems:'center',overflowY:'auto'}} aria-labelledby="admin-login-title">
   <Helmet><title>{en?`Admin sign in | ${brand}`:`ورود مدیریت | ${brand}`}</title><meta name="robots" content="noindex, nofollow" /></Helmet>
   <style>{css}</style>
   <GlassTopBar brand={brand} lang={lang} setLang={setLang} T={T} onBack={goHome} backLabel={en?'Back':'بازگشت'} showLang={false}/>
   <div className="zkgl-bg" style={{background:`linear-gradient(150deg, ${T.bg}, ${T.sel||T.soft||T.bg})`}}>
    <svg aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid slice"><circle cx="8%" cy="14%" r="80" fill={mem[0]} opacity=".30"/><circle cx="92%" cy="20%" r="52" fill={mem[1]} opacity=".24"/><circle cx="86%" cy="84%" r="96" fill={mem[2]} opacity=".22"/><circle cx="12%" cy="90%" r="40" fill={mem[0]} opacity=".24"/></svg>
    <div style={{position:'absolute',inset:0,backgroundImage:'url(/images/asset13c-hero-mother-child.webp)',backgroundSize:'cover',backgroundPosition:'center',filter:'blur(6px)',opacity:darkGlass?.5:.14}}/>
    <div style={{position:'absolute',inset:0,background:pageOverlay}}/>
   </div>
   <div className="zkgl-col" style={{maxWidth:400}}><div className="zkgl-card">
    <h1 id="admin-login-title" className="zkgl-title">{en?'Admin panel':'پنل مدیریت'}</h1>
    <p className="zkgl-sub">{en?`${brand} — restricted access`:`${brand} — دسترسی محدود`}</p>
    <div className="zkgl-field"><input className="zkgl-input" id="zkgl-al-phone" ref={phoneRef} dir="ltr" inputMode="tel" autoComplete="username" placeholder=" " value={aPhone} onChange={e=>setAPhone(p2e(e.target.value))} onKeyDown={e=>{if(e.key==='Enter')ok()}}/><label className="zkgl-label" htmlFor="zkgl-al-phone">{en?'Phone':'شماره تماس'}</label></div>
    <div className="zkgl-field"><input className="zkgl-input" id="zkgl-al-pass" ref={pwdRef} dir="ltr" type={showPwd?'text':'password'} autoComplete="current-password" placeholder=" " value={aPwd} onChange={e=>setAPwd(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok()}} style={{letterSpacing:'1px',paddingInlineEnd:64}}/><label className="zkgl-label" htmlFor="zkgl-al-pass">{en?'Password':'رمز عبور'}</label><button type="button" className="zkgl-eye" onClick={()=>setShowPwd(v=>!v)}>{showPwd?(en?'Hide':'پنهان'):(en?'Show':'نمایش')}</button></div>
    {aErr&&<div className="zkgl-err" role="alert">{aErr}</div>}
    <button className="zkgl-btn" onClick={ok}>{en?'Sign in':'ورود'}</button>
    {hasAdminBiometric()&&<button type="button" className="zkgl-ghost" onClick={bio} disabled={bioBusy}>{bioBusy?(en?'Verifying…':'در حال تأیید…'):(en?'Fingerprint / Face ID':'ورود با اثر انگشت / Face ID')}</button>}
    <button type="button" className="zkgl-link" onClick={goHome}>{en?'Back to home':'بازگشت به صفحه اصلی'}</button>
   </div></div>
  </main>;
}
