// --- مدیریت دیزاین (مرحله  - بازطراحی تدریجی) ---

import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { isSupabaseConfigured, fetchSubmissions, updateSubmission, softDeleteMultipleSubmissions } from '../lib/supabase';
import { productVectorIcon, AdminIcon, MenuIcon, ProductsIcon, CoursesIcon, ContactIcon, EducationIcon, LicensesIcon, SearchIcon, ChatIcon, BoxIcon } from '../components/Icons';
import TrashPanel from './TrashPanel';
import AnalyticsPanel from './AnalyticsPanel';
import { defaultSettings as configDefaultSettings } from '../config/defaultSettings';

type Any=Record<string,any>;
const SK={settings:'zkid_settings_v2', subs:'zkid_submissions_v2'};
const ENV_ADMIN_PASSWORD=(import.meta.env.VITE_ADMIN_PASSWORD as string|undefined)||'';
const p2e=(s:any)=>String(s??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString());
const digits=(s:any)=>p2e(s).replace(/[^0-9]/g,'');
const uid=()=>Date.now()+Math.floor(Math.random()*9999);
const getLS=(k:string,f:any)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
const setLS=(k:string,v:any)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch{}};

const normRange=(age:any,g:any)=>{const t:any={2:{m:[78,85,92,9,12,15],f:[77,84,91,9,12,14]},3:{m:[88,95,103,11,14,18],f:[86,94,102,11,14,17]},4:{m:[95,103,111,12,16,21],f:[94,102,110,12,16,20]},5:{m:[102,110,118,13,18,23],f:[100,108,117,13,18,23]},6:{m:[107,116,126,15,21,27],f:[106,115,125,14,20,26]},7:{m:[112,122,132,16,23,30],f:[111,122,132,15,22,30]},8:{m:[116,127,138,16,25,35],f:[116,127,139,15,25,35]},9:{m:[121,133,144,17,28,39],f:[121,133,145,16,29,41]},10:{m:[126,138,150,19,32,45],f:[126,139,152,18,33,47]},11:{m:[130,144,157,20,36,51],f:[131,145,159,20,37,54]},12:{m:[134,149,164,22,40,58],f:[138,152,166,23,42,60]},13:{m:[141,156,172,24,45,66],f:[142,155,168,26,46,66]},14:{m:[149,163,178,28,51,73],f:[146,158,171,29,50,71]},15:{m:[156,169,182,34,57,80],f:[148,160,172,32,53,73]},16:{m:[160,173,186,39,62,84],f:[149,161,172,33,54,75]},17:{m:[163,175,187,43,65,87],f:[149,161,173,34,55,76]}};const a=Math.min(17,Math.max(2,Math.round(+p2e(age)||2)));const d=t[a]?.[g==='male'?'m':'f'];return d?{hMin:d[0],hMed:d[1],hMax:d[2],wMin:d[3],wMed:d[4],wMax:d[5]}:null};
const growthStatus=(val:number,min:number,med:number,max:number)=>{const sd=(max-min)/4;if(val>=min+sd&&val<=max-sd)return {label:'نرمال',color:'#22c55e'};if(val>=min&&val<=max)return {label:'نزدیک به مرز',color:'#f97316'};const diff=val<min?min-val:val-max;if(diff<=sd*1.5)return {label:val<min?'زیر نرمال':'بالای نرمال',color:'#f97316'};return {label:val<min?'خیلی زیر نرمال':'خیلی بالای نرمال',color:'#ef4444'}};

const scrollFocusStable=(e:any)=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)};
const StableAdminInput = memo(function StableAdminInput({defaultValue='',onCommit,placeholder='',style,numeric=false,type='text',inputMode,onEnter}:any){
  const ref=useRef<HTMLInputElement|null>(null);
  const handleChange=useCallback((e:any)=>{ if(numeric) e.target.value=p2e(e.target.value); },[numeric]);
  const commit=useCallback(()=>onCommit?.(ref.current?.value||''),[onCommit]);
  const keyDown=useCallback((e:any)=>{ if(e.key==='Enter'){ commit(); onEnter?.(ref.current?.value||''); } },[commit,onEnter]);
  return <input ref={ref} type={type} defaultValue={defaultValue} onChange={handleChange} onBlur={commit} onFocus={scrollFocusStable} onKeyDown={keyDown} inputMode={inputMode||(numeric?'numeric':undefined)} style={style} placeholder={placeholder}/>;
});

function Popup({open,onClose,trigger,children,T,width}:{open:boolean,onClose:()=>void,trigger:any,children:any,T:any,width?:number|string}){const ref=useRef<HTMLDivElement|null>(null);const [place,setPlace]=useState<'top'|'bottom'>('bottom');useEffect(()=>{if(!open)return;const h=(e:MouseEvent)=>{if(ref.current&&!ref.current.contains(e.target as Node))onClose()};const calc=()=>{const r=ref.current?.getBoundingClientRect();if(r){const below=window.innerHeight-r.bottom;setPlace(below<window.innerHeight*.38&&r.top>below?'top':'bottom')}};calc();document.addEventListener('mousedown',h);window.addEventListener('resize',calc);window.addEventListener('scroll',calc,true);return()=>{document.removeEventListener('mousedown',h);window.removeEventListener('resize',calc);window.removeEventListener('scroll',calc,true)}},[open,onClose]);return <div ref={ref} style={{position:'relative'}}>{trigger}{open&&<div style={{position:'absolute',top:place==='bottom'?'calc(100% + 6px)':'auto',bottom:place==='top'?'calc(100% + 6px)':'auto',left:0,right:'auto',zIndex:3000,width:width||260,maxWidth:'min(33vw, calc(100vw - 34px))',minWidth:180,maxHeight:'40vh',overflowY:'auto',overflowX:'hidden',background:T.pop,border:`1px solid ${T.brd}`,borderRadius:16,boxShadow:'0 18px 48px rgba(0,0,0,.16)',padding:8,animation:'fadeSlide .3s ease both'}}>{children}</div>}</div>}

export default function AdminPanel({app}:{app:any}){
 const {cfg,saveCfg,mergeSettings,T,S,css,lang,goToAppA,onLogout,fileToData,deleteStoredImage,uploadPdfFile,deleteStoredFile,deleteStoredTonguePhoto,PROFILE_PHOTO,TH,Modal}=app;
 // FIX: Preserve <details> open state, scroll position, and focus across re-renders
 const _openDetails=useRef<Set<string>>(new Set());
 const _scrollPos=useRef(0);
 const _activeEl=useRef<{tag:string,label:string,ph:string}|null>(null);
 const _detailsKey=(d:Element)=>{
  const s=(d.querySelector('summary')?.textContent||'').replace(/\s*\(\d+\)\s*$/,'').trim().substring(0,80);
  return s;
 };
 useEffect(()=>{
  const h=(e:Event)=>{
   const d=e.target as HTMLDetailsElement;
   const s=_detailsKey(d);
   if(s){if(d.open)_openDetails.current.add(s);else _openDetails.current.delete(s)}
  };
  document.addEventListener('toggle',h,true);
  return()=>document.removeEventListener('toggle',h,true);
 },[]);
 useLayoutEffect(()=>{
  const m=document.querySelector('.admin-main')as HTMLElement|null;
  if(m)_scrollPos.current=m.scrollTop;
 });
 useEffect(()=>{
  const saveFocus=(e:Event)=>{
   const t=e.target as HTMLElement;
   if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')){
    _activeEl.current={tag:t.tagName,label:(t.closest('div')?.querySelector('label')?.textContent||'').trim().substring(0,60),ph:t.getAttribute('placeholder')||''};
   }
  };
  document.addEventListener('focusin',saveFocus,true);
  return()=>document.removeEventListener('focusin',saveFocus,true);
 },[]);
 useLayoutEffect(()=>{
  const m=document.querySelector('.admin-main')as HTMLElement|null;
  if(m&&_scrollPos.current>0)m.scrollTop=_scrollPos.current;
  document.querySelectorAll('.admin-main details').forEach(d=>{
   const s=_detailsKey(d);
   if(_openDetails.current.has(s))(d as HTMLDetailsElement).open=true;
  });
  if(_activeEl.current){
   const els=document.querySelectorAll('.admin-main '+_activeEl.current.tag.toLowerCase());
   for(let i=0;i<els.length;i++){
    const el=els[i]as HTMLElement;
    const lbl=(el.closest('div')?.querySelector('label')?.textContent||'').trim().substring(0,60);
    const ph=el.getAttribute('placeholder')||'';
    if(lbl===_activeEl.current!.label&&ph===_activeEl.current!.ph){
     el.focus();
     if(el.tagName==='INPUT'||el.tagName==='TEXTAREA'){
      const len=(el as HTMLInputElement).value.length;
      (el as HTMLInputElement).setSelectionRange(len,len);
     }
     break;
    }
   }
  }
 });

 const goHome=()=>{try{app.setView('home')}catch{goToAppA()}};
 const [subs,setSubsState]=useState<any[]>(()=>getLS(SK.subs,[]));
 const subsRef=useRef<any[]>(subs); subsRef.current=subs;
 const [loadingSubs,setLoadingSubs]=useState(false);
 useEffect(()=>{let alive=true; if(isSupabaseConfigured){setLoadingSubs(true); fetchSubmissions().then(list=>{if(alive){setSubsState(list||[])}}).catch(e=>console.warn('Could not load submissions from Supabase',e)).finally(()=>{if(alive)setLoadingSubs(false)})} return()=>{alive=false}},[]);
 const setSubs=useCallback((updater:any)=>{setSubsState(prev=>{const next=typeof updater==='function'?updater(prev):updater; const removedSubs=prev.filter((x:any)=>!next.some((y:any)=>y.id===x.id)); if(isSupabaseConfigured){try{const prevById=new Map(prev.map((x:any)=>[x.id,x])); if(removedSubs.length)softDeleteMultipleSubmissions(removedSubs.map((x:any)=>x.id)).catch(e=>console.warn('soft delete failed',e)); next.forEach((x:any)=>{const p=prevById.get(x.id); if(p&&p!==x)updateSubmission(x.id,x).catch(e=>console.warn('update failed',e))})}catch(e){console.warn(e)}}else{setLS(SK.subs,next); if(removedSubs.length){const now=new Date().toISOString(); removedSubs.forEach((x:any)=>{if(x?.payment?.receipt)deleteStoredImage(x.payment.receipt).catch(()=>{})}); const trash=getLS('zkid_trash_v1',[]); setLS('zkid_trash_v1',[...trash,...removedSubs.map((x:any)=>({...x,deleted_at:now,payment:x?.payment?.receipt?{...x.payment,receipt:'',receipt_image:'',receiptDeletedAt:now}:x.payment}))])}} if(removedSubs.length)setTrashKey(k=>k+1); return next})},[]);
 // اصلاح ۳-د: اگر فرم مشاوره‌ای بیش از ۱ روز در وضعیت «مشاوره شده» مانده باشد، به‌طور خودکار به «پیگیری» منتقل می‌شود (فقط یک‌بار در بارگذاری پنل بررسی می‌شود، بدون تداخل با ویرایش دستی هم‌زمان)
 useEffect(()=>{const now=Date.now(); const changed:any[]=[]; subs.forEach((x:any)=>{if(x.type==='consultation'&&x.consultationStatus==='مشاوره شده'&&x.consultationStatusChangedAt){const t=Date.parse(x.consultationStatusChangedAt); if(!isNaN(t)&&(now-t)>24*60*60*1000)changed.push(x.id)}}); if(changed.length)setSubs((list:any[])=>list.map(x=>changed.includes(x.id)?{...x,consultationStatus:'پیگیری',consultationStatusChangedAt:new Date().toISOString(),category:'پیگیری',changeHistory:logChange(x,'انتقال خودکار به پیگیری (بیش از ۱ روز از مشاوره‌شده)')}:x))},[subs.length]);
 const [editCfg,setEditCfgRaw]=useState<any|null>(null); const [msg,setMsg]=useState(''); const [trashKey,setTrashKey]=useState(0);
 const setEditCfg=useCallback((u:any)=>{setTimeout(()=>setEditCfgRaw(u as any),0)},[]);
 const [sidebarOpen,setSidebarOpen]=useState(false);
 const [aTab,setATab]=useState('dashboard'); const [settingsSubTab,setSettingsSubTab]=useState<'secondary'|'primary'|'layout'|'translations'>('secondary'); const [srch,setSrch]=useState(''); const [debouncedSrch,setDebouncedSrch]=useState(''); const [catF,setCatF]=useState('همه'); const [dateF,setDateF]=useState(''); const [countryF,setCountryF]=useState('همه'); const [courseF,setCourseF]=useState('همه'); const [payF,setPayF]=useState('همه'); const [statusF,setStatusF]=useState('همه'); const [page,setPage]=useState(1); const [expId,setExpId]=useState<any>(null);
 useEffect(()=>{const t=setTimeout(()=>setDebouncedSrch(srch),300);return()=>clearTimeout(t)},[srch]);
 // اصلاح ۹: رفع کامل مشکل پرش صفحه در پنل مدیریت — فیلد فوکوس‌شده به‌جای پرش ناگهانی مرورگر،
 // با اسکرول نرم (smooth) به مرکز دید (center) منتقل می‌شود. این افکت روی همه ورودی‌های
 // پنل مدیریت (شامل SubCard، SettingsEditor و سایر ادیتورها) به‌صورت سراسری اعمال می‌شود.
 useEffect(()=>{const h=(e:Event)=>{const t=e.target as HTMLElement;if(t&&(t.tagName==='INPUT'||t.tagName==='TEXTAREA'||t.tagName==='SELECT')&&t.closest('.admin-main')){setTimeout(()=>{try{t.scrollIntoView({behavior:'smooth',block:'center'})}catch{}},300)}};document.addEventListener('focusin',h);return()=>document.removeEventListener('focusin',h)},[]);
 const setSave=(next:any)=>{saveCfg(next);setMsg('ذخیره شد');setTimeout(()=>setMsg(''),2200)};
 const subTime=(x:any)=>{if(x?.created_at){const t=Date.parse(x.created_at);if(!isNaN(t))return t} return typeof x?.id==='number'?x.id:0};
 // اصلاح ۳-الف: یادآور پیگیری فقط وقتی نمایش داده می‌شود که بیش از ۳ روز گذشته، هیچ پیگیری‌ای ثبت نشده، و فرم از قبل در دسته «پیگیری» یا «پیگیری آخر ماه» نباشد (چون آن‌ها خودشان قبلاً وارد چرخه پیگیری شده‌اند)
 const needsReminder=(x:any)=>{if(!x?.followReminder)return false; const fu=x.followUps||[]; if(fu.some((f:any)=>f!==null))return false; if(x.category==='پیگیری'||x.category==='آخر ماه'||x.consultationStatus==='پیگیری'||x.consultationStatus==='پیگیری آخر ماه')return false; const t=subTime(x); return t>0&&(Date.now()-t)>3*24*60*60*1000};
 const logChange=(x:any,what:string)=>[...(x.changeHistory||[]),{by:'مدیر',at:new Date().toLocaleString('fa-IR'),what}];

 // بازطراحی: دکمه‌های پنل مدیریت با border-radius:14px و سایه نئومورفیک نرم (به‌جای بردر ساده) — کاربردپذیری/رفتار بدون تغییر
 function AdminBtn(){return {minHeight:44,padding:'9px 14px',border:'none',background:T.card,borderRadius:12,color:T.acc,cursor:'pointer',fontSize:13,fontWeight:700,fontFamily:'inherit',boxShadow:T.neuOut,transition:'all .25s ease'} as any}
 function Err({x}:{x:any}){return <div style={{fontSize:11,color:T.err,marginTop:4}}>{x}</div>}
 function Tag({x}:{x:string}){return <span style={{fontSize:10,padding:'3px 7px',borderRadius:12,background:T.soft,color:T.acc,border:`1px solid ${T.brd}`}}>{x}</span>}
 const scrollFocus=useCallback((e:any)=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)},[]);
