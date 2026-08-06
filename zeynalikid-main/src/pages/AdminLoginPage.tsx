import { useState, useRef } from 'react';

const ENV_ADMIN_PASSWORD = (import.meta.env.VITE_ADMIN_PASSWORD as string | undefined) || '';

export default function AdminLoginPage({app}:{app:any}){
 const {T,S,css,cfg,setView,publicText,goHome,Field,p2e}=app;
 const [aPhone,setAPhone]=useState(''); const [aPwd,setAPwd]=useState(''); const [aErr,setAErr]=useState(''); const [showPwd,setShowPwd]=useState(false);
 const phoneRef=useRef<HTMLInputElement>(null);
 const pwdRef=useRef<HTMLInputElement>(null);
 function Err({x}:{x:any}){return <div style={{fontSize:11,color:T.err,marginTop:4}}>{x}</div>}
 const ok=()=>{
   const phoneEl=document.querySelector('input[placeholder="09xxxxxxxxx"]') as HTMLInputElement|null;
   const pwdEl=document.querySelector('input[type="password"]') as HTMLInputElement|null;
   const enteredPhone=(phoneEl?.value||phoneRef.current?.value||aPhone||'').trim();
   const enteredPassword=(pwdEl?.value||pwdRef.current?.value||aPwd||'').trim();
   const adminPassword=cfg.adminPassword||ENV_ADMIN_PASSWORD;
   const isNormalLogin=!!cfg.adminPhone&&!!adminPassword&&enteredPhone===String(cfg.adminPhone)&&enteredPassword===String(adminPassword);
   const isEmergencyLogin=!!cfg.emergencyToken&&enteredPassword===String(cfg.emergencyToken);
   if(isNormalLogin||isEmergencyLogin){setAErr('');setView('admin')}else setAErr('Phone/password is incorrect')
 };
 return <div style={{...S.page,direction:'ltr'}}><style>{css}</style><div style={{...S.card,maxWidth:380,textAlign:'center'}}><h2 style={{color:T.ttl}}>Admin Panel</h2><p style={{color:T.mut,fontSize:12}}>zeynalikid — restricted access</p><Field label="Phone" value={aPhone} onChange={(v:string)=>setAPhone(p2e(v))} ph="09xxxxxxxxx"/><label style={{...S.lbl,textAlign:'left'}}>Password</label><div style={{position:'relative',marginBottom:12}}><input ref={pwdRef} type={showPwd?'text':'password'} style={{...S.inp,textAlign:'center',letterSpacing:showPwd?'1px':'4px'}} value={aPwd} onChange={e=>setAPwd(e.target.value)} onKeyDown={e=>{if(e.key==='Enter'){ok()}}}/><button onClick={()=>setShowPwd(v=>!v)} style={{position:'absolute',right:8,top:7,padding:7,border:0,background:'transparent',color:T.mut,cursor:'pointer'}}>{showPwd?'Hide':'Show'}</button></div>{aErr&&<Err x={aErr}/>}<button style={S.btn} onClick={ok}>Login</button><button style={{marginTop:12,border:0,background:'transparent',color:T.mut,cursor:'pointer',fontFamily:'inherit'}} onClick={goHome}>بازگشت به صفحه اصلی</button></div></div>
}
