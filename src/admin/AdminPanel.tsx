import { useAppContext } from '../app/AppContext';
// --- مدیریت دیزاین (مرحله  - بازطراحی تدریجی) ---

import { lazy,memo,useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState } from 'react';
import { isSupabaseConfigured,fetchSubmissions,fetchReviews,fetchUserQuestions,updateSubmission,softDeleteMultipleSubmissions,supabase } from '../lib/supabase';
import { productVectorIcon, AdminIcon, MenuIcon, ProductsIcon, CoursesIcon, ContactIcon, EducationIcon, LicensesIcon, SearchIcon, ChatIcon, BoxIcon } from '../components/Icons';
import AdminLayout, { type AdminNavGroup } from './AdminLayout';
import { flagToEmoji, getCountryFlag } from '../utils/phone';
import { biometricSupported, enrollAdminBiometric, hasAdminBiometric, removeAdminBiometric } from '../utils/adminBiometric';
// Phase 7: خروج واقعی از همهٔ نشست‌ها از طریق admin-session (revoke_all)
import { revokeAllAdminSessions, clearAdminSession, listAdminDevices, revokeAdminDevice, getAdminDeviceId, getAdminCredsInfo, changeAdminCredentials, isAdminPasswordUpgradeRequired } from '../utils/adminSession';
import { generateFormImage } from '../utils/exportFormToImage';
import AdminSpeedDialFAB from './AdminSpeedDialFAB';
import AdminAssistantWidget from './AdminAssistantWidget';
import { ZkArrowUpIcon, ZkArrowDownIcon, ZkChevronUpIcon, ZkChevronDownIcon, ZkCheckIcon, ZkCloseIcon,
 ZkCheckCircleIcon, ZkXCircleIcon, ZkEyeIcon, ZkEyeOffIcon, ZkCameraIcon, ZkDocIcon,
 ZkMoneyIcon, ZkCalendarIcon, ZkPillIcon, ZkStethoscopeIcon, ZkImageIcon, ZkVideoIcon, ZkAudioIcon,
 ZkLinkIcon, ZkCardIcon, ZkPaletteIcon, ZkBookIcon, ZkStarIcon, ZkTagIcon, ZkCopyIcon, ZkResetIcon,
 ZkSettingsIcon, ZkTrashIcon, ZkDashboardIcon, ZkUsersIcon, ZkCoursesIcon, ZkProductsIcon,
 ZkReviewsIcon, ZkOrdersIcon, ZkContentIcon, ZkBellIcon, ZkTruckIcon, ZkHomeIcon, ZkSearchIcon,
 ZkDownloadIcon, ZkFilterIcon, ZkPhoneIcon, ZkSendIcon, ZkClockIcon, ZkWarnIcon, ZkPlusIcon, ZkUploadIcon, ZkChatIcon } from './adminIcons';
import './zkadmin-tokens.css';
import './zkadmin-forms.css';
// FIX معماری: SubCard/LazySubCard/PhoneAction/GrowthBox از داخل بدنه AdminPanel
// به ماژول مستقل منتقل شدند. تعریف داخلی باعث می‌شد در هر رندر یک component type
// جدید ساخته شود و React کل زیردرخت را unmount/remount کند (کیبورد بسته می‌شد،
// تب داخلی ریست می‌شد، اسکرول می‌پرید، فرم باز بسته می‌شد).
import SubCard, { LazySubCard } from './SubCard';
// منبع واحد ابزارهای مشترک پنل (قبلاً در چند فایل تکرار شده بود)
import { SK, p2e, digits, uid, getLS, setLS, faNum, relTime, fmtWhen, subTime, logChange } from './adminUtils';
import { defaultSettings as configDefaultSettings } from '../config/defaultSettings';
import { normalizeDesignId, normalizePublicColorMode } from '../utils/colorMode';
import ContentManager from './ContentManager';
import SettingsManager from './SettingsManager';
import EntryModeSettings from './EntryModeSettings';
import ImagesManager, { LibraryPicker, FrameControls } from './ImagesManager';
import ImageCropper from './ImageCropper';
import CoursesEditor from './CoursesEditor';
import ApiKeysManager from './ApiKeysManager';
import ApiApprovalNotifier from './ApiApprovalNotifier';
import { canonicalizeMediaInput, extractDirectMediaUrl, extractImageLinkList } from '../utils/mediaInput';
import BulkStoryAdder from './BulkStoryAdder';
import CoverCropModal from './CoverCropModal';
import CoverImage from '../components/CoverImage';
import { isGatewayProductionReady } from '../services/payment/PaymentService';

const TrashPanel=lazy(()=>import('./TrashPanel'));
const UserQuestionsEditor=lazy(()=>import('./UserQuestionsEditor'));
const ReviewsEditor=lazy(()=>import('./ReviewsEditor'));
const ConsultantsEditor=lazy(()=>import('./ConsultantsEditor'));
const AnalyticsPanel=lazy(()=>import('./AnalyticsPanel'));
const ErrorLogsPanel=lazy(()=>import('./ErrorLogsPanel'));
const AssistantManager=lazy(()=>import('./AssistantManager'));

type Any=Record<string,any>;
// Phase 3: VITE_ADMIN_PASSWORD removed — admin password lives only in Supabase Edge Function secrets.
// const ENV_ADMIN_PASSWORD removed.
// Stage 7B: هِلپرهای نمایشی خالص (بدون هیچ تغییر منطقی) — عدد فارسی، تاریخ خوانا، زمان نسبی، لحن وضعیت


// FIX: StableAdminInput با تاخیر در commit و حفظ فوکوس — رفع fg انتخاب سریع و سپس لغو
// علت جدید: بعد از کلیک A->B، B ابتدا انتخاب سپس سریع لغو می‌شد — چون commit قبلی بدون حفظ activeElement، رندر والد فوکوس B را می‌دزدید
const StableAdminInput = memo(function StableAdminInput({defaultValue='',onCommit,placeholder='',style,numeric=false,type='text',inputMode,onEnter}:any){
  const ref=useRef<HTMLInputElement|null>(null);
  const handleChange=useCallback((e:any)=>{ if(numeric) e.target.value=p2e(e.target.value); },[numeric]);
  const commit=useCallback(()=>{
    const val = ref.current?.value||'';
    const active=document.activeElement as HTMLElement|null;
    const wasInput = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA');
    setTimeout(()=>{
      onCommit?.(val);
      if(wasInput && active!==ref.current){
        requestAnimationFrame(()=>{
          try{ (active as HTMLElement).focus({preventScroll:true} as any); const inp=active as HTMLInputElement; if(inp.setSelectionRange){ const len=inp.value.length; try{inp.setSelectionRange(len,len);}catch{} } }catch{}
        });
      }
    }, 0);
  },[onCommit]);
  useEffect(()=>{
    const flush=()=>onCommit?.(ref.current?.value||'');
    window.addEventListener('zk-admin-flush-drafts',flush);
    return()=>window.removeEventListener('zk-admin-flush-drafts',flush);
  },[onCommit]);
  const keyDown=useCallback((e:any)=>{ if(e.key==='Enter'){ e.preventDefault(); commit(); onEnter?.(ref.current?.value||''); } },[commit,onEnter]);
  return <input ref={ref} type={type} defaultValue={defaultValue} onChange={handleChange} onBlur={commit} onKeyDown={keyDown} inputMode={inputMode||(numeric?'numeric':undefined)} style={style} placeholder={placeholder}/>;
});

const StableAdminTextarea = memo(function StableAdminTextarea({defaultValue='',onCommit,placeholder='',style,rows=3}:any){
  const ref=useRef<HTMLTextAreaElement|null>(null);
  const commit=useCallback(()=>{
    const val = ref.current?.value||'';
    const active=document.activeElement as HTMLElement|null;
    const wasInput = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA');
    setTimeout(()=>{
      onCommit?.(val);
      if(wasInput && active!==ref.current){
        requestAnimationFrame(()=>{
          try{ (active as HTMLElement).focus({preventScroll:true} as any); }catch{}
        });
      }
    },0);
  },[onCommit]);
  useEffect(()=>{
    const flush=()=>onCommit?.(ref.current?.value||'');
    window.addEventListener('zk-admin-flush-drafts',flush);
    return()=>window.removeEventListener('zk-admin-flush-drafts',flush);
  },[onCommit]);
  return <textarea ref={ref} defaultValue={defaultValue} onBlur={commit} placeholder={placeholder} style={style} rows={rows}/>;
});