const Field=useMemo(()=>memo(function MemoField({label,value,onChange,ph,type='text',required=false}:any){const [local,setLocal]=useState(value??'');const inputRef=useRef<HTMLInputElement|null>(null);const isNumeric=/phone|whatsapp|شماره|کارت|شبا|قیمت|price|کد|postal|zip|سن|قد|وزن|age|height|weight/i.test(String(label||''));useEffect(()=>setLocal(value??''),[value]);const handle=useCallback((e:any)=>setLocal(isNumeric?p2e(e.target.value):e.target.value),[isNumeric]);const commit=useCallback(()=>onChange(isNumeric?p2e(local):local),[onChange,local,isNumeric]);return <div style={{marginBottom:13}}><label style={S.lbl}>{label}{required&&<span style={{color:T.err,marginInlineStart:4}}>*</span>}</label><input ref={inputRef} inputMode={isNumeric?'numeric':undefined} type={type} style={S.inp} value={local} onChange={handle} onBlur={commit} onFocus={scrollFocus} placeholder={ph}/></div>}),[S,T.err,scrollFocus]);

 function Admin(){
  // اصلاح ۱: state برای مودال «فرم‌های دیگر با این شماره تماس»
  const [modalSub,setModalSub]=useState<any>(null);
  const statusOptions=['جدید','در انتظار پرداخت','پرداخت‌شده','ارسال‌شده','تکمیل‌شده','لغو‌شده'];
  const getStatus=(x:any)=>x.orderStatus||(x.payment?.receipt?'پرداخت‌شده':x.course?'در انتظار پرداخت':x.isNew?'جدید':'جدید');
  const getCountry=(x:any)=>x.shipping?.country||(x.shipping?.dest==='iran'?'ایران':x.cc==='+98'?'ایران':x.cc||'—');
  const getCourse=(x:any)=>x.course?.title||'بدون دوره';
  const getPay=(x:any)=>x.payment?.receipt?'پرداخت‌شده':x.course?'در انتظار پرداخت':'بدون پرداخت';
  const cats=['همه',...(cfg.categories||[])];
  const countriesF=['همه',...Array.from(new Set(subs.map(getCountry).filter(Boolean)))];
  const coursesF=['همه',...Array.from(new Set(subs.map(getCourse).filter(Boolean)))];
  const payOptions=['همه','پرداخت‌شده','در انتظار پرداخت','بدون پرداخت'];
  const hay=(s:any)=>[s.pName,s.fullPhone,s.trackingCode,(s.topics||[]).join(' '),s.course?.title,s.course?.titleEn,s.shipping?.city,s.shipping?.country,s.shipping?.address,s.category,getStatus(s)].join(' ').toLowerCase();
  const pageSize=50,totalPages=Math.max(1,Math.ceil(subs.length/pageSize)); const safePage=Math.min(page,totalPages); const currentPageRaw=subs.slice((safePage-1)*pageSize,safePage*pageSize);
  const filtered=currentPageRaw.filter(s=>(catF==='همه'||s.category===catF)&&(!dateF||String(s.date||'').includes(dateF))&&(countryF==='همه'||getCountry(s)===countryF)&&(courseF==='همه'||getCourse(s)===courseF)&&(payF==='همه'||getPay(s)===payF)&&(statusF==='همه'||getStatus(s)===statusF)&&(!debouncedSrch||hay(s).includes(debouncedSrch.toLowerCase())));
  const groups=(()=>{const byPhone=new Map<string,any[]>();const singles:any[]=[];filtered.forEach(s=>{const key=digits(s.fullPhone||'');if(!key){singles.push({head:s,children:[]});return}if(!byPhone.has(key))byPhone.set(key,[]);byPhone.get(key)!.push(s)});const out:any[]=[...singles];byPhone.forEach(list=>{const sorted=[...list].sort((a,b)=>subTime(a)-subTime(b));out.push({head:sorted[0],children:sorted.slice(1)})});const latest=(g:any)=>Math.max(subTime(g.head),...g.children.map((c:any)=>subTime(c)));return out.sort((a,b)=>latest(b)-latest(a))})();
  const rows=filtered.map(s=>({نام:s.pName||'',شماره:s.fullPhone||'',موضوع:(s.topics||[]).join('|'),کشور:getCountry(s),دوره:getCourse(s),پرداخت:getPay(s),وضعیت:getStatus(s),تاریخ:s.date||'',شهر:s.shipping?.city||'',یادداشت:s.adminNotes||''}));
  const download=(name:string,content:string,type='text/plain;charset=utf-8')=>{const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),500)};
  const exportExcel=()=>{const keys=Object.keys(rows[0]||{نام:'',شماره:'',موضوع:'',کشور:'',دوره:'',پرداخت:'',وضعیت:'',تاریخ:''});const html=`<html><meta charset="utf-8"><body><table border="1"><thead><tr>${keys.map(k=>`<th>${k}</th>`).join('')}</tr></thead><tbody>${rows.map(r=>`<tr>${keys.map(k=>`<td>${String((r as any)[k]||'')}</td>`).join('')}</tr>`).join('')}</tbody></table></body></html>`;download('zeynalikid-export.xls',html,'application/vnd.ms-excel;charset=utf-8')};
  const exportPhones=()=>download('phones.txt',filtered.map(s=>s.fullPhone).filter(Boolean).join('\n'));
  const exportWhatsApp=()=>{const links=filtered.map(s=>digits(s.fullPhone||'')).filter(Boolean).map(n=>`<p><a href="https://wa.me/${n}">${n}</a></p>`).join('');download('whatsapp-links.html',`<html><meta charset="utf-8"><body>${links}</body></html>`,'text/html;charset=utf-8')};
  const changeStatus=(id:any,status:string)=>setSubs((list:any[])=>list.map(x=>x.id===id?{...x,orderStatus:status,changeHistory:[...(x.changeHistory||[]),{by:'مدیر',at:new Date().toLocaleString('fa-IR'),what:`تغییر وضعیت به ${status}`}]}:x));
  // اصلاح ۸: فلش چرخان ۱۸۰ درجه برای details/summary در پنل مدیریت
  const adminDetailsCss=`details>summary{list-style:none}details>summary::-webkit-details-marker{display:none}details>summary::after{content:'';display:inline-block;width:10px;height:10px;border-right:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .3s ease;margin-inline-start:6px;vertical-align:middle}details[open]>summary::after{transform:rotate(-135deg)}.admin-section-box{border:1px solid var(--zk-admin-border,#c8d5df);background:var(--zk-admin-surface,#f1f5f8)}.admin-main details{border-color:var(--zk-admin-border,#c8d5df)!important}.admin-main input[type=checkbox]{width:18px;height:18px;accent-color:var(--zk-action-primary,#1769c2)}.admin-main label{line-height:1.7}.admin-main .admin-section-box button{min-height:44px}`;
  // اصلاح ۳۵+۳۶: بازطراحی پنل مدیریت — داشبورد مدرن با کارت‌های آمار + منوی جانبی + رفع باگ کیبورد موبایل
  const todaySubs=subs.filter((x:any)=>x.date===new Date().toLocaleDateString('fa-IR'));
  const courseSubs=subs.filter((x:any)=>x.type==='course');
  const consultSubs=subs.filter((x:any)=>x.type==='consultation');
  // اصلاح ۱۷+۳۵: تب‌های ناوبری با آیکون‌ها و دسته‌بندی
  const navIcon=(id:string)=>{const p={size:18,color:T.acc};if(id==='courses'||id==='featured'||id==='tagged')return <CoursesIcon {...p}/>;if(id==='content'||id==='highlights'||id==='images')return <EducationIcon {...p}/>;if(id==='contacts')return <ContactIcon {...p}/>;if(id==='licenses')return <LicensesIcon {...p}/>;if(id==='data'||id==='analytics')return <SearchIcon {...p}/>;if(id==='trust'||id==='trustbox')return <ChatIcon {...p}/>;if(id==='products')return <ProductsIcon {...p}/>;if(id==='settings'||id==='security'||id==='shipping'||id==='trash')return <BoxIcon {...p}/>;return <AdminIcon {...p}/>};
  const navTabs:[string,React.ReactNode,string][]=[['dashboard',navIcon('dashboard'),'داشبورد'],['data',navIcon('data'),'داده‌ها'],['settings',navIcon('settings'),'تنظیمات'],['content',navIcon('content'),'مدیریت محتوا'],['contacts',navIcon('contacts'),'ارتباط'],['courses',navIcon('courses'),'دوره‌ها'],['featured',navIcon('featured'),'دوره‌های ویژه'],['tagged',navIcon('tagged'),'دوره‌های تگ‌دار'],['trust',navIcon('trust'),'جملات موفقیت'],['trustbox',navIcon('trustbox'),'جملات اعتمادساز'],['shipping',navIcon('shipping'),'ارسال و بانک'],['analytics',navIcon('analytics'),'آمار بازدید'],['security',navIcon('security'),'امنیت'],['trash',navIcon('trash'),'سطل آشغال'],['products',navIcon('products'),'محصولات'],['highlights',navIcon('highlights'),'هایلایت'],['licenses',navIcon('licenses'),'مجوزها'],['services',navIcon('services'),'خدمات'],['images',navIcon('images'),'تصاویر'],['design',navIcon('settings'),'مدیریت دیزاین']];
  const activeNavLabel=navTabs.find(x=>x[0]===aTab)?.[2]||'داشبورد';
  // کارت آمار داشبورد؛ فقط ظاهر و Iconهای موجود تغییر کرده‌اند.
  function DashCard({icon,label,value,color}:{icon:React.ReactNode,label:string,value:number|string,color:string}){return <div style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,padding:'14px 12px',display:'flex',alignItems:'center',gap:10,boxShadow:T.neuOut,flex:'1 1 140px',minWidth:140}}><div style={{width:40,height:40,borderRadius:12,background:`${color}18`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{icon}</div><div><div style={{fontSize:22,fontWeight:800,color:T.txt,lineHeight:1}}>{value}</div><div style={{fontSize:11,color:T.mut,marginTop:4}}>{label}</div></div></div>}
  return <div dir={lang==='en'?'ltr':'rtl'} className="admin-root" style={{...S.page,direction:lang==='en'?'ltr':'rtl',padding:0,minHeight:'100dvh',alignItems:'stretch',background:T.bg}}><style>{css}{adminDetailsCss}{`
  /* Mobile-first admin shell: no fixed desktop sidebar, only an overlay drawer. */
  .admin-sidebar{position:fixed;z-index:2000;top:0;bottom:0;width:min(88vw,320px);transform:translateX(100%);transition:transform .28s cubic-bezier(.2,0,0,1);overflow-y:auto;overscroll-behavior:contain;padding-top:calc(14px + env(safe-area-inset-top,0px))!important;padding-bottom:calc(14px + env(safe-area-inset-bottom,0px))!important}
  .admin-sidebar.admin-ltr{left:0;right:auto;transform:translateX(-100%)}
  .admin-sidebar.admin-rtl{right:0;left:auto;transform:translateX(100%)}
  .admin-sidebar.open{transform:translateX(0)}
  .admin-main{flex:1;min-width:0;padding:calc(58px + env(safe-area-inset-top,0px)) max(12px,env(safe-area-inset-right,0px)) calc(18px + env(safe-area-inset-bottom,0px)) max(12px,env(safe-area-inset-left,0px));overflow-y:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch}
  .admin-topbar{position:fixed;top:0;left:0;right:0;z-index:1800;min-height:54px;padding:calc(8px + env(safe-area-inset-top,0px)) max(62px,env(safe-area-inset-right,0px)) 8px max(14px,env(safe-area-inset-left,0px));background:${T.hdr};border-bottom:1px solid ${T.brd};display:flex;align-items:center;justify-content:space-between;gap:10px;box-sizing:border-box}
  .admin-main input:focus,.admin-main textarea:focus,.admin-main select:focus{scroll-margin-top:70px;scroll-margin-bottom:24px}
  .admin-main input[type="color"]:focus{scroll-margin-top:70px;scroll-margin-bottom:24px}
  .admin-main input,.admin-main textarea,.admin-main select{font-size:16px!important;max-width:100%}
  .admin-main table{max-width:100%;overflow-x:auto;display:block}
  .admin-main .filter-group{min-width:0}
  @media(max-width:360px){.admin-main{padding-inline:10px}.admin-topbar{padding-inline-start:10px}}
  `}</style>{/* Sidebar */}<aside className={`admin-sidebar ${sidebarOpen?'open':''} ${lang==='en'?'admin-ltr':'admin-rtl'}`} style={{width:'min(88vw,320px)',background:T.card,borderInlineEnd:`1px solid ${T.brd}`,padding:'14px 8px',display:'flex',flexDirection:'column',gap:4,boxShadow:T.neuOut}}>
   <div style={{padding:'8px 10px',marginBottom:8}}><h3 style={{margin:0,fontSize:14,color:T.ttl,fontWeight:800}}>پنل مدیریت</h3><p style={{margin:'2px 0 0',fontSize:10,color:T.mut}}>زینالیکید</p></div>
   {navTabs.map(([id,icon,label])=><button key={id} onClick={()=>{setATab(id);setEditCfg(JSON.parse(JSON.stringify(cfg)));setSidebarOpen(false)}} style={{display:'flex',alignItems:'center',gap:8,width:'100%',padding:'10px 12px',border:'none',borderRadius:12,background:aTab===id?T.soft:'transparent',color:aTab===id?T.acc:T.txt,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:aTab===id?800:600,textAlign:'right',transition:'all .2s ease',boxShadow:aTab===id?T.neuIn:'none'}}><span style={{fontSize:15}}>{icon}</span><span>{label}</span>{aTab===id&&<span style={{marginInlineStart:'auto',fontSize:10}}>◂</span>}</button>)}
   <div style={{marginTop:'auto',padding:'10px 8px',borderTop:`1px solid ${T.brd}`,display:'flex',gap:6,flexWrap:'wrap'}}><button style={{...AdminBtn(),flex:1,fontSize:11}} onClick={goHome}>{navIcon('dashboard')}<span>خانه</span></button><button style={{...AdminBtn(),flex:1,fontSize:11,color:T.err}} onClick={onLogout}>خروج</button></div>
  </aside>{/* Hamburger menu toggle - always visible */}<button type="button" className="admin-menu-toggle" aria-label={sidebarOpen?'بستن منوی مدیریت':'باز کردن منوی مدیریت'} aria-expanded={sidebarOpen} onClick={()=>setSidebarOpen(v=>!v)} style={{position:'fixed',top:'calc(8px + env(safe-area-inset-top,0px))',right:'max(10px, env(safe-area-inset-right,0px))',zIndex:2100,width:48,height:48,minHeight:48,borderRadius:12,border:`1px solid ${T.brd}`,background:T.card,color:T.txt,cursor:'pointer',boxShadow:T.neuOut,display:'flex',alignItems:'center',justifyContent:'center'}}>{sidebarOpen?<span aria-hidden="true" style={{fontSize:23,lineHeight:1}}>×</span>:<MenuIcon size={21} color={T.acc}/>}</button>{/* Overlay for sidebar */}{sidebarOpen&&<div onClick={()=>setSidebarOpen(false)} style={{position:'fixed',inset:0,zIndex:1999,background:'rgba(0,0,0,.3)'}}/>}{/* Main content */}<div className="admin-main"><div className="admin-topbar"><strong style={{fontSize:15,color:T.txt,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{activeNavLabel}</strong><span style={{fontSize:11,color:T.mut}}>Zeynalikid Care</span></div><div style={{maxWidth:1100,margin:'0 auto'}}>
  {aTab==='dashboard'&&<><h2 style={{color:T.ttl,margin:'0 0 16px',fontWeight:800,fontSize:18}}>داشبورد</h2><div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:20}}><DashCard icon={navIcon('data')} label="کل فرم‌ها" value={subs.length} color={T.acc}/><DashCard icon={navIcon('dashboard')} label="فرم‌های امروز" value={todaySubs.length} color="#218653"/><DashCard icon={navIcon('courses')} label="ثبت‌نام دوره" value={courseSubs.length} color={T.acc}/><DashCard icon={navIcon('contacts')} label="فرم مشاوره" value={consultSubs.length} color="#B56A08"/></div>{loadingSubs&&<div style={{textAlign:'center',color:T.mut,padding:20}}>در حال بارگذاری...</div>}</>}{aTab==='data'&&<>{subs.length>1000&&<div style={{background:`${T.warn}18`,border:`1px solid ${T.warn}`,color:T.warn,borderRadius:10,padding:10,marginBottom:10,fontSize:12,fontWeight:800}}>برای نمایش همه فرم‌ها، از فیلتر استفاده کنید</div>}<div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(155px,1fr))',gap:10,marginBottom:12}}>{/* فیلترهای صفحه داده‌ها — هر کدام با برچسب واضح */}<div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>جستجوی پیشرفته</label><input style={S.inp} placeholder="نام، شماره، کد پیگیری..." value={srch} onChange={e=>{setSrch(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}/></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>تاریخ ثبت</label><input style={S.inp} placeholder="مثلاً ۱۴۰۴/۰۴" value={dateF} onChange={e=>{setDateF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}/></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>دسته‌بندی</label><select style={S.inp} value={catF} onChange={e=>{setCatF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}>{cats.map(c=><option key={c}>{c}</option>)}</select></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>کشور</label><select style={S.inp} value={countryF} onChange={e=>{setCountryF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}>{countriesF.map((c:any)=><option key={c}>{c}</option>)}</select></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>دوره</label><select style={S.inp} value={courseF} onChange={e=>{setCourseF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}>{coursesF.map((c:any)=><option key={c}>{c}</option>)}</select></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>وضعیت پرداخت</label><select style={S.inp} value={payF} onChange={e=>{setPayF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}>{payOptions.map(c=><option key={c}>{c}</option>)}</select></div><div className="filter-group"><label style={{display:'block',fontSize:11,fontWeight:700,color:T.mut,marginBottom:3}}>وضعیت سفارش</label><select style={S.inp} value={statusF} onChange={e=>{setStatusF(e.target.value);setPage(1)}} onFocus={e=>{setTimeout(()=>{try{e.target.scrollIntoView({behavior:'smooth',block:'nearest'})}catch{}},300)}}><option>همه</option>{statusOptions.map(c=><option key={c}>{c}</option>)}</select></div></div><div style={{display:'flex',gap:7,flexWrap:'wrap',marginBottom:10}}><button style={AdminBtn()} onClick={exportExcel}>خروجی Excel</button><button style={AdminBtn()} onClick={exportPhones}>خروجی شماره‌ها</button><button style={AdminBtn()} onClick={exportWhatsApp}>خروجی واتساپ</button><button style={AdminBtn()} onClick={()=>{setSrch('');setDateF('');setCatF('همه');setCountryF('همه');setCourseF('همه');setPayF('همه');setStatusF('همه');setPage(1)}}>حذف فیلترها</button></div>{/* اصلاح ۱: فقط سرگروه (جدیدترین فرم) در لیست اصلی نمایش داده می‌شود؛ بقیه فرم‌های همان شماره از داخل خودِ کارت («فرم‌های دیگر با این شماره تماس») با کلیک در یک مودال مستقل باز می‌شوند — بدون نمایش تو رفته/زیرمجموعه در لیست اصلی */}{groups.length?groups.map(g=><LazySubCard key={g.head.id} sub={g.head} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} groupCount={g.children.length} allSubs={subs} onOpenRelated={setModalSub}/>):<div style={{padding:35,textAlign:'center',color:T.mut}}>فرمی یافت نشد</div>}{modalSub&&<Modal T={T} onClose={()=>setModalSub(null)} max={640}><SubCard sub={modalSub} statusOptions={statusOptions} getStatus={getStatus} onStatusChange={changeStatus} allSubs={subs} onOpenRelated={setModalSub} forceOpen/></Modal>}<div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginTop:12}}><button style={AdminBtn()} disabled={safePage<=1} onClick={()=>setPage(p=>Math.max(1,p-1))}>قبلی</button><span style={{color:T.mut,fontSize:12}}>صفحه {safePage} از {totalPages}</span><button style={AdminBtn()} disabled={safePage>=totalPages} onClick={()=>setPage(p=>Math.min(totalPages,p+1))}>بعدی</button></div></>}{aTab==='settings'&&editCfg&&SettingsEditor()}{aTab==='content'&&editCfg&&ContentEditor()}{aTab==='contacts'&&editCfg&&ContactsEditor()}{aTab==='courses'&&editCfg&&CoursesEditor()}{aTab==='featured'&&editCfg&&FeaturedCoursesEditor()}{aTab==='tagged'&&editCfg&&TaggedCoursesEditor()}{aTab==='trust'&&editCfg&&TrustEditor()}{aTab==='trustbox'&&editCfg&&TrustBoxManagerEditor()}{aTab==='themes'&&editCfg&&ThemeManagerEditor()}{aTab==='images'&&editCfg&&ImagesEditor()}{aTab==='design'&&editCfg&&DesignManagerEditor()}{aTab==='shipping'&&editCfg&&<ShippingBankEditor/>}{aTab==='analytics'&&<AnalyticsPanel T={T} S={S}/>}{aTab==='security'&&<SecurityEditor/>}{aTab==='products'&&editCfg&&ProductsTabEditor()}{aTab==='highlights'&&editCfg&&HighlightsTabEditor()}{aTab==='licenses'&&editCfg&&LicensesTabEditor()}{aTab==='services'&&editCfg&&ServicesTabEditor()}{aTab==='trash'&&<TrashPanel T={T} S={S} AdminBtn={AdminBtn} refreshKey={trashKey} onRestored={(sub:any)=>{const {deleted_at,...clean}=sub;setSubsState(prev=>prev.some((x:any)=>x.id===clean.id)?prev:[clean,...prev]); if(!isSupabaseConfigured){const subs=getLS(SK.subs,[]); if(!subs.some((x:any)=>x.id===clean.id))setLS(SK.subs,[clean,...subs])}}}/>}{msg&&<div style={{position:'fixed',bottom:20,left:20,background:T.pop,border:`1px solid ${T.ok}`,color:T.ok,borderRadius:12,padding:'10px 14px',zIndex:3000}}>{msg}</div>}</div></div></div>}

 function PhoneAction({sub,phone,whatsappOnly=false,label}:{sub:any,phone:any,whatsappOnly?:boolean,label?:string}){const [open,setOpen]=useState(false);const raw=String(phone||'');if(!raw)return <span>—</span>;const cc=sub?.cc||sub?.shipping?.phoneCc||'';const isIran=cc==='+98'||raw.startsWith('+98')||raw.startsWith('0098');const waDigits=digits(raw.startsWith('+')||raw.startsWith('00')?raw:`${cc}${raw}`);const telHref=`tel:${raw}`;const waHref=`https://wa.me/${waDigits}`;const rbHref=`https://rubika.ir/${waDigits}`;const linkStyle={display:'block',padding:'9px 11px',borderRadius:9,textDecoration:'none',color:T.txt,background:'transparent',fontSize:13,fontWeight:700} as any;const trigger=<button onClick={(e)=>{e.stopPropagation();setOpen(v=>!v)}} style={{border:0,background:T.soft,color:T.acc,borderRadius:8,padding:'4px 8px',cursor:'pointer',fontFamily:'inherit',fontSize:12,direction:'ltr'}}>{label||raw}</button>;if(whatsappOnly)return <a href={waHref} target="_blank" rel="noreferrer" style={{color:T.ok,fontWeight:800,direction:'ltr',display:'inline-block'}}>{label||raw}</a>;return <Popup open={open} onClose={()=>setOpen(false)} T={T} width={190} trigger={trigger}><a href={telHref} style={linkStyle} onClick={()=>setOpen(false)}>تلفن</a><a href={waHref} target="_blank" rel="noreferrer" style={{...linkStyle,color:'#16a34a'}} onClick={()=>setOpen(false)}>واتساپ</a>{isIran&&<a href={rbHref} target="_blank" rel="noreferrer" style={{...linkStyle,color:'#f97316'}} onClick={()=>setOpen(false)}>روبیکا</a>}</Popup>}

 function LazySubCard(props:any){const ref=useRef<HTMLDivElement|null>(null);const [visible,setVisible]=useState(false);useEffect(()=>{const el=ref.current;if(!el)return;const io=new IntersectionObserver(([entry])=>{if(entry.isIntersecting){setVisible(true);io.disconnect()}},{rootMargin:'180px'});io.observe(el);return()=>io.disconnect()},[]);return <div ref={ref} style={{minHeight:visible?'auto':92}}>{visible?<SubCard {...props}/>:<div style={{height:78,borderRadius:14,background:T.badge,border:`1px solid ${T.brd}`,opacity:.55}}/>}</div>}

 function SubCard({sub,statusOptions=[],getStatus=(x:any)=>x.orderStatus||'جدید',onStatusChange,groupCount=0,isChild=false,allSubs=[],onOpenRelated,forceOpen=false}:any){
 const color=sub.priority==='high'?T.err:sub.unread?T.ok:T.acc;
 const open=forceOpen||expId===sub.id;
 const [subTab,setSubTab]=useState<'parent'|'course'|'payment'|'manage'|'corrective'>('parent');
 const mark=()=>{setExpId(open?null:sub.id); if(sub.unread)setSubs((s:any[])=>s.map(x=>x.id===sub.id?{...x,unread:false,isNew:false}:x))};
 // اصلاح ۳-ب: منطق خودکار «پیگیری آخر ماه» — با ۳ تیک سبز، هم category (برای فرم‌های ثبتی/دوره) و هم consultationStatus (برای فرم‌های مشاوره) به «پیگیری آخر ماه» منتقل می‌شوند؛ با برداشتن یک تیک یا تبدیل به ضربدر قرمز، به «پیگیری» برمی‌گردند.
 const fu=(i:number)=>{const slots=[...(sub.followUps||[null,null,null,null,null])]; slots[i]=slots[i]===null?'done':slots[i]==='done'?'miss':null; let cat=sub.category; let cs=sub.consultationStatus; const doneCount=slots.filter(x=>x==='done').length; const hasMiss=slots.some(x=>x==='miss'); if(hasMiss){cat='پیگیری';cs='پیگیری'} else if(doneCount>=3){cat='آخر ماه';cs='پیگیری آخر ماه'} else if(cat==='آخر ماه'||cs==='پیگیری آخر ماه'){cat='پیگیری';cs='پیگیری'} setSubs((s:any[])=>s.map(x=>x.id===sub.id?{...x,followUps:slots,category:cat,consultationStatus:cs,changeHistory:logChange(x,`ثبت پیگیری مرحله ${i+1}`)}:x))};
 // اصلاح ۱۱: فرم‌های دیگر با همان شماره تماس (فرم مشاوره، ثبت‌نام دوره، تاریخچه ویرایش‌ها)
 const relatedSubs=useMemo(()=>{const myPhone=digits(sub.fullPhone||''); if(!myPhone)return []; return allSubs.filter((x:any)=>x.id!==sub.id&&digits(x.fullPhone||'')===myPhone).sort((a:any,b:any)=>subTime(b)-subTime(a))},[allSubs,sub.id,sub.fullPhone]);
 // اصلاح ۱۰: تب‌های چهارگانه
 const tabs:[('parent'|'course'|'payment'|'manage'|'corrective'),string][]=[['parent','۱. والد و فرزند'],['course','۲. دوره و ارسال'],['payment','۳. پرداخت'],['manage','۴. مدیریت و پیگیری'],['corrective','۵. اصلاحی']];
 return <div style={{border:`1.5px solid ${color}`,background:T.badge,borderRadius:14,marginBottom:9,overflow:'hidden',boxShadow:'0 4px 14px rgba(0,0,0,.06)'}}>
  <div onClick={mark} style={{padding:12,cursor:'pointer',display:'flex',gap:10,alignItems:'center'}}>{needsReminder(sub)&&<span title="بیش از ۳ روز بدون پیگیری" style={{fontSize:16,flexShrink:0}}>🔔</span>}<b style={{flex:1}}>{sub.pName||sub.fullPhone||'—'}</b>{sub.trackingCode&&<span dir="ltr" style={{fontSize:10,padding:'3px 7px',borderRadius:8,background:T.soft,color:T.acc,border:`1px solid ${T.brd}`,fontFamily:'monospace,-apple-system,"Courier New"',letterSpacing:'1px'}}>{sub.trackingCode}</span>}{isChild&&<Tag x="فرم تکراری"/>}{groupCount>0&&<Tag x={`${groupCount} فرم دیگر با این شماره`}/>}{sub.isNew&&<Tag x="جدید"/>}{sub.similarTo&&<Tag x="مشابه"/>}{sub.editHistory?.length>0&&<Tag x="ادیت شده"/>}{sub.priority==='high'&&<Tag x="اولویت زیاد"/>}<span>{open?'▲':'▼'}</span></div>
  {open&&<div style={{padding:13,borderTop:`1px solid ${T.brd}`,fontSize:12,lineHeight:2,background:T.card}}>
   {/* اصلاح ۱۰: نوار تب‌های چهارگانه */}
   <div style={{display:'grid',gridTemplateColumns:'repeat(5,1fr)',gap:6,marginBottom:12}}>{tabs.map(([id,label])=><button key={id} onClick={()=>setSubTab(id)} style={{padding:'8px 4px',borderRadius:11,border:'none',background:subTab===id?T.soft:T.card,color:subTab===id?T.acc:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,boxShadow:subTab===id?T.neuIn:T.neuOut}}>{label}</button>)}</div>

   {subTab==='parent'&&<div>
    <div><b>اطلاعات کودک:</b> سن {sub.age||'—'}، {sub.gender==='male'?'پسر':sub.gender==='female'?'دختر':'—'}، قد {sub.height||'—'}، وزن {sub.weight||'—'}</div>
    <GrowthBox sub={sub}/>
    <div style={{marginTop:6}}><b>والد:</b> {sub.pName||'—'} / <PhoneAction sub={sub} phone={sub.fullPhone}/></div>
    <div><b>موضوع:</b> {(sub.topics||[]).join('، ')||'—'} / <b>دسته:</b> {sub.category}</div>
    <div><b>مشکل گوارشی:</b> {(Array.isArray(sub.digest)?sub.digest.join('، '):sub.digest)||'—'} / <b>وضعیت اشتها:</b> {sub.appetite||'—'}</div>
    <div><b>بیماری خاص:</b> {sub.disease||'—'} / <b>شرایط خاص:</b> {(Array.isArray(sub.specials)?sub.specials.join('، '):sub.specials)||'—'}</div>
    {sub.notes&&<div style={{marginTop:6,padding:8,borderRadius:8,background:T.soft}}><b>توضیحات تکمیلی:</b> {sub.notes}</div>}
    {/* اصلاح ۳۰ (مرحله ۷): نمایش عکس‌های زبان فرزند + دکمه حذف کامل از Storage */}
    {(sub.tonguePhotos||[]).length>0&&<div style={{marginTop:10}}>
     <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
      <b>📷 عکس‌های زبان ({sub.tonguePhotos.length})</b>
      <button onClick={async()=>{if(!confirm('همه عکس‌های زبان این فرم حذف شوند؟ این عملیات قابل بازگشت نیست.'))return; try{for(const url of (sub.tonguePhotos||[])){await deleteStoredTonguePhoto?.(url)} setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,tonguePhotos:[],changeHistory:logChange(x,'حذف عکس‌های زبان')}:x))}catch(e){alert('حذف عکس‌های زبان انجام نشد.')}}} style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${T.err}`,color:T.err,background:`${T.err}10`,fontSize:11}}>حذف عکس‌های زبان</button>
     </div>
     <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>{sub.tonguePhotos.map((url:string,i:number)=><a key={i} href={url} target="_blank" rel="noreferrer"><img src={url} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/></a>)}</div>
    </div>}
    {/* اصلاح ۱۱: تاریخچه فرم‌های دیگر با همین شماره تماس */}
    {/* اصلاح ۱: هر آیتم «فرم‌های دیگر با این شماره تماس» اکنون قابل کلیک است و با کلیک، مودال حاوی جزئیات کامل همان فرم (رندرشده با خودِ SubCard) باز می‌شود */}
    {relatedSubs.length>0&&<details style={{marginTop:10,border:`1px solid ${T.brd}`,borderRadius:10,padding:9,background:T.soft}}><summary style={{cursor:'pointer',fontWeight:800,fontSize:12,color:T.ttl}}>📋 فرم‌های دیگر با این شماره تماس ({relatedSubs.length})</summary>{relatedSubs.map((r:any)=><div key={r.id} onClick={(e:any)=>{e.stopPropagation();onOpenRelated?.(r)}} style={{marginTop:8,padding:8,borderRadius:8,background:T.inp,border:`1px solid ${T.brd}`,fontSize:11,lineHeight:1.9,cursor:'pointer',transition:'box-shadow .2s ease'}}><div style={{display:'flex',gap:6,flexWrap:'wrap',alignItems:'center'}}><Tag x={r.type==='course'?'ثبت‌نام دوره':'فرم مشاوره'}/>{r.trackingCode&&<span dir="ltr" style={{fontFamily:'monospace,-apple-system,"Courier New"'}}>{r.trackingCode}</span>}<span style={{color:T.mut}}>{r.date} {r.time}</span><span style={{marginInlineStart:'auto',color:T.acc,fontWeight:800}}>مشاهده ◂</span></div><div style={{marginTop:4}}>سن {r.age||'—'} / {r.gender==='male'?'پسر':r.gender==='female'?'دختر':'—'} / {r.course?.title?`دوره: ${r.course.title}`:'بدون دوره'}</div>{r.editHistory?.length>0&&<div style={{marginTop:4,color:T.mut}}>تاریخچه ویرایش: {r.editHistory.length} نسخه قبلی</div>}</div>)}</details>}
   </div>}

   {/* اصلاح ۲: تب «۲. دوره و ارسال» فقط اطلاعات دوره و ارسال را نشان می‌دهد (نه اطلاعات والد/فرزند که به تب ۱ منتقل شده) */}
   {subTab==='course'&&<div>
    {sub.course?<div style={{padding:9,borderRadius:10,background:T.soft,marginBottom:8}}><b>دوره:</b><br/>عنوان: {sub.course.title||'—'}{sub.course.price&&<> / قیمت: {sub.course.price}</>}{sub.course.features?.length>0&&<div style={{marginTop:4}}>ویژگی‌ها: {sub.course.features.join('، ')}</div>}</div>:<div style={{color:T.mut,marginBottom:8}}>بدون دوره ثبت‌شده</div>}
    {sub.shipping?<div style={{padding:9,borderRadius:10,background:T.soft}}><b>ارسال:</b><br/>مقصد: {sub.shipping.dest==='iran'?'ایران':'خارج'} / شهر/کشور: {sub.shipping.city||sub.shipping.country||'—'} / روش: {sub.shipping.method||'—'}{sub.shipping.postalCode&&<> / کد پستی: {sub.shipping.postalCode}</>} / زمان تحویل: {sub.shipping.estimatedDelivery||'—'}{sub.shipping.address&&<div style={{marginTop:4}}>آدرس کامل: {sub.shipping.address}</div>}{(sub.shipping.phone||sub.shipping.whatsapp)&&<div style={{marginTop:4}}>{sub.shipping.phone&&<>شماره تماس: <PhoneAction sub={sub} phone={(sub.shipping.phoneCc||'')+sub.shipping.phone}/></>}{sub.shipping.whatsapp&&<> / واتساپ: <PhoneAction sub={sub} phone={(sub.shipping.whatsappCc||'')+sub.shipping.whatsapp} whatsappOnly/></>}</div>}</div>:<div style={{color:T.mut}}>اطلاعات ارسال ثبت نشده (فرم مشاوره)</div>}
    {sub.editHistory?.length>0&&<details style={{marginTop:8}}><summary>مشاهده اطلاعات اولیه و تاریخچه ویرایش</summary>{sub.editHistory.map((h:any,i:number)=><pre key={i} style={{whiteSpace:'pre-wrap',background:T.inp,padding:8,borderRadius:8,overflow:'auto'}}>{`نسخه ${i+1} - ${h.date} ${h.time}\n${JSON.stringify(h.data,null,2)}`}</pre>)}</details>}
   </div>}

   {subTab==='payment'&&<div>
    {sub.payment?<div><b>پرداخت:</b> {sub.payment.bank?.name||'—'} / فیش: {sub.payment.receipt?'عکس دارد':sub.payment.receiptText?'متن پیامک دارد':'ندارد'}{sub.payment.receiptText&&<details style={{marginTop:6}}><summary>مشاهده متن پیامک واریز</summary><div style={{whiteSpace:'pre-wrap',background:T.inp,borderRadius:8,padding:8,marginTop:4}}>{sub.payment.receiptText}</div></details>}</div>:<div style={{color:T.mut}}>اطلاعات پرداخت ثبت نشده (فرم مشاوره)</div>}
    {sub.payment?.receipt&&<div style={{display:'flex',alignItems:'center',gap:8,marginTop:8}}><span style={{color:T.ok,fontSize:12}}>✅ فیش آپلود شده</span><button onClick={async()=>{if(!confirm('⚠️ آیا از حذف کامل این فیش واریزی مطمئن هستید؟ این عملیات قابل بازگشت نیست.'))return; try{await deleteStoredImage(sub.payment.receipt); const updatedPayment={...(sub.payment||{}),receipt:'',receipt_image:'',receiptDeletedAt:new Date().toISOString()}; setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,payment:updatedPayment,changeHistory:logChange(x,'حذف دستی فیش واریزی')}:x)); alert('✅ فیش با موفقیت حذف شد.')}catch(e){alert('❌ خطا در حذف فیش. لطفاً مجدداً تلاش کنید.')}}} style={{padding:'4px 10px',borderRadius:8,border:`1px solid ${T.err}`,background:`${T.err}10`,color:T.err,cursor:'pointer',fontSize:11,fontFamily:'inherit'}}>🗑️ حذف فیش</button></div>}
    {sub.payment?.receiptDeletedAt&&!sub.payment?.receipt&&<div style={{fontSize:11,color:T.mut,marginTop:6}}>🗑️ فیش حذف شده: {new Date(sub.payment.receiptDeletedAt).toLocaleDateString('fa-IR')}</div>}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}><div><label style={S.lbl}>💰 قیمت پرداختی (تومان)</label><input inputMode="numeric" style={S.inp} defaultValue={sub.payment?.amount||''} onBlur={e=>{const val=parseInt(p2e(e.target.value).replace(/\D/g,''));const cur=sub.payment?.amount; if(!isNaN(val)&&val!==cur){const updatedPayment={...(sub.payment||{}),amount:val}; setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,payment:updatedPayment,changeHistory:logChange(x,`ثبت قیمت پرداختی: ${val.toLocaleString()} تومان`)}:x))}}} placeholder="مثلاً 250000"/></div><div><label style={S.lbl}>📅 تاریخ پرداخت</label><input style={S.inp} defaultValue={sub.payment?.paidAt||''} onBlur={e=>{const val=p2e(e.target.value).trim(); if(val&&val!==sub.payment?.paidAt){const updatedPayment={...(sub.payment||{}),paidAt:val}; setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,payment:updatedPayment,changeHistory:logChange(x,`ثبت تاریخ پرداخت: ${val}`)}:x))}}} placeholder="1403/05/20"/></div></div>
   </div>}

   {subTab==='manage'&&<div>
    {/* اصلاح ۳-ه: وضعیت سفارش فقط دستی توسط ادمین تغییر می‌کند (بدون منطق خودکار) — این select همان رفتار قبلی را دارد */}
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,alignItems:'end'}}><div><label style={S.lbl}>وضعیت سفارش</label><select style={S.inp} value={getStatus(sub)} onChange={e=>onStatusChange?.(sub.id,e.target.value)}>{statusOptions.map((x:string)=><option key={x}>{x}</option>)}</select></div><button style={{...AdminBtn(),background:sub.followReminder?`${T.warn}22`:T.soft,color:sub.followReminder?T.warn:T.acc,borderColor:sub.followReminder?T.warn:T.brd}} onClick={()=>setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,followReminder:!x.followReminder,changeHistory:logChange(x,!x.followReminder?'فعال‌سازی یادآور پیگیری':'غیرفعال‌سازی یادآور پیگیری')}:x))}>{sub.followReminder?'یادآور فعال':'یادآور پیگیری'}</button></div>
    {/* اصلاح ۳-د: فیلد جدید «وضعیت مشاوره» — فقط برای فرم‌های مشاوره (type==='consultation') کاربرد کامل دارد؛ تغییر دستی، زمان تغییر را هم ثبت می‌کند تا منطق خودکار انتقال به «پیگیری» بعد از ۱ روز کار کند */}
    {sub.type==='consultation'&&<div style={{marginTop:10}}><label style={S.lbl}>وضعیت مشاوره</label><select style={S.inp} value={sub.consultationStatus||'مشاوره اولیه'} onChange={e=>{const val=e.target.value; setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,consultationStatus:val,consultationStatusChangedAt:new Date().toISOString(),changeHistory:logChange(x,`تغییر وضعیت مشاوره به ${val}`)}:x))}}>{['مشاوره اولیه','مشاوره شده','اصلاحی','ثبتی','پیگیری','پیگیری آخر ماه'].map(x=><option key={x}>{x}</option>)}</select></div>}
    {sub.changeHistory?.length>0&&<details style={{marginTop:8}}><summary>تاریخچه تغییرات</summary>{sub.changeHistory.map((h:any,i:number)=><div key={i} style={{fontSize:11,color:T.mut,padding:'4px 0'}}>• {h.at} — {h.by}: {h.what}</div>)}</details>}
    <div style={{marginTop:10}}><b>پیگیری‌ها:</b><div style={{display:'flex',gap:7,marginTop:6}}>{[0,1,2,3,4].map(i=><button key={i} onClick={()=>fu(i)} style={{width:34,height:34,borderRadius:'50%',border:`2px solid ${(sub.followUps||[])[i]==='done'?T.ok:(sub.followUps||[])[i]==='miss'?T.err:T.brd}`,background:'transparent',color:(sub.followUps||[])[i]==='done'?T.ok:(sub.followUps||[])[i]==='miss'?T.err:T.mut,cursor:'pointer'}}>{(sub.followUps||[])[i]==='done'?'✓':(sub.followUps||[])[i]==='miss'?'×':''}</button>)}</div></div>
    <textarea style={{...S.ta,marginTop:10}} defaultValue={sub.adminNotes||''} onBlur={e=>setSubs((s:any[])=>s.map(x=>x.id===sub.id&&x.adminNotes!==e.target.value?{...x,adminNotes:e.target.value,changeHistory:logChange(x,'ویرایش یادداشت مدیر')}:x))}/>
    <label style={{...S.lbl,marginTop:10}}>طریقه مصرف (در صفحه پیگیری به کاربر نمایش داده می‌شود)</label><textarea style={S.ta} defaultValue={sub.usageInstructions||''} onBlur={e=>setSubs((s:any[])=>s.map(x=>x.id===sub.id&&x.usageInstructions!==e.target.value?{...x,usageInstructions:e.target.value,changeHistory:logChange(x,'ویرایش طریقه مصرف')}:x))} placeholder="مثلاً: روزی یک پیمانه بعد از صبحانه..."/>
    <label style={{...S.lbl,marginTop:10}}>برنامه غذایی (در صفحه پیگیری به کاربر نمایش داده می‌شود)</label><textarea style={S.ta} defaultValue={sub.mealPlan||''} onBlur={e=>setSubs((s:any[])=>s.map(x=>x.id===sub.id&&x.mealPlan!==e.target.value?{...x,mealPlan:e.target.value,changeHistory:logChange(x,'ویرایش برنامه غذایی')}:x))} placeholder="برنامه غذایی هفتگی..."/>
    {/* اصلاح ۴: کنترل نمایش برنامه غذایی از پنل مدیریت — مقدار در sub.showMealPlan ذخیره می‌شود و TrackPage فقط زمانی تب «برنامه غذایی» را نشان می‌دهد که این مقدار true باشد */}
    <label style={{display:'flex',alignItems:'center',gap:7,marginTop:10,fontWeight:800,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={!!sub.showMealPlan} onChange={e=>setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,showMealPlan:e.target.checked,changeHistory:logChange(x,e.target.checked?'فعال‌سازی نمایش برنامه غذایی':'غیرفعال‌سازی نمایش برنامه غذایی')}:x))}/> نمایش برنامه غذایی در صفحه پیگیری</label>
    <div style={{marginTop:10,padding:10,border:`1px dashed ${T.brd}`,borderRadius:10,background:T.soft}}><label style={{...S.lbl,margin:'0 0 6px'}}>📄 فایل PDF طریقه مصرف (اختیاری — اصلاح ۶)</label><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><label style={{padding:'6px 10px',borderRadius:8,background:T.pop,color:T.acc,border:`1px solid ${T.brd}`,fontSize:12,cursor:'pointer'}}><input type="file" accept="application/pdf" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0]; if(!f)return; try{const url=await uploadPdfFile(f,'usage-pdf'); if(sub.usagePdfUrl)await deleteStoredFile(sub.usagePdfUrl); setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,usagePdfUrl:url,changeHistory:logChange(x,'آپلود فایل PDF طریقه مصرف')}:x))}catch(err:any){alert(err?.message||'آپلود فایل انجام نشد.')}}}/>{sub.usagePdfUrl?'جایگزینی فایل':'انتخاب فایل PDF'}</label>{sub.usagePdfUrl&&<><a href={sub.usagePdfUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.ok,fontWeight:800}}>✓ مشاهده فایل فعلی</a><button onClick={async()=>{if(!confirm('فایل PDF طریقه مصرف حذف شود؟'))return; await deleteStoredFile(sub.usagePdfUrl); setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,usagePdfUrl:'',changeHistory:logChange(x,'حذف فایل PDF طریقه مصرف')}:x))}} style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${T.err}`,color:T.err,background:`${T.err}10`,fontSize:11}}>حذف</button></>}</div></div>
    <div style={{marginTop:10,padding:10,border:`1px dashed ${T.brd}`,borderRadius:10,background:T.soft}}><label style={{...S.lbl,margin:'0 0 6px'}}>📄 فایل PDF برنامه غذایی (اختیاری — اصلاح ۶)</label><div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap'}}><label style={{padding:'6px 10px',borderRadius:8,background:T.pop,color:T.acc,border:`1px solid ${T.brd}`,fontSize:12,cursor:'pointer'}}><input type="file" accept="application/pdf" style={{display:'none'}} onChange={async e=>{const f=e.target.files?.[0]; if(!f)return; try{const url=await uploadPdfFile(f,'meal-pdf'); if(sub.mealPdfUrl)await deleteStoredFile(sub.mealPdfUrl); setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,mealPdfUrl:url,changeHistory:logChange(x,'آپلود فایل PDF برنامه غذایی')}:x))}catch(err:any){alert(err?.message||'آپلود فایل انجام نشد.')}}}/>{sub.mealPdfUrl?'جایگزینی فایل':'انتخاب فایل PDF'}</label>{sub.mealPdfUrl&&<><a href={sub.mealPdfUrl} target="_blank" rel="noreferrer" style={{fontSize:11,color:T.ok,fontWeight:800}}>✓ مشاهده فایل فعلی</a><button onClick={async()=>{if(!confirm('فایل PDF برنامه غذایی حذف شود؟'))return; await deleteStoredFile(sub.mealPdfUrl); setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,mealPdfUrl:'',changeHistory:logChange(x,'حذف فایل PDF برنامه غذایی')}:x))}} style={{padding:'4px 9px',borderRadius:7,border:`1px solid ${T.err}`,color:T.err,background:`${T.err}10`,fontSize:11}}>حذف</button></>}</div></div>
    <details style={{marginTop:10,border:`1px solid ${T.brd}`,borderRadius:12,padding:10,background:T.soft}}><summary style={{cursor:'pointer',fontWeight:800,fontSize:12,color:T.ttl}}>💊 طریقه مصرف محصولات ({Object.values(sub.productUsage||{}).filter((u:any)=>u&&u.enabled).length} فعال)</summary>{(cfg.products?.list||[]).map((pr:any)=>{const u=(sub.productUsage||{})[pr.id]||{};const setU=(k:string,v:any)=>{const nu={...(sub.productUsage||{}),[pr.id]:{...u,[k]:v}};setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,productUsage:nu,changeHistory:logChange(x,`ویرایش طریقه مصرف ${pr.name}`)}:x))};const ProdIcon=productVectorIcon(pr.icon); return <div key={pr.id} style={{border:`1px solid ${u.enabled?T.acc:T.brd}`,borderRadius:10,padding:9,marginTop:8,background:T.inp}}><label style={{display:'flex',alignItems:'center',gap:7,fontSize:12,fontWeight:800,cursor:'pointer'}}><input type="checkbox" checked={!!u.enabled} onChange={e=>setU('enabled',e.target.checked)}/><span style={{fontSize:15,display:'flex',alignItems:'center'}}>{ProdIcon?<ProdIcon size={15} color={T.acc}/>:(pr.icon||'📦')}</span>{pr.name}</label>{u.enabled&&<div style={{marginTop:8}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:6}}><div><label style={S.lbl}>مقدار مصرف</label><input style={S.inp} defaultValue={u.dosage||''} onBlur={e=>setU('dosage',e.target.value)} placeholder="یک پیمانه"/></div><div><label style={S.lbl}>زمان مصرف</label><input style={S.inp} defaultValue={u.time||''} onBlur={e=>setU('time',e.target.value)} placeholder="بعد از صبحانه"/></div><div><label style={S.lbl}>ساعت مصرف</label><input style={S.inp} defaultValue={u.hour||''} onBlur={e=>setU('hour',e.target.value)} placeholder="۸ صبح"/></div><div><label style={S.lbl}>با چی بخوره</label><input style={S.inp} defaultValue={u.withWhat||''} onBlur={e=>setU('withWhat',e.target.value)} placeholder="با شیر"/></div></div><label style={{...S.lbl,marginTop:6}}>توضیحات تکمیلی این محصول</label><textarea style={{...S.ta,minHeight:52}} defaultValue={u.note||''} onBlur={e=>setU('note',e.target.value)}/></div>}</div>})}</details>
    {/* اصلاح ۱۲: چک‌باکس «نمایش اصلاحی» — اگر فعال باشد، کاربر در صفحه پیگیری تب «اصلاحی» را با امکان ویرایش می‌بیند */}
    <label style={{display:'flex',alignItems:'center',gap:7,marginTop:12,fontWeight:800,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={!!sub.showCorrectiveTab} onChange={e=>setSubs((list:any[])=>list.map(x=>x.id===sub.id?{...x,showCorrectiveTab:e.target.checked,changeHistory:logChange(x,e.target.checked?'فعال‌سازی نمایش اصلاحی':'غیرفعال‌سازی نمایش اصلاحی')}:x))}/> نمایش تب «اصلاحی» به کاربر در صفحه پیگیری (قابل ویرایش توسط کاربر)</label>
    <label style={{...S.lbl,marginTop:10}}>🩺 اطلاعات اصلاحی (قابل مشاهده در Track)</label><textarea style={S.ta} defaultValue={sub.corrective||""} onBlur={e=>setSubs((list:any[])=>list.map(x=>x.id===sub.id&&x.corrective!==e.target.value?{...x,corrective:e.target.value,changeHistory:logChange(x,"ویرایش اطلاعات اصلاحی")}:x))} placeholder="اطلاعات اصلاحی..."/>
    <label style={{...S.lbl,marginTop:10}}> نکات قابل مشاهده توسط کاربر (زیر توضیحات — یادداشت‌های مدیر نمایش داده نمی‌شود)</label><textarea style={S.ta} defaultValue={sub.userNotes||''} onBlur={e=>setSubs((list:any[])=>list.map(x=>x.id===sub.id&&x.userNotes!==e.target.value?{...x,userNotes:e.target.value,changeHistory:logChange(x,'ویرایش نکات قابل مشاهده کاربر')}:x))} placeholder="مواردی که کاربر در صفحه پیگیری می‌بیند..."/>
    <div style={{display:'flex',gap:8,marginTop:8,flexWrap:'wrap'}}><button style={AdminBtn()} onClick={()=>setSubs((s:any[])=>s.map(x=>x.id===sub.id?{...x,priority:x.priority==='high'?'normal':'high',changeHistory:logChange(x,x.priority==='high'?'تغییر اولویت به عادی':'تغییر اولویت به زیاد')}:x))}>تغییر اولویت</button><button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>confirm('حذف شود؟')&&setSubs((s:any[])=>s.filter(x=>x.id!==sub.id))}>حذف</button></div>
   </div>}
   {/* تب اصلاحی — نمایش correctiveData + دکمه کپی */}
   {subTab==='corrective'&&<div>
    {sub.correctiveData&&typeof sub.correctiveData==='object'?<div style={{display:'grid',gap:9,fontSize:12,lineHeight:1.9}}>
     <h4 style={{color:T.ttl,margin:'0 0 8px',fontWeight:800}}>📋 اطلاعات اصلاحی تکمیل‌شده توسط کاربر</h4>
     {Object.entries(sub.correctiveData).filter(([k,v])=>!['_trackingCodeRaw','_phoneRaw','submittedAt'].includes(k)&&v).map(([k,v])=>{
      const labels:Record<string,string>={height:'قد (سانتیمتر)',weight:'وزن (کیلوگرم)',appetite:'اشتها',sleep:'خواب',activity:'فعالیت',exercise:'ورزش',puberty:'بلوغ',waterIntake:'مصرف آب',snacks:'تنقلات',parentsHeight:'قد والدین',allergies:'حساسیت‌ها',diseases:'بیماری‌ها',medications:'داروها',temperament:'طبع',childName:'نام فرزند',age:'سن',additionalNotes:'توضیحات اضافی'};
      return <div key={k} style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:10,padding:'8px 10px'}}><span style={{color:T.mut}}>{labels[k]||k}: </span><b>{String(v)}</b></div>;
     })}
     {sub.correctiveData.submittedAt&&<div style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:10,padding:'8px 10px'}}><span style={{color:T.mut}}>تاریخ ثبت: </span><b>{new Date(sub.correctiveData.submittedAt).toLocaleString('fa-IR')}</b></div>}
     {/* دکمه کپی */}
     <button style={{...AdminBtn(),width:'100%',marginTop:10}} onClick={()=>{
      let text='📋 اطلاعات اصلاحی:\n\n';
      const labels:Record<string,string>={height:'قد (سانتیمتر)',weight:'وزن (کیلوگرم)',appetite:'اشتها',sleep:'خواب',activity:'فعالیت',exercise:'ورزش',puberty:'بلوغ',waterIntake:'مصرف آب',snacks:'تنقلات',parentsHeight:'قد والدین',allergies:'حساسیت‌ها',diseases:'بیماری‌ها',medications:'داروها',temperament:'طبع',childName:'نام فرزند',age:'سن',additionalNotes:'توضیحات اضافی'};
      Object.entries(sub.correctiveData).filter(([k,v])=>!['_trackingCodeRaw','_phoneRaw','submittedAt'].includes(k)&&v).forEach(([k,v])=>{text+=`${labels[k]||k}: ${v}\n`;});
      if(sub.correctiveData.submittedAt) text+=`\nتاریخ ثبت: ${new Date(sub.correctiveData.submittedAt).toLocaleString('fa-IR')}\n`;
      if(sub.course) text+=`\n📚 دوره تهیه‌شده: ${sub.course.title||'—'}\n`;
      if(sub.course?.price) text+=`💰 هزینه دوره: ${Number(sub.course.price).toLocaleString()} تومان\n`;
      if(navigator.clipboard?.writeText) navigator.clipboard.writeText(text); else {const ta=document.createElement('textarea');ta.value=text;document.body.appendChild(ta);ta.select();document.execCommand('copy');document.body.removeChild(ta);}
      alert('اطلاعات اصلاحی با موفقیت کپی شد!');
     }}>📋 کپی اطلاعات اصلاحی</button>
    </div>:<div style={{color:T.mut,textAlign:'center',padding:'20px 0'}}>کاربر هنوز فرم اصلاحی را تکمیل نکرده است.</div>}
   </div>}
  </div>}
 </div>}
 function GrowthBox({sub}:any){const nr=normRange(sub.age,sub.gender);const h=+p2e(sub.height),w=+p2e(sub.weight);if(!nr||(!h&&!w))return <div style={{marginTop:8,padding:10,borderRadius:10,background:T.soft,color:T.mut}}>اطلاعاتی برای تحلیل وجود ندارد</div>;const row=(kind:'h'|'w')=>{const isH=kind==='h';const val=isH?h:w;if(!val)return null;const min=isH?nr.hMin:nr.wMin,med=isH?nr.hMed:nr.wMed,max=isH?nr.hMax:nr.wMax,unit=isH?'cm':'kg';const st=growthStatus(val,min,med,max);const diff=Math.round((val-med)*10)/10;return <div style={{background:T.inp,border:`1px solid ${T.brd}`,borderRadius:10,padding:10}}><b>{isH?'قد':'وزن'}: {val} {unit}</b><div style={{color:st.color,fontWeight:800}}>وضعیت: {st.label}</div><div style={{color:T.mut}}>میانه WHO: {med} {unit} / بازه نرمال: {min} تا {max} {unit}</div><div style={{color:diff>=0?T.ok:T.err}}>اختلاف با میانه: {diff>0?`+${diff}`:diff} {unit}</div></div>};return <div style={{marginTop:10,padding:10,border:`1px solid ${T.brd}`,borderRadius:12,background:T.soft}}><b style={{color:T.ttl}}>تحلیل رشد بر اساس WHO</b><div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginTop:8}}>{row('h')}{row('w')}</div></div>}
 function SummarySub({sub}:any){return <div><div><b>اطلاعات کودک:</b> سن {sub.age||'—'}، {sub.gender==='male'?'پسر':sub.gender==='female'?'دختر':'—'}، قد {sub.height||'—'}، وزن {sub.weight||'—'}</div><GrowthBox sub={sub}/><div><b>والد:</b> {sub.pName||'—'} / <PhoneAction sub={sub} phone={sub.fullPhone}/></div><div><b>موضوع:</b> {(sub.topics||[]).join('، ')||'—'} / <b>دسته:</b> {sub.category}</div>{sub.shipping&&<div style={{marginTop:8,padding:9,borderRadius:10,background:T.soft}}><b>اطلاعات ارسال:</b><br/>مقصد: {sub.shipping.dest==='iran'?'ایران':'خارج'} / شهر/کشور: {sub.shipping.city||sub.shipping.country||'—'} / روش: {sub.shipping.method} / واتساپ: {sub.shipping.whatsapp?<PhoneAction sub={sub} phone={(sub.shipping.whatsappCc||'')+sub.shipping.whatsapp} whatsappOnly/>:'—'} / زمان تحویل: {sub.shipping.estimatedDelivery}</div>}{sub.course&&<div><b>دوره:</b> {sub.course.title}</div>}{sub.payment&&<div><b>پرداخت:</b> {sub.payment.bank?.name||'—'} / فیش: {sub.payment.receipt?'عکس دارد':sub.payment.receiptText?'متن پیامک دارد':'ندارد'}{sub.payment.receiptText&&<details style={{marginTop:6}}><summary>مشاهده متن پیامک واریز</summary><div style={{whiteSpace:'pre-wrap',background:T.inp,borderRadius:8,padding:8,marginTop:4}}>{sub.payment.receiptText}</div></details>}</div>}{sub.editHistory?.length>0&&<details style={{marginTop:8}}><summary>مشاهده اطلاعات اولیه و تاریخچه ویرایش</summary>{sub.editHistory.map((h:any,i:number)=><pre key={i} style={{whiteSpace:'pre-wrap',background:T.inp,padding:8,borderRadius:8,overflow:'auto'}}>نسخه {i+1} - {h.date} {h.time}
{JSON.stringify(h.data,null,2)}</pre>)}</details>}</div>}

 function ArrEditor({k,title}:any){const inputRef=useRef<HTMLInputElement|null>(null); const addVal=useCallback((raw?:string)=>{const v=p2e(raw ?? inputRef.current?.value ?? '').trim(); if(v){setEditCfg((prev:any)=>({...prev,[k]:[...(prev[k]||[]),v]})); if(inputRef.current) inputRef.current.value='';}},[k,setEditCfg]); const onNewChange=useCallback((e:any)=>{e.target.value=p2e(e.target.value)},[]); return <Box title={title}><div style={{display:'flex',gap:6,flexWrap:'wrap',marginBottom:8}}>{(editCfg[k]||[]).map((x:string,i:number)=><span key={i} style={{padding:'5px 8px',border:`1px solid ${T.brd}`,borderRadius:9}}><input style={{background:'transparent',border:0,color:T.txt,fontSize:16,width:130}} defaultValue={x} onBlur={e=>{const a=[...editCfg[k]];a[i]=p2e(e.target.value);setEditCfg({...editCfg,[k]:a})}}/><button onClick={()=>setEditCfg({...editCfg,[k]:editCfg[k].filter((_:any,j:number)=>j!==i)})}>×</button></span>)}</div><div style={{display:'flex',gap:6}}><input ref={inputRef} style={S.inp} onChange={onNewChange} onKeyDown={e=>{if(e.key==='Enter')addVal((e.target as HTMLInputElement).value)}} placeholder="مورد جدید"/><button style={AdminBtn()} onClick={()=>addVal()}>+</button></div></Box>}

 // بازطراحی: بخش‌های ادیتور پنل مدیریت با کارت نئومورفیک (سایه نرم به‌جای بردر ساده)
 function Box({title,children}:any){return <section className="admin-section-box" style={{background:T.card,borderRadius:14,padding:14,marginBottom:12,boxShadow:T.neuOut}}><h3 style={{fontSize:15,color:T.ttl,margin:'0 0 12px',fontWeight:800,lineHeight:1.6}}>{title}</h3>{children}</section>}
 function SettingsEditor(){const up=(k:string,v:any)=>setEditCfg({...editCfg,[k]:v}); const ff=editCfg.formFields; return <>
  {/* اصلاح ۲۶: دو تب مجزا برای تنظیمات پروژه ثانویه (فرم مشاوره) و پروژه اصلی (دوره‌ها + پنل) */}
  <div style={{display:'flex',gap:6,marginBottom:14}}>
   <button onClick={()=>setSettingsSubTab('secondary')} style={{...AdminBtn(),background:settingsSubTab==='secondary'?T.soft:T.card,color:settingsSubTab==='secondary'?T.acc:T.mut,boxShadow:settingsSubTab==='secondary'?T.neuIn:T.neuOut}}>تنظیمات پروژه ثانویه (فرم مشاوره)</button>
   <button onClick={()=>setSettingsSubTab('primary')} style={{...AdminBtn(),background:settingsSubTab==='primary'?T.soft:T.card,color:settingsSubTab==='primary'?T.acc:T.mut,boxShadow:settingsSubTab==='primary'?T.neuIn:T.neuOut}}>تنظیمات پروژه اصلی (دوره‌ها + پنل)</button>
   {/* اصلاح ۲: تب جدید چیدمان صفحه اصلی و منوی همبرگری */}
   <button onClick={()=>setSettingsSubTab('layout')} style={{...AdminBtn(),background:settingsSubTab==='layout'?T.soft:T.card,color:settingsSubTab==='layout'?T.acc:T.mut,boxShadow:settingsSubTab==='layout'?T.neuIn:T.neuOut}}>چیدمان صفحه اصلی و منوی همبرگری</button>
   {/* اصلاح ۲ (مرحله ۴): تب مستقل مدیریت متن‌ها و ترجمه‌ها */}
   <button onClick={()=>setSettingsSubTab('translations')} style={{...AdminBtn(),background:settingsSubTab==='translations'?T.soft:T.card,color:settingsSubTab==='translations'?T.acc:T.mut,boxShadow:settingsSubTab==='translations'?T.neuIn:T.neuOut}}>مدیریت متن‌ها و ترجمه‌ها</button>
  </div>
  {settingsSubTab==='secondary'&&<>
   <Box title="تنظیمات ظاهری (فرم مشاوره)"><label style={S.lbl}>تم</label><select style={S.inp} value={editCfg.theme} onChange={e=>up('theme',e.target.value)}>{Object.values(TH).map((th:any)=><option key={th.id} value={th.id}>{th.name}</option>)}</select>{['siteTitle','browserTitle','specialistName','heroTitle','heroDesc','noticeText','phoneNote','submitBtnText','successMsg','successSubMsg','timeSlotLabel'].map(k=><Field key={k} label={k} value={editCfg[k]||''} onChange={(v:string)=>up(k,v)} ph=""/>)}<label><input type="checkbox" checked={!!editCfg.showSpecialistPhoto} onChange={e=>up('showSpecialistPhoto',e.target.checked)}/> نمایش عکس متخصص در صفحه مشاوره</label><input type="file" accept="image/jpeg,image/png,image/webp" style={{...S.inp,marginTop:8}} onChange={async e=>{const f=e.target.files?.[0];if(f)up('photoUrl',await fileToData(f,editCfg.photoUrl,'profile'))}}/><button style={{...AdminBtn(),marginTop:8}} onClick={async()=>{await deleteStoredImage(editCfg.photoUrl);up('photoUrl',PROFILE_PHOTO)}}>بازگشت به عکس پیش‌فرض</button></Box>
   <Box title="تنظیمات فیلدهای فرم مشاوره">{Object.keys(ff).map(k=><div key={k} style={{borderBottom:`1px solid ${T.brd}`,padding:'8px 0'}}><b>{k}</b><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:7}}><input style={S.inp} defaultValue={ff[k].label} onBlur={e=>setEditCfg({...editCfg,formFields:{...ff,[k]:{...ff[k],label:e.target.value}}})}/><input style={S.inp} defaultValue={ff[k].placeholder} onBlur={e=>setEditCfg({...editCfg,formFields:{...ff,[k]:{...ff[k],placeholder:e.target.value}}})}/></div><label><input type="checkbox" checked={ff[k].show!==false} onChange={e=>setEditCfg({...editCfg,formFields:{...ff,[k]:{...ff[k],show:e.target.checked}}})}/> نمایش</label> <label><input type="checkbox" checked={!!ff[k].required} onChange={e=>setEditCfg({...editCfg,formFields:{...ff,[k]:{...ff[k],required:e.target.checked}}})}/> اجباری</label></div>)}</Box>
   {[['consultTopics','موضوعات مشاوره'],['digestiveOptions','گزینه‌های گوارش'],['appetiteOptions','گزینه‌های اشتها'],['specialConditions','شرایط خاص'],['timeSlots','بازه‌های تماس'],['categories','دسته‌بندی‌ها']].map(x=><ArrEditor key={x[0]} k={x[0]} title={x[1]}/>) }
   <Box title="پیام‌های موفقیت و راهنما"><Field label="متن پیام موفقیت" value={editCfg.successMsg||''} onChange={(v:string)=>up('successMsg',v)} ph=""/><Field label="متن زیرِ پیام موفقیت" value={editCfg.successSubMsg||''} onChange={(v:string)=>up('successSubMsg',v)} ph=""/><Field label="متن دکمه ثبت فرم جدید" value={editCfg.newFormBtn||''} onChange={(v:string)=>up('newFormBtn',v)} ph=""/><Field label="متن دکمه ثبت مستقیم دوره" value={editCfg.directCourseBtn||''} onChange={(v:string)=>up('directCourseBtn',v)} ph=""/></Box>
   <Box title="ورود مهمان - محتوای عمومی"><label style={S.lbl}>طریقه مصرف عمومی برای مهمان (guestUsage)</label><textarea style={S.ta} defaultValue={editCfg.guestUsage||""} onBlur={e=>up("guestUsage",e.target.value)} placeholder="متن طریقه مصرف عمومی..."/><label style={{...S.lbl,marginTop:10}}>برنامه غذایی عمومی برای مهمان (guestMealPlan)</label><textarea style={S.ta} defaultValue={editCfg.guestMealPlan||""} onBlur={e=>up("guestMealPlan",e.target.value)} placeholder="برنامه غذایی عمومی..."/></Box>
  </>}
  {settingsSubTab==='primary'&&<>
   <Box title="تنظیمات ظاهری (دوره‌ها + پنل)">{['adminLoginText'].map(k=><Field key={k} label={k} value={editCfg[k]||''} onChange={(v:string)=>up(k,v)} ph=""/>)}<label style={S.lbl}>حداکثر حجم فیش واریزی (کیلوبایت)</label><input style={S.inp} inputMode="numeric" type="number" min={100} max={1000} defaultValue={editCfg.imageCompressionKB||500} onBlur={e=>up('imageCompressionKB',Math.min(1000,Math.max(100,+p2e(e.target.value)||500)))}/><p style={{fontSize:11,color:T.mut,margin:'4px 0 12px'}}>عکس‌های آپلودی به این حجم فشرده می‌شوند (بین ۱۰۰ تا ۱۰۰۰ کیلوبایت).</p><button style={{...AdminBtn(),display:'block',marginBottom:12}} onClick={async()=>{if(!confirm('آیا از پاک‌سازی فیش‌های قدیمی‌تر از ۱ ماه مطمئن هستید؟ این عملیات قابل بازگشت نیست.'))return; try{const base=(import.meta as any).env?.VITE_SUPABASE_URL||''; const key=(import.meta as any).env?.VITE_SUPABASE_ANON_KEY||''; if(!base){alert('Supabase تنظیم نشده است.');return} const response=await fetch(`${base}/functions/v1/cleanup-receipts`,{method:'POST',headers:{'Content-Type':'application/json','Authorization':`Bearer ${key}`,'apikey':key}}); if(response.ok){const r=await response.json().catch(()=>({}));alert(`فیش‌های قدیمی با موفقیت پاک‌سازی شدند. (${r.deleted??0} فایل)`)}else{alert('خطا در پاک‌سازی فیش‌ها.')}}catch(e){alert('خطا در ارتباط با سرور.')}}}>🗑️ پاک‌سازی فیش‌های قدیمی (بیش از ۱ ماه)</button><label style={S.lbl}>تعداد ارقام کد پیگیری</label><select style={S.inp} value={editCfg.trackingDigitCount||5} onChange={e=>up('trackingDigitCount',parseInt(e.target.value))}><option value={4}>۴ رقم (ZK1234)</option><option value={5}>۵ رقم (ZK12345) — پیش‌فرض</option><option value={6}>۶ رقم (ZK123456)</option><option value={7}>۷ رقم (ZK1234567)</option><option value={8}>۸ رقم (ZK12345678)</option></select><p style={{fontSize:12,color:T.mut,marginTop:6,marginBottom:12}}>⚠️ تغییر این مقدار فقط برای فرم‌های جدید اعمال می‌شود. فرم‌های قبلی با همان کد قبلی باقی می‌مانند.</p></Box>

   {/* اصلاح ۳۰ (مرحله ۷): تنظیمات آپلود عکس زبان فرزند */}
   <Box title="عکس زبان فرزند (صفحه اطلاعات فرزند)">
    <label style={{display:'flex',alignItems:'center',gap:7,marginBottom:10,cursor:'pointer'}}><input type="checkbox" checked={!!editCfg.isTonguePhotoRequired} onChange={e=>up('isTonguePhotoRequired',e.target.checked)}/> اجباری بودن بارگذاری عکس زبان</label>
    <label style={S.lbl}>حداکثر حجم هر عکس (مگابایت)</label>
    <input style={S.inp} inputMode="numeric" type="number" min={1} max={15} defaultValue={editCfg.maxTonguePhotoSizeMB||5} onBlur={e=>up('maxTonguePhotoSizeMB',Math.min(15,Math.max(1,+p2e(e.target.value)||5)))}/>
    <label style={{...S.lbl,marginTop:10}}>حداکثر تعداد عکس‌ها</label>
    <input style={S.inp} inputMode="numeric" type="number" min={1} max={10} defaultValue={editCfg.maxTonguePhotoCount||3} onBlur={e=>up('maxTonguePhotoCount',Math.min(10,Math.max(1,+p2e(e.target.value)||3)))}/>
    <label style={{display:'flex',alignItems:'center',gap:7,marginTop:10,cursor:'pointer'}}><input type="checkbox" checked={editCfg.showTonguePhotoHint!==false} onChange={e=>up('showTonguePhotoHint',e.target.checked)}/> نمایش متن راهنما زیر عنوان بخش</label>
   </Box>
   <ProductsEditor/>
   <CountryEditor/>
   {/* اصلاح ۲ (مرحله ۴): مدیریت ترجمه‌ها به تب مستقل «مدیریت متن‌ها و ترجمه‌ها» منتقل شد (حذف تکرار از این‌جا) */}
  </>}
  {settingsSubTab==='layout'&&<LayoutEditor/>}
  {settingsSubTab==='translations'&&<TranslationsEditor/>}
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تغییرات</button>
 </>}
 // اصلاح ۱-۶ و ۲ و ۳ (مرحله ۴): تب مستقل مدیریت متن‌ها و ترجمه‌ها — شامل عناوین دوزبانه کنار عکس پروفایل،
 // متن صفحه درباره ما (دوزبانه) و ویرایش تمام کلیدهای ترجمه fa/en موجود در cfg.translations
 function TranslationsEditor(){const up=(k:string,v:any)=>setEditCfg({...editCfg,[k]:v}); return <>
  <Box title="عناوین کنار عکس پروفایل (دوزبانه)">
   <Field label="عنوان متخصص (فارسی)" value={editCfg.specialistTitle||''} onChange={(v:string)=>up('specialistTitle',v)} ph=""/>
   <Field label="عنوان متخصص (انگلیسی)" value={editCfg.specialistTitleEn||''} onChange={(v:string)=>up('specialistTitleEn',v)} ph=""/>
   <Field label="زیرعنوان خوش‌آمدگویی (فارسی)" value={editCfg.heroSubtitle||''} onChange={(v:string)=>up('heroSubtitle',v)} ph=""/>
   <Field label="زیرعنوان خوش‌آمدگویی (انگلیسی)" value={editCfg.heroSubtitleEn||''} onChange={(v:string)=>up('heroSubtitleEn',v)} ph=""/>
  </Box>
  <Box title="متن صفحه درباره ما (دوزبانه)">
   <label style={S.lbl}>متن فارسی</label><textarea style={S.ta} defaultValue={editCfg.aboutText||''} onBlur={e=>up('aboutText',e.target.value)} placeholder="متن صفحه درباره ما به فارسی..."/>
   <label style={{...S.lbl,marginTop:10}}>متن انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.aboutTextEn||''} onBlur={e=>up('aboutTextEn',e.target.value)} placeholder="About us content in English..."/>
  </Box>
  {/* اصلاح ۳۲ (مرحله ۹): متن‌های سئوی سوال‌محور/کلیدواژه‌محور برای صفحات دوره‌ها، تجربه والدین، آموزش‌ها و درباره ما (دوزبانه) */}
  <Box title="متن‌های سئو در انتهای صفحات (دوزبانه)">
   <details style={{marginBottom:10}}>
    <summary style={{cursor:'pointer',fontWeight:800,fontSize:13,color:T.ttl}}>معرفی دوره‌ها</summary>
    <label style={{...S.lbl,marginTop:8}}>متن کوتاه (بالای صفحه) — فارسی</label><textarea style={S.ta} defaultValue={editCfg.coursesIntroText||''} onBlur={e=>up('coursesIntroText',e.target.value)} placeholder="متن سئوی کوتاه صفحه دوره‌ها به فارسی..."/>
    <label style={{...S.lbl,marginTop:8}}>متن کوتاه (بالای صفحه) — انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.coursesIntroTextEn||''} onBlur={e=>up('coursesIntroTextEn',e.target.value)} placeholder="Short SEO text for Courses page in English..."/>
    <label style={{...S.lbl,marginTop:8}}>متن کامل (پایین صفحه، بین FAQ و ارتباط) — فارسی</label><textarea style={S.ta} defaultValue={editCfg.coursesSeoFullText||''} onBlur={e=>up('coursesSeoFullText',e.target.value)} placeholder="متن سئوی کامل پایین صفحه دوره‌ها به فارسی..."/>
    <label style={{...S.lbl,marginTop:8}}>متن کامل (پایین صفحه) — انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.coursesSeoFullTextEn||''} onBlur={e=>up('coursesSeoFullTextEn',e.target.value)} placeholder="Full SEO text for bottom of Courses page in English..."/>
   </details>
   <details style={{marginBottom:10}}>
    <summary style={{cursor:'pointer',fontWeight:800,fontSize:13,color:T.ttl}}>تجربه والدین</summary>
    <label style={{...S.lbl,marginTop:8}}>متن فارسی</label><textarea style={S.ta} defaultValue={editCfg.experienceIntroText||''} onBlur={e=>up('experienceIntroText',e.target.value)} placeholder="متن سئوی صفحه تجربه والدین به فارسی..."/>
    <label style={{...S.lbl,marginTop:8}}>متن انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.experienceIntroTextEn||''} onBlur={e=>up('experienceIntroTextEn',e.target.value)} placeholder="Parents' experience page SEO text in English..."/>
   </details>
   <details style={{marginBottom:10}}>
    <summary style={{cursor:'pointer',fontWeight:800,fontSize:13,color:T.ttl}}>آموزش‌ها</summary>
    <label style={{...S.lbl,marginTop:8}}>متن فارسی</label><textarea style={S.ta} defaultValue={editCfg.educationIntroText||''} onBlur={e=>up('educationIntroText',e.target.value)} placeholder="متن سئوی صفحه آموزش‌ها به فارسی..."/>
    <label style={{...S.lbl,marginTop:8}}>متن انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.educationIntroTextEn||''} onBlur={e=>up('educationIntroTextEn',e.target.value)} placeholder="Tutorials page SEO text in English..."/>
   </details>
   <details>
    <summary style={{cursor:'pointer',fontWeight:800,fontSize:13,color:T.ttl}}>درباره ما</summary>
    <label style={{...S.lbl,marginTop:8}}>متن فارسی</label><textarea style={S.ta} defaultValue={editCfg.aboutIntroText||''} onBlur={e=>up('aboutIntroText',e.target.value)} placeholder="متن سئوی صفحه درباره ما به فارسی..."/>
    <label style={{...S.lbl,marginTop:8}}>متن انگلیسی</label><textarea style={S.ta} defaultValue={editCfg.aboutIntroTextEn||''} onBlur={e=>up('aboutIntroTextEn',e.target.value)} placeholder="About page SEO text in English..."/>
   </details>
  </Box>
  {/* اصلاح ۳۲ (مرحله ۹): مدیریت کامل سوالات متداول (FAQ) — دوزبانه، افزودن/ویرایش/حذف/تغییر ترتیب + تنظیمات نمایش در صفحه اصلی */}
  <FAQEditor/>
  {/* اصلاح ۲: مدیریت سوالات متداول زیر تب‌های دوره */}
  <CourseTabFAQEditor/>
  <Box title="مدیریت کلیدهای ترجمه (fa / en)">{(['fa','en'] as const).map(l=><details key={l} style={{marginBottom:10}}><summary style={{cursor:'pointer',fontWeight:800}}>{l==='fa'?'فارسی':'English'} ({Object.keys(editCfg.translations?.[l]||{}).length} کلید)</summary>{Object.keys(editCfg.translations?.[l]||{}).sort().map(k=><div key={k} style={{display:'grid',gridTemplateColumns:'150px 1fr',gap:8,marginTop:6,alignItems:'center'}}><label style={{fontSize:11,color:T.mut,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}} title={k}>{k}</label><input style={S.inp} defaultValue={editCfg.translations[l][k]||''} onBlur={e=>setEditCfg({...editCfg,translations:{...editCfg.translations,[l]:{...editCfg.translations[l],[k]:e.target.value}}})}/></div>)}</details>)}</Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره متن‌ها و ترجمه‌ها</button>
 </>}
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
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(faList,updFa,i,-1)}>▲</button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===faList.length-1} onClick={()=>move(faList,updFa,i,1)}>▼</button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(faList,updFa,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addFa}>+ افزودن سوال جدید (فارسی)</button>
    </div>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>English ({enList.length})</h4>
     {enList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgEn(i,'question',e.target.value)} placeholder="Question"/>
      <textarea dir="ltr" style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgEn(i,'answer',e.target.value)} placeholder="Answer"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(enList,updEn,i,-1)}>▲</button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===enList.length-1} onClick={()=>move(enList,updEn,i,1)}>▼</button>
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
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(faList,updFa,i,-1)}>▲</button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===faList.length-1} onClick={()=>move(faList,updFa,i,1)}>▼</button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>remove(faList,updFa,i)}>حذف</button>
      </div>
     </div>)}
     <button style={AdminBtn()} onClick={addFa}>+ افزودن سوال جدید (فارسی)</button>
    </div>
    <div>
     <h4 style={{color:T.ttl,margin:'0 0 8px'}}>English ({enList.length})</h4>
     {enList.map((item:any,i:number)=><div key={item.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.badge}}>
      <select style={{...S.inp,marginBottom:6}} value={item.tab||'growth'} onChange={e=>chgEn(i,'tab',e.target.value)}>{tabOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>
      <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={item.question||''} onBlur={e=>chgEn(i,'question',e.target.value)} placeholder="Question"/>
      <textarea dir="ltr" style={{...S.ta,minHeight:64}} defaultValue={item.answer||''} onBlur={e=>chgEn(i,'answer',e.target.value)} placeholder="Answer"/>
      <div style={{display:'flex',gap:6,marginTop:6}}>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(enList,updEn,i,-1)}>▲</button>
       <button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===enList.length-1} onClick={()=>move(enList,updEn,i,1)}>▼</button>
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
 function LayoutEditor(){
  const homeLabels:Record<string,string>={consult:'ثبت درخواست مشاوره',courses:'معرفی دوره‌ها',experience:'تجربه والدین',licenses:'مجوزها',contact:'ارتباط با ما'};
  const menuLabels:Record<string,string>={consult:'فرم مشاوره',courses:'معرفی دوره‌ها',experience:'تجربه والدین',licenses:'مجوزها',education:'آموزش‌ها',faq:'سوالات متداول',about:'درباره ما',contact:'ارتباط با ما',track:'وارد کردن کد پیگیری'};
  const move=(key:'homeLayout'|'menuLayout',i:number,dir:-1|1)=>{const list=[...(editCfg[key]||[])]; const j=i+dir; if(j<0||j>=list.length)return; [list[i],list[j]]=[list[j],list[i]]; setEditCfg({...editCfg,[key]:list})};
  const toggle=(key:'homeLayout'|'menuLayout',i:number)=>{const list=[...(editCfg[key]||[])]; list[i]={...list[i],show:!list[i].show}; setEditCfg({...editCfg,[key]:list})};
  const Section=({title,items,labels,stateKey}:{title:string,items:any[],labels:Record<string,string>,stateKey:'homeLayout'|'menuLayout'})=><Box title={title}>{items.map((it:any,i:number)=><div key={it.id} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 6px',borderRadius:10,background:T.soft,marginBottom:6}}><label style={{display:'flex',alignItems:'center',gap:6,flex:1,fontSize:13,fontWeight:700,cursor:'pointer'}}><input type="checkbox" checked={it.show!==false} onChange={()=>toggle(stateKey,i)}/> {labels[it.id]||it.id}</label><button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===0} onClick={()=>move(stateKey,i,-1)}>▲</button><button style={{...AdminBtn(),padding:'6px 10px'}} disabled={i===items.length-1} onClick={()=>move(stateKey,i,1)}>▼</button></div>)}</Box>;
  // اصلاح ۵: بخش «صفحات دارای منوی همبرگری» — چک‌باکس برای هر view پروژه (شامل admin-login)
  const viewLabels:[string,string][]=[['home','صفحه اصلی (Home)'],['courses','معرفی دوره‌ها'],['child-info','اطلاعات فرزند'],['course-shipping','اطلاعات ارسال'],['course-payment','پرداخت'],['course-confirm','تأیید ثبت‌نام'],['course-done','اتمام ثبت‌نام'],['track','پیگیری'],['experience','تجربه والدین'],['licenses','مجوزها'],['education','آموزش‌ها'],['about','درباره ما'],['contact','ارتباط با ما'],['admin-login','ورود پنل مدیریت'],['admin','پنل مدیریت']];
  const toggleMenuVis=(id:string)=>{const cur=editCfg.menuVisibility||{}; setEditCfg({...editCfg,menuVisibility:{...cur,[id]:!(cur[id]!==undefined?cur[id]:true)}})};
  // اصلاح ۳۲ (مرحله ۹): «ترتیب نمایش محتوا در صفحات» — برای هر صفحه، نمایش/عدم‌نمایش محتوای سئو و ترتیب آن نسبت به «ارتباط با ما»
  const contentOrderPages:[string,string][]=[['home','صفحه اصلی'],['courses','معرفی دوره‌ها'],['experience','تجربه والدین'],['education','آموزش‌ها'],['about','درباره ما']];
  const pco=editCfg.pageContentOrder||{};
  const updPco=(id:string,patch:any)=>setEditCfg({...editCfg,pageContentOrder:{...pco,[id]:{...(pco[id]||{}),...patch}}});
  return <>
   <Section title="چیدمان صفحه اصلی (میانبرهای هوم)" items={editCfg.homeLayout||[]} labels={homeLabels} stateKey="homeLayout"/>
   <Box title="مدل نمایش خدمات">
    <p style={{fontSize:11,color:T.mut,marginBottom:8,lineHeight:1.8}}>تنظیمات تفکیکی هر صفحه در تب «خدمات» قابل ویرایش است.</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
     <div><label style={S.lbl}>صفحه اصلی</label><select style={S.inp} value={editCfg.servicesDisplayMode?.home||'list'} onChange={e=>setEditCfg({...editCfg,servicesDisplayMode:{...(editCfg.servicesDisplayMode||{}),home:e.target.value}})}><option value="list">📋 لیست</option><option value="carousel">🎠 کاروسل</option></select></div>
     <div><label style={S.lbl}>صفحه دوره‌ها</label><select style={S.inp} value={editCfg.servicesDisplayMode?.courses||'list'} onChange={e=>setEditCfg({...editCfg,servicesDisplayMode:{...(editCfg.servicesDisplayMode||{}),courses:e.target.value}})}><option value="list">📋 لیست</option><option value="carousel">🎠 کاروسل</option></select></div>
    </div>
   </Box>
   <Section title="چیدمان منوی همبرگری" items={editCfg.menuLayout||[]} labels={menuLabels} stateKey="menuLayout"/>
   <Box title="صفحات دارای منوی همبرگری">{viewLabels.map(([id,label])=><label key={id} style={{display:'flex',alignItems:'center',gap:7,padding:'7px 6px',fontSize:13,fontWeight:700,cursor:'pointer'}}><input type="checkbox" checked={(editCfg.menuVisibility||{})[id]!==undefined?!!(editCfg.menuVisibility||{})[id]:true} onChange={()=>toggleMenuVis(id)}/> {label}</label>)}<p style={{fontSize:11,color:T.mut,marginTop:6}}>در صفحاتی که این گزینه فعال باشد، آیکون منوی همبرگری (☰) نمایش داده می‌شود.</p></Box>
   {/* اصلاح ۳۲ (مرحله ۹): ترتیب نمایش محتوای سئو نسبت به ارتباط با ما، برای هر صفحه به‌صورت مجزا */}
   <Box title="ترتیب نمایش محتوا در صفحات">
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>برای هر صفحه مشخص کنید آیا محتوای سئوی انتهای صفحه نمایش داده شود یا نه، و ترتیب آن نسبت به بخش «ارتباط با ما» چگونه باشد.</p>
    {contentOrderPages.map(([id,label])=>{const cfgRow=pco[id]||{showIntro:true,order:'contentFirst'}; return <div key={id} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.soft}}>
     <b style={{fontSize:13,color:T.ttl,display:'block',marginBottom:8}}>{label}</b>
     <label style={{display:'flex',alignItems:'center',gap:7,fontSize:13,cursor:'pointer',marginBottom:8}}><input type="checkbox" checked={cfgRow.showIntro!==false} onChange={e=>updPco(id,{showIntro:e.target.checked})}/> نمایش محتوای سئو در این صفحه</label>
     <div style={{display:'flex',gap:14,flexWrap:'wrap'}}>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,cursor:'pointer'}}><input type="radio" name={`order-${id}`} checked={cfgRow.order!=='contactFirst'} onChange={()=>updPco(id,{order:'contentFirst'})}/> اول محتوا، سپس ارتباط با ما</label>
      <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12.5,cursor:'pointer'}}><input type="radio" name={`order-${id}`} checked={cfgRow.order==='contactFirst'} onChange={()=>updPco(id,{order:'contactFirst'})}/> اول ارتباط با ما، سپس محتوا</label>
     </div>
    </div>})}
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره چیدمان</button>
  </>;
 }
 // اصلاح ۷: تب مستقل «مدیریت محتوا» شامل محتوای چندرسانه‌ای، تجربه والدین، مجوزها و آموزش‌ها
 function ContentEditor(){const up=(k:string,v:any)=>setEditCfg({...editCfg,[k]:v}); return <>
  <CustomPlatformsEditor/>
  <MediaEditor/>
  <StoryHighlightsEditor/>
  <MediaLibraryEditor sectionKey="experience" title="تجربه والدین (صفحه تجربه والدین)" withText/>
  <MediaLibraryEditor sectionKey="education" title="آموزش‌ها (ویدیو / ویس / عکس / متن)" withText/>
  <Box title="مجوزها"><label style={S.lbl}>متن صفحه مجوزها</label><textarea style={S.ta} defaultValue={editCfg.licensesText||''} onBlur={e=>up('licensesText',e.target.value)} placeholder="متن یا توضیحات مجوزها و گواهینامه‌ها..."/></Box>
  <Box title="کنترل نمایش تب‌ها (تجربه والدین)"><label><input type="checkbox" checked={editCfg.experienceTabs?.video!==false} onChange={e=>setEditCfg({...editCfg,experienceTabs:{...(editCfg.experienceTabs||{}),video:e.target.checked}})} /> ویدیو</label><br/><label><input type="checkbox" checked={editCfg.experienceTabs?.audio!==false} onChange={e=>setEditCfg({...editCfg,experienceTabs:{...(editCfg.experienceTabs||{}),audio:e.target.checked}})} /> ویس</label><br/><label><input type="checkbox" checked={editCfg.experienceTabs?.image!==false} onChange={e=>setEditCfg({...editCfg,experienceTabs:{...(editCfg.experienceTabs||{}),image:e.target.checked}})} /> عکس</label><br/><label><input type="checkbox" checked={!!editCfg.experienceTabs?.text} onChange={e=>setEditCfg({...editCfg,experienceTabs:{...(editCfg.experienceTabs||{}),text:e.target.checked}})} /> متن</label><p style={{fontSize:11,color:T.mut,marginTop:6}}>ادمین می‌تواند تعیین کند کدام تب‌ها نمایش داده شوند. گزینه «متن» بخش تجربه والدین را نیز فعال می‌کند.</p></Box>
  <Box title="تشخیص VPN / کشور کاربر"><label style={S.lbl}>حالت تشخیص</label><select style={{...S.inp,marginBottom:8}} value={editCfg.mediaCountryMode||'auto'} onChange={e=>up('mediaCountryMode',e.target.value)}><option value="auto">خودکار (تشخیص VPN + موقعیت کاربر)</option><option value="iran">همیشه محتوای ایران (آپارات)</option><option value="intl">همیشه محتوای بین‌الملل (یوتیوب)</option></select><p style={{fontSize:11,color:T.mut,lineHeight:1.9,margin:0}}>در حالت خودکار: اگر VPN کاربر روشن باشد، محتوای یوتیوب و در غیر این صورت محتوای آپارات نمایش داده می‌شود (برای ویدیو، ویس و عکس).</p></Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تغییرات محتوا</button>
 </>}
 // اصلاح ۱۸: بازطراحی کامل هایلایت و استوری — چند هایلایت، هر کدام چند اسلاید (کد تصویر خارجی/داخلی)
 function StoryHighlightsEditor(){
  const rawSH=editCfg.storyHighlights;
  const storyHighlights=(rawSH&&typeof rawSH==='object')?rawSH:{};
  const highlightsRaw=(storyHighlights.highlights);
  const highlights:any[]=Array.isArray(highlightsRaw)?highlightsRaw:(highlightsRaw&&typeof highlightsRaw==='object'?Object.values(highlightsRaw):[]);
  const upd=(list:any[])=>setEditCfg({...editCfg,storyHighlights:{...(editCfg.storyHighlights||{}),highlights:list}});
  const chgHl=(i:number,k:string,v:any)=>{const a=[...highlights];a[i]={...a[i],[k]:v};upd(a);};
  const addHl=()=>upd([...highlights,{id:'hl'+uid(),title:'هایلایت جدید',coverUrl:'',active:true,order:highlights.length+1,stories:[]}]);
  const removeHl=(i:number)=>upd(highlights.filter((_:any,j:number)=>j!==i));
  const moveHl=(i:number,dir:-1|1)=>{const a=[...highlights];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})));};
  const updStories=(hi:number,stories:any[])=>chgHl(hi,'stories',stories);
  const chgStory=(hi:number,si:number,k:string,v:any)=>{const stories=[...highlights[hi].stories];stories[si]={...stories[si],[k]:v};updStories(hi,stories);};
  const addStory=(hi:number)=>{const stories=[...highlights[hi].stories];stories.push({id:'st'+uid(),title:'',imageCodeExternal:'',imageCodeInternal:'',active:true,order:stories.length+1});updStories(hi,stories);};
  const removeStory=(hi:number,si:number)=>{const stories=[...highlights[hi].stories].filter((_:any,j:number)=>j!==si);updStories(hi,stories);};
  const moveStory=(hi:number,si:number,dir:-1|1)=>{const stories=[...highlights[hi].stories];const j=si+dir;if(j<0||j>=stories.length)return;[stories[si],stories[j]]=[stories[j],stories[si]];updStories(hi,stories.map((x:any,idx:number)=>({...x,order:idx+1})));};
  const migrateItems=()=>{const items=(editCfg.storyHighlights?.items)||[];if(!items.length)return;const legacy={id:'legacy',title:'استوری',coverUrl:'',active:true,order:1,stories:items.map((it:any,idx:number)=>({id:it.id,title:it.title||'',imageCodeExternal:it.embedCode||'',imageCodeInternal:it.embedCode||'',active:it.active!==false,order:it.order||idx+1}))};upd([...highlights,legacy]);setEditCfg({...editCfg,storyHighlights:{...editCfg.storyHighlights,items:[]}});};
  return <Box title="مدیریت هایلایت استوری (تجربه والدین / آموزش‌ها)">
   <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>هر هایلایت یک دایره در بالای صفحات «تجربه والدین» و «آموزش‌ها» است. هر هایلایت شامل چند استوری (اسلاید) با دو کد دستی تصویر (خارجی/داخلی) می‌باشد.</p>
   {(editCfg.storyHighlights?.items||[]).length>0&&<div style={{marginBottom:12,padding:10,background:`${T.warn}18`,border:`1px solid ${T.warn}`,borderRadius:10,fontSize:12,color:T.warn}}>{editCfg.storyHighlights.items.length} استوری قدیمی موجود است. <button style={{...AdminBtn(),marginInlineStart:8}} onClick={migrateItems}>انتقال به ساختار جدید</button></div>}
   {highlights.map((hl:any,hi:number)=><details key={hl.id||hi} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
    <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{hi+1}. {hl.title||'بدون عنوان'} ({(hl.stories||[]).length} استوری)</summary>
    <div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}><label style={{fontSize:12,whiteSpace:'nowrap'}}><input type="checkbox" checked={hl.active!==false} onChange={e=>chgHl(hi,'active',e.target.checked)}/> فعال</label></div>
    <Field label="عنوان هایلایت" value={hl.title||''} onChange={(v:string)=>chgHl(hi,'title',v)} ph=""/>
    <Field label="آدرس کاور (اختیاری)" value={hl.coverUrl||''} onChange={(v:string)=>chgHl(hi,'coverUrl',v)} ph="https://..."/>
    <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'8px 0'}}>
     <button style={AdminBtn()} disabled={hi===0} onClick={()=>moveHl(hi,-1)}>بالا</button>
     <button style={AdminBtn()} disabled={hi===highlights.length-1} onClick={()=>moveHl(hi,1)}>پایین</button>
     <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>removeHl(hi)}>حذف هایلایت</button>
    </div>
    <div style={{marginTop:10,padding:10,background:T.soft,borderRadius:10}}>
     <b style={{fontSize:12,color:T.ttl,display:'block',marginBottom:8}}>استوری‌ها</b>
     {(hl.stories||[]).map((st:any,si:number)=><div key={st.id||si} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:8,marginTop:8,background:T.card}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:6}}>
       <label style={{fontSize:12,whiteSpace:'nowrap'}}><input type="checkbox" checked={st.active!==false} onChange={e=>chgStory(hi,si,'active',e.target.checked)}/> فعال</label>
       <span style={{fontSize:12,color:T.mut}}>اسلاید {si+1}</span>
      </div>
      <Field label="عنوان اسلاید" value={st.title||''} onChange={(v:string)=>chgStory(hi,si,'title',v)} ph=""/>
      <label style={S.lbl}>کد تصویر خارجی (VPN روشن)</label>
      <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeExternal||''} onBlur={e=>chgStory(hi,si,'imageCodeExternal',e.target.value.trim())} placeholder='<img src="https://..." />'/>
      <label style={S.lbl}>کد تصویر داخلی (VPN خاموش)</label>
      <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeInternal||''} onBlur={e=>chgStory(hi,si,'imageCodeInternal',e.target.value.trim())} placeholder='<img src="https://..." />'/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
       <button style={AdminBtn()} disabled={si===0} onClick={()=>moveStory(hi,si,-1)}>بالا</button>
       <button style={AdminBtn()} disabled={si===(hl.stories||[]).length-1} onClick={()=>moveStory(hi,si,1)}>پایین</button>
       <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>removeStory(hi,si)}>حذف اسلاید</button>
      </div>
     </div>)}
     <button style={{...AdminBtn(),marginTop:8}} onClick={()=>addStory(hi)}>+ افزودن اسلاید</button>
    </div>
   </details>)}
   <button style={{...AdminBtn(),marginTop:8}} onClick={addHl}>+ افزودن هایلایت</button>
   <button style={{...S.btn,marginTop:10}} onClick={()=>setSave(editCfg)}>ذخیره هایلایت استوری</button>
  </Box>;
 }
 function CountryEditor(){return <Box title="مدیریت کدهای کشور">{editCfg.countryCodes.map((c:any,i:number)=><div key={c.id} style={{display:'grid',gridTemplateColumns:'55px 1fr 80px 1.4fr 45px',gap:6,marginBottom:6}}><input style={S.inp} defaultValue={c.flag} onBlur={e=>chgCountry(i,'flag',e.target.value)}/><input style={S.inp} defaultValue={c.name} onBlur={e=>chgCountry(i,'name',e.target.value)}/><input style={S.inp} defaultValue={c.code} onBlur={e=>chgCountry(i,'code',p2e(e.target.value))}/><input style={S.inp} defaultValue={c.regex} onBlur={e=>chgCountry(i,'regex',e.target.value)}/><button disabled={c.locked} onClick={()=>setEditCfg({...editCfg,countryCodes:editCfg.countryCodes.filter((_:any,j:number)=>j!==i)})}>×</button></div>)}<button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,countryCodes:[...editCfg.countryCodes,{id:'c'+uid(),name:'کشور جدید',code:'+0',flag:'🌍',regex:'^\\d{7,}$'}]})}>افزودن کشور</button></Box>}
 function chgCountry(i:number,k:string,v:any){const a=[...editCfg.countryCodes];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,countryCodes:a})}
 function ContactsEditor(){const custom=editCfg.contacts.custom||[];const updCustom=(i:number,k:string,v:any)=>{const a=[...custom];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,contacts:{...editCfg.contacts,custom:a}})};return <><Box title="اطلاعات تماس">{['phone','whatsapp','telegram','instagram','rubika','bale'].map(k=><Field key={k} label={k} value={editCfg.contacts[k]||''} onChange={(v:string)=>setEditCfg({...editCfg,contacts:{...editCfg.contacts,[k]:v}})} ph=""/>)}<h4>نمایش در صفحات</h4>{Object.keys(editCfg.contactVisibility).map(k=><label key={k} style={{display:'block',marginBottom:6}}><input type="checkbox" checked={!!editCfg.contactVisibility[k]} onChange={e=>setEditCfg({...editCfg,contactVisibility:{...editCfg.contactVisibility,[k]:e.target.checked}})}/> {k}</label>)}</Box><Box title="مدیریت راه‌های ارتباطی">{custom.map((it:any,i:number)=><div key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8}}><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}><input style={S.inp} defaultValue={it.title||''} onBlur={e=>updCustom(i,'title',e.target.value)} placeholder="عنوان"/><input style={S.inp} defaultValue={it.url||''} onBlur={e=>updCustom(i,'url',e.target.value)} placeholder="URL"/></div><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:8}}><input type="color" style={{...S.inp,height:44,padding:4}} value={it.color||'#2564a8'} onChange={e=>updCustom(i,'color',e.target.value)}/><input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f)updCustom(i,'iconUrl',await fileToData(f,it.iconUrl,'contact-icons'))}}/></div><div style={{display:'flex',gap:6,marginTop:8,flexWrap:'wrap'}}><button style={AdminBtn()} onClick={()=>{if(i>0){const a=[...custom];[a[i-1],a[i]]=[a[i],a[i-1]];setEditCfg({...editCfg,contacts:{...editCfg.contacts,custom:a}})}}}>بالا</button><button style={AdminBtn()} onClick={()=>{if(i<custom.length-1){const a=[...custom];[a[i+1],a[i]]=[a[i],a[i+1]];setEditCfg({...editCfg,contacts:{...editCfg.contacts,custom:a}})}}}>پایین</button><button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>setEditCfg({...editCfg,contacts:{...editCfg.contacts,custom:custom.filter((_:any,j:number)=>j!==i)}})}>حذف</button></div></div>)}<button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,contacts:{...editCfg.contacts,custom:[...custom,{id:'ct'+uid(),title:'راه ارتباطی جدید',url:'',color:'#2564a8',order:custom.length+1}]}})}>افزودن راه ارتباطی</button></Box><Box title="مدیریت آیکون‌های ارتباط با ما">{Object.keys(editCfg.contactIcons||{}).map(k=><div key={k} style={{display:'grid',gridTemplateColumns:'120px 1fr',gap:8,marginBottom:8,alignItems:'center'}}><label>{k}</label><input type="color" style={{...S.inp,height:44,padding:4}} value={editCfg.contactIcons[k]?.color||'#2564a8'} onChange={e=>setEditCfg({...editCfg,contactIcons:{...editCfg.contactIcons,[k]:{...(editCfg.contactIcons[k]||{}),color:e.target.value}}})}/></div>)}</Box><button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره</button></>}

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
  <Box title="⭐ دوره‌های ویژه (Featured Courses)">
   <div style={{display:'grid',gap:12}}>
    <div>
     <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:fc.enabled?`${T.ok}12`:`${T.err}12`,border:`1px solid ${fc.enabled?T.ok:T.err}`,borderRadius:12}}>
      <input type="checkbox" checked={fc.enabled!==false} onChange={e=>up({enabled:e.target.checked})} style={{width:18,height:18}}/>
      <span>{fc.enabled!==false?'✅ بخش دوره‌های ویژه فعال است (در صفحه اصلی نمایش داده می‌شود)':'❌ بخش دوره‌های ویژه غیرفعال است'}</span>
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
      {idx>0&&<button style={{...AdminBtn(),color:T.err,padding:'8px 0',marginBottom:0}} onClick={()=>removeCourseAt(idx)}>✕</button>}
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
  <Box title="🏷️ دوره‌های ویژه با تگ">
   <div style={{display:'flex',flexDirection:'column',gap:14}}>
    {/* فعال/غیرفعال */}
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:tc.enabled!==false?`${T.ok}12`:`${T.err}12`,border:`1px solid ${tc.enabled!==false?T.ok:T.err}`,borderRadius:12}}>
     <input type="checkbox" checked={tc.enabled!==false} onChange={e=>up({enabled:e.target.checked})} style={{width:18,height:18}}/>
     <span>{tc.enabled!==false?'✅ بخش دوره‌های تگ‌دار فعال است':'❌ بخش دوره‌های تگ‌دار غیرفعال است'}</span>
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
      ℹ️ این بخش دوره‌هایی را نمایش می‌دهد که حداقل یکی از تگ‌های مشخص‌شده (popular, bestseller, trending) را داشته باشند. تگ‌ها در بخش «دوره‌ها» برای هر دوره قابل تنظیم هستند.
     </p>
    </div>
   </div>
  </Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تنظیمات دوره‌های تگ‌دار</button>
 </>;
}


