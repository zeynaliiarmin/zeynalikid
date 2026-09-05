import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import EnrollmentStepper from './components/EnrollmentStepper';
import { useLocation,useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import LanguageSwitcher from './components/LanguageSwitcher';
import Header from './components/Header';
import HamburgerMenu from './components/HamburgerMenu';
import faDict from './locales/fa';
import enDict from './locales/en';
import { defaultCountries,defaultSettings as configDefaultSettings,migrateSettings,CURRENT_SETTINGS_VERSION } from './config/defaultSettings';
import { PATH_TO_VIEW,VIEW_TO_PATH,SYSTEM_REFERRAL_PATHS } from './config/routes';
import { getTrustFontSize, getTrustTitleSize, getTrustDescSize } from './utils/trustFont';
import { flagToEmoji, getCountryFlag } from './utils/phone';
import { getReferralCodeFromUrl, findConsultantByCode, parseReferral, parseReferralRaw, findTabByCode, fillReferralText, type ParsedReferral } from './utils/referral';
import { reportError } from './utils/errorLog';
import { triggerErrorAlert } from './utils/errorAlertBus';

import { generateTrackingCode, generateSecureTrackingCode } from './utils/tracking';
import { getUserSession, setPortalNext } from './utils/userPortal';
import { takePendingRegistration } from './utils/portalPending';
import { PUBLIC_SITE_URL, TRACKING_PREFIX } from './config/project';
import { optimizeForUpload } from './utils/imageOptimizer';
import { isSupabaseConfigured, supabase, fetchSettings, createSubmission, saveSettings as saveSettingsRemote, trackPageView, type Submission } from './lib/supabase';
import { uploadAdminFile, uploadPublicFile } from './lib/storageUpload';
// Stage 7A: هماهنگی تم روشن/تیره پنل مدیریت با سیستم تم Stage 6
import { applyResolvedZkTheme, getZkThemePref, ZK_THEME_EVENT, ZK_THEME_KEY } from './admin/adminTheme';
import { normalizeDesignId, normalizePublicColorMode, resolveColorMode, type PersonalColorMode } from './utils/colorMode';
// PWA admin: shared session utils (clear on logout, validate on /admin/app)
import { clearAdminSession, getAdminSessionToken, validateAdminSession } from './utils/adminSession';
import ErrorAlertHost from './components/ErrorAlert/ErrorAlertHost';
import ZkDialog from './components/ZkDialog';
import CourseTimer from './components/CourseTimer';
import AssistantWidget from './components/AssistantWidget';
import AppRoutes from './app/AppRoutes';
import useRouteScrollRestoration from './hooks/useRouteScrollRestoration';
import type { AppContextValue, DynamicRecord } from './app/AppContext';

import {
  APP_B_URL, SK, p2e, digits, uid, today, now, getLS, getPreloadedSettings, setLS, emptyFd, emptyCourse,
  clearPublicFormDrafts, smoothScrollToEl, uploadPdfFile, deleteStoredFile,
  deleteStoredImage, fileToData, uploadTonguePhoto, deleteStoredTonguePhoto,
  uploadReceiptWithProgress, uploadVoiceNote, placeholder, PROFILE_PHOTO, TH,
  baseCountries, mergeSettings, validPhone, fullPhone, phonePlaceholder, t,
  StableErr, StableField, StableSelectBox, StableCountrySelect, MiniIcon, Modal,
  Footer, ContactPanel, MemphisBg, TrustRotator, pathToView, viewToPath, updateImageCompressionKB,
  PUBLIC_DARK_COLORS,
  type Lang,
} from './app/appSupport';
export { genTrackingCode } from './app/appSupport';

function App(){
 const [cfg,setCfg]=useState(()=>{
  const preloaded=getPreloadedSettings();
  const stored=getLS(SK.settings,null);
  let seed=preloaded??stored;
  if(!preloaded){try{const mode=localStorage.getItem('zk_public_theme_mode');if(mode==='light'||mode==='dark'||mode==='auto')seed={...(seed||{}),publicThemeMode:mode}}catch{}}
  return mergeSettings(seed);
 });
 const location=useLocation(); const navigate=useNavigate();
 useRouteScrollRestoration();
 // اعتبار ورود پنل مدیریت: state داخلی + بررسی sessionStorage.
 // ورود مستقیم به /admin یا /admin/app بدون نشست معتبر ممنوع — کاربر به /admin/login هدایت می‌شود.
 const [adminAuthed,setAdminAuthed]=useState<boolean>(()=>{ try { return (typeof localStorage!=='undefined'&&localStorage.getItem('zk_admin_authed')==='true') && !!getAdminSessionToken(); } catch { return false; } });
 const [adminSettingsLoading,setAdminSettingsLoading]=useState(()=>adminAuthed&&isSupabaseConfigured);
 const [adminTab,setAdminTab]=useState('dashboard');
 // اگر کاربر بدون نشست معتبر وارد /admin/app شد، به /admin/login هدایت شود.
 /* R21: ریدایرکت /admin حذف شد — این مسیرها دیگر در اپ وجود ندارند و مستقیمٍ تایپ‌شده با ۴۰۴ ایستا پاسخ داده می‌شود */
 // Phase 3: هنگام ورود به /admin/app، validate_session را با Edge Function بررسی کن.
 // فقط وجود token در sessionStorage کافی نیست — session ممکن است منقضی یا revoke شده باشد.
 // برای کاهش تأخیر ورود، اگر همین لحظه‌ها تازه لاگین انجام شده باشد (لاگین همین حالا نشست را ساخته)
 // از validate مجدد صرف‌نظر می‌کنیم تا ورود «لحظه‌ای» شود؛ در بارگذاری مستقیم صفحه validate انجام می‌شود.
 useEffect(()=>{ const p=location.pathname; if((p==='/desk'||p==='/desk/app')&&getAdminSessionToken()){
   let justLoggedIn=false; try{ const t=Number(localStorage.getItem('zk_admin_login_at')||0); justLoggedIn = (Date.now()-t)<8000; }catch{}
   if(justLoggedIn)return;
   let alive=true; validateAdminSession().then(r=>{ if(!alive)return; if(!r.valid){ setAdminAuthed(false); navigate('/desk',{replace:true}); } }).catch(()=>{ if(!alive)return; setAdminAuthed(false); navigate('/desk',{replace:true}); }); return ()=>{alive=false}; } },[location.pathname,navigate]);
 const view=pathToView[location.pathname]||pathToView[location.pathname.replace(/\/+$/,'')||'/']||'home';
 const [consultationComplete,setConsultationComplete]=useState(false);useEffect(()=>{const handler=(event:Event)=>{const detail=(event as CustomEvent).detail;if(detail?.flow==='consultation')setConsultationComplete(detail.complete===true)};window.addEventListener('zk-flow-complete',handler);return()=>window.removeEventListener('zk-flow-complete',handler)},[]);
 const setView=useCallback((newView:string)=>{const path=viewToPath[newView]||'/'; if(newView==='admin'){setAdminSettingsLoading(false);setAdminAuthed(true)} navigate(path)},[navigate]);
 // سازگاری با هش‌های قدیمی (#admin, #track, #courses) — هدایت خودکار به مسیرهای جدید
 useEffect(()=>{const h=window.location.hash;if(h==='#admin')navigate('/desk',{replace:true});else if(h==='#track')navigate('/track',{replace:true});else if(h==='#courses')navigate('/courses',{replace:true})},[]);
 const [lang,setLang]=useState<Lang>(()=>getLS('zkid_lang','fa'));
 // ─── سیستم مدیریت دیزاین و تم (مرحله ۲ - بازطراحی تدریجی) ───
 const designSystem = cfg.designSystem || configDefaultSettings.designSystem;

 // دیزاین انتخابی مالک برای صفحات عمومی (با اولویت انتخابِ خود کاربر در localStorage).
 // صفحه /admin* عمداً به کلاسیک قفل می‌شود، اما پوسته «ورود مدیریت» باید همان دیزاین
 // انتخابی سایت را بگیرد — پس این تابع جدا از getDesignForPath نگه داشته شده است.
 const resolvePublicDesign = (): string => {
  const configured = normalizeDesignId(designSystem?.sections?.public?.design, 'wellness');
  try {
   const localDesign = localStorage.getItem('zk_design_system');
   if (localDesign) return normalizeDesignId(localDesign, configured);
  } catch {}
  return configured;
 };
 // Resolve design ids without ever writing compatibility changes back to stored settings.
 const getDesignForPath = (path: string, settings: DynamicRecord): string => {
  if (path.startsWith('/desk')) return 'classic';
  const configured = normalizeDesignId(settings?.sections?.public?.design, 'wellness');
  try {
   const localDesign = localStorage.getItem('zk_design_system');
   if (localDesign) return normalizeDesignId(localDesign, configured);
  } catch {}
  return configured;
 };

 // تعیین دیزاین فعال
 const isAdminLoginView = ['/desk'].includes(location.pathname.replace(/\/+$/,''));
 const activeDesign = isAdminLoginView ? resolvePublicDesign() : getDesignForPath(location.pathname, designSystem);

 // Personal header choice is local to this browser/domain and wins on admin + public routes.
 const [personalColorMode,setPersonalColorMode]=useState<PersonalColorMode|null>(()=>getZkThemePref());
 useEffect(()=>{
  const sync=()=>setPersonalColorMode(getZkThemePref());
  const onStorage=(event:StorageEvent)=>{if(event.key===ZK_THEME_KEY)sync()};
  window.addEventListener('storage',onStorage);
  window.addEventListener(ZK_THEME_EVENT,sync as EventListener);
  return()=>{window.removeEventListener('storage',onStorage);window.removeEventListener(ZK_THEME_EVENT,sync as EventListener)};
 },[]);

 // The saved global mode applies only when this browser has no personal choice.
 const [publicThemeTick,setPublicThemeTick]=useState(0);
 useEffect(()=>{const timer=window.setInterval(()=>setPublicThemeTick(x=>x+1),60000);return()=>window.clearInterval(timer)},[]);
 useEffect(()=>{const sync=(event:StorageEvent)=>{if(event.key!=='zk_public_theme_mode')return;setCfg((current:DynamicRecord)=>({...current,publicThemeMode:normalizePublicColorMode(event.newValue)}))};window.addEventListener('storage',sync);return()=>window.removeEventListener('storage',sync)},[]);
 const isAdminRoute=location.pathname.startsWith('/desk');

 const publicThemeMode=normalizePublicColorMode(cfg.publicThemeMode);
 useEffect(()=>{try{localStorage.setItem('zk_public_theme_mode',publicThemeMode)}catch{}},[publicThemeMode]);
 const effectivePublicMode=resolveColorMode(personalColorMode,publicThemeMode,new Date().getHours());
 const publicDark=effectivePublicMode==='dark';
 const adminDark=personalColorMode==='dark';
 // حالت تاریک عمومی: هر دیزاین پالت تاریکِ اختصاصی خودش را دارد (wellness / kidlearn / blend / classic).
 // هندسه (شعاع، فاصله، سایه‌های ساختاری) از همان دیزاین می‌آید و رنگ‌ها از پالت تیره خودش؛
 // منبع رنگ‌ها: src/theme/warmPalettes.ts (برگرفته از design-A-warm).
 const publicLightTheme = TH[activeDesign];
 const publicDarkTheme = TH[`${activeDesign}-dark`] || {...publicLightTheme,...PUBLIC_DARK_COLORS};
 const T_base = (isAdminRoute && !isAdminLoginView)
  ? (adminDark ? TH['admin-dark'] : TH['admin-light'])
  : (publicDark ? publicDarkTheme : publicLightTheme);
 // accText = رنگ متن‌های رنگی (لینک، برچسب، دکمه نرم). در پالت تاریک یک درجه روشن‌تر از
 // acc انتخاب می‌شود تا روی کارت‌های تیره هم-AA بماند؛ در حالت روشن همان acc است.
 const T = {...T_base, accText: T_base.accText || T_base.acc};

 const [fd,setFd]=useState<DynamicRecord>(()=>emptyFd());
 const [courseTab,setCourseTab]=useState(cfg.courseTabs?.find((x:DynamicRecord)=>x.active)?.id||cfg.courseTabs?.[0]?.id); const [expandedCourse,setExpandedCourse]=useState<DynamicRecord|null>(null); const [shipModal,setShipModal]=useState<DynamicRecord|null>(null); const [course,setCourse]=useState<DynamicRecord>(()=>{ try{ const draft=getLS('zkid_course_draft',null); if(draft&&typeof draft==='object') return {...emptyCourse(),...draft}; }catch{} return emptyCourse(); }); const [courseResult,setCourseResult]=useState<DynamicRecord|null>(null); const [editChild,setEditChild]=useState(false);
 // ─── تایمر ۱۵ دقیقه‌ای روند ثبت دوره (اعتمادسازی — فقط نمایشی/هدایتی) ───
 const COURSE_TIMER_MS=15*60*1000; const timerViews=['child-info','course-shipping','course-payment','course-confirm'];
 const [flowDeadline,setFlowDeadline]=useState<number|null>(()=>{try{const v=sessionStorage.getItem('zkid_flow_deadline');const n=Number(v);if(n&&n>Date.now())return n;}catch{}return null;});
 const flowExpiredRef=useRef(false);
 const expireCourseFlowRef=useRef<()=>void>(()=>{});
 useEffect(()=>{ try{ setLS('zkid_course_draft',course); }catch{} },[course]);
 useEffect(()=>{setLS(SK.settings,cfg); updateImageCompressionKB(cfg.imageCompressionKB);},[cfg]); useEffect(()=>setLS('zkid_lang',lang),[lang]);
 // Stage 9: lang/dir پویا روی <html> برای SEO/RTL-LTR واقعی
 useEffect(()=>{document.documentElement.lang=lang==='fa'?'fa':'en';document.documentElement.dir=lang==='fa'?'rtl':'ltr';},[lang]);
 // One mode bridge: personal choice first, otherwise the saved global public policy.
 useLayoutEffect(()=>{
  const root=document.documentElement;
  const body=document.body;
  const adminInlineVars=['--zk-bg','--zk-surface','--zk-text','--zk-text-muted','--zk-border','--zk-primary'];
  if(isAdminRoute&&!isAdminLoginView){
   const final=adminDark?'dark':'light';
   body.classList.remove('public-root');
   root.removeAttribute('data-public-theme');
   root.removeAttribute('data-public-theme-mode');
   root.setAttribute('data-color-mode-source',personalColorMode?'personal':'default');
   root.setAttribute('data-zk-theme',adminDark?'admin-dark':'admin-light');
   root.style.backgroundColor=adminDark?'#0F1722':'#F8FAFC';
   applyResolvedZkTheme(final);
   return;
  }
  body.classList.add('public-root');
  root.setAttribute('data-theme',effectivePublicMode);
  root.setAttribute('data-public-theme',effectivePublicMode);
  root.setAttribute('data-public-theme-mode',publicThemeMode);
  root.setAttribute('data-color-mode-source',personalColorMode?'personal':'global');
  root.setAttribute('data-zk-theme',isAdminLoginView?(publicDark?'admin-dark':'admin-light'):String(T.id));
  if(isAdminLoginView&&publicDark)root.setAttribute('data-zk-design',String(activeDesign)+'-dark');else root.removeAttribute('data-zk-design');
  root.style.setProperty('color-scheme',effectivePublicMode);
  root.style.backgroundColor=publicDark?(String(T.bg||'#0F1A19')):'#F8FBFA';
  adminInlineVars.forEach(name=>root.style.removeProperty(name));
  const themeColor=document.querySelector<HTMLMetaElement>('meta[name="theme-color"]');
  if(themeColor)themeColor.content=publicDark?(String(T.bg||'#0F1A19')):'#F8FBFA';
 },[isAdminRoute,isAdminLoginView,adminDark,personalColorMode,effectivePublicMode,publicDark,publicThemeMode,publicThemeTick,T.id,activeDesign]);

 useEffect(()=>{if(view==='courses')setExpandedCourse(null)},[view]);
 // اصلاح ۷: همگام‌سازی زبان بین دو پروژه — گوش‌دادن به رویداد storage
 useEffect(()=>{const onStorage=(e:StorageEvent)=>{if(e.key==='zkid_lang'&&e.newValue){try{const v=JSON.parse(e.newValue);if(v==='fa'||v==='en')setLang(v)}catch{if(e.newValue==='fa'||e.newValue==='en')setLang(e.newValue as Lang)}}};window.addEventListener('storage',onStorage);return()=>window.removeEventListener('storage',onStorage)},[]);
 // اصلاح ۳۱: ثبت بازدید صفحه — بسیار سبک و بی‌صدا؛ در صورت خطا هیچ تأثیری روی تجربه کاربری ندارد و صفحه پنل مدیریت (admin/admin-login) ثبت نمی‌شود.
 useEffect(()=>{ if(view==='admin'||view==='admin-login')return; try{trackPageView(location.pathname)}catch{} },[location.pathname]);
 useEffect(()=>{let alive=true; if(isSupabaseConfigured){fetchSettings().then(s=>{if(alive&&s)setCfg((current:DynamicRecord)=>mergeSettings({...current,...s,products:s.products??current.products,showProductsSection:s.showProductsSection??current.showProductsSection,showProductsPage:s.showProductsPage??current.showProductsPage}))}).catch(e=>console.warn('Could not load settings from Supabase',e))} return()=>{alive=false}},[]);
 // اصلاح: تازه‌سازی دوره‌ای تنظیمات عمومی در صفحات عمومی تا تغییرات (سوالات متداول، محتوا و…)
 // بدون نیاز به رفرش/ذخیره دستی هر چند ساعت در سایت نمایان شود.
 useEffect(()=>{if(!isSupabaseConfigured||view==='admin'||view==='admin-login')return;let alive=true;const refresh=()=>{fetchSettings().then(s=>{if(alive&&s)setCfg((current:DynamicRecord)=>mergeSettings({...current,...s,products:s.products??current.products,showProductsSection:s.showProductsSection??current.showProductsSection,showProductsPage:s.showProductsPage??current.showProductsPage}))}).catch(()=>{})};const iv=setInterval(refresh,300000);return()=>{alive=false;clearInterval(iv)}},[view,isSupabaseConfigured]);
 // پس از ورود مدیر، تنظیمات کامل و احرازهویت‌شده دوباره بارگذاری می‌شود. تا پایان این مرحله
 // پنل قابل ویرایش نیست تا پاسخ عمومیِ فیلترشده هرگز محصولات یا تصاویر را با پیش‌فرض بازنویسی نکند.
 useEffect(()=>{if(!adminAuthed||!isSupabaseConfigured)return;let alive=true;fetchSettings().then(s=>{if(alive&&s)setCfg((current:DynamicRecord)=>mergeSettings({...current,...s,products:s.products??current.products}))}).catch(e=>console.warn('Could not load full admin settings',e)).finally(()=>{if(alive)setAdminSettingsLoading(false)});return()=>{alive=false}},[adminAuthed]);
 // مهاجرت localStorage: یک‌بار داده‌های قدیمی را به ساختار جدید تبدیل کن
 useEffect(()=>{const MIGRATION_KEY='zkid_settings_migrated_v2';if(!localStorage.getItem(MIGRATION_KEY)){try{const raw=localStorage.getItem('zkid_settings_v2');if(raw){const parsed=JSON.parse(raw);const migrated=migrateSettings(parsed);if(migrated.version===2){localStorage.setItem('zkid_settings_v2',JSON.stringify(migrated));localStorage.setItem(MIGRATION_KEY,'1')}}}catch{}}},[]);
 // ذخیره خودکار داده‌های مهاجرت‌شده در Supabase
 useEffect(()=>{if(cfg&&cfg.version&&cfg.version<CURRENT_SETTINGS_VERSION&&isSupabaseConfigured){saveSettingsRemote(cfg).catch(e=>console.warn('Could not save migrated settings to Supabase',e))}},[cfg]);
 useEffect(()=>{const tabs=cfg.courseTabs||[]; if(tabs.length&&!tabs.some((x:DynamicRecord)=>x.id===courseTab))setCourseTab(tabs.find((x:DynamicRecord)=>x.active)?.id||tabs[0]?.id)},[cfg.courseTabs]);
 // پس از ورود/ثبت‌نام موفق، همان دوره‌ای که پشت درِ ورود مانده بود دوباره باز می‌شود (سؤال روش ارسال)
 useEffect(()=>{
  if(String((cfg as any)?.entryMode||'user')!=='user')return;
  const resume=()=>{
    try{
      if(!getUserSession())return;
      const pid=takePendingRegistration(); if(!pid)return;
      const all=(cfg.courseTabs||[]).flatMap((t:DynamicRecord)=>Array.isArray(t?.courses)?t.courses:[]).filter((c:DynamicRecord)=>c&&c.active!==false);
      const cr=all.find((c:DynamicRecord)=>String(c?.id)===pid); if(!cr)return;
      if(view!=='courses')setView('courses');
      setShipModal(cr);
    }catch{ /* بی‌خطر */ }
  };
  resume();
  window.addEventListener('zk-portal-session', resume);
  return ()=>window.removeEventListener('zk-portal-session', resume);
 },[view,cfg.courseTabs]);
 useEffect(()=>{try{const q=new URLSearchParams(window.location.search);const pname=q.get('pname')||'';const cc=q.get('cc')||'';const phone=q.get('phone')||'';if(pname||phone){setFd((f)=>({...f,pName:pname||f.pName,cc:cc||f.cc,pPhone:phone||f.pPhone}));setCourse((c)=>({...c,form:{...c.form,receiver:pname||c.form.receiver,phoneCc:cc||c.form.phoneCc,phone:phone||c.form.phone}}))}}catch{}},[]);
 // مشاور ارجاع‌دهنده از URL (?ad=CODE یا /CODE یا لینک گسترش‌یافته /CODE+t+number)
 const [referralConsultant,setReferralConsultant]=useState<DynamicRecord|null>(null);
 const [referralTarget,setReferralTarget]=useState<ParsedReferral|null>(null);
 const referralHandledRef = useRef<string|null>(null);
 // ─── جلوگیری از فلش صفحه اصلی قبل از resolve شدن لینک ارجاع ───
 const [referralReady,setReferralReady]=useState<boolean>(()=>{
   try {
     const path=(window.location.pathname||'').replace(/\/+$/,'').replace(/^\//,'').split('?')[0];
     const q=new URLSearchParams(window.location.search);
     const raw=(q.get('ad')||q.get('ref')||path||'').trim();
     if(!raw||raw.includes('/')||SYSTEM_REFERRAL_PATHS.has(raw.toLowerCase())||/\.(js|css|png|jpe?g|webp|svg|ico|json|html?|pdf|mp[34]|webm|txt|xml|webmanifest)$/i.test(raw)) return true;
     return false;
   } catch { return true; }
 });
 // ─── آپدیت لینک ارجاع: پاپ‌آپ «درخواست مشاوره مجدد» در حالت ارجاع ───
 useEffect(()=>{if(referralReady)return;const timer=window.setTimeout(()=>setReferralReady(true),3000);return()=>window.clearTimeout(timer)},[referralReady,location.pathname,location.search]);
 const [referralConsultOpen,setReferralConsultOpen]=useState(false);
 const [referralConsultReason,setReferralConsultReason]=useState('');
 const [referralConsultShowReason,setReferralConsultShowReason]=useState(false);
 // وقتی در حالت عادی روی «شروع مشاوره رایگان» (پایین صفحه) بزنند، اسکرول بالا + تپش دکمه مشاوره
 const [consultPulse,setConsultPulse]=useState(0);
 const requestConsult=useCallback((reasonPreset?:string)=>{
   if (referralConsultant) {
     setReferralConsultReason(reasonPreset || '');
     setReferralConsultShowReason(false);
     setReferralConsultOpen(true);
   } else {
     try { navigate('/form'); } catch { setView('form'); }
   }
 }, [referralConsultant, navigate, setView]);
 // دکمه «شروع مشاوره رایگان» پایین صفحات: در حالت ارجاع پاپ‌آپ باز می‌شود، در حالت عادی اسکرول بالا + تپش دکمه مشاوره
 const startConsult=useCallback(()=>{
   if (referralConsultant) {
     setReferralConsultReason('');
     setReferralConsultShowReason(false);
     setReferralConsultOpen(true);
     return;
   }
   setView('home');
   setConsultPulse(0);
   // اسکرول نرم به دکمه «ثبت درخواست مشاوره» ابتدای صفحه هوم + تپش موقت آن
   // (اگر از صفحه دیگری آمده باشد، صبر می‌کنیم تا هوم رندر شود و دکمه پیدا شود)
   const tryScroll=(attempt:number)=>{
     try {
       const el=document.getElementById('zk-home-consult-cta');
       if (el) {
         smoothScrollToEl(el);
         window.setTimeout(()=>{ setConsultPulse(0); requestAnimationFrame(()=>requestAnimationFrame(()=>setConsultPulse(Date.now()))); }, 540);
         window.setTimeout(()=>setConsultPulse(0), 3800);
         return;
       }
     } catch {}
     if (attempt<12) window.setTimeout(()=>tryScroll(attempt+1), 120);
   };
   tryScroll(0);
 }, [referralConsultant, setView]);
 const applyReferral = useCallback((code: string, target: ParsedReferral | null, consultants: DynamicRecord[]) => {
   const c = findConsultantByCode(consultants, code);
   if (c) {
     setReferralConsultant(c);
     setReferralTarget(target);
     try {
       sessionStorage.setItem('zk_referral_code', code);
       if (target?.raw) sessionStorage.setItem('zk_referral_raw', target.raw);
     } catch {}
   }
 }, []);
 // ذخیره زودهنگام رشته خام ارجاع از URL (مستقل از لود شدن consultants)
 // تا اگر کاربر قبل از لود کامل settings رفرش کند هم کد ارجاع قابل بازیابی باشد.
 useEffect(()=>{
   try {
     const code = getReferralCodeFromUrl();
     if (code) sessionStorage.setItem('zk_referral_raw', code);
   } catch {}
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, []);
 useEffect(()=>{
   const consultants = cfg.consultants || [];
   const tabs = cfg.courseTabs || [];
   const parsed = parseReferral(consultants, tabs);
   if (parsed) {
     applyReferral(parsed.code, parsed, consultants);
     setReferralReady(true);
   } else {
     const code = getReferralCodeFromUrl();
     if (code) {
       applyReferral(code, { code, raw: code }, consultants);
       if (consultants.length > 0) setReferralReady(true);
     } else {
       // ─── بازیابی لینک ارجاع بعد از رفرش/ناوبری SPA ───
       // وقتی کاربر با لینک ارجاع وارد شده و در هر صفحه‌ای رفرش کند، کد مشاور دیگر در URL نیست؛
       // آن را از sessionStorage می‌خوانیم و دوباره بر اساس مشاورین فعلی (پویا از پنل) حل می‌کنیم،
       // بنابراین با افزودن/ویرایش مشاور جدید در پنل هم هماهنگ می‌ماند و به هم نمی‌ریزد.
       let storedRaw = '';
       try {
         storedRaw = (sessionStorage.getItem('zk_referral_raw') || sessionStorage.getItem('zk_referral_code') || '').trim();
       } catch {}
       if (storedRaw && referralHandledRef.current !== storedRaw) {
         let restored = parseReferralRaw(storedRaw, consultants, tabs);
         let restoredConsultant = restored ? findConsultantByCode(consultants, restored.code) : null;
         // fallback: اگر پسوند تب/دوره قدیمی/ناشناخته بود، حداقل کد پایه مشاور بازیابی شود
         if (!restoredConsultant && consultants.length > 0) {
           const rawLower = storedRaw.toLowerCase();
           restoredConsultant = consultants
             .filter((x:DynamicRecord) => {
               const rc = String(x?.referralCode || '').trim().toLowerCase();
               return rc && rawLower.startsWith(rc);
             })
             .sort((a:DynamicRecord,b:DynamicRecord)=>String(b?.referralCode||'').trim().length - String(a?.referralCode||'').trim().length)[0] || null;
           if (restoredConsultant) {
             restored = { code: String(restoredConsultant.referralCode).trim().toLowerCase(), raw: storedRaw };
           }
         }
         if (restoredConsultant) {
           // جلوگیری از هدایت مجدد به هوم هنگام بازیابی: کاربر در همان صفحه می‌ماند
           referralHandledRef.current = restored!.raw;
           setReferralConsultant(restoredConsultant);
           setReferralTarget(restored);
           if (restored!.tabCode) {
             const tab = findTabByCode(tabs, restored!.tabCode);
             if (tab) setCourseTab((prev:string) => prev === tab.id ? prev : tab.id);
           }
         }
       }
       setReferralReady(true);
     }
   }
 }, [location.pathname, location.search, cfg, applyReferral]);
 useEffect(()=>{
   const rt = referralTarget;
   if (!rt) return;
   if (referralHandledRef.current === rt.raw) return;
   referralHandledRef.current = rt.raw;
   if (!rt.tabCode) {
     if (location.pathname !== '/') {
       try { navigate('/', { replace: true }); } catch {}
     }
     return;
   }
   const tabs = cfg.courseTabs || [];
   const tab = findTabByCode(tabs, rt.tabCode);
   if (!tab) return;
   if (courseTab !== tab.id) setCourseTab(tab.id);
   // ─── آپدیت لینک ارجاع: هر سه حالت (پایه / تب / دوره) به صفحه هوم می‌روند ───
   // هوم بر اساس referralTarget دکمه‌ها، انیمیشن‌ها و متن راهنمای مناسب را نمایش می‌دهد.
   if (location.pathname !== '/') {
     try { navigate('/', { replace: true }); } catch { setView('home'); }
   }
   // eslint-disable-next-line react-hooks/exhaustive-deps
 }, [referralTarget, cfg]);
 // بازطراحی ظاهری: نئومورفیسم (سایه‌های نرم دوطرفه) + مینیمال (فضای باز، بدون شلوغی) + ممفیس (اشکال هندسی پاستلی در پس‌زمینه)
 const __chipShadow = `0 3px 8px rgba(0,0,0,.09), 0 1px 3px rgba(0,0,0,.06), -1px -1px 0 rgba(255,255,255,.6)`;
 const __chipShadowActive = `0 2px 5px rgba(0,0,0,.06), 0 0 0 2.5px color-mix(in srgb, ${T.acc} 35%, transparent), inset 0 1px 2px rgba(255,255,255,.7)`;
 const __inpBorder = `1px solid color-mix(in srgb, ${T.brd} 80%, transparent)`;
 const __inpShadow = `0 3px 8px rgba(0,0,0,.08), 0 1px 2px rgba(0,0,0,.05), inset 0 -1px 0 rgba(255,255,255,.5)`;
 const __inpFocusShadow = `0 4px 12px rgba(0,0,0,.10), 0 0 0 3px ${T.acc}28, 0 1px 2px rgba(0,0,0,.04)`;
 const __cardShadow = `0 8px 24px rgba(0,0,0,.08), 0 2px 6px rgba(0,0,0,.05), -1px -1px 0 rgba(255,255,255,.5)`;
 const S=useMemo(()=>({page:{minHeight:'100dvh',fontFamily:"'Vazirmatn','Tahoma',Arial,sans-serif",direction:lang==='fa'?'rtl':'ltr',padding:'calc(16px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) calc(16px + env(safe-area-inset-bottom, 0px)) max(16px, env(safe-area-inset-left, 0px))',display:'flex',justifyContent:'center',alignItems:'flex-start',color:T.txt,position:'relative' as const,overflowX:'hidden' as const},card:{width:'100%',maxWidth:600,background:T.card,border:`1px solid color-mix(in srgb, ${T.brd} 70%, transparent)`,borderRadius:T.cardRadius||22,padding:T.cardPadding||20,boxShadow:__cardShadow,boxSizing:'border-box' as const,position:'relative' as const,zIndex:1},lbl:{display:'block',fontSize:13,color:T.mut,marginBottom:9,fontWeight:700,letterSpacing:'0'},inp:{width:'100%',padding:T.inputPadding||'14px 16px',background:T.inp,border:__inpBorder,borderRadius:T.inputRadius||16,minHeight:50,color:T.txt,fontSize:16,outline:'none',boxSizing:'border-box' as const,fontFamily:'inherit',boxShadow:__inpShadow,transition:'box-shadow .22s ease, border-color .22s ease, transform .1s ease'},ta:{width:'100%',padding:T.inputPadding||'14px 16px',background:T.inp,border:__inpBorder,borderRadius:T.inputRadius||16,color:T.txt,fontSize:16,outline:'none',boxSizing:'border-box' as const,minHeight:120,resize:'vertical' as const,fontFamily:'inherit',boxShadow:__inpShadow,transition:'box-shadow .22s ease, border-color .22s ease'},btn:{width:'100%',minHeight:52,padding:T.btnPadding||'14px 28px',background:T.grad,border:0,borderRadius:T.btnRadius||16,color:'#fff',fontSize:16,fontWeight:800,cursor:'pointer',boxShadow:`0 8px 18px rgba(0,0,0,.14), 0 3px 6px rgba(0,0,0,.08), 0 10px 24px ${T.acc}30`,fontFamily:'inherit',transition:'all .25s ease'},btnGhost:{width:'100%',minHeight:48,padding:T.btnPadding||'12px 24px',background:T.card,border:`1.5px solid color-mix(in srgb, ${T.brd} 75%, transparent)`,borderRadius:T.btnRadius||16,color:T.accText,fontSize:14.5,fontWeight:700,cursor:'pointer',boxShadow:__chipShadow,fontFamily:'inherit',transition:'all .25s ease'},chip:__chipShadow,chipActive:__chipShadowActive,inpFocus:__inpFocusShadow,sec:{fontSize:14.5,fontWeight:800,color:T.ttl,margin:'20px 0 12px',display:'flex',gap:8,alignItems:'center'},div:{height:1,background:`linear-gradient(to right,transparent,${T.brd},transparent)`,margin:'18px 0'}}),[T,lang]);
 const countries=cfg.countryCodes||baseCountries; const hasCt=Object.values(cfg.contacts||{}).some((v)=>Array.isArray(v)?v.length:v);
 // اصلاح ۱۸: هدایت به پروژه ثانویه (فرم مشاوره)
 const goToSecondaryApp=()=>{
   if (referralConsultant) {
     setReferralConsultReason('');
     setReferralConsultShowReason(false);
     setReferralConsultOpen(true);
     return;
   }
   clearPublicFormDrafts();navigate('/form');
 };
 const goToAppA=goToSecondaryApp; // نگهداری نام قدیمی برای سازگاری داخلی
 const saveCfg=async(next:DynamicRecord)=>{const merged=mergeSettings(next); setCfg(merged); if(isSupabaseConfigured){try{await saveSettingsRemote(merged)}catch(e){console.warn('Could not save settings to Supabase',e);throw e}} return merged;};
 const resetForm=()=>{clearPublicFormDrafts();setFd(emptyFd());setCourse(emptyCourse());setEditChild(false);setShipModal(null);setCourseResult(null);goToSecondaryApp()};
 const publicText=useCallback((k:string,fb?:string)=>t(cfg,lang,k,fb),[cfg,lang]); const trVal=useCallback((x:unknown)=>lang==='en'?(cfg.translations?.en?.[String(x)]||String(x)):String(x),[cfg,lang]);
 const showContactOn=(p:string)=>hasCt&&cfg.contactVisibility?.[p];
 // FIX: هویت پایدار — کامپوننت‌ها در سطح ماژول تعریف شده‌اند تا Remount رخ ندهد
 const CountrySelect = StableCountrySelect;
 const Err = StableErr;
 const Field = StableField;
 const SelectBox = StableSelectBox;
 const activeTab=(cfg.courseTabs||[]).find((x:DynamicRecord)=>x.id===courseTab)||(cfg.courseTabs||[])[0];
 // اصلاح ۲۳: عنوان مرحله ۲ از «مقصد» به «اطلاعات فرزند» تغییر کرد.
 // بازطراحی: استپر با دایره‌های کوچک نئومورفیک + خطوط اتصال (به‌جای نوارهای مستطیلی) — روند و شماره مراحل تغییری نکرده
 // اصلاح ۳: استپر با ۵ مرحله دقیق در grid (repeat(5,1fr)) برای تقسیم مساوی فضا؛ خط اتصال بین دو دایره (نه لبه‌به‌لبه با گوشه چپ) با محاسبه صریح چپ/راست کشیده می‌شود.
 function Stepper({step}:{step:number}){
  // Stage 5: Use the dedicated beautiful mobile-first EnrollmentStepper component
  return <EnrollmentStepper step={step} lang={lang} T={T} />;
}
 // اصلاح ۱-۳ (مرحله ۴): برچسب‌های Tag اکنون از trVal برای ترجمه استفاده می‌کنند
 function Tag({x}:{x:string}){return <span style={{fontSize:10,padding:'3px 7px',borderRadius:T.badgeRadius||12,background:T.soft,color:T.accText,border:`1px solid ${T.brd}`}}>{trVal(x)}</span>}
 // اصلاح ۱-۵ (مرحله ۴): مقدار پیش‌فرض کشور مقصد (برای dest==='iran') اکنون بر اساس زبان انتخاب‌شده نمایش داده می‌شود (فارسی: «ایران»، انگلیسی: «Iran»)
 function chooseDest(dest:string,cr:DynamicRecord){if((cfg as any)?.entryMode==='user'&&!getUserSession()){setPortalNext('/courses');setView('portal');return} const methods=cfg.shippingMethods[dest].filter((m:DynamicRecord)=>m.active).sort((a:DynamicRecord,b:DynamicRecord)=>(a.order||0)-(b.order||0)); const def=methods.find((m:DynamicRecord)=>m.default)||methods[0]; setCourse((c)=>({...c,selected:cr,dest,shippingMethod:def?.id||'',form:{...c.form,country:dest==='iran'?(lang==='en'?'Iran':'ایران'):'',receiver:fd.pName,phoneCc:fd.cc,phone:fd.pPhone}})); setShipModal(null); const hasChild=!!(fd.age&&fd.gender); setView(hasChild?'course-shipping':'child-info'); {const dl=Date.now()+COURSE_TIMER_MS;setFlowDeadline(dl);try{sessionStorage.setItem('zkid_flow_deadline',String(dl));}catch{}} flowExpiredRef.current=false;}
 function deliveryText(){if(!course.dest)return `${trVal(cfg.delivery.iranFastText)} / ${trVal(cfg.delivery.iranOtherText)} / ${trVal(cfg.delivery.intlText)}`; if(course.dest==='intl')return trVal(cfg.delivery.intlText); if(course.shippingMethod === 'mahaks') return lang === 'en' ? '48-hour delivery' : 'تحویل ۴۸ ساعته'; const city=String(course.form.city||'').trim(); if(!city)return publicText('deliveryAddressRequired','برای تخمین زمان تحویل، ابتدا باید قسمت آدرس تکمیل شود.'); return cfg.delivery.iranFastCities.some((x:string)=>city.includes(x))?trVal(cfg.delivery.iranFastText):trVal(cfg.delivery.iranOtherText)}
 function validateOptionalDate(){const s=p2e(course.optionalSendDate).trim(); if(!s)return ''; if(course.dest==='iran'){return /^14\d{2}[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])$/.test(s)?'':trVal('برای مقصد ایران فقط تاریخ شمسی مانند 1403/05/20 وارد کنید')} return /^20\d{2}[\/\-\.](0?[1-9]|1[0-2])[\/\-\.](0?[1-9]|[12]\d|3[01])$/.test(s)?'':trVal('برای خارج از ایران فقط تاریخ میلادی مانند 2026/08/20 وارد کنید')}
 async function finalizeCourseRegistration(paymentOverride?:DynamicRecord){const pay=paymentOverride||course.payment; const fp=fullPhone(course.form.phoneCc,course.form.phone); const data={...fd,pName:course.form.receiver||fd.pName,cc:course.form.phoneCc,pPhone:course.form.phone,fullPhone:fp}; let trackingCode=''; let existingCodes:string[]=[]; let existingList:Submission[]=[]; const portalUser=getUserSession(); try{let list:Submission[]=getLS(SK.subs,[]); existingList=list; existingCodes=list.map((x:Submission)=>String(x.trackingCode||'')).filter(Boolean); const prevSame=list.find((x:Submission)=>digits(x.fullPhone||'')===digits(fp)&&x.trackingCode); if(prevSame)trackingCode=prevSame.trackingCode}catch{} if(!trackingCode)trackingCode=generateSecureTrackingCode(existingCodes,TRACKING_PREFIX); if(portalUser)trackingCode=portalUser.code;
// اصلاح ۳-ج: اولویت زیاد خودکار اگر همین شماره تماس هم فرم مشاوره و هم ثبت‌نام دوره داشته باشد، یا بیش از یک فرم مشاوره/بیش از یک ثبت‌نام دوره ثبت کرده باشد؛ در غیر این صورت اولویت عادی (قابل تغییر دستی توسط ادمین)
const sameNumberAll=existingList.filter((x:Submission)=>digits(x.fullPhone||'')===digits(fp)); const hasConsultPrev=sameNumberAll.some((x:Submission)=>x.type==='consultation'); const consultCountPrev=sameNumberAll.filter((x:Submission)=>x.type==='consultation').length; const courseCountPrev=sameNumberAll.filter((x:Submission)=>x.type==='course').length; const autoPriority=(hasConsultPrev||consultCountPrev>=1||courseCountPrev>=1)?'high':'normal';
const entry={id:uid(),trackingCode,type:'course',date:today(),time:now(),...data,category:'ثبتی',consultationStatus:'ثبتی',orderStatus:'جدید',priority:autoPriority,unread:true,isNew:true,followReminder:true,followUps:[null,null,null,null],adminNotes:'',usageInstructions:'',timeSlot:'',course:course.selected,shipping:{dest:course.dest,method:course.shippingMethod,...course.form,estimatedDelivery:deliveryText(),optionalSendDate:course.optionalSendDate},payment:{...pay,receipt_image:pay.receipt||'',receipt_text:pay.receiptText||'',bank:(cfg.banks||[]).find((b:DynamicRecord)=>b.id===pay.bankId)},childInfo:course.childInfo||null,tonguePhotos:course.tonguePhotos||[],editHistory:course.editedHistory||[],advisor:(()=>{const refC=referralConsultant||(course.advisorId?(cfg.consultants||[]).find((cn:DynamicRecord)=>String(cn.id)===String(course.advisorId)):null);return refC?{id:refC.id,name:refC.name,nameEn:refC.nameEn,referralCode:refC.referralCode}:null;})()}; if(portalUser){(entry as any).userCode=portalUser.code;(entry as any).userPhone=portalUser.phone;(entry as any).userName=portalUser.fullName} if(isSupabaseConfigured){try{const saved=await createSubmission(entry);Object.assign(entry,saved)}catch(e){try{await new Promise(r=>setTimeout(r,1500));const saved=await createSubmission(entry);Object.assign(entry,saved)}catch(e2){console.warn('Could not save submission to Supabase, keeping local draft',e2);reportError('course_register','Could not save submission to Supabase',String(e2 instanceof Error?e2.message:e2));triggerErrorAlert('registration');const subs=getLS(SK.subs,[]);setLS(SK.subs,[...subs,entry]);try{alert(lang==='en'?'Online registration failed. Your data is kept on this device; check the connection and try again shortly.':'ثبت آنلاین انجام نشد؛ اطلاعات در همین دستگاه نگه داشته شد. اتصال اینترنت را بررسی کنید و کمی بعد دوباره تلاش کنید.')}catch{}}}}else{const subs=getLS(SK.subs,[]);setLS(SK.subs,[...subs,entry])} setFlowDeadline(null); try{sessionStorage.removeItem('zkid_flow_deadline');}catch{} setCourseResult(entry); clearPublicFormDrafts(); setFd(emptyFd()); setCourse(emptyCourse()); setEditChild(false); setShipModal(null); setView('course-confirm')}
 // ─── رها کردن ناقص روند ثبت دوره: ساخت فرم «ناقص» در پنل (اطلاعات draft حفظ می‌شود) ───
 const markIncomplete=(reasonEn:string,reasonFa:string)=>{
  if(flowExpiredRef.current)return; flowExpiredRef.current=true;
  try{
   const hasData=!!(fd.pName||fd.pPhone||fd.age||fd.gender||fd.height||fd.weight||course.form.phone||course.form.receiver||course.form.city||course.form.address||course.payment?.receipt||course.payment?.receiptText||(course.tonguePhotos||[]).length||course.childInfo);
   if(hasData){
    const parentPhone=course.form.phone||fd.pPhone||'';
    const parentName=course.form.receiver||fd.pName||'';
    const fp=parentPhone?fullPhone(course.form.phoneCc||fd.cc,parentPhone):'';
    const data={...fd,pName:parentName,cc:course.form.phoneCc||fd.cc,pPhone:parentPhone,fullPhone:fp};
    let trackingCode='';
    const incUser=getUserSession();
    try{const list:Submission[]=getLS(SK.subs,[]);trackingCode=generateSecureTrackingCode(list.map((x:Submission)=>String(x.trackingCode||'')).filter(Boolean),TRACKING_PREFIX);}catch{trackingCode=generateSecureTrackingCode([],TRACKING_PREFIX);}
    if(incUser)trackingCode=incUser.code;
    const entry:Submission={id:uid(),trackingCode,type:'course',date:today(),time:now(),...(incUser?{userCode:incUser.code,userPhone:incUser.phone,userName:incUser.fullName}:{}),...data,category:'ثبتی ناقص',consultationStatus:'ناقص',orderStatus:'ناقص',incomplete:true,priority:'normal',unread:true,isNew:true,followReminder:false,followUps:[null,null,null,null],adminNotes:lang==='en'?reasonEn:reasonFa,usageInstructions:'',timeSlot:'',course:course.selected,shipping:{dest:course.dest,method:course.shippingMethod,...course.form,estimatedDelivery:deliveryText(),optionalSendDate:course.optionalSendDate},payment:{...(course.payment||{}),receipt:'',receipt_image:'',receiptText:'',receiptMethod:null},childInfo:course.childInfo||null,tonguePhotos:[],editHistory:course.editedHistory||[],advisor:null};
    if(isSupabaseConfigured){createSubmission(entry).then((saved:Submission)=>{const subs=getLS(SK.subs,[]).filter((x:Submission)=>String(x.id)!==String(entry.id));setLS(SK.subs,[...subs,saved])}).catch(()=>{});const subs=getLS(SK.subs,[]);if(!subs.some((x:Submission)=>String(x.id)===String(entry.id)))setLS(SK.subs,[...subs,entry]);}else{const subs=getLS(SK.subs,[]);setLS(SK.subs,[...subs,entry]);}
   }
  }catch(e){console.warn('markIncomplete failed',e);}
  // ریست عکس زبان و فیش واریزی در draft تا کاربر هنگام بازگشت مجدداً عکس بگیرد
  try{
   const draft=getLS('zkid_course_draft',null);
   if(draft&&typeof draft==='object')setLS('zkid_course_draft',{...draft,tonguePhotos:[],payment:{...(draft.payment||{}),receipt:'',receipt_image:'',receiptText:'',receiptMethod:null}});
  }catch{}
  setCourse((c)=>({...c,tonguePhotos:[],payment:{...(c.payment||{}),receipt:'',receipt_image:'',receiptText:'',receiptMethod:null}}));
  setFlowDeadline(null);
  try{sessionStorage.removeItem('zkid_flow_deadline');}catch{}
 };
 const expireCourseFlow=()=>{
  if(flowExpiredRef.current)return;
  markIncomplete('User left the course registration incomplete (15-minute timer expired).','کاربر روند ثبت دوره را نیمه‌کاره رها کرد (اتمام تایمر ۱۵ دقیقه‌ای).');
  try{if(course.selected?.id)sessionStorage.setItem('zk_course_detail',String(course.selected.id));}catch{}
  try{sessionStorage.setItem('zk_flow_expired_notice','1');}catch{}
  setView('courses');
  try{navigate('/courses');}catch{}
 };
 expireCourseFlowRef.current=expireCourseFlow;
 useEffect(()=>{if(!flowDeadline)return;const iv=window.setInterval(()=>{if(Date.now()>=flowDeadline)expireCourseFlowRef.current();},1000);return()=>window.clearInterval(iv);},[flowDeadline]);
 // رها کردن زودهنگام: با تأخیر و چک مجدد location تا ناوبری SPA جا بیفتد (باگ پاک شدن لحظه‌ای تایمر)
 useEffect(()=>{
  if(!flowDeadline)return;
  if(timerViews.includes(view))return;
  if(view==='course-done'||view==='payment-verify')return;
  const t=window.setTimeout(()=>{
   try{
    const p=(window.location.pathname||'').replace(/\/+$/,'')||'/';
    const v=pathToView[p]||'home';
    if(!timerViews.includes(v)&&v!=='course-done'&&v!=='payment-verify'){
     markIncomplete('User left the course registration before completing it.','کاربر پیش از تکمیل، روند ثبت دوره را ترک کرد.');
    }
   }catch{}
  },800);
  return()=>window.clearTimeout(t);
 },[view,flowDeadline]);
 // نکته: کلید APP_A_URL برای سازگاری با کدهای موجود صفحات نگه داشته شده، اما مقدار آن اکنون آدرس «پروژه ثانویه (B - فرم مشاوره)» است (VITE_APP_B_URL).
 const app:AppContextValue={cfg,saveCfg,mergeSettings,T,TH,S,css, publicDesign: resolvePublicDesign(), publicColorMode: effectivePublicMode,lang,setLang,view,setView,fd,setFd,course,setCourse,courseResult,editChild,setEditChild,shipModal,setShipModal,courseTab,setCourseTab,expandedCourse,setExpandedCourse,countries,placeholder,PROFILE_PHOTO,APP_A_URL:APP_B_URL,APP_B_URL,publicText,trVal,showContactOn,goToAppA,goHome:()=>setView('home'),resetForm,onLogout:()=>{try{clearAdminSession()}catch{};setAdminAuthed(false);setView('admin-login')},CountrySelect,Field,SelectBox,Err,Stepper,Tag,Modal,ContactPanel,MiniIcon,TrustRotator,MemphisBg,Footer,activeTab,chooseDest,deliveryText,validateOptionalDate,finalizeCourseRegistration,phonePlaceholder,validPhone,fullPhone,fileToData,deleteStoredImage,uploadPdfFile,deleteStoredFile,uploadTonguePhoto,deleteStoredTonguePhoto,uploadReceiptWithProgress,uploadVoiceNote,adminTab,setAdminTab,adminAuthed,p2e,referralConsultant,setReferralConsultant,referralTarget,setReferralTarget,requestConsult,referralConsultOpen,setReferralConsultOpen,referralConsultReason,setReferralConsultReason,referralConsultShowReason,setReferralConsultShowReason,startConsult,consultPulse,findTabByCode:((tabs:DynamicRecord[],code:string)=>findTabByCode(tabs,code))};
 // R21: مسیرهای admin از اپ حذف شدند؛ ورود مستقیم هر آدرسِ حاوی admin با ۴۰۴ ایستا پاسخ داده می‌شود و پنل در /desk/app با گاردِ نشست محافظت می‌شود
 // اصلاح چانک-۱: Suspense برای Lazy Loading
 
const page=<AppRoutes app={app} adminAuthed={adminAuthed} referralReady={referralReady} referralConsultant={referralConsultant}/>;
 // هدر اصلی در فهرست و جزئیات دوره نمایش داده می‌شود؛ فقط مراحل حساس ثبت/پرداخت هدر ندارند.
 const courseFlowViews=['course-shipping','course-payment','payment-verify','course-confirm','course-done'];
 // صفحات ورود ادمین و پیگیری دارای طراحی گلسمورفیسم تمام‌صفحه با نوار شیشه‌ای اختصاصی هستند؛
 // هدر/منو/سوییچر زبان سراسری سایت در این دو صفحه نمایش داده نمی‌شود تا ظاهر به‌هم نریزد.
 const glassFullViews=['admin-login','track','portal'];
 const showLangSwitcher=view!=='admin'&&!glassFullViews.includes(view)&&!courseFlowViews.includes(view);
 // اصلاح ۵: نمایش منوی همبرگری اکنون از تنظیمات پنل مدیریت (cfg.menuVisibility) خوانده می‌شود؛
 // در صورت نبود مقدار برای یک view (تنظیمات قدیمی/نامعتبر)، به رفتار پیش‌فرض قبلی (noMenuViews) بازمی‌گردیم.
 const noMenuViews=['courses','course-shipping','course-payment','course-confirm','track','portal','admin-login','admin'];
 const successView=view==='course-done'||(view==='form'&&consultationComplete);
 const sensitiveFlow=!successView&&['form','child-info','course-shipping','course-payment','payment-verify','course-confirm'].includes(view);
 const showAssistant=successView||['home','courses','experience','licenses','education','about','faq','contact','products','privacy','track','portal','admin-login'].includes(view);
 // صفحات ویژه (پیگیری/پنل کاربر، ورود مدیریت) دقیقاً مثل صفحات عمومی منوی همبرگری را دارند
 const entryChromeViews=['track','portal','admin-login'];
 const showMenu=!sensitiveFlow&&(entryChromeViews.includes(view)||(!glassFullViews.includes(view)&&(successView||view==='courses'||(cfg.menuVisibility?.[view]!==undefined?!!cfg.menuVisibility[view]:!noMenuViews.includes(view)))));
 const headerOnFullViews=['admin-login','track','portal']; // پنل کاربر، پیگیری دوره و ورود مدیریت هم هدر صفحات عمومی را دارند
 const showHeader=view!=='admin'&&(!glassFullViews.includes(view)||headerOnFullViews.includes(view));
 // بازطراحی: پس‌زمینه ممفیس تزئینی روی همه صفحات عمومی (به‌جز پنل مدیریت) رندر می‌شود
 // ─── گارد فلش: اگر URL لینک ارجاع دارد و هنوز referral مشخص نشده، صفحه عمومی را نشان نده ───
 if(!referralReady && view!=='admin' && view!=='admin-login'){
   return <div style={{minHeight:'100dvh',background:'var(--zk-bg, #FDF8F3)'}}/>;
 }
 const canonicalPath=location.pathname==='/'?'/':location.pathname.replace(/\/+$/,'');
 const canonicalOrigin=typeof window!=='undefined'?window.location.origin:PUBLIC_SITE_URL;
 const canonicalUrl=`${canonicalOrigin}${canonicalPath}`;
 const themeVars = `:root{--zk-pri:${T.acc};--zk-pri-text:${T.accText};--zk-card:${T.card};--zk-inp:${T.inp};--zk-br:${T.brd};--zk-mut:${T.mut};--zk-err:${T.err};--zk-bg:${T.bg};}`;
 return <><Helmet><link rel="canonical" href={canonicalUrl}/><meta property="og:url" content={canonicalUrl}/></Helmet><style>{themeVars}</style>{view!=='admin'&&<MemphisBg T={T}/>}{showHeader&&<Header T={T} lang={lang} setLang={setLang} adminAuthed={adminAuthed} onAdminQuestions={()=>{setView('admin');setAdminTab('userQuestions')}} portalMode={(cfg as any)?.entryMode!=='track'} assistantSlot={!!showAssistant}/>}{!showHeader&&showLangSwitcher&&<div style={{position:'fixed',left:8,top:8,zIndex:1000}}><LanguageSwitcher lang={lang} setLang={setLang} T={T}/></div>}{showMenu&&<HamburgerMenu T={T} lang={lang} setLang={setLang} cfg={cfg} publicText={publicText} APP_A_URL={APP_B_URL} setView={setView} referralConsultant={referralConsultant} referralTarget={referralTarget} findTabByCode={findTabByCode} onCoursesClick={()=>{
  if (referralTarget?.tabCode) {
    const tab = findTabByCode(cfg.courseTabs||[], referralTarget.tabCode);
    if (tab) {
      setCourseTab(tab.id);
      setView('courses');
      return;
    }
  }
  setView('courses');
}} onConsultClick={()=>{ requestConsult(); }}/>}{shipModal&&<Modal T={T} onClose={()=>setShipModal(null)} closeLabel={publicText('backBtn','بازگشت')}><div style={{textAlign:'center',padding:'10px 6px'}}><div style={{width:64,height:64,borderRadius:'50%',background:`${T.acc}15`,color:T.accText,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px'}}><MiniIcon type="truck" T={T}/></div><h3 style={{color:T.ttl,fontSize:18,margin:'0 0 8px',fontWeight:800}}>{publicText('chooseDest','لطفاً مقصد ارسال را انتخاب کنید')}</h3><p style={{fontSize:13,color:T.mut,margin:'0 0 20px',lineHeight:1.8}}>{lang==='en'?'Please select whether the order will be shipped inside Iran or internationally. Payment and shipping options will adjust based on your selection.':'ارسال برای داخل ایران انجام می‌شود یا خارج از کشور؟ روش ارسال و درگاه‌های پرداخت بر اساس انتخاب شما تنظیم خواهند شد.'}</p><div style={{display:'flex',flexDirection:'column',gap:12}}><button type="button" onClick={()=>chooseDest('iran',shipModal)} style={{...S.btn,display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:52,fontSize:15}}><span>🇮🇷</span><span>{publicText('sendIran','ارسال برای ایران')}</span></button><button type="button" onClick={()=>chooseDest('intl',shipModal)} style={{...S.btnGhost,display:'flex',alignItems:'center',justifyContent:'center',gap:10,minHeight:52,fontSize:15}}><span>🌐</span><span>{publicText('sendIntl','ارسال برای خارج از ایران')}</span></button></div></div></Modal>}{referralConsultOpen&&referralConsultant&&(()=>{
  const tab = referralTarget?.tabCode ? findTabByCode(cfg.courseTabs||[], referralTarget.tabCode) : null;
  const isDir = tab && typeof referralTarget?.courseIndex === 'number';
  const mainLabel = isDir && tab
    ? (cfg.referral?.texts?.popupPrimaryCourse
      ? fillReferralText(cfg.referral.texts.popupPrimaryCourse, { course: lang==='en' ? (tab.titleEn||tab.title) : tab.title })
      : (lang==='en' ? `View details & enroll in ${tab.titleEn||tab.title}` : `مشاهده جزئیات و ثبت ${tab.title}`))
    : tab
    ? (cfg.referral?.texts?.popupPrimaryTab
      ? fillReferralText(cfg.referral.texts.popupPrimaryTab, { tab: lang==='en' ? (tab.titleEn||tab.title) : tab.title })
      : (lang==='en' ? `View & compare ${tab.titleEn||tab.title} courses` : `مشاهده و مقایسه دوره‌های ${tab.title}`))
    : (cfg.referral?.texts?.popupPrimaryBase || (lang==='en' ? 'View & browse courses' : 'مشاهده و معرفی دوره‌ها'));
  const primary = () => {
    setReferralConsultOpen(false);
    setReferralConsultShowReason(false);
    try { navigate('/courses'); } catch { setView('courses'); }
  };
  const submitReason = () => {
    if (!referralConsultReason.trim()) return;
    try { sessionStorage.setItem('zk_referral_reconsult_reason', referralConsultReason.trim()); } catch {}
    setReferralConsultOpen(false);
    setReferralConsultShowReason(false);
    try { navigate('/form'); } catch { setView('form'); }
  };
  return (
    <Modal T={T} onClose={()=>{setReferralConsultOpen(false);setReferralConsultShowReason(false);}} closeLabel={lang==='en'?'Close':'بستن'} max={480}>
      <div style={{textAlign:'center',padding:'6px 2px'}}>
        <div style={{width:52,height:52,borderRadius:'50%',background:`${T.acc}15`,color:T.accText,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 14px'}}><MiniIcon type="course" T={T}/></div>
        <h3 style={{color:T.ttl,fontSize:16,margin:'0 0 8px',fontWeight:800,lineHeight:1.6}}>
          {(cfg.referral?.texts?.popupTitle
            ? fillReferralText(cfg.referral.texts.popupTitle, { consultant: lang==='en' ? (referralConsultant.nameEn||referralConsultant.name) : referralConsultant.name })
            : (lang==='en'
            ? `You have already been advised by ${referralConsultant.nameEn||referralConsultant.name}. No need for a new consultation request.`
            : `شما قبلاً توسط ${referralConsultant.name} مشاوره شده‌اید؛ نیازی به درخواست مشاوره جدید نیست.`))}
        </h3>
        <div style={{display:'flex',flexDirection:'column',gap:12,marginTop:16}}>
          <button type="button" onClick={primary} style={{minHeight:52,padding:'12px 16px',borderRadius:14,background:'var(--zk-primary)',color:'var(--zk-text-inverse, #fff)',border:0,fontWeight:800,fontSize:14.5,cursor:'pointer',fontFamily:'inherit',animation:'zk-hero-pulse 1.6s ease-in-out infinite',WebkitAnimation:'zk-hero-pulse 1.6s ease-in-out infinite'}}>{mainLabel}</button>
          <button type="button" onClick={()=>setReferralConsultShowReason(true)} style={{minHeight:48,padding:'11px 16px',borderRadius:14,background:T.card,border:`1px solid ${T.brd}`,color:T.txt,fontWeight:700,fontSize:13.5,cursor:'pointer',fontFamily:'inherit'}}>
            {(cfg.referral?.texts?.reconsultLabel || (lang==='en' ? 'I need a consultation again' : 'مجدداً درخواست مشاوره دارم'))}
          </button>
        </div>
        {referralConsultShowReason && (
          <div style={{marginTop:14,animation:'fadeSlide .3s ease both',textAlign:'right'}}>
            <label style={{display:'block',fontSize:13,fontWeight:700,color:T.ttl,marginBottom:8}}>{(cfg.referral?.texts?.reconsultQuestion || (lang==='en'?'Why do you need a consultation again?':'به چه دلیلی مجدداً درخواست مشاوره دارید؟'))}</label>
            <textarea
              dir="auto"
              rows={3}
              value={referralConsultReason}
              onChange={(e)=>setReferralConsultReason(e.target.value)}
              placeholder={lang==='en'?'Please describe your reason...':'لطفاً دلیل خود را بنویسید...'}
              style={{width:'100%',padding:'11px 12px',background:T.inp,border:`1px solid ${T.brd}`,borderRadius:12,color:T.txt,fontSize:14,fontFamily:'inherit',minHeight:80,resize:'vertical',boxSizing:'border-box'}}
            />
            <button type="button" onClick={submitReason} disabled={!referralConsultReason.trim()} style={{width:'100%',minHeight:48,marginTop:8,padding:'11px 16px',borderRadius:14,background:referralConsultReason.trim()?'var(--zk-primary)':`${T.acc}33`,color:referralConsultReason.trim()?'var(--zk-text-inverse, #fff)':T.mut,border:0,fontWeight:800,fontSize:14,cursor:referralConsultReason.trim()?'pointer':'not-allowed',fontFamily:'inherit'}}>
              {lang==='en' ? 'Continue to consultation form' : 'ادامه به فرم مشاوره'}
            </button>
          </div>
        )}
      </div>
    </Modal>
  );
})()}{showAssistant&&<AssistantWidget T={T} lang={lang}/>}<ErrorAlertHost cfg={cfg} lang={lang} /><ZkDialog /><div style={{paddingTop:showHeader?72:0,position:'relative',zIndex:1}}>{(flowDeadline&&timerViews.includes(view))&&<div style={{maxWidth:600,margin:'0 auto',marginTop:showHeader?'calc(env(safe-area-inset-top, 0px) - 6px)':undefined,padding:showHeader?'0 14px 0':'calc(2px + env(safe-area-inset-top, 0px)) 14px 0',position:'relative',zIndex:5}}><CourseTimer deadline={flowDeadline} lang={lang}/></div>}<div style={(flowDeadline&&timerViews.includes(view))?{marginTop:'calc(-14px - env(safe-area-inset-top, 0px))'}:undefined}>{page}</div></div></>;
}
// اصلاح ۲۴: جلوگیری از رنگ آبی پیش‌فرض مرورگر در :visited/:active/:focus
const css=`@keyframes fade{from{opacity:0}to{opacity:1}}@keyframes fadeSlide{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}@keyframes modalIn{from{opacity:0;transform:translateY(20px) scale(.96)}to{opacity:1;transform:translateY(0) scale(1)}}@keyframes floatSoft{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}@keyframes zk-hero-pulse{0%,100%{transform:scale(1);box-shadow:0 0 0 0 rgba(15,118,110,.35);box-shadow:0 0 0 0 color-mix(in srgb,var(--zk-primary) 40%,transparent)}50%{transform:scale(1.05);box-shadow:0 0 0 12px rgba(15,118,110,0);box-shadow:0 0 0 12px transparent}}@-webkit-keyframes fadeSlide{from{opacity:0;-webkit-transform:translateY(12px)}to{opacity:1;-webkit-transform:translateY(0)}}@-webkit-keyframes modalIn{from{opacity:0;-webkit-transform:translateY(20px) scale(.96)}to{opacity:1;-webkit-transform:translateY(0) scale(1)}}@-webkit-keyframes zk-hero-pulse{0%,100%{-webkit-transform:scale(1);box-shadow:0 0 0 0 rgba(15,118,110,.35);box-shadow:0 0 0 0 color-mix(in srgb,var(--zk-primary) 40%,transparent)}50%{-webkit-transform:scale(1.05);box-shadow:0 0 0 12px rgba(15,118,110,0);box-shadow:0 0 0 12px transparent}}@-webkit-keyframes zk-menu-pulse{0%,100%{box-shadow:0 0 0 0 rgba(15,118,110,.4)}50%{box-shadow:0 0 0 8px rgba(15,118,110,0)}}@keyframes zk-ring-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@-webkit-keyframes zk-ring-spin{from{-webkit-transform:rotate(0deg)}to{-webkit-transform:rotate(360deg)}}@keyframes zk-story-in{from{opacity:0;transform:scale(.96) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}@-webkit-keyframes zk-story-in{from{opacity:0;-webkit-transform:scale(.96) translateY(6px)}to{opacity:1;-webkit-transform:scale(1) translateY(0)}}@keyframes zk-story-slide{from{opacity:0;transform:translateX(16px)}to{opacity:1;transform:translateX(0)}}@-webkit-keyframes zk-story-slide{from{opacity:0;-webkit-transform:translateX(16px)}to{opacity:1;-webkit-transform:translateX(0)}}@keyframes zk-story-hl-next{0%{opacity:.4;transform:perspective(900px) translateX(90px) rotateY(-26deg)}100%{opacity:1;transform:perspective(900px) translateX(0) rotateY(0deg)}}@-webkit-keyframes zk-story-hl-next{0%{opacity:.4;-webkit-transform:perspective(900px) translateX(90px) rotateY(-26deg)}100%{opacity:1;-webkit-transform:perspective(900px) translateX(0) rotateY(0deg)}}@keyframes zk-story-hl-prev{0%{opacity:.4;transform:perspective(900px) translateX(-90px) rotateY(26deg)}100%{opacity:1;transform:perspective(900px) translateX(0) rotateY(0deg)}}@-webkit-keyframes zk-story-hl-prev{0%{opacity:.4;-webkit-transform:perspective(900px) translateX(-90px) rotateY(26deg)}100%{opacity:1;-webkit-transform:perspective(900px) translateX(0) rotateY(0deg)}}@keyframes zk-hint-pulse{0%,100%{opacity:.55;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}@-webkit-keyframes zk-hint-pulse{0%,100%{opacity:.55;-webkit-transform:scale(1)}50%{opacity:1;-webkit-transform:scale(1.15)}}@keyframes zk-story-out{from{opacity:1;transform:translateY(0) scale(1)}to{opacity:0;transform:translateY(45vh) scale(.9)}}@-webkit-keyframes zk-story-out{from{opacity:1;-webkit-transform:translateY(0) scale(1)}to{opacity:0;-webkit-transform:translateY(45vh) scale(.9)}}@keyframes zk-fade-in{from{opacity:0}to{opacity:1}}@-webkit-keyframes zk-fade-in{from{opacity:0}to{opacity:1}}@keyframes zk-sheet-up{from{transform:translateY(100%);opacity:.4}to{transform:translateY(0);opacity:1}}@-webkit-keyframes zk-sheet-up{from{-webkit-transform:translateY(100%);opacity:.4}to{-webkit-transform:translateY(0);opacity:1}}.zk-overlay-fade{animation:zk-fade-in .25s ease both}.zk-sheet-up{animation:zk-sheet-up .32s cubic-bezier(.16,1,.3,1) both}.zk-pulse{-webkit-animation:zk-hero-pulse 1.6s ease-in-out infinite;animation:zk-hero-pulse 1.6s ease-in-out infinite}*{box-sizing:border-box}button,button:active,button:focus{color:inherit;-webkit-tap-highlight-color:transparent;outline:none;-webkit-appearance:none}button:hover{filter:brightness(1.035)}button:active{transform:scale(.98)}input,textarea,select{font-size:16px!important}a,a:visited,a:active,a:focus{color:inherit;text-decoration:none}button:focus,a:focus{outline:none}input:focus,textarea:focus,select:focus{border-color:var(--zk-pri)!important;box-shadow:0 4px 12px rgba(0,0,0,.10), 0 0 0 3px color-mix(in srgb, var(--zk-pri) 22%, transparent), 0 1px 2px rgba(0,0,0,.06)!important}input::placeholder,textarea::placeholder{color:color-mix(in srgb, var(--zk-mut) 75%, transparent);opacity:1}::-webkit-input-placeholder{opacity:1}button.zk-chip{transition:all .2s ease;background:var(--zk-card)!important;border:1px solid color-mix(in srgb, var(--zk-br) 75%, transparent)!important;box-shadow:0 3px 8px rgba(0,0,0,.10), 0 1px 3px rgba(0,0,0,.06), 0 -1px 0 rgba(255,255,255,.7)!important;display:inline-flex;align-items:center;justify-content:center;text-align:center}button.zk-chip[aria-pressed="true"],button.zk-chip.is-active{box-shadow:0 3px 8px rgba(0,0,0,.08), 0 1px 3px rgba(0,0,0,.04), 0 0 0 2.5px color-mix(in srgb, var(--zk-pri) 35%, transparent)!important;border-color:color-mix(in srgb, var(--zk-pri) 60%, transparent)!important;background:color-mix(in srgb, var(--zk-pri) 12%, var(--zk-card))!important;color:var(--zk-pri-text)!important;font-weight:800}button.zk-chip:active{transform:scale(.97);box-shadow:0 1px 3px rgba(0,0,0,.08)!important}button::-moz-focus-inner{border:0} @media(max-width:520px){body{margin:0} }`;
export default App;
