// صفحات اطلاعاتی: تجربه والدین / مجوزها / آموزش‌ها / درباره ما / ارتباط با ما
import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { isValidMediaUrl } from '../utils/detectCountry';
import { detectVpnOn } from '../utils/vpn';
import MediaCard, { mediaThumb } from '../components/MediaCard';
import { VideoIcon, AudioIcon, PhotoIcon, TextIcon, SearchIcon } from '../components/Icons';
import SecurePage from '../components/SecurePage';
import { StoryHighlightsBar, LegacyStoryHighlightsBar } from '../components/StoryViewer';
import type { Highlight } from '../components/StoryViewer';
import ServicesSection from '../components/ServicesSection';

// اصلاح ۲۹ (مرحله ۷): پارامتر اختیاری topSlot برای نمایش هایلایت استوری در بالای صفحه (قبل از عنوان اصلی)
function PageShell({app,title,children,topSlot,variant='default'}:{app:any,title:string,children:any,topSlot?:any,variant?:'default'|'trust'|'education'}){
 const {T,S,css,lang,setView}=app;
 return <div className={`zk-info-page zk-info-page--${variant}`} style={{...S.page,overflowX:'hidden'}}><style>{css}{`.zk-info-page--trust .zk-info-card{border-radius:20px;box-shadow:var(--zk-shadow-soft,0 4px 15px rgba(15,38,60,.06));border-color:${T.brd}}.zk-info-page--trust .zk-info-heading{font-size:clamp(20px,5vw,28px);line-height:1.45}.zk-info-page--trust .zk-info-back{min-height:44px;border-radius:12px}.zk-info-page--trust .zk-info-body{font-size:14px;line-height:2;color:${T.mut}}.zk-info-page--education .zk-info-card{border-radius:20px;box-shadow:var(--zk-shadow-soft,0 4px 15px rgba(15,38,60,.06));border-color:${T.brd}}.zk-info-page--education .zk-info-heading{font-size:clamp(20px,5vw,28px);line-height:1.45}.zk-info-page--education .zk-info-back{min-height:44px;border-radius:12px}.zk-info-page--education .zk-info-body{font-size:14px;line-height:2;color:${T.mut}}@media(max-width:480px){.zk-info-page--trust .zk-info-card,.zk-info-page--education .zk-info-card{padding:18px 14px!important}.zk-info-page--trust .zk-info-header,.zk-info-page--education .zk-info-header{align-items:flex-start!important}.zk-info-page--trust .zk-info-back,.zk-info-page--education .zk-info-back{font-size:12px!important;padding-inline:10px!important;white-space:nowrap}}`}</style><div className="zk-info-card" style={{...S.card,maxWidth:760}}>{topSlot}<div className="zk-info-header" style={{display:'flex',alignItems:'center',gap:10,marginBottom:18}}><h1 className="zk-info-heading" style={{color:T.ttl,margin:0,fontSize:18,flex:1,fontWeight:800}}>{title}</h1><button type="button" className="zk-info-back" onClick={()=>{try{if(window.history.length>1){window.history.back();return}}catch{} setView('home')}} style={{padding:'8px 12px',border:`1px solid ${T.brd}`,background:T.soft,color:T.acc,cursor:'pointer',fontFamily:'inherit',fontSize:13}}>{lang==='en'?'Back':'بازگشت'}</button></div><div className="zk-info-body">{children}</div></div></div>
}

// اصلاح ۷: تشخیص خودکار وضعیت VPN برای انتخاب پلتفرم محتوا (یوتیوب اگر VPN روشن، آپارات اگر خاموش)
function useVpn(cfg:any){
 const [vpnOn,setVpnOn]=useState(false);
 useEffect(()=>{let alive=true;const mode=cfg.mediaCountryMode||'auto';if(mode==='iran'){setVpnOn(false);return}if(mode==='intl'){setVpnOn(true);return}detectVpnOn().then(v=>{if(alive)setVpnOn(v)}).catch(()=>{if(alive)setVpnOn(false)});return()=>{alive=false}},[cfg.mediaCountryMode]);
 return vpnOn;
}
// اصلاح ۱ (مرحله ۳): آیتمی که manualCode دارد نیز معتبر محسوب می‌شود (حتی بدون لینک یوتیوب/آپارات)
function pickByPlatform(list:any[],type:string,vpnOn:boolean){
 const valid=(list||[]).filter((x:any)=>x.active!==false&&((x.type||'video')==='text'?true:(!!String(x.manualCode||'').trim()||(x.youtubeUrl&&isValidMediaUrl(x.youtubeUrl))||(x.aparatUrl&&isValidMediaUrl(x.aparatUrl))||(x.url&&isValidMediaUrl(x.url))))&&(x.type||'video')===type).sort((a:any,b:any)=>(a.order||0)-(b.order||0));
 return valid;
}

