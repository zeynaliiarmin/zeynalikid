import { useAppContext } from '../app/AppContext';
import { validateFullName, getUserSession, splitE164 } from '../utils/userPortal';
import { useState, useRef, useEffect, useCallback, memo } from 'react';
import { Helmet } from 'react-helmet-async';
import { flagToEmoji, getCountryFlag } from '../utils/phone';

// اصلاح ۲۵: دکمه/مودال «درخواست ویرایش اطلاعات فرزندم را دارم» به صفحه اطلاعات فرزند (ChildInfoPage) منتقل شد.

// --- منتقل شده از ConsultationForm.tsx (مرحله ۴ - اصلاح ۱۶) ---
const p2e=(s:any)=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
function validPhone(local:string, country:any){const clean=p2e(local).replace(/[\s\-()]/g,''); if(!clean||/^(\d)\1+$/.test(clean)) return false; if(country?.code==='+98')return /^(0?9)\d{9}$/.test(clean); try{return new RegExp(country?.regex||'^\\d{7,}$').test(clean)}catch{return /^\d{7,}$/.test(clean)}}
const phoneExamples:Record<string,string>={'+98':'09123456789','+1':'2125550123','+44':'07700900000','+49':'030123456','+46':'0701234567','+41':'0791234567','+47':'41234567','+33':'0612345678','+61':'0412345678','+971':'0501234567','+90':'05321234567','+31':'0612345678','+91':'9876543210','+93':'0701234567','+':'Enter phone number'};
const phonePlaceholder=(code:string,lang:'fa'|'en')=>phoneExamples[code]||(lang==='en'?'Enter phone number':'شماره تماس');
function labelCountry(c:any,lang:any){return `${getCountryFlag(c)} ${lang==='en'?(c.nameEn||c.name):c.name} ${c.code}`}
function shortCountry(c:any){return `${getCountryFlag(c)} ${c.code}`}

function Popup({open,onClose,trigger,children,T,width}:{open:boolean,onClose:()=>void,trigger:any,children:any,T:any,width?:number|string}){const ref=useRef<HTMLDivElement|null>(null);const [place,setPlace]=useState<'top'|'bottom'>('bottom');useEffect(()=>{if(!open)return;const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()};const calc=()=>{const r=ref.current?.getBoundingClientRect();if(r){const below=window.innerHeight-r.bottom;setPlace(below<window.innerHeight*.38&&r.top>below?'top':'bottom')}};calc();document.addEventListener('mousedown',h);window.addEventListener('resize',calc);window.addEventListener('scroll',calc,true);return()=>{document.removeEventListener('mousedown',h);window.removeEventListener('resize',calc);window.removeEventListener('scroll',calc,true)}},[open,onClose]);return <div ref={ref} style={{position:'relative'}}>{trigger}{open&&<div style={{position:'absolute',top:place==='bottom'?'calc(100% + 6px)':'auto',bottom:place==='top'?'calc(100% + 6px)':'auto',left:0,right:'auto',zIndex:3000,width:width||260,maxWidth:'min(33vw, calc(100vw - 34px))',minWidth:180,maxHeight:'40vh',overflowY:'auto',overflowX:'hidden',background:T.pop,border:`1px solid ${T.brd}`,borderRadius:16,boxShadow:'0 18px 48px rgba(0,0,0,.16)',padding:8,animation:'fadeSlide .3s ease both'}}>{children}</div>}</div>}

const CountrySelect = memo(function CountrySelectCmp({value,onChange,countries,T,lang,small=true}:{value:string,onChange:(v:string)=>void,countries:any[],T:any,lang:'fa'|'en',small?:boolean}){const [open,setOpen]=useState(false);const choose=useCallback((v:string)=>{onChange(v);setOpen(false)},[onChange]);return <Popup open={open} onClose={()=>setOpen(false)} T={T} width={'33vw'} trigger={<button onClick={()=>setOpen((v:boolean)=>!v)} style={{height:44,minWidth:small?68:120,padding:'0 8px',background:T.inp,border:`1px solid ${T.brd}`,borderRadius:10,color:T.accText,cursor:'pointer',fontSize:14,fontFamily:'inherit',fontWeight:700,whiteSpace:'nowrap',order:-1}}>{shortCountry(countries.find((x:any)=>x.code===value)||countries[0])}</button>}>{countries.map((c:any)=><button key={c.id} onClick={()=>choose(c.code)} style={{display:'block',width:'100%',padding:'9px 10px',background:value===c.code?T.soft:'transparent',border:0,borderRadius:9,color:value===c.code?T.acc:T.txt,cursor:'pointer',textAlign:'right',fontFamily:'inherit',fontSize:13}}>{labelCountry(c,lang)}</button>)}</Popup>});
// --- پایان انتقال ---