export default function AdminPanel(){
 const app=useAppContext();
 const {cfg,saveCfg,mergeSettings,T,S,css,lang,goToAppA,onLogout,fileToData,deleteStoredImage,uploadPdfFile,deleteStoredFile,deleteStoredTonguePhoto,PROFILE_PHOTO,TH,Modal}=app;
 // FIX: حذف کامل preserve اسکرول/فوکوس قدیمی که باعث fg (دوبار کلیک) و sj (پرش صفحه) می‌شد
 // علت: ذخیره/بازیابی scrollTop و focus به المنت قبلی، باعث می‌شد کلیک روی فیلد B ابتدا focus به A برگردد
 // راه حل: فقط حفظ حالت باز بودن details از طریق openDetailsRef (پایین‌تر) کافی است؛ اسکرول و فوکوس به مرورگر سپرده می‌شود

 const goHome=()=>{try{app.setView('home')}catch{goToAppA()}};
 const [subs,setSubsState]=useState<any[]>(()=>getLS(SK.subs,[]));
 const subsRef=useRef<any[]>(subs); subsRef.current=subs;
 const [loadingSubs,setLoadingSubs]=useState(false);
 useEffect(()=>{let alive=true; const local=getLS(SK.subs,[]); if(isSupabaseConfigured){setLoadingSubs(true); fetchSubmissions().then(list=>{if(alive){const cloud=list||[]; const cloudIds=new Set(cloud.map((x:any)=>String(x.id))); setSubsState([...cloud,...local.filter((x:any)=>!cloudIds.has(String(x.id)))] )}}).catch(e=>{console.warn('Could not load submissions from Supabase',e);if(alive)setSubsState(local)}).finally(()=>{if(alive)setLoadingSubs(false)})}else setSubsState(local); return()=>{alive=false}},[]);
 const setSubs=useCallback((updater:any)=>{setSubsState(prev=>{const next=typeof updater==='function'?updater(prev):updater; const removedSubs=prev.filter((x:any)=>!next.some((y:any)=>y.id===x.id)); if(removedSubs.length){const removedIds=new Set(removedSubs.map((x:any)=>String(x.id))); try{const local=getLS(SK.subs,[]); if(Array.isArray(local)&&local.length)setLS(SK.subs,local.filter((x:any)=>!removedIds.has(String(x.id))))}catch{}} if(isSupabaseConfigured){try{const prevById=new Map(prev.map((x:any)=>[x.id,x])); if(removedSubs.length)softDeleteMultipleSubmissions(removedSubs.map((x:any)=>x.id)).catch(e=>console.warn('soft delete failed',e)); next.forEach((x:any)=>{const p=prevById.get(x.id); if(p&&p!==x)updateSubmission(x.id,x).catch(e=>console.warn('update failed',e))})}catch(e){console.warn(e)}}else{setLS(SK.subs,next); if(removedSubs.length){const now=new Date().toISOString(); removedSubs.forEach((x:any)=>{if(x?.payment?.receipt)deleteStoredImage(x.payment.receipt).catch(()=>{})}); const trash=getLS('zkid_trash_v1',[]); setLS('zkid_trash_v1',[...trash,...removedSubs.map((x:any)=>({...x,deleted_at:now,payment:x?.payment?.receipt?{...x.payment,receipt:'',receipt_image:'',receiptDeletedAt:now}:x.payment}))])}} if(removedSubs.length)setTrashKey(k=>k+1); return next})},[]);
 // اصلاح ۳-د: اگر فرم مشاوره‌ای بیش از ۱ روز در وضعیت «مشاوره شده» مانده باشد، به‌طور خودکار به «پیگیری» منتقل می‌شود (فقط یک‌بار در بارگذاری پنل بررسی می‌شود، بدون تداخل با ویرایش دستی هم‌زمان)
 useEffect(()=>{const now=Date.now(); const changed:any[]=[]; subs.forEach((x:any)=>{if(x.type==='consultation'&&x.consultationStatus==='مشاوره شده'&&x.consultationStatusChangedAt){const t=Date.parse(x.consultationStatusChangedAt); if(!isNaN(t)&&(now-t)>24*60*60*1000)changed.push(x.id)}}); if(changed.length)setSubs((list:any[])=>list.map(x=>changed.includes(x.id)?{...x,consultationStatus:'پیگیری',consultationStatusChangedAt:new Date().toISOString(),category:'پیگیری',changeHistory:logChange(x,'انتقال خودکار به پیگیری (بیش از ۱ روز از مشاوره‌شده)')}:x))},[subs.length]);
 const [editCfg,setEditCfgRawRaw]=useState<any|null>(null);
 // FIX: Defer setEditCfg + حفظ کامل اسکرول و فوکوس — رفع sj (پرش) و fg (انتخاب سپس لغو)
 // قبلی فقط .zkad-content/.admin-main را حفظ می‌کرد و در تب‌ها/لیست‌ها همچنان پرش دیده می‌شد
 // اکنون: تمام اسکرول‌های window + کانتینرهای اسکرول‌پذیر + فوکوس فعال را ذخیره و بعد از رندر با rAF برمی‌گردانیم
 const setEditCfgRaw=useCallback((u:any)=>{
   // رندر مستقیم بدون setTimeout، بازگردانی اجباری focus یا scroll.
   // نسخه قبلی در موبایل کیبورد را می‌بست و صفحه را به بخش دیگری می‌پراند.
   setEditCfgRawRaw(u as any);
 },[]); const [msg,setMsg]=useState(''); const [msgType,setMsgType]=useState<'ok'|'err'|'info'>('info'); const [saveProgress,setSaveProgress]=useState<number|null>(null); const [trashKey,setTrashKey]=useState(0);
 const setEditCfg=useCallback((u:any)=>{setEditCfgRaw(u as any)},[]);
 // FIX: Preserve <details> open state across re-renders.
 // When setEditCfg triggers a re-render, React re-creates <details> elements
 // which default to closed. This useEffect saves open state before re-render
 // and restores it after.
 const openDetailsRef=useRef<Set<string>>(new Set());
 useEffect(()=>{
  const getKey=(d:Element)=>{
    const k=(d as HTMLElement).getAttribute('data-detail-key');
    if(k) return k;
    return (d.querySelector('summary')?.textContent||'').trim().substring(0,80);
  };
  const onToggle=(e:Event)=>{
    const d=e.target as HTMLDetailsElement;
    const k=getKey(d);
    if(k){if(d.open)openDetailsRef.current.add(k);else openDetailsRef.current.delete(k)}
  };
  document.addEventListener('toggle',onToggle,true);
  return()=>document.removeEventListener('toggle',onToggle,true);
 },[]);
 // Restore open details IMMEDIATELY after render — اکنون با کلید پایدار data-detail-key
 useLayoutEffect(()=>{
   const getKey=(d:Element)=>{
     const k=(d as HTMLElement).getAttribute('data-detail-key');
     if(k) return k;
     return (d.querySelector('summary')?.textContent||'').trim().substring(0,80);
   };
   document.querySelectorAll('.admin-main details, .zkad-content details').forEach((d:Element)=>{
     const k=getKey(d);
     if(k&&openDetailsRef.current.has(k)&&(d as HTMLDetailsElement).open===false){(d as HTMLDetailsElement).open=true}
   });
 });
 // حذف handler مشکل‌ساز که کلیک روی دکمه‌های افزودن/حذف داخل details را می‌شکست
 // مرورگر به‌صورت native کلیک داخل محتوای details (غیر از summary) را toggle نمی‌کند، پس نیازی به stopPropagation نیست
 // این بلوک قبلاً باعث شده بود دکمه‌های "افزودن محتوا" و "افزودن آیتم" نمادین شوند (رویداد به target نمی‌رسید)
 const [aTab,setATab]=useState(()=>{try{return new URLSearchParams(window.location.search).get('tab')||app.adminTab||'dashboard'}catch{return app.adminTab||'dashboard'}});useEffect(()=>{if(app.adminTab)setATab(app.adminTab)},[app.adminTab]);
 const navigateFromAssistant=useCallback((tab:string,focus:string,recordId?:string)=>{if(recordId)try{sessionStorage.setItem('zk_admin_open_form',recordId)}catch{}setATab(tab);setEditCfg(JSON.parse(JSON.stringify(cfg)));try{const url=new URL(window.location.href);url.pathname='/admin/app';url.searchParams.set('tab',tab);if(focus)url.searchParams.set('focus',focus);else url.searchParams.delete('focus');if(recordId)url.searchParams.set('record',recordId);else url.searchParams.delete('record');window.history.replaceState({},'',url)}catch{}},[cfg,setEditCfg]);
 useEffect(()=>{let focus='';try{focus=new URLSearchParams(window.location.search).get('focus')||''}catch{}if(!focus)return;const find=()=>{const wanted=focus.replace(/\s+/g,' ').trim();const nodes=[...document.querySelectorAll<HTMLElement>('.admin-main h1,.admin-main h2,.admin-main h3,.admin-main summary,.admin-main legend,.admin-main label')];const node=nodes.find(item=>(item.textContent||'').replace(/\s+/g,' ').includes(wanted));if(!node)return false;const target=(node.closest('details,section,article,.zkad-box') as HTMLElement|null)||node;const details=target.closest('details') as HTMLDetailsElement|null;if(details)details.open=true;target.scrollIntoView({behavior:'smooth',block:'center'});const previous=target.style.outline;target.style.outline='3px solid var(--zkad-acc)';target.style.outlineOffset='4px';setTimeout(()=>{target.style.outline=previous;target.style.outlineOffset=''},2200);return true};const timers=[180,600,1200].map(delay=>window.setTimeout(find,delay));return()=>timers.forEach(clearTimeout)},[aTab]);
 useEffect(()=>{if(isAdminPasswordUpgradeRequired()){setATab('security');setMsgType('info');setMsg('برای امنیت پنل، رمز کوتاه فعلی را به رمزی با حداقل ۱۲ کاراکتر تغییر دهید.')}},[]);
 const [productHomeCrop,setProductHomeCrop]=useState<any>(null);
 const [productHomeCropBusy,setProductHomeCropBusy]=useState(false);
 // state کادر کاور هایلایت — باید اینجا (سطح AdminPanel) تعریف شود، نه داخل HighlightsTabEditor،
 // چون HighlightsTabEditor به‌صورت تابعی و شرطی صدا زده می‌شود و hook داخل آن باعث خطای Rules-of-Hooks (صفحهٔ سفید) می‌شد.
 const [hlCoverCropFor,setHlCoverCropFor]=useState<number|null>(null);
 // متن‌های bulk «افزودن دسته‌جمعی» هر هایلایت (key = id هایلایت) — باید اینجا نگه داشته شود تا
 // موقع «ذخیره هایلایت‌ها» قابل خواندن و تبدیل به اسلایدهای تکی باشد (بدون نقض Rules-of-Hooks).
 const [hlBulkTexts,setHlBulkTexts]=useState<Record<string,{internal:string;external:string}>>({});
 const [settingsSubTab,setSettingsSubTab]=useState<'secondary'|'primary'|'layout'|'translations'>('secondary'); const [srch,setSrch]=useState(''); const [debouncedSrch,setDebouncedSrch]=useState(''); const [typeF,setTypeF]=useState<'all'|'consultation'|'course'>('all');
 const [dataView,setDataView]=useState<'old'|'new'>((cfg as any)?.entryMode==='user'?'new':'old'); const [nvTab,setNvTab]=useState<'consult'|'course'>('consult'); const [nvPhone,setNvPhone]=useState(''); const [nvQ,setNvQ]=useState(''); const [catF,setCatF]=useState('همه'); const [dateF,setDateF]=useState(''); const [countryF,setCountryF]=useState('همه'); const [courseF,setCourseF]=useState('همه'); const [payF,setPayF]=useState('همه'); const [statusF,setStatusF]=useState('همه'); const [page,setPage]=useState(1); const [revokeBusy,setRevokeBusy]=useState(false); const [devicesList,setDevicesList]=useState<any[]|null>(null); const [devicesErr,setDevicesErr]=useState(''); const [cc,setCc]=useState<any>(()=>{try{return JSON.parse(JSON.stringify(editCfg.contacts||{}))}catch{return {}}}); useEffect(()=>{ if(aTab==='contacts'){ try{ setCc(JSON.parse(JSON.stringify(editCfg.contacts||{}))); }catch{} } },[aTab]); // eslint-disable-line react-hooks/exhaustive-deps
 // تغییر رمز/شماره ورود (admin-credentials) — state ها در سطح بالای کامپوننت (قانون hooks)
 const [credBusy,setCredBusy]=useState(false); const [credMsg,setCredMsg]=useState(''); const [credErr,setCredErr]=useState(''); const [credPhoneMasked,setCredPhoneMasked]=useState('');
 const credCurPwdRef=useRef<HTMLInputElement|null>(null); const credNewPhoneRef=useRef<HTMLInputElement|null>(null); const credRepPhoneRef=useRef<HTMLInputElement|null>(null); const credNewPwdRef=useRef<HTMLInputElement|null>(null); const credRepPwdRef=useRef<HTMLInputElement|null>(null); const [expIdRaw,setExpIdRaw]=useState<any>(()=>{try{return sessionStorage.getItem('zk_admin_open_form')||null}catch{return null}}); const expIdRef=useRef<any>(expIdRaw); const setExpId=useCallback((id:any)=>{expIdRef.current=id; setExpIdRaw(id); try{if(id)sessionStorage.setItem('zk_admin_open_form',String(id));else sessionStorage.removeItem('zk_admin_open_form')}catch{}},[]); const expId=expIdRaw; useEffect(()=>{expIdRef.current=expIdRaw},[expIdRaw]);
 // Stage 7A-fix: هوک‌های سه ادیتور شرطی به سطح کامپوننت hoist شدند تا قوانین Hooks رعایت شود (بدون هیچ تغییر رفتاری/منطقی)
 useEffect(()=>{if(aTab!=='data')return;let record='';try{record=new URLSearchParams(window.location.search).get('record')||sessionStorage.getItem('zk_admin_open_form')||''}catch{}if(record)setExpId(record)},[aTab,setExpId]);
 const [trustCat,setTrustCat]=useState<string>('health');
 const [bankErr,setBankErr]=useState('');
 // Phase 7: state های «تغییر رمز/شماره» حذف شدند — آن فیلدها سمت سرور block هستند (موفقیت کاذب).
 // فقط بیومتریک و خروج از نشست‌ها باقی می‌مانند.
 useEffect(()=>{const t=setTimeout(()=>setDebouncedSrch(srch),300);return()=>clearTimeout(t)},[srch]);
 // بارگذاری لیست دستگاه‌های فعال وقتی تب امنیت باز می‌شود (لیست واقعی نشست‌ها)
 useEffect(()=>{
   if(aTab!=='security')return;
   let alive=true;
   setDevicesErr('');
   listAdminDevices()
     .then(list=>{ if(alive) setDevicesList(list); })
     .catch(()=>{ if(alive){ setDevicesList([]); setDevicesErr('دریافت لیست دستگاه‌ها ممکن نشد.'); } });
   return ()=>{ alive=false; };
 },[aTab]);
 // بارگذاری شمارهٔ فعلی (ماسک‌شده) برای نمایش در بخش تغییر اطلاعات ورود
 useEffect(()=>{
   if(aTab!=='security')return;
   let alive=true;
   getAdminCredsInfo().then(i=>{ if(alive) setCredPhoneMasked(i.phoneMasked); }).catch(()=>{});
   return ()=>{ alive=false; };
 },[aTab]);
 // اصلاح ۹: رفع کامل مشکل پرش صفحه در پنل مدیریت — فیلد فوکوس‌شده به‌جای پرش ناگهانی مرورگر،
 // با اسکرول نرم (smooth) به مرکز دید (center) منتقل می‌شود. این افکت روی همه ورودی‌های
 // پنل مدیریت (شامل SubCard، SettingsEditor و سایر ادیتورها) به‌صورت سراسری اعمال می‌شود.
// Removed focusin scrollIntoView listener — was causing scroll jumps
 const setSave=async(next:any)=>{
  // ── ذخیره با نمایش پیشرفت و پیام شناور دقیق ──
  setSaveProgress(8); setMsgType('info'); setMsg('در حال ذخیره‌سازی…');
  const tick=setInterval(()=>{ setSaveProgress(p=>{ if(p===null)return p; const n=Math.min(92,p+8+(Math.random()*10)); return n; }); },120);
  const finish=(ok:boolean, saved:any)=>{
    clearInterval(tick);
    if(ok){ setSaveProgress(100); setMsgType('ok'); setMsg('ذخیره شد'); setTimeout(()=>{setMsg('');setSaveProgress(null);},1800); }
    else { setSaveProgress(null); setMsgType('err'); setMsg('ذخیره انجام نشد'); setTimeout(()=>setMsg(''),3200); }
    return saved;
  };
  try{
   const saved=await saveCfg(next);
   setEditCfgRawRaw(saved||next);
   return finish(true, saved||next);
  }catch{
   return finish(false, false);
  }
 };
 // اصلاح ۳-الف: یادآور پیگیری فقط وقتی نمایش داده می‌شود که بیش از ۳ روز گذشته، هیچ پیگیری‌ای ثبت نشده، و فرم از قبل در دسته «پیگیری» یا «پیگیری آخر ماه» نباشد (چون آن‌ها خودشان قبلاً وارد چرخه پیگیری شده‌اند)

 // FIX: Stabilize component identity with useMemo to prevent remount on every re-render
 // This fixes: (fg) double-tap on input fields, (sj) page jump / details collapse
 const AdminBtn=useCallback(():any=>({minHeight:44,padding:'9px 14px',border:`1px solid ${T.brd}`,background:T.card,borderRadius:6,color:T.acc,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:T.neuOut,transition:'all .25s ease'}),[T.brd,T.card,T.acc,T.neuOut]);
 const Err=useMemo(()=>({x}:{x:any})=><div className="zkad-err"><ZkWarnIcon size={13}/>{x}</div>,[]);
 const Tag=useMemo(()=>({x,tone='mut'}:{x:string,tone?:string})=><span className={`zkad-tag t-${tone}`}>{x}</span>,[]);
// scrollFocus removed — was causing scroll jumps
// FIX: Field با بافر محلی + commit تاخیری و حفظ فوکوس — رفع fg و جلوگیری از deselect سریع
// قبلی (controlled مستقیم) باعث می‌شد کلیک A->B، B ابتدا انتخاب سپس لغو شود — چون onChange فوری parent را رندر می‌کرد و فوکوس B از دست می‌رفت
const Field=useCallback(({label,value,onChange,ph,type='text',required=false,inputMode}:any)=>{
  // inputMode='text' صریح، تشخیص خودکار را خاموش می‌کند تا فیلدهای نام (مثل «نام صاحب کارت») کیبورد متنی بگیرند نه عددی.
  const isNumeric=inputMode==='numeric'?true:inputMode==='text'?false:/phone|whatsapp|شماره|کارت|شبا|قیمت|price|کد|postal|zip|سن|قد|وزن|age|height|weight/i.test(String(label||''));
  const [local,setLocal]=useState(value??'');
  const ref=useRef<HTMLInputElement|null>(null);
  useEffect(()=>{ setLocal(value??''); },[value]);
  const handleChange=useCallback((e:any)=>{
    const raw=e.target.value;
    const v=isNumeric?p2e(raw).replace(/[^0-9]/g,''):raw;
    setLocal(v);
  },[isNumeric]);
  const commit=useCallback(()=>{
    const cur = ref.current ? ref.current.value : local;
    const final=isNumeric?p2e(cur).replace(/[^0-9]/g,''):cur;
    if(final !== (value??'')){
      const active=document.activeElement as HTMLElement|null;
      const wasInput = active && (active.tagName==='INPUT' || active.tagName==='TEXTAREA' || (active as any).isContentEditable);
      onChange(final);
      if(wasInput && active!==ref.current){
        requestAnimationFrame(()=>{
          try{ (active as HTMLElement).focus({preventScroll:true} as any); const inp=active as HTMLInputElement; if(inp.setSelectionRange){ const len=inp.value.length; try{inp.setSelectionRange(len,len);}catch{} } }catch{}
        });
      }
    }
  },[onChange,local,value,isNumeric]);
  useEffect(()=>{
    const flush=()=>commit();
    window.addEventListener('zk-admin-flush-drafts',flush);
    return()=>window.removeEventListener('zk-admin-flush-drafts',flush);
  },[commit]);
  const handleBlur=useCallback((e:any)=>{
    setTimeout(()=>commit(),0);
  },[commit]);
  const handleKeyDown=useCallback((e:any)=>{
    if(e.key==='Enter'){ e.preventDefault(); commit(); }
  },[commit]);
  return <div style={{marginBottom:13}}><label style={S.lbl}>{label}{required&&<span style={{color:'#F59E0B',marginInlineStart:4,fontWeight:800}}>*</span>}</label><input ref={ref} inputMode={isNumeric?'numeric':undefined} type={type} style={S.inp} value={local} onChange={handleChange} onBlur={handleBlur} onKeyDown={handleKeyDown} placeholder={ph}/></div>;
},[S,T.err]);

 function Admin(){
  // اصلاح ۱: state برای مودال «فرم‌های دیگر با این شماره تماس»
  const [modalSub,setModalSub]=useState<any>(null);
  const [dashFilter,setDashFilter]=useState<string|null>(null);
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [refreshingSubs,setRefreshingSubs]=useState(false);
  const refreshSubmissions=async()=>{setRefreshingSubs(true);try{const local=getLS(SK.subs,[]);if(isSupabaseConfigured){const cloud=await fetchSubmissions();const ids=new Set((cloud||[]).map((x:any)=>String(x.id)));setSubsState([...(cloud||[]),...local.filter((x:any)=>!ids.has(String(x.id)))])}else setSubsState(local);setMsg('فرم‌ها و سفارشات بروزرسانی شد.')}catch(e){console.warn(e);setMsg('بروزرسانی ناموفق بود.')}finally{setRefreshingSubs(false);setTimeout(()=>setMsg(''),2500)}};
  const [selectedIds,setSelectedIds]=useState<Set<any>>(new Set());
  const toggleSelect=(id:any)=> setSelectedIds(prev=>{const n=new Set(prev); if(n.has(id)) n.delete(id); else n.add(id); return n;});
  const toggleSelectAll=(ids:any[])=> setSelectedIds(prev=>{ const allSelected = ids.every((id:any)=> prev.has(id)); if(allSelected) { const n=new Set(prev); ids.forEach((id:any)=> n.delete(id)); return n; } else { const n=new Set(prev); ids.forEach((id:any)=> n.add(id)); return n; }});
  const clearSelection=()=> setSelectedIds(new Set());
  const [imageFormat,setImageFormat]=useState<'webp'|'jpg'>(()=>{try{return localStorage.getItem('zkid_form_image_format')==='jpg'?'jpg':'webp'}catch{return 'webp'}});
  const setPersistentImageFormat=(f:'webp'|'jpg')=>{setImageFormat(f);try{localStorage.setItem('zkid_form_image_format',f)}catch{}};
  const downloadFormImage=async (item:any)=>{try{const blob=await generateFormImage(item,imageFormat);const u=URL.createObjectURL(blob);const a=document.createElement('a');a.href=u;a.download=`پرونده_${String(item.pName||item.fullPhone||item.id).replace(/\s+/g,'_')}.${imageFormat}`;a.click();setTimeout(()=>URL.revokeObjectURL(u),800)}catch(e){console.error('image export failed',e);alert('خطا در ساخت تصویر پرونده')}};
  const selectedCount = selectedIds.size;
  const statusOptions=['جدید','در انتظار پرداخت','پرداخت‌شده','ارسال‌شده','تکمیل‌شده','لغو‌شده','ناقص'];
  const getStatus=(x:any)=>x.orderStatus||(x.payment?.receipt?'پرداخت‌شده':x.course?'در انتظار پرداخت':x.isNew?'جدید':'جدید');
  const getCountry=(x:any)=>x.shipping?.country||(x.shipping?.dest==='iran'?'ایران':x.cc==='+98'?'ایران':x.cc||'—');
  const getCourse=(x:any)=>x.course?.title||'بدون دوره';
  const getPay=(x:any)=>x.payment?.receipt?'پرداخت‌شده':x.course?'در انتظار پرداخت':'بدون پرداخت';
  const getCategory=(x:any)=>x.category||(x.type==='consultation'?'مشاوره اولیه':x.type==='course'?'ثبتی':'بدون دسته‌بندی');
  const cats=['همه',...Array.from(new Set(['مشاوره اولیه',...(cfg.categories||[]),...subs.map(getCategory)]))];
  const countriesF=['همه',...Array.from(new Set(subs.map(getCountry).filter(Boolean)))];
  const coursesF=['همه',...Array.from(new Set(subs.map(getCourse).filter(Boolean)))];
  const payOptions=['همه','پرداخت‌شده','در انتظار پرداخت','بدون پرداخت'];
  const hay=(s:any)=>[s.pName,s.fullPhone,s.trackingCode,(s.topics||[]).join(' '),s.course?.title,s.course?.titleEn,s.shipping?.city,s.shipping?.country,s.shipping?.address,s.category,getStatus(s)].join(' ').toLowerCase();
  // اول روی همه فرم‌ها جستجو و فیلتر می‌کنیم، سپس نتیجه را صفحه‌بندی می‌کنیم.
  // بنابراین جستجو محدود به ۵۰ مورد صفحه فعلی نیست.
  const filteredAll=subs.filter(s=>(typeF==='all'||s.type===typeF)&&s.type!=='user'&&(catF==='همه'||getCategory(s)===catF)&&(!dateF||String(s.date||'').includes(dateF))&&(countryF==='همه'||getCountry(s)===countryF)&&(courseF==='همه'||getCourse(s)===courseF)&&(payF==='همه'||getPay(s)===payF)&&(statusF==='همه'||getStatus(s)===statusF)&&(!debouncedSrch||hay(s).includes(debouncedSrch.toLowerCase())));
  const pageSize=50,totalPages=Math.max(1,Math.ceil(filteredAll.length/pageSize)); const safePage=Math.min(page,totalPages); const filtered=filteredAll.slice((safePage-1)*pageSize,safePage*pageSize);
  const groups=(()=>{const byPhone=new Map<string,any[]>();const singles:any[]=[];filtered.forEach(s=>{const key=digits(s.fullPhone||'');if(!key){singles.push({head:s,children:[]});return}if(!byPhone.has(key))byPhone.set(key,[]);byPhone.get(key)!.push(s)});const out:any[]=[...singles];byPhone.forEach(list=>{const sorted=[...list].sort((a,b)=>subTime(a)-subTime(b));out.push({head:sorted[0],children:sorted.slice(1)})});const latest=(g:any)=>Math.max(subTime(g.head),...g.children.map((c:any)=>subTime(c)));return out.sort((a,b)=>latest(b)-latest(a))})();
  // انتخاب همه روی تمام نتایج فیلترشده انجام می‌شود، نه فقط ۵۰ مورد صفحه فعلی.
  const isAllSelected = filteredAll.length>0 && filteredAll.every((x:any)=> selectedIds.has(x.id));
  const rows=filtered.map(s=>({نام:s.pName||'',شماره:s.fullPhone||'',موضوع:(s.topics||[]).join('|'),کشور:getCountry(s),دوره:getCourse(s),پرداخت:getPay(s),وضعیت:getStatus(s),تاریخ:s.date||'',شهر:s.shipping?.city||'',یادداشت:s.adminNotes||'',دسته‌بندی:getCategory(s)}));
  const download=(name:string,content:string,type='text/plain;charset=utf-8')=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)};
  const exportExcel=()=>{const keys=Object.keys(rows[0]||{نام:'',شماره:'',موضوع:'',کشور:'',دوره:'',پرداخت:'',وضعیت:'',تاریخ:''});const html=`<html><meta charset="utf-8"><body><table border="1"><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${String((r as any)[k]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;download('zeynalikid-export.xls',html,'application/vnd.ms-excel;charset=utf-8')};
  const exportPhones=()=>download('phones.txt',filtered.map(s=>s.fullPhone).filter(Boolean).join('\n'));
  const exportWhatsApp=()=>{const links=filtered.map(s=>digits(s.fullPhone||'')).filter(Boolean).map(n=>`<p><a href="https://wa.me/${n}">${n}</a></p>`).join('');download('whatsapp-links.html',`<html><meta charset="utf-8"><body>${links}</body></html>`,'text/html;charset=utf-8')};
  // ─── بکاپ کامل: دانلود ZIP شامل تمام بخش‌ها و فایل‌های رسانه‌ای ───
  const downloadFullBackup=async()=>{
   try{
    const JSZip=(await import('jszip')).default;
    const zip=new JSZip();
    zip.file('settings.json', JSON.stringify(cfg, null, 2));
    zip.file('submissions.json', JSON.stringify(subs, null, 2));
    try{
     const [rv,qs]=await Promise.all([fetchReviews('all').catch(()=>[]),fetchUserQuestions('all').catch(()=>[])]);
     zip.file('reviews.json',JSON.stringify(rv,null,2));
     zip.file('questions.json',JSON.stringify(qs,null,2));
    }catch{}
    const seen=new Set<string>(); const urls:string[]=[];
    const isMedia=(s:string)=>/^https?:\/\//i.test(s)&&(/\.(png|jpe?g|webp|gif|svg|avif|pdf|mp4|mp3|webm|ogg|wav)(\?.*)?$/i.test(s)||/\/storage\/v1\/object\/public\//i.test(s));
    const walk=(v:any)=>{ if(!v)return; if(typeof v==='string'){ if(isMedia(v)&&!seen.has(v)){seen.add(v);urls.push(v);} return;} if(Array.isArray(v)){v.forEach(walk);return;} if(typeof v==='object'){for(const k of Object.keys(v)){try{walk((v as any)[k]);}catch{}}} };
    walk(cfg); subs.forEach(walk);
    const media=zip.folder('media'); const list:any[]=[]; let saved=0;
    for(let i=0;i<urls.length;i++){
     const u=urls[i];
     try{
      const res=await fetch(u,{mode:'cors'});
      if(res.ok){ const blob=await res.blob(); if(blob&&blob.size>0){ const nm=(u.split('/').pop()||('file'+i)).split('?')[0].slice(0,80)||('file'+i); if(media)media.file(i+'-'+nm,blob); saved++; list.push({url:u,saved:true}); continue; } }
     }catch{}
     list.push({url:u,saved:false});
    }
    zip.file('images-list.json', JSON.stringify({total:urls.length, saved, items:list}, null, 2));
    const blob=await zip.generateAsync({type:'blob'});
    const a=document.createElement('a'); const url=URL.createObjectURL(blob);
    a.href=url; a.download='backup-'+new Date().toISOString().slice(0,10)+'.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(url), 4000);
    alert('بکاپ کامل ساخته شد.\nبخش‌ها: تنظیمات / فرم‌ها و سفارشات / نظرات / سوالات / فایل‌های رسانه‌ای\nفایل‌های دانلودشده: '+saved+' — آدرس‌های دانلودنشده در images-list.json ذخیره شد.');
   }catch(e:any){ alert('خطا در ساخت بکاپ: '+(e?.message||e)); }
  };

  const changeStatus=useCallback((id:any,status:string)=>setSubs((list:any[])=>list.map(x=>x.id===id?{...x,orderStatus:status,changeHistory:logChange(x,`تغییر وضعیت به ${status}`)}:x)),[setSubs]);
  // باز/بستن کارت فرم — callback پایدار تا React.memo کارت‌ها بی‌دلیل رندر نشود
  const toggleOpenForm=useCallback((id:any)=>{setExpId(expIdRef.current===id?null:id)},[]);
  // وابستگی‌های تزریقی SubCard؛ با useMemo پایدار می‌مانند و باعث remount نمی‌شوند
  const subCardIO=useMemo(()=>({setSubs,cfg,uploadPdfFile,deleteStoredFile,deleteStoredImage,deleteStoredTonguePhoto,isSupabaseConfigured,updateSubmission}),[setSubs,cfg,uploadPdfFile,deleteStoredFile,deleteStoredImage,deleteStoredTonguePhoto]);
  // اصلاح ۸: فلش چرخان ۱۸۰ درجه برای details/summary در پنل مدیریت
  const adminDetailsCss=`details>summary{list-style:none}details>summary::-webkit-details-marker{display:none}details>summary::after{content:'';display:inline-block;width:10px;height:10px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .3s ease;margin-inline-start:6px;vertical-align:middle}details[open]>summary::after{transform:rotate(-135deg)}.admin-section-box{border:1px solid var(--zk-admin-border,#c8d5df);background:var(--zk-admin-surface,#f1f5f8)}.admin-main details{border-color:var(--zk-admin-border,#c8d5df)!important}.admin-main input[type=checkbox]{width:18px;height:18px;accent-color:var(--zk-action-primary,#1769c2)}.admin-main label{line-height:1.7}.admin-main .admin-section-box button{min-height:44px}`;
  // اصلاح ۳۵+۳۶: بازطراحی پنل مدیریت — داشبورد مدرن با کارت‌های آمار + منوی جانبی + رفع باگ کیبورد موبایل
  const startOfToday = (()=>{const d=new Date(); d.setHours(0,0,0,0); return d.getTime();})();
  const todaySubs=subs.filter((x:any)=> subTime(x) >= startOfToday);
  const courseSubs=subs.filter((x:any)=>x.type==='course');
  const consultSubs=subs.filter((x:any)=>x.type==='consultation');
  // Stage 7B: شاخص‌های داشبورد — مشتق‌شده از submissions واقعی (بدون داده دستی)
  const payOf=(x:any)=>(x.payment?.receipt||x.payment?.receiptText)?'پرداخت‌شده':x.course?'در انتظار پرداخت':'بدون پرداخت';
  const weekAgo=Date.now()-7*864e5, prevWeekAgo=Date.now()-14*864e5;
  const weekAll=subs.filter((x:any)=>subTime(x)>=weekAgo).length;
  const consultWeek=consultSubs.filter((x:any)=>subTime(x)>=weekAgo).length;
  const consultPrev=consultSubs.filter((x:any)=>subTime(x)>=prevWeekAgo&&subTime(x)<weekAgo).length;
  const paidCourseSubs=courseSubs.filter((x:any)=>payOf(x)==='پرداخت‌شده');
  const pendingList=subs.filter((x:any)=>x.unread||x.isNew||(x.type==='course'&&(x.orderStatus||'جدید')==='جدید')||(x.type==='consultation'&&(x.consultationStatus||'مشاوره اولیه')==='مشاوره اولیه'));
  const activity=useMemo(()=>[...subs].sort((a:any,b:any)=>subTime(b)-subTime(a)).slice(0,6).map((x:any)=>({id:x.id,t:subTime(x),tone:x.course?'t-info':'t-ok',txt:`${x.course?'ثبت‌نام دوره':'فرم مشاوره'} — ${x.pName||x.fullPhone||'بدون نام'}`})),[subs]);
  // اصلاح ۱۷+۳۵: تب‌های ناوبری با آیکون‌ها و دسته‌بندی
  const navIcon=(id:string)=>{const p={size:18,color:T.acc};if(id==='courses'||id==='featured'||id==='tagged')return <CoursesIcon {...p}/>;if(id==='content'||id==='highlights'||id==='images')return <EducationIcon {...p}/>;if(id==='contacts')return <ContactIcon {...p}/>;if(id==='licenses')return <LicensesIcon {...p}/>;if(id==='data'||id==='analytics')return <SearchIcon {...p}/>;if(id==='userQuestions'||id==='assistant'||id==='trust'||id==='trustbox')return <ChatIcon {...p}/>;if(id==='products')return <ProductsIcon {...p}/>;if(id==='settings'||id==='security'||id==='shipping'||id==='trash')return <BoxIcon {...p}/>;return <AdminIcon {...p}/>};
  const navTabs:[string,React.ReactNode,string][]=[['dashboard',navIcon('dashboard'),'داشبورد'],['data',navIcon('data'),'فرم‌ها و دوره‌ها'],['userQuestions',navIcon('userQuestions'),'سوالات مخاطبین'],['assistant',navIcon('assistant'),'دستیار'],['settings',navIcon('settings'),'تنظیمات'],['entry',navIcon('settings'),'صفحهٔ ورودی سایت'],['content',navIcon('content'),'مدیریت محتوا'],['contacts',navIcon('contacts'),'ارتباط'],['courses',navIcon('courses'),'دوره‌ها'],['featured',navIcon('featured'),'دوره‌های ویژه'],['tagged',navIcon('tagged'),'دوره‌های تگ‌دار'],['trust',navIcon('trust'),'جملات موفقیت'],['trustbox',navIcon('trustbox'),'جملات اعتمادساز'],['shipping',navIcon('shipping'),'ارسال و بانک'],['analytics',navIcon('analytics'),'آمار بازدید'],['security',navIcon('security'),'امنیت'],['trash',navIcon('trash'),'سطل آشغال'],['products',navIcon('products'),'محصولات'],['highlights',navIcon('highlights'),'هایلایت'],['licenses',navIcon('licenses'),'مجوزها'],['services',navIcon('services'),'خدمات'],['images',navIcon('images'),'تصاویر'],['design',navIcon('settings'),'مدیریت دیزاین']];
  const activeNavLabel=navTabs.find(x=>x[0]===aTab)?.[2]||'داشبورد';
 // Stage 7A: گروه‌بندی منوی سایدبار — همه تب‌های موجود حفظ شده‌اند و هیچ route جدیدی ساخته نشده است.
 const navGroups:AdminNavGroup[]=[
  {id:'dashboard',label:'داشبورد',icon:<ZkDashboardIcon size={17}/>},
  {id:'data',label:'فرم‌ها و دوره‌ها',icon:<ZkUsersIcon size={17}/>},
  {id:'userQuestions',label:'سوالات مخاطبین (سوال دارم)',icon:<ZkChatIcon size={17}/>},
  {id:'assistant',label:'دستیار',icon:<ZkChatIcon size={17}/>},
   {id:'reviews',label:'نظرات کاربران',icon:<ZkStarIcon size={17}/>},
  {id:'consultants',label:'مشاورین و لینک‌های ارجاع',icon:<ZkUsersIcon size={17}/>},
  {id:'courses',label:'دوره‌ها',icon:<ZkCoursesIcon size={17}/>,items:[{id:'featured',label:'دوره‌های ویژه'},{id:'tagged',label:'دوره‌های تگ‌دار'}]},
  {id:'products',label:'محصولات',icon:<ZkProductsIcon size={17}/>,items:[{id:'services',label:'خدمات'}]},
  {id:'trustbox',label:'جملات اعتمادساز',icon:<ZkReviewsIcon size={17}/>,items:[{id:'trust',label:'جملات صفحه موفقیت'}]},
  {id:'shipping',label:'ارسال و پرداخت',icon:<ZkTruckIcon size={17}/>},
  {id:'content',label:'محتوا و صفحات',icon:<ZkContentIcon size={17}/>,items:[{id:'images',label:'تصاویر'},{id:'highlights',label:'هایلایت'},{id:'licenses',label:'مجوزها'},{id:'contacts',label:'راه‌های ارتباطی'}]},
  {id:'settings',label:'تنظیمات',icon:<ZkSettingsIcon size={17}/>,items:[{id:'design',label:'مدیریت دیزاین'},{id:'security',label:'امنیت'},{id:'analytics',label:'آمار بازدید'},{id:'entry',label:'صفحهٔ ورودی سایت'},{id:'errors',label:'خطاهای سیستم'}]},
  {id:'trash',label:'سطل بازیافت',icon:<ZkTrashIcon size={17}/>},
 ];
  // FIX: Stabilize StatCard and ChipGroup identity to prevent dashboard remount
  const StatCard=useMemo(()=>{return ({icon,label,value,sub,delta,dot=false,tone='info',active=false,onClick}:{icon:React.ReactNode,label:string,value:any,sub?:string,delta?:number,dot?:boolean,tone?:string,active?:boolean,onClick?:()=>void})=><div role={onClick?"button":undefined} tabIndex={onClick?0:undefined} onClick={onClick} onKeyDown={onClick? (e:any)=>{if(e.key==='Enter'||e.key===' ') {e.preventDefault(); onClick();}}:undefined} className={`zkad-stat-card ${tone==='warn'?'zkad-warn-card':''} ${active?'zkad-stat-active':''} ${onClick?'zkad-clickable':''}`} style={onClick?{cursor:'pointer',outline: active?`2px solid ${'var(--zkad-acc)'}`:undefined, borderColor: active? 'var(--zkad-acc)':undefined}:undefined}>
   {dot&&<span className="zkad-stat-dot" aria-hidden="true"/>}
   <span className={`zkad-stat-icon t-${tone}`}>{icon}</span>
   <div className="zkad-stat-lbl">{label}</div>
   <div className="zkad-stat-num">{value}</div>
   <div className="zkad-stat-foot">{typeof delta==='number'&&delta!==0&&<span className={`zkad-delta ${delta>0?'up':'down'}`} title="تغییر نسبت به هفته قبل">{delta>0?<ZkChevronUpIcon size={11}/>:<ZkChevronDownIcon size={11}/>}{faNum(Math.abs(delta))} هفته قبل</span>}{typeof delta==='number'&&delta===0&&<span className="zkad-delta flat">بدون تغییر نسبت به هفته قبل</span>}{sub&&<span className="zkad-stat-sub">{sub}</span>}</div>
  </div>;},[]);
  const ChipGroup=useMemo(()=>function FilterCard({label,options,val,set}:{label:string,options:string[],val:string,set:(v:string)=>void}){const [open,setOpen]=useState(false);return <section className={`zkad-filter-card ${open?'zkad-filter-open':''}`}><button type="button" className="zkad-filter-card-head" onClick={()=>setOpen(v=>!v)}><span>{label}</span><small>{val}</small><b>{open?'⌃':'⌄'}</b></button>{open&&<div className="zkad-chiprow">{options.map(o=><button type="button" key={o} className={`zkad-chip ${val===o?'on':''}`} onClick={()=>{set(o);setOpen(false)}}>{o}</button>)}</div>}</section>},[]);
  // پایش هوشمند ظرفیت دیتابیس و فضای ذخیره‌سازی
  const totalTonguePhotos = useMemo(() => subs.reduce((acc:number, x:any) => acc + (x.tonguePhotos || []).length, 0), [subs]);
  const totalReceipts = useMemo(() => subs.filter((x:any) => x.payment?.receipt).length, [subs]);
  const totalVoiceNotes = useMemo(() => subs.filter((x:any) => x.voice_note_url || x.childInfo?.child_voice_note_url).length, [subs]);
  const estimatedStorageMB = Math.round((totalTonguePhotos * 1.5 + totalReceipts * 0.4 + totalVoiceNotes * 0.8 + subs.length * 0.02) * 10) / 10;
  const storageCapacityLimitMB = 1000;
  const usedPercent = Math.min(99, Math.max(8, Math.round((estimatedStorageMB / storageCapacityLimitMB) * 100)));
  const remainingPercent = Math.max(1, 100 - usedPercent);
  const isStorageWarning = remainingPercent <= 20 || usedPercent >= 80;

  return <div dir={lang==='en'?'ltr':'rtl'} className="admin-root" style={{...S.page,direction:lang==='en'?'ltr':'rtl',padding:0,minHeight:'100dvh',alignItems:'stretch',background:T.bg}}><style>{css}{adminDetailsCss}{`
  /* Stage 7A: پوسته پنل (Sidebar/Drawer/Header) در zkadmin-tokens.css تعریف شده است.
     قوانین زیر فقط رفتار فوکوس/اسکرول/zoom iOS محتوای داخلی پنل را حفظ می‌کنند. */
  .admin-main{min-width:0}
  .admin-main input,.admin-main textarea,.admin-main select{font-size:16px!important;max-width:100%}
  .admin-main input:focus,.admin-main textarea:focus,.admin-main select:focus{scroll-margin-top:120px;scroll-margin-bottom:24px}
  .admin-main input[type="color"]:focus{scroll-margin-top:120px;scroll-margin-bottom:24px}
  .admin-main table{max-width:100%;overflow-x:auto;display:block}
  .admin-main .filter-group{min-width:0}
  .zkad-storage-banner h3{word-break:break-word;line-height:1.7}
  .zkad-storage-actions button{white-space:normal;min-width:0}
  @media(max-width:640px){
    .zkad-storage-actions{width:100%;display:grid!important;grid-template-columns:1fr 1fr;gap:6px}
    .zkad-storage-actions button{width:100%}
    .zkad-storage-banner{padding:12px 14px}
  }
  `}</style><AdminLayout lang={lang} groups={navGroups} active={aTab} onNavigate={(id:string)=>{setATab(id);setEditCfg(JSON.parse(JSON.stringify(cfg)))}} onLogout={onLogout} onHome={goHome} version="1.0.0">
  <div className="admin-main"><div style={{maxWidth:1100,margin:'0 auto'}}>{aTab!=='dashboard'&&aTab!=='data'&&<div className="zkad-page-head"><div><h2>{(navGroups.find(g=>g.id===aTab||(g.items||[]).some(i=>i.id===aTab))||{}).label||''}</h2><p>{({assistant:'آموزش، آزمایش و مدیریت پاسخ‌های دستیار راهنمای زینالیکید',userQuestions:'مدیریت سوالات و درخواست‌های تماس مخاطبین (بخش سوال دارم) همراه با شماره تماس، ویس و متن سوال',settings:'پیکربندی فرم‌ها، فیلدها و رفتار سایت',content:'متن‌های صفحات، سوالات متداول و ترجمه‌ها',consultants:'مدیریت مشاورین، لینک‌های ارجاع اختصاصی، اطلاعات بانکی/کیف پول و نمایش در صفحه درباره ما و صفحه هوم',contacts:'شماره‌ها، شبکه‌های اجتماعی و راه‌های ارتباطی',courses:'تب‌ها، دوره‌ها و واحد پول',featured:'بخش دوره‌های ویژه صفحه اصلی',tagged:'دوره‌های ویژه با تگ',trustbox:'جملات اعتمادساز باکس صفحه اصلی',trust:'جملات صفحات موفقیت',shipping:'روش‌های ارسال، حساب‌های بانکی و درگاه‌ها',analytics:'بازدید صفحات به تفکیک زمان',security:'شماره تماس و رمز عبور پنل',products:'محصولات فروشگاه',highlights:'هایلایت استوری‌ها',licenses:'مجوزها و گواهی‌ها',services:'خدمات و کاروسل صفحه اصلی',images:'تصاویر صفحه اصلی و فرم مشاوره',design:'دیزاین هر بخش از سایت',trash:'موارد حذف‌شده قابل بازیابی'} as any)[aTab]||''}</p></div></div>}
  {aTab==='dashboard'&&<><div className="zkad-page-head"><div><h2>داشبورد</h2><p>نمای کلی عملکرد و درخواست‌های امروز</p></div><button type="button" className="zkad-head-btn" onClick={goHome}><ZkHomeIcon size={14}/> بازدید از سایت</button></div>

{/* بنر هوشمند پایش و هشدار ظرفیت دیتابیس و استوریج (هایلایت قرمز بولد در صورت کمبود فضا) */}
<div className="zkad-storage-banner" style={{
  background: isStorageWarning ? 'var(--zkad-tag-err-bg)' : 'var(--zkad-card)',
  border: `2px solid ${isStorageWarning ? 'var(--zkad-err)' : 'var(--zkad-brd)'}`,
  borderRadius: 16,
  padding: '14px 18px',
  marginBottom: 16,
  boxShadow: isStorageWarning ? '0 0 20px rgba(220, 38, 38, 0.22)' : 'var(--zkad-neu-out)',
  transition: 'all .3s ease'
}}>
  <div className="zkad-storage-head" style={{display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10, marginBottom:8}}>
    <div style={{display:'flex', alignItems:'center', gap:8, minWidth:0, flex:'1 1 200px'}}>
      <span style={{fontSize:20}}>{isStorageWarning ? '⚠️' : '💾'}</span>
      <div>
        <h3 style={{margin:0, fontSize:14.5, fontWeight:800, color: isStorageWarning ? 'var(--zkad-tag-err-tx)' : 'var(--zkad-ttl)'}}>
          {isStorageWarning
            ? `هشدار فوری ظرفیت ذخیره‌سازی: تنها حدود ${faNum(remainingPercent)}٪ از فضای دیتابیس و استوریج باقی مانده است!`
            : `پایش هوشمند ظرفیت دیتابیس و فضای ذخیره‌سازی (استوریج): ${faNum(remainingPercent)}٪ در دسترس`}
        </h3>
        <p style={{margin:'2px 0 0', fontSize:11.5, color: isStorageWarning ? 'var(--zkad-tag-err-tx)' : 'var(--zkad-mut)'}}>
          {isStorageWarning
            ? 'فضای ذخیره‌سازی شما رو به اتمام است. جهت جلوگیری از اختلال در ثبت فرم‌ها و آپلود تصاویر، فیش‌های قدیمی را پاک‌سازی یا فضا را آزاد نمایید.'
            : 'پایش مستمر حجم عکس‌های زبان، فیش‌های واریزی، فایل‌های صوتی و رکوردهای پایگاه داده.'}
        </p>
      </div>
    </div>
    <div className="zkad-storage-actions" style={{display:'flex', gap:6, flexWrap:'wrap'}}>
      <button
        type="button"
        className="zkad-toolbtn"
        style={{background:'var(--zkad-tag-err-bg)', color:'var(--zkad-tag-err-tx)', borderColor:'var(--zkad-err)', fontWeight:800}}
        onClick={async () => {
          // Phase 3: use admin-api client with sessionToken + dryRun first
          try {
            const { adminCleanupReceiptsDryRun, adminCleanupReceiptsExecute } = await import('../lib/adminApi');
            // 1) Dry-run to count target files
            const dry = await adminCleanupReceiptsDryRun();
            if (dry.targetFiles === 0) {
              alert('هیچ فیش قدیمی‌ای برای پاک‌سازی یافت نشد.');
              return;
            }
            // 2) Confirm with user — show exact count
            if (!confirm(`آیا از پاک‌سازی ${dry.targetFiles} فیش قدیمی (بیش از ۱ ماه) مطمئن هستید؟ این عملیات قابل بازگشت نیست.`)) return;
            // 3) Execute
            const result = await adminCleanupReceiptsExecute();
            alert(`پاک‌سازی با موفقیت انجام شد.\nفایل‌های حذف‌شده: ${result.deleted}\nرکوردهای به‌روزرسانی‌شده: ${result.cleanedRows}`);
          } catch (e: any) {
            if (e?.status === 401) {
              alert('نشست ادمین معتبر نیست. لطفاً دوباره وارد شوید.');
              return;
            }
            alert(e?.message || 'خطا در پاک‌سازی فیش‌ها.');
          }
        }}
      >
        🧹 پاک‌سازی فیش‌های قدیمی
      </button>
      <button type="button" className="zkad-toolbtn" onClick={exportExcel}>
        📥 بک‌آپ Excel
      </button>
      <button type="button" className="zkad-toolbtn" style={{background:'var(--zkad-tag-info-bg)', color:'var(--zkad-tag-info-tx)', borderColor:'var(--zkad-info)', fontWeight:800}} onClick={downloadFullBackup}>
        🗜️ بک‌آپ کامل (ZIP)
      </button>
    </div>
  </div>

  {/* Progress Bar */}
  <div style={{height:10, borderRadius:8, background:'var(--zkad-inp)', overflow:'hidden', boxShadow:'inset 0 1px 3px rgba(0,0,0,0.1)', marginBottom:10}}>
    <div style={{
      height:'100%',
      width:`${usedPercent}%`,
      background: isStorageWarning ? 'linear-gradient(90deg, #f59e0b, #dc2626)' : 'linear-gradient(90deg, #10b981, #0ea5e9)',
      borderRadius:8,
      transition:'width .4s ease'
    }}/>
  </div>

  {/* Metrics breakdown chips */}
  <div style={{display:'flex', gap:8, flexWrap:'wrap', fontSize:11.5, color:'var(--zkad-txt)'}}>
    <span style={{background:'var(--zkad-badge)', padding:'3px 8px', borderRadius:6, border:'1px solid var(--zkad-brd)'}}>
      📸 عکس‌های زبان: <b>{faNum(totalTonguePhotos)} فایل</b>
    </span>
    <span style={{background:'var(--zkad-badge)', padding:'3px 8px', borderRadius:6, border:'1px solid var(--zkad-brd)'}}>
      🧾 فیش‌های واریزی: <b>{faNum(totalReceipts)} فایل</b>
    </span>
    <span style={{background:'var(--zkad-badge)', padding:'3px 8px', borderRadius:6, border:'1px solid var(--zkad-brd)'}}>
      🎙️ یادداشت‌های صوتی: <b>{faNum(totalVoiceNotes)} فایل</b>
    </span>
    <span style={{background:'var(--zkad-badge)', padding:'3px 8px', borderRadius:6, border:'1px solid var(--zkad-brd)'}}>
      📄 کل رکوردهای ثبت‌شده: <b>{faNum(subs.length)} مورد</b>
    </span>
    <span style={{background: isStorageWarning ? 'var(--zkad-tag-err-bg)' : 'var(--zkad-badge)', color: isStorageWarning ? 'var(--zkad-tag-err-tx)' : 'inherit', padding:'3px 8px', borderRadius:6, border:`1px solid ${isStorageWarning ? 'var(--zkad-err)' : 'var(--zkad-brd)'}`, fontWeight:800}}>
      💾 حجم تخمینی: <b>{faNum(estimatedStorageMB)} MB / {faNum(storageCapacityLimitMB)} MB ({faNum(usedPercent)}%)</b>
    </span>
  </div>
</div>

<div className="zkad-stat-grid">
 <StatCard tone="info" icon={<ZkReviewsIcon size={18}/>} label="کل فرم‌های مشاوره" value={faNum(consultSubs.length)} delta={consultWeek-consultPrev} sub={`این هفته: ${faNum(consultWeek)}`} active={dashFilter==='consult'} onClick={()=> setDashFilter(dashFilter==='consult'?null:'consult')}/>
 <StatCard tone="ok" icon={<ZkCalendarIcon size={18}/>} label="فرم‌های امروز" value={faNum(todaySubs.length)} sub={`هفته جاری: ${faNum(weekAll)}`} active={dashFilter==='today'} onClick={()=> setDashFilter(dashFilter==='today'?null:'today')}/>
 <StatCard tone="info" icon={<ZkOrdersIcon size={18}/>} label="ثبت‌نام دوره موفق" value={faNum(paidCourseSubs.length)} sub={`از مجموع ${faNum(courseSubs.length)}`} active={dashFilter==='courseSuccess'} onClick={()=> setDashFilter(dashFilter==='courseSuccess'?null:'courseSuccess')}/>
 <StatCard tone="warn" icon={<ZkClockIcon size={18}/>} label="در انتظار بررسی" value={faNum(pendingList.length)} dot={pendingList.length>0} sub="فرم‌ها و سفارش‌های بررسی‌نشده" active={dashFilter==='pending'} onClick={()=> setDashFilter(dashFilter==='pending'?null:'pending')}/>
</div>
{dashFilter&&<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:12,padding:'8px 12px',background:'var(--zkad-acc-soft)',border:'1px solid var(--zkad-acc)',borderRadius:8, fontSize:12, fontWeight:700, color:'var(--zkad-acc)'}}><span>فیلتر فعال: {dashFilter==='today'?'فرم‌های امروز':dashFilter==='pending'?'در انتظار بررسی':dashFilter==='courseSuccess'?'ثبت‌نام دوره موفق':dashFilter==='consult'?'کل فرم‌های مشاوره':''}</span><button onClick={()=>setDashFilter(null)} style={{marginInlineStart:'auto',background:'var(--zkad-card)',border:'1px solid var(--zkad-brd)',borderRadius:6,padding:'4px 10px',fontSize:11,cursor:'pointer'}}>حذف فیلتر ✕</button></div>}

{dashFilter ? (
  <section className="zkad-panel-card" style={{marginBottom:12}}>
    <header><h3>{dashFilter==='today'?'فرم‌های امروز':dashFilter==='pending'?'در انتظار بررسی':dashFilter==='courseSuccess'?'ثبت‌نام دوره موفق':dashFilter==='consult'?'کل فرم‌های مشاوره':''} — {(() => {
      const list = dashFilter==='today'? todaySubs : dashFilter==='pending'? pendingList : dashFilter==='courseSuccess'? paidCourseSubs : dashFilter==='consult'? consultSubs : [];
      return faNum(list.length);
    })()} مورد</h3><button type="button" className="zkad-linkbtn" onClick={()=>setDashFilter(null)}>حذف فیلتر</button></header>
    {(() => {
      const list = dashFilter==='today'? todaySubs : dashFilter==='pending'? pendingList : dashFilter==='courseSuccess'? paidCourseSubs : dashFilter==='consult'? consultSubs : [];
      const sorted = [...list].sort((a:any,b:any)=> subTime(b)-subTime(a)).slice(0,20);
      if(sorted.length===0) return <div className="zkad-empty" style={{padding:'20px'}}><p>موردی یافت نشد</p></div>;
      return <ul>{sorted.map((x:any)=><li key={x.id}><button type="button" className="zkad-activity" onClick={()=>{goTab('data');setExpId(x.id);setDashFilter(null);}}><span className={`zkad-activity-dot ${x.course?'t-info':'t-ok'}`}/><span className="zkad-activity-txt"><b>{x.pName||x.fullPhone||'بدون نام'}</b><span className="zkad-time">{fmtWhen(x)} · {relTime(subTime(x))}</span></span><span className={`zkad-tag ${x.course?'t-info':x.type==='consultation'?'t-warn':'t-mut'}`}>{x.course? 'سفارش' : x.type==='consultation' ? 'مشاوره' : 'فرم'}</span></button></li>)}</ul>;
    })()}
  </section>
) : null}
<div className="zkad-panels-grid">
 <section className="zkad-panel-card">
  <header><h3><ZkWarnIcon size={15} color="var(--zkad-warn)"/> در انتظار بررسی</h3><button type="button" className="zkad-linkbtn" onClick={()=>goTab('data')}>مشاهده همه</button></header>
  {pendingList.length===0?<div className="zkad-empty" style={{padding:'26px 16px'}}><ZkCheckCircleIcon size={24}/><p>موردی در انتظار بررسی نیست</p><small>همه فرم‌ها و سفارش‌ها بررسی شده‌اند</small></div>
  :<ul>{pendingList.slice(0,5).map((x:any)=><li key={x.id}><button type="button" className="zkad-activity" onClick={()=>{goTab('data');setExpId(x.id);}}><span className="zkad-activity-dot t-warn"/><span className="zkad-activity-txt"><b>{x.pName||x.fullPhone||'بدون نام'}</b><span className="zkad-time">{fmtWhen(x)} · {relTime(subTime(x))}</span></span><span className={`zkad-tag ${x.course?'t-info':'t-warn'}`}>{x.course?'سفارش جدید':'فرم جدید'}</span></button></li>)}</ul>}
 </section>
 <section className="zkad-panel-card">
  <header><h3><ZkClockIcon size={15} color="var(--zkad-info)"/> فعالیت اخیر</h3><button type="button" className="zkad-linkbtn" onClick={()=>goTab('data')}>همه موارد</button></header>
  {activity.length===0?<div className="zkad-empty" style={{padding:'26px 16px'}}><ZkClockIcon size={24}/><p>هنوز فعالیت اینجا ثبت نشده</p></div>
  :<ul>{activity.map((ev:any)=><li key={ev.id}><div className="zkad-activity" style={{cursor:'default'}}><span className={`zkad-activity-dot ${ev.tone}`}/><span className="zkad-activity-txt"><b>{ev.txt}</b><span className="zkad-time">{relTime(ev.t)}</span></span></div></li>)}</ul>}
 </section>
</div>
{loadingSubs&&<div className="zkad-loading"><span className="zkad-spin"/>در حال بارگذاری...</div>}</>}{aTab==='entry'&&editCfg&&<EntryModeSettings app={{...app, AdminBtn, Box, setEditCfg, cfg:editCfg||cfg}}/>}{aTab==='data'&&<>{subs.length>1000&&<div className="zkad-tag t-warn" style={{marginBottom:10,fontSize:11,padding:'8px 10px'}}>برای نمایش همه فرم‌ها، از فیلتر استفاده کنید</div>}
<div className="zkad-data-hero"><div><span className="zkad-data-eyebrow">مدیریت ارتباط با مخاطب</span><h3>فرم‌ها و سفارشات <small title="کل ثبت‌شده‌ها / تعداد همین صفحه" style={{direction:'ltr',display:'inline-block'}}>{faNum(subs.length)} / {faNum(groups.length)}</small></h3></div><div style={{ display: 'flex', gap: 6, alignItems: 'center', padding: 4, background: T.inp, borderRadius: 12, border: `1px solid ${T.brd}` }}>
   {(['old','new'] as const).map(v => <button key={v} type="button" onClick={() => setDataView(v)} style={{ padding: '7px 14px', borderRadius: 9, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 900, background: dataView === v ? T.acc : 'transparent', color: dataView === v ? '#fff' : T.mut }}>{v === 'old' ? (T.en ? 'Old view' : 'نمای قدیمی') : (T.en ? 'User view' : 'نمای جدید')}</button>)}
  </div><button type="button" className="zkad-refresh-btn" onClick={refreshSubmissions} disabled={refreshingSubs}>{refreshingSubs?"در حال بروزرسانی…":"↻ بروزرسانی"}</button></div>
{dataView==='old'?<><div className="zkad-toolbar">
 <div className="zkad-search"><ZkSearchIcon size={16}/><input placeholder="نام، شماره، کد پیگیری..." value={srch} onChange={e=>{setSrch(e.target.value);setPage(1)}} aria-label="جستجوی فرم‌ها"/></div>
 <div className="zkad-toolbar-actions">
  <button type="button" className="zkad-toolbtn" title="خروجی Excel" onClick={exportExcel}><ZkDownloadIcon size={14}/> Excel</button>
  <button type="button" className="zkad-toolbtn" title="خروجی شماره‌ها" onClick={exportPhones}><ZkPhoneIcon size={14}/> شماره‌ها</button>
  <button type="button" className="zkad-toolbtn" title="خروجی واتساپ" onClick={exportWhatsApp}><ZkSendIcon size={14}/> واتساپ</button>
  {filtersActive&&<button type="button" className="zkad-toolbtn" title="حذف فیلترها" onClick={clearFilters}><ZkFilterIcon size={14}/> حذف فیلترها</button>}
 </div>
</div>
<div className="zkad-filter-toggle"><button type="button" onClick={()=>setFiltersOpen(v=>!v)}>{filtersOpen?"− بستن فیلترها":"+ فیلترها و تنظیمات خروجی"}{filtersActive&&<span> فعال</span>}</button>{filtersOpen&&<button type="button" onClick={clearFilters}>پاک‌کردن</button>}</div>{filtersOpen&&<div className="zkad-chips-area">
 <ChipGroup label="نوع ثبت" options={['همه','درخواست مشاوره','ثبت دوره']} val={typeF==='all'?'همه':typeF==='consultation'?'درخواست مشاوره':'ثبت دوره'} set={v=>{setTypeF(v==='درخواست مشاوره'?'consultation':v==='ثبت دوره'?'course':'all');setPage(1)}}/>
 <ChipGroup label="دسته‌بندی" options={cats} val={catF} set={v=>{setCatF(v);setPage(1)}}/>
 <ChipGroup label="وضعیت سفارش" options={['همه',...statusOptions]} val={statusF} set={v=>{setStatusF(v);setPage(1)}}/>
 <ChipGroup label="پرداخت" options={payOptions} val={payF} set={v=>{setPayF(v);setPage(1)}}/>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%'}}><ChipGroup label="کشور" options={countriesF} val={countryF} set={v=>{setCountryF(v);setPage(1)}}/><div className="zkad-chipgroup"><span className="zkad-chipgroup-lbl">تاریخ ثبت</span><input className="zkad-datechip" placeholder="مثلاً ۱۴۰۴/۰۴" value={dateF} onChange={e=>{setDateF(e.target.value);setPage(1)}} aria-label="فیلتر تاریخ ثبت"/></div></div>
 <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,width:'100%'}}><ChipGroup label="دوره" options={coursesF} val={courseF} set={v=>{setCourseF(v);setPage(1)}}/><label className="zkad-toolbtn" style={{display:'inline-flex',alignItems:'center',justifyContent:'center',gap:6}}>فرمت تصویر <select value={imageFormat} onChange={e=>setPersistentImageFormat(e.target.value as any)} style={{border:0,background:'transparent',fontFamily:'inherit',fontWeight:800}}><option value="webp">webp</option><option value="jpg">jpg</option></select></label></div>
</div>}{/* اصلاح ۱: فقط سرگروه (جدیدترین فرم) در لیست اصلی نمایش داده می‌شود؛ بقیه فرم‌های همان شماره از داخل خودِ کارت («فرم‌های دیگر با این شماره تماس») با کلیک در یک مودال مستقل باز می‌شوند — بدون نمایش تو رفته/زیرمجموعه در لیست اصلی */}<div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10,padding:'8px 12px',background:'var(--zkad-card)',border:'1px solid var(--zkad-brd)',borderRadius:8}}>
  <label style={{display:'flex',alignItems:'center',gap:6,fontSize:13,fontWeight:700,cursor:'pointer'}}><input type="checkbox" checked={isAllSelected} onChange={()=> toggleSelectAll(filteredAll.map((x:any)=>x.id))}/> انتخاب همه ({faNum(filteredAll.length)})</label>
  {selectedCount>0 && <span style={{fontSize:12,color:'var(--zkad-acc)',fontWeight:700}}>{faNum(selectedCount)} انتخاب شده</span>}
  {selectedCount>0 && <div style={{display:'flex',gap:6,marginInlineStart:'auto',flexWrap:'wrap'}}>
    <button type="button" className="zkad-toolbtn zkad-selected-delete" title="حذف انتخاب‌شده‌ها" aria-label="حذف انتخاب‌شده‌ها" onClick={()=>{ if(!confirm(`حذف ${faNum(selectedCount)} مورد انتخاب شده؟`)) return; setSubs((prev:any)=> prev.filter((x:any)=> !selectedIds.has(x.id))); clearSelection(); }}><ZkTrashIcon size={16}/></button>
    <button type="button" className="zkad-toolbtn" onClick={()=>{ const selectedRows = filteredAll.filter((x:any)=> selectedIds.has(x.id)).map(s=>({نام:s.pName||'',شماره:s.fullPhone||'',موضوع:(s.topics||[]).join('|'),کشور:getCountry(s),دوره:getCourse(s),پرداخت:getPay(s),وضعیت:getStatus(s),تاریخ:s.date||'',شهر:s.shipping?.city||'',یادداشت:s.adminNotes||'',دسته‌بندی:getCategory(s)})); const keys=Object.keys(selectedRows[0]||{نام:'',شماره:'',موضوع:'',کشور:'',دوره:'',پرداخت:'',وضعیت:'',تاریخ:''}); const html=`<html><meta charset="utf-8"><body><table border="1"><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${selectedRows.map((r:any)=>`<tr>${keys.map(k=>`<td>${String((r as any)[k]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`; const url=URL.createObjectURL(new Blob([html],{type:'application/vnd.ms-excel;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='selected-export.xls';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500); }}>Excel</button>
    <button type="button" className="zkad-toolbtn" onClick={()=>{ const phones = filteredAll.filter((x:any)=> selectedIds.has(x.id)).map((x:any)=> x.fullPhone).filter(Boolean).join('\n'); const url=URL.createObjectURL(new Blob([phones],{type:'text/plain;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='selected-phones.txt';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500); }}>شماره‌ها</button>
    <button type="button" className="zkad-toolbtn" onClick={()=>{ const links = filteredAll.filter((x:any)=> selectedIds.has(x.id)).map((x:any)=> digits(x.fullPhone||'')).filter(Boolean).map((n:any)=>`<p><a href="https://wa.me/${n}">${n}</a></p>`).join(''); const url=URL.createObjectURL(new Blob([`<html><meta charset="utf-8"><body>${links}</body></html>`],{type:'text/html;charset=utf-8'})); const a=document.createElement('a');a.href=url;a.download='selected-whatsapp.html';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500); }}>واتساپ</button>
    <label className="zkad-toolbtn" style={{display:'inline-flex',alignItems:'center',gap:4}}>تصویر <select value={imageFormat} onChange={e=>setPersistentImageFormat(e.target.value as any)} style={{border:0,background:'transparent',fontFamily:'inherit'}}><option value="webp">webp</option><option value="jpg">jpg</option></select></label>
    <button type="button" className="zkad-toolbtn" onClick={async()=>{for(const x of filtered.filter((x:any)=>selectedIds.has(x.id))) await downloadFormImage(x)}}>تصویر انتخاب‌شده</button>
  </div>}
</div>
{groups.length?groups.map(g=><LazySubCard key={g.head.id} sub={g.head} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} groupCount={g.children.length} allSubs={subs} onOpenRelated={setModalSub} selectedIds={selectedIds} toggleSelect={toggleSelect} isOpen={expId===g.head.id} onToggleOpen={toggleOpenForm} {...subCardIO}/>):<div className="zkad-empty"><ZkSearchIcon size={26}/><p>موردی یافت نشد</p><small>عبارت جستجو یا فیلترها را تغییر دهید</small>{filtersActive&&<button type="button" className="zkad-toolbtn" onClick={clearFilters}><ZkFilterIcon size={14}/> حذف فیلترها</button>}</div>}{modalSub&&<Modal T={T} onClose={()=>setModalSub(null)} max={640}><SubCard sub={modalSub} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} allSubs={subs} onOpenRelated={setModalSub} forceOpen selectedIds={selectedIds} toggleSelect={toggleSelect} {...subCardIO}/></Modal>}<div className="zkad-pager"><button type="button" className="zkad-pager-btn" disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>قبلی</button><span className="zkad-pager-cur" title={`صفحه ${safePage} از ${totalPages}`}>{faNum(safePage)}</span><span className="zkad-pager-total">از {faNum(totalPages)}</span><button type="button" className="zkad-pager-btn" disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>بعدی</button></div></>:<DataNewViewPanel/>}</>}{aTab==='settings'&&editCfg&&SettingsEditor()}{aTab==='content'&&editCfg&&ContentEditor()}{aTab==='assistant'&&<AssistantManager T={T} S={S} cfg={editCfg||cfg}/>} {aTab==='userQuestions'&&<UserQuestionsEditor app={{...app, AdminBtn, Box, setEditCfg, cfg:editCfg||cfg}}/>}{aTab==='reviews'&&<ReviewsEditor app={{...app, AdminBtn, Box, setEditCfg, cfg:editCfg||cfg}}/>}{aTab==='consultants'&&editCfg&&<ConsultantsEditor T={T} S={S} editCfg={editCfg} setEditCfg={setEditCfg} setSave={setSave} uid={uid} fileToData={fileToData} deleteStoredImage={deleteStoredImage} AdminBtn={AdminBtn} Box={Box} />}{aTab==='contacts'&&editCfg&&ContactsEditor()}{aTab==='courses'&&editCfg&&<CoursesEditor T={T} S={S} editCfg={editCfg} setEditCfg={setEditCfg} setSave={setSave} uid={uid} p2e={p2e} fileToData={fileToData} deleteStoredImage={deleteStoredImage} AdminBtn={AdminBtn} Box={Box} />}{aTab==='featured'&&editCfg&&FeaturedCoursesEditor()}{aTab==='tagged'&&editCfg&&TaggedCoursesEditor()}{aTab==='trust'&&editCfg&&TrustEditor()}{aTab==='trustbox'&&editCfg&&TrustBoxManagerEditor()}{aTab==='images'&&editCfg&&<ImagesManager T={T} S={S} editCfg={editCfg} setEditCfg={setEditCfg} setSave={setSave} uid={uid} fileToData={fileToData} deleteStoredImage={deleteStoredImage} supabase={supabase} isSupabaseConfigured={isSupabaseConfigured} AdminBtn={AdminBtn} />}{aTab==='design'&&editCfg&&DesignManagerEditor()}{aTab==='shipping'&&editCfg&&ShippingBankEditor()}{aTab==='analytics'&&<AnalyticsPanel T={T} S={S}/>}{aTab==='errors'&&<ErrorLogsPanel T={T} S={S}/>}{aTab==='security'&&SecurityEditor()}{aTab==='products'&&editCfg&&ProductsTabEditor()}{aTab==='highlights'&&editCfg&&HighlightsTabEditor(hlCoverCropFor,setHlCoverCropFor,hlBulkTexts,setHlBulkTexts)}{aTab==='licenses'&&editCfg&&LicensesTabEditor()}{aTab==='services'&&editCfg&&ServicesTabEditor()}{aTab==='trash'&&<TrashPanel T={T} S={S} AdminBtn={AdminBtn} refreshKey={trashKey} onRestored={(sub:any)=>{const {deleted_at,...clean}=sub;setSubsState(prev=>prev.some((x:any)=>x.id===clean.id)?prev:[clean,...prev]); if(!isSupabaseConfigured){const subs=getLS(SK.subs,[]); if(!subs.some((x:any)=>x.id===clean.id))setLS(SK.subs,[clean,...subs])}}}/>}{(msg||saveProgress!==null)&&<div style={{position:'fixed',top:16,right:16,zIndex:6000,minWidth:220,maxWidth:320,background:T.pop,border:`1px solid ${msgType==='err'?T.err:(msgType==='ok'?T.ok:T.brd)}`,borderRadius:14,boxShadow:'0 10px 30px rgba(0,0,0,.18)',padding:'12px 14px',animation:'fadeSlide .3s ease both'}}>
  <div style={{display:'flex',alignItems:'center',gap:10}}>
    <span style={{width:22,height:22,borderRadius:'50%',flexShrink:0,display:'flex',alignItems:'center',justifyContent:'center',background:msgType==='err'?`${T.err}1f`:(msgType==='ok'?`${T.ok}1f`:T.soft),color:msgType==='err'?T.err:(msgType==='ok'?T.ok:T.acc),fontSize:12}}>{msgType==='err'?'✕':(msgType==='ok'?'✓':'…')}</span>
    <div style={{flex:1,minWidth:0}}>
      <div style={{fontSize:13,fontWeight:800,color:T.ttl}}>{msg}</div>
      {saveProgress!==null&&saveProgress<100&&<div style={{height:5,background:T.soft,borderRadius:999,overflow:'hidden',marginTop:7}}><div style={{height:'100%',width:`${saveProgress}%`,background:msgType==='err'?T.err:T.acc,borderRadius:999,transition:'width .2s ease'}}/></div>}
      {saveProgress===100&&<div style={{fontSize:10.5,color:T.ok,marginTop:5}}>ذخیره‌سازی کامل شد</div>}
    </div>
  </div>
</div>}</div></div>{/* FAB floating action speedDial position: fixed bottom: 24 */}
<ApiApprovalNotifier T={T} onNavigateToSecurity={()=>{ setATab('security'); try{ window.scrollTo({top:0, behavior:'smooth'}); }catch{} }} />
<AdminAssistantWidget T={T} onNavigate={navigateFromAssistant}/><div style={{ position: 'fixed', bottom: 0, right: 0, pointerEvents: 'none', zIndex: 5000 }}><div style={{ pointerEvents: 'auto' }}><AdminSpeedDialFAB T={T} lang={lang} onNavigate={(id:string)=>setATab(id)} onSave={()=>setSave(editCfg)} /></div></div></AdminLayout></div>
function DataNewViewPanel(){
 const dataUserByPhone: any = {};
 const dataUserOrder: string[] = [];
 {
  const seen: any = {};
  for (const x of subs) {
   if ((x as any).type !== 'user') continue;
   const k = digits(String((x as any).fullPhone || ''));
   if (!k) continue;
   const prev = seen[k];
   if (!prev || String(prev.date || '') + String(prev.time || '') < String(x.date || '') + String(x.time || '')) seen[k] = x;
  }
  for (const k of Object.keys(seen)) { dataUserByPhone[k] = seen[k]; dataUserOrder.push(k); }
 }
 const dataMask = (ph: string) => {
  const d = digits(String(ph || ''));
  if (d.length < 7) return String(ph || '');
  return d.slice(0, 4) + '••••' + d.slice(-3);
 };
 const dataName = (k: string, head: any) => String(dataUserByPhone[k]?.fullName || head?.pName || head?.userName || 'بدون نام');
 const dataCode = (k: string, head: any) => String(dataUserByPhone[k]?.code || head?.userCode || head?.trackingCode || '');
 const dataGroups = () => {
  const byPhone: any = {};
  for (const x of filteredAll) {
   if ((x as any).type !== 'consultation' && (x as any).type !== 'course') continue;
   const k = digits(String((x as any).fullPhone || ''));
   if (!k) continue;
   (byPhone[k] = byPhone[k] || []).push(x);
  }
  const out: { key: string; items: any[] }[] = [];
  for (const k of Object.keys(byPhone)) {
   const sorted = [...byPhone[k]].sort((a: any, b: any) => (String(b.date || '') + String(b.time || '') > String(a.date || '') + String(a.time || '') ? 1 : -1));
   out.push({ key: k, items: sorted });
  }
  out.sort((a, b) => (String(b.items[0].date || '') + String(b.items[0].time || '') > String(a.items[0].date || '') + String(a.items[0].time || '') ? 1 : -1));
  return out;
 };
 const dataGroupsCached = dataGroups();
 const consultCards = dataGroupsCached.filter((g) => g.items.some((x: any) => x.type === 'consultation'));
 const courseCards = dataGroupsCached.filter((g) => g.items.some((x: any) => x.type === 'course'));
 const q = nvQ.trim().toLowerCase();
 const filterCards = (arr: typeof consultCards) => arr.filter((g) => {
  if (!q) return true;
  const head = g.items[0];
  return dataName(g.key, head).toLowerCase().includes(q) || digits(g.key).includes(q.replace(/\D/g, '')) || dataCode(g.key, head).toLowerCase().includes(q);
 });
 const consultList = filterCards(consultCards);
 const courseList = filterCards(courseCards);
 const consultStatuses = ['مشاوره اولیه', 'پیگیری', 'مشاوره شده', 'ناقص'];
 const card = (g: { key: string; items: any[] }, kind: 'consult' | 'course') => {
  const head = g.items.find((x: any) => x.type === kind) || g.items[0];
  const hasOther = kind === 'consult' ? g.items.some((x: any) => x.type === 'course') : g.items.some((x: any) => x.type === 'consultation');
  const isUser = !!dataUserByPhone[g.key];
  const statLbl = kind === 'consult' ? (head.consultationStatus || 'مشاوره اولیه') : getStatus(head);
  const count = g.items.filter((x: any) => x.type === kind).length;
  const isHi = nvPhone === g.key;
  return (
   <div key={kind + g.key} id={'nvc-' + g.key} style={{ border: `1px solid ${isHi ? T.acc : T.brd}`, borderRadius: 14, background: T.card, boxShadow: isHi ? `0 0 0 3px ${T.acc}33` : T.neuOut, marginBottom: 10, overflow: 'hidden' }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px' }}>
     <span style={{ width: 42, height: 42, borderRadius: 13, background: `${T.acc}18`, color: T.acc, display: 'grid', placeItems: 'center', fontSize: 17, fontWeight: 900, flexShrink: 0 }}>{String(dataName(g.key, head) || '؟').trim().charAt(0)}</span>
     <span style={{ minWidth: 0, flex: 1 }}>
      <b style={{ display: 'block', fontSize: 13.5, color: T.txt }}>{dataName(g.key, head)} {!isUser && <span className="zkad-tag" style={{ fontSize: 9.5 }}>{T.en ? 'Guest' : 'مهمان'}</span>}</b>
      <span style={{ display: 'block', fontSize: 11, color: T.mut, marginTop: 2, direction: 'ltr', textAlign: 'start' }}>{dataMask(g.key)} · <b style={{ color: T.acc, fontFamily: 'monospace' }}>{dataCode(g.key, head)}</b></span>
     </span>
     <span style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
      <span className={`zkad-tag ${kind === 'consult' ? 't-warn' : 't-info'}`} style={{ fontSize: 10.5 }}>{kind === 'consult' ? `مشاوره ×${faNum(count)}` : `دوره ×${faNum(count)}`}</span>
      <select value={statLbl} onChange={(e) => { if (kind === 'consult') changeConsultStatus(head.id, e.target.value); else changeStatus(head.id, e.target.value); }}
        style={{ background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 8, padding: '5px 8px', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 800, outline: 'none', cursor: 'pointer', maxWidth: 150 }}>
        {(kind === 'consult' ? consultStatuses : statusOptions).map((s: string) => <option key={s} value={s}>{s}</option>)}
       </select>
     </span>
    </div>
    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '0 14px 12px', alignItems: 'center' }}>
     <span className="zkad-tag" style={{ fontSize: 10.5 }}>{kind === 'consult' ? 'فرزند/موضوع' : 'دوره'}: {kind === 'consult' ? String(head.pName || head.topics || '—') : String(head.course?.title || 'ثبت دوره')}</span>
     <span style={{ fontSize: 10.5, color: T.mut }}>{fmtWhen(head)}</span>
     <span style={{ marginInlineStart: 'auto', display: 'flex', gap: 6 }}>
      {hasOther && (
       <button type="button" className="zkad-toolbtn" style={{ fontSize: 11, cursor: 'pointer' }}
        onClick={() => { setNvTab(kind === 'consult' ? 'course' : 'consult'); setNvPhone(g.key); setTimeout(() => { const el = document.getElementById('nvc-' + g.key); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); }}>
        {kind === 'consult' ? (T.en ? 'Also registered a course →' : 'ثبت دوره هم کرده ←') : (T.en ? 'Also sent a consultation →' : 'درخواست مشاوره هم داده ←')}
       </button>
      )}
      <button type="button" className="zkad-toolbtn" style={{ fontSize: 11, cursor: 'pointer' }} onClick={() => setModalSub(head)}>{T.en ? 'Details' : 'جزئیات'}</button>
     </span>
    </div>
   </div>
  );
 };
 const section = (title: string, note: string, list: typeof consultList, kind: 'consult' | 'course') => (
  <section className="zkad-panel-card" style={{ marginBottom: 14 }}>
   <h3 style={{ fontSize: 14, color: T.ttl, margin: '0 0 4px', fontWeight: 900 }}>{title} <small style={{ color: T.mut, fontWeight: 600 }}>({faNum(list.length)})</small></h3>
   <div style={{ fontSize: 11.5, color: T.mut, marginBottom: 12, lineHeight: 1.8 }}>{note}</div>
   {list.length ? list.map((g) => card(g, kind)) : <div className="zkad-empty" style={{ padding: '20px 12px' }}><p>{T.en ? 'Nothing here yet.' : 'موردی نیست.'}</p></div>}
  </section>
 );
 return (
  <div>
   <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center', marginBottom: 12 }}>
    <div className="zkad-seg" style={{ display: 'flex', gap: 6, padding: 4, background: T.inp, borderRadius: 12, border: `1px solid ${T.brd}` }}>
     {(['consult', 'course'] as const).map((t) => (
      <button key={t} type="button" onClick={() => setNvTab(t)}
       style={{ padding: '8px 16px', borderRadius: 9, border: 0, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 900, background: nvTab === t ? T.acc : 'transparent', color: nvTab === t ? '#fff' : T.mut }}>
       {t === 'consult' ? (T.en ? 'Consultations' : 'درخواست‌های مشاوره') : (T.en ? 'Course registrations' : 'ثبت‌نام دوره‌ها')}
      </button>
     ))}
    </div>
    <input style={{ background: T.inp, border: `1px solid ${T.brd}`, color: T.txt, borderRadius: 9, padding: '9px 12px', fontFamily: 'inherit', fontSize: 12.5, width: '100%', maxWidth: 320, outline: 'none' }}
     placeholder={T.en ? 'Search name / phone / code…' : 'جستجوی نام / شماره / کد…'} value={nvQ} onChange={(e) => setNvQ(e.target.value)} />
    <span className="zkad-tag" style={{ fontSize: 11 }}>{T.en ? 'Users' : 'کاربران'}: {faNum(consultList.length + courseList.length)}</span>
   </div>
   {nvTab === 'consult'
    ? section(T.en ? 'Consultation requests' : 'درخواست‌های مشاوره', T.en ? 'One card per user. Each card shows when the same person also registered a course.' : 'هر کارت = یک کاربر؛ اگر همین شخص دوره هم ثبت کرده باشد، روی کارت مشخص است.', consultList, 'consult')
    : section(T.en ? 'Course registrations' : 'ثبت‌نام دوره‌ها', T.en ? 'One card per user. Each card shows when the same person also sent a consultation.' : 'هر کارت = یک کاربر؛ اگر همین شخص مشاوره هم داده باشد، روی کارت مشخص است.', courseList, 'course')}
   {modalSub && <Modal T={T} onClose={() => setModalSub(null)} max={640}><SubCard sub={modalSub} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} allSubs={subs} onOpenRelated={setModalSub} forceOpen selectedIds={selectedIds} toggleSelect={toggleSelect} {...subCardIO} /></Modal>}
  </div>
 );
}
}


 // بازطراحی: بخش‌های ادیتور پنل مدیریت با کارت نئومورفیک (سایه نرم به‌جای بردر ساده)
 // FIX: Stabilize Box component identity — used 59+ times, remount caused all nested inputs/details to reset
 const Box=useMemo(()=>({title,children}:any)=><section className="zkad-panel-card" style={{marginBottom:12}}><h3 style={{fontSize:13.5,color:T.ttl,margin:'0 0 12px',fontWeight:800,lineHeight:1.6,display:'flex',alignItems:'center',gap:7}}>{title}</h3>{children}</section>,[T.ttl]);
  const changeConsultStatus=useCallback((id:any,status:string)=>setSubs((list:any[])=>list.map(x=>x.id===id?{...x,consultationStatus:status,category:status,changeHistory:logChange(x,`تغییر وضعیت مشاوره به ${status}`)}:x)),[setSubs]);

 // ─────────────────────────────────────────────────────────────────────────
 // نمای جدید «فرم‌ها و دوره‌ها»: کارت به ازای هر کاربر (تلفیق مشاوره/دوره)
 // دو بخش کاملاً جدا: درخواست‌های مشاوره / ثبت‌نام دوره‌ها + لینک متقابل
 // ─────────────────────────────────────────────────────────────────────────
  function SettingsEditor(){
  // بازطراحی کامل — SettingsManager مستقل با state محلی (رفع fg / پرش صفحه)
  return <SettingsManager
    T={T} S={S} AdminBtn={AdminBtn} Box={Box}
    StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
    editCfg={editCfg} setSave={setSave} fileToData={fileToData}
    deleteStoredImage={deleteStoredImage} PROFILE_PHOTO={PROFILE_PHOTO} TH={TH}
    p2e={p2e} uid={uid}
  />;
 }

 // اصلاح ۱-۶ و ۲ و ۳ (مرحله ۴): تب مستقل مدیریت متن‌ها و ترجمه‌ها — شامل عناوین دوزبانه کنار عکس پروفایل،
 // متن صفحه درباره ما (دوزبانه) و ویرایش تمام کلیدهای ترجمه fa/en موجود در cfg.translations

 // اصلاح ۳۲ (مرحله ۹): ادیتور کامل سوالات متداول — دو ستون فارسی/انگلیسی، افزودن/ویرایش/حذف/تغییر ترتیب + تنظیمات نمایش در هوم



function FAQEditor(){
  const faList:any[]=editCfg.faqItems||[]; const enList:any[]=editCfg.faqItemsEn||[];
  const updFa=(items:any[])=>setEditCfg({...editCfg,faqItems:items});
  const updEn=(items:any[])=>setEditCfg({...editCfg,faqItemsEn:items});
  const chgFa=(i:number,k:string,v:any)=>{const a=[...faList];a[i]={...a[i],[k]:v};updFa(a)};
  const chgEn=(i:number,k:string,v:any)=>{const a=[...enList];a[i]={...a[i],[k]:v};updEn(a)};
  const move=(list:any[],upd:(items:any[])=>void,i:number,dir:-1|1)=>{const a=[...list];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a)};
  const remove=(list:any[],upd:(items:any[])=>void,i:number)=>upd(list.filter((_:any,j:number)=>j!==i));
  const addFa=()=>updFa([...faList,{id:'faq'+uid(),question:'سوال جدید',answer:''}]);
  const addEn=()=>updEn([...enList,{id:'faq'+uid(),question:'New question',answer:''}]);
  const faqDisplay=editCfg.faqDisplay||{home:{show:true,maxItems:4,viewAllLink:true},faqPage:{show:true}};
  const updDisplay=(patch:any)=>setEditCfg({...editCfg,faqDisplay:{...faqDisplay,home:{...faqDisplay.home,...patch}}});
  return <Box title="مدیریت سوالات متداول (FAQ)">
   <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:14,padding:10,background:T.soft,borderRadius:10}}>
    <label style={{fontSize:13,color:T.mut,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={faqDisplay.home?.show!==false} onChange={e=>updDisplay({show:e.target.checked})}/> نمایش در صفحه اصلی</label>
    <label style={{fontSize:13,color:T.mut,display:'flex',alignItems:'center',gap:6}}>تعداد: <input type="number" min={1} max={20} style={{...S.inp,width:60}} defaultValue={faqDisplay.home?.maxItems||4} onBlur={e=>updDisplay({maxItems:Math.min(20,Math.max(1,+p2e(e.target.value)||4))})}/></label>
    <label style={{fontSize:13,color:T.mut,display:'flex',alignItems:'center',gap:6,cursor:'pointer'}}><input type="checkbox" checked={faqDisplay.home?.viewAllLink!==false} onChange={e=>updDisplay({viewAllLink:e.target.checked})}/> نمایش لینک «مشاهده همه»</label>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>فارسی ({faList.length})</h4>
     {faList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <input style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgFa(i,'question',e.target.value)} placeholder="سوال"/>
      <textarea style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgFa(i,'answer',e.target.value)} placeholder="پاسخ"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(faList,updFa,i,-1)}><ZkArrowUpIcon size={13}/></button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===faList.length-1} onClick={()=>move(faList,updFa,i,1)}><ZkArrowDownIcon size={13}/></button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(faList,updFa,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addFa}><ZkPlusIcon size={13}/> افزودن سوال جدید (فارسی)</button>
    </div>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>English ({enList.length})</h4>
     {enList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgEn(i,'question',e.target.value)} placeholder="Question"/>
      <textarea dir="ltr" style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgEn(i,'answer',e.target.value)} placeholder="Answer"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(enList,updEn,i,-1)}><ZkArrowUpIcon size={13}/></button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===enList.length-1} onClick={()=>move(enList,updEn,i,1)}><ZkArrowDownIcon size={13}/></button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(enList,updEn,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addEn}>+ Add New Question (English)</button>
    </div>
   </div>
   <button style={{...S.btn,marginTop:12}} onClick={()=>setSave(editCfg)}>ذخیره سوالات متداول</button>
  </Box>;
 }

 // اصلاح ۲: ادیتور سوالات متداول زیر تب‌های دوره — دوزبانه، افزودن/ویرایش/حذف/تغییر ترتیب + انتخاب تب مرتبط
 function CourseTabFAQEditor(){
  const faList:any[]=editCfg.courseTabFaqs||[]; const enList:any[]=editCfg.courseTabFaqsEn||[];
  const updFa=(items:any[])=>setEditCfg({...editCfg,courseTabFaqs:items});
  const updEn=(items:any[])=>setEditCfg({...editCfg,courseTabFaqsEn:items});
  const chgFa=(i:number,k:string,v:any)=>{const a=[...faList];a[i]={...a[i],[k]:v};updFa(a)};
  const chgEn=(i:number,k:string,v:any)=>{const a=[...enList];a[i]={...a[i],[k]:v};updEn(a)};
  const move=(list:any[],upd:(items:any[])=>void,i:number,dir:-1|1)=>{const a=[...list];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a)};
  const remove=(list:any[],upd:(items:any[])=>void,i:number)=>upd(list.filter((_:any,j:number)=>j!==i));
  const addFa=()=>updFa([...faList,{id:'ctf'+uid(),tab:'growth',question:'سوال جدید',answer:''}]);
  const addEn=()=>updEn([...enList,{id:'ctf'+uid(),tab:'growth',question:'New question',answer:''}]);
  const tabOptions:[string,string][]=[['growth','رشد قد / Height'],['appetite','بی‌اشتهایی / Appetite'],['intelligence','هوش / Intelligence']];
  return <Box title="سوالات متداول زیر تب‌های دوره">
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>فارسی ({faList.length})</h4>
     {faList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <select style={{...S.inp,marginBottom:6}} value={item.tab||'growth'} onChange={e=>chgFa(i,'tab',e.target.value)}>{tabOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <input style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgFa(i,'question',e.target.value)} placeholder="سوال"/>
      <textarea style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgFa(i,'answer',e.target.value)} placeholder="پاسخ"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(faList,updFa,i,-1)}><ZkArrowUpIcon size={13}/></button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===faList.length-1} onClick={()=>move(faList,updFa,i,1)}><ZkArrowDownIcon size={13}/></button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(faList,updFa,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addFa}><ZkPlusIcon size={13}/> افزودن سوال جدید (فارسی)</button>
    </div>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>English ({enList.length})</h4>
     {enList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <select style={{...S.inp,marginBottom:6}} value={item.tab||'growth'} onChange={e=>chgEn(i,'tab',e.target.value)}>{tabOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgEn(i,'question',e.target.value)} placeholder="Question"/>
      <textarea dir="ltr" style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgEn(i,'answer',e.target.value)} placeholder="Answer"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(enList,updEn,i,-1)}><ZkArrowUpIcon size={13}/></button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===enList.length-1} onClick={()=>move(enList,updEn,i,1)}><ZkArrowDownIcon size={13}/></button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(enList,updEn,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addEn}>+ Add New Question (English)</button>
    </div>
   </div>
   <button style={{...S.btn,marginTop:12}} onClick={()=>setSave(editCfg)}>ذخیره سوالات دوره‌ها</button>
  </Box>;
 }

 // اصلاح ۲: ادیتور مشترک چیدمان (ترتیب بالا/پایین + نمایش/پنهان) برای صفحه هوم و منوی همبرگری

 // اصلاح ۷: تب مستقل «مدیریت محتوا» شامل محتوای چندرسانه‌ای، تجربه والدین، مجوزها و آموزش‌ها
 function ContentEditor(){
  // بازطراحی کامل «محتوا و صفحات» — ContentManager مستقل با state محلی
  // و ذخیره با دکمه (رفع پرش صفحه / fg). همهٔ قابلیت‌ها حفظ شده‌اند.
  return <ContentManager
    T={T} S={S} AdminBtn={AdminBtn} Box={Box} Field={Field}
    StableAdminInput={StableAdminInput} StableAdminTextarea={StableAdminTextarea}
    cfg={editCfg} setSave={setSave} fileToData={fileToData} p2e={p2e} uid={uid}
  />;
 }

 // اصلاح ۱۸: بازطراحی کامل هایلایت و استوری — چند هایلایت، هر کدام چند اسلاید (کد تصویر خارجی/داخلی)


 function ContactsEditor(){
  // بازطراحی: state محلی در سطح AdminPanel (cc) + ذخیرهٔ مستقیم
  // (رفع race condition و رعایت قوانین hooks — این تابع با () فراخوانی می‌شود)
  const custom:any[] = Array.isArray(cc.custom) ? cc.custom : [];
  const updCustom=(i:number,k:string,v:any)=>{const a=[...custom];a[i]={...a[i],[k]:v};setCc({...cc,custom:a})};
  const addCustom=()=>setCc({...cc,custom:[...custom,{id:'ct'+uid(),title:'راه ارتباطی جدید',url:'',color:'#2564a8',order:custom.length+1}]});
  const removeCustom=(i:number)=>setCc({...cc,custom:custom.filter((_:any,j:number)=>j!==i)});
  const moveCustom=(i:number,dir:-1|1)=>{const a=[...custom];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setCc({...cc,custom:a.map((x:any,idx:number)=>({...x,order:idx+1}))})};
  const save=()=>{setSave({...editCfg,contacts:cc});};
  return <>
   <Box title="اطلاعات تماس">
    {['phone','whatsapp','telegram','instagram','rubika','bale'].map(k=><Field key={k} label={k} value={cc[k]||''} onChange={(v:string)=>setCc({...cc,[k]:v})} ph=""/>)}
    <h4>نمایش در صفحات</h4>
    {Object.keys(editCfg.contactVisibility||{}).map(k=><label key={k} style={{display:'block',marginBottom:6}}><input type="checkbox" checked={!!editCfg.contactVisibility[k]} onChange={e=>setEditCfg({...editCfg,contactVisibility:{...editCfg.contactVisibility,[k]:e.target.checked}})}/> {k}</label>)}
   </Box>
   <Box title="مدیریت راه‌های ارتباطی">
    <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>برای هر راه ارتباطی عنوان (مثلاً «ایتا») و لینک/شماره را وارد کنید. رنگ و آیکون دلخواه هم قابل تنظیم است.</p>
    {custom.map((it:any,i:number)=><div key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8}}>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
      <input style={S.inp} value={it.title||''} onChange={e=>updCustom(i,'title',e.target.value)} placeholder="عنوان (مثلاً ایتا)"/>
      <input style={S.inp} value={it.url||''} onChange={e=>updCustom(i,'url',e.target.value)} placeholder="لینک یا شماره"/>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}>
      <input type="color" style={{...S.inp,height:44,padding:4}} value={it.color||'#2564a8'} onChange={e=>updCustom(i,'color',e.target.value)}/>
      <input style={S.inp} value={it.iconUrl||''} onChange={e=>updCustom(i,'iconUrl',e.target.value)} placeholder="لینک آیکون (اختیاری)"/>
     </div>
     <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
      <button type="button" style={AdminBtn()} disabled={i===0} onClick={()=>moveCustom(i,-1)}>بالا</button>
      <button type="button" style={AdminBtn()} disabled={i===custom.length-1} onClick={()=>moveCustom(i,1)}>پایین</button>
      <button type="button" style={{...AdminBtn(),color:T.err}} onClick={()=>removeCustom(i)}>حذف</button>
     </div>
    </div>)}
    <button type="button" style={AdminBtn()} onClick={addCustom}><ZkPlusIcon size={13}/> افزودن راه ارتباطی</button>
   </Box>
   <Box title="مدیریت آیکون‌های ارتباط با ما">
    {Object.keys(editCfg.contactIcons||{}).map(k=><div key={k} style={{display:'grid',gridTemplateColumns:'120px 1fr',gap:8,marginBottom:8,alignItems:'center'}}><label>{k}</label><input type="color" style={{...S.inp,height:44,padding:4}} value={editCfg.contactIcons[k]?.color||'#2564a8'} onChange={e=>setEditCfg({...editCfg,contactIcons:{...editCfg.contactIcons,[k]:{...(editCfg.contactIcons[k]||{}),color:e.target.value}}})}/></div>)}
   </Box>
   <button style={S.btn} onClick={save}>ذخیره</button>
  </>}


 // --- مدیریت دوره‌های ویژه ---