function CoursesEditor(){const rawTabs=editCfg.courseTabs;const tabs:any[]=Array.isArray(rawTabs)?rawTabs:(rawTabs&&typeof rawTabs==='object'?Object.values(rawTabs):[]); const chg=(ti:number,k:string,v:any)=>{const a=[...tabs];a[ti]={...a[ti],[k]:v};setEditCfg({...editCfg,courseTabs:a})}; const chgC=(ti:number,ci:number,k:string,v:any)=>{const a=[...tabs];a[ti].courses=[...a[ti].courses];a[ti].courses[ci]={...a[ti].courses[ci],[k]:v};setEditCfg({...editCfg,courseTabs:a})}; return <><Box title="واحد پول دوره‌ها"><label style={S.lbl}>واحد پول</label><select style={S.inp} value={editCfg.currencyUnit||'تومان'} onChange={e=>setEditCfg({...editCfg,currencyUnit:e.target.value})}><option value="تومان">تومان</option><option value="ریال">ریال</option></select></Box><Box title="مدیریت تب‌ها و دوره‌ها">{tabs.map((tab:any,ti:number)=><details key={tab.id} style={{marginBottom:10,background:T.badge,borderRadius:12,padding:10}}><summary style={{cursor:'pointer',fontWeight:800}}>{tab.title}</summary><div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginTop:10}}><input style={S.inp} defaultValue={tab.title} onBlur={e=>chg(ti,'title',e.target.value)}/><input style={S.inp} defaultValue={tab.inactiveMessage} onBlur={e=>chg(ti,'inactiveMessage',e.target.value)}/></div><label style={{...S.lbl,marginTop:8}}>خلاصه اطلاعات بیشتر</label><input style={S.inp} defaultValue={tab.detailedInfo?.summary||''} onBlur={e=>chg(ti,'detailedInfo',{...(tab.detailedInfo||{}),summary:e.target.value})}/><label style={{...S.lbl,marginTop:8}}>متن کامل اطلاعات بیشتر</label><textarea style={S.ta} defaultValue={tab.detailedInfo?.fullText||''} onBlur={e=>chg(ti,'detailedInfo',{...(tab.detailedInfo||{}),fullText:e.target.value})}/><label><input type="checkbox" checked={tab.active} onChange={e=>chg(ti,'active',e.target.checked)}/> فعال</label> <label><input type="checkbox" checked={tab.showImage!==false} onChange={e=>chg(ti,'showImage',e.target.checked)}/> نمایش تصویر تب</label><div style={{margin:'8px 0'}}><input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f)chg(ti,'image',await fileToData(f,tab.image,'course-tabs'))}}/><button style={{...AdminBtn(),marginTop:6}} onClick={async()=>{await deleteStoredImage(tab.image);chg(ti,'image','')}}>حذف تصویر تب و بازگشت به عکس پیش‌فرض</button></div> {!tab.base&&<button onClick={()=>setEditCfg({...editCfg,courseTabs:tabs.filter((_:any,j:number)=>j!==ti)})}>حذف تب</button>}{tab.courses.map((cr:any,ci:number)=><div key={cr.id} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginTop:10}}><input style={S.inp} defaultValue={cr.title} onBlur={e=>chgC(ti,ci,'title',e.target.value)} placeholder="عنوان"/><textarea style={{...S.ta,marginTop:6}} defaultValue={cr.desc} onBlur={e=>chgC(ti,ci,'desc',e.target.value)} placeholder="توضیحات"/><input style={{...S.inp,marginTop:6}} inputMode="numeric" defaultValue={cr.price} onBlur={e=>chgC(ti,ci,'price',p2e(e.target.value))} placeholder="قیمت"/><input style={{...S.inp,marginTop:6}} defaultValue={(cr.features||[]).join('|')} onBlur={e=>chgC(ti,ci,'features',e.target.value.split('|'))} placeholder="ویژگی‌ها با |"/><div style={{display:'flex',gap:8,flexWrap:'wrap',marginTop:6}}>{['active','popular','bestseller','trending','ageBadge'].map(k=><label key={k}><input type="checkbox" checked={!!cr[k]} onChange={e=>chgC(ti,ci,k,e.target.checked)}/> {k}</label>)}</div><button onClick={()=>{const a=[...tabs];a[ti].courses=a[ti].courses.filter((_:any,j:number)=>j!==ci);setEditCfg({...editCfg,courseTabs:a})}}>حذف دوره</button></div>)}<button style={AdminBtn()} onClick={()=>{const a=[...tabs];a[ti].courses=[...a[ti].courses,{id:'c'+uid(),title:'دوره جدید',desc:'',features:[],price:'',active:true,ageBadge:true,btnText:'ثبت مستقیم این دوره',order:a[ti].courses.length+1}];setEditCfg({...editCfg,courseTabs:a})}}>افزودن دوره</button></details>)}<button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,courseTabs:[...tabs,{id:'t'+uid(),title:'تب جدید',active:true,inactiveMessage:'دوره‌های این تب به اتمام رسیده است.',courses:[]}]})}>افزودن تب</button></Box><button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره</button></>}
 // اصلاح ۱۷: ادغام مدیریت محتوا — حذف لینک مستقیم یوتیوب/آپارات، جایگزینی با کد دستی
 function MediaLibraryEditor({sectionKey,title,withText=false}:{sectionKey:'experience'|'education',title:string,withText?:boolean}){
  const typeOpts:[string,string][]=[['video','🎬 ویدیو'],['audio','🎵 ویس'],['image','🖼️ عکس'],...(withText?[['text','📄 متن'] as [string,string]]:[])];
  const list=(editCfg[sectionKey]?.items)||[];
  const upd=(items:any[])=>setEditCfg({...editCfg,[sectionKey]:{...(editCfg[sectionKey]||{}),items}});
  const chg=(i:number,k:string,v:any)=>{const a=[...list];a[i]={...a[i],[k]:v};upd(a)};
  const isValidUrl=(u:string)=>{try{const p=new URL(String(u||'').trim());return p.protocol==='https:'||p.protocol==='http:'}catch{return false}};
  // اصلاح ۷: هر آیتم چندرسانه‌ای اکنون دو لینک مجزا دارد (یوتیوب برای VPN روشن، آپارات برای VPN خاموش)
  // و یک فیلد شماره تماس اختیاری که به‌صورت ماسک‌شده در کارت نمایش داده می‌شود.
  return <Box title={title}>{list.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}><summary style={{cursor:'pointer',fontWeight:800,fontSize:12,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{i+1}. {(it.type==='audio'?'🎵':it.type==='image'?'🖼️':it.type==='text'?'📄':'🎬')} {it.title||'بدون عنوان'}{it.active===false?' (غیرفعال)':''}</summary><div style={{display:'flex',alignItems:'center',gap:8,margin:'8px 0'}}><label style={{fontSize:12,whiteSpace:'nowrap'}}><input type="checkbox" checked={it.active!==false} onChange={e=>chg(i,'active',e.target.checked)}/> فعال</label><select style={{...S.inp,flex:1}} value={it.type||'video'} onChange={e=>chg(i,'type',e.target.value)}>{typeOpts.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div><Field label="عنوان" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/><label style={S.lbl}>توضیحات ویدیو (نمایش در صفحه تجربه والدین)</label><textarea style={{...S.ta,marginBottom:8}} defaultValue={it.description||''} onBlur={e=>chg(i,'description',e.target.value)}/><label style={S.lbl}>توضیحات ویدیو (نمایش در صفحه معرفی دوره‌ها)</label><textarea style={{...S.ta,marginBottom:8}} defaultValue={it.descriptionCourses||''} onBlur={e=>chg(i,'descriptionCourses',e.target.value)}/><>{sectionKey==='education'&&<><label style={S.lbl}>کلمات کلیدی (با کاما یا ویرگول جدا کنید)</label><input style={{...S.inp,marginBottom:8}} defaultValue={(it.keywords||[]).join(', ')} onBlur={e=>chg(i,'keywords',e.target.value.split(/[,،]/).map((s:string)=>s.trim()).filter(Boolean))} placeholder="رشد قد, بی‌اشتهایی, هوش"/></>}</>{(it.type||'video')==='text'?<><label style={S.lbl}>متن کامل</label><textarea style={{...S.ta,marginBottom:8}} defaultValue={it.body||''} onBlur={e=>chg(i,'body',e.target.value)}/></>:<>{/* اصلاح ۳۷: تفکیک پلتفرم‌ها بر اساس نوع محتوا */}
   {(it.type||'video')==='video'&&<><label style={S.lbl}>کد دستی یوتیوب (VPN روشن)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.youtubeCode||it.manualCode||''} onBlur={e=>chg(i,'youtubeCode',e.target.value.trim())} placeholder='<iframe src="https://www.youtube.com/embed/..."></iframe>'/>
   <label style={S.lbl}>کد دستی آپارات (VPN خاموش)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.aparatCode||''} onBlur={e=>chg(i,'aparatCode',e.target.value.trim())} placeholder='<iframe src="https://www.aparat.com/..."></iframe>'/></>}
   {(it.type||'video')==='image'&&<><label style={S.lbl}>کد دستی تصویر خارجی (VPN روشن)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.externalCode||it.manualCode||''} onBlur={e=>chg(i,'externalCode',e.target.value.trim())} placeholder='<img src="https://..." /> یا لینک مستقیم'/>
   <label style={S.lbl}>کد دستی تصویر داخلی (VPN خاموش)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.internalCode||''} onBlur={e=>chg(i,'internalCode',e.target.value.trim())} placeholder='<img src="https://..." /> یا لینک مستقیم'/></>}
   {(it.type||'video')==='audio'&&<><label style={S.lbl}>کد دستی صوتی خارجی (VPN روشن)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.externalCode||it.manualCode||''} onBlur={e=>chg(i,'externalCode',e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم'/>
   <label style={S.lbl}>کد دستی صوتی داخلی (VPN خاموش)</label><textarea dir="ltr" style={{...S.ta,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.internalCode||''} onBlur={e=>chg(i,'internalCode',e.target.value.trim())} placeholder='<audio src="https://..." /> یا لینک مستقیم'/></>}
   <label style={{...S.lbl,marginTop:4}}>نمایش از طریق</label><select style={{...S.inp,marginBottom:8}} value={it.displayMode||'auto'} onChange={e=>chg(i,'displayMode',e.target.value)}><option value="aparat">فقط آپارات</option><option value="youtube">فقط یوتیوب</option><option value="auto">هر دو خودکار (بر اساس VPN)</option></select>
   <label style={{...S.lbl,marginTop:4}}>دسته‌بندی نمایش</label><select style={{...S.inp,marginBottom:8}} value={it.mediaCategory||'experience'} onChange={e=>chg(i,'mediaCategory',e.target.value)}><option value="experience">تجربه والدین</option><option value="height">رشد قد</option><option value="appetite">بی‌اشتهایی</option><option value="mind">هوش</option></select>
   <label style={{...S.lbl,marginTop:8}}>لینک تصویر بندانگشتی (اختیاری)</label><input dir="ltr" type="text" style={{...S.inp,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:12}} defaultValue={it.thumbnail||''} onBlur={e=>chg(i,'thumbnail',e.target.value.trim())} placeholder="https://...jpg"/></>}<label style={{...S.lbl,marginTop:8}}>شماره تماس نمایش‌داده‌شده روی کارت (اختیاری — به‌صورت ماسک‌شده نمایش داده می‌شود، مثلاً 0914xxxx437)</label><input dir="ltr" type="text" style={{...S.inp,marginBottom:8,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:12}} defaultValue={it.phone||''} onBlur={e=>chg(i,'phone',p2e(e.target.value).trim())} placeholder="0914xxxxxxx"/><div style={{display:'flex',gap:6,flexWrap:'wrap'}}><button style={AdminBtn()} onClick={()=>{if(i>0){const a=[...list];[a[i-1],a[i]]=[a[i],a[i-1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}>بالا</button><button style={AdminBtn()} onClick={()=>{if(i<list.length-1){const a=[...list];[a[i+1],a[i]]=[a[i],a[i+1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}>پایین</button><button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>upd(list.filter((_:any,j:number)=>j!==i))}>حذف</button></div></details>)}<button style={AdminBtn()} onClick={()=>upd([...list,{id:sectionKey[0]+uid(),title:'آیتم جدید',description:'',keywords:sectionKey==='education'?[]:undefined,type:'video',youtubeUrl:'',aparatUrl:'',manualCode:'',platform:'other',phone:'',active:true,order:list.length+1}])}>افزودن آیتم</button></Box>}

 function ProductsEditor(){
  // اصلاح ۴۶-۴۷: مدیریت کامل محصولات با عکس و نمایش/پنهان + toggle نمایش بخش
  const rawProducts = editCfg.products;
  const productsCfg = (rawProducts && typeof rawProducts === 'object' && !Array.isArray(rawProducts))
    ? rawProducts
    : { showSection: true, list: Array.isArray(rawProducts) ? rawProducts : [] };
  const list=Array.isArray(productsCfg.list)?productsCfg.list:[];
  const showSection = (productsCfg.showSection ?? editCfg.showProductsSection ?? editCfg.showProductsPage ?? true) !== false;
  const upd=(items:any[])=>setEditCfg({...editCfg,products:{...productsCfg,list:items}, showProductsSection: showSection, showProductsPage: showSection});
  const chg=(i:number,k:string,v:any)=>{const a=[...list];a[i]={...a[i],[k]:v};upd(a)};
  const updShowSection=(val:boolean)=>{
    setEditCfg({...editCfg,products:{...productsCfg,showSection:val}, showProductsSection: val, showProductsPage: val});
  };
  const chgFeatures=(i:number,featuresStr:string)=>{
    const feats = featuresStr.split(/[|,\n]/).map((s:string)=>s.trim()).filter(Boolean);
    chg(i,'features',feats);
  };
  return <>
  <Box title="مدیریت نمایش بخش محصولات (اصلاح ۴۷)">
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:showSection?`${T.ok}12`:`${T.err}12`,border:`1px solid ${showSection?T.ok:T.err}`,borderRadius:12}}>
      <input type="checkbox" checked={showSection} onChange={e=>updShowSection(e.target.checked)} style={{width:18,height:18}}/>
      <span>{showSection ? '✅ بخش محصولات فعال است (در منو و صفحه نمایش داده می‌شود)' : '❌ بخش محصولات غیرفعال است (در منو و صفحه پنهان است)'}</span>
    </label>
    <p style={{fontSize:11,color:T.mut,marginTop:8,lineHeight:1.8}}>
      اصلاح ۴۷: این گزینه هم آیتم «محصولات» در منوی همبرگری و هم صفحه `/products` را کنترل می‌کند. اگر غیرفعال باشد، کاربر پیام «این بخش غیرفعال است» می‌بیند.
    </p>
  </Box>
  <Box title={`لیست محصولات (${list.length}) - اصلاح ۴۶ (عکس + مدیریت کامل)`}>
    {list.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
      <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
        <span>{it.icon||'📦'}</span>
        <span style={{flex:1}}>{it.name||'بدون نام'} {it.isVisible===false && '(مخفی)'}</span>
        <span style={{fontSize:10,color:it.isVisible!==false?T.ok:T.err}}>{it.isVisible!==false?'👁️':'🚫'}</span>
      </summary>
      <div style={{marginTop:10}}>
        <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
          <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}>
            <input type="checkbox" checked={it.isVisible!==false} onChange={e=>chg(i,'isVisible',e.target.checked)}/> نمایش محصول
          </label>
          <span style={{fontSize:11,color:T.mut}}>ترتیب: {it.order||i+1}</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'70px 1fr',gap:8,marginBottom:8}}>
          <input style={S.inp} defaultValue={it.icon||''} onBlur={e=>chg(i,'icon',e.target.value)} placeholder="🥤 آیکون"/>
          <input style={S.inp} defaultValue={it.name||''} onBlur={e=>chg(i,'name',e.target.value)} placeholder="نام محصول - مثلا داینامین"/>
        </div>
        <label style={S.lbl}>توضیحات محصول</label>
        <textarea style={{...S.ta,marginBottom:8,minHeight:60}} defaultValue={it.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات کامل محصول..."/>

        <label style={S.lbl}>ویژگی‌ها (با | یا کاما یا خط جدید جدا کنید)</label>
        <textarea style={{...S.ta,marginBottom:8,minHeight:50}} defaultValue={(it.features||[]).join(' | ')} onBlur={e=>chgFeatures(i,e.target.value)} placeholder="جذب سریع | مناسب برای رشد | ..."/>

        {/* اصلاح ۴۶: فیلد عکس */}
        <label style={S.lbl}>عکس محصول (آپلود یا لینک مستقیم)</label>
        <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
          {it.image && <img src={it.image} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
          <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{
            const f=e.target.files?.[0];
            if(f){
              try{
                const url = await fileToData(f, it.image, 'products');
                chg(i,'image',url);
              }catch(err:any){ alert(err?.message||'آپلود انجام نشد'); }
            }
          }}/>
        </div>
        <input style={{...S.inp,marginBottom:8}} defaultValue={it.image||''} onBlur={e=>chg(i,'image',e.target.value.trim())} placeholder="https://... یا لینک مستقیم عکس"/>

        <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
          <button style={AdminBtn()} onClick={()=>{if(i>0){const a=[...list];[a[i-1],a[i]]=[a[i],a[i-1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}>▲ بالا</button>
          <button style={AdminBtn()} onClick={()=>{if(i<list.length-1){const a=[...list];[a[i+1],a[i]]=[a[i],a[i+1]];upd(a.map((x:any,idx:number)=>({...x,order:idx+1})))}}}>▼ پایین</button>
          <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>upd(list.filter((_:any,j:number)=>j!==i))}>🗑️ حذف</button>
          <button style={AdminBtn()} onClick={async()=>{
            if(it.image){
              try{ await deleteStoredImage(it.image); }catch{}
              chg(i,'image','');
            }
          }}>حذف عکس</button>
        </div>
      </div>
    </details>)}
    <button style={AdminBtn()} onClick={()=>upd([...list,{id:'p'+uid(),name:'محصول جدید',title:'محصول جدید',icon:'📦',description:'توضیحات محصول جدید',features:['ویژگی ۱','ویژگی ۲'],image:'',isVisible:true,order:list.length+1,price:''}])}>+ افزودن محصول جدید</button>
  </Box>
  </>
  }

 // مرحله ۵۱-۳: ادیتور پلتفرم‌های سفارشی
 function CustomPlatformsEditor(){
  const rawCP:any=editCfg.customPlatforms;
  const items:any[]=Array.isArray(rawCP)
    ? rawCP
    : (rawCP&&typeof rawCP==='object'?Object.values(rawCP):[]);
  const upd=(newItems:any[])=>setEditCfg({...editCfg,customPlatforms:newItems});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const addPlatform=()=>upd([...items,{id:'cp'+uid(),name:'پلتفرم جدید',code:'',vpnRequired:false}]);
  const removePlatform=(i:number)=>upd(items.filter((_:any,j:number)=>j!==i));
  return <Box title="🔗 پلتفرم‌های سفارشی">
   <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>پلتفرم‌های سفارشی در کنار یوتیوب و آپارات برای هر آیتم محتوا قابل انتخاب هستند. هر پلتفرم دارای نام، کد embed و وضعیت VPN است.</p>
   {items.map((it:any,i:number)=><div key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:10,marginBottom:8,background:T.soft}}>
    <div style={{display:'grid',gridTemplateColumns:'1fr auto',gap:8,alignItems:'end'}}>
     <Field label="نام پلتفرم" value={it.name||''} onChange={(v:string)=>chg(i,'name',v)} ph="مثلاً روبیکا"/>
     <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer',paddingBottom:10}}>
      <input type="checkbox" checked={!!it.vpnRequired} onChange={e=>chg(i,'vpnRequired',e.target.checked)}/> نیاز به VPN
     </label>
    </div>
    <label style={S.lbl}>کد پیش‌فرض (iframe / لینک)</label>
    <textarea dir="ltr" style={{...S.ta,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:50}} defaultValue={it.code||''} onBlur={e=>chg(i,'code',e.target.value.trim())} placeholder="کد iframe یا لینک..."/>
    <div style={{display:'flex',gap:6,marginTop:6}}><button style={{...AdminBtn(),color:T.err}} onClick={()=>removePlatform(i)}>حذف پلتفرم</button></div>
   </div>)}
   <button style={AdminBtn()} onClick={addPlatform}>+ افزودن پلتفرم سفارشی</button>
   <button style={{...S.btn,marginTop:8}} onClick={()=>setSave(editCfg)}>ذخیره پلتفرم‌ها</button>
  </Box>}

 // مرحله ۵۱-۳: بازطراحی MediaEditor با ساختار جدید (آرایه تخت mediaItems + customPlatforms)
 function MediaEditor(){
  // نرمال‌سازی mediaItems: آرایه جدید یا آبجکت قدیمی
  const rawMediaItems:any=editCfg.mediaItems;
  const items:any[]=Array.isArray(rawMediaItems)
    ? rawMediaItems
    : (rawMediaItems&&typeof rawMediaItems==='object'
        ? [...(rawMediaItems.videos||[]),...(rawMediaItems.audios||[]),...(rawMediaItems.images||[])]
        : []);
  // نرمال‌سازی customPlatforms: آرایه جدید یا آبجکت قدیمی
  const rawCustomPlatforms:any=editCfg.customPlatforms;
  const customPlatforms:any[]=Array.isArray(rawCustomPlatforms)
    ? rawCustomPlatforms
    : (rawCustomPlatforms&&typeof rawCustomPlatforms==='object'
        ? Object.values(rawCustomPlatforms)
        : []);
  const updItems=(newItems:any[])=>setEditCfg({...editCfg,mediaItems:newItems});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};updItems(a)};
  const chgPlatform=(i:number,platformKey:string,value:string)=>{const a=[...items];a[i]={...a[i],platforms:{...(a[i].platforms||{}),[platformKey]:value}};updItems(a)};
  const toggleCategory=(i:number,catId:string)=>{const item=items[i];const cats:string[]=item.categories||[];const newCats=cats.includes(catId)?cats.filter(c=>c!==catId):[...cats,catId];chg(i,'categories',newCats)};
  const categoryOptions:[string,string][]=[['parent-experience','تجربه والدین'],['growth','رشد قد'],['appetite','بی‌اشتهایی'],['intelligence','هوش']];
  const displayModeOptions:[string,string][]=[['external','خارجی (VPN روشن)'],['internal','داخلی (VPN خاموش)'],['both','هر دو (خودکار)'],['custom','پلتفرم سفارشی']];
  const typeSections:[('video'|'image'|'audio'),string,string][]=[['video','🎬 ویدیوها','ویدیو'],['image','🖼️ عکس‌ها','عکس'],['audio','🎵 ویس‌ها','ویس']];
  const addItem=(type:string)=>updItems([...items,{id:type[0]+uid(),title:'',description:'',type,platforms:{},displayMode:'both',categories:[],isVisible:true}]);
  const removeItem=(i:number)=>updItems(items.filter((_:any,j:number)=>j!==i));
  const moveItem=(i:number,dir:-1|1)=>{const a=[...items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];updItems(a)};
  return <Box title="مدیریت محتوای چندرسانه‌ای (ساختار جدید)">
   <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>هر آیتم محتوا دارای نوع (ویدیو/عکس/ویس)، پلتفرم‌های مخصوص، حالت نمایش، دسته‌بندی و وضعیت نمایش است. پلتفرم‌های سفارشی از بخش بالا اضافه شده و در هر آیتم قابل فعال‌سازی هستند.</p>
   {typeSections.map(([type,sectionLabel,addLabel])=>{
    const filtered=items.filter((it:any)=>(it.type||'video')===type);
    const globalIndices=items.map((it:any,idx:number)=>(it.type||'video')===type?idx:-1).filter((idx:number)=>idx>=0);
    return <details key={type} style={{marginBottom:10,background:T.badge,borderRadius:12,padding:10}}>
     <summary style={{cursor:'pointer',fontWeight:800}}>{sectionLabel} ({filtered.length})</summary>
     {filtered.map((it:any,localIdx:number)=>{
      const gi=globalIndices[localIdx];
      return <div key={it.id||gi} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,marginTop:10}}>
       <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
        <b style={{fontSize:12,color:T.txt,flex:1,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{localIdx+1}. {it.title||'بدون عنوان'}</b>
        <label style={{fontSize:12,whiteSpace:'nowrap'}}><input type="checkbox" checked={it.isVisible!==false} onChange={e=>chg(gi,'isVisible',e.target.checked)}/> فعال</label>
       </div>
       <Field label="عنوان" value={it.title||''} onChange={(v:string)=>chg(gi,'title',v)} ph=""/>
       <label style={S.lbl}>توضیحات</label>
       <textarea style={{...S.ta,marginBottom:8}} defaultValue={it.description||''} onBlur={e=>chg(gi,'description',e.target.value)}/>
       {/* فیلدهای پلتفرم بر اساس نوع */}
       {type==='video'&&<><label style={{...S.lbl,marginTop:4}}>لینک / کد یوتیوب (VPN روشن)</label>
        <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.platforms?.youtube||''} onBlur={e=>chgPlatform(gi,'youtube',e.target.value.trim())} placeholder="لینک یوتیوب یا کد iframe"/>
        <label style={S.lbl}>لینک / کد آپارات (VPN خاموش)</label>
        <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={it.platforms?.aparat||''} onBlur={e=>chgPlatform(gi,'aparat',e.target.value.trim())} placeholder="لینک آپارات یا کد iframe"/></>}
       {type==='image'&&<><label style={{...S.lbl,marginTop:4}}>لینک تصویر خارجی (VPN روشن)</label>
        <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={it.platforms?.externalImage||''} onBlur={e=>chgPlatform(gi,'externalImage',e.target.value.trim())} placeholder="https://..."/>
        <label style={S.lbl}>لینک تصویر داخلی (VPN خاموش)</label>
        <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={it.platforms?.internalImage||''} onBlur={e=>chgPlatform(gi,'internalImage',e.target.value.trim())} placeholder="https://..."/></>}
       {type==='audio'&&<><label style={{...S.lbl,marginTop:4}}>لینک صوتی خارجی (VPN روشن)</label>
        <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={it.platforms?.externalAudio||''} onBlur={e=>chgPlatform(gi,'externalAudio',e.target.value.trim())} placeholder="https://..."/>
        <label style={S.lbl}>لینک صوتی داخلی (VPN خاموش)</label>
        <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={it.platforms?.internalAudio||''} onBlur={e=>chgPlatform(gi,'internalAudio',e.target.value.trim())} placeholder="https://..."/></>}
       {/* پلتفرم‌های سفارشی */}
       {customPlatforms.length>0&&<><label style={{...S.lbl,marginTop:4}}>پلتفرم‌های سفارشی</label>
        {customPlatforms.map((cp:any)=>{const customArr:any[]=it.platforms?.custom||[];const existing=customArr.find((c:any)=>c.name===cp.name);return <div key={cp.id} style={{display:'flex',alignItems:'center',gap:6,marginBottom:4}}>
         <label style={{display:'flex',alignItems:'center',gap:4,fontSize:11}}><input type="checkbox" checked={!!existing} onChange={e=>{const a=[...items];const cur:any[]=a[gi].platforms?.custom||[];if(e.target.checked){a[gi]={...a[gi],platforms:{...a[gi].platforms,custom:[...cur,{name:cp.name,code:'',vpnRequired:cp.vpnRequired}]}}}else{a[gi]={...a[gi],platforms:{...a[gi].platforms,custom:cur.filter((c:any)=>c.name!==cp.name)}}}updItems(a)}}/> {cp.name} {cp.vpnRequired?'(نیاز به VPN)':''}</label>
         {existing&&<input dir="ltr" style={{...S.inp,flex:1,fontSize:11}} defaultValue={existing.code||''} onBlur={e=>{const a=[...items];const cur:any[]=a[gi].platforms?.custom||[];a[gi]={...a[gi],platforms:{...a[gi].platforms,custom:cur.map((c:any)=>c.name===cp.name?{...c,code:e.target.value.trim()}:c)}};updItems(a)}} placeholder="کد iframe / لینک"/>}
        </div>})}</>}
       {/* displayMode */}
       <label style={{...S.lbl,marginTop:4}}>حالت نمایش</label>
       <select style={{...S.inp,marginBottom:6}} value={it.displayMode||'both'} onChange={e=>chg(gi,'displayMode',e.target.value)}>
        {displayModeOptions.map(([v,l])=><option key={v} value={v}>{l}</option>)}
       </select>
       {/* categories */}
       <label style={{...S.lbl,marginTop:4}}>دسته‌بندی‌ها</label>
       <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:8}}>
        {categoryOptions.map(([catId,catLabel])=><label key={catId} style={{display:'flex',alignItems:'center',gap:4,fontSize:12,cursor:'pointer'}}>
         <input type="checkbox" checked={(it.categories||[]).includes(catId)} onChange={()=>toggleCategory(gi,catId)}/> {catLabel}
        </label>)}
       </div>
       {/* Move / Delete */}
       <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
        <button style={AdminBtn()} disabled={localIdx===0} onClick={()=>moveItem(gi,-1)}>بالا</button>
        <button style={AdminBtn()} disabled={localIdx===filtered.length-1} onClick={()=>moveItem(gi,1)}>پایین</button>
        <button style={{...AdminBtn(),color:T.err}} onClick={()=>removeItem(gi)}>حذف</button>
       </div>
      </div>})}
     <button style={{...AdminBtn(),marginTop:8}} onClick={()=>addItem(type)}>افزودن {addLabel}</button>
    </details>})}
   <button style={{...S.btn,marginTop:12}} onClick={()=>setSave(editCfg)}>ذخیره محتوا</button>
  </Box>}


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
       <div style={{display:'flex',gap:4}}><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveConsult(i,-1)}>▲</button><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveConsult(i,1)}>▼</button><button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>updConsult(consultList.filter((_,j)=>j!==i))}>حذف</button></div>
     </div>
     <textarea style={{...S.ta,minHeight:60}} defaultValue={txt} onBlur={e=>chgConsult(i,e.target.value)} placeholder="متن جمله موفقیت مشاوره..."/>
   </div>)}
   <button style={AdminBtn()} onClick={()=>updConsult([...consultList, "جمله جدید موفقیت مشاوره"])}>+ افزودن جمله مشاوره</button>
  </Box>

  {/* اصلاح ۴۸: جملات موفقیت ثبت دوره - مجزا */}
  <Box title="جملات صفحه موفقیت ثبت نام دوره">
   <p style={{fontSize:11,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>این جملات در صفحات موفقیت ثبت دوره (CourseDone / CourseConfirm - پروژه اصلی) نمایش داده می‌شوند.</p>
   {courseList.map((txt:string,i:number)=><div key={i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8,background:T.badge}}>
     <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
       <b style={{fontSize:12,color:T.ttl}}>جمله {i+1}</b>
       <div style={{display:'flex',gap:4}}><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveCourse(i,-1)}>▲</button><button style={{...AdminBtn(),padding:'4px 8px'}} onClick={()=>moveCourse(i,1)}>▼</button><button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>updCourse(courseList.filter((_,j)=>j!==i))}>حذف</button></div>
     </div>
     <textarea style={{...S.ta,minHeight:60}} defaultValue={txt} onBlur={e=>chgCourse(i,e.target.value)} placeholder="متن جمله موفقیت دوره..."/>
   </div>)}
   <button style={AdminBtn()} onClick={()=>updCourse([...courseList, "جمله جدید موفقیت دوره"])}>+ افزودن جمله دوره</button>
  </Box>

  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره</button></>}

 // ─── مدیریت باکس جملات اعتمادساز (TrustBoxNew) ───
 function TrustBoxManagerEditor(){
  const tb=editCfg.trustBoxes||{};
  const sentences=tb.sentences||{};
  const cats=['health','height','appetite','mind'];
  const catLabels:Record<string,string>={health:'سلامت عمومی',height:'رشد قد',appetite:'بی‌اشتهایی',mind:'هوش و تمرکز'};
  const [activeCat,setActiveCat]=useState<string>('health');
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
     <input type="checkbox" checked={tb.enabled!==false} onChange={e=>upGeneral('enabled',e.target.checked)} style={{width:18,height:18}}/>
     <span>{tb.enabled!==false?'باکس جملات اعتمادساز فعال است':'باکس جملات اعتمادساز غیرفعال است'}</span>
    </label>
    <label style={S.lbl}>زمان تغییر پیش‌فرض (ثانیه)</label>
    <input style={S.inp} inputMode="numeric" type="number" min={3} max={30} defaultValue={tb.defaultInterval||8} onBlur={e=>upGeneral('defaultInterval',Math.max(3,Math.min(30,parseInt(p2e(e.target.value))||8)))}/>
   </Box>
   <Box title="تنظیمات باکس صفحه اصلی">
    <label style={{display:'flex',alignItems:'center',gap:7,padding:'6px 0',fontWeight:800,fontSize:12,cursor:'pointer'}}>
     <input type="checkbox" checked={(tb.home?.enabled)!==false} onChange={e=>upHome('enabled',e.target.checked)}/>
     {(tb.home?.enabled)!==false?'فعال در صفحه اصلی':'غیرفعال در صفحه اصلی'}
    </label>
    <label style={S.lbl}>زمان تغییر (ثانیه)</label>
    <input style={S.inp} inputMode="numeric" type="number" min={3} max={30} defaultValue={tb.home?.interval||8} onBlur={e=>upHome('interval',Math.max(3,Math.min(30,parseInt(p2e(e.target.value))||8)))}/>
   </Box>
   <Box title="تنظیمات باکس تب‌های دوره">
    {['height','appetite','mind'].map(tabId=>{
     const tabCfg=(tb.tabs||{})[tabId]||{};
     const labels:Record<string,string>={height:'رشد قد',appetite:'بی‌اشتهایی',mind:'هوش'};
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
       {cats.map(c=>{const active=(item.tabs||[]).includes(c);return <span key={c} onClick={()=>toggleCat(i,c)} style={{fontSize:10,padding:'2px 7px',borderRadius:10,background:active?T.soft:T.card,border:'1px solid '+(active?T.acc:T.brd),color:active?T.acc:T.mut,cursor:'pointer',fontWeight:700}}>{c}</span>})}
      </div>
      <button style={{...AdminBtn(),padding:'4px 8px',color:T.err}} onClick={()=>remove(i)}>حذف</button>
     </div>
     <div style={{display:'grid',gap:6}}>
      <input style={S.inp} defaultValue={item.title||''} onBlur={e=>chg(i,'title',e.target.value)} placeholder="عنوان جمله"/>
      <textarea style={{...S.ta,minHeight:50}} defaultValue={item.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات جمله..."/>
     </div>
    </div>)}
    <button style={AdminBtn()} onClick={add}>+ افزودن جمله جدید</button>
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
   case 'crypto':return(<div style={{display:'flex',flexDirection:'column',gap:10}}>{(c.wallets||[]).map((w:any,wi:number)=><div key={wi} style={{display:'grid',gridTemplateColumns:'100px 1fr 100px 36px',gap:6,alignItems:'end'}}><div><label style={S.lbl}>ارز</label><select style={S.inp} value={w.currency||'USDT'} onChange={e=>upWallet(gi,wi,'currency',e.target.value)}>{['USDT','BTC','ETH','DOGE','LTC'].map(cc=><option key={cc} value={cc}>{cc}</option>)}</select></div><div><label style={S.lbl}>آدرس</label><input style={S.inp} dir="ltr" defaultValue={w.address||''} onBlur={e=>upWallet(gi,wi,'address',e.target.value)}/></div><div><label style={S.lbl}>شبکه</label><input style={S.inp} dir="ltr" defaultValue={w.network||''} onBlur={e=>upWallet(gi,wi,'network',e.target.value)}/></div><button style={{...AdminBtn(),color:T.err,padding:'8px 0',marginBottom:0}} onClick={()=>rmWallet(gi,wi)}>✕</button></div>)}<button style={AdminBtn()} onClick={()=>addWallet(gi)}>+ افزودن کیف پول</button></div>);
   default:return null;
  }};
  // نرمال‌سازی banks: اطمینان از آرایه بودن
  const banks:any[]=Array.isArray(editCfg.banks)?editCfg.banks:(editCfg.banks&&typeof editCfg.banks==='object'?Object.values(editCfg.banks):[]);
  const cryptoWallets:any[]=Array.isArray(editCfg.cryptoWallets)?editCfg.cryptoWallets:(editCfg.cryptoWallets&&typeof editCfg.cryptoWallets==='object'?Object.values(editCfg.cryptoWallets):[]);
  const [bankErr,setBankErr]=useState(''); const save=()=>{const bad=banks.some((b:any)=>b.active&&((b.card&&!b.iban)||(!b.card&&b.iban))); if(bad){setBankErr('برای هر حساب فعال، شماره کارت و شبا باید هر دو تکمیل باشند.');return} setBankErr(''); setSave(editCfg)}; const chgBank=(i:number,k:string,v:any)=>{const a=[...banks];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,banks:a})}; const chgCrypto=(i:number,k:string,v:any)=>{const a=[...cryptoWallets];a[i]={...a[i],[k]:v};setEditCfg({...editCfg,cryptoWallets:a})}; return <><Box title="روش‌های ارسال"><ArrSimple path={['shippingMethods','iran']} title="ارسال ایران"/><ArrSimple path={['shippingMethods','intl']} title="ارسال خارج"/><label><input type="checkbox" checked={!!editCfg.whatsappNeedsCountryCode} onChange={e=>setEditCfg({...editCfg,whatsappNeedsCountryCode:e.target.checked})}/> واتساپ دارای کد کشور باشد</label><label style={{display:'block'}}><input type="checkbox" checked={!!editCfg.showReceiptImage} onChange={e=>setEditCfg({...editCfg,showReceiptImage:e.target.checked})}/> نمایش تصویر فیش واریزی</label></Box><Box title="حساب‌های بانکی">{bankErr&&<Err x={bankErr}/>} {banks.map((b:any,i:number)=><div key={b.id} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:8}}><Field label="نام بانک" value={b.name} onChange={(v:string)=>chgBank(i,'name',v)} ph=""/><Field label="شماره کارت" value={b.card} onChange={(v:string)=>chgBank(i,'card',v)} ph=""/><Field label="شبا" value={b.iban} onChange={(v:string)=>chgBank(i,'iban',v)} ph=""/><select style={S.inp} value={b.color} onChange={e=>chgBank(i,'color',e.target.value)}>{['blue','sky','yellow','red','black','green','gray','brown'].map(x=><option key={x}>{x}</option>)}</select><label><input type="checkbox" checked={b.active} onChange={e=>chgBank(i,'active',e.target.checked)}/> فعال</label><button onClick={()=>setEditCfg({...editCfg,banks:banks.filter((_:any,j:number)=>j!==i)})}>حذف</button></div>)}<button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,banks:[...banks,{id:'b'+uid(),name:'حساب جدید',card:'',iban:'',color:'blue',active:true,order:banks.length+1}]})}>افزودن حساب</button></Box><Box title="پرداخت رمزارزی"><label style={S.lbl}>نمایش پرداخت رمزارزی برای کاربران داخل ایران</label><select style={{...S.inp,marginBottom:12}} value={editCfg.cryptoVisibility||'intl'} onChange={e=>setEditCfg({...editCfg,cryptoVisibility:e.target.value})}><option value="intl">فقط خارج از ایران (پیش‌فرض)</option><option value="all">همه کاربران</option><option value="off">غیرفعال</option></select>{cryptoWallets.map((w:any,i:number)=><div key={w.id} style={{border:`1px solid ${w.color||T.brd}55`,background:`${w.color||T.acc}0d`,borderRadius:12,padding:10,marginBottom:8}}><div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}><span style={{width:12,height:12,borderRadius:'50%',background:w.color,flexShrink:0,border:`1px solid ${T.brd}`}}/><b style={{fontSize:13,color:T.txt}} dir="ltr">{w.name} ({w.symbol||String(w.id).toUpperCase()})</b><label style={{marginInlineStart:'auto',fontSize:12}}><input type="checkbox" checked={!!w.active} onChange={e=>chgCrypto(i,'active',e.target.checked)}/> فعال</label></div><label style={S.lbl}>آدرس کیف پول</label><input dir="ltr" style={{...S.inp,fontFamily:'monospace,-apple-system,"Courier New"',marginBottom:8}} defaultValue={w.address||''} onBlur={e=>chgCrypto(i,'address',e.target.value.trim())} placeholder="Wallet address..."/><label style={S.lbl}>شبکه (Network)</label><input dir="ltr" style={S.inp} defaultValue={w.network||''} onBlur={e=>chgCrypto(i,'network',e.target.value.trim())} placeholder="TRC20 / ERC20 / ..."/></div>)}</Box>
   <Box title="💳 درگاه‌های پرداخت">
    <p style={{fontSize:11,color:T.mut,margin:'0 0 14px',lineHeight:1.8}}>درگاه‌های فعال در صفحه پرداخت به کاربر نمایش داده می‌شوند.</p>
    <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:16}}>
     {gateways.map((gw:any,gi:number)=>(<div key={gw.id} style={{borderRadius:14,border:'1px solid '+(gw.enabled?T.acc+'44':T.brd),background:gw.enabled?T.acc+'06':T.card,padding:'14px 16px',transition:'all .25s ease'}}>
      <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:gw.enabled?14:0}}>
       <div style={{flex:1,minWidth:0}}><b style={{fontSize:13,fontWeight:800,color:T.txt}}>{gw.label||gw.id}</b></div>
       <label style={{display:'flex',alignItems:'center',gap:8,cursor:'pointer',flexShrink:0}}>
        <span style={{fontSize:11,fontWeight:700,color:gw.enabled?T.ok:T.mut}}>{gw.enabled?'فعال':'غیرفعال'}</span>
        <div onClick={()=>upGw(gi,{enabled:!gw.enabled})} style={{width:44,height:24,borderRadius:12,cursor:'pointer',background:gw.enabled?T.ok:'#ccc',position:'relative',transition:'background .25s'}}>
         <div style={{width:20,height:20,borderRadius:'50%',background:'#fff',position:'absolute',top:2,left:gw.enabled?22:2,transition:'left .25s',boxShadow:'0 1px 4px rgba(0,0,0,.2)'}}/>
        </div>
       </label>
      </div>
      {gw.enabled&&<div style={{padding:'12px',borderRadius:10,background:T.soft,border:'1px solid '+T.brd}}>{renderGatewayConfig(gi)}</div>}
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
    <button style={AdminBtn()} disabled={i===0} onClick={()=>move(i,-1)}>▲</button>
    <button style={AdminBtn()} disabled={i===arr.length-1} onClick={()=>move(i,1)}>▼</button>
    <button style={{...AdminBtn(),color:T.err,boxShadow:`3px 3px 8px ${T.err}22,-3px -3px 8px rgba(255,255,255,.6)`}} onClick={()=>setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:arr.filter((_:any,j:number)=>j!==i)}})}>حذف</button>
   </div>
  </div>)}
  <button style={AdminBtn()} onClick={()=>setEditCfg({...editCfg,[path[0]]:{...editCfg[path[0]],[path[1]]:[...arr,{id:'m'+uid(),title:'روش جدید',titleEn:'New method',active:true,requiresPostal:false,default:false,order:arr.length+1,help:'',tag:'',tagEn:''}]}})}>افزودن</button>
  </div>}
 // --- مدیریت تم‌ها ---
 // --- مدیریت دیزاین (مرحله ۴ - بازطراحی تدریجی) ---
