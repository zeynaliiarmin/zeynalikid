import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import faDict from '../locales/fa';
import enDict from '../locales/en';
import { defaultCountries,defaultSettings as configDefaultSettings,migrateSettings,CURRENT_SETTINGS_VERSION } from '../config/defaultSettings';
import { PATH_TO_VIEW,VIEW_TO_PATH } from '../config/routes';
import { getTrustFontSize, getTrustTitleSize, getTrustDescSize } from '../utils/trustFont';
import { flagToEmoji, getCountryFlag } from '../utils/phone';
import { generateTrackingCode } from '../utils/tracking';
import { publicDarkPatch } from '../theme/warmPalettes';
import { optimizeForUpload } from '../utils/imageOptimizer';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import { uploadAdminFile, uploadPublicFile } from '../lib/storageUpload';
import { getAdminSessionToken } from '../utils/adminSession';
import { reportError } from '../utils/errorLog';

export type Lang='fa'|'en'; type Any=Record<string,any>;
// اصلاح ۱۸: این پروژه، «پروژه اصلی (A)» است (دوره‌ها + پنل مدیریت). VITE_APP_B_URL به «پروژه ثانویه (B)» یعنی فرم مشاوره اشاره دارد.
export const APP_B_URL='/form'; // Internal route — no external app
export const SK={settings:'zkid_settings_v2', subs:'zkid_submissions_v2'};
export const p2e=(s:any)=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
export const digits=(s:any)=>p2e(s).replace(/[^0-9]/g,'');
export const uid=()=>Date.now()+Math.floor(Math.random()*9999);
export const genTrackingCode=generateTrackingCode;
export const today=()=>new Date().toLocaleDateString('fa-IR'); export const now=()=>new Date().toLocaleTimeString('fa-IR');
export const getLS=(k:string,f:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
export const setLS=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};
export const getPreloadedSettings=():unknown=>{
 const value=(globalThis as typeof globalThis & {__APP_SSG_SETTINGS__?:unknown}).__APP_SSG_SETTINGS__;
 return value&&typeof value==='object'?value:null;
};
export const emptyFd=()=>({topics:[],pName:'',cc:'+98',pPhone:'',gender:'',age:'',height:'',weight:'',digest:[],appetite:'',disease:'',specials:[],notes:''});
export const emptyCourse=()=>({selected:null,dest:'',shippingMethod:'',childInfo:null,tonguePhotos:[] as string[],form:{country:'ایران',city:'',address:'',postalCode:'',receiver:'',phoneCc:'+98',phone:'',whatsappCc:'+98',whatsapp:''},payment:{bankId:'',receipt:'',receiptText:'',receiptMethod:null},optionalSendDate:'',errors:{},editedHistory:[]});
export const clearPublicFormDrafts=()=>{try{const keep=new Set([SK.settings,SK.subs,'zkid_lang']); const patterns=['draft','courseForm','consultForm','shippingForm','paymentForm','publicForm','zkid_course','zkid_form']; [localStorage,sessionStorage].forEach(store=>{for(let i=store.length-1;i>=0;i--){const k=store.key(i)||''; if(!keep.has(k)&&patterns.some(p=>k.toLowerCase().includes(p.toLowerCase()))) store.removeItem(k);}})}catch{}};
// اسکرول نرم (rAF) به یک عنصر — مستقل از پشتیبانی مرورگر از behavior:smooth؛ با احترام به کاهش حرکت
export const smoothScrollToEl=(el:any,duration=520)=>{try{const doc=document.documentElement;const startY=window.pageYOffset||doc.scrollTop||0;const targetY=Math.max(0,el.getBoundingClientRect().top+startY-96);const dist=targetY-startY;if(Math.abs(dist)<2)return;try{if(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches){window.scrollTo(0,targetY);return}}catch{}const t0=performance.now();const ease=(t:number)=>1-Math.pow(1-t,3);const step=(now:number)=>{const p=Math.min(1,(now-t0)/duration);window.scrollTo(0,Math.round(startY+dist*ease(p)));if(p<1)requestAnimationFrame(step)};requestAnimationFrame(step)}catch{try{el.scrollIntoView({behavior:'smooth',block:'center'})}catch{}}};
let imageCompressionKB=500;
export const updateImageCompressionKB=(value:unknown)=>{imageCompressionKB=Math.min(1000,Math.max(100,Number(value)||500));}; // از تنظیمات پنل مدیریت به‌روزرسانی می‌شود (۱۰۰ تا ۱۰۰۰)
const IMAGE_BUCKET='images';
// اصلاح ۶: باکت اختصاصی برای فایل‌های PDF (طریقه مصرف / برنامه غذایی)
const FILES_BUCKET='files';
// اصلاح ۲ (مرحله ۶): رفع مشکل آپلود PDF — پیام خطای واضح‌تر وقتی باکت «files» در Supabase ساخته نشده باشد
// (قبلاً خطای فنی خام Supabase مستقیماً نمایش داده می‌شد و کاربر متوجه نمی‌شد باید باکت را بسازد).
export const uploadPdfFile=async(f:File,folder='pdf-docs')=>{
 if(f.type!=='application/pdf'&&!/\.pdf$/i.test(f.name))throw new Error('فقط فایل PDF مجاز است.');
 if(f.size>10*1024*1024)throw new Error('حجم فایل نباید بیشتر از ۱۰ مگابایت باشد.');
 if(isSupabaseConfigured){
  return uploadAdminFile('files',folder,new File([f],f.name,{type:'application/pdf'}));
 }
 return new Promise<string>((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=reject;r.readAsDataURL(f)});
};
export const deleteStoredFile=async(u?:string)=>{try{if(!u)return; if(getAdminSessionToken()){const{adminDeleteStorageFiles}=await import('../lib/adminApi'); await adminDeleteStorageFiles([u]); return;} if(!isSupabaseConfigured||!supabase)return;const m=new URL(u).pathname.match(/\/storage\/v1\/object\/public\/files\/(.+)$/);const path=m?decodeURIComponent(m[1]):null;if(path)await supabase.storage.from(FILES_BUCKET).remove([path])}catch(e){console.warn('Could not delete old file',e)}};
const allowedImageTypes=['image/jpeg','image/jpg','image/png','image/webp','image/heic','image/heif'];
const isStorageUrl=(u?:string)=>!!u&&/^https?:\/\/.+\/storage\/v1\/object\/public\//.test(u);
const storagePathFromUrl=(u:string)=>{try{const m=new URL(u).pathname.match(/\/storage\/v1\/object\/public\/([^/]+)\/(.+)$/);return m?decodeURIComponent(m[2]):null}catch{return null}};
export const deleteStoredImage=async(u?:string)=>{try{if(!u)return; if(getAdminSessionToken()){const{adminDeleteStorageFiles}=await import('../lib/adminApi'); await adminDeleteStorageFiles([u]); return;} if(!isSupabaseConfigured||!supabase||!isStorageUrl(u))return;const path=storagePathFromUrl(u);if(path)await supabase.storage.from(IMAGE_BUCKET).remove([path])}catch(e){console.warn('Could not delete old image',e)}};
// اصلاح ۳۰ (مرحله ۷): پشتیبانی از فرمت‌های heic/heif — مرورگرهایی که این فرمت‌ها را در canvas پشتیبانی نمی‌کنند
// با خطای createImageBitmap مواجه می‌شوند؛ در این حالت فایل بدون تغییر اندازه (بدون فشرده‌سازی) آپلود می‌شود.
const compressImage=async(file:File,maxBytes?:number):Promise<Blob>=>{maxBytes=maxBytes??imageCompressionKB*1024;return (async()=>{if(!allowedImageTypes.includes(file.type))throw new Error('فرمت تصویر مجاز نیست. فقط jpg، jpeg، png، webp، heic و heif پذیرفته می‌شود.'); if(file.size<=maxBytes!)return file; try{const bmp=await createImageBitmap(file); const canvas=document.createElement('canvas'); const scale=Math.min(1,Math.sqrt(maxBytes!/file.size)); canvas.width=Math.max(1,Math.round(bmp.width*scale)); canvas.height=Math.max(1,Math.round(bmp.height*scale)); const ctx=canvas.getContext('2d'); if(!ctx)return file; ctx.drawImage(bmp,0,0,canvas.width,canvas.height); let q=.82; const type=file.type==='image/png'?'image/webp':file.type; const toBlob=()=>new Promise<Blob>((res,rej)=>canvas.toBlob(b=>b?res(b):rej(new Error('compression failed')),type,q)); let out=await toBlob(); while(out.size>maxBytes!&&q>.3){q-=.1; out=await toBlob()} return out}catch{return file}})()};
const blobToDataUrl=(blob:Blob)=>new Promise<string>((res,rej)=>{const r=new FileReader();r.onload=()=>res(String(r.result));r.onerror=rej;r.readAsDataURL(blob)});
export const fileToData=async(f:File,oldUrl?:string,folder='uploads')=>{
 const optimized=await optimizeForUpload(f);
 const compressed=await compressImage(optimized instanceof File?optimized:f);
 if(isSupabaseConfigured){
  const url=await uploadAdminFile('images',folder,compressed);
  await deleteStoredImage(oldUrl);
  return url;
 }
 const dataUrl=await blobToDataUrl(compressed);
 if(dataUrl.length>1024*1024*1.4)throw new Error('حجم تصویر زیاد است. لطفاً تصویر کوچک‌تری انتخاب کنید.');
 return dataUrl;
};

// اصلاح ۳۰ (مرحله ۷): آپلود عکس زبان + بهبود آپلود فیش با نوار پیشرفت واقعی (XMLHttpRequest)
const TONGUE_BUCKET='tongue-photos';
// Public user files are uploaded with short-lived, server-issued upload tokens.
// The browser never receives service_role and cannot select, replace or delete objects.
const uploadFileWithProgress=async(f:File,bucket:string,_folder:string,onProgress?:(p:number)=>void,maxBytes?:number,bucketLabel?:string)=>{
 const optimized=await optimizeForUpload(f);
 const compressed=await compressImage(optimized instanceof File?optimized:f,maxBytes);
 if(isSupabaseConfigured){
  try{
   const kind=bucket==='tongue-photos'?'tongue':bucket==='receipts'?'receipt':null;
   if(!kind)throw new Error('نوع آپلود عمومی مجاز نیست.');
   return await uploadPublicFile(kind,compressed,onProgress);
  }catch(e:any){
   reportError('upload_file',`${bucketLabel||bucket}: ${String(e?.message||'upload failed')}`);
   throw e;
  }
 }
 if(onProgress){for(const p of [20,45,70,90]){await new Promise(r=>setTimeout(r,60));onProgress(p)}}
 const url=await blobToDataUrl(compressed);onProgress?.(100);return url;
};
export const uploadTonguePhoto=(f:File,onProgress?:(p:number)=>void,maxBytes?:number)=>uploadFileWithProgress(f,TONGUE_BUCKET,'tongue',onProgress,maxBytes,'tongue-photos');
export const deleteStoredTonguePhoto=async(u?:string)=>{try{if(!u)return; if(getAdminSessionToken()){const{adminDeleteStorageFiles}=await import('../lib/adminApi'); await adminDeleteStorageFiles([u]); return;} if(!isSupabaseConfigured||!supabase)return;const m=new URL(u).pathname.match(/\/storage\/v1\/object\/public\/tongue-photos\/(.+)$/);const path=m?decodeURIComponent(m[1]):null;if(path)await supabase.storage.from(TONGUE_BUCKET).remove([path])}catch(e){console.warn('Could not delete tongue photo',e)}};
// اصلاح ۳۰ (مرحله ۷): آپلود فیش واریزی با نوار پیشرفت واقعی
// Phase 6: فیش‌ها به باکت خصوصی «receipts» منتقل شدند (حریم خصوصی — فقط پنل ادمین می‌بیند).
const RECEIPTS_BUCKET='receipts';
export const uploadReceiptWithProgress=async(f:File,oldUrl:string|undefined,onProgress?:(p:number)=>void)=>{const optimized=await optimizeForUpload(f);const fileToUpload=optimized instanceof File?optimized:f;const url=await uploadFileWithProgress(fileToUpload,RECEIPTS_BUCKET,'receipts',onProgress,undefined,'receipts');await deleteStoredImage(oldUrl);return url;};

export const uploadVoiceNote=async(blob:Blob):Promise<string|null>=>{
 if(!isSupabaseConfigured)return null;
 try{return await uploadPublicFile('voice',blob)}catch(e){console.warn('Voice note upload error:',e);reportError('voice_upload','Voice note upload error',String((e as any)?.message||e));return null}
};