function FeaturedCoursesEditor(){
 const fc=(editCfg as any).featuredCourses||{enabled:true,title:'پرطرفدارترین‌ها',titleEn:'Most Popular',heroCourseId:'',courseIds:[],maxCourses:5};
 const up=(patch:any)=>setEditCfg({...editCfg,featuredCourses:{...fc,...patch}});

 // جمع‌آوری تمام دوره‌ها از همه تب‌ها
 const allCourses:any[]=[];
 (editCfg.courseTabs||[]).forEach((tab:any)=>{
  (tab.courses||[]).forEach((c:any)=>{
   if(c.active!==false) allCourses.push({...c,tabId:tab.id,tabTitle:tab.title});
  });
 });

 const courseIds=Array.isArray(fc.courseIds)?fc.courseIds:[];
 const updateCourseAt=(idx:number,val:string)=>{const ids=[...courseIds];ids[idx]=val;up({courseIds:ids})};
 const removeCourseAt=(idx:number)=>{const ids=courseIds.filter((_:any,i:number)=>i!==idx);up({courseIds:ids})};

 return <>
  <Box title={<><ZkStarIcon size={16} color={T.ttl}/> دوره‌های ویژه (Featured Courses)</>}>
   <div style={{display:'grid',gap:12}}>
    <div>
     <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:fc.enabled?`${T.ok}12`:`${T.err}12`,border:`1px solid ${fc.enabled?T.ok:T.err}`,borderRadius:12}}>
      <input type="checkbox" checked={fc.enabled!==false} onChange={e=>up({enabled:e.target.checked})} style={{width:18,height:18}}/>
      <span>{fc.enabled!==false?<span style={{color:T.ok,display:'inline-flex',alignItems:'center',gap:6}}><ZkCheckCircleIcon size={15}/>بخش دوره‌های ویژه فعال است (در صفحه اصلی نمایش داده می‌شود)</span>:<span style={{color:T.err,display:'inline-flex',alignItems:'center',gap:6}}><ZkXCircleIcon size={15}/>بخش دوره‌های ویژه غیرفعال است</span>}</span>
     </label>
    </div>

    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <div>
      <label style={S.lbl}>عنوان بخش (فارسی)</label>
      <input style={S.inp} defaultValue={fc.title||'پرطرفدارترین‌ها'} onBlur={e=>up({title:e.target.value})}/>
     </div>
     <div>
      <label style={S.lbl}>عنوان بخش (English)</label>
      <input style={S.inp} dir="ltr" defaultValue={fc.titleEn||'Most Popular'} onBlur={e=>up({titleEn:e.target.value})}/>
     </div>
    </div>

    <div>
     <label style={S.lbl}>دوره اصلی (Hero Course - بزرگ‌تر)</label>
     <select style={S.inp} value={fc.heroCourseId||''} onChange={e=>up({heroCourseId:e.target.value})}>
      <option value="">— انتخاب کنید —</option>
      {allCourses.map((c:any)=><option key={c.id} value={c.id}>{c.title} ({c.tabTitle})</option>)}
     </select>
     <p style={{fontSize:10,color:T.mut,margin:'4px 0 0'}}>این دوره به‌صورت بزرگ‌تر در سمت چپ نمایش داده می‌شود.</p>
    </div>

    <div>
     <label style={{...S.lbl,marginBottom:8}}>دوره‌های ویژه (حداکثر ۵ دوره - کوچک‌تر در سمت راست)</label>
     {[0,1,2,3,4].map((idx:number)=><div key={idx} style={{display:'grid',gridTemplateColumns:'1fr 40px',gap:8,marginBottom:6}}>
      <select style={S.inp} value={courseIds[idx]||''} onChange={e=>updateCourseAt(idx,e.target.value)}>
       <option value="">— انتخاب نکنید —</option>
       {allCourses.map((c:any)=><option key={c.id} value={c.id}>{c.title} ({c.tabTitle})</option>)}
      </select>
      {idx>0&&<button style={{...AdminBtn(),color:T.err,padding:'8px 0',marginBottom:0}} onClick={()=>removeCourseAt(idx)}><ZkCloseIcon size={13}/></button>}
      {idx===0&&<div style={{width:40}}/>}
     </div>)}
     <p style={{fontSize:10,color:T.mut,margin:'4px 0 0'}}>دوره‌های انتخاب‌شده: {courseIds.filter(Boolean).length} از ۵</p>
    </div>
   </div>
  </Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره دوره‌های ویژه</button>
 </>;
}

