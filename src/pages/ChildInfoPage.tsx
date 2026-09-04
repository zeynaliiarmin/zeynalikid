import { useAppContext } from '../app/AppContext';
import { useRef, useState, useCallback, useEffect } from 'react';
import VoiceRecorder from '../components/VoiceRecorder';
import PrivacyConsent from '../components/PrivacyConsent';
import useExitGuard from '../hooks/useExitGuard';
import SmartTongueCameraModal from '../components/SmartTongueCameraModal';
import { triggerErrorAlert } from '../utils/errorAlertBus';
import PublicBackButton from '../components/PublicBackButton';
import { pushInPageHistoryState } from '../utils/scrollRestoration';

// اصلاح ۲۳: عنوان این صفحه (در Stepper) از «مقصد» به «اطلاعات فرزند» تغییر کرد.
// اصلاح ۲۴: فیلدهای نام و شماره تماس والد از این صفحه حذف شدند — این اطلاعات به‌صورت خودکار
//           (در صورت وجود از فرم مشاوره) در صفحه اطلاعات ارسال استفاده می‌شود.
// اصلاح ۲۵: اگر کاربر قبلاً فرم مشاوره ثبت کرده باشد (fd.gender موجود است)، تمام اطلاعات آن فرم
//           (به‌جز موضوع مشاوره) در این صفحه به‌صورت غیرقابل‌ویرایش نمایش داده می‌شود و دکمه
//           «درخواست ویرایش اطلاعات فرزندم را دارم» (که قبلاً در صفحه اطلاعات ارسال بود) اینجا قرار گرفته.
//           فیلدهای جدید اضافه‌شده: وضعیت اشتها، مشکل گوارشی، توضیحات تکمیلی.

// ─── کامپوننت‌های کمکی (بیرون از تابع اصلی برای جلوگیری از Remount) ───
// FIX: کامپوننت‌های Err و ReadonlyRow از تابع خارج شدند تا در هر رندر دوباره ساخته نشوند.
//       این اصلاح مشکل بسته‌شدن کیبورد بعد از هر کاراکتر را رفع می‌کند.
// FIX ۲: Field/SelectBox اکنون در App.tsx در سطح ماژول با هویت پایدار تعریف شده‌اند (StableField/StableSelectBox)
//       و textarea توضیحات هم مستقیم کنترل‌شده با آپدیت تابع‌محور (functional update) است تا shared/coupled state bug رخ ندهد.

interface ErrProps { err: any; theme?: any; }
function Err({ err, theme: T }: ErrProps) {
  return <div style={{ fontSize: 11, color: T?.err ?? '#ef4444', marginTop: 4 }}>{err}</div>;
}

interface ReadonlyRowProps { label: string; value: any; theme?: any; }
function ReadonlyRow({ label, value, theme: T }: ReadonlyRowProps) {
  if (value === undefined || value === null || value === '') return null;
  return (
    <div style={{ background: T?.inp ?? '#f5f5f5', borderRadius: 10, padding: '8px 10px', marginBottom: 8, boxShadow: T?.neuIn ?? 'inset 0 1px 3px rgba(0,0,0,0.1)' }}>
      <span style={{ color: T?.mut ?? '#888', fontSize: 12 }}>{label}: </span>
      <b style={{ fontSize: 12.5 }}>{value}</b>
    </div>
  );
}