function MediaTabsGrid({items,cfg,T,lang,withText=false,tabVisibility,secure=true,horizontal=false}: {items:any[],cfg:any,T:any,lang:string,withText?:boolean,tabVisibility?:any,secure?:boolean,horizontal?:boolean}){
 const vpnOn=useVpn(cfg);
 const baseTypes:{id:string; label:string; icon:React.ReactNode}[]=[
   {id:'video', label: lang==='en'?'Video':'ویدیو', icon:<VideoIcon size={14} color="currentColor" />},
   {id:'audio', label: lang==='en'?'Voice':'ویس', icon:<AudioIcon size={14} color="currentColor" />},
   {id:'image', label: lang==='en'?'Photo':'عکس', icon:<PhotoIcon size={14} color="currentColor" />},
   ...(withText?[{id:'text', label: lang==='en'?'Text':'متن', icon:<TextIcon size={14} color="currentColor" />}]:[])
 ];
 // کنترل نمایش تب‌ها
 const tv = tabVisibility || cfg.experienceTabs || {};
 const types = baseTypes.filter(t=>{
   if(t.id==='video' && tv.video===false) return false;
   if(t.id==='audio' && tv.audio===false) return false;
   if(t.id==='image' && tv.image===false) return false;
   if(t.id==='text' && !tv.text && !withText) return false;
   if(t.id==='text' && tv.text===false) return false;
   return true;
 });
 const pools=useMemo(()=>Object.fromEntries(types.map((t)=>[t.id,pickByPlatform(items,t.id,vpnOn)])),[items,vpnOn,types.map(t=>t.id).join(',')]);
 const tabs=types.filter((t)=>(pools as any)[t.id].length>0);
 const [mtab,setMtab]=useState(tabs[0]?.id || 'video');
 const scrollRef=useRef<HTMLDivElement|null>(null);
 useEffect(()=>{if(tabs.length&&!tabs.some(t=>t.id===mtab))setMtab(tabs[0].id)},[tabs.map(t=>t.id).join(','),mtab]);
 if(!tabs.length)return <p style={{fontSize:13,color:T.mut,lineHeight:2}}>{lang==='en'?'Content will be published here soon.':'محتوا به‌زودی در این بخش منتشر می‌شود.'}</p>;
 const shown=(pools as any)[mtab]||[];
 const scroll=(dir:number)=>{const el=scrollRef.current;if(!el)return;const cardWidth=mtab==='image'?312:292;el.scrollBy({left:dir*cardWidth,behavior:'smooth'})};
 const ArrowBtn=({dir}:{dir:number})=><button onClick={()=>scroll(dir)} style={{width:32,height:32,borderRadius:'50%',border:`1px solid ${T.brd}`,background:T.card,color:T.acc,cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:T.neuOut,fontSize:18,flexShrink:0}}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transform:dir<0?'scaleX(-1)':'none'}}><polyline points="9 18 15 12 9 6"/></svg></button>;
 const gridStyle:React.CSSProperties=horizontal?{display:'flex',gap:12,overflowX:'auto',paddingBottom:8,WebkitOverflowScrolling:'touch',scrollSnapType:'x mandatory'}:{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(220px,1fr))',gap:12};
 const cardStyle=horizontal?{flex:'0 0 auto',scrollSnapAlign:'start' as any,width:mtab==='video'?280:mtab==='image'?300:260}:{width:'100%'};
 return <>
  {tabs.length>1&&<div style={{display:'flex',gap:6,marginBottom:12,flexWrap:'wrap'}}>{tabs.map((tab)=><button key={tab.id} onClick={()=>setMtab(tab.id)} style={{padding:'7px 13px',borderRadius:18,border:`1px solid ${mtab===tab.id?T.acc:T.brd}`,background:mtab===tab.id?T.soft:'transparent',color:mtab===tab.id?T.acc:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:12,fontWeight:700,transition:'all .65s',display:'flex',alignItems:'center',gap:5}}><span style={{display:'flex',alignItems:'center'}}>{tab.icon}</span><span>{tab.label}</span></button>)}</div>}
  {horizontal&&<div style={{display:'flex',justifyContent:'flex-end',gap:6,marginBottom:8}}><ArrowBtn dir={-1}/><ArrowBtn dir={1}/></div>}
  <div ref={scrollRef} style={{...gridStyle,animation:'fadeSlide .65s ease both'}}>{shown.map((it:any)=><div key={it.id} style={cardStyle as any}><MediaCard item={it} T={T} lang={lang} vpnOn={vpnOn} secure={secure}/></div>)}</div>
 </>
}