// --- مدیریت دوره‌های تگ‌دار ---
function TaggedCoursesEditor(){
 const tc=(editCfg as any).taggedCourses||{enabled:true,title:'پرفروش‌ترین دوره‌ها',titleEn:'Best Selling Courses',tags:['پرفروش','پرطرفدار','محبوب'],maxCourses:6};
 const up=(patch:any)=>setEditCfg({...editCfg,taggedCourses:{...tc,...patch}});

 const tagOptions=['پرفروش','پرطرفدار','محبوب'];

 return <>
  <Box title={<><ZkTagIcon size={16} color={T.ttl}/> دوره‌های ویژه با تگ</>}>
   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    {/* فعال/غیرفعال */}
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:tc.enabled!==false?`${T.ok}12`:`${T.err}12`,border:`1px solid ${tc.enabled!==false?T.ok:T.err}`,borderRadius:12}}>
     <input type="checkbox" checked={tc.enabled!==false} onChange={e=>up({enabled:e.target.checked})} style={{width:18,height:18}}/>
     <span>{tc.enabled!==false?<span style={{color:T.ok,display:'inline-flex',alignItems:'center',gap:6}}><ZkCheckCircleIcon size={15}/>بخش دوره‌های تگ‌دار فعال است</span>:<span style={{color:T.err,display:'inline-flex',alignItems:'center',gap:6}}><ZkXCircleIcon size={15}/>بخش دوره‌های تگ‌دار غیرفعال است</span>}</span>
    </label>

    {/* عنوان فارسی */}
    <div>
     <label style={S.lbl}>عنوان بخش (فارسی)</label>
     <input style={S.inp} defaultValue={tc.title||'پرفروش‌ترین دوره‌ها'} onBlur={e=>up({title:e.target.value})}/>
    </div>

    {/* عنوان انگلیسی */}
    <div>
     <label style={S.lbl}>عنوان بخش (English)</label>
     <input style={S.inp} dir="ltr" defaultValue={tc.titleEn||'Best Selling Courses'} onBlur={e=>up({titleEn:e.target.value})}/>
    </div>

    {/* تگ‌ها */}
    <div>
     <label style={S.lbl}>تگ‌های دوره‌های ویژه</label>
     <p style={{fontSize:10,color:T.mut,margin:'2px 0 6px'}}>تگ‌ها را با کاما جدا کنید. دوره‌هایی که حداقل یکی از این تگ‌ها را داشته باشند نمایش داده می‌شوند.</p>
     <input style={S.inp} defaultValue={(tc.tags||[]).join(', ')} onBlur={e=>{const tags=e.target.value.split(',').map((t:string)=>t.trim()).filter(Boolean);up({tags})}} placeholder="پرفروش, پرطرفدار, محبوب"/>
     <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
      {tagOptions.map(tag=><span key={tag} style={{padding:'4px 10px',borderRadius:12,background:T.soft,border:`1px solid ${T.brd}`,fontSize:11,fontWeight:700,color:T.acc}}>{tag}</span>)}
     </div>
    </div>

    {/* حداکثر تعداد */}
    <div>
     <label style={S.lbl}>حداکثر تعداد دوره‌های نمایشی</label>
     <input style={S.inp} inputMode="numeric" type="number" min={1} max={12} defaultValue={tc.maxCourses||6} onBlur={e=>up({maxCourses:Math.min(12,Math.max(1,parseInt(p2e(e.target.value))||6))})}/>
    </div>

    {/* توضیحات */}
    <div style={{padding:12,background:T.soft,borderRadius:10,border:`1px solid ${T.brd}`}}>
     <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:0}}>
      این بخش دوره‌هایی را نمایش می‌دهد که حداقل یکی از نشان‌های مشخص‌شده (محبوب، پرفروش یا پرطرفدار) را داشته باشند. این نشان‌ها در بخش «دوره‌ها» برای هر دوره قابل تنظیم هستند.
     </p>
    </div>
   </div>
  </Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تنظیمات دوره‌های تگ‌دار</button>
 </>;
}


 // اصلاح ۱۷: ادغام مدیریت محتوا — حذف لینک مستقیم یوتیوب/آپارات، جایگزینی با کد دستی


 // مرحله ۵۱-۳: ادیتور پلتفرم‌های سفارشی
 function TrustEditor(){
  // TrustRotator از صفحات حذف شد — فقط جملات موفقیت باقی مانده

  // اصلاح ۴۸: تفکیک جملات موفقیت مشاوره و دوره - دو مجموعه مجزا
  const consultList:string[]=Array.isArray(editCfg.consultationSuccessSentences) ? editCfg.consultationSuccessSentences : [];
  const courseList:string[]=Array.isArray(editCfg.courseSuccessSentences) ? editCfg.courseSuccessSentences : [];
  const updConsult=(list:string[])=>setEditCfg({...editCfg,consultationSuccessSentences:list});
  const updCourse=(list:string[])=>setEditCfg({...editCfg,courseSuccessSentences:list});
  const chgConsult=(i:number,v:string)=>{const a=[...consultList];a[i]=v;updConsult(a)};
  const chgCourse=(i:number,v:string)=>{const a=[...courseList];a[i]=v;updCourse(a)};
  const moveConsult=(i:number,dir:number)=>{const a=[...consultList];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];updConsult(a)};
  const moveCourse=(i:number,dir:number)=>{const a=[...courseList];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];updCourse(a)};

  return <>
  {/* اصلاح ۴۸: جملات موفقیت ثبت مشاوره - مجزا */}
  <Box title="جملات صفحه موفقیت ثبت درخواست مشاوره">
   <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>این جملات در صفحه موفقیت فرم مشاوره (پروژه ثانویه) نمایش داده می‌شوند. هر جمله به‌صورت تصادفی انتخاب می‌شود.</p>
   {consultList.map((txt:string,i:number)=><div key={i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
       <b style={{fontSize:12,color:T.ttl}}>جمله {i+1}</b>
       <div style={{display:'flex',gap:4}}><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveConsult(i,-1)}><ZkArrowUpIcon size={13}/></button><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveConsult(i,1)}><ZkArrowDownIcon size={13}/></button><button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>updConsult(consultList.filter((_,j)=>j!==i))}>حذف</button></div>
     </div>
     <textarea style={{...S.ta,minHeight:60}} defaultValue={txt} onBlur={e=>chgConsult(i,e.target.value)} placeholder="متن جمله موفقیت مشاوره..."/>
   </div>)}
   <button style={AdminBtn()} onClick={()=>updConsult([...consultList, "جمله جدید موفقیت مشاوره"])}><ZkPlusIcon size={13}/> افزودن جمله مشاوره</button>
  </Box>

  {/* اصلاح ۴۸: جملات موفقیت ثبت دوره - مجزا */}
  <Box title="جملات صفحه موفقیت ثبت نام دوره">
   <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>این جملات در صفحات موفقیت ثبت دوره (CourseDone / CourseConfirm - پروژه اصلی) نمایش داده می‌شوند.</p>
   {courseList.map((txt:string,i:number)=><div key={i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
       <b style={{fontSize:12,color:T.ttl}}>جمله {i+1}</b>
       <div style={{display:'flex',gap:4}}><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveCourse(i,-1)}><ZkArrowUpIcon size={13}/></button><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveCourse(i,1)}><ZkArrowDownIcon size={13}/></button><button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>updCourse(courseList.filter((_,j)=>j!==i))}>حذف</button></div>
     </div>
     <textarea style={{...S.ta,minHeight:60}} defaultValue={txt} onBlur={e=>chgCourse(i,e.target.value)} placeholder="متن جمله موفقیت دوره..."/>
   </div>)}
   <button style={AdminBtn()} onClick={()=>updCourse([...courseList, "جمله جدید موفقیت دوره"])}><ZkPlusIcon size={13}/> افزودن جمله دوره</button>
  </Box>

  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره</button></>}

 // ─── مدیریت باکس جملات اعتمادساز (TrustBoxNew) — ۴ دسته ثابت + تب‌های دوره
 function TrustBoxManagerEditor(){
  const tb=editCfg.trustBoxes||{};
  const sentences=tb.sentences||{};
  const courseTabsActive = (editCfg.courseTabs || cfg.courseTabs || []).filter((t: any) => t.active !== false);
  // دسته‌های ثابت جملات اعتمادساز — دقیقاً مطابق درخواست کاربر (health/height/appetite/mind)
  const fixedCats: Array<{id:string,label:string}> = [
    {id:'health', label:'🏥 سلامت عمومی (health) — صفحه اصلی'},
    {id:'height', label:'📏 رشد قد (height) — ۱۶ جمله'},
    {id:'appetite', label:'🍽️ بی‌اشتهایی / بدغذایی (appetite) — ۱۹ جمله'},
    {id:'mind', label:'🧠 هوش و ذهن / تمرکز (mind) — ۱۸ جمله'},
  ];
  const dynamicCats = courseTabsActive.filter((t:any)=> !fixedCats.some(f=>f.id===t.id)).map((t:any)=> ({id:t.id, label: `${t.title || t.id} (تب دوره)`}));
  const allCats = [...fixedCats, ...dynamicCats];
  const cats = allCats.map(c=>c.id);
  const catLabels: Record<string, string> = Object.fromEntries(allCats.map(c=>[c.id,c.label]));
  const activeCat=trustCat; const setActiveCat=setTrustCat;
  const list=sentences[activeCat]||[];
  const updList=(items:any[])=>{const ns={...sentences,[activeCat]:items};setEditCfg({...editCfg,trustBoxes:{...tb,sentences:ns}})};
  const chg=(i:number,k:string,v:any)=>{const a=[...list];a[i]={...a[i],[k]:v};updList(a)};
  const add=()=>updList([...list,{id:activeCat[0]+Date.now(),title:'عنوان جدید',description:'توضیحات جدید',priority:3,tabs:[activeCat],active:true}]);
  const remove=(i:number)=>updList(list.filter((_:any,j:number)=>j!==i));
  const toggleCat=(i:number,cat:string)=>{const item=list[i];const tabs=item.tabs||[];if(tabs.includes(cat))chg(i,'tabs',tabs.filter((c:string)=>c!==cat));else chg(i,'tabs',[...tabs,cat])};
  const upGeneral=(k:string,v:any)=>setEditCfg({...editCfg,trustBoxes:{...tb,[k]:v}});
  const upHome=(k:string,v:any)=>setEditCfg({...editCfg,trustBoxes:{...tb,home:{...(tb.home||{}),[k]:v}}});
  const upTab=(tId:string,k:string,v:any)=>setEditCfg({...editCfg,trustBoxes:{...tb,tabs:{...(tb.tabs||{}),[tId]:{...((tb.tabs||{})[tId]||{}),[k]:v}}}});

  const setVal=(k:string,v:any)=>setEditCfg({...editCfg,trustBoxes:{...tb,[k]:v}});
  return <>
   <Box title="تنظیمات عمومی">
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:tb.enabled!==false?`${T.ok}12`:`${T.err}12`,border:'1px solid '+(tb.enabled!==false?T.ok:T.err),borderRadius:12,marginBottom:12}}>
     <input className="zkad-switch" type="checkbox" checked={tb.enabled!==false} onChange={e=>upGeneral('enabled',e.target.checked)} style={{width:18,height:18}}/>
     <span>{tb.enabled!==false?'باکس جملات اعتمادساز فعال است':'باکس جملات اعتمادساز غیرفعال است'}</span>
    </label>
    <label style={S.lbl}>زمان تغییر پیش‌فرض (ثانیه)</label>
    <input style={S.inp} inputMode="numeric" type="number" min={3} max={30} defaultValue={tb.defaultInterval||8} onBlur={e=>upGeneral('defaultInterval',Math.max(3,Math.min(30,parseInt(p2e(e.target.value))||8)))}/>
   </Box>
   <Box title="تنظیمات باکس صفحه اصلی">
    <label style={{display:'flex',alignItems:'center',gap:7,padding:'6px 0',fontWeight:800,fontSize:12,cursor:'pointer'}}>
     <input className="zkad-switch" type="checkbox" checked={(tb.home?.enabled)!==false} onChange={e=>upHome('enabled',e.target.checked)}/>
     {(tb.home?.enabled)!==false?'فعال در صفحه اصلی':'غیرفعال در صفحه اصلی'}
    </label>
    <label style={S.lbl}>زمان تغییر (ثانیه)</label>
    <input style={S.inp} inputMode="numeric" type="number" min={3} max={30} defaultValue={tb.home?.interval||8} onBlur={e=>upHome('interval',Math.max(3,Math.min(30,parseInt(p2e(e.target.value))||8)))}/>
   </Box>
   <Box title="تنظیمات باکس تب‌های دوره">
    {courseTabsActive.map((tItem: any) => {
     const tabId = tItem.id;
     const tabCfg=(tb.tabs||{})[tabId]||{};
     const labels:Record<string,string>={height:'رشد قد',appetite:'بی‌اشتهایی',mind:'هوش', ...catLabels};
     return <div key={tabId} style={{marginBottom:8,border:'1px solid '+T.brd,borderRadius:12,padding:10,background:T.badge}}>
      <b style={{fontSize:12}}>{labels[tabId]||tabId}</b>
      <label style={{display:'flex',alignItems:'center',gap:7,padding:'6px 0',fontWeight:800,fontSize:12,cursor:'pointer'}}>
       <input type="checkbox" checked={(tabCfg.enabled)!==false} onChange={e=>upTab(tabId,'enabled',e.target.checked)}/>
       {(tabCfg.enabled)!==false?'فعال':'غیرفعال'}
      </label>
      <label style={S.lbl}>زمان تغییر (ثانیه)</label>
      <input style={S.inp} inputMode="numeric" type="number" min={3} max={30} defaultValue={tabCfg.interval||8} onBlur={e=>upTab(tabId,'interval',Math.max(3,Math.min(30,parseInt(p2e(e.target.value))||8)))}/>
     </div>})}
   </Box>
   <Box title={'مدیریت جملات - '+catLabels[activeCat]+' ('+list.length+' جمله)'}>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:12}}>
     {cats.map(c=><button key={c} onClick={()=>setActiveCat(c)} style={{padding:'8px 14px',borderRadius:12,border:'none',background:activeCat===c?T.soft:T.card,color:activeCat===c?T.acc:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,boxShadow:activeCat===c?T.neuIn:T.neuOut}}>{catLabels[c]}</button>)}
    </div>
    {list.map((item:any,i:number)=><div key={item.id||i} style={{border:'1px solid '+T.brd,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
     <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap',marginBottom:8}}>
      <label style={{fontSize:11,display:'flex',alignItems:'center',gap:3,cursor:'pointer'}}><input type="checkbox" checked={item.active!==false} onChange={e=>chg(i,'active',e.target.checked)}/> فعال</label>
      <select style={{...S.inp,width:'auto',minWidth:80,fontSize:11}} value={item.priority||3} onChange={e=>chg(i,'priority',parseInt(e.target.value))}>
       <option value={1}>اولویت 1</option><option value={2}>اولویت 2</option><option value={3}>اولویت 3</option><option value={4}>اولویت 4</option><option value={5}>اولویت 5</option>
      </select>
      <div style={{display:'flex',gap:4,flexWrap:'wrap',marginInlineStart:'auto'}}>
       {cats.map(c=>{const active=(item.tabs||[]).includes(c);return <span key={c} onClick={()=>toggleCat(i,c)} title={catLabels[c]||c} style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:active?T.soft:T.card,border:'1px solid '+(active?T.acc:T.brd),color:active?T.acc:T.mut,cursor:'pointer',fontWeight:700}}>{catLabels[c]||c}</span>})}
      </div>
      <button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>remove(i)}>حذف</button>
     </div>
     <div style={{display:'grid',gap:6}}>
      <input style={S.inp} defaultValue={item.title||''} onBlur={e=>chg(i,'title',e.target.value)} placeholder="عنوان جمله"/>
      <textarea style={{...S.ta,minHeight:50}} defaultValue={item.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات جمله..."/>
     </div>
    </div>)}
    <button style={AdminBtn()} onClick={add}><ZkPlusIcon size={13}/> افزودن جمله جدید</button>
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره جملات اعتمادساز</button>
  </>}

 function ShippingBankEditor(){
  // ─── درگاه‌های پرداخت ───
  const pc=editCfg.paymentConfig||{gateways:[]};
  const gateways:any[]=Array.isArray(pc.gateways)?pc.gateways:[];
  const upPC=(k:string,v:any)=>setEditCfg({...editCfg,paymentConfig:{...pc,[k]:v}});
  const upGw=(i:number,patch:any)=>{const g=[...gateways];g[i]={...g[i],...patch};upPC('gateways',g)};
  const upCfg=(i:number,k:string,v:any)=>{const g=[...gateways];g[i]={...g[i],config:{...(g[i].config||{}),[k]:v}};upPC('gateways',g)};
  const upWallet=(gi:number,wi:number,k:string,v:any)=>{const w=[...(gateways[gi].config?.wallets||[])];w[wi]={...w[wi],[k]:v};upCfg(gi,'wallets',w)};
  const addWallet=(gi:number)=>{const w=[...(gateways[gi].config?.wallets||[])];w.push({currency:'USDT',address:'',network:''});upCfg(gi,'wallets',w)};
  const rmWallet=(gi:number,wi:number)=>{const w=[...(gateways[gi].config?.wallets||[])];w.splice(wi,1);upCfg(gi,'wallets',w)};
  const renderGatewayConfig=(gi:number)=>{const gw=gateways[gi];const c=gw.config||{};switch(gw.id){
   case 'blubank':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>Merchant Code</label><input style={S.inp} defaultValue={c.merchantCode||''} onBlur={e=>upCfg(gi,'merchantCode',e.target.value)}/></div><div><label style={S.lbl}>Terminal Code</label><input style={S.inp} defaultValue={c.terminalCode||''} onBlur={e=>upCfg(gi,'terminalCode',e.target.value)}/></div></div>);
   case 'zarinpal':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>Merchant ID</label><input style={S.inp} dir="ltr" defaultValue={c.merchantId||''} onBlur={e=>upCfg(gi,'merchantId',e.target.value)}/></div><label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={!!c.sandbox} onChange={e=>upCfg(gi,'sandbox',e.target.checked)}/>Sandbox</label></div>);
   case 'idpay':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>API Key</label><input style={S.inp} dir="ltr" defaultValue={c.apiKey||''} onBlur={e=>upCfg(gi,'apiKey',e.target.value)}/></div><label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={!!c.sandbox} onChange={e=>upCfg(gi,'sandbox',e.target.checked)}/>Sandbox</label></div>);
   case 'payping':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>API Key</label><input style={S.inp} dir="ltr" defaultValue={c.apiKey||''} onBlur={e=>upCfg(gi,'apiKey',e.target.value)}/></div><div><label style={S.lbl}>Client ID</label><input style={S.inp} dir="ltr" defaultValue={c.clientId||''} onBlur={e=>upCfg(gi,'clientId',e.target.value)}/></div></div>);
   case 'stripe':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>Secret Key</label><input style={S.inp} dir="ltr" type="password" defaultValue={c.secretKey||''} onBlur={e=>upCfg(gi,'secretKey',e.target.value)}/></div><div><label style={S.lbl}>Publishable Key</label><input style={S.inp} dir="ltr" defaultValue={c.publishableKey||''} onBlur={e=>upCfg(gi,'publishableKey',e.target.value)}/></div></div>);
   case 'paypal':return(<div style={{display:'flex',flexDirection:'column',gap:10}}><div><label style={S.lbl}>Client ID</label><input style={S.inp} dir="ltr" defaultValue={c.clientId||''} onBlur={e=>upCfg(gi,'clientId',e.target.value)}/></div><div><label style={S.lbl}>Client Secret</label><input style={S.inp} dir="ltr" type="password" defaultValue={c.clientSecret||''} onBlur={e=>upCfg(gi,'clientSecret',e.target.value)}/></div><label style={{display:'flex',alignItems:'center',gap:7,cursor:'pointer',fontSize:12}}><input type="checkbox" checked={c.sandbox!==false} onChange={e=>upCfg(gi,'sandbox',e.target.checked)}/>Sandbox</label></div>);
   case 'crypto':return(<div style={{display:'flex',flexDirection:'column',gap:10}}>{(c.wallets||[]).map((w:any,wi:number)=><div key={wi} style={{display:'grid',gridTemplateColumns:'100px 1fr 100px 36px',gap:6,alignItems:'end'}}><div><label style={S.lbl}>ارز</label><select style={S.inp} value={w.currency||'USDT'} onChange={e=>upWallet(gi,wi,'currency',e.target.value)}>{['USDT','BTC','ETH','DOGE','LTC'].map(cc=><option key={cc} value={cc}>{cc}</option>)}</select></div><div><label style={S.lbl}>آدرس</label><input style={S.inp} dir="ltr" defaultValue={w.address||''} onBlur={e=>upWallet(gi,wi,'address',e.target.value)}/></div><div><label style={S.lbl}>شبکه</label><input style={S.inp} dir="ltr" defaultValue={w.network||''} onBlur={e=>upWallet(gi,wi,'network',e.target.value)}/></div><button style={{...AdminBtn(),color:T.err,padding:'8px 0',marginBottom:0}} onClick={()=>rmWallet(gi,wi)}><ZkCloseIcon size={13}/></button></div>)}<button style={AdminBtn()} onClick={()=>addWallet(gi)}>+ افزودن کیف پول</button></div>);
   default:return null;
  }};
  // نرمال‌سازی banks: اطمینان از آرایه بودن
  const banks:any[]=Array.isArray(editCfg.banks)?editCfg.banks:(editCfg.banks&&typeof editCfg.banks==='object'?Object.values(editCfg.banks):[]);
  const cryptoWallets:any[]=Array.isArray(editCfg.cryptoWallets)?editCfg.cryptoWallets:(editCfg.cryptoWallets&&typeof editCfg.cryptoWallets==='object'?Object.values(editCfg.cryptoWallets):[]);
  const save=()=>{const bad=banks.some((b:any)=>b.active&&((b.card&&!b.iban)||(!b.card&&b.iban))); if(bad){setBankErr('برای هر حساب فعال، شماره کارت و شبا باید هر دو تکمیل باشند.');return} setBankErr(''); setSave(editCfg)}; const chgBank=(i:number,k:string,v:any)=>{const a=[...banks];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,banks:a})}; const chgCrypto=(i:number,k:string,v:any)=>{const a=[...cryptoWallets];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,cryptoWallets:a})}; return <><Box title="روش‌های ارسال"><ArrSimple path={['shippingMethods','iran']} title="ارسال ایران"/><ArrSimple path={['shippingMethods','intl']} title="ارسال خارج"/><label><input className="zkad-switch" type="checkbox" checked={!!editCfg.whatsappNeedsCountryCode} onChange={e=>setEditCfg({...editCfg,whatsappNeedsCountryCode:e.target.checked})}/> واتساپ دارای کد کشور باشد</label><label style={{display:'block'}}><input className="zkad-switch" type="checkbox" checked={!!editCfg.showReceiptImage} onChange={e=>setEditCfg({...editCfg,showReceiptImage:e.target.checked})}/> نمایش تصویر فیش واریزی</label></Box><Box title="حساب‌های بانکی">{bankErr&&<Err x={bankErr}/>} {banks.map((b:any,i:number)=><div key={b.id} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8}}><Field label="نام بانک" value={b.name} onChange={(v:string)=>chgBank(i,'name',v)} ph=""/><Field label="نام صاحب کارت/حساب" inputMode="text" value={b.holder||b.accountName||''} onChange={(v:string)=>chgBank(i,'holder',v)} ph="مثلاً امیر افرادی"/><Field label="شماره کارت" value={b.card} onChange={(v:string)=>chgBank(i,'card',v)} ph=""/><Field label="شبا" value={b.iban} onChange={(v:string)=>chgBank(i,'iban',v)} ph=""/><select style={S.inp} value={b.color} onChange={e=>chgBank(i,'color',e.target.value)}>{['blue','sky','yellow','red','black','green','gray','brown'].map(x=><option key={x}>{x}</option>)}</select><label><input className="zkad-switch" type="checkbox" checked={b.active} onChange={e=>chgBank(i,'active',e.target.checked)}/> فعال</label><button className="zkad-del" title="حذف حساب" onClick={()=>setEditCfg({...editCfg,banks:banks.filter((_:any,j:number)=>j!==i)})}>حذف</button></div>)}<button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,banks:[...banks,{id:'b'+uid(),name:'حساب جدید',card:'',iban:'',color:'blue',active:true,order:banks.length+1}]})}><ZkPlusIcon size={13}/> افزودن حساب</button></Box><Box title="پرداخت رمزارزی"><label style={S.lbl}>نمایش پرداخت رمزارزی برای کاربران داخل ایران</label><select style={{...S.inp,marginBottom:12}} value={editCfg.cryptoVisibility||'intl'} onChange={e=>setEditCfg({...editCfg,cryptoVisibility:e.target.value})}><option value="intl">فقط خارج از ایران (پیش‌فرض)</option><option value="all">همه کاربران</option><option value="off">غیرفعال</option></select>{cryptoWallets.map((w:any,i:number)=><div key={w.id} style={{border:`1px solid ${w.color||T.brd}55`,background:`${w.color||T.acc}0d`,borderRadius:12,padding:10,marginBottom:8}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{width:12,height:12,borderRadius:'50%',background:w.color,flexShrink:0,border:`1px solid ${T.brd}`}}/><b style={{fontSize:13,color:T.txt}} dir="ltr">{w.name} ({w.symbol||String(w.id).toUpperCase()})</b><label style={{marginInlineStart:'auto',fontSize:12}}><input className="zkad-switch" type="checkbox" checked={!!w.active} onChange={e=>chgCrypto(i,'active',e.target.checked)}/> فعال</label></div><label style={S.lbl}>آدرس کیف پول</label><input dir="ltr" style={{...S.inp,fontFamily:'monospace,-apple-system,"Courier New"',marginBottom:8}} defaultValue={w.address||''} onBlur={e=>chgCrypto(i,'address',e.target.value.trim())} placeholder="Wallet address..."/><label style={S.lbl}>شبکه (Network)</label><input dir="ltr" style={S.inp} defaultValue={w.network||''} onBlur={e=>chgCrypto(i,'network',e.target.value.trim())} placeholder="TRC20 / ERC20 / ..."/></div>)}</Box>
   <Box title={<><ZkCardIcon size={16} color={T.ttl}/> درگاه‌های پرداخت</>}>
    <p style={{fontSize:11,color:T.mut,margin:'0 0 14px',lineHeight:1.8}}>درگاه‌های فعال در صفحه پرداخت به کاربر نمایش داده می‌شوند.</p>
    <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
     {gateways.map((gw:any,gi:number)=>(<div key={gw.id} style={{borderRadius:14,border:'1px solid '+(gw.enabled&&isGatewayProductionReady(gw.id)?T.acc+'44':T.brd),background:gw.enabled&&isGatewayProductionReady(gw.id)?T.acc+'06':T.card,padding:'14px 16px',transition:'all .25s ease',opacity:isGatewayProductionReady(gw.id)?1:.72}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:gw.enabled&&isGatewayProductionReady(gw.id)?14:0}}>
       <div style={{flex:1,minWidth:0}}><b style={{fontSize:13,fontWeight:800,color:T.txt}}>{gw.label||gw.id}</b>{!isGatewayProductionReady(gw.id)&&<small style={{display:'block',marginTop:3,color:T.warn||'#b45309'}}>در حال توسعه — تا تکمیل اتصال امن سمت سرور قابل فعال‌سازی نیست</small>}</div>
       <label style={{display:'flex',alignItems:'center',gap:8,cursor:isGatewayProductionReady(gw.id)?'pointer':'not-allowed',flexShrink:0}}>
        <span style={{fontSize:11,fontWeight:700,color:gw.enabled&&isGatewayProductionReady(gw.id)?T.ok:T.mut}}>{gw.enabled&&isGatewayProductionReady(gw.id)?'فعال':'غیرفعال'}</span>
        <div onClick={()=>{if(isGatewayProductionReady(gw.id))upGw(gi,{enabled:!gw.enabled})}} style={{width:44,height:24,borderRadius:12,cursor:isGatewayProductionReady(gw.id)?'pointer':'not-allowed',background:gw.enabled&&isGatewayProductionReady(gw.id)?T.ok:'#ccc',position:'relative',transition:'background .25s'}}>
         <div style={{width:20,height:20,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:gw.enabled&&isGatewayProductionReady(gw.id)?22:2,transition:'left .25s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
        </div>
       </label>
      </div>
      {gw.enabled&&isGatewayProductionReady(gw.id)&&<div style={{padding:'12px',borderRadius:10,background:T.soft,border:'1px solid '+T.brd}}>{renderGatewayConfig(gi)}</div>}
     </div>))}
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <div><label style={S.lbl}>واحد پول</label><select style={S.inp} value={pc.defaultCurrency||'IRR'} onChange={e=>upPC('defaultCurrency',e.target.value)}><option value="IRR">ریال</option><option value="IRT">تومان</option><option value="USD">دلار</option></select></div>
     <div><label style={S.lbl}>Callback URL</label><input style={S.inp} dir="ltr" defaultValue={pc.callbackUrl||''} onBlur={e=>upPC('callbackUrl',e.target.value)}/></div>
    </div>
   </Box>
   <button style={S.btn} onClick={save}>ذخیره</button></>}
 // اصلاح ۲۸: ادیتور کامل روش‌های ارسال با پشتیبانی از ترتیب، پیش‌فرض، تگ، راهنما و عنوان انگلیسی
 function ArrSimple({path,title}:any){
  const arr=editCfg[path[0]][path[1]]||[];
  const ch=(i:number,k:string,v:any)=>{const a=[...arr];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:a}})};
  const setDefault=(i:number)=>{const a=arr.map((m:any,idx:number)=>({...m,default:idx===i}));setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:a}})};
  const move=(i:number,dir:-1|1)=>{const a=[...arr];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:a}})};
  return <div><h4>{title}</h4>{arr.map((m:any,i:number)=><div key={m.id} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
    <input style={S.inp} defaultValue={m.title} onBlur={e=>ch(i,'title',e.target.value)} placeholder="عنوان فارسی"/>
    <input style={S.inp} defaultValue={m.titleEn||''} onBlur={e=>ch(i,'titleEn',e.target.value)} placeholder="عنوان انگلیسی"/>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:8}}>
    <input style={S.inp} inputMode="numeric" defaultValue={m.order} onBlur={e=>ch(i,'order',Math.max(1,+p2e(e.target.value)||1))} placeholder="ترتیب"/>
    <input style={S.inp} defaultValue={m.help||''} onBlur={e=>ch(i,'help',e.target.value)} placeholder="متن راهنما"/>
    <input style={S.inp} defaultValue={m.tag||''} onBlur={e=>ch(i,'tag',e.target.value)} placeholder="تگ فارسی (مثلاً: سریع‌ترین)"/>
   </div>
   <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:8}}>
    <input style={S.inp} defaultValue={m.tagEn||''} onBlur={e=>ch(i,'tagEn',e.target.value)} placeholder="تگ انگلیسی (مثلاً: Fastest)"/>
    <div style={{display:'flex',alignItems:'center',gap:12}}>
     <label style={{fontSize:12,display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}><input type="checkbox" checked={m.active} onChange={e=>ch(i,'active',e.target.checked)}/> فعال</label>
     <label style={{fontSize:12,display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}><input type="checkbox" checked={m.requiresPostal} onChange={e=>ch(i,'requiresPostal',e.target.checked)}/> کدپستی</label>
     <label style={{fontSize:12,display:'flex',alignItems:'center',gap:5,cursor:'pointer'}}><input type="radio" name={`shipping-default-${path[1]}`} checked={m.default} onChange={()=>setDefault(i)}/> پیش‌فرض</label>
    </div>
   </div>
   <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
    <button style={AdminBtn()} disabled={i===0} onClick={()=>move(i,-1)}><ZkArrowUpIcon size={13}/></button>
    <button style={AdminBtn()} disabled={i===arr.length-1} onClick={()=>move(i,1)}><ZkArrowDownIcon size={13}/></button>
    <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:arr.filter((_:any,j:number)=>j!==i)}})}>حذف</button>
   </div>
  </div>)}
  <button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:[...arr,{id:'m'+uid(),title:'روش جدید',titleEn:'New method',active:true,requiresPostal:false,default:false,order:arr.length+1,help:'',tag:'',tagEn:''}]}})}>افزودن</button>
  </div>}
 // --- مدیریت دیزاین (مرحله ۴ - بازطراحی تدریجی) ---
