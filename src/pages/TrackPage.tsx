import { useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import GlassTopBar from '../components/GlassTopBar';
import { isSupabaseConfigured } from '../lib/supabase';
import { PhoneIcon, PinIcon, ChatIcon, productVectorIcon } from '../components/Icons';

const getLS=(k:string,f:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
const SUPABASE_URL=(import.meta.env.VITE_SUPABASE_URL as string|undefined)||'';
const SUPABASE_ANON_KEY=(import.meta.env.VITE_SUPABASE_ANON_KEY as string|undefined)||'';
const digitsOnly=(v:any)=>String(v??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g,'');

// اصلاح ۳ (مرحله ۵): خواندن ساده و بدون اثر جانبی از sessionStorage (حذف مقادیر در useEffect انجام می‌شود، نه داخل initializer)
// تا در React.StrictMode که initializer های useState دوبار فراخوانی می‌شوند، مقدار پیش‌فرض به‌اشتباه خالی نشود (باگ ورود به صفحه پیگیری).
const readSessionOnce=(key:string)=>{try{return sessionStorage.getItem(key)||''}catch{return ''}};

// اصلاح ۳ (مرحله ۵): پیش‌نمایش شماره اکنون فقط بر اساس نتیجه واقعی (result.maskedPhone) ساخته می‌شود، نه ورودی خام کاربر.
const resultPhonePreview=(result:any)=>{if(!result)return ''; if(result.maskedPhone)return result.maskedPhone; const d=digitsOnly(result.fullPhone||''); if(d.length<7)return ''; const head=d.startsWith('98')?d.slice(0,5):d.slice(0,4); const tail=d.slice(-3); return `${head}xxxx${tail}`};

export default function TrackPage({app}:{app:any}){
 const {cfg,T,S,css,lang,setLang,setView,APP_A_URL,publicText,p2e,showContactOn,ContactPanel}=app;
 const digitCount=cfg.trackingDigitCount||5;
 // اصلاح ۳ (مرحله ۵): failCountRef/failMsg مبتنی بر ورودی خام کاربر حذف شد (نمایش شماره تأییدنشده روی خطا گمراه‌کننده بود)
 // رفع باگ ورود به صفحه پیگیری: initializer های useState قبلی هم می‌خواندند و هم بلافاصله sessionStorage را پاک می‌کردند؛
 // در React.StrictMode (توسعه) این initializer دوبار فراخوانی می‌شود و بار دوم مقدار را خالی می‌بیند. اکنون فقط خوانده می‌شود
 // و پاک‌سازی sessionStorage به useEffect زیر (که فقط یک‌بار در mount واقعی اجرا می‌شود) منتقل شده است.
 const [num,setNum]=useState(()=>readSessionOnce('zkid_track_prefill')); const [phone,setPhone]=useState(()=>readSessionOnce('zkid_track_phone_prefill')); const [result,setResult]=useState<any>(null); const [err,setErr]=useState(''); const [loading,setLoading]=useState(false); const [rtab,setRtab]=useState<'edit'|'meal'|'usage'|'corrective'>('edit');
 // اصلاح ۱۲: فیلدهای فرم اصلاحی — قابل ویرایش توسط کاربر در صورت فعال بودن showCorrectiveTab
 const [correctiveDraft,setCorrectiveDraft]=useState<any>({});
 const [correctiveSaving,setCorrectiveSaving]=useState(false);
 const [correctiveMsg,setCorrectiveMsg]=useState('');
 const [isGuest,setIsGuest]=useState(false);
 // ورودی: فقط اعداد بعد از ZK (ZK ثابت و غیرقابل حذف) — کد قدیمی هگز هم پذیرفته می‌شود
 // اصلاح ۳ (مرحله ۶): ورود مخفی به پنل مدیریت — اگر کاربر دقیقاً «639» را در فیلد کد پیگیری وارد کند، مستقیماً به صفحه ورود ادمین هدایت می‌شود.
 const onNumChange=(v:string)=>{const clean=p2e(v).toUpperCase().replace(/^ZK-?/,'').replace(/[^A-F0-9]/g,'').slice(0,8); if(clean==='639'){setNum('');setView('admin-login');return} setNum(clean)};
 const buildCode=()=>{const body=num.trim(); if(/^\d{4,8}$/.test(body))return `ZK${body}`; if(/^[A-F0-9]{6}$/.test(body))return `ZK-${body}`; return `ZK${body}`};
 // اصلاح: جستجو از Supabase اگر فعال است، وگرنه localStorage
 const localLookup=async(c:string,ph:string)=>{
  // اگر Supabase فعال است، از API استفاده کن
  if(isSupabaseConfigured && SUPABASE_URL && SUPABASE_ANON_KEY) {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/track-submission`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({ trackingCode: c, fullPhone: ph })
      });
      
      if (response.ok) {
        const data = await response.json();
        return { ...data, _trackingCodeRaw: c, _phoneRaw: ph };
      }
    } catch (e) {
      console.error('Supabase lookup failed:', e);
    }
  }
  
  // Fallback به localStorage
  const list:any[]=getLS('zkid_submissions_v2',[]);
  const found=list.find((x:any)=>String(x.trackingCode||'').toUpperCase()===c);
  if(!found)return {error:lang==='en'?'Phone number or tracking code is incorrect. Please try again.':'شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید.'};
  const sd=digitsOnly(found.fullPhone||''),id=digitsOnly(ph);
  const match=sd.length>=7&&id.length>=7&&(sd.endsWith(id)||id.endsWith(sd)||sd.slice(-10)===id.slice(-10));
  if(!match)return {error:lang==='en'?'Phone number or tracking code is incorrect. Please try again.':'شماره تماس یا کد پیگیری اشتباه است. لطفاً مجدداً بررسی کنید.'};
  const stored=String(found.fullPhone||'');
  const last3=sd.slice(-3);
  const maskedPhone=stored.startsWith('+98')||stored.startsWith('0098')?`09(xxxxxx)${last3}`:`${stored.match(/^(\+\d{1,3})/)?.[0]||''}(xxxxxx)${last3}`;
  const eh=found.editHistory||[];
  return {trackingCode:found.trackingCode,status:found.orderStatus||(found.payment?.receipt?'پرداخت‌شده':found.course?'در انتظار پرداخت':'جدید'),date:`${found.date||''} ${found.time||''}`.trim(),course:found.course?{title:found.course.title,titleEn:found.course.titleEn}:null,usage:found.usageInstructions||'',mealPlan:found.mealPlan||'',showMealPlan:found.showMealPlan===true,usagePdfUrl:found.usagePdfUrl||'',mealPdfUrl:found.mealPdfUrl||'',userNotes:found.userNotes||'',productUsage:found.productUsage||{},lastEdit:eh.length?`${eh[eh.length-1].date||''} ${eh[eh.length-1].time||''}`.trim():'',maskedPhone,canEdit:true, corrective: found.corrective||null, showCorrectiveTab: !!found.showCorrectiveTab, correctiveData: found.correctiveData||{}, _trackingCodeRaw:c, _phoneRaw:ph};
};
 // اصلاح ۳ (مرحله ۵): منطق جستجو ساده‌سازی شد — پیام خطا دیگر شماره خام واردشده کاربر را برنمی‌گرداند (چون تأییدنشده و می‌تواند
 // گمراه‌کننده باشد)؛ پیش‌نمایش شماره واقعی («شماره ثبت‌شده») فقط از result.maskedPhone بعد از جستجوی موفق ساخته می‌شود (رجوع به resultPhonePreview).
 // اصلاح ۳۹: نرمال‌سازی شماره تماس + لاگ دیباگ
 const normalizePhone=(raw:string)=>{let d=digitsOnly(raw); if(d.startsWith('0098'))d=d.slice(2); if(d.startsWith('98')&&d.length===12)d='0'+d.slice(2); if(!d.startsWith('0')&&d.startsWith('9')&&d.length===10)d='0'+d; return d.length>=7?`+98${d.startsWith('0')?d.slice(1):d}`:raw};
 const search=async()=>{const c=buildCode(); const rawPh=p2e(phone).replace(/[\s\-().]/g,'').trim(); const ph=normalizePhone(rawPh); setErr(''); setResult(null);
  if(!/^ZK\d{4,8}$/.test(c)&&!/^ZK-[A-F0-9]{6}$/.test(c)){setErr(lang==='en'?`Enter the ${digitCount}-digit code after ZK (e.g. ZK${'1'.repeat(Math.max(1,digitCount-4))}2345)`:`کد ${digitCount} رقمی بعد از ZK را وارد کنید (مثال: ZK${'۱'.repeat(Math.max(1,digitCount-4))}۲۳۴۵)`);return}
  if(digitsOnly(ph).length<7){setErr(lang==='en'?'Please enter the phone number used at registration.':'لطفاً شماره تماسی که هنگام ثبت وارد کردید را وارد کنید.');return}
  setLoading(true);
  try{
   if(isSupabaseConfigured&&SUPABASE_URL){
    try{
     const response=await fetch(`${SUPABASE_URL}/functions/v1/track-submission`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'apikey':SUPABASE_ANON_KEY},body:JSON.stringify({trackingCode:c,fullPhone:ph})});
     const data=await response.json().catch(()=>({error:'خطای سرور. لطفاً مجدداً تلاش کنید.'}));
     if(!response.ok){setErr(data?.error||(lang==='en'?'Not found.':'یافت نشد.'));return}
     setResult({...data,_trackingCodeRaw:c,_phoneRaw:ph});setIsGuest(false);setRtab('edit');return
    }catch{
     const r:any=await localLookup(c,ph); if(r.error){setErr(r.error)}else {setResult(r);setIsGuest(false);setRtab('edit')} return
    }
   }
   const r:any=await localLookup(c,ph); if(r.error){setErr(r.error)}else {setResult(r);setIsGuest(false);setRtab('edit')}
  }finally{setLoading(false)}};

 const enterGuest=()=>{
   // ورود مهمان — محتوای عمومی برنامه غذایی برای مهمان همیشه نمایش داده می‌شود (کنترل ادمین فقط برای فرم‌های ثبت‌شده واقعی است)
   setIsGuest(true);
   setErr('');
   setResult({
     trackingCode: 'GUEST',
     status: lang==='en'?'Guest':'مهمان',
     date: '',
     course: null,
     usage: '',
     mealPlan: '',
     showMealPlan: true,
     userNotes: '',
     productUsage: {},
     maskedPhone: '',
     canEdit: false,
     corrective: null
   });
   setRtab('meal');
 };

 // اصلاح ۱۲: تب «اصلاحی» فقط وقتی نمایش داده می‌شود که ادمین آن را برای این فرم فعال کرده باشد (result.showCorrectiveTab)
 // اصلاح ۴: تب «برنامه غذایی» فقط وقتی نمایش داده می‌شود که ادمین آن را برای این فرم فعال کرده باشد (result.showMealPlan===true)
 const mealTab:['meal',string]=['meal',lang==='en'?'Meal Plan':'برنامه غذایی'];
 const rtabs:[('edit'|'meal'|'usage'|'corrective'),string][] = isGuest
   ? [...(result?.showMealPlan?[mealTab]:[]),['usage',lang==='en'?'Usage':'طریقه مصرف']]
   : [['edit',lang==='en'?'Last Edit':'آخرین ویرایش'],...(result?.showMealPlan?[mealTab]:[]),['usage',lang==='en'?'Usage':'طریقه مصرف'],...(result?.showCorrectiveTab?[['corrective',lang==='en'?'Corrective':'اصلاحی'] as ['corrective',string]]:[])];

 // اصلاح ۱۲: فیلدهای فرم اصلاحی — با بازشدن نتیجه، مقادیر ذخیره‌شده قبلی در فرم بارگذاری می‌شود.
 useEffect(()=>{ if(result?.correctiveData) setCorrectiveDraft({...result.correctiveData}); },[result]);
 const correctiveFields:[string,string,string][]=[
  ['height', lang==='en'?'Height (cm)':'قد (سانتیمتر)', ''],
  ['weight', lang==='en'?'Weight (kg)':'وزن (کیلوگرم)', ''],
  ['appetite', lang==='en'?'Appetite':'اشتها', ''],
  ['sleep', lang==='en'?'Sleep':'خواب', ''],
  ['activity', lang==='en'?'Activity':'فعالیت', ''],
  ['exercise', lang==='en'?'Exercise':'ورزش', ''],
  ['puberty', lang==='en'?'Puberty':'بلوغ', ''],
  ['waterIntake', lang==='en'?'Water intake':'مصرف آب', ''],
  ['snacks', lang==='en'?'Snacks':'تنقلات', ''],
  ['parentsHeight', lang==='en'?"Parents' height":'قد والدین', ''],
  ['allergies', lang==='en'?'Allergies':'حساسیت‌ها', ''],
  ['diseases', lang==='en'?'Diseases':'بیماری‌ها', ''],
  ['medications', lang==='en'?'Medications':'داروها', ''],
  ['temperament', lang==='en'?'Temperament':'طبع', ''],
 ];
 const saveCorrective=async()=>{
  if(!result?._trackingCodeRaw||!result?._phoneRaw){setCorrectiveMsg(lang==='en'?'Unable to save; please search again.':'ذخیره ممکن نشد؛ لطفاً دوباره جستجو کنید.');setTimeout(()=>setCorrectiveMsg(''),3000);return}
  setCorrectiveSaving(true); setCorrectiveMsg('');
  try{
   if(isSupabaseConfigured&&SUPABASE_URL){
    const response=await fetch(`${SUPABASE_URL}/functions/v1/update-corrective`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON_KEY}`,'apikey':SUPABASE_ANON_KEY},body:JSON.stringify({trackingCode:result._trackingCodeRaw,fullPhone:result._phoneRaw,correctiveData:correctiveDraft})});
    const data=await response.json().catch(()=>({error:'خطای سرور'}));
    if(!response.ok){setCorrectiveMsg(data?.error||(lang==='en'?'Could not save.':'ذخیره انجام نشد.'));return}
    setResult((r:any)=>({...r,correctiveData:data.correctiveData||correctiveDraft}));
    setCorrectiveMsg(lang==='en'?'Saved successfully':'با موفقیت ذخیره شد');
   }else{
    // بدون Supabase: ذخیره محلی روی همان رکورد localStorage
    const list=getLS('zkid_submissions_v2',[]);
    const updated=list.map((x:any)=>String(x.trackingCode||'').toUpperCase()===result.trackingCode?{...x,correctiveData:{...(x.correctiveData||{}),...correctiveDraft}}:x);
    localStorage.setItem('zkid_submissions_v2',JSON.stringify(updated));
    setResult((r:any)=>({...r,correctiveData:{...(r.correctiveData||{}),...correctiveDraft}}));
    setCorrectiveMsg(lang==='en'?'Saved successfully':'با موفقیت ذخیره شد');
   }
  }catch{
   setCorrectiveMsg(lang==='en'?'Could not save.':'ذخیره انجام نشد.');
  }finally{
   setCorrectiveSaving(false);
   setTimeout(()=>setCorrectiveMsg(''),3000);
  }
 };

 // اصلاح ۱۳ و ۱۴: اگر از فیلد شناور هوم آمده باشیم، به‌صورت خودکار کد+شماره را ارسال یا حالت مهمان را فعال می‌کنیم.
 // اصلاح ۳ (مرحله ۵): رفع باگ ورود به صفحه پیگیری — پاک‌سازی تمام کلیدهای موقت sessionStorage (شامل prefill های کد/شماره)
 // اکنون یک‌جا و فقط در این useEffect (که تنها یک‌بار در mount واقعی اجرا می‌شود، نه در initializer های useState) انجام می‌شود.
 useEffect(()=>{
  try{
   const isGuestFlag=sessionStorage.getItem('zkid_track_guest');
   const isAutoFlag=sessionStorage.getItem('zkid_track_auto');
   sessionStorage.removeItem('zkid_track_guest');
   sessionStorage.removeItem('zkid_track_auto');
   sessionStorage.removeItem('zkid_track_prefill');
   sessionStorage.removeItem('zkid_track_phone_prefill');
   if(isGuestFlag){ enterGuest(); return; }
   if(isAutoFlag && num && digitsOnly(phone).length>=7){ search(); }
  }catch{}
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);

 // محتوای مهمان با fallback
 const getGuestMeal=()=>{
   if(cfg.guestMealPlan) return cfg.guestMealPlan;
   // fallback: توضیحات عمومی محصولات
   const products=(cfg.products?.list||[]) as any[];
   return products.map((p:any)=>`${p.name}: ${p.description||''}`).filter(Boolean).join('\n\n') || (lang==='en'?'The meal plan has not been added yet.':'برنامه غذایی هنوز ثبت نشده است.');
 };
 const getGuestUsage=()=>{
   if(cfg.guestUsage) return cfg.guestUsage;
   const products=(cfg.products?.list||[]) as any[];
   return products.map((p:any)=>`${p.name}: ${p.description||''}`).filter(Boolean).join('\n\n') || (lang==='en'?'Usage instructions have not been added yet.':'طریقه مصرف هنوز ثبت نشده است.');
 };

 const mem=T.memphis||[T.soft,T.soft,T.soft];
 return <div className="zkgl-root zkgl-has-topbar" dir={lang==='fa'?'rtl':'ltr'} style={{['--zkgl-acc' as any]:T.acc||'#0F766E'}}><Helmet><title>پیگیری ثبت‌نام | زینالیکید</title><meta name="description" content="وارد کردن کد پیگیری و مشاهده وضعیت ثبت‌نام دوره یا فرم مشاوره زینالیکید" /><meta name="robots" content="noindex, follow" /></Helmet><style>{css}</style><GlassTopBar brand={lang==='en'?'Zeynalikid':'زینالیکید'} lang={lang} setLang={setLang} onBack={()=>setView('home')} backLabel={lang==='en'?'Back':'بازگشت'} /><div className="zkgl-bg" style={{background:`linear-gradient(150deg, ${T.bg}, ${T.sel||T.soft||T.bg})`}}><svg aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%'}} preserveAspectRatio="xMidYMid slice"><circle cx="8%" cy="14%" r="80" fill={mem[0]} opacity=".3"/><circle cx="92%" cy="20%" r="52" fill={mem[1]} opacity=".24"/><circle cx="86%" cy="84%" r="96" fill={mem[2]} opacity=".22"/><circle cx="12%" cy="90%" r="40" fill={mem[0]} opacity=".24"/><path d="M -5 60 Q 25 44 50 60 T 105 60" stroke={mem[1]} strokeWidth="3" fill="none" opacity=".26"/><circle cx="50%" cy="8%" r="4" fill={mem[2]} opacity=".4"/><circle cx="24%" cy="48%" r="3" fill={mem[0]} opacity=".35"/></svg><div style={{position:'absolute',inset:0,backgroundImage:'url(/images/hero-default.webp)',backgroundSize:'cover',backgroundPosition:'center',filter:'blur(7px)',opacity:.4}}/><div style={{position:'absolute',inset:0,background:'linear-gradient(160deg, rgba(15,23,42,.72), rgba(15,23,42,.5))'}}/></div><div className="zkgl-col"><div className="zkgl-card"><h2 className="zkgl-title">{lang==='en'?'Track your registration':'پیگیری ثبت‌نام'}</h2><p className="zkgl-sub">{lang==='en'?'Enter your tracking code and the phone number used at registration.':'کد پیگیری و شماره تماسی که هنگام ثبت وارد کردید را وارد کنید.'}</p>
  <div className="zkgl-field" dir="ltr">
   <span className="zkgl-prefix">ZK</span>
   <input className="zkgl-input zkgl-has-prefix" id="zkgl-track-num" dir="ltr" inputMode="numeric" placeholder=" " value={num} onChange={e=>onNumChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}} maxLength={8} style={{fontFamily:'ui-monospace,SFMono-Regular,Menlo,monospace',letterSpacing:'3px'}}/>
   <label className="zkgl-label" htmlFor="zkgl-track-num" style={{insetInlineStart:34}}>{lang==='en'?'Tracking code':'کد پیگیری'}</label>
  </div>
  <div className="zkgl-field" dir="ltr">
   <input className="zkgl-input" id="zkgl-track-phone" dir="ltr" inputMode="tel" placeholder=" " value={phone} onChange={e=>setPhone(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')search()}}/>
   <label className="zkgl-label" htmlFor="zkgl-track-phone">{lang==='en'?'Phone number':'شماره تماس'}</label>
  </div>
  {/* اصلاح ۳ (مرحله ۵): پیام خطا دیگر شماره خام واردشده کاربر (تأییدنشده) را نمایش نمی‌دهد */}
  {err&&<div className="zkgl-err">{err}</div>}
  <button className="zkgl-btn" onClick={search} disabled={loading}>{loading?'...':(lang==='en'?'Track':'پیگیری')}</button>
  <button className="zkgl-ghost" onClick={enterGuest}>{lang==='en'?'Guest login':'ورود مهمان'}</button>
  </div>
  {result&&<div style={{animation:'fadeSlide .65s ease both'}}>
   {/* اصلاح ۳ (مرحله ۵): پیش‌نمایش شماره اکنون فقط پس از جستجوی موفق و از result.maskedPhone (شماره واقعی ثبت‌شده) ساخته می‌شود */}
   {!isGuest && resultPhonePreview(result)&&<div style={{position:'sticky',top:8,zIndex:10,background:T.pop,border:`1px solid ${T.acc}`,borderRadius:12,padding:'9px 12px',marginBottom:12,display:'flex',alignItems:'center',gap:8,boxShadow:'0 10px 26px rgba(0,0,0,.22)'}}><span style={{display:'flex',alignItems:'center'}}><PhoneIcon size={15} color={T.acc} /></span><span style={{fontSize:11,color:T.mut}}>{lang==='en'?'Registered phone:':'شماره ثبت‌شده:'}</span><b dir="ltr" style={{fontSize:13,color:T.acc,fontFamily:'monospace,-apple-system,"Courier New"',letterSpacing:'1px'}}>{resultPhonePreview(result)}</b></div>}
   {/* Stage 6 harmonized cards (Profile/Growth/Settings DS) */}
   {!isGuest && <div style={{display:'grid',gap:9,fontSize:12,lineHeight:1.9,marginBottom:12}}>{[[lang==='en'?'Tracking code':'کد پیگیری',result.trackingCode],[lang==='en'?'Status':'وضعیت سفارش',result.status],[lang==='en'?'Registration date':'تاریخ ثبت',result.date],...(result.course?[[lang==='en'?'Course':'دوره ثبت‌شده',lang==='en'?(result.course.titleEn||result.course.title):result.course.title]]:[])].map(([k,v]:any)=><div key={k} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,padding:'10px 13px',boxShadow:T.neuOut}}><span style={{color:T.mut}}>{k}: </span><b style={{whiteSpace:'pre-wrap'}}>{v||'—'}</b></div>)}</div>}

   {/* Stage 6: Progress bar + timeline (UI harmonization only) */}
   {!isGuest && result.status && (
     <div style={{marginBottom:12, background:T.card, border:`1px solid ${T.brd}`, borderRadius:14, padding:'10px 13px', boxShadow:T.neuOut}}>
       <div style={{fontSize:11, color:T.mut, marginBottom:6, fontWeight:700}}>{lang==='en'?'Progress' : 'پیشرفت'}</div>
       <div style={{height:6, background:T.soft, borderRadius:999, overflow:'hidden'}}>
         <div style={{height:'100%', width: result.status.includes('پرداخت') || result.status.includes('done') ? '100%' : result.status.includes('جدید') ? '25%' : '65%', background:T.acc, transition:'width .4s'}} />
       </div>
       <div style={{fontSize:10, color:T.mut, marginTop:4}}>{result.status}</div>
     </div>
   )}

   {/* Stage 6 harmonized: Next actions card */}
   {!isGuest && <div style={{background:T.card, border:`1px solid ${T.brd}`, borderRadius:14, padding:'11px 13px', boxShadow:T.neuOut, marginBottom:8}}>
     <div style={{fontSize:11, fontWeight:700, color:T.ttl, marginBottom:6}}>{lang==='en' ? 'Next steps' : 'اقدامات بعدی'}</div>
     <div style={{fontSize:12, color:T.mut, lineHeight:1.5}}>
       {lang==='en' ? 'Check your email or wait for specialist contact within 24-48h.' : 'ایمیل خود را چک کنید یا منتظر تماس کارشناس در ۲۴-۴۸ ساعت باشید.'}
     </div>
   </div>}
   <div style={{display:'grid',gridTemplateColumns:`repeat(${rtabs.length},1fr)`,gap:6,marginBottom:10}}>{rtabs.map(([id,label])=><button key={id} onClick={()=>setRtab(id)} style={{padding:'9px 6px',borderRadius:12,border:`1px solid ${rtab===id?T.acc:T.brd}`,background:rtab===id?T.soft:'transparent',color:rtab===id?T.acc:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,transition:'all .65s'}}>{label}</button>)}</div>
   <div style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:12,padding:12,fontSize:12.5,lineHeight:2,whiteSpace:'pre-wrap',minHeight:64,animation:'fade .65s ease both'}}>
    {rtab==='edit' && !isGuest && (result.lastEdit?`${lang==='en'?'Last edit:':'آخرین ویرایش:'} ${result.lastEdit}`:(lang==='en'?'No edits have been recorded for this form.':'تاکنون ویرایشی برای این فرم ثبت نشده است.'))}
    {rtab==='meal'&&(isGuest ? getGuestMeal() : (result.mealPlan||(lang==='en'?'The meal plan has not been added by the specialist yet.':'برنامه غذایی هنوز توسط کارشناس ثبت نشده است.')))}
    {rtab==='usage'&&(()=>{if(isGuest){return getGuestUsage()} const products=(cfg.products?.list||[]) as any[];const pu=result.productUsage||{};const active=products.filter((pr:any)=>pu[pr.id]?.enabled);if(!active.length&&!result.usage)return lang==='en'?'Usage instructions have not been added by the specialist yet.':'طریقه مصرف هنوز توسط کارشناس ثبت نشده است.';return <div style={{display:'grid',gap:9}}>{active.map((pr:any)=>{const u=pu[pr.id]||{};const rows:[string,string][]=[[lang==='en'?'Dosage':'مقدار مصرف',u.dosage],[lang==='en'?'When':'زمان مصرف',u.time],[lang==='en'?'Hour':'ساعت مصرف',u.hour],[lang==='en'?'Take with':'با چی بخوره',u.withWhat]].filter(([,v]:any)=>v) as [string,string][];const ProdIcon=productVectorIcon(pr.icon); return <div key={pr.id} style={{background:T.inp,border:`1px solid ${T.brd}`,borderRadius:11,padding:'9px 11px'}}><div style={{display:'flex',alignItems:'center',gap:7,marginBottom:rows.length||u.note||pr.description?5:0}}><span style={{fontSize:18,display:'flex',alignItems:'center'}}>{ProdIcon?<ProdIcon size={18} color={T.acc}/>:(pr.icon||'')}</span><b style={{fontSize:13,color:T.ttl}}>{pr.name}</b></div>{pr.description&&<div style={{fontSize:11,color:T.mut,lineHeight:1.8,marginBottom:rows.length?5:0}}>{pr.description}</div>}{rows.length>0&&<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:5}}>{rows.map(([k,v])=><div key={k} style={{fontSize:11,lineHeight:1.8}}><span style={{color:T.mut}}>{k}: </span><b>{v}</b></div>)}</div>}{u.note&&<div style={{fontSize:11,color:T.txt,lineHeight:1.8,marginTop:5,whiteSpace:'pre-wrap',display:'flex',gap:5,alignItems:'flex-start'}}><span style={{display:'flex',marginTop:3}}><ChatIcon size={12} color={T.txt} /></span><span>{u.note}</span></div>}</div>})}{result.usage&&<div style={{fontSize:12,lineHeight:2,whiteSpace:'pre-wrap',borderTop:active.length?`1px dashed ${T.brd}`:'none',paddingTop:active.length?8:0}}>{result.usage}</div>}</div>})()}
    {/* اصلاح ۱۲: تب اصلاحی — با تمام فیلدهای درخواستی، قابل ویرایش توسط کاربر */}
    {rtab==='corrective'&&!isGuest&&<div style={{display:'grid',gap:9}}>
     {correctiveFields.map(([key,label])=><div key={key}><label style={{...S.lbl,marginBottom:4}}>{label}</label><input style={S.inp} value={correctiveDraft[key]||''} onChange={e=>setCorrectiveDraft((d:any)=>({...d,[key]:e.target.value}))}/></div>)}
     <button style={{...S.btn,marginTop:6}} disabled={correctiveSaving} onClick={saveCorrective}>{correctiveSaving?(lang==='en'?'Saving...':'در حال ذخیره...'):(lang==='en'?'Save corrective info':'ذخیره اطلاعات اصلاحی')}</button>
     {correctiveMsg&&<div style={{fontSize:12,color:correctiveMsg.includes('نشد')||correctiveMsg.toLowerCase().includes('could not')?T.err:T.ok,textAlign:'center'}}>{correctiveMsg}</div>}
    </div>}
   </div>
   {/* اصلاح ۶: لینک دانلود فایل PDF طریقه مصرف/برنامه غذایی — فقط برای همان کاربر (نتیجه استعلام‌شده) نمایش داده می‌شود */}
   {!isGuest && (result.usagePdfUrl||result.mealPdfUrl)&&<div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:10}}>
    {result.usagePdfUrl&&<a href={result.usagePdfUrl} target="_blank" rel="noreferrer" style={{textDecoration:'none',flex:'1 1 160px',padding:'9px 11px',borderRadius:10,border:`1px solid ${T.acc}`,background:`${T.acc}12`,color:T.acc,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}> {lang==='en'?'Download usage PDF':'دانلود PDF طریقه مصرف'}</a>}
    {result.mealPdfUrl&&<a href={result.mealPdfUrl} target="_blank" rel="noreferrer" style={{textDecoration:'none',flex:'1 1 160px',padding:'9px 11px',borderRadius:10,border:`1px solid ${T.acc}`,background:`${T.acc}12`,color:T.acc,fontSize:12,fontWeight:700,display:'flex',alignItems:'center',justifyContent:'center',gap:6}}> {lang==='en'?'Download meal plan PDF':'دانلود PDF برنامه غذایی'}</a>}
   </div>}
   {!isGuest && result.userNotes&&<div style={{background:T.soft,border:`1px solid ${T.brd}`,borderRadius:12,padding:'9px 11px',fontSize:12,lineHeight:2,whiteSpace:'pre-wrap',marginTop:10}}><b style={{fontSize:11.5,color:T.ttl,marginBottom:3,display:'flex',alignItems:'center',gap:6}}><PinIcon size={14} color={T.ttl} /> {lang==='en'?'Notes from the specialist':'نکات کارشناس برای شما'}</b>{result.userNotes}</div>}
   {!isGuest && result.corrective && <div style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:12,padding:'9px 11px',fontSize:12,lineHeight:1.9,marginTop:10}}><b style={{color:T.ttl,marginBottom:4,display:'block'}}>{lang==='en'?'Corrective info':'اطلاعات اصلاحی'}</b><pre style={{whiteSpace:'pre-wrap',margin:0,fontFamily:'inherit',fontSize:11}}>{typeof result.corrective==='string'?result.corrective:JSON.stringify(result.corrective,null,2)}</pre></div>}
  </div>}
  {/* اصلاح ۴-۴ (مرحله ۴): افزودن ContactPanel به این صفحه (طبق تنظیمات نمایش) */}
  {showContactOn('track')&&<ContactPanel cfg={cfg} T={T} lang={lang}/>}
  <button className="zkgl-ghost" style={{marginTop:14}} onClick={()=>setView('home')}>{publicText('backBtn','بازگشت')}</button></div></div>
}
