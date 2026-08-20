import { useState, useRef } from 'react';
import GlassTopBar from '../components/GlassTopBar';
import { biometricSupported, enrollAdminBiometric, hasAdminBiometric, verifyAdminBiometric } from '../utils/adminBiometric';
import { loginAdminSession, getAdminSessionToken, validateAdminSession } from '../utils/adminSession';
// Phase 3: VITE_ADMIN_PASSWORD removed — login only via admin-session Edge Function.
// ADMIN_PHONE and ADMIN_PASSWORD live in Supabase Edge Function secrets, never in frontend.
export default function AdminLoginPage({app}:{app:any}){
 const {T,css,setView,goHome,p2e,lang,setLang}=app;
 const [aPhone,setAPhone]=useState(''); const [aPwd,setAPwd]=useState(''); const [aErr,setAErr]=useState(''); const [showPwd,setShowPwd]=useState(false); const [bioBusy,setBioBusy]=useState(false);
 const phoneRef=useRef<HTMLInputElement>(null); const pwdRef=useRef<HTMLInputElement>(null);
 const done=()=>{setView('admin')};
 const ok=async()=>{
   const enteredPhone=(phoneRef.current?.value||aPhone||'').trim(); const enteredPassword=(pwdRef.current?.value||aPwd||'').trim();
   if(!enteredPhone||!enteredPassword){setAErr('شماره تماس و رمز عبور الزامی است');return;}
   // Phase 3: NO fallback — login only through admin-session Edge Function.
   // Hardcoded '1234' and '09125703684' fallbacks removed.
   try{
     await loginAdminSession(enteredPhone, enteredPassword);
     setAErr('');
     if(biometricSupported()&&!hasAdminBiometric()&&confirm('آیا ورود با اثر انگشت یا Face ID را روی این دستگاه فعال می‌کنید؟')){
       try{await enrollAdminBiometric(enteredPhone)}catch{}
     }
     done();
   }catch(e:any){
     setAErr(e?.message||'اتصال امن به سرور انجام نشد');
   }
 };
 const bio=async()=>{setBioBusy(true);setAErr('');try{
   // ابتدا اگر نشست معتبری در این دستگاه ذخیره شده، آن را با بیومتریک فعال کنیم (بدون نیاز به رمز)
   if(getAdminSessionToken()){
     const s=await validateAdminSession().catch(()=>({valid:false}));
     if(s&&s.valid){ done(); setBioBusy(false); return; }
   }
   // تأیید بیومتریک؛ اگر نشست معتبری موجود نباشد، باید یک‌بار با رمز وارد شوید (نشست برای دفعات بعد ذخیره می‌شود)
   if(await verifyAdminBiometric()){
     if(getAdminSessionToken()){ const s=await validateAdminSession().catch(()=>({valid:false})); if(s&&s.valid){ done(); setBioBusy(false); return; } }
     setAErr('برای اولین ورود روی این دستگاه، یک‌بار با شماره و رمز وارد شوید؛ ورود بعدی با اثر انگشت / Face ID انجام می‌شود.');
   } else setAErr('تأیید بیومتریک انجام نشد');
 }catch{setAErr('اثر انگشت یا Face ID تأیید نشد')}finally{setBioBusy(false)}};
 const mem=T.memphis||[T.soft,T.soft,T.soft];
 return (
  <div className="zkgl-root zkgl-has-topbar" dir="ltr" style={{['--zkgl-acc' as any]:T.acc||'#0F766E', position:'fixed', inset:0, zIndex:1500, alignItems:'center', overflowY:'auto'}}>
   <style>{css}</style>
   <GlassTopBar brand="Zeynalikid" lang={lang} setLang={setLang} onBack={goHome} backLabel={lang==='fa'?'بازگشت':'Back'} showLang={false} />
   {/* پس‌زمینه: گرادیان تم + ممفیس + تصویر محو + اورلی تیره */}
   <div className="zkgl-bg" style={{ background:`linear-gradient(150deg, ${T.bg}, ${T.sel||T.soft||T.bg})` }}>
    <svg aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid slice">
     <circle cx="8%" cy="14%" r="80" fill={mem[0]} opacity=".30"/>
     <circle cx="92%" cy="20%" r="52" fill={mem[1]} opacity=".24"/>
     <circle cx="86%" cy="84%" r="96" fill={mem[2]} opacity=".22"/>
     <circle cx="12%" cy="90%" r="40" fill={mem[0]} opacity=".24"/>
     <path d="M -5 60 Q 25 44 50 60 T 105 60" stroke={mem[1]} strokeWidth="3" fill="none" opacity=".26"/>
     <circle cx="50%" cy="8%" r="4" fill={mem[2]} opacity=".4"/>
     <circle cx="24%" cy="48%" r="3" fill={mem[0]} opacity=".35"/>
    </svg>
    <div style={{position:'absolute',inset:0,backgroundImage:'url(/images/asset13c-hero-mother-child.webp)',backgroundSize:'cover',backgroundPosition:'center',filter:'blur(6px)',opacity:.5}}/>
    <div style={{position:'absolute',inset:0,background:'linear-gradient(160deg, rgba(15,23,42,.72), rgba(15,23,42,.5))'}}/>
   </div>
   <div className="zkgl-col" style={{maxWidth:400}}>
    <div className="zkgl-card">
     <h2 className="zkgl-title">Admin Panel</h2>
     <p className="zkgl-sub">zeynalikid — restricted access</p>
     <div className="zkgl-field">
      <input className="zkgl-input" id="zkgl-al-phone" ref={phoneRef} dir="ltr" inputMode="tel" placeholder=" " value={aPhone} onChange={e=>setAPhone(p2e(e.target.value))} onKeyDown={e=>{if(e.key==='Enter')ok()}}/>
      <label className="zkgl-label" htmlFor="zkgl-al-phone">Phone</label>
     </div>
     <div className="zkgl-field">
      <input className="zkgl-input" id="zkgl-al-pass" ref={pwdRef} dir="ltr" type={showPwd?'text':'password'} placeholder=" " value={aPwd} onChange={e=>setAPwd(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok()}} style={{letterSpacing:'1px',paddingInlineEnd:64}}/>
      <label className="zkgl-label" htmlFor="zkgl-al-pass">Password</label>
      <button type="button" className="zkgl-eye" onClick={()=>setShowPwd(v=>!v)}>{showPwd?'Hide':'Show'}</button>
     </div>
     {aErr&&<div className="zkgl-err">{aErr}</div>}
     <button className="zkgl-btn" onClick={ok}>Login</button>
     {hasAdminBiometric()&&<button type="button" className="zkgl-ghost" onClick={bio} disabled={bioBusy}>{bioBusy?'در حال تأیید…':'ورود با اثر انگشت / Face ID'}</button>}
     <button type="button" className="zkgl-link" onClick={goHome}>بازگشت به صفحه اصلی</button>
    </div>
   </div>
  </div>
 );
}