function DesignManagerEditor(){
 const ds=(editCfg as any).designSystem||{sections:{public:{design:'wellness'},education:{design:'kidlearn'},admin:{design:'classic'}}};
 const publicThemeMode=normalizePublicColorMode((editCfg as any).publicThemeMode);
 const sections=ds.sections||{};

 const updateSection=(section:string,design:string)=>{
  setEditCfg({...editCfg,designSystem:{...ds,sections:{...sections,[section]:{design}}}});
 };

 const designOptions=[
  {value:'wellness',label:'Wellness (بنفش)'},
  {value:'kidlearn',label:'KidLearn (کودکان)'},
  {value:'blend',label:'Blend (ترکیبی)'},
  {value:'classic',label:'کلاسیک'},
 ];

 return <><Box title="نمای ظاهری سایت برای کاربران"><p style={{fontSize:12,color:T.mut,lineHeight:1.8,marginTop:0}}>این تنظیم عمومی برای کاربرانی اعمال می‌شود که در مرورگرشان انتخاب شخصی روشن/تاریک ندارند.</p><label style={{...S.lbl}}>حالت نمایش سایت عمومی</label><select style={S.inp} value={publicThemeMode} onChange={e=>setEditCfg({...editCfg,publicThemeMode:e.target.value})}><option value="dark">همیشه دارک</option><option value="light">همیشه وایت</option><option value="auto">سفارشی بر اساس ساعت — دارک از ۲۳ تا ۰۷</option></select><p style={{fontSize:11,color:T.mut,lineHeight:1.7}}>انتخاب شخصی ماه/خورشید در هدر پنل، پنل و صفحات عمومی همین مرورگر را با هم تغییر می‌دهد و بر این تنظیم اولویت دارد.</p></Box>
  <Box title={<><ZkPaletteIcon size={16} color={T.ttl}/> مدیریت دیزاین</>}>
   <p style={{fontSize:11,color:T.mut,margin:'0 0 14px',lineHeight:1.8}}>برای هر بخش، دیزاین مورد نظر را انتخاب کنید.</p>
   <div style={{display:'grid',gap:14}}>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}> صفحات عمومی</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={normalizeDesignId(sections.public?.design,'wellness')} onChange={e=>updateSection('public',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
     </div>
    </div>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}><ZkBookIcon size={14} color={T.ttl}/> بخش آموزش</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={normalizeDesignId(sections.education?.design,'kidlearn')} onChange={e=>updateSection('education',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
     </div>
    </div>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}><ZkSettingsIcon size={14} color={T.ttl}/> پنل مدیریت</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={normalizeDesignId(sections.admin?.design,'classic')} onChange={e=>updateSection('admin',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
     </div>
    </div>
   </div>
  </Box>
  <div className="zkad-preview"><span className="zkad-preview-card">نمونه کارت — رنگ‌بندی فعال پنل</span><button type="button" className="zkad-preview-btn">دکمه اصلی</button><span className="zkad-tag t-ok">موفق</span><span className="zkad-tag t-warn">در انتظار</span><span className="zkad-tag t-err">خطا</span><span className="zkad-tag t-info">ارسال‌شده</span><small>پیش‌نمایش زنده توکن‌های فعال (روشن/تیره) — تغییر تم از سوییچ هدر قابل مشاهده است</small></div>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تنظیمات دیزاین</button>
 </>;
}

 // --- نصب پنل مدیریت به شکل اپلیکیشن ---
 function AdminInstallControl(){
  const [prompt,setPrompt]=useState<any>(null); const [done,setDone]=useState(false); const [installing,setInstalling]=useState(false); const [showIosGuide,setShowIosGuide]=useState(false);
  useEffect(()=>{const h=(e:any)=>{e.preventDefault();setPrompt(e)};const installed=()=>setDone(true);window.addEventListener('beforeinstallprompt',h);window.addEventListener('appinstalled',installed);return()=>{window.removeEventListener('beforeinstallprompt',h);window.removeEventListener('appinstalled',installed)}},[]);
  const ios=/iPhone|iPad|iPod/i.test(navigator.userAgent);
  // در iOS، قبل از افزودن به صفحهٔ اصلی باید مستقیم روی صفحهٔ ورود پنل باشیم تا بعد از نصب
  // همان صفحهٔ ورود باز شود (نه صفحهٔ هوم). دکمهٔ نصب این کار را خودکار انجام می‌دهد.
  const onInstallClick=async()=>{
   if(done)return;
   if(ios){ setShowIosGuide(true); try{ window.location.href='/admin/login'; }catch(e){} return; }
   if(prompt){ setInstalling(true); try{ await prompt.prompt(); const c=await prompt.userChoice; if(c&&c.outcome==='accepted')setDone(true); }catch(e){} setInstalling(false); setPrompt(null); return; }
   setShowIosGuide(true);
  };
  const btnLabel=done?'✓ نصب شده':installing?'در حال نصب…':(prompt||ios)?'نصب اپلیکیشن پنل':'نصب اپلیکیشن پنل';
  return <div style={{marginTop:22,padding:14,borderRadius:14,background:T.soft,border:`1px solid ${T.brd}`}}>
   <b style={{display:'block',color:T.ttl,marginBottom:5}}>نصب پنل مدیریت روی گوشی</b>
   <p style={{fontSize:12,color:T.mut,lineHeight:1.8,margin:'0 0 12px'}}>دسترسی سریع به پنل مثل یک اپلیکیشن مستقل، بدون نوار آدرس مرورگر.</p>
   <button type="button" disabled={done||installing} style={{...AdminBtn(),width:'100%',justifyContent:'center',display:'flex',alignItems:'center',gap:8,minHeight:46,fontSize:13.5,opacity:(done||installing)?.8:1}} onClick={onInstallClick}>
    {!done&&<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>}
    {btnLabel}
   </button>
   {showIosGuide&&(
    <div style={{marginTop:12,padding:'11px 12px',borderRadius:12,border:`1px solid ${T.brd}`,background:T.card,fontSize:12,color:T.mut,lineHeight:1.9}}>
     برای نصب روی گوشی: در مرورگر <b>Safari</b> دکمهٔ <b>Share / اشتراک‌گذاری</b> را بزنید ← <b>Add to Home Screen / افزودن به صفحهٔ اصلی</b> را انتخاب کنید.
     <span style={{display:'block',marginTop:6}}>⚠️ <b>برای اینکه بعد از نصب مستقیم به صفحهٔ ورود پنل بروید</b>، ابتدا به صفحهٔ ورود پنل رفته‌اید (خودکار انجام شد)؛ <b>همین‌جا</b> گزینهٔ «Add to Home Screen» را بزنید.</span>
    </div>
   )}
  </div>
 }

 function SecurityEditor(){
  // Phase 7+8: تغییر رمز/شماره از داخل پنل — این بار واقعی و امن از طریق تابع
  // admin-credentials (چک نشست + رمز فعلی + اعتبارسنجی + به‌روزرسانی Secret ها).
  // نکته: همهٔ state/ref ها در سطح AdminPanel تعریف شده‌اند (قانون hooks — این تابع
  // با SecurityEditor() فراخوانی می‌شود نه JSX).
  const enableBio=async()=>{try{if(!biometricSupported())throw new Error();await enrollAdminBiometric(cfg.adminPhone||'admin');alert('ورود با اثر انگشت / Face ID روی این دستگاه فعال شد.')}catch{alert('فعال‌سازی انجام نشد یا دستگاه پشتیبانی نمی‌کند.')}};
  const disableBio=()=>{removeAdminBiometric();alert('ورود بیومتریک این دستگاه غیرفعال شد.');};
  const logoutEverywhere=async()=>{
   if(!confirm('همهٔ نشست‌های پنل مدیریت (این دستگاه و همهٔ دستگاه‌های دیگر) بسته شوند؟'))return;
   setRevokeBusy(true);
   try{
    await revokeAllAdminSessions();
    try{clearAdminSession()}catch{}
    alert('همهٔ نشست‌های پنل بسته شد. برای ورود دوباره باید با شماره و رمز وارد شوید.');
   }catch(e:any){
    alert(e?.message||'خروج از همهٔ نشست‌ها انجام نشد. اتصال را بررسی کنید.');
   }finally{setRevokeBusy(false)}
  };
  const doChangeCreds=async()=>{
   setCredErr(''); setCredMsg('');
   const cur=(credCurPwdRef.current?.value||'').trim();
   const np=(credNewPhoneRef.current?.value||'').trim();
   const rp=(credRepPhoneRef.current?.value||'').trim();
   const nw=(credNewPwdRef.current?.value||'');
   const rw=(credRepPwdRef.current?.value||'');
   if(!cur){setCredErr('رمز عبور فعلی را وارد کنید.');return;}
   if(!np&&!nw){setCredErr('حداقل شماره جدید یا رمز جدید را وارد کنید.');return;}
   if(np){
    const d=np.replace(/[۰-۹]/g,c=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(c).toString()).replace(/[٠-٩]/g,c=>'٠١٢٣٤٥٦٧٨٩'.indexOf(c).toString()).replace(/[\s\-().+]/g,'');
    const norm=d.startsWith('98')&&d.length===12?'0'+d.slice(2):d.startsWith('0')?d:'0'+d;
    if(!/^09\d{9}$/.test(norm)){setCredErr('شماره موبایل معتبر نیست (مثال: 09123456789).');return;}
    if(np!==rp){setCredErr('شماره جدید با تکرار آن مطابقت ندارد.');return;}
   }
   if(nw){
    if(nw.length<12){setCredErr('رمز جدید باید حداقل ۱۲ کاراکتر باشد.');return;}
    if(nw!==rw){setCredErr('رمز جدید با تکرار آن مطابقت ندارد.');return;}
   }
   setCredBusy(true);
   try{
    await changeAdminCredentials({ currentPassword:cur, newPhone:np||undefined, newPassword:nw||undefined });
    setCredMsg('اطلاعات ورود با موفقیت تغییر کرد. برای ادامه با اطلاعات جدید وارد شوید.');
    if(credCurPwdRef.current)credCurPwdRef.current.value='';
    if(credNewPhoneRef.current)credNewPhoneRef.current.value='';
    if(credRepPhoneRef.current)credRepPhoneRef.current.value='';
    if(credNewPwdRef.current)credNewPwdRef.current.value='';
    if(credRepPwdRef.current)credRepPwdRef.current.value='';
    setTimeout(()=>{ try{ onLogout?.(); }catch{} }, 1400);
   }catch(e:any){
    setCredErr(e?.message||'خطا در تغییر اطلاعات ورود.');
   }finally{ setCredBusy(false); }
  };
  return <>
   <Box title="🔑 API برای ایجنت‌های هوش مصنوعی (رایگان)">
    <ApiKeysManager T={T} S={S} AdminBtn={AdminBtn} Box={Box} />
   </Box>
   <Box title="امنیت">
   <div style={{marginBottom:14,padding:14,borderRadius:14,background:T.soft,border:`1px solid ${T.brd}`}}>
    <b style={{display:'block',color:T.ttl,marginBottom:4}}>تغییر رمز عبور و شماره تماس ورود</b>
    <p style={{fontSize:12,color:T.mut,lineHeight:1.8,margin:'0 0 12px'}}>شمارهٔ فعلی: <b style={{direction:'ltr',display:'inline-block'}}>{credPhoneMasked||'—'}</b>. برای تغییر، رمز فعلی را وارد کنید و حداقل یکی از موارد جدید را کامل کنید. بعد از تغییر، همهٔ نشست‌ها بسته می‌شود و با اطلاعات جدید وارد می‌شوید.</p>
    {credMsg&&<div style={{fontSize:12,fontWeight:800,color:T.ok||'#047857',background:`${T.ok}12`,border:`1px solid ${T.ok}`,borderRadius:10,padding:'8px 12px',marginBottom:10}}>✓ {credMsg}</div>}
    {credErr&&<div style={{fontSize:12,fontWeight:800,color:T.err||'#DC2626',background:`${T.err}12`,border:`1px solid ${T.err}`,borderRadius:10,padding:'8px 12px',marginBottom:10}}>{credErr}</div>}
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
     <label style={{display:'block'}}><span style={{fontSize:12,fontWeight:700,color:T.txt,display:'block',marginBottom:4}}>رمز عبور فعلی *</span><input ref={credCurPwdRef} type="password" style={S.inp} placeholder="رمز فعلی"/></label>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <label style={{display:'block'}}><span style={{fontSize:12,fontWeight:700,color:T.txt,display:'block',marginBottom:4}}>شمارهٔ جدید</span><input ref={credNewPhoneRef} type="tel" inputMode="numeric" style={S.inp} placeholder="09123456789"/></label>
      <label style={{display:'block'}}><span style={{fontSize:12,fontWeight:700,color:T.txt,display:'block',marginBottom:4}}>تکرار شمارهٔ جدید</span><input ref={credRepPhoneRef} type="tel" inputMode="numeric" style={S.inp} placeholder="تکرار شماره"/></label>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <label style={{display:'block'}}><span style={{fontSize:12,fontWeight:700,color:T.txt,display:'block',marginBottom:4}}>رمز عبور جدید</span><input ref={credNewPwdRef} type="password" style={S.inp} placeholder="حداقل ۱۲ کاراکتر"/></label>
      <label style={{display:'block'}}><span style={{fontSize:12,fontWeight:700,color:T.txt,display:'block',marginBottom:4}}>تکرار رمز جدید</span><input ref={credRepPwdRef} type="password" style={S.inp} placeholder="تکرار رمز جدید"/></label>
     </div>
     <div><button type="button" style={{...AdminBtn(),background:T.acc||'#0F766E',color:'var(--zkad-acc-contrast, #fff)',border:0,fontWeight:800}} disabled={credBusy} onClick={doChangeCreds}>{credBusy?'در حال ذخیره…':'ذخیره تغییرات ورود'}</button></div>
    </div>
   </div>
   <div style={{marginTop:14,padding:14,borderRadius:14,background:T.soft,border:`1px solid ${T.brd}`}}>
    <b style={{display:'block',color:T.ttl,marginBottom:6}}>ورود با اثر انگشت / Face ID</b>
    <p style={{fontSize:12,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>دستگاه فعلی: {hasAdminBiometric()?'فعال':'غیرفعال'}. اثر انگشت و چهره هرگز در سایت ذخیره نمی‌شوند.</p>
    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>{hasAdminBiometric()?<button type="button" style={{...AdminBtn(),color:T.err}} onClick={disableBio}>غیرفعال‌سازی این دستگاه</button>:<button type="button" style={AdminBtn()} onClick={enableBio}>فعال‌سازی اثر انگشت / Face ID</button>}</div>
   </div>
   <div style={{marginTop:14,padding:14,borderRadius:14,background:T.soft,border:`1px solid ${T.brd}`}}>
    <b style={{display:'block',color:T.ttl,marginBottom:6}}>نشست‌های فعال</b>
    <p style={{fontSize:12,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>دستگاه‌هایی که هم‌اکنون به پنل وارد شده‌اند. دستگاهی که الان با آن کار می‌کنید با «این دستگاه» مشخص شده است.</p>
    {devicesErr&&<div style={{fontSize:11.5,color:T.err,marginBottom:8}}>{devicesErr}</div>}
    {devicesList===null?<div style={{fontSize:12,color:T.mut,padding:'6px 0'}}>در حال دریافت لیست دستگاه‌ها...</div>:
     devicesList.length===0?<div style={{fontSize:12,color:T.mut,padding:'6px 0'}}>هیچ نشست فعالی یافت نشد.</div>:
     <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:12}}>
      {devicesList.map((d:any)=>{
       const isCurrent = String(d.id)===String(getAdminDeviceId());
       return <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:8,flexWrap:'wrap',background:T.card||'#fff',border:`1px solid ${T.brd||'#E5E0D8'}`,borderRadius:10,padding:'8px 10px'}}>
        <div style={{minWidth:0,flex:1}}>
         <div style={{display:'flex',alignItems:'center',gap:6,flexWrap:'wrap'}}>
          <span style={{fontSize:12.5,fontWeight:800,color:T.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap',maxWidth:'100%'}}>{d.device_name||'دستگاه ناشناخته'}</span>
          {isCurrent&&<span style={{fontSize:10,fontWeight:800,background:T.acc||'#0F766E',color:'var(--zkad-acc-contrast, #fff)',borderRadius:6,padding:'1px 7px'}}>این دستگاه</span>}
          {d.biometric_enabled&&<span style={{fontSize:10,fontWeight:800,background:'var(--zkad-placement-course-soft)',color:'var(--zkad-placement-course)',borderRadius:6,padding:'1px 7px'}}>بیومتریک</span>}
         </div>
         <div style={{fontSize:10.5,color:T.mut,marginTop:3}}>{d.browser||''}{d.platform?` • ${d.platform}`:''}{d.last_seen_at?` • آخرین فعالیت: ${new Date(d.last_seen_at).toLocaleDateString('fa-IR')} ${new Date(d.last_seen_at).toLocaleTimeString('fa-IR',{hour:'2-digit',minute:'2-digit'})}`:''}</div>
        </div>
        <button type="button" style={{...AdminBtn(),padding:'5px 10px',fontSize:11.5,color:T.err||'#DC2626',border:`1px solid ${(T.err||'#DC2626')}33`,background:`${(T.err||'#DC2626')}08`,flex:'0 0 auto'}} disabled={revokeBusy} onClick={async()=>{ if(!confirm('این دستگاه از پنل خارج شود؟'))return; setRevokeBusy(true); try{ await revokeAdminDevice(String(d.id)); const list=await listAdminDevices(); setDevicesList(list); alert('دستگاه از پنل خارج شد.'); }catch(e:any){ alert(e?.message||'خروج دستگاه انجام نشد.'); }finally{ setRevokeBusy(false); } }}>خروج دستگاه</button>
       </div>;
      })}
     </div>}
    <button type="button" style={{...AdminBtn(),color:T.err}} onClick={logoutEverywhere} disabled={revokeBusy}>{revokeBusy?'در حال بستن نشست‌ها…':'بستن همهٔ نشست‌ها'}</button>
   </div>
   <AdminInstallControl/>
  </Box></>}

 function ProductsTabEditor(){
  // منبع واحد مدیریت محصولات و بخش «محصولات منتخب» صفحهٔ خانه.
  const productsCfg=editCfg.products&&typeof editCfg.products==='object'&&!Array.isArray(editCfg.products)
   ?editCfg.products:{showSection:true,list:Array.isArray(editCfg.products)?editCfg.products:[]};
  let items:any[]=Array.isArray(productsCfg.list)?productsCfg.list:[];
  const legacyItems:any[]=Array.isArray(productsCfg.items)?productsCfg.items:[];
  if(items.length===0&&legacyItems.length>0){
   items=legacyItems.map((it:any,i:number)=>({...it,name:it.name||it.title||'',title:it.title||it.name||'',id:it.id||('p'+uid()),showOnHome:(it.showOnHome??i<4)!==false}));
  }
  const showProductsPage=(productsCfg.showSection??editCfg.showProductsSection??editCfg.showProductsPage??true)!==false;
  const homeFeatured=productsCfg.homeFeatured&&typeof productsCfg.homeFeatured==='object'?productsCfg.homeFeatured:{};
  const showHomeFeatured=(homeFeatured.enabled??productsCfg.showSection??true)!==false;
  const selectedHomeCount=items.filter((it:any)=>it.isVisible!==false&&it.active!==false&&it.showOnHome!==false).length;
  const upd=(newItems:any[])=>setEditCfg({...editCfg,products:{...productsCfg,list:newItems,items:[]}});
  const patchItem=(i:number,patch:any)=>{const a=[...items];if(!a[i])return;a[i]={...a[i],...patch};upd(a)};
  const chg=(i:number,k:string,v:any)=>patchItem(i,{[k]:v});
  const chgFeatures=(i:number,value:string)=>patchItem(i,{features:value.split(/[|,\n]/).map((s:string)=>s.trim()).filter(Boolean)});
  const closeProductHomeCrop=()=>{
   if(productHomeCrop?.objectUrl&&String(productHomeCrop.src||'').startsWith('blob:'))URL.revokeObjectURL(productHomeCrop.src);
   setProductHomeCrop(null);
  };
  const startProductHomeCrop=(it:any,i:number,file?:File)=>{
   if(file&&!(file.type.startsWith('image/')||/\.(jpe?g|png|webp|avif|heic|heif)$/i.test(file.name))){alert('فایل انتخاب‌شده تصویر نیست.');return;}
   const src=file?URL.createObjectURL(file):String(it.homeImage||it.homeImageUrl||'');
   if(!src)return;
   setProductHomeCrop({productId:it.id,index:i,src,objectUrl:!!file,aspectRatio:it.homeImageAspectRatio||'4 / 3',oldUrl:it.homeImage||it.homeImageUrl||'',name:it.name||it.title||'product'});
  };
  const saveProductHomeCrop=async(file:File)=>{
   if(!productHomeCrop)return;
   setProductHomeCropBusy(true);
   try{
    const i=items.findIndex((it:any,index:number)=>String(it.id||index)===String(productHomeCrop.productId??productHomeCrop.index));
    const targetIndex=i>=0?i:productHomeCrop.index;
    if(!items[targetIndex])throw new Error('محصول پیدا نشد.');
    const url=await fileToData(file,productHomeCrop.oldUrl,'products/home-featured');
    patchItem(targetIndex,{homeImage:url,homeImageUrl:url,homeImageAspectRatio:productHomeCrop.aspectRatio||'',homeImageObjectPosition:'center'});
    closeProductHomeCrop();
   }catch(err:any){alert(err?.message==='STORAGE_FULL'?'فضای ذخیره‌سازی تکمیل شده است.':(err?.message||'آپلود عکس منتخب خانه انجام نشد.'));}
   finally{setProductHomeCropBusy(false);}
  };
  return <>
   <Box title="نمایش صفحه محصولات در سایت">
    <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>این گزینه فقط صفحهٔ کامل محصولات، لینک منو و دکمهٔ «مشاهده همه» را کنترل می‌کند. تنظیم بخش منتخب صفحهٔ خانه در کارت بعدی مستقل است.</p>
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:showProductsPage?`${T.ok}12`:`${T.err}12`,border:`1px solid ${showProductsPage?T.ok:T.err}`,borderRadius:12}}>
     <input data-product-setting="products-page-enabled" type="checkbox" checked={showProductsPage} onChange={e=>{const v=e.target.checked;setEditCfg({...editCfg,products:{...productsCfg,showSection:v,list:items,items:[]},showProductsSection:v,showProductsPage:v})}} style={{width:18,height:18}}/>
     <span>{showProductsPage?<span style={{color:T.ok,display:'inline-flex',alignItems:'center',gap:6}}><ZkCheckCircleIcon size={15}/>صفحه محصولات فعال است</span>:<span style={{color:T.err,display:'inline-flex',alignItems:'center',gap:6}}><ZkXCircleIcon size={15}/>صفحه محصولات غیرفعال است</span>}</span>
    </label>
   </Box>

   <Box title="محصولات منتخب در صفحه خانه">
    <p style={{fontSize:11,color:T.mut,lineHeight:1.9,margin:'0 0 10px'}}>نمایش یا لغو نمایش کل این بخش را مستقل از صفحهٔ محصولات تعیین کنید و سپس محصولاتی را که باید داخل آن دیده شوند انتخاب کنید. ترتیب نمایش همان ترتیب لیست محصولات است.</p>
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',marginBottom:12,background:showHomeFeatured?`${T.ok}12`:`${T.err}12`,border:`1px solid ${showHomeFeatured?T.ok:T.err}`,borderRadius:12}}>
     <input data-product-setting="home-featured-enabled" type="checkbox" checked={showHomeFeatured} onChange={e=>setEditCfg({...editCfg,products:{...productsCfg,list:items,items:[],homeFeatured:{...homeFeatured,enabled:e.target.checked}}})} style={{width:18,height:18}}/>
     <span style={{color:showHomeFeatured?T.ok:T.err}}>{showHomeFeatured?'نمایش بخش در صفحه خانه':'عدم نمایش بخش در صفحه خانه'}</span>
    </label>
    <div data-home-product-selection style={{display:'grid',gap:7}}>
     {items.map((it:any,i:number)=>{const globallyVisible=it.isVisible!==false&&it.active!==false;return <label key={it.id||i} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',border:`1px solid ${T.brd}`,borderRadius:10,background:T.soft,opacity:globallyVisible?1:.58,cursor:globallyVisible?'pointer':'not-allowed'}}>
      <input type="checkbox" data-home-product-id={it.id||i} checked={globallyVisible&&it.showOnHome!==false} disabled={!globallyVisible} onChange={e=>patchItem(i,{showOnHome:e.target.checked})}/>
      <span style={{flex:1,fontSize:12,fontWeight:750,color:T.ttl}}>{it.title||it.name||'بدون عنوان'}</span>
      {!globallyVisible&&<small style={{color:T.id==='admin-dark'?'#FCA5A5':T.err}}>محصول مخفی است</small>}
     </label>})}
    </div>
    <div style={{fontSize:11,color:T.mut,marginTop:9}}>تعداد موارد منتخب و قابل نمایش: <b style={{color:T.acc}}>{selectedHomeCount}</b></div>
   </Box>

   <Box title={`لیست و تنظیمات محصولات (${items.length})`}>
    {items.map((it:any,i:number)=><details key={it.id||i} data-product-editor={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span>{it.isVisible!==false?<ZkEyeIcon size={14} color={T.ok}/>:<ZkEyeOffIcon size={14} color={T.err}/>}</span>
      <span style={{flex:1}}>{it.title||it.name||'بدون عنوان'}</span>
      {it.showOnHome!==false&&it.isVisible!==false&&<span style={{fontSize:10,color:T.acc}}>منتخب خانه</span>}
     </summary>
     <div style={{marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:14,marginBottom:8,flexWrap:'wrap'}}>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}><input className="zkad-switch" type="checkbox" checked={it.isVisible!==false} onChange={e=>patchItem(i,{isVisible:e.target.checked,active:e.target.checked})}/> نمایش محصول در سایت</label>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}><input type="checkbox" checked={it.showOnHome!==false} onChange={e=>patchItem(i,{showOnHome:e.target.checked})}/> انتخاب برای بخش صفحه خانه</label>
      </div>
      <Field label="نام محصول" value={it.name||it.title||''} onChange={(v:string)=>chg(i,'name',v)} ph=""/>
      <Field label="عنوان نمایشی (اختیاری)" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>توضیحات محصول</label>
      <textarea style={{...S.ta,marginBottom:8,minHeight:60}} defaultValue={it.description||it.desc||''} onBlur={e=>patchItem(i,{description:e.target.value,desc:e.target.value})} placeholder="توضیحات کامل محصول..."/>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
       <div><label style={S.lbl}>قیمت (تومان)</label><input style={S.inp} inputMode="numeric" defaultValue={it.price||''} onBlur={e=>chg(i,'price',p2e(e.target.value).replace(/[^0-9]/g,''))} placeholder="قیمت"/></div>
       <div><label style={S.lbl}>قیمت تخفیف‌دار (اختیاری)</label><input style={S.inp} inputMode="numeric" defaultValue={it.discountedPrice||''} onBlur={e=>chg(i,'discountedPrice',Number(p2e(e.target.value).replace(/[^0-9]/g,''))||0)} placeholder="0"/></div>
      </div>
      <label style={S.lbl}>دسته‌بندی</label><input style={S.inp} defaultValue={it.category||''} onBlur={e=>chg(i,'category',e.target.value.trim())} placeholder="مثلاً: مکمل / منبع / برنامه شخصی / باندل"/>
      <label style={S.lbl}>آیکون (اختیاری)</label><input style={S.inp} defaultValue={it.icon||''} onBlur={e=>chg(i,'icon',e.target.value.trim())} placeholder="آیکون"/>
      <label style={S.lbl}>ویژگی‌ها (با | یا کاما یا خط جدید جدا کنید)</label><textarea style={{...S.ta,marginBottom:8,minHeight:50}} defaultValue={(it.features||[]).join(' | ')} onBlur={e=>chgFeatures(i,e.target.value)} placeholder="ویژگی ۱ | ویژگی ۲ | ..."/>

      <div style={{padding:'11px',border:`1px solid ${T.brd}`,borderRadius:12,background:T.card,marginTop:10}}>
       <b style={{display:'block',fontSize:12.5,color:T.ttl,marginBottom:5}}>عکس اصلی محصول</b>
       <p style={{fontSize:10.5,color:T.mut,lineHeight:1.7,margin:'0 0 8px'}}>این عکس در صفحهٔ کامل محصولات استفاده می‌شود.</p>
       <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
        {(it.image||it.imageUrl)&&<img src={it.image||it.imageUrl} alt="" style={{width:74,height:74,objectFit:'cover',objectPosition:it.objectPosition||'center',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
        <input type="file" aria-label={`بارگذاری عکس اصلی ${it.name||it.title||''}`} accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(f){try{const url=await fileToData(f,it.image||it.imageUrl,'products');patchItem(i,{image:url,imageUrl:url})}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
        <LibraryPicker T={T} S={S} editCfg={editCfg} section="products" onSelect={(url:string)=>patchItem(i,{image:url,imageUrl:url})} current={it.image||it.imageUrl} AdminBtn={AdminBtn}/>
       </div>
       <input style={{...S.inp,marginBottom:8}} defaultValue={it.image||it.imageUrl||''} onBlur={e=>patchItem(i,{image:e.target.value.trim(),imageUrl:e.target.value.trim()})} placeholder="https://... یا لینک مستقیم عکس"/>
       <FrameControls T={T} S={S} value={{aspectRatio:it.aspectRatio,objectPosition:it.objectPosition}} onChange={(p:any)=>patchItem(i,p)}/>
      </div>

      <div data-home-image-editor={it.id||i} style={{padding:'11px',border:`2px solid ${T.acc}`,borderRadius:12,background:T.soft,marginTop:10}}>
       <b style={{display:'block',fontSize:12.5,color:T.ttl,marginBottom:5}}>عکس جداگانه برای بخش «محصولات منتخب» صفحه خانه</b>
       <p style={{fontSize:10.5,color:T.mut,lineHeight:1.8,margin:'0 0 9px'}}>برای این محصول می‌توانید عکسی متفاوت از صفحهٔ محصولات بارگذاری کنید و کادر آن را با لمس، زوم و جابه‌جایی تنظیم کنید. اگر خالی باشد، عکس اصلی محصول استفاده می‌شود.</p>
       <div style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap',marginBottom:9}}>
        {(it.homeImage||it.homeImageUrl||it.image||it.imageUrl)&&<img data-home-image-preview src={it.homeImage||it.homeImageUrl||it.image||it.imageUrl} alt={it.name||it.title||''} style={{width:138,aspectRatio:it.homeImageAspectRatio||'4 / 3',objectFit:'cover',objectPosition:it.homeImageObjectPosition||'center',borderRadius:10,border:`1px solid ${T.brd}`}}/>}
        <span style={{fontSize:10.5,color:(it.homeImage||it.homeImageUrl)?T.ok:T.mut,fontWeight:800}}>{(it.homeImage||it.homeImageUrl)?'عکس اختصاصی خانه فعال است':'فعلاً عکس اصلی محصول استفاده می‌شود'}</span>
       </div>
       <label aria-label={`بارگذاری عکس منتخب خانه ${it.name||it.title||''}`} style={{...AdminBtn(),display:'flex',alignItems:'center',justifyContent:'center',gap:7,cursor:'pointer',color:T.acc,marginBottom:8}}>
        <ZkUploadIcon size={15}/> انتخاب عکس دیگر و تنظیم کادر لمسی
        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files?.[0];e.target.value='';if(f)startProductHomeCrop(it,i,f)}}/>
       </label>
       <input aria-label={`لینک عکس منتخب خانه ${it.name||it.title||''}`} style={{...S.inp,marginBottom:8}} defaultValue={it.homeImage||it.homeImageUrl||''} onBlur={e=>patchItem(i,{homeImage:e.target.value.trim(),homeImageUrl:e.target.value.trim()})} placeholder="لینک مستقیم عکس مخصوص صفحه خانه (اختیاری)"/>
       <FrameControls key={`home-frame-${it.homeImageAspectRatio||'4 / 3'}-${it.homeImageObjectPosition||'center'}`} T={T} S={S} value={{aspectRatio:it.homeImageAspectRatio||'4 / 3',objectPosition:it.homeImageObjectPosition||'center'}} onChange={(p:any)=>patchItem(i,p.aspectRatio!==undefined?{homeImageAspectRatio:p.aspectRatio}:{homeImageObjectPosition:p.objectPosition})}/>
       <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        {(it.homeImage||it.homeImageUrl)&&<button type="button" style={{...AdminBtn(),color:T.acc}} onClick={()=>startProductHomeCrop(it,i)}><ZkImageIcon size={14}/> تنظیم مجدد کادر لمسی</button>}
        {(it.homeImage||it.homeImageUrl)&&<button type="button" style={{...AdminBtn(),color:T.err}} onClick={async()=>{try{await deleteStoredImage(it.homeImage||it.homeImageUrl)}catch{}patchItem(i,{homeImage:'',homeImageUrl:'',homeImageAspectRatio:'4 / 3',homeImageObjectPosition:'center'})}}>حذف عکس اختصاصی و استفاده از عکس اصلی</button>}
       </div>
      </div>

      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10}}>
       <button type="button" style={AdminBtn()} disabled={i===0} onClick={()=>{if(i>0){const a=[...items];[a[i-1],a[i]]=[a[i],a[i-1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}><ZkArrowUpIcon size={13}/> بالا</button>
       <button type="button" style={AdminBtn()} disabled={i===items.length-1} onClick={()=>{if(i<items.length-1){const a=[...items];[a[i+1],a[i]]=[a[i],a[i+1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}><ZkArrowDownIcon size={13}/> پایین</button>
       <button type="button" style={{...AdminBtn(),color:T.err}} onClick={async()=>{const urls=Array.from(new Set([it.image||it.imageUrl,it.homeImage||it.homeImageUrl].filter(Boolean)));for(const url of urls){try{await deleteStoredImage(String(url))}catch{}}upd(items.filter((_:any,j:number)=>j!==i))}}><ZkTrashIcon size={13}/> حذف محصول</button>
      </div>
     </div>
    </details>)}
    <button type="button" style={AdminBtn()} onClick={()=>upd([...items,{id:'p'+uid(),name:'محصول جدید',title:'محصول جدید',description:'توضیحات محصول جدید',desc:'توضیحات محصول جدید',features:['ویژگی ۱','ویژگی ۲'],image:'',imageUrl:'',aspectRatio:'',objectPosition:'center',homeImage:'',homeImageUrl:'',homeImageAspectRatio:'4 / 3',homeImageObjectPosition:'center',showOnHome:false,icon:'',category:'',price:'',discountedPrice:0,isVisible:true,active:true,order:items.length+1}])}><ZkPlusIcon size={13}/> افزودن محصول جدید</button>
   </Box>
   {productHomeCrop&&<ImageCropper src={productHomeCrop.src} T={T} title={`تنظیم کادر عکس منتخب خانه — ${productHomeCrop.name}`} aspectRatio={productHomeCrop.aspectRatio} allowAspectChange onAspectRatioChange={(value:string)=>setProductHomeCrop((current:any)=>current?{...current,aspectRatio:value}:current)} fileName={`home-${productHomeCrop.productId||'product'}.webp`} outputLongSide={1600} onCancel={productHomeCropBusy?()=>{}:closeProductHomeCrop} onDone={saveProductHomeCrop}/>}
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره محصولات</button>
  </>
 }

 function HighlightsTabEditor(coverCropFor:number|null, setCoverCropFor:(v:number|null)=>void, bulkTexts:Record<string,{internal:string;external:string}>, setBulkTexts:(u:any)=>void){
  // بازطراحی: اتصال به storyHighlights (ساختاری که سایت واقعاً از آن می‌خواند)
  // قبلاً از `highlights` استفاده می‌کرد که در سایت اثری نداشت — باگ رفع شد.
  const rawSH=editCfg.storyHighlights&&typeof editCfg.storyHighlights==='object'?editCfg.storyHighlights:{};
  const items:any[]=Array.isArray(rawSH.highlights)?rawSH.highlights:(rawSH.highlights&&typeof rawSH.highlights==='object'?Object.values(rawSH.highlights):[]);
  const upd=(list:any[])=>setEditCfg({...editCfg,storyHighlights:{...rawSH,highlights:list}});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const addHl=()=>upd([...items,{id:'hl'+uid(),title:'هایلایت جدید',coverUrl:'',active:true,order:items.length+1,stories:[]}]);
  const removeHl=(i:number)=>upd(items.filter((_:any,j:number)=>j!==i));
  const moveHl=(i:number,dir:-1|1)=>{const a=[...items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))};
  const chgStory=(hi:number,si:number,k:string,v:any)=>{const a=[...items];const stories=[...(a[hi].stories||[])];if(stories[si])stories[si]={...stories[si],[k]:v};a[hi]={...a[hi],stories};upd(a)};
  const addStory=(hi:number)=>{const a=[...items];const stories=[...(a[hi].stories||[])];stories.push({id:'st'+uid(),title:'',imageCodeExternal:'',imageCodeInternal:'',active:true,order:stories.length+1});a[hi]={...a[hi],stories};upd(a)};
  const removeStory=(hi:number,si:number)=>{const a=[...items];a[hi]={...a[hi],stories:(a[hi].stories||[]).filter((_:any,j:number)=>j!==si)};upd(a)};
  const moveStory=(hi:number,si:number,dir:-1|1)=>{const a=[...items];const stories=[...(a[hi].stories||[])];const j=si+dir;if(j<0||j>=stories.length)return;[stories[si],stories[j]]=[stories[j],stories[si]];a[hi]={...a[hi],stories:stories.map((x:any,idx:number)=>({...x,order:idx+1}))};upd(a)};
  const migrateItems=()=>{const legacyItems:any[]=Array.isArray(rawSH.items)?rawSH.items:(rawSH.items&&typeof rawSH.items==='object'?Object.values(rawSH.items):[]);if(!legacyItems.length)return;const legacy={id:'legacy',title:'استوری',coverUrl:'',active:true,order:1,stories:legacyItems.map((it:any,idx:number)=>({id:it.id,title:it.title||'',imageCodeExternal:it.embedCode||'',imageCodeInternal:it.embedCode||'',active:it.active!==false,order:it.order||idx+1}))};upd([...items,legacy]);setEditCfg({...editCfg,storyHighlights:{...rawSH,highlights:[...items,legacy],items:[]}});};
  // ── افزودن دسته‌جمعی: تبدیل لینک‌ها به اسلایدهای تکی ──
  const bulkOf=(id:any)=>{const b=bulkTexts[String(id)]||{internal:'',external:''}; return b;};
  const setBulk=(id:any,patch:any)=>setBulkTexts((prev:any)=>{const key=String(id); const cur=prev[key]||{internal:'',external:''}; return {...prev,[key]:{...cur,...patch}};});
  const appendStories=(hl:any,intLinks:any[],extLinks:any[])=>{const stories=[...(hl.stories||[])].map((s:any)=>({...s}));const start=stories.length;const count=Math.max(intLinks.length,extLinks.length);for(let k=0;k<count;k++){const ext=extLinks[k]||intLinks[k]||'';const int=intLinks[k]||extLinks[k]||'';stories.push({id:'st'+uid(),title:'',imageCodeExternal:ext,imageCodeInternal:int,active:true,order:start+k+1});}return {...hl,stories};};
  // ذخیره: هر کد HTML/لینکِ باقی‌مانده در فیلد bulk را به یک اسلاید تکی تبدیل و سپس ذخیره می‌کند
  const saveHighlights=()=>{const remaining:any={...bulkTexts};const list=items.map((it:any)=>{const b=remaining[String(it.id)];if(!b)return it;const intLinks=extractImageLinkList(b.internal);const extLinks=extractImageLinkList(b.external);if(!intLinks.length&&!extLinks.length)return it;delete remaining[String(it.id)];return appendStories(it,intLinks,extLinks);});setBulkTexts(remaining);setSave({...editCfg,storyHighlights:{...(editCfg.storyHighlights||{}),highlights:list}});};
  return <>
   <Box title={`مدیریت هایلایت‌ها (${items.length})`}>
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>هر هایلایت یک دایره در بالای صفحات «تجربه والدین» و «آموزش‌ها» است. هر هایلایت شامل چند اسلاید (استوری) با دو کد تصویر (خارجی/داخلی) می‌باشد.</p>
    {(rawSH.items&&Array.isArray(rawSH.items)?rawSH.items:[]).length>0&&<div style={{marginBottom:12,padding:10,background:`${T.warn}18`,border:`1px solid ${T.warn}`,borderRadius:10,fontSize:12,color:T.warn}}>{rawSH.items.length} استوری قدیمی موجود است. <button type="button" style={{...AdminBtn(),marginInlineStart:8}} onClick={migrateItems}>انتقال به ساختار جدید</button></div>}
    {items.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span style={{flex:1}}>{it.title||'بدون عنوان'} ({(it.stories||[]).length} استوری){it.active===false?' (غیرفعال)':''}</span>
     </summary>
     <div style={{marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}><input className="zkad-switch" type="checkbox" checked={it.active!==false} onChange={e=>chg(i,'active',e.target.checked)}/> فعال</label>
      </div>
      <Field label="عنوان هایلایت" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>آدرس کاور (اختیاری)</label>
      <StableAdminInput dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={it.coverUrl||''} onCommit={(v:string)=>chg(i,'coverUrl',canonicalizeMediaInput(v,'image'))} placeholder="لینک دانلود مستقیم ImgURL"/>
      {(()=>{const coverSrc=extractDirectMediaUrl(it.coverUrl,'image'); const cpos=it.coverPosition||'50% 50%'; const czoom=Number(it.coverZoom)||1; return <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',marginBottom:8}}>{coverSrc?<><span style={{width:58,height:58,borderRadius:'50%',overflow:'hidden',background:T.inp||T.soft,border:`2px solid ${T.acc}`,flexShrink:0,display:'inline-block'}}><CoverImage src={coverSrc} position={cpos} zoom={czoom}/></span><button type="button" style={AdminBtn()} onClick={()=>setCoverCropFor(i)}>تنظیم کادر کاور</button></>:<span style={{fontSize:11,color:T.mut}}>با وارد کردن لینک کاور، امکان تنظیم کادر فعال می‌شود.</span>}</div>;})()}
      <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'8px 0'}}>
       <button type="button" style={AdminBtn()} disabled={i===0} onClick={()=>moveHl(i,-1)}><ZkArrowUpIcon size={13}/> بالا</button>
       <button type="button" style={AdminBtn()} disabled={i===items.length-1} onClick={()=>moveHl(i,1)}><ZkArrowDownIcon size={13}/> پایین</button>
       <button type="button" style={{...AdminBtn(),color:T.err}} onClick={()=>removeHl(i)}><ZkTrashIcon size={13}/> حذف هایلایت</button>
      </div>
      <div style={{marginTop:10,padding:10,background:T.soft,borderRadius:10}}>
       <b style={{fontSize:12,color:T.ttl,display:'block',marginBottom:8}}>استوری‌ها</b>
       <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 8px'}}>از ImgURL فقط لینک دانلود مستقیم را وارد کنید. تگ <span dir="ltr">&lt;img src="…" /&gt;</span> نیز پذیرفته و به لینک امن تبدیل می‌شود.</p>
       {(it.stories||[]).map((st:any,si:number)=><div key={st.id||si} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:8,marginTop:8,background:T.card}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
         <label style={{fontSize:12,whiteSpace:'nowrap'}}><input type="checkbox" checked={st.active!==false} onChange={e=>chgStory(i,si,'active',e.target.checked)}/> فعال</label>
         <span style={{fontSize:12,color:T.mut}}>اسلاید {si+1}</span>
        </div>
        <Field label="عنوان اسلاید" value={st.title||''} onChange={(v:string)=>chgStory(i,si,'title',v)} ph=""/>
        <label style={S.lbl}>تصویر خارجی (VPN روشن)</label>
        <StableAdminTextarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeExternal||''} onCommit={(v:string)=>chgStory(i,si,'imageCodeExternal',canonicalizeMediaInput(v,'image'))} placeholder="https://cdn.imgurl.ir/uploads/photo.webp" rows={3}/>
        <label style={S.lbl}>تصویر داخلی (VPN خاموش)</label>
        <StableAdminTextarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeInternal||''} onCommit={(v:string)=>chgStory(i,si,'imageCodeInternal',canonicalizeMediaInput(v,'image'))} placeholder="همان لینک دانلود مستقیم را می‌توانید اینجا نیز وارد کنید" rows={3}/>
        {extractDirectMediaUrl(st.imageCodeExternal||st.imageCodeInternal,'image')&&<img data-admin-story-preview src={extractDirectMediaUrl(st.imageCodeExternal||st.imageCodeInternal,'image')} alt="پیش‌نمایش استوری" style={{width:'100%',maxHeight:210,objectFit:'contain',borderRadius:9,border:`1px solid ${T.brd}`,marginBottom:6}}/>}
        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:6}}>
         <button type="button" style={AdminBtn()} disabled={si===0} onClick={()=>moveStory(i,si,-1)}>بالا</button>
         <button type="button" style={AdminBtn()} disabled={si===(it.stories||[]).length-1} onClick={()=>moveStory(i,si,1)}>پایین</button>
         <button type="button" style={{...AdminBtn(),color:T.err}} onClick={()=>removeStory(i,si)}>حذف اسلاید</button>
        </div>
       </div>)}
       <button type="button" style={{...AdminBtn(),marginTop:8}} onClick={()=>addStory(i)}>+ افزودن اسلاید</button>
       <BulkStoryAdder T={T} S={S} AdminBtn={AdminBtn} internalText={bulkOf(it.id).internal} externalText={bulkOf(it.id).external} onInternalChange={(v:string)=>setBulk(it.id,{internal:v})} onExternalChange={(v:string)=>setBulk(it.id,{external:v})} onBuild={(intLinks:any,extLinks:any)=>{const a=[...items];a[i]=appendStories(a[i],intLinks,extLinks);upd(a);setBulk(it.id,{internal:'',external:''});}}/>
      </div>
     </div>
    </details>)}
    <button type="button" style={{...AdminBtn(),marginTop:8}} onClick={addHl}><ZkPlusIcon size={13}/> افزودن هایلایت جدید</button>
   </Box>
   <button style={S.btn} onClick={saveHighlights}>ذخیره هایلایت‌ها</button>
   {coverCropFor!==null&&(()=>{const cit=items[coverCropFor]; const csrc=extractDirectMediaUrl(cit?.coverUrl,'image'); return csrc?<CoverCropModal T={T} src={csrc} position={cit?.coverPosition||'50% 50%'} zoom={Number(cit?.coverZoom)||1} onClose={()=>setCoverCropFor(null)} onApply={(pos:any,zo:any)=>{const a=[...items];a[coverCropFor]={...a[coverCropFor],coverPosition:pos,coverZoom:zo};upd(a);}}/>:null;})()}
  </>}

 function LicensesTabEditor(){
  const rawLic=editCfg.licenses;
  const items:any[]=Array.isArray(rawLic)?rawLic:(rawLic&&typeof rawLic==='object'?Object.values(rawLic):[]);
  // Phase 8: نمایش/عدم‌نمایش کل صفحهٔ مجوزها در سایت (بدون حذف داده‌های ذخیره‌شده)
  const showLicensesPage=(editCfg.showLicensesPage ?? editCfg.menuVisibility?.licenses ?? true)!==false;
  const upd=(newItems:any[])=>setEditCfg({...editCfg,licenses:newItems});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const addLicense=()=>upd([...items,{id:'lc'+uid(),title:'مجوز جدید',description:'',image:'',isVisible:true}]);
  const removeLicense=(i:number)=>upd(items.filter((_:any,j:number)=>j!==i));
  const moveLicense=(i:number,dir:-1|1)=>{const a=[...items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a)};
  return <>
   <Box title="نمایش صفحه مجوزها در سایت">
    <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>با خاموش‌کردن این گزینه، صفحهٔ مجوزها در منوی سایت، صفحهٔ اصلی و لینک مستقیم نمایش داده نمی‌شود و بازدیدکننده به صفحهٔ اصلی هدایت می‌شود. <b>هیچ‌کدام از مجوزهای ذخیره‌شده حذف نمی‌شوند.</b></p>
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',marginBottom:4}}>
     <input className="zkad-display-check" type="checkbox" checked={showLicensesPage} onChange={e=>{
      const val=e.target.checked;
      setEditCfg({...editCfg, showLicensesPage:val, menuVisibility:{...(editCfg.menuVisibility||{}), licenses:val}});
     }}/> نمایش صفحه مجوزها
    </label>
   </Box>
   <Box title="متن صفحه مجوزها">
    <label style={S.lbl}>متن صفحه مجوزها (در صفحه /licenses نمایش داده می‌شود)</label>
    <textarea style={{...S.ta,minHeight:80}} defaultValue={editCfg.licensesText||''} onBlur={e=>setEditCfg({...editCfg,licensesText:e.target.value})} placeholder="متن یا توضیحات مجوزها و گواهینامه‌ها..."/>
   </Box>
   <Box title={`مدیریت مجوزها (${items.length})`}>
    {items.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span>{it.isVisible!==false?<ZkEyeIcon size={14} color={T.ok}/>:<ZkEyeOffIcon size={14} color={T.err}/>}</span>
      <span style={{flex:1}}>{it.title||'بدون عنوان'}</span>
     </summary>
     <div style={{marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}>
        <input className="zkad-switch" type="checkbox" checked={it.isVisible!==false} onChange={e=>chg(i,'isVisible',e.target.checked)}/> نمایش مجوز
       </label>
      </div>
      <Field label="عنوان مجوز" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>توضیحات مجوز</label>
      <textarea style={{...S.ta,marginBottom:8,minHeight:60}} defaultValue={it.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات مجوز..."/>
      <label style={S.lbl}>عکس مجوز (آپلود یا لینک مستقیم)</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
       {it.image&&<img src={it.image} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
       <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,it.image,'licenses');chg(i,'image',url)}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
       <LibraryPicker T={T} S={S} editCfg={editCfg} section="licenses" onSelect={(url:string)=>chg(i,'image',url)} current={it.image} AdminBtn={AdminBtn} />
      </div>
      <input style={{...S.inp,marginBottom:8}} defaultValue={it.image||''} onBlur={e=>chg(i,'image',e.target.value.trim())} placeholder="https://... یا لینک مستقیم عکس"/>
      <FrameControls T={T} S={S} value={{ aspectRatio: it.aspectRatio, objectPosition: it.objectPosition }} onChange={(p:any)=>chg(i, Object.keys(p)[0], Object.values(p)[0])} />
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
       <button style={AdminBtn()} disabled={i===0} onClick={()=>moveLicense(i,-1)}><ZkArrowUpIcon size={13}/> بالا</button>
       <button style={AdminBtn()} disabled={i===items.length-1} onClick={()=>moveLicense(i,1)}><ZkArrowDownIcon size={13}/> پایین</button>
       <button style={{...AdminBtn(),color:T.err}} onClick={()=>removeLicense(i)}><ZkTrashIcon size={13}/> حذف</button>
      </div>
     </div>
    </details>)}
    <button style={AdminBtn()} onClick={addLicense}><ZkPlusIcon size={13}/> افزودن مجوز جدید</button>
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره مجوزها</button>
  </>}

 // مرحله خدمات-۳: تنظیمات بخش خدمات
 function ServicesTabEditor(){
  const serviceDefaults:any=configDefaultSettings as any;
  const defaultListItems:any[]=(serviceDefaults.listSettings?.items||[]).map((x:any,i:number)=>({...x,id:x.id||`l${i+1}`,isVisible:x.isVisible!==false,isDefault:true}));
  const defaultCarouselColumns:any[]=(serviceDefaults.carouselSettings?.columnsData||[]).map((col:any,ci:number)=>({...col,id:col.id||`col-${ci+1}`,items:(col.items||[]).map((x:any,ii:number)=>({...x,id:x.id||`c${ci+1}-${ii+1}`,isVisible:x.isVisible!==false,isDefault:true}))}));
  const normalizeItem=(it:any,def?:any)=>({
   ...(def||{}),
   ...(it||{}),
   id:it?.id||def?.id||('svc'+uid()),
   title:it?.title??def?.title??'',
   description:it?.description??def?.description??'',
   icon:it?.icon??def?.icon??'',
   isVisible:it?.isVisible!==undefined?!!it.isVisible:(def?.isVisible!==false),
   isDefault:!!(def?.isDefault||it?.isDefault),
  });
  const ensureListDefaults=(items:any[]=[])=>{
   const used=new Set<number>();
   const out=defaultListItems.map((def:any)=>{let idx=items.findIndex((it:any)=>it?.id===def.id); if(idx<0)idx=items.findIndex((it:any)=>it?.title===def.title); if(idx>=0)used.add(idx); return normalizeItem(idx>=0?items[idx]:null,def)});
   items.forEach((it:any,i:number)=>{if(!used.has(i)&&!out.some((x:any)=>x.id===it?.id))out.push(normalizeItem({...it,isDefault:false}))});
   return out;
  };
  const ensureCarouselDefaults=(columns:any[]=[])=>{
   const out=defaultCarouselColumns.map((defCol:any,ci:number)=>{
    const existing=columns.find((c:any)=>c?.id===defCol.id)||columns[ci]||{};
    const items=existing.items||[];
    const used=new Set<number>();
    const mergedDefaults=(defCol.items||[]).map((def:any)=>{let idx=items.findIndex((it:any)=>it?.id===def.id); if(idx<0)idx=items.findIndex((it:any)=>it?.title===def.title); if(idx>=0)used.add(idx); return normalizeItem(idx>=0?items[idx]:null,def)});
    items.forEach((it:any,i:number)=>{if(!used.has(i)&&!mergedDefaults.some((x:any)=>x.id===it?.id))mergedDefaults.push(normalizeItem({...it,isDefault:false}))});
    return {...defCol,...existing,items:mergedDefaults};
   });
   columns.slice(defaultCarouselColumns.length).forEach((col:any,ci:number)=>out.push({...col,id:col.id||`col-extra-${ci+1}`,items:(col.items||[]).map((it:any)=>normalizeItem({...it,isDefault:false}))}));
   return out;
  };
  const dm=editCfg.servicesDisplayMode||{home:'carousel',courses:'carousel'};
  const csRaw=editCfg.carouselSettings||serviceDefaults.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]};
  const lsRaw=editCfg.listSettings||serviceDefaults.listSettings||{items:[]};
  const cs={...csRaw,columnsData:ensureCarouselDefaults(csRaw.columnsData||[])};
  const ls={...lsRaw,items:ensureListDefaults(lsRaw.items||[])};
  const sv=editCfg.servicesVisibility||{home:true,courses:true,parentExperience:false,licenses:false,trainings:false,about:false,faq:false,contact:false};
  const updDm=(k:string,v:string)=>setEditCfg({...editCfg,servicesDisplayMode:{...dm,[k]:v}});
  const updCs=(next:any)=>setEditCfg({...editCfg,carouselSettings:next});
  const updLs=(items:any[])=>setEditCfg({...editCfg,listSettings:{...ls,items}});
  const updSv=(k:string,v:boolean)=>setEditCfg({...editCfg,servicesVisibility:{...sv,[k]:v}});
  const resetList=()=>{if(confirm('لیست خدمات به ۹ خدمت پیش‌فرض بازنشانی شود؟'))setEditCfg({...editCfg,listSettings:{items:defaultListItems}})};
  const resetCarousel=()=>{if(confirm('کاروسل خدمات به حالت پیش‌فرض بازنشانی شود؟'))setEditCfg({...editCfg,carouselSettings:{...serviceDefaults.carouselSettings,columnsData:defaultCarouselColumns}})};

  const chgListItem=(i:number,k:string,v:any)=>{const a=[...ls.items];a[i]={...a[i],[k]:v};updLs(a)};
  const addListItem=()=>updLs([...ls.items,{id:'li'+uid(),title:'',description:'',icon:'',isVisible:true,isDefault:false}]);
  const removeListItem=(i:number)=>{if(ls.items[i]?.isDefault)return;updLs(ls.items.filter((_:any,j:number)=>j!==i))};
  const moveListItem=(i:number,dir:-1|1)=>{const a=[...ls.items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];updLs(a)};

  const columnsData:any[]=cs.columnsData||[];
  const updCarouselColumns=(columns:any[])=>updCs({...cs,columnsData:columns});
  const updCsSetting=(k:string,v:any)=>updCs({...cs,[k]:v});
  const updCol=(ci:number,k:string,v:any)=>{const a=[...columnsData];a[ci]={...a[ci],[k]:v};updCarouselColumns(a)};
  const addColumn=()=>updCarouselColumns([...columnsData,{id:'col-'+uid(),items:[]}]);
  const removeColumn=(ci:number)=>updCarouselColumns(columnsData.filter((_:any,j:number)=>j!==ci));
  const chgColItem=(ci:number,ii:number,k:string,v:any)=>{const a=[...columnsData];a[ci]={...a[ci],items:[...a[ci].items]};a[ci].items[ii]={...a[ci].items[ii],[k]:v};updCarouselColumns(a)};
  const addColItem=(ci:number)=>{const a=[...columnsData];a[ci]={...a[ci],items:[...a[ci].items,{id:'si'+uid(),title:'',description:'',icon:'',isVisible:true,isDefault:false}]};updCarouselColumns(a)};
  const removeColItem=(ci:number,ii:number)=>{if(columnsData[ci]?.items?.[ii]?.isDefault)return;const a=[...columnsData];a[ci]={...a[ci],items:a[ci].items.filter((_:any,j:number)=>j!==ii)};updCarouselColumns(a)};
  const moveColItem=(ci:number,ii:number,dir:-1|1)=>{const a=[...columnsData];const items=[...a[ci].items];const j=ii+dir;if(j<0||j>=items.length)return;a[ci]={...a[ci],items};[items[ii],items[j]]=[items[j],items[ii]];a[ci].items=items;updCarouselColumns(a)};

  const ServiceItemEditor=({item,onChange,onRemove,canRemove,moveUp,moveDown,disableUp,disableDown}:{item:any,onChange:(k:string,v:any)=>void,onRemove:()=>void,canRemove:boolean,moveUp:()=>void,moveDown:()=>void,disableUp:boolean,disableDown:boolean})=>(
   <div style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.soft}}>
    <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
     {item.icon&&<span style={{width:32,height:32,borderRadius:10,background:T.card,display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,boxShadow:T.neuOut}}>{item.icon}</span>}
     <b style={{fontSize:12,color:T.txt,flex:1}}>{item.title||'آیتم جدید'}</b>
     {item.isDefault&&<span style={{fontSize:10,color:T.acc,background:T.card,borderRadius:10,padding:'2px 7px'}}>پیش‌فرض</span>}
     <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11,fontWeight:800,cursor:'pointer'}}><input type="checkbox" checked={item.isVisible!==false} onChange={e=>onChange('isVisible',e.target.checked)}/> نمایش</label>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'70px 1fr',gap:8,alignItems:'start'}}>
     <div><label style={S.lbl}>وکتور</label><input style={{...S.inp,textAlign:'center',fontSize:20,padding:8}} defaultValue={item.icon||''} onBlur={e=>onChange('icon',e.target.value)} placeholder="اختیاری"/></div>
     <Field label="عنوان" value={item.title||''} onChange={(v:string)=>onChange('title',v)} ph="عنوان خدمت"/>
    </div>
    <label style={S.lbl}>توضیحات</label>
    <textarea style={{...S.ta,minHeight:48}} defaultValue={item.description||''} onBlur={e=>onChange('description',e.target.value)} placeholder="توضیحات خدمت..."/>
    <div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}>
     <button style={AdminBtn()} disabled={disableUp} onClick={moveUp}><ZkArrowUpIcon size={13}/> بالا</button>
     <button style={AdminBtn()} disabled={disableDown} onClick={moveDown}><ZkArrowDownIcon size={13}/> پایین</button>
     {canRemove?<button style={{...AdminBtn(),color:T.err}} onClick={onRemove}><ZkTrashIcon size={13}/> حذف</button>:<button style={{...AdminBtn(),color:T.mut,cursor:'not-allowed'}} disabled>حذف پیش‌فرض غیرفعال است</button>}
    </div>
   </div>
  );

  return <>
   <Box title="حالت نمایش خدمات">
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>برای هر صفحه مشخص کنید خدمات به‌صورت لیست یا کاروسل نمایش داده شود.</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <div><label style={S.lbl}>صفحه اصلی</label><select style={S.inp} value={dm.home||'carousel'} onChange={e=>updDm('home',e.target.value)}><option value="list">لیست</option><option value="carousel">کاروسل</option></select></div>
     <div><label style={S.lbl}>صفحه دوره‌ها</label><select style={S.inp} value={dm.courses||'carousel'} onChange={e=>updDm('courses',e.target.value)}><option value="list">لیست</option><option value="carousel">کاروسل</option></select></div>
    </div>
   </Box>

   <Box title={<><ZkEyeIcon size={16} color={T.ttl}/> نمایش خدمات در صفحات</>}>
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>تعیین کنید بخش «خدمات ما» در کدام صفحات نمایش داده شود.</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
     {([['home','صفحه اصلی'],['courses','معرفی دوره‌ها'],['parentExperience','تجربه والدین'],['licenses','مجوزها'],['trainings','آموزش‌ها'],['about','درباره ما'],['faq','سوالات متداول'],['contact','ارتباط با ما']] as [string,string][]).map(([k,label])=>(
      <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,background:sv[k]!==false?T.soft:T.inp,border:`1px solid ${sv[k]!==false?T.acc+'44':T.brd}`,cursor:'pointer',fontWeight:700,fontSize:12,transition:'all .2s ease'}}><input type="checkbox" checked={sv[k]!==false} onChange={e=>updSv(k,e.target.checked)}/>{label}</label>
     ))}
    </div>
   </Box>

   <Box title={<><ZkDocIcon size={16} color={T.ttl}/> مدیریت لیست خدمات</>}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}><button style={AdminBtn()} onClick={addListItem}><ZkPlusIcon size={13}/> افزودن آیتم جدید</button><button style={{...AdminBtn(),color:T.warn}} onClick={resetList}><ZkResetIcon size={13}/> بازنشانی لیست به پیش‌فرض</button></div>
    {(ls.items||[]).map((it:any,i:number)=><ServiceItemEditor key={it.id||i} item={it} onChange={(k,v)=>chgListItem(i,k,v)} onRemove={()=>removeListItem(i)} canRemove={!it.isDefault} moveUp={()=>moveListItem(i,-1)} moveDown={()=>moveListItem(i,1)} disableUp={i===0} disableDown={i===(ls.items||[]).length-1}/>) }
   </Box>

   <Box title={<><ZkSettingsIcon size={16} color={T.ttl}/> تنظیمات کاروسل</>}>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <Field label="تعداد ستون‌ها" value={String(cs.columns||2)} onChange={(v:string)=>updCsSetting('columns',Math.max(1,Math.min(3,+v||2)))} ph="2"/>
     <Field label="فاصله حرکت خودکار (ثانیه)" value={String(cs.autoScrollInterval||8)} onChange={(v:string)=>updCsSetting('autoScrollInterval',Math.max(2,+v||8))} ph="8"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
     <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}><input type="checkbox" checked={cs.autoScrollEnabled!==false} onChange={e=>updCsSetting('autoScrollEnabled',e.target.checked)}/> حرکت خودکار فعال</label>
     <Field label="توقف بعد از سوایپ (ثانیه)" value={String(cs.pauseOnSwipe||3)} onChange={(v:string)=>updCsSetting('pauseOnSwipe',Math.max(1,+v||3))} ph="3"/>
    </div>
   </Box>

   <Box title={`مدیریت کاروسل خدمات (${columnsData.length} ستون)`}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}><button style={AdminBtn()} onClick={addColumn}><ZkPlusIcon size={13}/> افزودن ستون جدید</button><button style={{...AdminBtn(),color:T.warn}} onClick={resetCarousel}><ZkResetIcon size={13}/> بازنشانی کاروسل به پیش‌فرض</button></div>
    {columnsData.map((col:any,ci:number)=>(
     <details key={col.id||ci} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
      <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}><span>ستون {ci+1} ({col.items?.length||0} آیتم)</span><span style={{fontSize:10,color:T.mut}}>{ci%2===0?'پایین':'بالا'}</span></summary>
      <div style={{marginTop:10}}>
       <Field label="شناسه ستون" value={col.id||''} onChange={(v:string)=>updCol(ci,'id',v)} ph="col-1"/>
       {(col.items||[]).map((it:any,ii:number)=><ServiceItemEditor key={it.id||ii} item={it} onChange={(k,v)=>chgColItem(ci,ii,k,v)} onRemove={()=>removeColItem(ci,ii)} canRemove={!it.isDefault} moveUp={()=>moveColItem(ci,ii,-1)} moveDown={()=>moveColItem(ci,ii,1)} disableUp={ii===0} disableDown={ii===(col.items||[]).length-1}/>) }
       <button style={AdminBtn()} onClick={()=>addColItem(ci)}>+ افزودن آیتم جدید به ستون {ci+1}</button>
       <div style={{marginTop:8}}><button style={{...AdminBtn(),color:T.err}} onClick={()=>removeColumn(ci)}><ZkTrashIcon size={13}/> حذف ستون {ci+1}</button></div>
      </div>
     </details>
    ))}
   </Box>

   <button style={S.btn} onClick={()=>setSave({...editCfg,listSettings:{...ls,items:ls.items},carouselSettings:{...cs,columnsData}})}>ذخیره تنظیمات خدمات</button>
  </>}

 const goTab=(id:string)=>{setATab(id);setEditCfg(JSON.parse(JSON.stringify(cfg)))};
 const filtersActive=!!(srch||dateF||typeF!=='all'||catF!=='همه'||countryF!=='همه'||courseF!=='همه'||payF!=='همه'||statusF!=='همه');
 const clearFilters=()=>{setSrch('');setDateF('');setTypeF('all');setCatF('همه');setCountryF('همه');setCourseF('همه');setPayF('همه');setStatusF('همه');setPage(1)};
 return Admin();
}