// ─── کامپوننت اصلی صفحه ───
export default function ChildInfoPage(){
 const app=useAppContext();
 const { cfg, T, S, css, lang, setView, fd, setFd, course, setCourse, publicText, trVal, Field, SelectBox, MiniIcon, Stepper, p2e, editChild, setEditChild, Modal, uploadTonguePhoto, deleteStoredTonguePhoto } = app;
 const [draft, setDraft] = useState<any>({ ...fd });
 const [errs, setErrs] = useState<any>({});
 const [voiceBlob,setVoiceBlob]=useState<Blob|null>(null);
 const [privacyAccepted,setPrivacyAccepted]=useState(false);
 const [privacyAttempted,setPrivacyAttempted]=useState(false);
 const selectedTitle = lang === 'en' ? (course.selected?.titleEn || course.selected?.title) : course.selected?.title;
 // اگر از فرم مشاوره آمده باشد (fd.gender از قبل ست شده)، کل اطلاعات فرزند فقط نمایشی و غیرقابل ویرایش است.
 const fromConsultForm = !!fd?.gender;
 const isDirty = Boolean(draft.age || draft.height || draft.weight || draft.notes);
 useExitGuard(isDirty, lang === 'fa' ? 'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید؟' : 'You have unsaved changes. Are you sure?');
  // FIX: Stabilize VoiceRecorder callbacks to prevent remounting on every re-render
  const handleVoiceRecorded=useCallback((blob:Blob)=>setVoiceBlob(blob),[]);
  const handleVoiceRemoved=useCallback(()=>setVoiceBlob(null),[]);
 // Fix: پایدار کردن هندلرهای آپدیت draft با functional update تا shared state bug رخ ندهد
 const updateDraft = useCallback((patch: Record<string, any>) => {
   setDraft((prev: any) => ({ ...prev, ...patch }));
 }, []);
 // هندلرهای اختصاصی هر فیلد — identity پایدار
 const onAgeChange = useCallback((v:string)=> updateDraft({age: v}), [updateDraft]);
 const onHeightChange = useCallback((v:string)=> updateDraft({height: v}), [updateDraft]);
 const onWeightChange = useCallback((v:string)=> updateDraft({weight: v}), [updateDraft]);
 const onDiseaseChange = useCallback((v:string)=> updateDraft({disease: v}), [updateDraft]);
 const onDigestChange = useCallback((v:any)=> updateDraft({digest: v}), [updateDraft]);
 const onAppetiteChange = useCallback((v:any)=> updateDraft({appetite: v}), [updateDraft]);
 const onSpecialsChange = useCallback((v:any)=> updateDraft({specials: v}), [updateDraft]);
 const onNotesChange = useCallback((e:any)=> updateDraft({notes: e.target.value}), [updateDraft]);
 const onGenderSelect = useCallback((g:string)=> updateDraft({gender: g}), [updateDraft]);

 // اصلاح ۳۰ (مرحله ۷): اعتبارسنجی الزامی‌بودن عکس زبان (در صورت فعال بودن از پنل مدیریت)
 const tonguePhotos:string[]=course.tonguePhotos||[];
 const submit=async()=>{
  if(!privacyAccepted){setPrivacyAttempted(true);return}
  const tongueErr:any={};
  if(cfg.isTonguePhotoRequired&&tonguePhotos.length===0) tongueErr.tonguePhoto=publicText('tonguePhotoRequired','بارگذاری عکس زبان الزامی است');
  if(fromConsultForm){
    if(Object.keys(tongueErr).length){setErrs(tongueErr);return}
    let child_voice_note_url = '';
    if (voiceBlob && app.uploadVoiceNote) {
      try { const u = await app.uploadVoiceNote(voiceBlob); if (u) child_voice_note_url = u; } catch (e) { console.warn('voice upload fail', e); }
    }
    setCourse((c:any)=>({...c,childInfo:{...fd, child_voice_note_url}}));
    setView('course-shipping');
    return;
  }
  const minAge = Number(cfg.formFields?.age?.min ?? 2) || 2; const maxAge = Number(cfg.formFields?.age?.max ?? 17) || 17; const e:any={...tongueErr}; if(!draft.gender)e.gender=lang==='en'?'Select gender':'جنسیت فرزند را انتخاب کنید'; const ag=+p2e(draft.age); if(!draft.age||isNaN(ag)||ag<minAge||ag>maxAge)e.age=lang==='en'?`Age must be ${minAge} to ${maxAge}`:`سن ${minAge} تا ${maxAge} سال`; setErrs(e); if(Object.keys(e).length)return;
  let child_voice_note_url = '';
  if (voiceBlob && app.uploadVoiceNote) {
    try { const u = await app.uploadVoiceNote(voiceBlob); if (u) child_voice_note_url = u; } catch (e) { console.warn('voice upload fail', e); }
  }
  setFd(draft);
  setCourse((c:any)=>({...c,childInfo:{...draft, child_voice_note_url}}));
  setView('course-shipping');
 };

 return <div dir={lang==='en'?'ltr':'rtl'} style={S.page}><style>{css}</style><div style={{...S.card, paddingTop:'10px'}}><Stepper step={2}/>
  <div style={{marginBottom:12}}>
    <div className="zk-public-title-row" style={{marginBottom:3}}>
      <PublicBackButton lang={lang} fallback="/courses" testId="public-child-info-back" />
      <div style={{display:'flex',alignItems:'center',gap:8,flex:1,minWidth:0}}>
        <div style={{width:26,height:26,borderRadius:999,background:`${T.acc}12`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><MiniIcon type="user" T={T}/></div>
        <div style={{minWidth:0}}><div style={{fontSize:10.5,color:T.mut,fontWeight:600}}>{lang==='en'?'Step 2 of 5 • Child Information':'مرحله ۲ از ۵ • اطلاعات فرزند'}</div><h1 data-public-page-title style={{fontSize:16.5,fontWeight:800,color:T.ttl,margin:0}}>{publicText('childInfo','اطلاعات فرزند')}</h1></div>
      </div>
    </div>
    <div style={{background:`${T.acc}08`,borderRadius:14,padding:'7px 11px',fontSize:13,boxShadow:T.neuIn}}><span style={{color:T.mut}}>{lang==='en'?'Selected course':'دوره انتخاب‌شده'}: </span><b style={{color:T.accText}}>{selectedTitle||'—'}</b></div>
  </div>

 {fromConsultForm ? <>
  <div style={{background:`${T.acc}0d`,borderRadius:12,padding:12,marginBottom:13,boxShadow:T.neuIn}}>
   <p style={{fontSize:11.5,color:T.mut,margin:'0 0 8px'}}>{lang==='en'?'This information was submitted in your consultation form and cannot be edited here.':'این اطلاعات از فرم مشاوره شما ثبت شده و در اینجا غیرقابل ویرایش است.'}</p>
   <ReadonlyRow label={publicText('gender','جنسیت')} value={fd.gender==='male'?publicText('boy','پسر'):fd.gender==='female'?publicText('girl','دختر'):'—'} theme={T}/>
   <ReadonlyRow label={publicText('age',cfg.formFields.age.label)} value={fd.age} theme={T}/>
   <ReadonlyRow label={publicText('height',cfg.formFields.height.label)} value={fd.height} theme={T}/>
   <ReadonlyRow label={publicText('weight',cfg.formFields.weight.label)} value={fd.weight} theme={T}/>
   <ReadonlyRow label={publicText('digest','مشکل گوارشی')} value={Array.isArray(fd.digest)?fd.digest.map(trVal).join('، '):fd.digest} theme={T}/>
   <ReadonlyRow label={publicText('appetite','وضعیت اشتها')} value={fd.appetite?trVal(fd.appetite):''} theme={T}/>
   <ReadonlyRow label={publicText('disease',cfg.formFields.disease.label)} value={fd.disease} theme={T}/>
   <ReadonlyRow label={publicText('specials','شرایط خاص')} value={Array.isArray(fd.specials)?fd.specials.map(trVal).join('، '):fd.specials} theme={T}/>
   <ReadonlyRow label={publicText('notes',cfg.formFields.notes.label)} value={fd.notes} theme={T}/>
  </div>
  <button onClick={()=>setEditChild(true)} style={{marginBottom:13,width:'100%',padding:12,border:0,borderRadius:14,background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#422006',fontWeight:800,cursor:'pointer',fontFamily:'inherit',fontSize:15,boxShadow:'4px 4px 10px rgba(0,0,0,.08),-2px -2px 8px rgba(255,255,255,.4)'}}>{publicText('editChild','درخواست ویرایش اطلاعات فرزندم را دارم')}</button>
 </> : <>
  {/* FIX: جنسیت و سن — هر دکمه key پایدار (male/female) و هندلر functional تا ری‌مانت رخ ندهد */}
  <div style={{display:'grid',gridTemplateColumns:'minmax(0,2fr) 105px',gap:12,alignItems:'start',marginBottom:13}}><div><label style={S.lbl}>{publicText('gender','جنسیت')} <span style={{color:T.err}}>*</span></label><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7}}>{([['male',publicText('boy','پسر')],['female',publicText('girl','دختر')] ] as any[]).map((x:any)=><button key={x[0]} type="button" onClick={()=>onGenderSelect(x[0])} style={{padding:'10px 8px',borderRadius:12,border:'none',background:draft.gender===x[0]?T.soft:T.card,color:draft.gender===x[0]?T.acc:T.mut,cursor:'pointer',fontSize:13,fontFamily:'inherit',fontWeight:700,boxShadow:draft.gender===x[0]?T.neuIn:T.neuOut}}>{x[1]}</button>)}</div>{errs.gender && <Err err={errs.gender} theme={T} />}</div><div><Field label={publicText('age',cfg.formFields.age.label)} value={draft.age} onChange={onAgeChange} ph={cfg.formFields.age.placeholder} type="number" required={true} S={S} T={T} trVal={trVal} p2e={p2e} />{errs.age && <Err err={errs.age} theme={T} />}</div></div>
  {/* FIX: قد/وزن — هر فیلد کنترل‌شده مستقل با هندلر پایدار و value مستقیم از draft — بدون index-as-key و بدون shared object remount */}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>{cfg.formFields.height?.show!==false&&<Field label={publicText('height',cfg.formFields.height.label)} value={draft.height} onChange={onHeightChange} ph={cfg.formFields.height.placeholder} type="number" S={S} T={T} trVal={trVal} p2e={p2e} />}{cfg.formFields.weight?.show!==false&&<Field label={publicText('weight',cfg.formFields.weight.label)} value={draft.weight} onChange={onWeightChange} ph={cfg.formFields.weight.placeholder} type="number" S={S} T={T} trVal={trVal} p2e={p2e} />}</div>
  {/* اصلاح ۲۵: فیلدهای جدید — وضعیت اشتها و مشکل گوارشی */}
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}><SelectBox label={publicText('digest','مشکل گوارشی')} multi items={cfg.digestiveOptions} val={draft.digest||[]} setVal={onDigestChange} S={S} T={T} trVal={trVal} cfg={cfg} lang={lang} /><SelectBox label={publicText('appetite','وضعیت اشتها')} items={cfg.appetiteOptions} val={draft.appetite||''} setVal={onAppetiteChange} S={S} T={T} trVal={trVal} cfg={cfg} lang={lang} /></div>
  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginTop:12}}>{cfg.formFields.disease?.show!==false&&<Field label={publicText('disease',cfg.formFields.disease.label)} value={draft.disease} onChange={onDiseaseChange} ph={cfg.formFields.disease.placeholder} S={S} T={T} trVal={trVal} p2e={p2e} />}<SelectBox label={publicText('specials','شرایط خاص')} multi items={cfg.specialConditions} val={draft.specials} setVal={onSpecialsChange} S={S} T={T} trVal={trVal} cfg={cfg} lang={lang} /></div>
  {/* اصلاح ۲۵: فیلد جدید — توضیحات تکمیلی — FIX: کنترل مستقیم بدون تعریف داخلی کامپوننت */}
  {cfg.formFields.notes?.show!==false&&<div style={{marginTop:12}}><div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:6,marginBottom:7}}><label style={{fontSize:14,color:T.mut,fontWeight:700}}>{publicText('notes',cfg.formFields.notes.label)}</label><VoiceRecorder T={T} lang={lang} maxDuration={90} onRecorded={handleVoiceRecorded} onRemoved={handleVoiceRemoved}/></div><textarea style={S.ta} value={draft.notes||''} onChange={onNotesChange} placeholder={trVal(cfg.formFields.notes.placeholder)}/></div>}
 </>}

 {/* اصلاح ۳۰ (مرحله ۷): بخش آپلود عکس زبان فرزند — پیش از ادامه فرایند */}
 <TonguePhotoUploader app={app} tonguePhotos={tonguePhotos} onChange={(list:string[])=>setCourse((c:any)=>({...c,tonguePhotos:list}))} tongueErr={errs.tonguePhoto}/>

 <PrivacyConsent accepted={privacyAccepted} attempted={privacyAttempted} lang={lang} T={T} textFa="با استفاده از این اطلاعات برای ارائه و پیگیری دوره درخواستی موافقم." textEn="I consent to using this information to provide and follow up the requested course." onChange={accepted=>{setPrivacyAccepted(accepted);if(accepted)setPrivacyAttempted(false)}} onOpenPrivacy={()=>{try{sessionStorage.setItem('zk_privacy_return_to',location.pathname||'/child-info')}catch{};setView('privacy')}}/>
 {Object.keys(errs).length>0&&<div style={{background:`${T.err}12`,border:`1px solid ${T.err}`,borderRadius:12,padding:12,margin:'12px 0',color:T.err,fontSize:12}}>{Object.values(errs).map((x:any,i:number)=><div key={`err-${i}`}>• {x}</div>)}</div>}<div style={{display:'grid',gridTemplateColumns:'1fr',gap:10,marginTop:12, position:'sticky', bottom: 'calc(12px + env(safe-area-inset-bottom, 0px))', background: T.card, paddingTop:10, paddingBottom: 'calc(8px + env(safe-area-inset-bottom, 0px))', zIndex:10, borderTop: `1px solid ${T.brd}`}}>
  <button type="button" style={{...S.btn,minHeight:52,opacity:1,cursor:'pointer'}} onClick={submit}>{lang==='en'?'Save child info and continue':'ثبت اطلاعات فرزند و ادامه'}</button>