// --- مدیریت تصاویر صفحه اصلی و فرم مشاوره ---
function ImagesEditor(){
 const imgs=(editCfg as any).images||{hero:{url:'/images/hero-default.jpg',alt:'کودک شاد و سالم',enabled:true},trustBox:{url:'/images/trust-default.jpg',alt:'مادر و کودک خندان',enabled:true},courseDefault:{url:'/images/course-default.jpg',alt:'دوره آموزشی',enabled:true},specialist:{url:'/images/specialist-default.jpg',alt:'کارشناس تغذیه',enabled:true}};
 const upImg=(key:string,patch:any)=>{const cur=imgs[key]||{};setEditCfg({...editCfg,images:{...imgs,[key]:{...cur,...patch}}})};
 return <>
  <Box title="🖼️ مدیریت تصاویر صفحه اصلی و فرم مشاوره">
   <p style={{fontSize:11,color:T.mut,margin:'0 0 14px',lineHeight:1.8}}>تصاویر پیش‌فرض در پوشه <code dir="ltr">public/images/</code> قرار دارند. می‌توانید تصاویر جدید آپلود کنید یا از لینک مستقیم استفاده نمایید.</p>
   <div style={{display:'grid',gap:16}}>
    {/* تصویر هدر */}
    <div style={{border:'1px solid '+T.brd,borderRadius:12,padding:12,background:T.soft}}>
     <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <b style={{fontSize:13,color:T.ttl}}>🏠 تصویر هدر صفحه اصلی (Hero)</b>
      <label style={{marginInlineStart:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={imgs.hero?.enabled!==false} onChange={e=>upImg('hero',{enabled:e.target.checked})}/> نمایش</label>
     </div>
     {imgs.hero?.url&&<img src={imgs.hero.url} alt={imgs.hero?.alt||''} style={{maxWidth:200,maxHeight:120,objectFit:'cover',borderRadius:10,border:'1px solid '+T.brd,display:'block',marginBottom:8}} onError={(e:any)=>{e.currentTarget.style.display='none'}}/>}
     <label style={S.lbl}>آدرس تصویر (URL)</label>
     <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={imgs.hero?.url||''} onBlur={e=>upImg('hero',{url:e.target.value.trim()})} placeholder="https://... یا /images/hero-default.jpg"/>
     <label style={S.lbl}>متن جایگزین (Alt)</label>
     <input style={S.inp} defaultValue={imgs.hero?.alt||''} onBlur={e=>upImg('hero',{alt:e.target.value})} placeholder="کودک شاد و سالم"/>
     <input type="file" accept="image/jpeg,image/png,image/webp" style={{...S.inp,marginTop:6}} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,imgs.hero?.url,'images');upImg('hero',{url})}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
    </div>
    {/* تصویر باکس اعتمادساز */}
    <div style={{border:'1px solid '+T.brd,borderRadius:12,padding:12,background:T.soft}}>
     <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <b style={{fontSize:13,color:T.ttl}}>💚 تصویر باکس اعتمادساز (Trust Box)</b>
      <label style={{marginInlineStart:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={imgs.trustBox?.enabled!==false} onChange={e=>upImg('trustBox',{enabled:e.target.checked})}/> نمایش</label>
     </div>
     {imgs.trustBox?.url&&<img src={imgs.trustBox.url} alt={imgs.trustBox?.alt||''} style={{maxWidth:200,maxHeight:120,objectFit:'cover',borderRadius:10,border:'1px solid '+T.brd,display:'block',marginBottom:8}} onError={(e:any)=>{e.currentTarget.style.display='none'}}/>}
     <label style={S.lbl}>آدرس تصویر (URL)</label>
     <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={imgs.trustBox?.url||''} onBlur={e=>upImg('trustBox',{url:e.target.value.trim()})} placeholder="https://... یا /images/trust-default.jpg"/>
     <label style={S.lbl}>متن جایگزین (Alt)</label>
     <input style={S.inp} defaultValue={imgs.trustBox?.alt||''} onBlur={e=>upImg('trustBox',{alt:e.target.value})} placeholder="مادر و کودک خندان"/>
     <input type="file" accept="image/jpeg,image/png,image/webp" style={{...S.inp,marginTop:6}} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,imgs.trustBox?.url,'images');upImg('trustBox',{url})}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
    </div>
    {/* تصویر پیش‌فرض دوره‌ها */}
    <div style={{border:'1px solid '+T.brd,borderRadius:12,padding:12,background:T.soft}}>
     <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <b style={{fontSize:13,color:T.ttl}}>🎓 تصویر پیش‌فرض دوره‌ها</b>
      <label style={{marginInlineStart:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={imgs.courseDefault?.enabled!==false} onChange={e=>upImg('courseDefault',{enabled:e.target.checked})}/> فعال</label>
     </div>
     {imgs.courseDefault?.url&&<img src={imgs.courseDefault.url} alt={imgs.courseDefault?.alt||''} style={{maxWidth:200,maxHeight:120,objectFit:'cover',borderRadius:10,border:'1px solid '+T.brd,display:'block',marginBottom:8}} onError={(e:any)=>{e.currentTarget.style.display='none'}}/>}
     <label style={S.lbl}>آدرس تصویر (URL)</label>
     <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={imgs.courseDefault?.url||''} onBlur={e=>upImg('courseDefault',{url:e.target.value.trim()})} placeholder="https://... یا /images/course-default.jpg"/>
     <input type="file" accept="image/jpeg,image/png,image/webp" style={{...S.inp,marginTop:6}} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,imgs.courseDefault?.url,'images');upImg('courseDefault',{url})}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
    </div>
    {/* تصویر کارشناس */}
    <div style={{border:'1px solid '+T.brd,borderRadius:12,padding:12,background:T.soft}}>
     <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:10}}>
      <b style={{fontSize:13,color:T.ttl}}>👩‍⚕️ تصویر کارشناس (فرم مشاوره)</b>
      <label style={{marginInlineStart:'auto',display:'flex',alignItems:'center',gap:6,fontSize:12,cursor:'pointer'}}><input type="checkbox" checked={imgs.specialist?.enabled!==false} onChange={e=>upImg('specialist',{enabled:e.target.checked})}/> فعال</label>
     </div>
     {imgs.specialist?.url&&<img src={imgs.specialist.url} alt={imgs.specialist?.alt||''} style={{width:80,height:80,objectFit:'cover',borderRadius:'50%',border:'2px solid '+T.brd,display:'block',marginBottom:8}} onError={(e:any)=>{e.currentTarget.style.display='none'}}/>}
     <label style={S.lbl}>آدرس تصویر (URL)</label>
     <input dir="ltr" style={{...S.inp,marginBottom:6}} defaultValue={imgs.specialist?.url||''} onBlur={e=>upImg('specialist',{url:e.target.value.trim()})} placeholder="https://... یا /images/specialist-default.jpg"/>
     <label style={S.lbl}>متن جایگزین (Alt)</label>
     <input style={S.inp} defaultValue={imgs.specialist?.alt||''} onBlur={e=>upImg('specialist',{alt:e.target.value})} placeholder="کارشناس تغذیه"/>
     <input type="file" accept="image/jpeg,image/png,image/webp" style={{...S.inp,marginTop:6}} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,imgs.specialist?.url,'images');upImg('specialist',{url})}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
    </div>
   </div>
  </Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تنظیمات تصاویر</button>
 </>
}

