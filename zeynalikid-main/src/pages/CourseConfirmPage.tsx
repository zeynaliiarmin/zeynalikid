import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { courseSuccessMessages, getRandomMessageTracked } from '../config/successMessages';
import { getTrustFontSize } from '../utils/trustFont';
import TrackingCodeBox from '../components/ui/TrackingCodeBox';

function Summary({app}:{app:any}){
 const {cfg,T,lang,course,courseResult,fd,trVal,deliveryText,fullPhone}=app;
 const src=courseResult; const bank=src?.payment?.bank||(cfg.banks||[]).find((b:any)=>b.id===course.payment.bankId); const selected=src?.course||course.selected; const shipping=src?.shipping||course.form; const dest=src?.shipping?.dest||course.dest; const payment=src?.payment||course.payment; const childAge=src?.age||fd.age; const childGender=src?.gender||fd.gender; const receiver=src?.shipping?.receiver||course.form.receiver; const phone=src?.fullPhone||fullPhone(course.form.phoneCc,course.form.phone);
 return <div style={{display:'grid',gap:9,fontSize:12,lineHeight:1.9}}>{[[trVal('دوره'),lang==='en'?(selected?.titleEn||selected?.title):selected?.title],[trVal('مقصد'),dest==='iran'?trVal('ایران'):trVal('خارج از ایران')],[trVal('شهر/کشور'),dest==='iran'?shipping.city:shipping.country],[trVal('روش ارسال'),trVal(src?.shipping?.method||course.shippingMethod)],[trVal('زمان تحویل'),src?.shipping?.estimatedDelivery||deliveryText()],[trVal('فرزند'),`${childAge||'—'} ${trVal('سال')} / ${childGender==='male'?trVal('پسر'):trVal('دختر')}`],[trVal('والد/گیرنده'),receiver],[trVal('شماره'),phone],[trVal('فیش'),payment.receipt?trVal('بارگذاری شده'):payment.receiptText?'متن پیامک ثبت شده':trVal('بارگذاری نشده')]].map(([k,v]:any)=><div key={k} style={{background:T.inp,borderRadius:10,padding:'8px 10px',boxShadow:T.neuIn}}><span style={{color:T.mut}}>{k}: </span><b>{v||'—'}</b></div>)}</div>
}

export default function CourseConfirmPage({app}:{app:any}){
 const {cfg,T,S,css,lang,publicText,showContactOn,resetForm,setView,Stepper,ContactPanel}=app;
 const trackingCode=app.courseResult?.trackingCode;
 // اصلاح ۴۸: تفکیک جملات موفقیت دوره
 const successSentences = (cfg.courseSuccessSentences && Array.isArray(cfg.courseSuccessSentences) && cfg.courseSuccessSentences.length > 0)
   ? cfg.courseSuccessSentences
   : (cfg.successTrustSentences && Array.isArray(cfg.successTrustSentences) && cfg.successTrustSentences.length > 0)
     ? cfg.successTrustSentences.map((s:any)=> s.title || s.description || '')
     : courseSuccessMessages;
 const [message]=useState(()=>{try{const used=JSON.parse(sessionStorage.getItem('zkid_used_course_msgs')||'[]');const r=getRandomMessageTracked(successSentences,used);sessionStorage.setItem('zkid_used_course_msgs',JSON.stringify(r.newUsedIndices));return r.message}catch{return successSentences[Math.floor(Math.random()*successSentences.length)] || 'به جمع خانواده زینالیکید خوش آمدید'}});
 return <div style={S.page}><Helmet><title>ثبت‌نام دوره | زینالیکید</title><meta name="description" content="تکمیل ثبت‌نام دوره تخصصی رشد و تغذیه کودکان و نوجوانان" /><meta name="robots" content="noindex, follow" /></Helmet><style>{css}</style><div style={S.card}><Stepper step={5}/><h2 style={{color:T.ttl,fontSize:17,fontWeight:800}}>{publicText('finalConfirm','تأیید ثبت‌نام دوره')}</h2><div style={{background:`${T.ok}12`,borderRadius:12,padding:12,marginBottom:12,color:T.ok,fontSize:13,fontWeight:800,boxShadow:T.neuIn}}> {publicText('initialCourseDone','ثبت اولیه دوره انجام شد')}</div>{trackingCode&&<div style={{background:'#facc1518',borderRadius:12,padding:12,marginBottom:12,boxShadow:T.neuIn}}><div style={{fontSize:12,color:'#ca8a04',fontWeight:800,lineHeight:1.9,marginBottom:6}}>{lang==='en'?'Please save or write down your tracking code for the next steps:':'حتماً کد پیگیری را برای مراحل بعدی ذخیره یا یادداشت بفرمایید:'}</div><TrackingCodeBox trackingCode={trackingCode} T={T} lang={lang} label={lang==='en'?'Your tracking code:':'کد پیگیری شما:'} copiedLabel={publicText('copied','کپی شد')} copyLabel={publicText('copy','کپی')}/></div>}<Summary app={app}/><p style={{color:T.mut,fontSize:getTrustFontSize(String(message),13),lineHeight:1.7,margin:'12px 0 0',background:T.soft,borderRadius:12,padding:'9px 11px',boxShadow:T.neuIn,overflow:'hidden'}}>{message}</p><button style={{...S.btnGhost,marginTop:10}} onClick={()=>setView('courses')}>{lang==='en'?'Register a new course':'ثبت دوره جدید'}</button>{showContactOn('courseConfirm')&&<ContactPanel cfg={cfg} T={T} lang={lang}/>}</div></div>
}