</div></div>
 {editChild&&<EditChildOnInfoModal app={app}/>}
 </div>
}

// اصلاح ۳۰ (مرحله ۷): بخش آپلود عکس زبان فرزند — پشتیبانی از دوربین/گالری/فایل‌ها، نوار پیشرفت واقعی، حداکثر N عکس با امکان حذف.
function TonguePhotoUploader({app,tonguePhotos,onChange,tongueErr}:{app:any,tonguePhotos:string[],onChange:(list:string[])=>void,tongueErr?:string}){
 const {cfg,T,S,lang,publicText,uploadTonguePhoto,deleteStoredTonguePhoto}=app;
 const [progress,setProgress]=useState<number|null>(null);
 const [err,setErr]=useState('');
 const [cameraModalOpen,setCameraModalOpen]=useState(false);
 const camPushedRef=useRef(false);
 // باز کردن دوربین هوشمند: یک entry در تاریخچه می‌گذاریم تا دکمه بک گوشی فقط دوربین را ببندد (نه رفتن به صفحه دوره)
 const openCam=()=>{
  if(!camPushedRef.current){pushInPageHistoryState({zkSmartCam:true});camPushedRef.current=true;}
  openCam();
 };
 const closeCam=()=>{
  if(camPushedRef.current){camPushedRef.current=false;try{window.history.back()}catch{}}
  setCameraModalOpen(false);
 };
 useEffect(()=>{const onPop=()=>{setCameraModalOpen(false);camPushedRef.current=false;};window.addEventListener('popstate',onPop);return()=>window.removeEventListener('popstate',onPop);},[]);
 const filesRef=useRef<HTMLInputElement|null>(null);
 const cameraDirectRef=useRef<HTMLInputElement|null>(null);
 const maxCount=cfg.maxTonguePhotoCount||3;
 const maxSizeMB=cfg.maxTonguePhotoSizeMB||5;
 const required=!!cfg.isTonguePhotoRequired;
 const showHint=cfg.showTonguePhotoHint!==false;
 // Phase 6: پیش‌نمایش محلی با blob — چون باکت tongue-photos خصوصی می‌شود و URL عمومی
 // دیگر قابل نمایش نیست. بعد از ثبت فرم، پنل ادمین Signed URL می‌گیرد.
 const [previewMap,setPreviewMap]=useState<Record<string,string>>({});

 const doUpload=async(f:File)=>{
  setErr('');
  if(tonguePhotos.length>=maxCount){ setErr(publicText('maxPhotosReached',`حداکثر ${maxCount} عکس قابل بارگذاری است`).replace('{count}',String(maxCount))); return; }
  if(f.size>maxSizeMB*1024*1024){ setErr(publicText('maxFileSizeMB',`حداکثر حجم هر عکس: ${maxSizeMB} مگابایت`).replace('{size}',String(maxSizeMB))); return; }
  setProgress(0);
  try{
   const url=await uploadTonguePhoto(f,(p:number)=>setProgress(p),maxSizeMB*1024*1024);
   const blobUrl=URL.createObjectURL(f);
   setPreviewMap(m=>({...m,[url]:blobUrl}));
   onChange([...tonguePhotos,url]);
  }catch(e:any){
   triggerErrorAlert(cfg.isTonguePhotoRequired ? 'tongue' : 'tongueOptional');
   setErr(e?.message||(lang==='en'?'Upload failed.':'آپلود انجام نشد.'));
  }finally{
   setTimeout(()=>setProgress(null),400);
  }
 };

 const removePhoto=async(url:string)=>{
  try{ await deleteStoredTonguePhoto(url); }catch{}
  const blobUrl=previewMap[url];
  if(blobUrl){ try{URL.revokeObjectURL(blobUrl);}catch{} }
  setPreviewMap(m=>{const n={...m};delete n[url];return n;});
  onChange(tonguePhotos.filter((u)=>u!==url));
 };

 const btnCameraStyle:any={
   padding:'10px 16px',
   borderRadius:12,
   border:0,
   background:T.grad||T.acc||'#0F766E',
   color:'#fff',
   cursor:'pointer',
   fontFamily:'inherit',
   fontSize:12.5,
   fontWeight:800,
   whiteSpace:'nowrap',
   display:'inline-flex',
   alignItems:'center',
   gap:6,
   boxShadow:'0 4px 14px rgba(15,118,110,0.25)',
 };

 const btnGalleryStyle:any={
   padding:'10px 14px',
   borderRadius:12,
   border:`1px solid ${T.brd||'#E5E0D8'}`,
   background:T.card||'#fff',
   color:T.txt||'#1F2937',
   cursor:'pointer',
   fontFamily:'inherit',
   fontSize:12.5,
   fontWeight:700,
   whiteSpace:'nowrap',
   display:'inline-flex',
   alignItems:'center',
   gap:6,
   boxShadow:T.neuOut,
 };

 return (
  <div style={{marginTop:14,padding:14,borderRadius:14,background:T.card,boxShadow:T.neuOut,border:`1px solid ${T.brd||'#E5E0D8'}`}}>
   <label style={{...S.lbl,marginBottom:showHint?4:8,display:'flex',alignItems:'center',gap:6}}>
    {required?publicText('tonguePhotoRequiredLabel','عکس زبان فرزند (اجباری)'):publicText('tonguePhotoOptional','عکس زبان فرزند (اختیاری)')}
    {required&&<span style={{color:T.err}}>*</span>}
   </label>
   {showHint&&<p style={{fontSize:11,color:T.mut,margin:'0 0 12px',lineHeight:1.8}}>{publicText('tonguePhotoHint','بارگذاری عکس زبان اهمیت زیادی ندارد و بعداً هم می‌توانید ارسال کنید')}</p>}

   {/* انتخاب دوگانه: عکاسی با دوربین هوشمند یا انتخاب از گالری */}
   <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
    <button
      type="button"
      style={btnCameraStyle}
      disabled={tonguePhotos.length>=maxCount}
      onClick={()=>{
        // باز کردن دوربین هوشمند با طرح زبان
        if(typeof navigator !== 'undefined' && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'){
          setCameraModalOpen(true);
        } else {
          cameraDirectRef.current?.click();
        }
      }}
    >
      <span>📸</span>
      <span>{lang==='en'?'Smart Camera (Tongue Outline)':'عکاسی با دوربین (طرح هوشمند زبان)'}</span>
    </button>

    <button
      type="button"
      style={btnGalleryStyle}
      disabled={tonguePhotos.length>=maxCount}
      onClick={()=>filesRef.current?.click()}
    >
      <span>🖼️</span>
      <span>{lang==='en'?'Gallery / Files':'انتخاب از گالری و فایل‌ها'}</span>
    </button>

    {/* اینپوت‌های مخفی برای فایل و دوربین مستقیم */}
    <input ref={filesRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0]; if(f)doUpload(f); e.currentTarget.value=''}}/>
    <input ref={cameraDirectRef} type="file" accept="image/*" capture="environment" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0]; if(f)doUpload(f); e.currentTarget.value=''}}/>
   </div>

   <p style={{fontSize:10.5,color:T.mut,margin:'0 0 4px'}}>{publicText('maxFileSizeMB',`حداکثر حجم هر عکس: ${maxSizeMB} مگابایت`).replace('{size}',String(maxSizeMB))} • {maxCount - tonguePhotos.length > 0 ? (lang==='en'?`${maxCount-tonguePhotos.length} slot(s) left`:`${maxCount-tonguePhotos.length} ظرفیت باقی‌مانده`) : (lang==='en'?'Maximum reached':'ظرفیت تکمیل شده')}</p>
   <div style={{fontSize:11,color:T.mut,marginTop:4,marginBottom:10}}>
     {lang === 'fa' ? 'عکس به‌صورت بهینه (WebP) ذخیره می‌شود' : 'Image will be optimized as WebP'}
   </div>

   {/* نوار پیشرفت */}
   {progress!==null&&(
    <div style={{marginBottom:10}}>
     <div style={{height:8,borderRadius:6,background:T.inp,boxShadow:T.neuIn,overflow:'hidden'}}>
      <div style={{height:'100%',width:`${progress}%`,borderRadius:6,background:T.grad,transition:'width .2s ease'}}/>
     </div>
     <div style={{fontSize:10.5,color:T.accText,marginTop:4,textAlign:'center',fontWeight:700}}>{publicText('uploadProgress',`در حال آپلود... ${progress}%`).replace('{percent}',String(progress))}</div>
    </div>
   )}

   {(err||tongueErr)&&<div style={{fontSize:11,color:T.err,marginBottom:8}}>{err||tongueErr}</div>}

   {/* پیش‌نمایش عکس‌های آپلودشده — key پایدار بر اساس url نه index */}
   {tonguePhotos.length>0&&(
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
     {tonguePhotos.map((url)=>(
      <div key={url} style={{position:'relative',width:76,height:76,borderRadius:12,overflow:'hidden',boxShadow:T.neuOut}}>
       <img src={previewMap[url]||url} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
       <button type="button" onClick={()=>removePhoto(url)} style={{position:'absolute',top:3,insetInlineEnd:3,width:20,height:20,borderRadius:'50%',border:0,background:'rgba(0,0,0,.6)',color:'#fff',fontSize:12,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>×</button>
      </div>
     ))}
    </div>
   )}

   {/* مودال دوربین هوشمند طرح زبان */}
   {cameraModalOpen&&(
     <SmartTongueCameraModal
       T={T}
       lang={lang}
       onCapture={(file)=>doUpload(file)}
       onClose={closeCam}
     />
   )}
  </div>
 );
}