function DesignManagerEditor(){
 const ds=(editCfg as any).designSystem||{sections:{public:{design:'wellness',theme:'light'},education:{design:'kidlearn',theme:'light'},admin:{design:'navystack',theme:'dark'}},classic:{themes:['light','cream','ocean','dark'],defaultTheme:'light'}};
 const sections=ds.sections||{};

 const updateSection=(section:string,design:string,theme?:string)=>{
  setEditCfg({...editCfg,designSystem:{...ds,sections:{...sections,[section]:{design,theme:theme||sections[section]?.theme||'light'}}}});
 };

 const designOptions=[
  {value:'wellness',label:'Wellness (بنفش)'},
  {value:'kidlearn',label:'KidLearn (کودکان)'},
  {value:'navystack',label:'NavyStack (مدیریت)'},
  {value:'classic',label:'دیزاین ترکیبی (کلاسیک)'},
 ];

 const classicThemes=[
  {value:'light',label:'روشن'},
  {value:'cream',label:'کرم'},
  {value:'ocean',label:'اقیانوسی'},
  {value:'dark',label:'تاریک'},
  {value:'motherly',label:'مادرانه'},
  {value:'trust',label:'اعتمادساز'},
  {value:'blend',label:'ترکیبی'},
  {value:'motherly-trust',label:'مادرانه-اعتمادساز'},
 ];

 return <>
  <Box title="🎨 مدیریت دیزاین و تم">
   <p style={{fontSize:11,color:T.mut,margin:'0 0 14px',lineHeight:1.8}}>برای هر بخش، دیزاین مورد نظر را انتخاب کنید.</p>
   <div style={{display:'grid',gap:14}}>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}> صفحات عمومی</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={sections.public?.design||'wellness'} onChange={e=>updateSection('public',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
      {sections.public?.design==='classic'&&<div><label style={S.lbl}>تم</label><select style={S.inp} value={sections.public?.theme||'light'} onChange={e=>updateSection('public','classic',e.target.value)}>{classicThemes.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>}
     </div>
    </div>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}>📚 بخش آموزش</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={sections.education?.design||'kidlearn'} onChange={e=>updateSection('education',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
      {sections.education?.design==='classic'&&<div><label style={S.lbl}>تم</label><select style={S.inp} value={sections.education?.theme||'light'} onChange={e=>updateSection('education','classic',e.target.value)}>{classicThemes.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>}
     </div>
    </div>
    <div style={{padding:14,background:T.soft,borderRadius:12,border:`1px solid ${T.brd}`}}>
     <h4 style={{margin:'0 0 10px',color:T.ttl,fontSize:13,fontWeight:800}}>⚙️ پنل مدیریت</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
      <div><label style={S.lbl}>دیزاین</label><select style={S.inp} value={sections.admin?.design||'navystack'} onChange={e=>updateSection('admin',e.target.value)}>{designOptions.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>
      {sections.admin?.design==='classic'&&<div><label style={S.lbl}>تم</label><select style={S.inp} value={sections.admin?.theme||'dark'} onChange={e=>updateSection('admin','classic',e.target.value)}>{classicThemes.map(opt=><option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>}
     </div>
    </div>
   </div>
  </Box>
  <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تنظیمات دیزاین</button>
 </>;
}

function ThemeManagerEditor(){
  const tc=(editCfg as any).themeConfig||{defaultThemes:{public:'wellness',education:'kidlearn',admin:'navystack'},overrides:{}};
  const defaults=tc.defaultThemes||{};
  const overrides=tc.overrides||{};
  const upTC=(patch:any)=>setEditCfg({...editCfg,themeConfig:{...tc,...patch}});
  const upDefault=(k:string,v:string)=>upTC({defaultThemes:{...defaults,[k]:v}});
  const addOverride=()=>{const path=prompt('مسیر را وارد کنید:');if(!path)return;upTC({overrides:{...overrides,[path]:'wellness'}})};
  const upOverride=(path:string,v:string)=>{const o={...overrides};if(v==='_remove_')delete o[path];else o[path]=v;upTC({overrides:o})};
  const to=[['wellness','Wellness'],['kidlearn','KidLearn'],['navystack','NavyStack'],['light','روشن'],['cream','کرم'],['ocean','اقیانوسی'],['dark','تاریک'],['motherly','مادرانه'],['trust','اعتمادساز'],['blend','ترکیبی'],['motherly-trust','مادرانه-اعتمادساز']];
  const ss={padding:'14px 16px',borderRadius:12,background:T.soft,border:'1px solid '+T.brd,marginBottom:12};
  return <>
   <Box title='🎨 مدیریت تم‌ها'>
    <div style={ss}>
     <h4 style={{margin:'0 0 12px',color:T.ttl,fontSize:13,fontWeight:800}}>تم پیش‌فرض هر بخش</h4>
     <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:10}}>
      <div><label style={S.lbl}>صفحات عمومی</label><select style={S.inp} value={defaults.public||'wellness'} onChange={e=>upDefault('public',e.target.value)}>{to.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <div><label style={S.lbl}>بخش آموزش</label><select style={S.inp} value={defaults.education||'kidlearn'} onChange={e=>upDefault('education',e.target.value)}>{to.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
      <div><label style={S.lbl}>پنل مدیریت</label><select style={S.inp} value={defaults.admin||'navystack'} onChange={e=>upDefault('admin',e.target.value)}>{to.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select></div>
     </div>
    </div>
    <div style={ss}>
     <h4 style={{margin:'0 0 12px',color:T.ttl,fontSize:13,fontWeight:800}}>Overrideهای دستی</h4>
     {Object.entries(overrides).length===0&&<p style={{fontSize:11,color:T.mut,margin:0}}>تنظیم نشده.</p>}
     {Object.entries(overrides).map(([path,theme]:any)=><div key={path} style={{display:'grid',gridTemplateColumns:'1fr 180px 40px',gap:8,alignItems:'end',marginBottom:8,padding:'8px',background:T.card,borderRadius:10,border:'1px solid '+T.brd}}>
      <div><label style={S.lbl}>مسیر</label><input style={{...S.inp,fontFamily:'monospace'}} defaultValue={path} onBlur={e=>{if(e.target.value!==path){const o={...overrides};delete o[path];o[e.target.value]=theme;upTC({overrides:o})}}} dir="ltr"/></div>
      <div><label style={S.lbl}>تم</label><select style={S.inp} value={theme} onChange={e=>upOverride(path,e.target.value)}>{to.map(([v,l])=><option key={v} value={v}>{l}</option>)}<option value="_remove_">حذف</option></select></div>
      <button style={{...AdminBtn(),color:T.err,padding:'8px 0',marginBottom:0}} onClick={()=>upOverride(path,'_remove_')}>✕</button>
     </div>)}
     <button style={AdminBtn()} onClick={addOverride}>+ افزودن</button>
    </div>
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره تم‌ها</button>
  </>;
 }

 // --- تنظیمات پرداخت چنددرگاهی ---

 function SecurityEditor(){
  const vals=useRef<any>({curPh:'',newPh:'',repPh:'',curPwd:'',newPwd:'',repPwd:''});
  const [secErr,setSecErr]=useState(''),[pwdErr,setPwdErr]=useState(''),[clearKey,setClearKey]=useState(0);
  const setVal=useCallback((k:string,v:string)=>{vals.current[k]=k.toLowerCase().includes('ph')?p2e(v):v},[]);
  const savePhone=()=>{const v=vals.current;setSecErr('');if(v.curPh!==cfg.adminPhone){setSecErr('شماره تماس فعلی صحیح نیست');return}if(!v.newPh||v.newPh!==v.repPh){setSecErr('شماره تماس جدید با تکرار آن مطابقت ندارد');return}setSave({...cfg,adminPhone:v.newPh});vals.current={...vals.current,curPh:'',newPh:'',repPh:''};setClearKey(x=>x+1)};
  // اصلاح ۱۹: تغییر رمز عبور از داخل پنل مدیریت — فقط رمز ذخیره‌شده فعلی (یا رمز env اولیه) معتبر است
  const savePassword=()=>{
   const v=vals.current; setPwdErr('');
   const currentStored=cfg.adminPassword||ENV_ADMIN_PASSWORD;
   const curOk=!!currentStored&&v.curPwd===currentStored;
   if(!curOk){setPwdErr('رمز عبور فعلی صحیح نیست');return}
   if(!v.newPwd||v.newPwd.length<4){setPwdErr('رمز جدید باید حداقل ۴ کاراکتر باشد');return}
   if(v.newPwd!==v.repPwd){setPwdErr('رمز جدید با تکرار آن مطابقت ندارد');return}
   setSave({...cfg,adminPassword:v.newPwd});
   vals.current={...vals.current,curPwd:'',newPwd:'',repPwd:''};
   setClearKey(x=>x+1);
  };
  return <Box title="امنیت">
   <h4>تغییر رمز عبور</h4>
   {pwdErr&&<Err x={pwdErr}/>}
   <div style={{marginBottom:13}}><label style={S.lbl}>رمز عبور فعلی</label><StableAdminInput key={clearKey+'-curPwd'} type="password" style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('curPwd',v)}/></div>
   <div style={{marginBottom:13}}><label style={S.lbl}>رمز عبور جدید</label><StableAdminInput key={clearKey+'-newPwd'} type="password" style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('newPwd',v)}/></div>
   <div style={{marginBottom:13}}><label style={S.lbl}>تکرار رمز عبور جدید</label><StableAdminInput key={clearKey+'-repPwd'} type="password" style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('repPwd',v)}/></div>
   <button style={AdminBtn()} onClick={savePassword}>ذخیره رمز جدید</button>
   <h4 style={{marginTop:20}}>تغییر شماره تماس</h4>
   {secErr&&<Err x={secErr}/>}
   <div style={{marginBottom:13}}><label style={S.lbl}>شماره تماس فعلی</label><StableAdminInput key={clearKey+'-curPh'} numeric style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('curPh',v)}/></div>
   <div style={{marginBottom:13}}><label style={S.lbl}>شماره تماس جدید</label><StableAdminInput key={clearKey+'-newPh'} numeric style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('newPh',v)}/></div>
   <div style={{marginBottom:13}}><label style={S.lbl}>تکرار شماره تماس جدید</label><StableAdminInput key={clearKey+'-repPh'} numeric style={S.inp} defaultValue="" onCommit={(v:string)=>setVal('repPh',v)}/></div>
   <button style={AdminBtn()} onClick={savePhone}>ذخیره شماره جدید</button>
  </Box>}

 function ProductsTabEditor(){
  const productsCfg=editCfg.products||{showSection:false,items:[]};
  const items:any[]=productsCfg.items||[];
  const showSection=productsCfg.showSection!==false;
  const upd=(newItems:any[])=>setEditCfg({...editCfg,products:{...productsCfg,items:newItems}});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const chgFeatures=(i:number,featuresStr:string)=>{const feats=featuresStr.split(/[|,\n]/).map((s:string)=>s.trim()).filter(Boolean);chg(i,'features',feats)};
  return <>
   <Box title="مدیریت نمایش بخش محصولات">
    <label style={{display:'flex',alignItems:'center',gap:8,fontSize:13,fontWeight:800,cursor:'pointer',padding:'10px 12px',background:showSection?`${T.ok}12`:`${T.err}12`,border:`1px solid ${showSection?T.ok:T.err}`,borderRadius:12}}>
     <input type="checkbox" checked={showSection} onChange={e=>setEditCfg({...editCfg,products:{...productsCfg,showSection:e.target.checked}})} style={{width:18,height:18}}/>
     <span>{showSection?'✅ بخش محصولات فعال است':'❌ بخش محصولات غیرفعال است'}</span>
    </label>
   </Box>
   <Box title={`لیست محصولات (${items.length})`}>
    {items.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span>{it.isVisible!==false?'👁️':'🚫'}</span>
      <span style={{flex:1}}>{it.title||'بدون عنوان'}</span>
     </summary>
     <div style={{marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}>
        <input type="checkbox" checked={it.isVisible!==false} onChange={e=>chg(i,'isVisible',e.target.checked)}/> نمایش محصول
       </label>
      </div>
      <Field label="عنوان محصول" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>توضیحات محصول</label>
      <textarea style={{...S.ta,marginBottom:8,minHeight:60}} defaultValue={it.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات کامل محصول..."/>
      <label style={S.lbl}>ویژگی‌ها (با | یا کاما یا خط جدید جدا کنید)</label>
      <textarea style={{...S.ta,marginBottom:8,minHeight:50}} defaultValue={(it.features||[]).join(' | ')} onBlur={e=>chgFeatures(i,e.target.value)} placeholder="ویژگی ۱ | ویژگی ۲ | ..."/>
      <label style={S.lbl}>عکس محصول (آپلود یا لینک مستقیم)</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
       {it.image&&<img src={it.image} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
       <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,it.image,'products');chg(i,'image',url)}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
      </div>
      <input style={{...S.inp,marginBottom:8}} defaultValue={it.image||''} onBlur={e=>chg(i,'image',e.target.value.trim())} placeholder="https://... یا لینک مستقیم عکس"/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
       <button style={AdminBtn()} disabled={i===0} onClick={()=>{if(i>0){const a=[...items];[a[i-1],a[i]]=[a[i],a[i-1]];upd(a)}}}>▲ بالا</button>
       <button style={AdminBtn()} disabled={i===items.length-1} onClick={()=>{if(i<items.length-1){const a=[...items];[a[i+1],a[i]]=[a[i],a[i+1]];upd(a)}}}>▼ پایین</button>
       <button style={{...AdminBtn(),color:T.err}} onClick={()=>upd(items.filter((_:any,j:number)=>j!==i))}>🗑️ حذف</button>
      </div>
     </div>
    </details>)}
    <button style={AdminBtn()} onClick={()=>upd([...items,{id:'p'+uid(),title:'محصول جدید',description:'',features:[],image:'',isVisible:true}])}>+ افزودن محصول جدید</button>
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره محصولات</button>
  </>}

 function HighlightsTabEditor(){
  const rawHL=editCfg.highlights;
  const items:any[]=Array.isArray(rawHL)?rawHL:(rawHL&&typeof rawHL==='object'?Object.values(rawHL):[]);
  const upd=(newItems:any[])=>setEditCfg({...editCfg,highlights:newItems});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const addHl=()=>upd([...items,{id:'hl'+uid(),title:'هایلایت جدید',coverImage:'',stories:[]}]);
  const removeHl=(i:number)=>upd(items.filter((_:any,j:number)=>j!==i));
  const moveHl=(i:number,dir:-1|1)=>{const a=[...items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a)};
  const chgStory=(hi:number,si:number,k:string,v:any)=>{const a=[...items];const stories=[...a[hi].stories];stories[si]={...stories[si],[k]:v};a[hi]={...a[hi],stories};upd(a)};
  const addStory=(hi:number)=>{const a=[...items];const stories=[...(a[hi].stories||[])];stories.push({id:'st'+uid(),title:'',imageCodeExternal:'',imageCodeInternal:''});a[hi]={...a[hi],stories};upd(a)};
  const removeStory=(hi:number,si:number)=>{const a=[...items];const stories=a[hi].stories.filter((_:any,j:number)=>j!==si);a[hi]={...a[hi],stories};upd(a)};
  return <>
   <Box title={`مدیریت هایلایت‌ها (${items.length})`}>
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>هر هایلایت شامل یک عکس کاور و چند اسلاید (استوری) است. اسلایدها می‌توانند کد تصویر خارجی و داخلی داشته باشند.</p>
    {items.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span style={{flex:1}}>{it.title||'بدون عنوان'} ({(it.stories||[]).length} استوری)</span>
     </summary>
     <div style={{marginTop:10}}>
      <Field label="عنوان هایلایت" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>عکس کاور (آپلود یا لینک مستقیم)</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
       {it.coverImage&&<img src={it.coverImage} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
       <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,it.coverImage,'highlights');chg(i,'coverImage',url)}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
      </div>
      <input style={{...S.inp,marginBottom:8}} defaultValue={it.coverImage||''} onBlur={e=>chg(i,'coverImage',e.target.value.trim())} placeholder="https://... یا لینک مستقیم عکس کاور"/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',margin:'8px 0'}}>
       <button style={AdminBtn()} disabled={i===0} onClick={()=>moveHl(i,-1)}>▲ بالا</button>
       <button style={AdminBtn()} disabled={i===items.length-1} onClick={()=>moveHl(i,1)}>▼ پایین</button>
       <button style={{...AdminBtn(),color:T.err}} onClick={()=>removeHl(i)}>🗑️ حذف هایلایت</button>
      </div>
      <div style={{marginTop:10,padding:10,background:T.soft,borderRadius:10}}>
       <b style={{fontSize:12,color:T.ttl,display:'block',marginBottom:8}}>استوری‌ها</b>
       {(it.stories||[]).map((st:any,si:number)=><div key={st.id||si} style={{border:`1px solid ${T.brd}`,borderRadius:10,padding:8,marginTop:8,background:T.card}}>
        <Field label="عنوان اسلاید" value={st.title||''} onChange={(v:string)=>chgStory(i,si,'title',v)} ph=""/>
        <label style={S.lbl}>کد تصویر خارجی (VPN روشن)</label>
        <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeExternal||''} onBlur={e=>chgStory(i,si,'imageCodeExternal',e.target.value.trim())} placeholder='<img src="https://..." />'/>
        <label style={S.lbl}>کد تصویر داخلی (VPN خاموش)</label>
        <textarea dir="ltr" style={{...S.ta,marginBottom:6,fontFamily:'monospace,-apple-system,"Courier New"',fontSize:11.5,minHeight:54}} defaultValue={st.imageCodeInternal||''} onBlur={e=>chgStory(i,si,'imageCodeInternal',e.target.value.trim())} placeholder='<img src="https://..." />'/>
        <button style={{...AdminBtn(),color:T.err,marginTop:6}} onClick={()=>removeStory(i,si)}>حذف اسلاید</button>
       </div>)}
       <button style={{...AdminBtn(),marginTop:8}} onClick={()=>addStory(i)}>+ افزودن اسلاید</button>
      </div>
     </div>
    </details>)}
    <button style={{...AdminBtn(),marginTop:8}} onClick={addHl}>+ افزودن هایلایت جدید</button>
   </Box>
   <button style={S.btn} onClick={()=>setSave(editCfg)}>ذخیره هایلایت‌ها</button>
  </>}

 function LicensesTabEditor(){
  const rawLic=editCfg.licenses;
  const items:any[]=Array.isArray(rawLic)?rawLic:(rawLic&&typeof rawLic==='object'?Object.values(rawLic):[]);
  const upd=(newItems:any[])=>setEditCfg({...editCfg,licenses:newItems});
  const chg=(i:number,k:string,v:any)=>{const a=[...items];a[i]={...a[i],[k]:v};upd(a)};
  const addLicense=()=>upd([...items,{id:'lc'+uid(),title:'مجوز جدید',description:'',image:'',isVisible:true}]);
  const removeLicense=(i:number)=>upd(items.filter((_:any,j:number)=>j!==i));
  const moveLicense=(i:number,dir:-1|1)=>{const a=[...items];const j=i+dir;if(j<0||j>=a.length)return;[a[i],a[j]]=[a[j],a[i]];upd(a)};
  return <>
   <Box title={`مدیریت مجوزها (${items.length})`}>
    {items.map((it:any,i:number)=><details key={it.id||i} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
     <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}>
      <span>{it.isVisible!==false?'👁️':'🚫'}</span>
      <span style={{flex:1}}>{it.title||'بدون عنوان'}</span>
     </summary>
     <div style={{marginTop:10}}>
      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:8}}>
       <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}>
        <input type="checkbox" checked={it.isVisible!==false} onChange={e=>chg(i,'isVisible',e.target.checked)}/> نمایش مجوز
       </label>
      </div>
      <Field label="عنوان مجوز" value={it.title||''} onChange={(v:string)=>chg(i,'title',v)} ph=""/>
      <label style={S.lbl}>توضیحات مجوز</label>
      <textarea style={{...S.ta,marginBottom:8,minHeight:60}} defaultValue={it.description||''} onBlur={e=>chg(i,'description',e.target.value)} placeholder="توضیحات مجوز..."/>
      <label style={S.lbl}>عکس مجوز (آپلود یا لینک مستقیم)</label>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center',marginBottom:8}}>
       {it.image&&<img src={it.image} alt="" style={{width:60,height:60,objectFit:'cover',borderRadius:8,border:`1px solid ${T.brd}`}}/>}
       <input type="file" accept="image/jpeg,image/png,image/webp" style={S.inp} onChange={async e=>{const f=e.target.files?.[0];if(f){try{const url=await fileToData(f,it.image,'licenses');chg(i,'image',url)}catch(err:any){alert(err?.message||'آپلود انجام نشد')}}}}/>
      </div>
      <input style={{...S.inp,marginBottom:8}} defaultValue={it.image||''} onBlur={e=>chg(i,'image',e.target.value.trim())} placeholder="https://... یا لینک مستقیم عکس"/>
      <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:8}}>
       <button style={AdminBtn()} disabled={i===0} onClick={()=>moveLicense(i,-1)}>▲ بالا</button>
       <button style={AdminBtn()} disabled={i===items.length-1} onClick={()=>moveLicense(i,1)}>▼ پایین</button>
       <button style={{...AdminBtn(),color:T.err}} onClick={()=>removeLicense(i)}>🗑️ حذف</button>
      </div>
     </div>
    </details>)}
    <button style={AdminBtn()} onClick={addLicense}>+ افزودن مجوز جدید</button>
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
     <button style={AdminBtn()} disabled={disableUp} onClick={moveUp}>▲ بالا</button>
     <button style={AdminBtn()} disabled={disableDown} onClick={moveDown}>▼ پایین</button>
     {canRemove?<button style={{...AdminBtn(),color:T.err}} onClick={onRemove}>🗑️ حذف</button>:<button style={{...AdminBtn(),color:T.mut,cursor:'not-allowed'}} disabled>حذف پیش‌فرض غیرفعال است</button>}
    </div>
   </div>
  );

  return <>
   <Box title="حالت نمایش خدمات">
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>برای هر صفحه مشخص کنید خدمات به‌صورت لیست یا کاروسل نمایش داده شود.</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <div><label style={S.lbl}>صفحه اصلی</label><select style={S.inp} value={dm.home||'carousel'} onChange={e=>updDm('home',e.target.value)}><option value="list">📋 لیست</option><option value="carousel">🎠 کاروسل</option></select></div>
     <div><label style={S.lbl}>صفحه دوره‌ها</label><select style={S.inp} value={dm.courses||'carousel'} onChange={e=>updDm('courses',e.target.value)}><option value="list">📋 لیست</option><option value="carousel">🎠 کاروسل</option></select></div>
    </div>
   </Box>

   <Box title="👁️ نمایش خدمات در صفحات">
    <p style={{fontSize:11,color:T.mut,margin:'0 0 10px',lineHeight:1.8}}>تعیین کنید بخش «خدمات ما» در کدام صفحات نمایش داده شود.</p>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
     {([['home','🏠 صفحه اصلی'],['courses','🎓 معرفی دوره‌ها'],['parentExperience','👩‍👧 تجربه والدین'],['licenses','📜 مجوزها'],['trainings','📚 آموزش‌ها'],['about','ℹ️ درباره ما'],['faq','❓ سوالات متداول'],['contact','📞 ارتباط با ما']] as [string,string][]).map(([k,label])=>(
      <label key={k} style={{display:'flex',alignItems:'center',gap:8,padding:'8px 10px',borderRadius:10,background:sv[k]!==false?T.soft:T.inp,border:`1px solid ${sv[k]!==false?T.acc+'44':T.brd}`,cursor:'pointer',fontWeight:700,fontSize:12,transition:'all .2s ease'}}><input type="checkbox" checked={sv[k]!==false} onChange={e=>updSv(k,e.target.checked)}/>{label}</label>
     ))}
    </div>
   </Box>

   <Box title="📋 مدیریت لیست خدمات">
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}><button style={AdminBtn()} onClick={addListItem}>+ افزودن آیتم جدید</button><button style={{...AdminBtn(),color:T.warn}} onClick={resetList}>↺ بازنشانی لیست به پیش‌فرض</button></div>
    {(ls.items||[]).map((it:any,i:number)=><ServiceItemEditor key={it.id||i} item={it} onChange={(k,v)=>chgListItem(i,k,v)} onRemove={()=>removeListItem(i)} canRemove={!it.isDefault} moveUp={()=>moveListItem(i,-1)} moveDown={()=>moveListItem(i,1)} disableUp={i===0} disableDown={i===(ls.items||[]).length-1}/>) }
   </Box>

   <Box title="⚙️ تنظیمات کاروسل">
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
     <Field label="تعداد ستون‌ها" value={String(cs.columns||2)} onChange={(v:string)=>updCsSetting('columns',Math.max(1,Math.min(3,+v||2)))} ph="2"/>
     <Field label="فاصله حرکت خودکار (ثانیه)" value={String(cs.autoScrollInterval||8)} onChange={(v:string)=>updCsSetting('autoScrollInterval',Math.max(2,+v||8))} ph="8"/>
    </div>
    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginTop:8}}>
     <label style={{display:'flex',alignItems:'center',gap:6,fontSize:12,fontWeight:800,cursor:'pointer'}}><input type="checkbox" checked={cs.autoScrollEnabled!==false} onChange={e=>updCsSetting('autoScrollEnabled',e.target.checked)}/> حرکت خودکار فعال</label>
     <Field label="توقف بعد از سوایپ (ثانیه)" value={String(cs.pauseOnSwipe||3)} onChange={(v:string)=>updCsSetting('pauseOnSwipe',Math.max(1,+v||3))} ph="3"/>
    </div>
   </Box>

   <Box title={`🎠 مدیریت کاروسل خدمات (${columnsData.length} ستون)`}>
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:10}}><button style={AdminBtn()} onClick={addColumn}>+ افزودن ستون جدید</button><button style={{...AdminBtn(),color:T.warn}} onClick={resetCarousel}>↺ بازنشانی کاروسل به پیش‌فرض</button></div>
    {columnsData.map((col:any,ci:number)=>(
     <details key={col.id||ci} style={{border:`1px solid ${T.brd}`,borderRadius:12,padding:10,marginBottom:10,background:T.badge}}>
      <summary style={{cursor:'pointer',fontWeight:800,fontSize:12,display:'flex',alignItems:'center',gap:8}}><span>ستون {ci+1} ({col.items?.length||0} آیتم)</span><span style={{fontSize:10,color:T.mut}}>{ci%2===0?'↕ پایین':'↕ بالا'}</span></summary>
      <div style={{marginTop:10}}>
       <Field label="شناسه ستون" value={col.id||''} onChange={(v:string)=>updCol(ci,'id',v)} ph="col-1"/>
       {(col.items||[]).map((it:any,ii:number)=><ServiceItemEditor key={it.id||ii} item={it} onChange={(k,v)=>chgColItem(ci,ii,k,v)} onRemove={()=>removeColItem(ci,ii)} canRemove={!it.isDefault} moveUp={()=>moveColItem(ci,ii,-1)} moveDown={()=>moveColItem(ci,ii,1)} disableUp={ii===0} disableDown={ii===(col.items||[]).length-1}/>) }
       <button style={AdminBtn()} onClick={()=>addColItem(ci)}>+ افزودن آیتم جدید به ستون {ci+1}</button>
       <div style={{marginTop:8}}><button style={{...AdminBtn(),color:T.err}} onClick={()=>removeColumn(ci)}>🗑️ حذف ستون {ci+1}</button></div>
      </div>
     </details>
    ))}
   </Box>

   <button style={S.btn} onClick={()=>setSave({...editCfg,listSettings:{...ls,items:ls.items},carouselSettings:{...cs,columnsData}})}>ذخیره تنظیمات خدمات</button>
  </>}

 return Admin();
}