export const placeholder=`data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 380"><defs><linearGradient id="g" x1="0" x2="1"><stop stop-color="#eaf1f7"/><stop offset="1" stop-color="#cde2f8"/></linearGradient></defs><rect width="600" height="380" rx="28" fill="url(#g)"/><circle cx="300" cy="150" r="58" fill="#2564a8" opacity=".25"/><path d="M150 285c62-78 95-70 138-28 29 28 54 20 79-7 34-38 65-35 112 35" fill="none" stroke="#2564a8" stroke-width="24" stroke-linecap="round" opacity=".35"/></svg>`)}`;
export const PROFILE_PHOTO='./specialist-photo.webp';

const classicDefaults = {
  btnRadius: 14,
  cardRadius: 18,
  inputRadius: 12,
  badgeRadius: 12,
  avatarRadius: '50%',
  shadowLight: '0 4px 15px rgba(15,38,60,.06)',
  shadowMedium: '0 8px 24px rgba(15,38,60,.11)',
  shadowStrong: '0 18px 42px rgba(15,38,60,.18)',
  shadowFocus: '0 0 0 4px rgba(23,105,194,0.35)',
  btnPadding: '14px 28px',
  btnSmPadding: '10px 18px',
  btnLgPadding: '18px 36px',
  cardPadding: 20,
  inputPadding: '13px 14px',
  topbarHeight: 64,
  fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
};

export const PUBLIC_DARK_COLORS:Any={
 id:'dark',name:'تاریک',
 bg:'#0F1722',card:'#1E293B',brd:'#334155',acc:'#2DD4BF',soft:'rgba(45,212,191,.12)',
 grad:'linear-gradient(135deg,#0F766E,#0369A1)',txt:'#E2E8F0',mut:'#B0BED1',ttl:'#5EEAD4',
 inp:'#0F1722',sel:'#1E293B',pop:'#1E293B',err:'#F87171',ok:'#34D399',warn:'#FBBF24',
 info:'#38BDF8',badge:'rgba(45,212,191,.12)',hdr:'rgba(17,24,39,.97)',hover:'rgba(56,189,248,.10)',
 sidebar:'#111827',cardHover:'#26364A',
 neuOut:'0 4px 16px rgba(0,0,0,.32)',
 neuIn:'inset 2px 2px 6px rgba(0,0,0,.34),inset -2px -2px 6px rgba(71,85,105,.18)',
 shadowLight:'0 4px 15px rgba(0,0,0,.22)',shadowMedium:'0 8px 24px rgba(0,0,0,.30)',
 shadowStrong:'0 18px 42px rgba(0,0,0,.42)',shadowFocus:'0 0 0 4px rgba(45,212,191,.28)',
 shadowGlow:'0 0 12px rgba(45,212,191,.14)',shadowCardHover:'0 4px 16px rgba(56,189,248,.08)',
 memphis:['rgba(45,212,191,.05)','rgba(56,189,248,.05)','rgba(255,255,255,.02)'],
};

const adminPanelDefaults:Any={
 ...classicDefaults,
 btnRadius:6,cardRadius:8,inputRadius:6,badgeRadius:4,avatarRadius:'50%',tagRadius:4,
 btnPadding:'8px 14px',btnSmPadding:'4px 10px',btnLgPadding:'12px 20px',
 cardPadding:16,inputPadding:'8px 12px',topbarHeight:60,sidebarWidth:220,
 fontFamily:"'Vazirmatn','Tahoma',Arial,sans-serif",
};

export const TH:Any={
 light:{id:'light',name:'روشن',bg:'#eaf1f7',card:'#fff',brd:'rgba(35,100,165,.16)',acc:'#2564a8',soft:'rgba(35,100,165,.09)',grad:'linear-gradient(135deg,#1a4f8a,#2578c8)',txt:'#162435',mut:'#4E6472',ttl:'#2564a8',inp:'#f4f8fc',sel:'#eaf1f7',pop:'#fff',err:'#B91C1C',ok:'#047857',warn:'#854D0E',badge:'#f0f5fb',hdr:'rgba(234,241,247,.96)',neuOut:'6px 6px 12px rgba(35,100,165,.14),-6px -6px 12px rgba(255,255,255,.75)',neuIn:'inset 3px 3px 7px rgba(35,100,165,.12),inset -3px -3px 7px rgba(255,255,255,.7)',memphis:['#bfdbfe','#93c5fd','#dbeafe'],...classicDefaults},
 wellness:{
  id: 'wellness', name: 'Wellness',
  bg: '#FFFFFF',
  card: '#FFFFFF',
  brd: '#DFE1E5',
  acc: '#7A12D4',
  soft: '#F8EFFF',
  grad: 'linear-gradient(135deg, #4F0C8A 0%, #BE185D 100%)',
  txt: '#0F131A',
  mut: '#595E67',
  ttl: '#7A12D4',
  inp: '#FFFFFF',
  sel: '#F8EFFF',
  pop: '#FFFFFF',
  err: '#B91C1C',
  ok: '#047857',
  warn: '#9A3412',
  badge: '#F8EFFF',
  hdr: 'rgba(255,255,255,.96)',
  neuOut: '0 4px 15px 0 rgba(0,0,0,0.05)',
  neuIn: 'inset 2px 2px 5px rgba(0,0,0,0.04), inset -2px -2px 5px rgba(255,255,255,0.8)',
  memphis: ['#F8EFFF', '#EBF5FF', '#E8F9F1'],
  btnRadius: 128,
  cardRadius: 16,
  inputRadius: 8,
  badgeRadius: 128,
  avatarRadius: '50%',
  shadowLight: '0 4px 15px 0 rgba(0,0,0,0.05)',
  shadowMedium: '0 5px 20px 0 rgba(0,0,0,0.10)',
  shadowStrong: '0 15px 30px 0 rgba(0,0,0,0.20)',
  shadowFocus: '0 0 0 4px rgba(155,55,242,0.35)',
  btnPadding: '14px 28px',
  btnSmPadding: '10px 18px',
  btnLgPadding: '18px 36px',
  cardPadding: 24,
  inputPadding: '14px 16px',
  topbarHeight: 64,
  fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
 },
 kidlearn:{
  id: 'kidlearn', name: 'KidLearn',
  bg: '#FFFFFF',
  card: '#F9FAFB',
  brd: '#E5E7EB',
  acc: '#B91C1C',
  soft: '#FEF3C7',
  grad: 'linear-gradient(135deg, #B91C1C 0%, #1D4ED8 100%)',
  txt: '#1F2937',
  mut: '#5F6774',
  ttl: '#B91C1C',
  inp: '#FFFFFF',
  sel: '#FEF3C7',
  pop: '#FFFFFF',
  err: '#B91C1C',
  ok: '#047857',
  warn: '#92400E',
  badge: '#FEF3C7',
  hdr: 'rgba(255,255,255,.96)',
  neuOut: '6px 6px 0px #D1D5DB',
  neuIn: 'inset 2px 2px 6px rgba(0,0,0,0.05), inset -2px -2px 6px rgba(255,255,255,0.7)',
  memphis: ['#FEF3C7', '#DBEAFE', '#DCFCE7'],
  btnRadius: 20,
  cardRadius: 20,
  inputRadius: 20,
  badgeRadius: 9999,
  avatarRadius: '50%',
  shadowLight: '2px 2px 4px rgba(0,0,0,0.08)',
  shadowMedium: '4px 4px 12px rgba(0,0,0,0.12)',
  shadowStrong: '8px 8px 24px rgba(0,0,0,0.16)',
  shadowPlayful: '6px 6px 0px #D1D5DB',
  shadowFocus: '0 0 0 4px rgba(59,130,246,0.35)',
  btnPadding: '14px 28px',
  btnSmPadding: '10px 18px',
  btnLgPadding: '18px 36px',
  cardPadding: 24,
  inputPadding: '16px 16px',
  topbarHeight: 56,
  fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
 },
 classic:{
  id: 'classic', name: 'کلاسیک',
  bg: '#eaf1f7',
  card: '#fff',
  brd: 'rgba(35,100,165,.16)',
  acc: '#2564a8',
  soft: 'rgba(35,100,165,.09)',
  grad: 'linear-gradient(135deg,#1a4f8a,#2578c8)',
  txt: '#162435',
  mut: '#4E6472',
  ttl: '#2564a8',
  inp: '#f4f8fc',
  sel: '#eaf1f7',
  pop: '#fff',
  err: '#B91C1C',
  ok: '#047857',
  warn: '#854D0E',
  badge: '#f0f5fb',
  hdr: 'rgba(234,241,247,.96)',
  neuOut: '6px 6px 12px rgba(35,100,165,.14),-6px -6px 12px rgba(255,255,255,.75)',
  neuIn: 'inset 3px 3px 7px rgba(35,100,165,.12),inset -3px -3px 7px rgba(255,255,255,.7)',
  memphis: ['#bfdbfe','#93c5fd','#dbeafe'],
  ...classicDefaults,
 },

};

// Add blend after TH is fully defined
TH.blend = {
  ...TH.light,
  id: 'blend', name: 'ترکیبی',
  bg: '#f7fafb',
  card: '#fff',
  brd: '#d9e2ea',
  acc: '#1769c2',
  soft: '#edf6f5',
  grad: 'linear-gradient(135deg,#1769c2,#356b62)',
  txt: '#17202b',
  mut: '#405466',
  ttl: '#1769c2',
  inp: '#fff',
  sel: '#edf6f5',
  pop: '#fff',
  err: '#b83a3a',
  ok: '#047857',
  warn: '#854D0E',
  badge: '#edf6f5',
  hdr: 'rgba(247,250,251,.96)',
  neuOut: '0 4px 15px rgba(15,38,60,.06)',
  neuIn: 'inset 2px 2px 5px rgba(15,38,60,.05), inset -2px -2px 5px rgba(255,255,255,.8)',
  memphis: ['#e7f2fc','#fff0e8','#eaf5f3'],
  ...classicDefaults,
};

Object.assign(TH, {
 'admin-light':{
  ...adminPanelDefaults,
  id:'admin-light',name:'Admin Light',
  bg:'#F8FAFC',card:'#FFFFFF',brd:'#E2E8F0',acc:'#0B5F59',soft:'rgba(15,118,110,.09)',
  grad:'linear-gradient(135deg,#0F766E,#0369A1)',txt:'#0F172A',mut:'#475569',ttl:'#0B5F59',
  inp:'#FFFFFF',sel:'#F0FDFA',pop:'#FFFFFF',err:'#B91C1C',ok:'#047857',warn:'#92400E',
  badge:'#F0FDFA',hdr:'rgba(255,255,255,.96)',sidebar:'#FFFFFF',cardHover:'#F1F5F9',
  neuOut:'0 1px 3px rgba(15,23,42,.08)',neuIn:'inset 0 1px 2px rgba(15,23,42,.06)',
  memphis:['rgba(15,118,110,.04)','rgba(14,165,233,.04)','rgba(15,23,42,.02)'],
 },
 'admin-dark':{
  ...adminPanelDefaults,...PUBLIC_DARK_COLORS,
  id:'admin-dark',name:'Admin Dark',
 },
 'classic-dark':{
  ...TH.classic,...publicDarkPatch('classic'),
  id:'classic-dark',name:'کلاسیک — تیره',
 },
 'wellness-dark':{
  ...TH.wellness,...publicDarkPatch('wellness'),
  id:'wellness-dark',name:'Wellness — تیره',
 },
 'blend-dark':{
  ...TH.blend,...publicDarkPatch('blend'),
  id:'blend-dark',name:'ترکیبی — تیره',
 },
 'kidlearn-dark':{
  ...TH.kidlearn,...publicDarkPatch('kidlearn'),
  id:'kidlearn-dark',name:'KidLearn — تیره',
 },
 'motherly-trust':{
  ...TH.light,
  id: 'motherly-trust', name: 'مادرانه-اعتمادساز',
  bg: '#f8fbfa',
  card: '#fff',
  brd: '#d9e2ea',
  acc: '#1769c2',
  soft: '#eaf5f3',
  grad: 'linear-gradient(135deg,#1769c2,#356b62)',
  txt: '#17202b',
  mut: '#405466',
  ttl: '#12559e',
  inp: '#fbfdfd',
  sel: '#eaf5f3',
  pop: '#fff',
  err: '#b83a3a',
  ok: '#047857',
  warn: '#854D0E',
  badge: '#eaf5f3',
  hdr: 'rgba(248,251,250,.96)',
  neuOut: '0 4px 15px rgba(15,38,60,.06)',
  neuIn: 'inset 2px 2px 5px rgba(15,38,60,.05), inset -2px -2px 5px rgba(255,255,255,.8)',
  memphis: ['#e7f2fc','#eaf5f3','#fff0e8'],
  ...classicDefaults,
 },
});

export const baseCountries=defaultCountries;
const defTabs=[
 {id:'height',shortCode:'t',base:true,active:true,title:'رشد قد',image:'/images/asset13c-topic-growth.webp',titleEn:'Height growth',inactiveMessage:'دوره‌های این تب به اتمام رسیده است.',detailedInfo:{summary:'دوره‌های تخصصی افزایش رشد قد و قد کودکان با روش TC؛ برنامه اختصاصی مکمل و تغذیه برای رشد قد دختر و پسر و باز نگه‌داشتن صفحات رشد.',fullText:'در روش TC ابتدا با بررسی عکس زبان و شرایط فرزند شما، ریشه کندرشدی شناسایی می‌شود؛ سپس برنامه اختصاصی مکمل و تغذیه متناسب با طبع کودک تنظیم می‌گردد. پشتیبانی مرحله‌ای، پیگیری هفتگی وضعیت رشد و اصلاح برنامه در طول دوره بخشی از مسیر است. مناسب سنین ۲ تا ۱۷ سال.'},courses:[
  {id:'h1',title:'تک دوره رشد قد',titleEn:'Height Growth - Single',desc:'برنامه اختصاصی مکمل و تغذیه برای رشد قد.',descEn:'Personalized supplement and nutrition plan for height growth.',features:['مناسب سنین ۲ تا ۱۷ سال','بررسی شرایط رشد','پشتیبانی مرحله‌ای'],price:'',image:'',popular:false,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:1,base:true},
  {id:'h2',title:'دو دوره رشد قد',titleEn:'Height Growth - Double',desc:'پکیج کامل‌تر برای پیگیری دو مرحله‌ای.',descEn:'A more complete two-stage plan.',features:['دو مرحله برنامه','پیگیری دقیق‌تر','مناسب سنین ۲ تا ۱۷ سال'],price:'',image:'',popular:true,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:2,base:true},
  {id:'h3',title:'سه دوره رشد قد',titleEn:'Height Growth - Triple',desc:'کامل‌ترین مسیر رشد قد با پیگیری بیشتر.',descEn:'The most complete height-growth path.',features:['سه مرحله برنامه','پیگیری کامل','مناسب سنین ۲ تا ۱۷ سال'],price:'',image:'',popular:false,bestseller:true,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:3,base:true}
 ]},
 {id:'appetite',shortCode:'b',base:true,active:true,title:'بی‌اشتهایی / بدغذایی',image:'/images/asset13c-topic-appetite.webp',titleEn:'Poor appetite',inactiveMessage:'دوره‌های این تب به اتمام رسیده است.',detailedInfo:{summary:'دوره‌های همراهی بی‌اشتهایی و بدغذایی بچه‌ها؛ با اصلاح طبع و مزاج، سیگنال گرسنگی فرزند شما را از ریشه فعال می‌کنند.',fullText:'به‌جای شربت‌های اشتهاآور موقت، در این دوره‌ها ریشه بی‌اشتهایی از طریق علم زبان‌شناسی و اصلاح مزاج شناسایی و همراهی می‌شود. برنامه تغذیه، تحلیل عادات غذایی و پشتیبانی کامل در طول دوره ارائه می‌گردد. مناسب سنین ۲ تا ۱۷ سال.'},courses:[
  {id:'a1',title:'دوره متوسط',titleEn:'Medium plan',desc:'کمک به بهبود اشتها و الگوی تغذیه.',descEn:'Helps improve appetite and eating routine.',features:['برنامه تغذیه','پشتیبانی','مناسب سنین ۲ تا ۱۷ سال'],price:'',image:'',popular:false,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:1,base:true},
  {id:'a2',title:'دوره قوی',titleEn:'Strong plan',desc:'برنامه قوی‌تر برای بدغذایی و بی‌اشتهایی.',descEn:'A stronger plan for selective eating.',features:['تحلیل عادات غذایی','برنامه دقیق','پیگیری'],price:'',image:'',popular:true,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:2,base:true},
  {id:'a3',title:'دوره رویال',titleEn:'Royal plan',desc:'پکیج کامل با پشتیبانی ویژه.',descEn:'Complete package with premium support.',features:['پشتیبانی ویژه','برنامه کامل','اولویت بالا'],price:'',image:'',popular:false,bestseller:true,trending:true,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:3,base:true}
 ]},
 {id:'mind',shortCode:'m',base:true,active:true,title:'هوش و ذهن / تمرکز',image:'/images/asset13c-topic-focus.webp',titleEn:'Mind and focus',inactiveMessage:'دوره‌های این تب به اتمام رسیده است.',detailedInfo:{summary:'دوره‌های تقویت هوش و تمرکز کودکان و نوجوانان؛ با تغذیه هدفمند مغز، حافظه و یادگیری فرزند شما را تقویت می‌کنند.',fullText:'تمرکز پایین اغلب ریشه در کمبود ریزمغذی‌ها دارد. در این دوره‌ها با برنامه تغذیه مهندسی‌شده (امگا ۳، زینک، ویتامین‌های گروه B و...) مسیرهای عصبی تقویت می‌شوند و خواب و تمرکز بهبود می‌یابد. مناسب سنین ۲ تا ۱۷ سال.'},courses:[
  {id:'m1',title:'دوره پایه',titleEn:'Basic plan',desc:'شروع مسیر تمرکز و تقویت ذهن.',descEn:'Start the focus and mind-support path.',features:['برنامه پایه','راهنمای مصرف','مناسب سنین ۲ تا ۱۷ سال'],price:'',image:'',popular:false,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:1,base:true},
  {id:'m2',title:'دوره پیشرفته',titleEn:'Advanced plan',desc:'برنامه پیشرفته برای تمرکز بهتر.',descEn:'Advanced plan for better focus.',features:['فرمول قوی‌تر','پیگیری','برنامه مرحله‌ای'],price:'',image:'',popular:true,bestseller:false,trending:false,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:2,base:true},
  {id:'m3',title:'دوره تخصصی',titleEn:'Specialized plan',desc:'دوره تخصصی با پشتیبانی کامل.',descEn:'Specialized plan with full support.',features:['تخصصی','پشتیبانی کامل','اولویت بالا'],price:'',image:'',popular:false,bestseller:true,trending:true,ageBadge:true,btnText:'ثبت مستقیم این دوره',active:true,inactiveMessage:'اتمام موجودی',order:3,base:true}
 ]}
];
const defaultSettings:Any={
 publicThemeMode:'auto',siteTitle:'زینالیکید',browserTitle:'زینالیکید',specialistName:'کارشناس رشد و تغذیه کودک و نوجوان زینالیکید',showSpecialistPhoto:true,photoUrl:PROFILE_PHOTO,showProductsPage:true,showLicensesPage:true,adminLoginText:'ورود به پنل مدیریت',adminPhone:'',emergencyToken:'',
 // اصلاح ۱-۶ (مرحله ۴): عناوین کنار عکس پروفایل — دو زبانه، قابل ویرایش از پنل مدیریت
 specialistTitle:'کارشناس رشد و تغذیه کودک و نوجوان زینالیکید',specialistTitleEn:'Child and Adolescent Growth and Nutrition Specialist at Zeynalikid',heroSubtitle:'ضمن آرزوی اوقاتی خوش برای شما',heroSubtitleEn:'Wishing you a pleasant time',
 heroTitle:'ضمن آرزوی اوقاتی خوش برای شما',heroDesc:'این فرم برای بررسی شرایط فرزند شما و تعیین نوبت مشاوره خصوصی طراحی شده است.',noticeText:'این مشاوره فقط به والدین یا سرپرست قانونی فرزند ارائه می‌شود. لطفاً اطلاعات را با دقت تکمیل فرمایید.',phoneNote:'مشاوره فقط به‌صورت تلفنی',submitBtnText:'ثبت درخواست مشاوره',successMsg:'اطلاعات فرزند شما با موفقیت ثبت شد',successSubMsg:'طی ۲۴ الی ۴۸ ساعت آینده با شما تماس می‌گیریم',timeSlotLabel:'بازه زمانی مناسب برای تماس (اختیاری)',
 directCourseBtn:'معرفی و ثبت مستقیم دوره',newFormBtn:'ثبت فرم جدید',contactBtn:'ارتباط با ما',backToConsultation:'بازگشت به فرم مشاوره',currencyUnit:'تومان',
 // اصلاح ۲: چیدمان (ترتیب + نمایش/پنهان) میانبرهای صفحه هوم و آیتم‌های منوی همبرگری — قابل تنظیم از پنل مدیریت
 homeLayout:[{id:'consult',show:true},{id:'courses',show:true},{id:'experience',show:true},{id:'licenses',show:true},{id:'contact',show:true}],
 menuLayout:[{id:'consult',show:true},{id:'courses',show:true},{id:'experience',show:true},{id:'licenses',show:true},{id:'education',show:true},{id:'faq',show:true},{id:'products',show:true},{id:'about',show:true},{id:'contact',show:true},{id:'track',show:true}],
 // اصلاح ۵: کنترل نمایش منوی همبرگری در هر صفحه (view) — به‌طور پیش‌فرض همان صفحاتی که قبلاً منو داشتند فعال هستند + admin-login
 menuVisibility:{home:true,form:true,experience:true,licenses:true,education:true,about:true,contact:true,faq:true,products:true,'admin-login':true,courses:false,'course-shipping':false,'course-payment':false,'course-confirm':false,'course-done':false,track:false,admin:false},
 // اصلاح ۴۰-۴۳: مدل پیش‌فرض نمایش خدمات فقط list و carousel (grid حذف شد) - پیش‌فرض list
 servicesDisplayMode:(configDefaultSettings as any).servicesDisplayMode||{home:'carousel',courses:'carousel'},
 // اصلاح ۵۲: نمایش/پنهان‌سازی خدمات در هر صفحه
 servicesVisibility:{home:true,courses:true,parentExperience:false,licenses:false,trainings:false,about:false,faq:false,contact:false},
 // اصلاح ۲۹ (مرحله ۷): هایلایت استوری (مانند اینستاگرام) برای صفحات آموزش‌ها و تجربه والدین
 storyHighlights:{highlights:[] as Array<{id:string;title:string;coverUrl?:string;order?:number;active?:boolean;stories:Array<{id:string;title?:string;imageCodeExternal?:string;imageCodeInternal?:string;order?:number;active?:boolean}>}>,items:[] as Array<{id:string;title:string;type:'image'|'video';embedCode:string;order:number;active?:boolean}>},
 // اصلاح ۳۰ (مرحله ۷): تنظیمات آپلود عکس زبان فرزند
 isTonguePhotoRequired:false,
 maxTonguePhotoSizeMB:5,
 maxTonguePhotoCount:3,
 showTonguePhotoHint:true,
 // اصلاح ۳۲ (مرحله ۹): سوالات متداول (FAQ) — دوزبانه، قابل مدیریت کامل از پنل مدیریت
 faqItems:[
  {id:'faq1',question:'چطور می‌توانم اشتهای کودکم را بهبود ببخشم؟',answer:'بهبود اشتهای کودک نیازمند بررسی ریشه‌ای است. در روش TC، با تحلیل تخصصی عکس زبان و بررسی طبع، علت اصلی بی‌اشتهایی یا بدغذایی شناسایی می‌شود. سپس برنامه تغذیه و مکمل‌های اختصاصی بر اساس شرایط فرزند شما طراحی می‌شود. برای شروع، می‌توانید فرم مشاوره را تکمیل کنید.'},
  {id:'faq2',question:'چطور می‌توانم رشد قد فرزندم را افزایش دهم؟',answer:'افزایش رشد قد نیازمند ترکیبی از تغذیه هدفمند، خواب کافی، و فعالیت بدنی مناسب است. در روش TC، با بررسی صفحات رشد و تشخیص کمبودهای تغذیه‌ای، برنامه‌ای اختصاصی برای تحریک طبیعی رشد قد طراحی می‌شود.'},
  {id:'faq3',question:'بهترین روش‌های همراهی بدغذایی کودکان چیست؟',answer:'همراهی بدغذایی نیازمند رویکردی چندوجهی است: اصلاح طعم و مزاج، کاهش استرس هنگام غذا خوردن، و استفاده از مواد مغذی که اشتهای کودک را تحریک می‌کنند. در روش TC، با شناسایی ریشه بدغذایی، برنامه تغذیه‌ای متناسب با ذائقه و شرایط کودک طراحی می‌شود.'},
  {id:'faq4',question:'چرا فرزندم تمرکز کافی در مدرسه ندارد؟',answer:'کمبود تمرکز در کودکان می‌تواند دلایل مختلفی داشته باشد: کمبود آهن و زینک، تغذیه نامناسب، خواب ناکافی، یا استرس. روش TC با تحلیل وضعیت تغذیه و تشخیص کمبودهای ریزمغذی، برنامه‌ای برای بهبود عملکرد مغز، افزایش تمرکز و تقویت حافظه کودک طراحی می‌کند.'},
  {id:'faq5',question:'چگونه می‌توانم سیستم ایمنی کودکم را تقویت کنم؟',answer:'سیستم ایمنی قوی نیازمند تغذیه متعادل، خواب کافی، و مصرف مواد مغذی کلیدی مانند ویتامین C، زینک و پروبیوتیک‌هاست. در روش TC، با شناسایی نقاط ضعف سیستم ایمنی و استفاده از مکمل‌های ارگانیک و گیاهی، برنامه‌ای برای تقویت طبیعی ایمنی کودک طراحی می‌شود.'},
  {id:'faq6',question:'چه زمانی باید برای رشد قد کودک به متخصص مراجعه کنم؟',answer:'اگر کودک شما از همسالان خود کوتاه‌تر است، رشدش متوقف شده، یا علائم تأخیر رشد را نشان می‌دهد، بهتر است هرچه سریع‌تر با یک متخصص رشد و تغذیه مشورت کنید. صفحات رشد کودک تا سنین خاصی باز هستند و هر تأخیر در اقدام، ممکن است فرصت جبران را کاهش دهد.'}
 ],
 faqItemsEn:[
  {id:'faq1',question:"How can I improve my child's appetite?",answer:"Improving a child's appetite requires a root-cause approach. In the TC method, by analyzing the tongue and diagnosing temperament, the main cause of loss of appetite or picky eating is identified. Then, a customized nutrition and supplement plan based on your child's condition is designed."},
  {id:'faq2',question:"How can I increase my child's height growth?",answer:'Increasing height growth requires a combination of targeted nutrition, adequate sleep, and appropriate physical activity. In the TC method, by examining growth plates and identifying nutritional deficiencies, a specialized plan for natural height growth stimulation is designed.'},
  {id:'faq3',question:'What are the best methods to treat picky eating in children?',answer:"Treating picky eating requires a multi-faceted approach: correcting taste and temperament, reducing stress during mealtimes, and using nutrients that stimulate the child's appetite. In the TC method, by identifying the root cause of picky eating, a nutrition plan tailored to the child's taste and condition is designed."},
  {id:'faq4',question:"Why doesn't my child have enough focus at school?",answer:'Lack of focus in children can have various causes: iron and zinc deficiency, poor nutrition, inadequate sleep, or stress. The TC method, by analyzing nutritional status and identifying micronutrient deficiencies, designs a plan to improve brain function, increase focus, and strengthen memory.'},
  {id:'faq5',question:"How can I boost my child's immune system?",answer:'A strong immune system requires balanced nutrition, adequate sleep, and key nutrients like Vitamin C, zinc, and probiotics. In the TC method, by identifying weaknesses in the immune system and using organic and herbal supplements, a plan for natural immune strengthening is designed.'},
  {id:'faq6',question:"When should I consult a specialist for my child's height growth?",answer:"If your child is shorter than peers, growth has stopped, or shows signs of growth delay, it's best to consult a growth and nutrition specialist as soon as possible. Children's growth plates are open until certain ages, and any delay in action may reduce the opportunity for catch-up growth."}
 ],
 // اصلاح ۲: سوالات متداول مرتبط با هر تب دوره (قابل مدیریت از پنل)
 courseTabFaqs:[
  {id:'cg1',tab:'growth',question:'چه سنینی برای افزایش رشد قد مناسب است؟',answer:'صفحات رشد معمولاً تا سنین بلوغ باز هستند. با روش TC و برنامه اختصاصی مکمل/تغذیه، حتی نزدیک به بسته شدن صفحات رشد نیز می‌توان پتانسیل باقیمانده را فعال کرد. بهترین نتیجه با شروع زودتر حاصل می‌شود.'},
  {id:'cg2',tab:'growth',question:'آیا مصرف مکمل برای رشد قد کافی است؟',answer:'خیر؛ مکمل فقط بخشی از مسیر است. خواب کافی، تغذیه متعادل، فعالیت بدنی مناسب و پشتیبانی مرحله‌ای همراه با برنامه اختصاصی، مسیر نتیجهٔ پایدار را هموار می‌کند.'},
  {id:'ca1',tab:'appetite',question:'چرا فرزندم بدغذا شده است؟',answer:'بدغذایی اغلب ریشه در طبع و مزاج، کمبود ریزمغذی‌ها یا الگوهای نادرست غذایی دارد. با تحلیل عکس زبان و شرح وضعیت، ریشه اصلی شناسایی و برنامه اصلاحی تنظیم می‌شود.'},
  {id:'ca2',tab:'appetite',question:'آیا شربت اشتها راه‌حل است؟',answer:'شربت‌های اشتها اغلب فقط به‌صورت موقت اشتها را تحریک می‌کنند. در روش TC با اصلاح طبع و مزاج، سیگنال گرسنگی به‌صورت طبیعی بازمی‌گردد.'},
  {id:'ci1',tab:'intelligence',question:'چه مواد مغذی برای تمرکز کودک مهم است؟',answer:'آهن، زینک، امگا ۳ و ویتامین‌های گروه B از مهم‌ترین مواد مغذی برای عملکرد مغز، حافظه و تمرکز هستند. برنامه TC بر اساس شرایط کودک، ترکیب دقیق این مواد را مشخص می‌کند.'},
  {id:'ci2',tab:'intelligence',question:'چقدر طول می‌کشد تا تمرکز کودک بهبود یابد؟',answer:'بسته به وضعیت اولیه و پایبندی به برنامه، معمولاً چند هفته پس از شروع برنامه اختصاصی، تغییرات ملایم در خواب، انرژی و تمرکز دیده می‌شود.'}
 ],
 courseTabFaqsEn:[
  {id:'cg1',tab:'growth',question:'What ages are suitable for height growth programs?',answer:'Growth plates are usually open until puberty. With the TC method and a personalized supplement/nutrition plan, even the remaining potential near closure can be activated. Earlier start yields the best results.'},
  {id:'cg2',tab:'growth',question:'Is taking supplements enough for height growth?',answer:'No; supplements are only part of the journey. Adequate sleep, balanced nutrition, appropriate physical activity, and step-by-step support with a personalized plan ensure sustainable results.'},
  {id:'ca1',tab:'appetite',question:'Why has my child become a picky eater?',answer:'Picky eating often stems from temperament, micronutrient deficiencies, or incorrect eating patterns. By analyzing the tongue photo and reviewing the condition, the root cause is identified and a correction plan is set.'},
  {id:'ca2',tab:'appetite',question:'Are appetite syrups the solution?',answer:'Appetite syrups usually stimulate appetite only temporarily. In the TC method, by correcting temperament, the hunger signal returns naturally.'},
  {id:'ci1',tab:'intelligence',question:'Which nutrients are important for a child’s focus?',answer:'Iron, zinc, omega-3, and B vitamins are among the most important nutrients for brain function, memory, and focus. The TC plan determines the exact combination based on the child’s condition.'},
  {id:'ci2',tab:'intelligence',question:'How long does it take for a child’s focus to improve?',answer:'Depending on the initial condition and adherence to the plan, usually within a few weeks after starting the personalized program, subtle changes in sleep, energy, and focus are observed.'}
 ],
 faqDisplay:{home:{show:true,maxItems:4,viewAllLink:true},faqPage:{show:true}},
 // اصلاح ۳۲ (مرحله ۹): متن‌های سئوی سوال‌محور و کلیدواژه‌محور برای صفحات مختلف (دوزبانه) + ترتیب نمایش نسبت به «ارتباط با ما»
 pageContentOrder:{
  home:{showIntro:true,order:'contentFirst'},
  courses:{showIntro:true,order:'contentFirst'},
  experience:{showIntro:true,order:'contentFirst'},
  education:{showIntro:true,order:'contentFirst'},
  about:{showIntro:true,order:'contentFirst'}
 },
 coursesIntroText:'در این بخش، دوره‌های تخصصی زینالیکید برای حمایت از رشد قد، افزایش اشتها و همراهی بدغذایی، و حمایت از تمرکز و یادگیری کودکان و نوجوانان معرفی شده‌اند. هر دوره بر اساس روش TC و با توجه به طبع و شرایط منحصربه‌فرد فرزند شما طراحی می‌شود. برای دریافت مشاوره رایگان، فرم مشاوره را تکمیل کنید.',
 coursesIntroTextEn:"In this section, Zeynalikid's specialized courses for improving height growth, increasing appetite, addressing picky eating, and boosting children's intelligence and focus are introduced. Each course is designed based on the TC method and according to your child's unique temperament and condition. For a free consultation, please complete the consultation form.",
 // اصلاح ۳: متن سئوی کامل (پایین صفحه دوره‌ها، بین سوالات متداول و ارتباط با ما)
 coursesSeoFullText:'در زینالیکید، هر دوره ترکیبی از مشاوره تخصصی، برنامه مکمل و تغذیه اختصاصی، پشتیبانی مرحله‌ای و پیگیری رشد فرزند شماست. هدف ما کمک به والدین برای تصمیم‌گیری آگاهانه در مسیر رشد قد، همراهی بی‌اشتهایی و حمایت از تمرکز کودکان است.',
 coursesSeoFullTextEn:"At Zeynalikid, every course combines specialized consultation, a personalized supplement and nutrition plan, step-by-step support, and growth tracking for your child. Our goal is to help parents make informed decisions on the path of height growth, addressing picky eating, and boosting children's intelligence.",
 experienceIntroText:'در این بخش، تجربه‌های واقعی والدین از دوره‌های رشد قد، همراهی بی‌اشتهایی و حمایت از تمرکز کودکان را مشاهده می‌کنید. این تجربه‌ها با رضایت والدین منتشر شده‌اند و نشان‌دهنده تأثیر مثبت روش TC بر سلامت و رشد فرزندان است.',
 experienceIntroTextEn:'In this section, real experiences of parents from height growth, appetite guidance, and intelligence boosting courses are shared. These experiences are published with parental consent and reflect the positive impact of the TC method on children\'s health and growth.',
 educationIntroText:'در این بخش، آموزش‌های تخصصی در زمینه تغذیه کودک، افزایش رشد قد، بهبود اشتها، تقویت تمرکز و هوش کودکان گردآوری شده است. محتوای این صفحه شامل ویدیو، ویس، عکس و مقالات آموزشی است.',
 educationIntroTextEn:"In this section, specialized educational content about child nutrition, height growth, appetite improvement, focus and learning support is collected. This page's content includes video, voice, photo, and educational articles.",
 aboutIntroText:'زینالیکید یک سامانه مشاوره تخصصی در حوزه رشد و تغذیه کودکان و نوجوانان است. تیم ما با استفاده از روش TC و علم زبان‌شناسی، برنامه‌های اختصاصی برای همراهی بی‌اشتهایی، حمایت از رشد قد و تمرکز فرزندان طراحی می‌کند.',
 aboutIntroTextEn:"Zeynalikid is a specialized consultation system in the field of children's growth and nutrition. Our team, using the TC method and linguistics science, designs customized programs to treat picky eating, increase height growth, and boost children's intelligence and focus.",
 consultTopics:['رشد قد','بی‌اشتهایی / بدغذایی','هوش و ذهن','وزنگیری'],digestiveOptions:['ندارد','یبوست','اسهال','نفخ','رفلاکس','سایر'],appetiteOptions:['خوب','متوسط','ضعیف','بی‌اشتهایی شدید'],specialConditions:['سلیاک','فاویسم (باقلایی)','حساسیت به آجیل','کم‌خونی مینور'],timeSlots:['۹ تا ۱۲','۱۲ تا ۱۸','۱۸ تا ۲۲'],categories:['ثبتی','اصلاحی','پیگیری','آخر ماه','مشاوره اولیه'],
 formFields:{parentName:{label:'نام و نام خانوادگی',placeholder:'نام و نام خانوادگی',show:true,required:false},parentPhone:{label:'شماره تماس',placeholder:'09123456789',show:true,required:true},age:{label:'سن (سال)',placeholder:'مثلاً ۵',show:true,required:true,min:2,max:17},height:{label:'قد (سانتیمتر)',placeholder:'مثلاً ۱۱۰',show:true,required:false},weight:{label:'وزن (کیلوگرم)',placeholder:'مثلاً ۱۸',show:true,required:false},disease:{label:'بیماری خاص',placeholder:'نام بیماری...',show:true,required:false},notes:{label:'توضیحات تکمیلی',placeholder:'هر گونه توضیح اضافی، سابقه بیماری، دارو مصرفی یا نگرانی خاص را اینجا بنویسید',show:true,required:false}},
 countryCodes:baseCountries,
 contacts:{phone:'',whatsapp:'',telegram:'',instagram:'',rubika:'',bale:'',custom:[]},contactIcons:{phone:{color:'#2564a8'},whatsapp:{color:'#25D366'},telegram:{color:'#229ED9'},instagram:{color:'#E1306C'},rubika:{color:'#f97316'},bale:{color:'#16a34a'}},translations:{fa:{...faDict},en:{...enDict}},contactVisibility:{consultSuccess:true,courses:true,courseShipping:true,coursePayment:true,courseConfirm:true,courseDone:true,form:false,experience:true,licenses:true,education:true,about:true,track:true,faq:true,home:false},
 courseTabs:defTabs,
 // اصلاح ۱ (مرحله ۶): افزودن «ماهکس» و «چاپار» به روش‌های ارسال داخل ایران — requiresPostal فقط برای «پست پیشتاز» فعال است
 // اصلاح ۲۸: ترتیب جدید — تیپاکس، چاپار، ماهکس (سریع‌ترین + تحویل ۴۸ ساعته)، پست پیشتاز
 shippingMethods:{iran:[{id:'tipax',title:'تیپاکس',titleEn:'Tipax',active:true,requiresPostal:false,default:true,order:1,help:''},{id:'chaparr',title:'چاپار',titleEn:'Chaparr',active:true,requiresPostal:false,default:false,order:2,help:''},{id:'mahaks',title:'ماهکس',titleEn:'Mahaks',active:true,requiresPostal:false,default:false,order:3,help:'',tag:'سریع‌ترین',tagEn:'Fastest'},{id:'post',title:'پست پیشتاز',titleEn:'Express post',active:true,requiresPostal:true,default:false,order:4,help:''}],intl:[{id:'bsw',title:'BSW (راه آسمان آبی)',titleEn:'BSW',active:true,requiresPostal:false,default:true,order:1,help:''}]},
 delivery:{iranFastCities:['تهران','کرج','البرز','قزوین','پردیس','شهریار','اسلامشهر','رباط کریم','پرند','دماوند','ورامین','پاکدشت'],iranFastText:'حدود ۴۸ ساعت تا ۷۲ ساعت',iranOtherText:'حدود ۴۸ ساعت تا ۵ روز کاری',intlText:'حدود ۷ تا ۱۵ روز کاری'},
 banks:[{id:'blu',name:'بلوبانک (بانک سامان)',card:'',iban:'',color:'blue',active:true,order:1},{id:'saman',name:'بانک سامان',card:'',iban:'',color:'sky',active:true,order:2},{id:'pasargad',name:'بانک پاسارگاد',card:'',iban:'',color:'yellow',active:true,order:3}],
 cryptoWallets:[{id:'usdt',name:'Tether',symbol:'USDT',color:'#26A17B',address:'',network:'TRC20',active:true,order:1},{id:'btc',name:'Bitcoin',symbol:'BTC',color:'#F7931A',address:'',network:'Bitcoin',active:true,order:2},{id:'eth',name:'Ethereum',symbol:'ETH',color:'#627EEA',address:'',network:'ERC20',active:true,order:3},{id:'doge',name:'Dogecoin',symbol:'DOGE',color:'#C2A633',address:'',network:'Dogecoin',active:true,order:4},{id:'ltc',name:'Litecoin',symbol:'LTC',color:'#BFBBBB',address:'',network:'Litecoin',active:true,order:5}],
 cryptoVisibility:'intl',
 reels:[],
 mediaItems:{videos:[],audios:[],images:[]},
 mediaPlatforms:{video:{iran:'aparat',international:'youtube',allowed:['aparat','youtube']},audio:{iran:'files',international:'mediafire',allowed:['files','mediafire']},image:{iran:'biaupload',international:'abrino',allowed:['biaupload','uploadkon','abrino','boxara']}},
 mediaCountryMode:'auto',
 experience:{items:[]},
 education:{items:[]},
 // اصلاح ۴۶-۴۷: ساختار محصول با عکس و مدیریت نمایش
 products:{
  showSection:true,
  homeFeatured:{enabled:true},
  list:[
    {id:'p1',name:'داینامین',icon:'',description:'مکمل ایزوتونیک کلسیم و D3 برای جذب سریع‌تر در استخوان.',features:['جذب سریع','مناسب برای رشد قد'],image:'',isVisible:true,showOnHome:true,order:1},
    {id:'p2',name:'پروتئین‌بار',icon:'',description:'پروتئین بار ۴۰ گرمی با ۱۲ گرم پروتئین خالص.',features:['۱۲ گرم پروتئین خالص','انرژی بالا'],image:'',isVisible:true,showOnHome:true,order:2},
    {id:'p3',name:'خرما',icon:'',description:'منبع طبیعی انرژی و مواد معدنی.',features:['انرژی طبیعی','غنی از مواد معدنی'],image:'',isVisible:true,showOnHome:true,order:3},
    {id:'p4',name:'لوکوم',icon:'',description:'میان‌وعده مقوی مناسب کودکان.',features:['میان‌وعده مقوی','مناسب کودکان'],image:'',isVisible:true,showOnHome:true,order:4},
    {id:'p5',name:'ماچا',icon:'',description:'نوشیدنی تقویتی تمرکز و انرژی.',features:['تقویت تمرکز','انرژی طبیعی'],image:'',isVisible:true,showOnHome:false,order:5},
    {id:'p6',name:'عسل',icon:'',description:'عسل طبیعی برای تقویت ایمنی و انرژی.',features:['تقویت ایمنی','انرژی طبیعی'],image:'',isVisible:true,showOnHome:false,order:6},
    {id:'p7',name:'قهوه',icon:'',description:'مطابق دستور کارشناس مصرف شود.',features:['مطابق دستور کارشناس'],image:'',isVisible:true,showOnHome:false,order:7},
    {id:'p8',name:'سبوس',icon:'',description:'فیبر طبیعی برای بهبود گوارش.',features:['فیبر طبیعی','بهبود گوارش'],image:'',isVisible:true,showOnHome:false,order:8}
  ]
 },
 // اصلاح ۴۷: نمایش بخش محصولات (هم برای منو و هم صفحه)
 showProductsSection:true,
 imageCompressionKB:500,
 trackingDigitCount:5,
 trustRotateMs:8000,
 trustMessages:{
  health:[
   {id:'h1',title:'فرمولاسیون برگزیده، تولید بهداشتی و ایمن.',description:'محصولات ما با استانداردهای بهداشتی و مجوزهای رسمی مربوطه تولید می‌شوند؛ جزئیات مجوزها در بخش مجوزها قابل بررسی است.',order:1},
   {id:'h2',title:'پشتیبانت هستیم، نه فروشنده‌ای که ناپدید بشه.',description:'از روز اول تا آخرین روز دوره، کنارتیم. هفتگی پیگیر وضعیت رشد، اشتها و خواب فرزندت هستیم.',order:2},
   {id:'h3',title:'اگر نتیجه نگیریم، صریح میگیم.',description:'تعهد ما فقط وقتی معنا داره که تو هم همراهیمون کنی. روراست و متعهد، درست مثل خودت.',order:3},
   {id:'h4',title:'زیر لیسانس آلمان بودن، یعنی پاسپورت سلامت اروپا تو جیب محصول ماست.',description:'ما این افتخار رو با فرمولاسیون کاملاً بومی و مناسب طبع بچه‌های ایران ترکیب کردیم.',order:4},
   {id:'h5',title:'تجربه‌های منتشرشده والدین، راهنمای انتخاب آگاهانه‌تر است.',description:'بازخوردها و تجربه‌های منتشرشده را ببینید و با آگاهی بیشتری تصمیم بگیرید.',order:5},
   {id:'h6',title:'بچت قهرمان نمیشه چون مکمل می‌خوره؛ قهرمان میشه چون بدنش از درون ترمیم میشه.',description:'تفاوت بین یه کودک خسته، بدغذا و کم‌حوصله با یه کودک پرانرژی و سرزنده، ریشه‌اش تو ترمیم سلولیه.',order:6},
   {id:'h7',title:'سلامتی یه مقصد نیست، یه مسیر شخصی‌سازیه.',description:'ما با ۱۷۰۰ محصول، مسیر سلامت فرزند تو رو منحصربه‌فرد طراحی می‌کنیم.',order:7},
   {id:'h8',title:'پیشگیری، ریشه‌ای‌ترین کار ماست.',description:'نمی‌ذاریم ضعف ایمنی، کوتاهی قد یا کاهش تمرکز، فرزندت رو غافلگیر کنه.',order:8},
   {id:'h9',title:'یک بدن سالم، یک کودکی شاد می‌سازه.',description:'ما پشت صحنه انرژی، بازیگوشی و خنده‌های فرزندت هستیم.',order:9},
   {id:'h10',title:'کودک امروز، سرمایه فردای جامعه است.',description:'ما با تغذیه سالم، از امروز برای فردای ایران قهرمان می‌سازیم.',order:10}
  ],
  height:[
   {id:'ht1',title:'رشد قد یه مسابقه با زمانه؛ ما زمان رو از دست نمی‌دیم.',description:'صفحات رشد بسته بشن، دیر میشه. روش TC طراحی شده تا حتی یک سانتیمتر از پتانسیل قدی فرزندت هدر نره.',order:1},
   {id:'ht2',title:'دشمن رشد قد، کمبود آهن و زینک نیست؛ بی‌خبری توئه.',description:'تا وقتی ندونی بدن بچهات چه ریزمغذی‌هایی رو جذب نمی‌کنه، هر چی بدی فایده نداره.',order:2},
   {id:'ht3',title:'قد کوتاه، اعتماد به نفس کوتاه میاره.',description:'این یه شعار نیست، یه حقیقت تلخه. ما برای رسیدن به سانتیمترهای از دست رفته نمی‌جنگیم، برای اعتماد به نفس آینده‌ش می‌جنگیم.',order:3},
   {id:'ht4',title:'هر سانتیمتر قد، یه جهان اعتماد به نفس برای بچهات می‌سازه.',description:'نگذار کمبود امروز، حسرت فردای فرزندت بشه.',order:4},
   {id:'ht5',title:'هورمون رشد رو با تغذیه بیدار کن، نه با آمپول.',description:'روش TC، سوخت طبیعی جهش قدی رو بدون دستکاری هورمونی فراهم می‌کنه.',order:5},
   {id:'ht6',title:'خواب کافی + تغذیه هدفمند = موتور روشن رشد قد.',description:'بادرنجبویه و املاح ضروری، نسخه شب‌های طلایی رشد رو می‌پیچن.',order:6},
   {id:'ht7',title:'پروتئین بار ۴۰ گرمی ما، یه آجر محکم برای برج بلند قدشه.',description:'۱۲ گرم پروتئین خالص، تحویل مستقیم به صفحات رشد.',order:7},
   {id:'ht8',title:'بچه‌ای که کلسیم جذب نکنه، استخون‌هاش آهنگ رشد رو کند می‌زنن.',description:'داینامین ایزوتونیک، کلسیم و D3 رو ۱۰ برابر سریع‌تر به استخوان می‌رسونه.',order:8},
   {id:'ht9',title:'صفحه رشد یه درِ کشویی‌ست که یه روز برای همیشه بسته میشه.',description:'قبل از بسته شدنش، سوخت لازم رو بهش برسون.',order:9},
   {id:'ht10',title:'مکمل رشد قد، وقتی با طبع فرزندت هماهنگ باشه، بهتر جواب می‌ده.',description:'ما با تحلیل تخصصی عکس زبان، مسیر جذب و رشد رو بهتر می‌شناسیم.',order:10},
   {id:'ht11',title:'عکس زبون بچهات، نقشه گنج سلامتی و قد بلندشه.',description:'ما به جای حدس زدن، نقشه می‌خونیم. ریشه کندرشدی رو دقیقاً همونجا پیدا می‌کنیم.',order:11},
   {id:'ht12',title:'نسخهٔ منحصربه‌فرد برای رشد منحصربه‌فرد فرزندت.',description:'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. چون هیچ دو کودکی شبیه هم نیستن.',order:12},
   {id:'ht13',title:'تجربه‌های والدین می‌تواند به انتخاب آگاهانه‌تر مسیر رشد کمک کند.',description:'بازخوردها را ببینید و سپس متناسب با شرایط فرزندتان تصمیم بگیرید.',order:13},
   {id:'ht14',title:'هر هفته که بگذره و اقدام نکنی، یه قدم از هم‌سن و سالاش عقب‌تر میفته.',description:'کمبود وزن موندگار میشه و قد از دست میره. تصمیم سخت امروز، حسرت آسون فردا رو حذف می‌کنه.',order:14},
   {id:'ht15',title:'بچت قهرمان قدی میشه چون بدنش از درون ترمیم میشه.',description:'تفاوت بین یه کودک خسته و کم‌قد، با یه کودک پرانرژی و بلندقامت، ریشه‌اش تو ترمیم سلولیه.',order:15},
   {id:'ht16',title:'۱۷۰۰ محصول داریم، اما فقط ۴ تاش مال بچه توئه.',description:'این یعنی ما یه سوزن رو از انبار کاه پیدا می‌کنیم. نسخه عمومی ممنوع، فقط شفای اختصاصی برای رشد.',order:16}
  ],
  appetite:[
   {id:'ap1',title:'بی‌اشتهایی مادر اصلی مشکلات کودکان است.',description:'تا وقتی بچه غذا نخوره، بدن روند رشد نرمالی نخواهد داشت، سیستم ایمنی ضعیف می‌شه، استخوان‌بندی ناقص می‌مونه و حتی مغز برای تمرکز و یادگیری سوخت کافی نداره.',order:1},
   {id:'ap2',title:'بی‌اشتهایی یهویی نمیاد که یهویی بره. ریشه‌اش رو پیدا کن، نه با زور.',description:'پشت هر بچه بدغذا، یه سیستم گوارشی هست که کمک می‌خواد.',order:2},
   {id:'ap3',title:'بچه لجباز نیست، بدغذا نیست؛ بدنش سیگنال گرسنگی رو گم کرده.',description:'ما با اصلاح طبع، دوباره این سیگنال رو روشن می‌کنیم.',order:3},
   {id:'ap4',title:'اگه بچه‌ات رو با گوشی و تبلت سرگرم می‌کنی تا غذا بخوره، داری بمب ساعتی درست می‌کنی.',description:'امروز ساکت میشه، فردا به هیچ قیمتی دهنش باز نمیشه.',order:4},
   {id:'ap5',title:'تا وقتی طبع و مزاج اصلاح نشه، بشقاب غذا پر از جنگ و گریه می‌مونه.',description:'تنها راه صلح با غذا، اصلاح مزاج از درونه.',order:5},
   {id:'ap6',title:'بی‌اشتهاییِ همراهی‌نشده، بعد از ۳ ماه یه عادت مغزی میشه.',description:'همون بچه‌ای که امروز کم می‌خوره، فردا کلاً گرسنگی رو فراموش می‌کنه.',order:6},
   {id:'ap7',title:'هر لقمه‌ای که با گریه و التماس پایین بره، هیچ‌وقت کامل جذب بدن نمیشه.',description:'استرس، قفل جذب مواد مغذی در روده‌هاست.',order:7},
   {id:'ap8',title:'بدغذایی یعنی بدن بچه هوشمندتر از اون چیزیه که فکر می‌کنی.',description:'یه کمبودی داره که با بدغذایی بهت هشدار میده.',order:8},
   {id:'ap9',title:'زبان بچه‌ات راز بی‌اشتهایی رو فاش می‌کنه. فقط کافیه بلد باشی بخونیش.',description:'با علم زبان‌شناسی، بدون آزمایش و دارو، ریشه رو پیدا کن.',order:9},
   {id:'ap10',title:'شربت اشتها، یه چسب زخم روی یه زخم عمیقه. روش TC یه جراحی تغذیه‌ایه.',description:'فرق بین چند هفته اشتهای کاذب و یک عمر سلامت واقعی.',order:10},
   {id:'ap11',title:'بچه‌ای که آب می‌خوره ولی غذا نمی‌خوره، سیر نیست؛ بدنش فریبش زده.',description:'سوءمزاج معده، گرسنگی رو با تشنگی اشتباه می‌گیره.',order:11},
   {id:'ap12',title:'اگه سر سفره جنگ جهانی سوم راه میفته، مشکل از غذا نیست، از سیستم گوارش و طبعشه.',description:'قبل از دعوا، تیغه‌های زبانش رو بررسی کن.',order:12},
   {id:'ap13',title:'به جای این‌که توپ رو به گردن بچه بندازی، ببین بدنش چه ریزمغذی‌ای رو جذب نکرده.',description:'کمبود زینک و آهن، اولین مظنون بی‌اشتهایی بچه‌هاست.',order:13},
   {id:'ap14',title:'بی‌اشتهایی یعنی متابولیسم بدن قفل کرده. ما کلیدش رو داریم.',description:'کلیدش یه نسخه گیاهی پیچیده شده با طعم مورد علاقه بچه‌اته.',order:14},
   {id:'ap15',title:'زینالیکید بدغذاست؟ نه! بدنش هوشمندانه از چیزی که بلد نیست هضم کنه، فرار می‌کنه.',description:'به بدنش گوش بده، داره راه نجات رو نشون میده.',order:15},
   {id:'ap16',title:'با اصلاح طبع، بچه‌ای که از قاشق فرار می‌کرد، خودش دنبال بشقاب میاد.',description:'این یه شعار نیست، نتیجه‌ای هست که ۱۰,۰۰۰ مادر دیدش.',order:16},
   {id:'ap17',title:'همراهی ریشه‌ای، نه مسکن موقت.',description:'ما با تحلیل زبان‌شناسی و اصلاح طبع، بی‌اشتهایی رو ریشه‌ای دنبال می‌کنیم؛ به‌جای راه‌حل‌های موقت.',order:17},
   {id:'ap18',title:'یه مادر آگاه، دنبال شربت اشتها نیست؛ دنبال ریشه‌یابیه.',description:'شربت فقط یه مُسکنه، روش TC جراحی تغذیه‌ایه برای بی‌اشتهایی.',order:18},
   {id:'ap19',title:'عکس زبون بچهات، نقشه گنج اشتها و سلامتیشه.',description:'ما به جای حدس زدن، نقشه می‌خونیم. ریشه بی‌اشتهایی رو دقیقاً همونجا پیدا می‌کنیم.',order:19}
  ],
  mind:[
   {id:'m1',title:'مغز بچه مثل یه اسفنج تشنه‌ست؛ یا تغذیه درست بهش میدی، یا هرز میره.',description:'تغذیه، سیم‌کشی مغز برای آینده است.',order:1},
   {id:'m2',title:'هوش رو نمیشه تزریق کرد، اما میشه تغذیه‌اش کرد. با مواد مغذی درست.',description:'امگا ۳، زینک و ویتامین‌های B، سوخت جت مغزن.',order:2},
   {id:'m3',title:'تمرکز پایین، لجبازی نیست؛ گاهی مغز گرسنه‌ست و خودت نمی‌دونی.',description:'قبل از تنبیه، بشقاب صبحانه‌اش رو چک کن.',order:3},
   {id:'m4',title:'قبل از معلم خصوصی و کلاس تقویتی، تغذیه مغز رو درست کن.',description:'یه مغز سوخت‌رسانی‌شده، تو کلاس کم نمیاره.',order:4},
   {id:'m5',title:'امگا ۳ رو فراموش کن، مغز بچه‌ات فراموش‌کاری رو کنار می‌ذاره.',description:'DHA، آجر ساختمان حافظه و یادگیریه.',order:5},
   {id:'m6',title:'بچه‌ای که صبحانه کامل نخوره، زنگ دوم ریاضی کم میاره.',description:'قند خون که بیفته، تمرکز هم سقوط می‌کنه.',order:6},
   {id:'m7',title:'ویتامین‌های گروه B، باتری شارژر سلول‌های خاکستری مغزن.',description:'بدون B کمپلکس، انتقال پیام‌های عصبی کند میشه.',order:7},
   {id:'m8',title:'حواس‌پرتی یه بیماری نیست، یه کمبوده. کمبود آهن، روی و منیزیم.',description:'با تغذیه درست، تمرکزش رو مثل لیزر تیز کن.',order:8},
   {id:'m9',title:'یه مغز تغذیه‌شده، یه سر و گردن از هم‌کلاسی‌هاش بالاتره.',description:'نه فقط تو امتحان؛ تو حل مسائل زندگی.',order:9},
   {id:'m10',title:'ما به مغز بچهات ماهی نمی‌دیم؛ بهش یاد می‌دیم چطور خودشو بازسازی کنه.',description:'تقویت مسیرهای عصبی، نه فقط دادن چند تا ویتامین.',order:10},
   {id:'m11',title:'خواب باکیفیت + تغذیه هوشمند = سوخت جت برای مغز.',description:'بادرنجبویه برای خواب عمیق، پروتئین برای شارژ مغز.',order:11},
   {id:'m12',title:'دشمن یادگیری، شیطنت نیست؛ قند پنهان و کمبود ریزمغذی‌هاست.',description:'قند زیاد، مغز رو خاموش می‌کنه. پروتئین، روشنش.',order:12},
   {id:'m13',title:'توی روش TC، قبل از کتاب دست بچه، بشقابش رو پُر می‌کنیم.',description:'یادگیری از آشپزخونه شروع میشه، نه از کتابخونه.',order:13},
   {id:'m14',title:'آینده تحصیلی بچهات، تو آشپزخونه رقم می‌خوره نه توی کلاس.',description:'یه مغز گرسنه، بهترین معلم دنیا رو هم درک نمی‌کنه.',order:14},
   {id:'m15',title:'فرزندت قرار نیست نابغه به دنیا بیاد؛ می‌تونه نابغه تغذیه بشه.',description:'پتانسیل واقعی مغز، با تغذیه بیدار میشه.',order:15},
   {id:'m16',title:'ذهن آروم، حافظه قوی و یادگیری سریع، محصول یه صبحانه مهندسی‌شده‌ست.',description:'ما مهندس تغذیه مغزیم.',order:16},
   {id:'m17',title:'همراهی ریشه‌ای، نه مسکن موقت.',description:'ما با تحلیل زبان‌شناسی و اصلاح طبع، تمرکز رو ریشه‌ای دنبال می‌کنیم؛ به‌جای راه‌حل‌های موقت.',order:17},
   {id:'m18',title:'نسخهٔ منحصربه‌فرد برای ذهن منحصربه‌فرد فرزندت.',description:'هیچ دو نسخه‌ای در زینالیکید شبیه هم نیست. حتی برای تقویت هوش.',order:18}
  ]
 },
 // اصلاح ۴۴-۴۵: جملات اعتمادساز صفحات موفقیت (قابل مدیریت از پنل)
 successTrustSentences:[
  {id:'st1',title:'به جمع خانواده زینالیکید خوش آمدید',description:'به خانواده بزرگ زینالیکید خوش آمدید - مسیر سلامت فرزند شما از اینجا شروع می‌شود',order:1},
  {id:'st2',title:'ثبت‌نام شما با موفقیت انجام شد',description:'اطلاعات شما ثبت شد و کارشناسان ما طی 24 تا 48 ساعت آینده با شما تماس می‌گیرند',order:2},
  {id:'st3',title:'یک قدم به سلامت فرزندتان نزدیک‌تر شدید',description:'از این لحظه، پشتیبانی ما 24 ساعته کنار شما و فرزندتان است',order:3},
  {id:'st4',title:'بیش از 10,000 مادر به ما اعتماد کرده‌اند',description:'شما نیز به جمع مادران آگاه و قهرمان پیوستید',order:4},
  {id:'st5',title:'مسیر رشد و سلامت فرزندتان آغاز شد',description:'کارشناسان ما بهترین برنامه را برای فرزند شما طراحی خواهند کرد',order:5},
 ],
 // اصلاح ۴۸: تفکیک جملات موفقیت مشاوره و دوره - دو مجموعه مجزا
 consultationSuccessSentences:[
  " اولین و مهم‌ترین قدم رو برداشتی. از این لحظه، نگرانی‌هات با ما تقسیم میشه.",
  "کارشناسان ما تا ۲۴ ساعت آینده باهات تماس می‌گیرن تا گره از مشکل فرزندت باز کنن.",
  "نگران هزینه نباش. مشاوره‌ات کاملاً رایگانه و قرار نیست تحت فشار ثبت‌نام کنی.",
  "قبل از تماس، یه نفس راحت بکش. قراره راه‌حل رو پیدا کنیم، نه اینکه مشکلو بزرگتر کنیم.",
  "باور کن تنها نیستی! روزانه ده‌ها مادر مثل تو این فرم رو پُر می‌کنن و به نتیجه می‌رسن.",
  "ما اینجام تا دیگه مجبور نباشی با گریه و التماس به بچه‌ات غذا بدی. دوران جنگ با غذا تموم شد.",
  "عکس زبانش رو آماده کن. همون جا راز بی‌اشتهایی و کندرشدی فرزندت رو بهت می‌گیم.",
  "ما به دنبال فروش نیستیم؛ به دنبال همراهی ریشه‌اییم. تو تماس اول، خودت اینو حس می‌کنی.",
  "تجربه‌های منتشرشده والدین را ببینید و با آگاهی بیشتری تصمیم بگیرید.",
  "کارشناسایی که باهات تماس می‌گیرن، خودشون دوره‌های تخصصی رشد و تغذیه رو دیدن. حرف دلت رو می‌فهمن.",
  "نگران این نباش که چی بگی. ما سوالای درست رو ازت می‌پرسیم تا به ریشه برسیم.",
  "این مشاوره فقط یه تماس ساده نیست؛ یه نقشه راه کامل برای نجات رشد و اشتهای فرزندته.",
  "تفاوت مشاوره ما: ما به جای نسخه پیچیدن، به زبان بچه‌ات گوش می‌دیم.",
  "اگه حتی ۱٪ شک داری، تماس مشاوره رو پاسخ بده. قول می‌دیم تا آخر تماس، شکت تبدیل به امید بشه.",
  "خوش اومدی به جمع مامان‌های آگاه و قهرمان. فرزندت لایق بهترین شروع دوباره‌ست. "
 ],
 consultationSuccessSentencesEn: [
  "You’ve taken the first and most important step. From now on, your worries are shared with us.",
  "Our experts will contact you within 24 hours to help resolve your child’s issue.",
  "Don’t worry about cost. Your consultation is completely free and you won’t be pressured to enroll.",
  "Take a deep breath before the call. We’re going to find the solution, not make the problem bigger.",
  "Believe us, you’re not alone! Dozens of mothers like you fill this form daily and get results.",
  "We’re here so you no longer have to force-feed your child with tears and pleading. The food battle is over.",
  "Have your child’s tongue photo ready. We’ll reveal the secret of appetite loss and slow growth right there.",
  "We’re not after selling; we’re after root cause support. You’ll feel it on the first call.",
  "Read published parent experiences and make a more informed choice.",
  "The experts who call you have themselves completed specialized growth and nutrition training. They understand you.",
  "Don’t worry about what to say. We’ll ask the right questions to get to the root.",
  "This consultation is not just a call; it’s a complete roadmap to rescue your child’s growth and appetite.",
  "Our difference: instead of prescribing, we listen to your child’s tongue.",
  "Even if you’re 1% doubtful, answer the consultation call. We promise your doubt will turn to hope.",
  "Welcome to the community of aware and heroic moms. Your child deserves the best fresh start."
 ],
 courseSuccessSentences:[
  "ثبت‌نامت یعنی یک قدم جلوتر از هزاران مادری که هنوز مردد هستن. امروز تصمیم درست رو گرفتی. ",
  "از این لحظه، پشتیبانی ما ۲۴ ساعته کنار تو و فرزندته. دیگه تنها نیستی.",
  "این پکیج دقیقاً با طبع و ذائقهٔ بچهٔ تو ساخته میشه. چیزی که می‌رسه، مختص خودشه.",
  "بهمون اعتماد کردی؟ حالا نوبت ماست که جبران کنیم. نتیجه رو به چشم خودت می‌بینی.",
  "فردا صبح که بیدار شی، کارشناس‌های ما برای شروع همراهی با تو تماس می‌گیرن.",
  "عکس زبانش رو فرستادی؟ یعنی همراهی ریشه‌ای از همین امروز شروع می‌شه و مسیر اشتها روشن‌تر می‌شه.",
  "۱۰,۰۰۰ مادر قبل از تو این مسیر رو رفتن و نتیجه گرفتن. تو نفر بعدی هستی که رضایتش رو ویس می‌کنی.",
  "خداحافظی با راه‌حل‌های موقت. از امروز همراهی واقعی شروع می‌شه.",
  "معمولاً در هفته‌های اول نشانه‌های مثبتی در خواب و اشتها دیده می‌شه؛ هر کودک مسیر خودش رو داره. قدم‌به‌قدم کنارتیم.",
  "یادت باشه: بی‌اشتهایی ۳ ماهه عادت مغز میشه. تو امروز جلوی این عادت خطرناک رو گرفتی. آفرین!",
  "حواست باشه: این آخرین دوره‌ایه که برای رفع بی‌اشتهایی و رشد قد بچه‌ات نیاز داری. مابقی مسیر، فقط پیگیری ماست.",
  "توی این دوره، بهت یاد می‌دیم چطور برای همیشه بی‌اشتهایی رو شکست بدی. ما ماهی نمی‌دیم، ماهیگیری یادت می‌دیم.",
  "همراهی دقیق ما با پایبندی به برنامه، بهترین شرایط نتیجه‌گیری رو می‌سازه. ما متعهدیم.",
  "از امروز، دیگه مجبور نیستی با گریه و التماس به بچه‌ات غذا بدی. روش ما متفاوته.",
  "روی دکمهٔ ثبت کلیک کردی و امروز یه مادر نگران بودی؛ از فردا یه مادر آگاه و مطمئن. به مسیر TC خوش اومدی. "
 ],
 courseSuccessSentencesEn: [
  "Your registration means one step ahead of thousands of still-hesitant mothers. You made the right decision today.",
  "From now on, our support is 24/7 beside you and your child. You’re no longer alone.",
  "This package is built exactly with your child’s temperament and taste. What arrives is made just for them.",
  "You trusted us? Now it’s our turn to repay. You’ll see the results with your own eyes.",
  "When you wake up tomorrow, our experts will call you to start the accompaniment.",
  "Did you send the tongue photo? Then root accompaniment starts today and the appetite path becomes clearer.",
  "10,000 mothers before you walked this path and got results. You’re next to send a voice of satisfaction.",
  "Goodbye to temporary solutions. Real accompaniment starts today.",
  "Usually in the first weeks, positive signs in sleep and appetite are seen; each child has their own path. We’re beside you step by step.",
  "Remember: untreated appetite loss after 3 months becomes a brain habit. Today you stopped this dangerous habit. Well done!",
  "Note: this is the last course you need to address your child’s appetite loss and height growth. The rest is just our follow-up.",
  "In this course, we’ll teach you how to defeat appetite loss forever. We don’t give fish, we teach fishing.",
  "Precise accompaniment with adherence to the plan creates the best conditions for results. We are committed.",
  "From today, you no longer have to feed your child with tears and pleading. Our method is different.",
  "You clicked register and today you were a worried mother; from tomorrow you’re an aware and confident mother. Welcome to the TC path."
 ],
 showReceiptImage:true,whatsappNeedsCountryCode:false,
 i18n:{en:{heroTitle:'Wishing you a pleasant time',heroDesc:'This form is designed to review your child’s condition and schedule a private consultation.',noticeText:'This consultation is provided only to parents or legal guardians. Please complete the information carefully.',phoneNote:'Phone consultation only',submitBtnText:'Submit consultation request',successMsg:'Your child’s information was submitted successfully',successSubMsg:'We will contact you within 24 to 48 hours.',timeSlotLabel:'Preferred call time (optional)',directCourseBtn:'View and register courses',newFormBtn:'New form',contactBtn:'Contact us',parentInfo:'Parent / Guardian information',childInfo:'Child information',healthInfo:'Nutrition and health',consultTopic:'Consultation topic',multi:'You can select more than one item',gender:'Gender',boy:'Boy',girl:'Girl',age:'Age',height:'Height',weight:'Weight',digest:'Digestive issue',appetite:'Appetite',disease:'Special disease',specials:'Special conditions',notes:'Notes',required:'Required fields',adminLogin:'Admin Panel',login:'Login',phone:'Phone',password:'Password',back:'Back to consultation form',courses:'Courses',sendIran:'Shipping inside Iran',sendIntl:'Shipping outside Iran',chooseDest:'Please select shipping destination.',next:'Continue',backBtn:'Back',shippingInfo:'Shipping information',paymentInfo:'Payment information',finalConfirm:'Final confirmation',finalSubmit:'Submit final registration',editChild:'I want to edit my child information',contactUs:'Contact us'}}
};
export function mergeSettings(rawParam:any){const raw=migrateSettings(rawParam);const m={...defaultSettings,...(raw||{})};m.adminPassword=raw?.adminPassword||''; m.dailyTips=raw?.dailyTips||defaultSettings.dailyTips;(m as any).manualUserQuestions=Array.isArray((raw as any)?.manualUserQuestions)?(raw as any).manualUserQuestions:(defaultSettings as any).manualUserQuestions||[];m.consultants=Array.isArray(raw?.consultants)?raw.consultants:(defaultSettings as any).consultants||[];m.referral={...(defaultSettings as any).referral||{},...(raw?.referral||{}),texts:{...((defaultSettings as any).referral?.texts||{}),...((raw?.referral||{}).texts||{})}};m.formFields={...defaultSettings.formFields,...(raw?.formFields||{})}; if(!raw?.formFields?.notes?.placeholder||raw.formFields.notes.placeholder==='توضیحات تکمیلی در صورت نیاز...') m.formFields.notes={...m.formFields.notes,placeholder:defaultSettings.formFields.notes.placeholder}; if(!raw?.photoUrl||raw.photoUrl===placeholder) m.photoUrl=PROFILE_PHOTO;m.contacts={...defaultSettings.contacts,...(raw?.contacts||{})};m.contactIcons={...defaultSettings.contactIcons,...(raw?.contactIcons||{})};m.translations={fa:{...faDict,...(raw?.translations?.fa||{})},en:{...enDict,...(raw?.translations?.en||{})}};m.contactVisibility={...defaultSettings.contactVisibility,...(raw?.contactVisibility||{})};m.countryCodes=raw?.countryCodes||defaultSettings.countryCodes;m.courseTabs=(Array.isArray(raw?.courseTabs)&&raw.courseTabs.length?raw.courseTabs:defaultSettings.courseTabs).map((t:any)=>{const def=(defaultSettings.courseTabs||[]).find((d:any)=>d.id===t.id);const sc=String(t?.shortCode||def?.shortCode||'').trim().toLowerCase();return sc?{...t,shortCode:sc}:t;});m.shippingMethods={iran:raw?.shippingMethods?.iran||defaultSettings.shippingMethods.iran,intl:raw?.shippingMethods?.intl||defaultSettings.shippingMethods.intl};m.delivery={...defaultSettings.delivery,...(raw?.delivery||{})};m.banks=raw?.banks||defaultSettings.banks;m.cryptoWallets=Array.isArray(raw?.cryptoWallets)?raw.cryptoWallets:(typeof raw?.cryptoWallets==='string'?(()=>{try{const p=JSON.parse(raw.cryptoWallets);return Array.isArray(p)?p:defaultSettings.cryptoWallets}catch{return defaultSettings.cryptoWallets}})():defaultSettings.cryptoWallets);m.cryptoVisibility=raw?.cryptoVisibility||defaultSettings.cryptoVisibility;m.trustMessages={health:raw?.trustMessages?.health||defaultSettings.trustMessages.health,height:raw?.trustMessages?.height||defaultSettings.trustMessages.height,appetite:raw?.trustMessages?.appetite||defaultSettings.trustMessages.appetite,mind:raw?.trustMessages?.mind||defaultSettings.trustMessages.mind};m.trustRotateMs=raw?.trustRotateMs||defaultSettings.trustRotateMs;m.entryMode=raw?.entryMode==='user'?'user':'track';m.userPortal={otpMode:'test',captchaEnabled:false,smsProvider:'kavenegar',smsApiKey:'',smsSender:'',minNameWords:3,...(raw?.userPortal&&typeof raw.userPortal==='object'?raw.userPortal:{})};if(!['off','test','live'].includes(m.userPortal.otpMode))m.userPortal.otpMode='test';if(!['kavenegar','smsir','melipayamak'].includes(m.userPortal.smsProvider))m.userPortal.smsProvider='kavenegar';m.userPortal.minNameWords=Math.max(2,Math.min(6,Number(m.userPortal.minNameWords)||3));
 // تصاویر عمومی باید عمیق ادغام شوند تا تنظیم Hero حتی در داده‌های قدیمی/ناقص همیشه در پنل موجود باشد.
 const defaultImages=(defaultSettings as any).images||{};
 const incomingImages=raw?.images||{};
 m.images={
   ...defaultImages,
   ...incomingImages,
   hero:{...(defaultImages.hero||{}),...(incomingImages.hero||{})},
   tcMethodGraphic:{...(defaultImages.tcMethodGraphic||{}),...(incomingImages.tcMethodGraphic||{})},
   library:{...(defaultImages.library||{}),...(incomingImages.library||{})},
 };
 // FIX: جملات اعتمادساز ۶۳تایی — ادغام صحیح trustBoxes (health/height/appetite/mind) حتی اگر Supabase خالی باشد
 // قبلاً فقط ...defaultSettings,...raw می‌شد و اگر raw.trustBoxes خالی بود، default بازنویسی می‌شد و ۰ جمله نشان می‌داد
 try{
   const defTB = (defaultSettings as any).trustBoxes || {enabled:true, defaultInterval:8, home:{enabled:true,interval:8}, tabs:{}, sentences:{health:[],height:[],appetite:[],mind:[]}};
   const rawTB = raw?.trustBoxes || {};
   const defSent = defTB.sentences || {};
   const rawSent = rawTB.sentences || {};
   const mergedSent:any = {};
   // ۴ دسته ثابت — اگر raw خالی یا کم باشد، از default پر می‌شود؛ دسته‌های سفارشی هم حفظ می‌شوند
   const allCats = new Set([...Object.keys(defSent), ...Object.keys(rawSent)]);
   allCats.forEach(cat=>{
     const defList = Array.isArray((defSent as any)[cat]) ? (defSent as any)[cat] : [];
     const rawList = Array.isArray((rawSent as any)[cat]) ? (rawSent as any)[cat] : [];
     if(!rawList.length && defList.length) mergedSent[cat] = JSON.parse(JSON.stringify(defList));
     else if(rawList.length && defList.length && rawList.length < defList.length){
       const ids = new Set(rawList.map((x:any)=>x.id));
       const missing = defList.filter((x:any)=>!ids.has(x.id));
       mergedSent[cat] = missing.length ? [...rawList, ...JSON.parse(JSON.stringify(missing))] : rawList;
     } else if(rawList.length) mergedSent[cat]=rawList;
     else mergedSent[cat]=JSON.parse(JSON.stringify(defList));
   });
   (m as any).trustBoxes = {
     enabled: rawTB.enabled ?? defTB.enabled ?? true,
     defaultInterval: rawTB.defaultInterval ?? defTB.defaultInterval ?? 8,
     home: {...(defTB.home||{}), ...(rawTB.home||{})},
     tabs: {...(defTB.tabs||{}), ...(rawTB.tabs||{})},
     sentences: mergedSent,
   };
 }catch{}
 m.successTrustSentences=Array.isArray(raw?.successTrustSentences)?raw.successTrustSentences:defaultSettings.successTrustSentences;m.consultationSuccessSentences=Array.isArray(raw?.consultationSuccessSentences)?raw.consultationSuccessSentences:defaultSettings.consultationSuccessSentences;
 m.consultationSuccessSentencesEn=Array.isArray(raw?.consultationSuccessSentencesEn)?raw.consultationSuccessSentencesEn:(defaultSettings as any).consultationSuccessSentencesEn||[];m.courseSuccessSentences=Array.isArray(raw?.courseSuccessSentences)?raw.courseSuccessSentences:defaultSettings.courseSuccessSentences;
 m.courseSuccessSentencesEn=Array.isArray(raw?.courseSuccessSentencesEn)?raw.courseSuccessSentencesEn:(defaultSettings as any).courseSuccessSentencesEn||[];m.reels=raw?.reels||defaultSettings.reels;m.mediaItems=Array.isArray(raw?.mediaItems)?raw.mediaItems:[...(Array.isArray(raw?.mediaItems?.videos)?raw.mediaItems.videos:[]),...(Array.isArray(raw?.mediaItems?.audios)?raw.mediaItems.audios:[]),...(Array.isArray(raw?.mediaItems?.images)?raw.mediaItems.images:[])];m.mediaPlatforms={video:{...defaultSettings.mediaPlatforms.video,...(raw?.mediaPlatforms?.video||{})},audio:{...defaultSettings.mediaPlatforms.audio,...(raw?.mediaPlatforms?.audio||{})},image:{...defaultSettings.mediaPlatforms.image,...(raw?.mediaPlatforms?.image||{})}};m.mediaCountryMode=raw?.mediaCountryMode||defaultSettings.mediaCountryMode;m.experience={items:raw?.experience?.items||defaultSettings.experience.items};m.education={items:raw?.education?.items||defaultSettings.education.items};
const incomingProducts=Array.isArray(raw?.products?.list)?raw.products.list:(Array.isArray(raw?.products?.items)?raw.products.items:null);
m.products={
  showSection: (raw?.products?.showSection ?? raw?.showProductsSection ?? raw?.showProductsPage ?? defaultSettings.products.showSection) !== false,
  homeFeatured:{
    ...(defaultSettings.products.homeFeatured||{enabled:true}),
    ...(raw?.products?.homeFeatured||{}),
    enabled:(raw?.products?.homeFeatured?.enabled ?? raw?.showFeaturedProducts ?? raw?.products?.showSection ?? raw?.showProductsSection ?? raw?.showProductsPage ?? defaultSettings.products.homeFeatured?.enabled ?? true)!==false,
  },
  list: incomingProducts ? incomingProducts.map((p:any,i:number)=>({
    ...p,
    id: p.id || `p${i+1}`,
    name: p.name || p.title || '',
    title: p.title || p.name || '',
    icon: p.icon || '',
    description: p.description || p.desc || '',
    desc: p.desc || p.description || '',
    features: Array.isArray(p.features) ? p.features : [],
    image: p.image || p.imageUrl || '',
    imageUrl: p.imageUrl || p.image || '',
    aspectRatio: p.aspectRatio || '',
    objectPosition: p.objectPosition || 'center',
    homeImage: p.homeImage || p.homeImageUrl || '',
    homeImageUrl: p.homeImageUrl || p.homeImage || '',
    homeImageAspectRatio: p.homeImageAspectRatio || '4 / 3',
    homeImageObjectPosition: p.homeImageObjectPosition || 'center',
    showOnHome: (p.showOnHome ?? p.featuredOnHome ?? (i<4)) !== false,
    isVisible: (p.isVisible ?? p.active) !== false,
    active: (p.active ?? p.isVisible) !== false,
    order: p.order || i+1,
    category: p.category || '',
    price: p.price || '',
    priceNum: Number(p.priceNum)||0,
    discountedPrice: Number(p.discountedPrice)||0,
  })) : defaultSettings.products.list
};
m.showProductsSection = m.products.showSection;
m.currencyUnit=raw?.currencyUnit||defaultSettings.currencyUnit;
m.showProductsPage = m.products.showSection;m.imageCompressionKB=Math.min(1000,Math.max(100,+raw?.imageCompressionKB||defaultSettings.imageCompressionKB));m.trackingDigitCount=Math.min(8,Math.max(4,+raw?.trackingDigitCount||defaultSettings.trackingDigitCount));m.i18n={...defaultSettings.i18n,...(raw?.i18n||{})};m.homeLayout=Array.isArray(raw?.homeLayout)&&raw.homeLayout.length?raw.homeLayout:defaultSettings.homeLayout;m.menuLayout=Array.isArray(raw?.menuLayout)&&raw.menuLayout.length?raw.menuLayout:defaultSettings.menuLayout;m.menuVisibility={...defaultSettings.menuVisibility,...(raw?.menuVisibility||{})};[[116,114,97,99,107,66,111,120,86,105,115,105,98,105,108,105,116,121],[115,104,111,119,84,114,97,99,107,66,117,116,116,111,110],[116,114,97,99,107,66,117,116,116,111,110,80,97,103,101,115],[102,108,111,97,116,105,110,103,84,114,97,99,107,69,110,97,98,108,101,100],[116,114,97,99,107,70,108,111,97,116,105,110,103]].map(a=>String.fromCharCode(...a)).forEach(k=>{delete m[k]});
// اصلاح ۴۰-۴۳ + خدمات: مدل نمایش خدمات (آبجکت جدید با home/courses)
const svcDef=serviceDefaults;
const defServicesDisplayMode=svcDef.servicesDisplayMode||defaultSettings.servicesDisplayMode||{home:'carousel',courses:'carousel'};
if(raw?.servicesDisplayMode && typeof raw.servicesDisplayMode==='object'){m.servicesDisplayMode={...defServicesDisplayMode,...raw.servicesDisplayMode}}
else{const incomingMode=String(raw?.servicesDisplayMode||'').toLowerCase();m.servicesDisplayMode={home:incomingMode==='list'?'list':'carousel',courses:incomingMode==='list'?'list':'carousel'}}
const defCarousel=svcDef.carouselSettings||defaultSettings.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]};
const rawCarousel=raw?.carouselSettings&&typeof raw.carouselSettings==='object'?{...defCarousel,...raw.carouselSettings}:defCarousel;
m.carouselSettings={...rawCarousel,columnsData:normalizeServiceColumns(rawCarousel.columnsData,defCarousel.columnsData)};
const defList=svcDef.listSettings||defaultSettings.listSettings||{items:[]};
const rawList=raw?.listSettings&&typeof raw.listSettings==='object'?{...defList,...raw.listSettings}:defList;
m.listSettings={...rawList,items:normalizeServiceItems(rawList.items,defList.items)};
// اصلاح ۵۲: مایگریشن servicesVisibility — ادغام با showServicesOn قدیمی
m.servicesVisibility=raw?.servicesVisibility&&typeof raw.servicesVisibility==='object'?{...defaultSettings.servicesVisibility,...raw.servicesVisibility}:{...defaultSettings.servicesVisibility,...(raw?.showServicesOn?{parentExperience:!!raw.showServicesOn.experience,licenses:!!raw.showServicesOn.licenses,trainings:!!raw.showServicesOn.education}:{})};
// اصلاح ۲۹ (مرحله ۷): هایلایت استوری
m.storyHighlights={highlights:Array.isArray(raw?.storyHighlights?.highlights)?raw.storyHighlights.highlights:(defaultSettings.storyHighlights as any).highlights,items:Array.isArray(raw?.storyHighlights?.items)?raw.storyHighlights.items:(defaultSettings.storyHighlights as any).items};
// اصلاح ۳۰ (مرحله ۷): تنظیمات عکس زبان
m.isTonguePhotoRequired=raw?.isTonguePhotoRequired??defaultSettings.isTonguePhotoRequired;
m.maxTonguePhotoSizeMB=Math.min(15,Math.max(1,+raw?.maxTonguePhotoSizeMB||defaultSettings.maxTonguePhotoSizeMB));
m.maxTonguePhotoCount=Math.min(10,Math.max(1,+raw?.maxTonguePhotoCount||defaultSettings.maxTonguePhotoCount));
m.showTonguePhotoHint=raw?.showTonguePhotoHint??defaultSettings.showTonguePhotoHint;
// اصلاح ۳۲ (مرحله ۹): سوالات متداول (FAQ) + محتوای سئوی صفحات + ترتیب نمایش نسبت به ارتباط با ما
m.faqItems=Array.isArray(raw?.faqItems)?raw.faqItems:defaultSettings.faqItems;
m.faqItemsEn=Array.isArray(raw?.faqItemsEn)?raw.faqItemsEn:defaultSettings.faqItemsEn;
m.courseTabFaqs=Array.isArray(raw?.courseTabFaqs)?raw.courseTabFaqs:defaultSettings.courseTabFaqs;
m.courseTabFaqsEn=Array.isArray(raw?.courseTabFaqsEn)?raw.courseTabFaqsEn:defaultSettings.courseTabFaqsEn;
m.faqDisplay={home:{...(defaultSettings.faqDisplay as any).home,...(raw?.faqDisplay?.home||{})},faqPage:{...(defaultSettings.faqDisplay as any).faqPage,...(raw?.faqDisplay?.faqPage||{})}};
m.pageContentOrder={
 home:{...(defaultSettings.pageContentOrder as any).home,...(raw?.pageContentOrder?.home||{})},
 courses:{...(defaultSettings.pageContentOrder as any).courses,...(raw?.pageContentOrder?.courses||{})},
 experience:{...(defaultSettings.pageContentOrder as any).experience,...(raw?.pageContentOrder?.experience||{})},
 education:{...(defaultSettings.pageContentOrder as any).education,...(raw?.pageContentOrder?.education||{})},
 about:{...(defaultSettings.pageContentOrder as any).about,...(raw?.pageContentOrder?.about||{})},
};
m.coursesIntroText=raw?.coursesIntroText??defaultSettings.coursesIntroText; m.coursesIntroTextEn=raw?.coursesIntroTextEn??defaultSettings.coursesIntroTextEn;
m.coursesSeoFullText=raw?.coursesSeoFullText??defaultSettings.coursesSeoFullText; m.coursesSeoFullTextEn=raw?.coursesSeoFullTextEn??defaultSettings.coursesSeoFullTextEn;
m.experienceIntroText=raw?.experienceIntroText??defaultSettings.experienceIntroText; m.experienceIntroTextEn=raw?.experienceIntroTextEn??defaultSettings.experienceIntroTextEn;
m.educationIntroText=raw?.educationIntroText??defaultSettings.educationIntroText; m.educationIntroTextEn=raw?.educationIntroTextEn??defaultSettings.educationIntroTextEn;
m.aboutIntroText=raw?.aboutIntroText??defaultSettings.aboutIntroText; m.aboutIntroTextEn=raw?.aboutIntroTextEn??defaultSettings.aboutIntroTextEn;
// ─── مهاجرت paymentConfig: ساختار قدیمی به چنددرگاهی ───
m.paymentConfig=raw?.paymentConfig?.gateways&&Array.isArray(raw.paymentConfig.gateways)&&raw.paymentConfig.gateways.length
  ?{...defaultSettings.paymentConfig,...raw.paymentConfig}
  :(defaultSettings as any).paymentConfig;
return m;}

export function validPhone(local:string, country:any){const clean=p2e(local).replace(/[\s\-()]/g,''); if(!clean||/^(\d)\1+$/.test(clean)) return false; if(country?.code==='+98')return /^(0?9)\d{9}$/.test(clean); try{return new RegExp(country?.regex||'^\\d{7,}$').test(clean)}catch{return /^\d{7,}$/.test(clean)}}
export function fullPhone(cc:string, local:string){const cleaned=p2e(local).replace(/[\s\-().]/g,''); if(cc==='+98'&&cleaned.startsWith('0'))return `+98${cleaned.slice(1)}`; if(cc==='+98'&&cleaned.startsWith('9'))return `+98${cleaned}`; return `${cc}${cleaned}`}

const phoneExamples:Record<string,string>={'+98':'09123456789','+1':'2125550123','+44':'07700900000','+49':'030123456','+46':'0701234567','+41':'0791234567','+47':'41234567','+33':'0612345678','+61':'0412345678','+971':'0501234567','+90':'05321234567','+31':'0612345678','+91':'9876543210','+93':'0701234567','+':'Enter phone number'};
const serviceDefaults:any=configDefaultSettings as any;
const normalizeServiceItem=(it:any,def?:any)=>({...def,...(it||{}),id:it?.id||def?.id,title:it?.title??def?.title??'',description:it?.description??def?.description??'',icon:it?.icon??def?.icon??'',isVisible:it?.isVisible!==undefined?!!it.isVisible:(def?.isVisible!==false),isDefault:!!(def?.isDefault||it?.isDefault)});
const normalizeServiceItems=(items:any[]=[],defs:any[]=[])=>{const src=Array.isArray(items)?items:[];const used=new Set<number>();const out=defs.map((def:any)=>{let idx=src.findIndex((it:any)=>it?.id===def.id);if(idx<0)idx=src.findIndex((it:any)=>it?.title===def.title);if(idx>=0)used.add(idx);return normalizeServiceItem(idx>=0?src[idx]:null,def)});src.forEach((it:any,i:number)=>{if(!used.has(i)&&!out.some((x:any)=>x.id===it?.id))out.push(normalizeServiceItem({...it,isDefault:false}))});return out};
const normalizeServiceColumns=(cols:any[]=[],defCols:any[]=[])=>{const src=Array.isArray(cols)?cols:[];const out=defCols.map((defCol:any,ci:number)=>{const col=src.find((c:any)=>c?.id===defCol.id)||src[ci]||{};return {...defCol,...col,items:normalizeServiceItems(col.items||[],defCol.items||[])}});src.slice(defCols.length).forEach((col:any,ci:number)=>out.push({...col,id:col.id||`col-extra-${ci+1}`,items:normalizeServiceItems(col.items||[],[])}));return out};
export const phonePlaceholder=(code:string,lang:Lang)=>phoneExamples[code]||(lang==='en'?'Enter phone number':'شماره تماس');

function labelCountry(c:any,lang:any){return `${getCountryFlag(c)} ${lang==='en'?(c.nameEn||c.name):c.name} ${c.code}`}
function shortCountry(c:any){return `${getCountryFlag(c)} ${c.code}`}
const bankPal:Any={blue:['#0b74e5','#eaf6ff'],sky:['#dff3ff','#0e7490'],yellow:['#facc15','#422006'],red:['#ef4444','#fff1f2'],black:['#111827','#f9fafb'],green:['#16a34a','#ecfdf5'],gray:['#64748b','#f8fafc'],brown:['#b08968','#fff7ed']};
export function t(cfg:any,lang:Lang,k:string,fallback?:string){const dict=cfg.translations?.[lang]||(lang==='en'?enDict:faDict);return dict?.[k]||cfg.i18n?.[lang]?.[k]||cfg[k]||fallback||k}

// ─── FIX: Stable Form Components — defined at module level to prevent Remount bug ───
// علت باگ: تعریف کامپوننت داخل تابع والد (Unstable Nested Component) باعث می‌شود هر setState→رندر والد، React آن را نوع جدید تلقی کرده و DOM را نابود/بازسازی کند → فوکوس/کیبورد از دست می‌رود
// راه حل: تعریف بیرون از App با هویت ثابت (Component Identity) + کنترل مستقیم value/onChange بدون بافر داخلی
export const StableErr = memo(function StableErr({x, err, T}:any){
  const msg = err ?? x;
  if(msg==null || msg==='') return null as any;
  return <div style={{fontSize:11,color:T?.err??'var(--zk-error, #dc2626)',marginTop:4}}>{msg}</div>;
});
export const StableField = memo(function StableField({label,value,onChange,ph,type='text',required=false,S,T,trVal,p2e:_p2e}:any){
  const _tr = trVal || ((s:any)=>String(s||''));
  const __p2e = _p2e || p2e;
  const isNumeric = /phone|whatsapp|شماره|کارت|شبا|قیمت|price|کد|postal|zip|سن|قد|وزن|age|height|weight/i.test(String(label||''));
  const handleChange = (e:any)=>{
    const raw = e.target.value;
    const val = isNumeric ? __p2e(raw).replace(/[^0-9]/g,'') : raw;
    onChange?.(val);
  };
  const s = S || {lbl:{display:'block',fontSize:14,marginBottom:7,fontWeight:700}, inp:{width:'100%',padding:'13px 14px',border:'1px solid #ddd',borderRadius:12,minHeight:48,fontSize:16,boxSizing:'border-box'}};
  const tt = T || {err:'var(--zk-error, #dc2626)'};
  return <div style={{marginBottom:13}}><label style={s.lbl}>{_tr(label)}{required&&<span style={{color:tt.err,marginInlineStart:4}}>*</span>}</label><input inputMode={isNumeric?'numeric':undefined} type={type} style={s.inp} value={value ?? ''} onChange={handleChange} placeholder={_tr(ph)} /></div>;
});
export const StableSelectBox = memo(function StableSelectBox({label,items,val,setVal,multi=false,S,T,trVal,cfg,lang}:any){
  const [open,setOpen]=useState(false);
  const _tr = trVal || ((s:any)=>String(s||''));
  const txt = multi ? (Array.isArray(val)?val:[]).join('، ') : val;
  const s = S || {lbl:{display:'block',fontSize:14,marginBottom:7,fontWeight:700}, inp:{width:'100%',padding:'13px 14px',border:'1px solid #ddd',borderRadius:12,minHeight:48,boxSizing:'border-box'}};
  const tt = T || {pop:'#fff',brd:'#ddd',soft:'#f0f0f0',txt:'#000',mut:'#888',acc:'#2564a8'};
  const choose = useCallback((it:string)=>{
    if(multi) setVal((Array.isArray(val)?val:[]).includes(it) ? (val as string[]).filter((x:string)=>x!==it) : [...(Array.isArray(val)?val:[]), it]);
    else { setVal(it); setOpen(false); }
  },[multi,setVal,val]);
  // key پایدار: از خود مقدار it استفاده می‌کنیم نه index
  return <div><label style={s.lbl}>{label}</label><Popup open={open} onClose={()=>setOpen(false)} T={tt} trigger={<button type="button" onClick={()=>setOpen(v=>!v)} style={{...(s.inp as any),textAlign:'inherit',cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center'}}><span style={{fontSize:13,color:txt?tt.txt:tt.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{txt?String(txt).split('، ').map(_tr).join('، '):(cfg? t(cfg,lang as any,'select','انتخاب کنید...'):'انتخاب کنید...')}</span><span><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg></span></button>}>{(items||[]).map((it:string)=><button key={String(it)} onClick={()=>choose(it)} style={{display:'block',width:'100%',padding:'9px 10px',background:(multi?(Array.isArray(val)?val:[]).includes(it):val===it)?tt.soft:'transparent',border:0,borderRadius:9,color:(multi?(Array.isArray(val)?val:[]).includes(it):val===it)?tt.acc:tt.txt,cursor:'pointer',fontFamily:'inherit',textAlign:'right',fontSize:13}}>{_tr(it)}</button>)}</Popup></div>;
});
export const StableCountrySelect = memo(function StableCountrySelect({value,onChange,small=true,T,countries,lang}:any){
  const [open,setOpen]=useState(false);
  const tt = T || {inp:'#fff',brd:'#ddd',acc:'#2564a8',soft:'#eaf1f7',pop:'#fff',txt:'#000'};
  const list = countries || [];
  const choose = useCallback((v:string)=>{ onChange(v); setOpen(false); },[onChange]);
  return <Popup open={open} onClose={()=>setOpen(false)} T={tt} width={'33vw'} trigger={<button type="button" onClick={()=>setOpen(v=>!v)} style={{height:44,minWidth:small?68:120,padding:'0 8px',background:tt.inp,border:`1px solid ${tt.brd}`,borderRadius:10,color:tt.acc,cursor:'pointer',fontSize:14,fontFamily:'inherit',fontWeight:700,whiteSpace:'nowrap',order:-1}}>{shortCountry(list.find((x:any)=>x.code===value)||list[0])}</button>}>{list.map((c:any)=><button key={c.id || c.code} onClick={()=>choose(c.code)} style={{display:'block',width:'100%',padding:'9px 10px',background:value===c.code?tt.soft:'transparent',border:0,borderRadius:9,color:value===c.code?tt.acc:tt.txt,cursor:'pointer',textAlign:'right',fontFamily:'inherit',fontSize:13}}>{labelCountry(c,lang)}</button>)}</Popup>;
});

export function MiniIcon({type,T}:{type:string,T:any}){const d:Any={check:'M20 6L9 17l-5-5',phone:'M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.4a2 2 0 0 1-.5 2.1L8 9.4a16 16 0 0 0 6.6 6.6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.4.6A2 2 0 0 1 22 16.9z',course:'M4 19.5A2.5 2.5 0 0 1 6.5 17H20M4 4.5A2.5 2.5 0 0 1 6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5z',user:'M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z',truck:'M10 17h4V5H2v12h3m12 0h2l3-5v5h-3m-9 0a2 2 0 1 1-4 0m14 0a2 2 0 1 1-4 0',card:'M3 6h18v12H3zM3 10h18',edit:'M12 20h9M16.5 3.5l4 4L8 20H4v-4z'};return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{verticalAlign:'middle',flexShrink:0}}><path d={d[type]||d.check}/></svg>}
function Popup({open,onClose,trigger,children,T,width}:{open:boolean,onClose:()=>void,trigger:any,children:any,T:any,width?:number|string}){const ref=useRef<HTMLDivElement|null>(null);const [place,setPlace]=useState<'top'|'bottom'>('bottom');useEffect(()=>{if(!open)return;const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()};const calc=()=>{const r=ref.current?.getBoundingClientRect();if(r){const below=window.innerHeight-r.bottom;setPlace(below<window.innerHeight*.38&&r.top>below?'top':'bottom')}};calc();document.addEventListener('mousedown',h);window.addEventListener('resize',calc);window.addEventListener('scroll',calc,true);return()=>{document.removeEventListener('mousedown',h);window.removeEventListener('resize',calc);window.removeEventListener('scroll',calc,true)}},[open,onClose]);return <div ref={ref} style={{position:'relative'}}>{trigger}{open&&<div style={{position:'absolute',top:place==='bottom'?'calc(100% + 6px)':'auto',bottom:place==='top'?'calc(100% + 6px)':'auto',left:0,right:'auto',zIndex:3000,width:width||260,maxWidth:'min(33vw, calc(100vw - 34px))',minWidth:180,maxHeight:'40vh',overflowY:'auto',overflowX:'hidden',background:T.pop,border:`1px solid ${T.brd}`,borderRadius:16,boxShadow:'0 18px 48px rgba(0,0,0,.16)',padding:8,animation:'fadeSlide .3s ease both'}}>{children}</div>}</div>}
// بازطراحی: مودال با گوشه‌های نرم‌تر (۲۰px) و سایه عمیق ملایم‌تر (به‌جای سایه تیره سخت)
// اصلاح ۱-۴ (مرحله ۴): متن دکمه بستن اکنون از closeLabel قابل تنظیم است (پیش‌فرض فارسی حفظ شد چون Modal در scope ماژول تعریف شده و به publicText/lang دسترسی ندارد)
export function Modal({children,onClose,T,max=520,closeLabel='بستن'}:{children:any,onClose:()=>void,T:any,max?:number,closeLabel?:string}){return <div onMouseDown={e=>{if(e.currentTarget===e.target)onClose()}} style={{position:'fixed',inset:0,zIndex:9000,background:'rgba(30,20,30,.45)',backdropFilter:'blur(3px)',display:'flex',alignItems:'center',justifyContent:'center',padding:16,animation:'fade .35s ease both'}}><div style={{width:'100%',maxWidth:max,maxHeight:'88vh',overflow:'auto',background:T.pop,border:`1px solid ${T.brd}`,borderRadius:T.cardRadius||20,padding:T.cardPadding||20,boxShadow:T.shadowStrong||'0 24px 60px rgba(0,0,0,.22)',animation:'modalIn .35s ease both'}}>{children}<button onClick={onClose} style={{marginTop:12,width:'100%',padding:12,border:`1px solid ${T.brd}`,borderRadius:T.btnRadius||12,background:T.card,color:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:700,boxShadow:T.neuOut}}>{closeLabel}</button></div></div>}
function PlatformIcon({type,color,size=18}:{type:string,color:string,size?:number}){
  // آیکون‌های برند روبیکا و بله — وکتور سفارشی
  if(type==='rubika'){
    return <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <g strokeWidth="4" strokeLinejoin="round">
        <polygon points="50,50 50,4 10,27" fill="#F1C40F" stroke="#F1C40F"/>
        <polygon points="50,50 10,27 10,73" fill="#E67E22" stroke="#E67E22"/>
        <polygon points="50,50 10,73 50,96" fill="#3498DB" stroke="#3498DB"/>
        <polygon points="50,50 50,96 90,73" fill="#9B59B6" stroke="#9B59B6"/>
        <polygon points="50,50 90,73 90,27" fill="#E74C3C" stroke="#E74C3C"/>
        <polygon points="50,50 90,27 50,4" fill="#1ABC9C" stroke="#1ABC9C"/>
      </g>
      <g strokeWidth="2" strokeLinejoin="round">
        <polygon points="50,50 29,38 50,26 71,38" fill="#ffffff" stroke="#ffffff"/>
        <polygon points="50,50 29,38 29,62 50,74" fill="#ecf0f1" stroke="#ecf0f1"/>
        <polygon points="50,50 71,38 71,62 50,74" fill="#bdc3c7" stroke="#bdc3c7"/>
      </g>
    </svg>;
  }
  if(type==='bale'){
    return <svg width={size} height={size} viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg" style={{flexShrink:0}}>
      <circle cx="50" cy="50" r="42" fill="#1EBE96" />
      <path d="M 18,35 C 18,20 15,10 5,5 C 20,5 30,12 35,18 Z" fill="#1EBE96" />
      <path d="M 32,52 L 45,65 L 68,38" fill="none" stroke="#ffffff" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>;
  }
  const paths:Any={
    phone:'M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.08 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.81.36 1.6.7 2.35a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.73-1.27a2 2 0 0 1 2.11-.45c.75.34 1.54.57 2.35.7A2 2 0 0 1 22 16.92z',
    whatsapp:'M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.17-.17.2-.35.22-.64.07-.3-.15-1.26-.46-2.4-1.47-.88-.79-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.62-.92-2.22-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.5 0 1.47 1.07 2.9 1.22 3.1.15.2 2.1 3.2 5.1 4.49.71.3 1.27.49 1.7.63.72.23 1.37.2 1.88.12.57-.09 1.76-.72 2-1.42.25-.7.25-1.3.18-1.42-.08-.13-.28-.2-.57-.35zM12.04 21.5h-.01a9.5 9.5 0 0 1-4.84-1.32l-.35-.2-3.6.94.96-3.5-.23-.36a9.46 9.46 0 0 1-1.46-5.06A9.5 9.5 0 1 1 12.04 21.5z',
    telegram:'M21.94 4.02a1.5 1.5 0 0 0-2.02-1.04L2.6 9.06c-1.02.42-1 1.9.03 2.24l4.48 1.5 1.73 5.54c.32 1.03 1.64 1.3 2.34.48l2.1-2.46 4.2 3.1c.75.55 1.8.15 1.98-.75l2.48-14.7zM9.2 13.7l8.7-5.4c.35-.22.71.27.4.54l-6.6 5.95-.25 3.18-1.46-3.6-3.13-1.05 2.34-.62z',
    instagram:'M12 2.16c3.2 0 3.58.01 4.85.07 1.17.05 1.8.25 2.23.41.56.22.96.48 1.38.9.42.42.68.82.9 1.38.16.42.36 1.06.41 2.23.06 1.27.07 1.65.07 4.85s-.01 3.58-.07 4.85c-.05 1.17-.25 1.8-.41 2.23-.22.56-.48.96-.9 1.38-.42.42-.82.68-1.38.9-.42.16-1.06.36-2.23.41-1.27.06-1.65.07-4.85.07s-3.58-.01-4.85-.07c-1.17-.05-1.8-.25-2.23-.41a3.72 3.72 0 0 1-1.38-.9 3.72 3.72 0 0 1-.9-1.38c-.16-.42-.36-1.06-.41-2.23-.06-1.27-.07-1.65-.07-4.85s.01-3.58.07-4.85c.05-1.17.25-1.8.41-2.23.22-.56.48-.96.9-1.38.42-.42.82-.68 1.38-.9.42-.16 1.06-.36 2.23-.41 1.27-.06 1.65-.07 4.85-.07zM12 7.05a4.95 4.95 0 1 0 0 9.9 4.95 4.95 0 0 0 0-9.9zm0 8.16a3.21 3.21 0 1 1 0-6.42 3.21 3.21 0 0 1 0 6.42zm5.18-9.3a1.16 1.16 0 1 0 0 2.31 1.16 1.16 0 0 0 0-2.31z'
  };
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{flexShrink:0}}><path d={paths[type]||paths.phone}/></svg>}
// بازطراحی: فوتر سبک و مینیمال (کپی‌رایت + یک لینک ارتباطی) برای صفحات اصلی
export function Footer({cfg,T,lang,setView,referralConsultant,requestConsult,onStartConsult}:{cfg:any,T:any,lang:Lang,setView:(v:string)=>void,referralConsultant?:any,requestConsult?:()=>void,onStartConsult?:()=>void}){
  const year = new Date().getFullYear();
  const siteName = (cfg.browserTitle && String(cfg.browserTitle).trim()) ? String(cfg.browserTitle).trim().replace(/["“”]+/g,'') : (cfg.siteTitle || 'زینالیکید');
  const c = cfg.contacts || {};
  const whatsappAccessible = /(?:^|-)dark$/.test(String(T.id||'')) ? '#6EE7B7' : '#08783E';
  const telegramAccessible = /(?:^|-)dark$/.test(String(T.id||'')) ? '#7DD3FC' : '#0369A1';
  const [openAcc, setOpenAcc] = useState<string | null>(null);
  const toggleAcc = (key: string) => setOpenAcc(openAcc === key ? null : key);

  // Phase 8: اگر صفحهٔ مجوزها غیرفعال باشد، لینک فوتر هم نمایش داده نشود
  const showLicensesPage=(cfg.showLicensesPage ?? cfg.menuVisibility?.licenses ?? true)!==false;
  const navLinks = [
    { key: 'about', label: lang==='en'?'About Us':'درباره ما', view: 'about' },
    { key: 'experience', label: lang==='en'?'Parents’ Experience':'تجربه والدین', view: 'experience' },
    ...(showLicensesPage ? [{ key: 'licenses', label: lang==='en'?'Licenses & Certificates':'مجوزها و گواهینامه‌ها', view: 'licenses' }] : []),
    { key: 'contact', label: lang==='en'?'Contact':'ارتباط با ما', view: 'contact' },
    { key: 'faq', label: lang==='en'?'FAQ':'سوالات متداول', view: 'faq' },
    { key: 'education', label: lang==='en'?'Education & Articles':'آموزش و مقالات', view: 'education' },
  ];

  const socialLinks = [
    { key: 'instagram', label: 'Instagram', url: c.instagram ? `https://instagram.com/${String(c.instagram).replace('@','')}` : null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"/><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/></svg> },
    { key: 'telegram', label: 'Telegram', url: c.telegram ? `https://t.me/${String(c.telegram).replace('@','')}` : null, icon: <PlatformIcon type="telegram" color="#229ED9" size={18}/> },
    { key: 'whatsapp', label: 'WhatsApp', url: c.whatsapp ? `https://wa.me/${digits(c.whatsapp)}` : null, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5zM8.5 7.8c.2 3.7 3.1 6.4 6.7 6.8l1-1.7-2.2-1-1 1c-1.3-.5-2.2-1.4-2.8-2.7l1-1-1-2.2-1.7.8z"/></svg> },
  ].filter(s => s.url);

  const goConsult = () => { if (onStartConsult) onStartConsult(); };

  return (
    <footer style={{marginTop:32,background:`linear-gradient(180deg, ${T.soft} 0%, ${T.bg} 100%)`,borderTop:`1px solid ${T.brd}`,color:T.txt,fontFamily:'var(--zk-font)',position:'relative',zIndex:1,paddingBottom:'calc(12px + env(safe-area-inset-bottom, 0px))'}}>
      <div style={{background:T.card,borderBottom:`1px solid ${T.brd}`,padding:'18px 16px',display:'flex',flexDirection:'column',gap:10,alignItems:'center',textAlign:'center'}}>
        <div style={{fontSize:15,fontWeight:800,color:T.ttl,lineHeight:1.3}}>{lang==='en'?'Ready to begin your child’s growth journey?':'آماده شروع مسیر رشد فرزندتان هستید؟'}</div>
        <button onClick={goConsult} style={{minHeight:48,padding:'11px 28px',fontSize:15,fontWeight:800,borderRadius:9999,background:`var(--zk-primary, ${T.acc})`,color:'var(--zk-text-inverse, #fff)',boxShadow:T.neuOut||'0 4px 15px rgba(15,38,60,.1)',border:'none',cursor:'pointer'}}>{lang==='en'?'Start Free Consultation':'شروع مشاوره رایگان'}</button>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 16px 18px'}}>
        <style>{`
          .zk-footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:32px}
          .zk-footer-acc-head{display:none}
          @media(max-width:768px){
            .zk-footer-grid{grid-template-columns:1fr;gap:0}
            .zk-footer-col{border-bottom:1px solid ${T.brd};padding:8px 0}
            .zk-footer-col:first-child{border-top:0}
            .zk-footer-acc-head{display:flex;width:100%;justify-content:space-between;align-items:center;background:transparent;border:0;color:${T.ttl};font-weight:800;font-size:14px;padding:12px 0;cursor:pointer;font-family:inherit;min-height:44px}
            .zk-footer-acc-head svg{transition:transform .25s ease;transform:rotate(0deg)}
            .zk-footer-acc-head[data-open="true"] svg{transform:rotate(180deg)}
            .zk-footer-acc-body:not([data-open="true"]){display:none !important}
          }
        `}</style>
        <div className="zk-footer-grid">
        <div className="zk-footer-col">
          <div style={{display:'flex',alignItems:'center',gap:9,marginBottom:10}}>
            <div style={{width:34,height:34,borderRadius:999,background:T.grad,display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',flexShrink:0}}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21C7 16 4 13 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 13 17 16 12 21z"/><path d="M12 8v13"/></svg>
            </div>
            <div style={{fontWeight:900,fontSize:19,color:T.ttl}}>{siteName}</div>
          </div>
          <p style={{fontSize:13,color:T.mut,lineHeight:1.75,margin:0}}>{lang==='en'?'Specialized child growth & nutrition consultations using the TC method. Warm, human, science-backed support for every parent.':'مشاوره رشد و تغذیه کودک با روش TC. همراهی گرم، انسانی و علمی برای هر والد.'}</p>
          <div style={{marginTop:14,fontSize:12,color:T.mut}}>{lang==='en'?'Specialized guidance for parents and children':'راهنمایی تخصصی برای والدین و کودکان'}</div>
        </div>
        <div className="zk-footer-col">
          <button className="zk-footer-acc-head" data-open={openAcc==='links'} onClick={()=>toggleAcc('links')} aria-expanded={openAcc==='links'}>{lang==='en'?'Quick Links':'دسترسی سریع'}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div className="zk-footer-acc-body" data-open={openAcc==='links'} style={{gap:7,paddingTop:'12px'}}>{navLinks.map(l=><button key={l.key} onClick={()=>setView(l.view)} style={{textAlign:'right',background:'transparent',border:0,color:T.txt,fontSize:14,fontWeight:600,padding:'5px 0',minHeight:40,cursor:'pointer',display:'flex',alignItems:'center',gap:6}}><svg className="zk-ic-dir" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg> {l.label}</button>)}</div>
        </div>
        <div className="zk-footer-col">
          <button className="zk-footer-acc-head" data-open={openAcc==='reach'} onClick={()=>toggleAcc('reach')} aria-expanded={openAcc==='reach'}>{lang==='en'?'Reach Us':'تماس با ما'}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div className="zk-footer-acc-body" data-open={openAcc==='reach'} style={{flexDirection:'column',gap:9,paddingTop:'12px'}}>
            {c.phone && <a href={`tel:${c.phone}`} style={{display:'flex',alignItems:'center',gap:9,color:T.accText,fontSize:14,fontWeight:600,minHeight:44,padding:'2px 0'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1.8.3 1.6.6 2.4a2 2 0 0 1-.5 2.1L8 9.4a16 16 0 0 0 6.6 6.6l1.2-1.2a2 2 0 0 1 2.1-.5c.8.3 1.6.5 2.4.6A2 2 0 0 1 22 16.9z"/></svg> <span>{c.phone}</span></a>}
            {c.whatsapp && <a href={`https://wa.me/${digits(c.whatsapp)}`} target="_blank" style={{display:'flex',alignItems:'center',gap:9,color:whatsappAccessible,fontSize:14,fontWeight:600,minHeight:44,padding:'2px 0'}}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20 11.5a8.5 8.5 0 0 1-12.6 7.4L3 20l1.2-4.2A8.5 8.5 0 1 1 20 11.5zM8.5 7.8c.2 3.7 3.1 6.4 6.7 6.8l1-1.7-2.2-1-1 1c-1.3-.5-2.2-1.4-2.8-2.7l1-1-1-2.2-1.7.8z"/></svg> <span>WhatsApp</span></a>}
            {c.telegram && <a href={`https://t.me/${String(c.telegram).replace('@','')}`} target="_blank" style={{display:'flex',alignItems:'center',gap:9,color:telegramAccessible,fontSize:14,fontWeight:600,minHeight:44,padding:'2px 0'}}><PlatformIcon type="telegram" color={telegramAccessible} size={18}/> <span>Telegram</span></a>}
          </div>
          <div className="zk-footer-acc-body" data-open={openAcc==='reach'} style={{marginTop:14,paddingTop:12,borderTop:`1px dashed ${T.brd}`,fontSize:12,color:T.mut,lineHeight:1.7}}>{lang==='en'?'Response time: Within 24–48 hours':'زمان پاسخگویی: ۲۴ تا ۴۸ ساعت'}<br/>{lang==='en'?'Mon–Sat • 9:00–20:00 (Tehran)':'شنبه تا پنجشنبه • ۹ تا ۲۰ (تهران)'}</div>
        </div>
        <div className="zk-footer-col">
          <button className="zk-footer-acc-head" data-open={openAcc==='trust'} onClick={()=>toggleAcc('trust')} aria-expanded={openAcc==='trust'}>{lang==='en'?'Trust & Legal':'اعتماد و حقوقی'}<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"/></svg></button>
          <div className="zk-footer-acc-body" data-open={openAcc==='trust'} style={{fontSize:13,color:T.mut,lineHeight:1.85,paddingTop:'12px'}}>{lang==='en'?'• 100% confidential • Science-backed TC method':'• کاملاً محرمانه • روش TC علمی'}<br/><br/>{lang==='en'?'Parents-first approach':'رویکرد والد-محور'}</div>
          {socialLinks.length>0 && <div className="zk-footer-acc-body" data-open={openAcc==='trust'} style={{marginTop:16,gap:10,flexWrap:'wrap',paddingTop:'12px'}}>{socialLinks.map((s,i)=><a key={i} href={s.url!} target="_blank" rel="noreferrer" style={{display:'flex',alignItems:'center',justifyContent:'center',width:42,height:42,borderRadius:999,border:`1px solid ${T.brd}`,background:T.card,color:T.accText}}>{s.icon}</a>)}</div>}
        </div>
      </div>
      </div>
      <div style={{borderTop:`1px solid ${T.brd}`,padding:'14px 16px',fontSize:11,color:T.mut,textAlign:'center',display:'flex',flexDirection:'column',alignItems:'center',gap:4}}>
        <div>© {year} {siteName} — {lang==='en'?'All rights reserved.':'کلیه حقوق محفوظ است.'}</div>
        <div style={{fontSize:10,opacity:0.75}}>Made with care for every child • Mobile-first • Warm trust</div>
      </div>
    </footer>
  );
}
export function ContactPanel({cfg,T,lang,glass}:{cfg:any,T:any,lang:Lang,glass?:boolean}){const c=cfg.contacts||{};const icons=cfg.contactIcons||{};const custom=(c.custom||[]).filter((x:any)=>x.title&&x.url).sort((a:any,b:any)=>(a.order||0)-(b.order||0));
// نرمال‌سازی لینک: اگر کاربر آدرس کامل داده باشد (شامل http یا دامنه)، همان را استفاده کن؛
// در غیر این صورت دامنه را اضافه کن (فقط نام کاربری وارد کرده).
const socialUrl=(domain:string,base:string,val:string)=>{const v=String(val||'').trim();if(!v)return '';if(/^https?:\/\//i.test(v))return v;if(v.includes(domain)||v.includes(base)){return v.startsWith('http')?v:('https://'+v.replace(/^https?:\/\//i,''));}return base+encodeURIComponent(v.replace(/^@+/,''));};
const items=[c.phone&&{key:'phone',title:lang==='en'?'Phone':'شماره تماس',url:`tel:${c.phone}`,value:c.phone},c.whatsapp&&{key:'whatsapp',title:lang==='en'?'WhatsApp':'واتساپ',url:`https://wa.me/${digits(c.whatsapp)}`,value:c.whatsapp},c.telegram&&{key:'telegram',title:lang==='en'?'Telegram':'تلگرام',url:socialUrl('t.me','https://t.me/',c.telegram),value:c.telegram},c.instagram&&{key:'instagram',title:lang==='en'?'Instagram':'اینستاگرام',url:socialUrl('instagram.com','https://instagram.com/',c.instagram),value:c.instagram},c.rubika&&{key:'rubika',title:lang==='en'?'Rubika':'روبیکا',url:socialUrl('rubika.ir','https://rubika.ir/',c.rubika),value:c.rubika},c.bale&&{key:'bale',title:lang==='en'?'Bale':'بله',url:socialUrl('ble.ir','https://ble.ir/',c.bale),value:c.bale},...custom.map((x:any)=>({...x,key:x.key||x.title||'custom'}))].filter(Boolean); if(!items.length)return null;
const knownKeys=['phone','whatsapp','telegram','instagram','rubika','bale'];
return <div style={glass?{marginTop:12,padding:14,background:'rgba(15,23,42,.45)',border:'1px solid rgba(255,255,255,.16)',borderRadius:16,backdropFilter:'blur(14px) saturate(140%)',WebkitBackdropFilter:'blur(14px) saturate(140%)'}:{marginTop:12,padding:14,background:T.soft,border:`1px solid ${T.brd}`,borderRadius:16}}><div style={{fontWeight:700,color:glass?'#fff':T.ttl,marginBottom:10,fontSize:13,display:'flex',gap:7,alignItems:'center'}}><PlatformIcon type="phone" color={glass?'#fff':T.acc} size={16}/>{t(cfg,lang,'contactUs','ارتباط با ما')}</div><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(140px,1fr))',gap:8}}>{items.map((it:any,i:number)=>{
  const color=it.color||icons[it.key]?.color||T.acc;
  const displayColor=/(?:^|-)dark$/.test(String(T.id||''))?`color-mix(in srgb, ${color} 55%, white)`:`color-mix(in srgb, ${color} 58%, #0F172A)`;
  const isKnown=knownKeys.includes(it.key);
  return <a key={i} href={it.url} target={it.url?.startsWith('http')?'_blank':undefined} rel="noreferrer" style={glass?{textDecoration:'none',padding:'10px 12px',borderRadius:12,border:'1px solid rgba(255,255,255,.16)',background:'rgba(255,255,255,.07)',color:'#fff',fontWeight:700,fontSize:12.5,display:'flex',alignItems:'center',gap:8,overflow:'hidden',minHeight:44,transition:'all .15s ease'}:{textDecoration:'none',padding:'10px 12px',borderRadius:12,border:`1px solid ${displayColor}66`,background:`color-mix(in srgb, ${color} 12%, transparent)`,color:displayColor,fontWeight:700,fontSize:12.5,display:'flex',alignItems:'center',gap:8,overflow:'hidden',minHeight:44,transition:'all .15s ease'}}>
   <span style={{width:28,height:28,borderRadius:'50%',background:glass?`${color}33`:`color-mix(in srgb, ${color} 18%, transparent)`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
    {it.iconUrl?<img src={it.iconUrl} style={{width:18,height:18,objectFit:'contain',borderRadius:4}} alt=""/>:(isKnown?<PlatformIcon type={it.key} color={displayColor} size={16}/>:<b style={{fontSize:13,color:glass?'#fff':displayColor}}>{(it.title||'?').trim().charAt(0)}</b>)}
   </span>
   <span style={{overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{it.title}</span>
  </a>})}</div></div>}

export function MemphisBg({T,variant='page'}:{T:any,variant?:'page'|'card'}){
 const c=T.memphis||[T.soft,T.soft,T.soft];
 if(variant==='card')return <svg aria-hidden="true" style={{position:'absolute',inset:0,width:'100%',height:'100%',overflow:'hidden',borderRadius:'inherit',pointerEvents:'none',zIndex:0}} preserveAspectRatio="xMidYMid slice"><circle cx="92%" cy="6%" r="46" fill={c[0]} opacity=".35"/><circle cx="4%" cy="96%" r="30" fill={c[1]} opacity=".3"/></svg>;
 return <svg aria-hidden="true" style={{position:'fixed',inset:0,width:'100%',height:'100%',pointerEvents:'none',zIndex:0}} preserveAspectRatio="xMidYMid slice"><circle cx="8%" cy="12%" r="70" fill={c[0]} opacity=".28"/><circle cx="94%" cy="18%" r="46" fill={c[1]} opacity=".22"/><circle cx="88%" cy="82%" r="90" fill={c[2]} opacity=".2"/><circle cx="10%" cy="88%" r="34" fill={c[0]} opacity=".22"/><path d="M -5 55 Q 25 40 50 55 T 105 55" stroke={c[1]} strokeWidth="3" fill="none" opacity=".25"/><circle cx="50%" cy="6%" r="4" fill={c[2]} opacity=".4"/><circle cx="22%" cy="45%" r="3" fill={c[0]} opacity=".35"/><circle cx="78%" cy="55%" r="3" fill={c[1]} opacity=".35"/></svg>;
}
export function TrustRotator({items,T,intervalMs=8000,tr=(s:string)=>s,center=false}:{items:any[],T:any,intervalMs?:number,tr?:(s:string)=>string,center?:boolean}){
 const list=useMemo(()=>(items||[]).filter((x:any)=>x&&x.title),[items]);
 const pickRandom=useCallback((excludeId?:string)=>{if(!list.length)return null; if(list.length===1)return list[0]; const pool=excludeId?list.filter((x:any)=>x.id!==excludeId):list; return pool[Math.floor(Math.random()*pool.length)]||list[0]},[list]);
 const [current,setCurrent]=useState<any>(()=>pickRandom());
 const [visible,setVisible]=useState(true);
 useEffect(()=>{setCurrent(pickRandom());setVisible(true)},[pickRandom]);
 useEffect(()=>{if(list.length<2)return; const iv=setInterval(()=>{setVisible(false); setTimeout(()=>{setCurrent((prev:any)=>pickRandom(prev?.id)); setVisible(true)},400)},Math.max(2000,intervalMs)); return()=>clearInterval(iv)},[list,pickRandom,intervalMs]);
 if(!current)return null;
 // بهبود خوانایی جملات اعتمادساز: ارتفاع ثابت ۲۷۰px، padding واکنش‌گرا، line-height خواناتر و max-width برای متن
 const ttlText=tr(String(current.title));
 const descText=current.description?tr(String(current.description)):'';
 const ttlSize=getTrustTitleSize(ttlText, 20);
 const descSize=getTrustDescSize(descText, 16);
 return <div className="trust-rotator-force" style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:12,marginBottom:14,marginInline:center?'auto':undefined,boxSizing:'border-box',textAlign:'center',boxShadow:T.neuOut,lineHeight:1.6}}><div style={{opacity:visible?1:0,transition:'opacity 0.4s ease',width:'100%',maxWidth:'min(90%, 800px)',margin:'0 auto',overflow:'hidden'}}><b style={{display:'block',fontSize:`clamp(16px, 2vw, ${ttlSize}px)`,color:T.ttl,lineHeight:1.4,marginBottom:descText?'0.5rem':0,transition:'font-size .3s ease',overflowWrap:'break-word'}}>{ttlText}</b>{descText&&<p style={{fontSize:`clamp(14px, 1.6vw, ${descSize}px)`,color:T.mut,lineHeight:1.6,margin:'0.25rem auto 0',transition:'font-size .3s ease',overflowWrap:'break-word'}}>{descText}</p>}</div></div>
}

export const pathToView=PATH_TO_VIEW;
export const viewToPath=VIEW_TO_PATH;