export default function CourseShippingPage(){
 const app=useAppContext();
 const {cfg,T,S,css,lang,setView,fd,course,setCourse,countries,publicText,trVal,showContactOn,Field,Err,Stepper,ContactPanel,deliveryText}=app;
 const methods=(cfg.shippingMethods[course.dest]||[]).filter((m:any)=>m.active).sort((a:any,b:any)=>(a.order||0)-(b.order||0)); const method=methods.find((m:any)=>m.id===course.shippingMethod)||methods[0];
 // اصلاح ۲۴: اگر نام/شماره والد از فرم مشاوره موجود باشد، به‌صورت خودکار در این صفحه پر می‌شود.
 useEffect(()=>{
  if(!course.form.receiver && fd.pName) setCourse((c:any)=>({...c,form:{...c.form,receiver:fd.pName}}));
  if(!course.form.phone && fd.pPhone) setCourse((c:any)=>({...c,form:{...c.form,phoneCc:fd.cc||c.form.phoneCc,phone:fd.pPhone}}));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 // در حالت «پنل کاربر» گیرنده می‌تواند خودِ کاربر باشد؛ آن‌گاه نام و شمارهٔ تماس از حساب پر و قفل می‌شود
 // (مقادیر در رکورد ذخیره می‌شوند تا در پنل مدیریت مشخص باشد این ثبت‌نام برای کیست)
 const portalSession = String((cfg as any)?.entryMode||'track')==='user' ? getUserSession() : null;
 const [receiverSelf,setReceiverSelf]=useState<boolean>(()=>!!portalSession);
 // نشست تازه‌ساخته‌شده را وارد deps نمی‌کنیم (حلقهٔ رندر)؛ فقط کلید رشته‌ای + مقداردهی بی‌آزار
 const portalSessionKey = portalSession ? `${portalSession.fullName || ''}|${portalSession.phone || ''}` : '';
 useEffect(()=>{
  if(!receiverSelf||!portalSessionKey)return;
  const s=getUserSession(); if(!s)return;
  const parts=splitE164(s.phone,countries);
  setCourse((c:any)=>{const receiver=s.fullName||c.form.receiver;
   if(c.form.receiver===receiver&&c.form.phoneCc===parts.cc&&c.form.phone===parts.local)return c;
   return {...c,form:{...c.form,receiver,phoneCc:parts.cc,phone:parts.local}}});
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[receiverSelf,portalSessionKey]);
 const receiverToggle = portalSession ? <div style={{display:'flex',gap:8,marginBottom:12}}>
  {[{k:true,t:lang==='en'?'I am the receiver':'گیرنده خودم هستم'},{k:false,t:lang==='en'?'Someone else receives it':'گیرنده شخص دیگری است'}].map((o:any)=>(
   <button key={String(o.k)} type="button" aria-pressed={receiverSelf===o.k} onClick={()=>setReceiverSelf(o.k)} style={{flex:1,padding:'10px 8px',borderRadius:12,border:`1.5px solid ${receiverSelf===o.k?T.acc:T.brd}`,background:receiverSelf===o.k?`${T.acc}12`:'transparent',color:receiverSelf===o.k?T.acc:T.mut,fontWeight:800,fontSize:12.5,fontFamily:'inherit',cursor:'pointer'}}>{o.t}</button>))}
 </div> : null;
 const selfBox = portalSession ? <div dir="rtl" style={{marginBottom:12,padding:'9px 12px',borderRadius:13,background:`${T.acc}08`,border:`1px solid ${T.brd}`,display:'flex',alignItems:'center',gap:10}}>
  <span style={{fontSize:10.5,color:T.mut,fontWeight:700,flexShrink:0}}>{lang==='en'?'From your account':'از حساب شما'}</span>
  <b style={{fontSize:13,color:T.ttl,fontWeight:800,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{portalSession.fullName||'—'}</b>
  <span dir="ltr" style={{marginInlineStart:'auto',fontSize:12.5,color:T.accText,fontWeight:800,flexShrink:0}}>{portalSession.phone}</span>
 </div> : null;
 const validate=()=>{const e:any={}; const skipContact=receiverSelf&&!!portalSession; if(!skipContact&&!course.form.receiver){e.receiver=publicText('receiverRequired','نام گیرنده الزامی است')}else{const rv=validateFullName(course.form.receiver,lang,Math.max(2,Math.min(8,Number((cfg as any)?.userPortal?.minNameWords)||3)));if(!rv.ok)e.receiver=String(rv.error)} if(course.dest==='iran'&&!course.form.city)e.city=publicText('cityRequired','شهر مقصد الزامی است'); if(!course.form.address)e.address=publicText('addressRequired','آدرس الزامی است'); if((method?.requiresPostal||course.dest==='intl')&&!course.form.postalCode)e.postalCode=publicText('postalRequired','کد پستی الزامی است'); const ctry=countries.find((x:any)=>x.code===course.form.phoneCc)||countries[0]; if(!skipContact&&!validPhone(course.form.phone,ctry))e.phone=publicText('phoneInvalid','شماره تماس معتبر نیست'); if(course.dest==='intl'){const wc=cfg.whatsappNeedsCountryCode?(countries.find((x:any)=>x.code===course.form.whatsappCc)||countries[0]):{regex:'^\\d{7,}$'}; if(!validPhone(course.form.whatsapp,wc))e.whatsapp=publicText('whatsappRequired','شماره واتساپ معتبر و الزامی است')}; setCourse((c:any)=>({...c,errors:e})); if(Object.keys(e).length)return; setView('course-payment')};
 return <div style={S.page}><Helmet><title>ثبت‌نام دوره | زینالیکید</title><meta name="description" content="تکمیل ثبت‌نام دوره تخصصی رشد و تغذیه کودکان و نوجوانان" /><meta name="robots" content="noindex, follow" /></Helmet><style>{css}</style><div style={{...S.card, paddingTop:'10px'}}><Stepper step={3}/>
  <div style={{marginBottom:10}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:2}}>
      <div style={{width:26,height:26,borderRadius:999,background:`${T.acc}12`,display:'flex',alignItems:'center',justifyContent:'center'}}><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></svg></div>
      <div><div style={{fontSize:10.5,color:T.mut,fontWeight:600}}>{lang==='en'?'Step 3 of 5 • Shipping':'مرحله ۳ از ۵ • اطلاعات ارسال'}</div><div style={{fontSize:16.5,fontWeight:800,color:T.ttl}}>{publicText('shippingInfo','اطلاعات ارسال')}</div></div>
    </div>
    <div style={{background:`${T.acc}08`,borderRadius:14,padding:'6px 11px',fontSize:13,boxShadow:T.neuIn}}>{publicText('deliveryEstimate','برآورد زمان تحویل')}: <b style={{color:T.accText}}>{deliveryText()}</b></div>
  </div>{receiverToggle}{receiverSelf?(selfBox):(<Field required label={publicText('receiver','نام گیرنده')} value={course.form.receiver} onChange={(v:string)=>setCourse({...course,form:{...course.form,receiver:v}})} ph={publicText('receiver','نام گیرنده')}/>)}<div style={{display:'grid',gridTemplateColumns:'minmax(112px,30%) minmax(0,1fr)',gap:12,alignItems:'start'}}>{course.dest==='iran'?<Field required label={publicText('destinationCity','شهر مقصد')} value={course.form.city} onChange={(v:string)=>setCourse({...course,form:{...course.form,city:v}})} ph="تهران، کرج..."/>:<Field required label={publicText('destinationCountry','کشور مقصد')} value={course.form.country} onChange={(v:string)=>setCourse({...course,form:{...course.form,country:v}})} ph={lang==='en'?'Country':'کشور'}/>}{receiverSelf?(<div><label style={S.lbl}>{publicText("phone","شماره تماس")}</label><div dir="ltr" style={{fontSize:14,fontWeight:800,color:T.ttl,textAlign:"center"}}>{[course.form.phone, course.form.phoneCc].filter(Boolean).join(" ")}</div></div>) : (<div><label style={S.lbl}>{publicText('phone','شماره تماس')} <span style={{color:T.err}}>*</span></label><div style={{display:'flex',gap:5,direction:'ltr'}}><CountrySelect value={course.form.phoneCc} onChange={(v:string)=>setCourse({...course,form:{...course.form,phoneCc:v}})} countries={countries} T={T} lang={lang}/><input dir="ltr" style={{...S.inp,flex:1,minWidth:0}} value={course.form.phone} onChange={e=>{const raw=e.target.value;const cleaned=p2e(raw).replace(/[^0-9]/g,'');setCourse({...course,form:{...course.form,phone:cleaned}})}} onPaste={e=>{e.preventDefault();const pasted=e.clipboardData.getData('text');const cleaned=p2e(pasted).replace(/[^0-9]/g,'');setCourse({...course,form:{...course.form,phone:cleaned}})}} placeholder={phonePlaceholder(course.form.phoneCc,lang)} inputMode="numeric"/></div></div>)}</div>
 {course.dest==='intl'&&<div style={{marginBottom:12}}><label style={S.lbl}>شماره واتساپ یا تلگرام <span style={{color:T.err}}>*</span></label><div style={{display:'flex',gap:5,direction:'ltr'}}>{cfg.whatsappNeedsCountryCode&&<CountrySelect value={course.form.whatsappCc} onChange={(v:string)=>setCourse({...course,form:{...course.form,whatsappCc:v}})} countries={countries} T={T} lang={lang}/>}<input dir="ltr" style={{...S.inp,flex:1,minWidth:0}} value={course.form.whatsapp} onChange={e=>setCourse({...course,form:{...course.form,whatsapp:p2e(e.target.value).replace(/[^0-9+]/g,'')}})} placeholder="xxxxxxxxxxx" inputMode="numeric"/></div><div style={{fontSize:11,color:T.mut,marginTop:4}}>حتماً با کد کشور وارد شود</div></div>}
 {/* Stage 5: Beautiful selectable shipping cards (appearance only) */}
<label style={S.lbl}>{publicText('shippingMethod','روش ارسال')}</label>
<div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
  {methods.map((m: any) => {
    const isActive = course.shippingMethod === m.id;
    return (
      <button
        key={m.id}
        disabled={course.dest === 'intl' && methods.length === 1}
        onClick={() => setCourse({ ...course, shippingMethod: m.id })}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '8px 14px',
          borderRadius: 18,
          border: isActive ? `1.5px solid ${T.acc}` : `1px solid ${T.brd}`,
          background: isActive ? T.soft : 'transparent',
          color: isActive ? T.accText : T.mut,
          cursor: 'pointer',
          fontSize: 13,
          fontWeight: 700,
          fontFamily: 'inherit',
          whiteSpace: 'nowrap',
          minHeight: 38,
          transition: 'all 0.25s ease',
          boxShadow: isActive ? T.neuIn : 'none',
        }}
      >
        <span>{trVal(m.title)}</span>
        {m.tag && (
          <span
            style={{
              fontSize: 10,
              padding: '1px 7px',
              borderRadius: 999,
              background: T.ok,
              color: 'var(--zk-text-inverse, #fff)',
              fontWeight: 800,
            }}
          >
            {lang === 'en' ? (m.tagEn || m.tag) : m.tag}
          </span>
        )}
      </button>
    );
  })}
</div>
{course.dest !== 'intl' && !method?.requiresPostal && (
  <div
    style={{
      fontSize: 12,
      color: T.ok,
      background: `${T.ok}14`,
      border: `1px solid ${T.ok}33`,
      borderRadius: 12,
      padding: '10px 14px',
      marginBottom: 12,
      fontWeight: 700,
      display: 'flex',
      alignItems: 'center',
      gap: 7,
    }}
  >
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.ok} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
    <span>
      {lang === 'en'
        ? `No postal code needed for ${trVal(method?.title)} shipping.`
        : `برای ارسال با ${trVal(method?.title)} نیازی به وارد کردن کد پستی نیست.`}
    </span>
  </div>
)}{(method?.requiresPostal||course.dest==='intl')&&<div style={{marginBottom:13}}><label style={S.lbl}>{course.dest==='intl'?(/(usa|united states|america|آمریکا|کالیفرنیا|نیویورک|تگزاس|فلوریدا|california|new york|texas|florida)/i.test(String(course.form.country))?publicText('zipCode','ZIP Code'):(course.form.country?trVal('Postal Code'):trVal('Postal Code / ZIP Code'))):trVal('کد پستی')} <span style={{color:T.err}}>*</span></label><input style={S.inp} inputMode={course.dest==='iran'?'numeric':undefined} value={course.form.postalCode} onChange={e=>setCourse({...course,form:{...course.form,postalCode:e.target.value}})} placeholder={course.dest==='intl'?(/(usa|united states|america|آمریکا|california|new york|texas|florida)/i.test(String(course.form.country))?publicText('zipCode','ZIP Code'):(course.form.country?trVal('Postal Code'):trVal('Postal Code / ZIP Code'))):trVal('کد پستی')}/></div>}<label style={S.lbl}>{publicText('fullAddress','آدرس کامل')} <span style={{color:T.err}}>*</span></label><textarea style={S.ta} value={course.form.address} onChange={e=>setCourse({...course,form:{...course.form,address:e.target.value}})}/><div style={{background:T.card,borderRadius:14,padding:12,margin:'12px 0',fontSize:12,lineHeight:1.9,boxShadow:T.neuOut}}><b>{publicText('previousInfo','اطلاعات ثبت‌شده قبلی')}</b><br/>{lang==='en'?'Parent name':'نام والد'}: {fd.pName||course.form.receiver||'—'} / {publicText('phone','شماره تماس')}: <span dir="ltr" style={{display:'inline-block'}}>{(course.form.phone?`${course.form.phoneCc||''}${course.form.phone}`:fd.pPhone?`${fd.cc||''}${fd.pPhone}`:'—')}</span>{course.childInfo&&<><br/>{publicText('age','سن')}: {course.childInfo.age||'—'} / {publicText('gender','جنسیت')}: {course.childInfo.gender==='male'?publicText('boy','پسر'):course.childInfo.gender==='female'?publicText('girl','دختر'):'—'} / {lang==='en'?'Course':'دوره'}: {lang==='en'?(course.selected?.titleEn||course.selected?.title):course.selected?.title||'—'}</>}</div>{((cfg.referral||{}).showConsultantSelection===true)&&<div style={{background:T.card,borderRadius:14,padding:12,margin:'12px 0',boxShadow:T.neuOut}}><b style={{display:'block',marginBottom:8,fontSize:13,color:T.ttl}}>{lang==='en'?'Your advisor':'مشاور شما'}</b>{(cfg.consultants||[]).length?<div style={{display:'flex',flexWrap:'wrap',gap:8}}>{(cfg.consultants||[]).map((cn:any)=>{const sel=course.advisorId===cn.id;return <button key={cn.id} type="button" onClick={()=>setCourse((c:any)=>({...c,advisorId:sel?null:cn.id}))} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 12px',borderRadius:999,border:`1px solid ${sel?'var(--zk-primary)':'var(--zk-border)'}`,background:sel?'var(--zk-primary-light)':'var(--zk-surface)',color:'var(--zk-text)',cursor:'pointer',fontFamily:'inherit',fontSize:12.5,fontWeight:700}}>{cn.showPhoto!==false&&(cn.photoUrl||cn.aboutPhotoUrl)?<img src={cn.photoUrl||cn.aboutPhotoUrl} alt="" style={{width:26,height:26,borderRadius:'50%',objectFit:'cover'}}/>:null}{lang==='en'?(cn.nameEn||cn.name):cn.name}</button>})}</div>:<span style={{fontSize:11,color:T.mut}}>{lang==='en'?'No advisors configured yet.':'هنوز مشاوری ثبت نشده است.'}</span>}</div>}{Object.keys(course.errors||{}).map((k:string)=><Err key={k} x={course.errors[k]}/>) }<div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:12, position:'sticky', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: T.card, paddingTop:10, paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', zIndex:10, borderTop: `1px solid ${T.brd}`}}>
  <button style={S.btnGhost} onClick={()=>setView('courses')}>{publicText('backBtn','بازگشت')}</button>
  <button style={{...S.btn, minHeight:52}} onClick={validate}>{publicText('next','ادامه')}</button>
</div>{showContactOn('courseShipping')&&<ContactPanel cfg={cfg} T={T} lang={lang}/>}</div></div>
}