// ===== تجربه والدین =====
export function ExperiencePage({app}:{app:any}){
 const {cfg,T,lang,showContactOn,ContactPanel}=app;
 const withText = !!cfg.experienceTabs?.text;
 const title = lang==='en'?'Parents’ Experience':'تجربه والدین';
 // اصلاح ۱ (مرحله ۵): پیام هشدار سفارشی برای صفحه تجربه والدین
 const warningMessage = lang==='en'
  ? 'Taking a screenshot or screen recording of the Parents’ Experience page is prohibited. This content is shown with parental consent, and downloading or copying it will be legally prosecuted.'
  : 'گرفتن اسکرین‌شات یا اسکرین‌رکورد از صفحه تجربه والدین ممنوع است. با رضایت از والدین این محتواها نمایش داده شده‌اند و دانلود یا کپی آن پیگرد قانونی دارد.';
 const consentNotice = lang==='en'
  ? 'This content is shown with parental consent.'
  : 'با رضایت از والدین این محتواها نمایش داده شده‌اند.';
 // اصلاح ۳۲ (مرحله ۹): پاراگراف سئوی سوال‌محور/کلیدواژه‌محور در انتهای صفحه (قبل از ارتباط با ما) — قابل کنترل از پنل مدیریت
 const introText=lang==='en'?(cfg.experienceIntroTextEn||''):(cfg.experienceIntroText||'');
 const showIntro=cfg.pageContentOrder?.experience?.showIntro!==false&&!!introText;
 const contactFirst=cfg.pageContentOrder?.experience?.order==='contactFirst';
 const IntroBlock=showIntro?<div style={{marginTop:16,padding:'12px 16px',background:T.soft,border:`1px solid ${T.brd}`,borderRadius:14,fontSize:13,color:T.mut,lineHeight:1.9}}>{introText}</div>:null;
 const ContactBlock=showContactOn('experience')?<ContactPanel cfg={cfg} T={T} lang={lang}/>:null;
 return (
   <>
     <Helmet><title>تجربه والدین | زینالیکید</title><meta name="description" content="تجربه واقعی والدین از دوره‌های رشد و تغذیه زینالیکید — نتایج را ببینید و بشنوید" /></Helmet>
     <SecurePage pageTitle={title} T={T} warningMessage={warningMessage}>
       <PageShell app={app} title={title} variant="trust" topSlot={cfg.storyHighlights?.highlights?.length?<StoryHighlightsBar highlights={cfg.storyHighlights.highlights} T={T} lang={lang}/>:cfg.storyHighlights?.items?.length?<LegacyStoryHighlightsBar items={cfg.storyHighlights.items} T={T} lang={lang}/>:null}>
         {/* اصلاح ۱ (مرحله ۵): متن راهنمای رضایت والدین در بالای صفحه */}
         <div style={{background:`${T.warn}15`,border:`1px solid ${T.warn}`,color:T.warn,borderRadius:12,padding:'11px 14px',fontSize:12.5,fontWeight:700,lineHeight:1.85,marginBottom:16}}>{consentNotice}</div>

         <div style={{marginBottom:14}}>
           <div style={{fontSize:15,fontWeight:800,color:T.ttl}}>{lang==='en'?'Real stories. Real results.':'داستان‌های واقعی. نتایج واقعی.'}</div>
           <p style={{fontSize:13.5,color:T.mut,lineHeight:1.85,marginTop:4}}>{lang==='en'?'Parents who walked this path share their journey — videos, voice notes and photos of real progress.':'والدینی که این مسیر را طی کرده‌اند، سفرشان را به اشتراک می‌گذارند — ویدیو، ویس و عکس پیشرفت واقعی.'}</p>
         </div>
         {/* اصلاح ۱۶: نمایش افقی محتوای چندرسانه‌ای با دکمه‌های اسکرول در صفحه تجربه والدین */}
         <MediaTabsGrid items={cfg.experience?.items||[]} cfg={cfg} T={T} lang={lang} withText={withText} tabVisibility={cfg.experienceTabs} horizontal/>
         {/* اصلاح ۵: بخش خدمات قابل فعال‌سازی در تجربه والدین */}
         {cfg.servicesVisibility?.parentExperience!==false&&<div style={{marginTop:18}}><h3 style={{color:T.ttl,fontSize:15,margin:'0 0 10px',fontWeight:800}}>{lang==='en'?'Our Services':'خدمات ما'}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>lang==='en'?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list'} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}
         {contactFirst?<>{ContactBlock}{IntroBlock}</>:<>{IntroBlock}{ContactBlock}</>}
       </PageShell>
     </SecurePage>
   </>
 );
}

// ===== آموزش‌ها (با جستجوی شناور) =====
export function EducationPage({app}:{app:any}){
 const {cfg,T,S,lang,showContactOn,ContactPanel}=app;
 const [q,setQ]=useState('');
 const all=(cfg.education?.items||[]).filter((x:any)=>x.active!==false);
 // اصلاح ۲۱: جستجو شامل کلیدواژه‌ها هم می‌شود
 const filtered=useMemo(()=>{const t=q.trim().toLowerCase();if(!t)return all;return all.filter((x:any)=>[x.title,x.description,x.body,...(x.keywords||[])].filter(Boolean).join(' ').toLowerCase().includes(t))},[q,all]);
 // اصلاح ۲۱: کلیدواژه‌های پیشنهادی از تمام آیتم‌ها استخراج شده
 const suggestedKeywords=useMemo(()=>{const map=new Map<string,number>();all.forEach((x:any)=>(x.keywords||[]).forEach((kw:string)=>{const k=kw.trim().toLowerCase();if(k)map.set(k,(map.get(k)||0)+1)}));return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,cfg.suggestedKeywordsCount||8).map(([k])=>k)},[all,cfg.suggestedKeywordsCount]);
 const title = lang==='en'?'Tutorials':'آموزش‌ها';
 // اصلاح ۳۲ (مرحله ۹): پاراگراف سئوی سوال‌محور/کلیدواژه‌محور
 const introText=lang==='en'?(cfg.educationIntroTextEn||''):(cfg.educationIntroText||'');
 const showIntro=cfg.pageContentOrder?.education?.showIntro!==false&&!!introText;
 const contactFirst=cfg.pageContentOrder?.education?.order==='contactFirst';
 const IntroBlock=showIntro?<div style={{marginTop:16,padding:'12px 16px',background:T.soft,border:`1px solid ${T.brd}`,borderRadius:14,fontSize:13,color:T.mut,lineHeight:1.9}}>{introText}</div>:null;
 const ContactBlock=showContactOn('education')?<ContactPanel cfg={cfg} T={T} lang={lang}/>:null;
 return (
   <>
     <Helmet><title>آموزش‌ها | زینالیکید</title><meta name="description" content="آموزش‌های تخصصی رشد، تغذیه و مراقبت از کودک و نوجوان زینالیکید" /></Helmet>
     {/* اصلاح ۱۴: حذف محدودیت اسکرین‌شات از صفحه آموزش‌ها — بدون SecurePage */}
       <PageShell app={app} title={title} variant="education" topSlot={cfg.storyHighlights?.highlights?.length?<StoryHighlightsBar highlights={cfg.storyHighlights.highlights} T={T} lang={lang}/>:cfg.storyHighlights?.items?.length?<LegacyStoryHighlightsBar items={cfg.storyHighlights.items} T={T} lang={lang}/>:null}>
         {/* اصلاح ۲۱: باکس جستجوی شیشه‌ای + کلیدواژه‌های پیشنهادی */}
         <div style={{position:'sticky',top:8,zIndex:20,marginBottom:12}}>
           <div style={{display:'flex',alignItems:'center',gap:8,background:`${T.hdr}`,backdropFilter:'blur(12px)',WebkitBackdropFilter:'blur(12px)',border:`1px solid ${T.brd}`,borderRadius:14,padding:'5px 14px',boxShadow:'0 8px 24px rgba(0,0,0,.12)'}}>
             <span style={{fontSize:15,flexShrink:0,display:'flex',alignItems:'center'}}><SearchIcon size={16} color={T.mut} /></span>
             <input value={q} onChange={e=>setQ(e.target.value)} placeholder={lang==='en'?'Search tutorials...':'جستجو در آموزش\u200cها...'} style={{flex:1,minWidth:0,padding:'10px 0',background:'transparent',border:0,outline:'none',color:T.txt,fontSize:16,fontFamily:'inherit'}}/>
             {q&&<button type="button" aria-label={lang==='en'?'Clear search':'پاک کردن جست‌وجو'} onClick={()=>setQ('')} style={{border:0,background:'transparent',color:T.mut,cursor:'pointer',fontSize:18,padding:4,minWidth:44,minHeight:44,fontFamily:'inherit'}}>×</button>}
           </div>
           {/* اصلاح ۲۱: کلیدواژه‌های پیشنهادی */}
           {!q&&suggestedKeywords.length>0&&<div style={{display:'flex',gap:5,flexWrap:'wrap',marginTop:6,paddingInline:4}}>{suggestedKeywords.slice(0,3).map((kw:string)=><button key={kw} onClick={()=>setQ(kw)} style={{padding:'4px 10px',borderRadius:14,border:`1px solid ${T.brd}`,background:T.card,color:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:600,boxShadow:T.neuOut,transition:'all .2s'}}>{kw}</button>)}</div>}
         </div>
         <section aria-label={lang==='en'?'Parent education signature':'امضای تخصصی آموزش والدین'} style={{display:'flex',alignItems:'center',gap:12,margin:'0 0 14px',padding:'10px 12px',background:T.soft,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden'}}><img src="/images/specialist/specialist-education.webp" alt={lang==='en'?'Zeynalikid education specialist':'کارشناس آموزش زینالیکید'} style={{width:72,height:86,objectFit:'cover',objectPosition:'center top',borderRadius:10,flexShrink:0}}/><p style={{margin:0,fontSize:12,color:T.mut,lineHeight:1.9}}>{lang==='en'?'Practical content to help parents understand growth, nutrition and everyday care.':'محتوای کاربردی برای کمک به والدین در شناخت رشد، تغذیه و مراقبت روزمره.'}</p></section>
         {q&&<p style={{fontSize:11,color:T.mut,margin:'0 0 10px'}}>{lang==='en'?`${filtered.length} result(s) for "${q}"`:`${filtered.length} نتیجه برای «${q}»`}</p>}
         <MediaTabsGrid items={filtered} cfg={cfg} T={T} lang={lang} withText secure={false}/>
         {/* اصلاح ۵: بخش خدمات قابل فعال‌سازی در آموزش‌ها */}
         {cfg.servicesVisibility?.trainings!==false&&<div style={{marginTop:18}}><h3 style={{color:T.ttl,fontSize:15,margin:'0 0 10px',fontWeight:800}}>{lang==='en'?'Our Services':'خدمات ما'}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>lang==='en'?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list'} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}
         {contactFirst?<>{ContactBlock}{IntroBlock}</>:<>{IntroBlock}{ContactBlock}</>}
       </PageShell>
   </>
 );
}

// ===== مجوزها / درباره ما / ارتباط با ما =====
export function LicensesPage({app}:{app:any}){
 const {cfg,T,lang,showContactOn,ContactPanel}=app;
 const title = lang==='en'?'Licenses':'مجوزها';
 return (
   <>
     <Helmet><title>مجوزها | زینالیکید</title><meta name="description" content="مجوزها و گواهینامه‌های رسمی زینالیکید در حوزه رشد و تغذیه کودک و نوجوان" /></Helmet>
     <SecurePage pageTitle={title} T={T}>
       <PageShell app={app} title={title} variant="trust">
         <p style={{fontSize:13,color:T.mut,lineHeight:2,whiteSpace:'pre-wrap'}}>{cfg.licensesText||(lang==='en'?'Licenses and certificates will be published here soon.':'مجوزها و گواهینامه‌ها به‌زودی در این بخش منتشر می‌شوند.')}</p>
         {/* اصلاح ۴-۴ (مرحله ۴): افزودن ContactPanel به این صفحه (طبق تنظیمات نمایش) */}
         {/* اصلاح ۵: بخش خدمات قابل فعال‌سازی در مجوزها */}
         {cfg.servicesVisibility?.licenses!==false&&<div style={{marginTop:18}}><h3 style={{color:T.ttl,fontSize:15,margin:'0 0 10px',fontWeight:800}}>{lang==='en'?'Our Services':'خدمات ما'}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>lang==='en'?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list'} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}
         {showContactOn('licenses')&&<ContactPanel cfg={cfg} T={T} lang={lang}/>}
       </PageShell>
     </SecurePage>
   </>
 );
}
export function AboutPage({app}:{app:any}){
 const {cfg,T,lang,showContactOn,ContactPanel}=app;
 const aboutText=lang==="en"
  ?(cfg.aboutTextEn||cfg.aboutText||"Zeynalikid is a specialized growth and nutrition consultation center for children, dedicated to increasing height growth, improving appetite, and boosting intelligence and focus in children and teenagers.")
  :(cfg.aboutText||"مرکز مشاوره رشد و تغذیه کودک زینالیکید، با هدف افزایش رشد قد، بهبود اشتها و تقویت هوش کودکان و نوجوانان، برنامه‌های تخصصی و اختصاصی برای هر فرزند طراحی می‌کند.");
 const introText=lang==="en"?(cfg.aboutIntroTextEn||""):(cfg.aboutIntroText||"");
 const showIntro=cfg.pageContentOrder?.about?.showIntro!==false&&!!introText;
 const contactFirst=cfg.pageContentOrder?.about?.order==="contactFirst";
 const IntroBlock=showIntro?<div style={{marginTop:18,padding:"16px 18px",background:T.soft,border:`1px solid ${T.brd}`,borderRadius:16,fontSize:14,color:T.mut,lineHeight:1.85}}>{introText}</div>:null;
 const ContactBlock=showContactOn("about")?<ContactPanel cfg={cfg} T={T} lang={lang}/>:null;

 return (
  <>
   <Helmet><title>درباره ما | زینالیکید</title><meta name="description" content="آشنایی با تیم تخصصی زینالیکید در حوزه رشد و تغذیه کودک و نوجوان" /></Helmet>
   <PageShell app={app} title={lang==="en"?"About Us":"درباره ما"} variant="trust">
     {/* Hero with specialist-hero-master.webp */}
     <div style={{marginBottom:26,borderRadius:20,overflow:"hidden",border:`1px solid ${T.brd}`,position:"relative"}}>
       <img src="/images/specialist/specialist-hero-master.webp" alt={lang==="en"?"Zeynalikid specialist":"کارشناس ارشد زینالیکید"} style={{width:"100%",height:220,objectFit:"cover"}}/>
       <div style={{position:"absolute",bottom:0,left:0,right:0,background:"linear-gradient(transparent, rgba(0,0,0,.65))",padding:"48px 18px 18px"}}>
         <div style={{color:"#fff",fontSize:20,fontWeight:900,lineHeight:1.15}}>{cfg.specialistName||""}</div>
         <div style={{color:"rgba(255,255,255,.92)",fontSize:13.5,marginTop:2}}>{lang==="en"?"Child & Adolescent Growth & Nutrition Specialist":"کارشناس رشد و تغذیه کودک و نوجوان"}</div>
       </div>
     </div>

     <p style={{fontSize:15.5,color:T.mut,lineHeight:1.85,whiteSpace:"pre-wrap",marginBottom:20}}>{aboutText}</p>

     {/* Story */}
     <div style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:20,padding:"22px 20px",marginBottom:24}}>
       <div style={{fontWeight:800,fontSize:15.5,color:T.ttl,marginBottom:10}}>{lang==="en"?"Our Story":"داستان ما"}</div>
       <div style={{fontSize:14.5,lineHeight:1.9,color:T.mut}}>
         {lang==="en"?"Founded with a single promise: every child deserves to grow, thrive and feel confident. We use the TC method — a warm, science-based approach rooted in tongue analysis, personalized nutrition, and continuous parental support." : "با یک وعده ساده شروع کردیم: هر کودک شایسته رشد، شکوفایی و اعتماد به نفس است. ما از روش TC استفاده می‌کنیم — رویکردی گرم، مبتنی بر علم و ریشه‌دار در تحلیل زبان، تغذیه شخصی‌سازی‌شده و پشتیبانی مداوم والدین."}
       </div>
     </div>

     {/* TC Method + graphic */}
     <div style={{margin:"22px 0",padding:"18px",background:T.card,border:`1px solid ${T.brd}`,borderRadius:20}}>
       <div style={{display:"flex",gap:16,alignItems:"center",flexWrap:"wrap"}}>
         <div style={{flex:"0 0 138px",maxWidth:158}}>
           <img src="/images/graphics/graphic-tc-method.webp" style={{width:"100%",borderRadius:14,border:`1px solid ${T.brd}`}} alt={lang==="en"?"TC Method visual":"تصویر روش TC"}/>
         </div>
         <div style={{flex:1,minWidth:180}}>
           <div style={{fontWeight:800,color:T.ttl,marginBottom:8,fontSize:15}}>{lang==="en"?"The TC Method":"روش TC"}</div>
           <div style={{fontSize:13.5,lineHeight:1.85,color:T.mut}}>{lang==="en"?"A calm, evidence-informed path: 1) Tongue analysis 2) Personalized supplement & nutrition plan 3) Weekly support 4) Growth tracking":"مسیر آرام و مبتنی بر شواهد: ۱) تحلیل زبان ۲) برنامه تغذیه و مکمل شخصی‌سازی‌شده ۳) پشتیبانی هفتگی ۴) پیگیری رشد"}</div>
         </div>
       </div>
     </div>

     {/* 5 Domains */}
     <div style={{marginBottom:24}}>
       <div style={{fontWeight:800,fontSize:15.5,marginBottom:10,color:T.ttl}}>{lang==="en"?"What we focus on":"حوزه‌های تمرکز ما"}</div>
       <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(138px,1fr))",gap:9}}>
         {["رشد قد","اشتها و تغذیه","هوش و تمرکز","ایمنی و خواب","حمایت والدین"].map((d,i)=><div key={i} style={{background:T.soft,border:`1px solid ${T.brd}`,padding:"11px 14px",borderRadius:14,fontSize:13.5,fontWeight:700}}>{d}</div>)}
       </div>
     </div>

     {/* Trust strip */}
     <div style={{background:T.soft,border:`1px solid ${T.brd}`,borderRadius:16,padding:"16px 18px",marginBottom:18,fontSize:13.5,lineHeight:1.8,color:T.mut}}>
       {lang==="en"?"Over 10,000 families. No shortcuts. Just care, science, and results that speak for themselves." : "بیش از ۱۰٬۰۰۰ خانواده. بدون میان‌بر. فقط مراقبت، علم و نتایج واقعی."}
     </div>

     {cfg.servicesVisibility?.about!==false&&<div style={{marginTop:18}}><h3 style={{color:T.ttl,fontSize:15,margin:"0 0 10px",fontWeight:800}}>{lang==="en"?"Our Services":"خدمات ما"}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>lang==="en"?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==="carousel"?"carousel":"list"} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}
     {contactFirst?<>{ContactBlock}{IntroBlock}</>:<>{IntroBlock}{ContactBlock}</>}
   </PageShell>
  </>
 );
}export function ContactPage({app}:{app:any}){

 const {cfg,T,lang,ContactPanel}=app;
 return <><Helmet><title>ارتباط با ما | زینالیکید</title><meta name="description" content="راه‌های ارتباط با تیم پشتیبانی و کارشناسان زینالیکید" /></Helmet><PageShell app={app} title={lang==='en'?'Contact Us':'ارتباط با ما'} variant="trust"><ContactPanel cfg={cfg} T={T} lang={lang}/>{/* اصلاح ۵۲: بخش خدمات در ارتباط با ما */}{cfg.servicesVisibility?.contact!==false&&<div style={{marginTop:18}}><h3 style={{color:T.ttl,fontSize:15,margin:'0 0 10px',fontWeight:800}}>{lang==='en'?'Our Services':'خدمات ما'}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>lang==='en'?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list'} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}</PageShell></>
}