// اصلاح ۲۵: مودال ویرایش اطلاعات کودک اکنون در همین صفحه (اطلاعات فرزند) در دسترس است.
function EditChildOnInfoModal({app}:{app:any}){
 const {cfg,T,S,fd,setFd,setCourse,setEditChild,publicText,Field,Modal,trVal,p2e}=app;
 const today=()=>new Date().toLocaleDateString('fa-IR'); const now=()=>new Date().toLocaleTimeString('fa-IR');
 const [draft,setDraft]=useState({...fd});
 const updateDraftField = useCallback((field:string, value:string) => {
   setDraft((prev:any)=> ({...prev, [field]: value}));
 },[]);
 const save=()=>{const prev={date:today(),time:now(),data:{...fd}}; setFd(draft); setCourse((c:any)=>({...c,childInfo:{...draft},editedHistory:[...(c.editedHistory||[]),prev]})); setEditChild(false)};
 return <Modal T={T} onClose={()=>setEditChild(false)} closeLabel={publicText('close','بستن')}><h3 style={{color:T.ttl,marginTop:0}}>{publicText('editChildTitle','ویرایش اطلاعات کودک')}</h3>{['age','height','weight','disease','notes'].map(k=><Field key={k} label={cfg.formFields[k]?.label||k} value={draft[k]||''} onChange={(v:string)=>updateDraftField(k, v)} ph={cfg.formFields[k]?.placeholder||''} S={S} T={T} trVal={trVal} p2e={p2e} />)}<label style={S.lbl}>{publicText('gender','جنسیت')}</label><div style={{display:'flex',gap:8,marginBottom:12}}><button type="button" onClick={()=>setDraft((p:any)=>({...p,gender:'male'}))} style={draft.gender==='male'?S.btn:S.btnGhost}>{publicText('boy','پسر')}</button><button type="button" onClick={()=>setDraft((p:any)=>({...p,gender:'female'}))} style={draft.gender==='female'?S.btn:S.btnGhost}>{publicText('girl','دختر')}</button></div><button type="button" style={S.btn} onClick={save}>{publicText('saveChanges','ذخیره تغییرات')}</button></Modal>
}
