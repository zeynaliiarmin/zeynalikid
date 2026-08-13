import { useState, useRef } from 'react';
import { biometricSupported, enrollAdminBiometric, hasAdminBiometric, verifyAdminBiometric } from '../utils/adminBiometric';
import { loginAdminSession } from '../utils/adminSession';
// Phase 3: VITE_ADMIN_PASSWORD removed — login only via admin-session Edge Function.
// ADMIN_PHONE and ADMIN_PASSWORD live in Supabase Edge Function secrets, never in frontend.
export default function AdminLoginPage({app}:{app:any}){
 const {T,S,css,setView,goHome,Field,p2e}=app;
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
 const bio=async()=>{setBioBusy(true);setAErr('');try{if(await verifyAdminBiometric())done();else setAErr('تأیید بیومتریک انجام نشد')}catch{setAErr('اثر انگشت یا Face ID تأیید نشد')}finally{setBioBusy(false)}};
 return <div style={{...S.page,direction:'ltr'}}><style>{css}</style><div style={{...S.card,maxWidth:380,textAlign:'center'}}><h2 style={{color:T.ttl}}>Admin Panel</h2><p style={{color:T.mut,fontSize:12}}>zeynalikid — restricted access</p><Field label="Phone" value={aPhone} onChange={(v:string)=>setAPhone(p2e(v))} ph="09xxxxxxxxx"/><label style={{...S.lbl,textAlign:'left'}}>Password</label><div style={{position:'relative',marginBottom:12}}><input ref={pwdRef} type={showPwd?'text':'password'} style={{...S.inp,textAlign:'center',letterSpacing:showPwd?'1px':'4px'}} value={aPwd} onChange={e=>setAPwd(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')ok()}}/><button type="button" onClick={()=>setShowPwd(v=>!v)} style={{position:'absolute',right:8,top:7,padding:7,border:0,background:'transparent',color:T.mut,cursor:'pointer'}}>{showPwd?'Hide':'Show'}</button></div>{aErr&&<div style={{fontSize:11,color:T.err,marginTop:4}}>{aErr}</div>}<button style={S.btn} onClick={ok}>Login</button>{hasAdminBiometric()&&<button type="button" style={{...S.btnGhost,marginTop:10,width:'100%'}} onClick={bio} disabled={bioBusy}>{bioBusy?'در حال تأیید…':'ورود با اثر انگشت / Face ID'}</button>}<button type="button" style={{marginTop:12,border:0,background:'transparent',color:T.mut,cursor:'pointer',fontFamily:'inherit'}} onClick={goHome}>بازگشت به صفحه اصلی</button></div></div>
}
