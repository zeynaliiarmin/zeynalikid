import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { courseSuccessMessages, getRandomMessageTracked } from '../config/successMessages';
import { getTrustFontSize } from '../utils/trustFont';
import TrackingCodeBox from '../components/ui/TrackingCodeBox';
import { HomeIcon } from '../components/Icons';

// بازطراحی: هماهنگ‌سازی کامل با CourseConfirmPage — تیک بزرگ گرادیانی (مطابق SuccessPage)
// و کادرهای نئومورفیک نرم (بدون بردر تیز) به‌جای رنگ‌های ساده قبلی.
// اصلاح ۴۸: تفکیک جملات موفقیت دوره و مشاوره
export default function CourseDonePage({app}:{app:any}){
 const {cfg,T,S,css,lang,publicText,showContactOn,resetForm,setView,ContactPanel}=app;
 const trackingCode=app.courseResult?.trackingCode;
 // اصلاح ۴۸: استفاده از courseSuccessSentences (مجزا)، fallback به successTrustSentences و سپس courseSuccessMessages
 const successSentences = (cfg.courseSuccessSentences && Array.isArray(cfg.courseSuccessSentences) && cfg.courseSuccessSentences.length > 0)
   ? cfg.courseSuccessSentences
   : (cfg.successTrustSentences && Array.isArray(cfg.successTrustSentences) && cfg.successTrustSentences.length > 0)
     ? cfg.successTrustSentences.map((s:any)=> s.title || s.description || '')
     : courseSuccessMessages;
 const [message]=useState(()=>{try{const used=JSON.parse(sessionStorage.getItem('zkid_used_course_msgs')||'[]');const r=getRandomMessageTracked(successSentences,used);sessionStorage.setItem('zkid_used_course_msgs',JSON.stringify(r.newUsedIndices));return r.message}catch{return successSentences[Math.floor(Math.random()*successSentences.length)] || 'به جمع خانواده زینالیکید خوش آمدید'}});
 return <div style={S.page}><Helmet><title>ثبت‌نام دوره | زینالیکید</title><meta name="description" content="تکمیل ثبت‌نام دوره تخصصی رشد و تغذیه کودکان و نوجوانان" /><meta name="robots" content="noindex, follow" /></Helmet><style>{css}</style><div style={{...S.card,maxWidth:460,textAlign:'center',padding:'20px 18px'}}>
  <div style={{margin:'2px auto 12px',width:78,height:78,borderRadius:'50%',background:'linear-gradient(135deg,#10b981,#06b6d4)',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 16px 38px rgba(16,185,129,.3), 4px 4px 10px rgba(0,0,0,.08)',animation:'modalIn .4s ease both'}}><svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6 9 17l-5-5"/></svg></div>
  <h2 style={{color:T.ttl,fontSize:17,fontWeight:800,margin:'0 0 5px'}}>{publicText('courseDone','ثبت‌نام دوره با موفقیت نهایی شد')}</h2>
  <p style={{color:T.mut,fontSize:12.5,lineHeight:1.8,margin:'0 0 8px'}}>{publicText('courseDoneSub','اطلاعات شما ثبت شد و در پنل مدیریت قابل مشاهده است.')}</p>
  {trackingCode&&<div style={{background:'#facc1518',borderRadius:12,padding:12,marginBottom:12,textAlign:'right',boxShadow:T.neuIn}}><div style={{fontSize:12,color:'#ca8a04',fontWeight:800,lineHeight:1.9,marginBottom:6}}>{lang==='en'?'Please save or write down your tracking code for the next steps:':'حتماً کد پیگیری را برای مراحل بعدی ذخیره یا یادداشت بفرمایید:'}</div><TrackingCodeBox trackingCode={trackingCode} T={T} lang={lang} label={lang==='en'?'Your tracking code:':'کد پیگیری شما:'} copiedLabel={publicText('copied','کپی شد')} copyLabel={publicText('copy','کپی')}/></div>}
  <p style={{color:T.mut,fontSize:getTrustFontSize(String(message),13),lineHeight:1.7,margin:'0 0 10px',textAlign:'right',background:T.soft,borderRadius:12,padding:'9px 11px',boxShadow:T.neuIn,overflow:'hidden'}}>{message}</p>
  <div style={{display:'flex',gap:8,justifyContent:'center',flexWrap:'wrap',marginBottom:10}}>
    <button style={{...S.btnGhost,padding:'11px 18px',display:'flex',alignItems:'center',gap:6}} onClick={()=>setView('home')}><HomeIcon size={16} color={T.acc}/>{lang==='en'?'Home':'خانه'}</button>
    <button style={S.btn} onClick={()=>setView('courses')}>{lang==='en'?'Register a new course':'ثبت دوره جدید'}</button>
  </div>
  {showContactOn('courseDone')&&<ContactPanel cfg={cfg} T={T} lang={lang}/>}
 </div></div>
}
