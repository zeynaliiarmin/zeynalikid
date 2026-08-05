// صفحات اطلاعاتی: تجربه والدین / مجوزها / آموزش‌ها / درباره ما / ارتباط با ما
import { useEffect, useMemo, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { isValidMediaUrl } from '../utils/detectCountry';
import { detectVpnOn } from '../utils/vpn';
import MediaCard, { mediaThumb } from '../components/MediaCard';
import { VideoIcon, AudioIcon, PhotoIcon, TextIcon, SearchIcon } from '../components/Icons';
import EduCard from '../components/edu/EduCard';
import ArticleModal from '../components/edu/ArticleModal';
import SmartFAQ from '../components/edu/SmartFAQ';
import { EDU_SAMPLES, FAQ_SAMPLES, type EduItem } from '../components/edu/edu-data';
import '../components/edu/edu.css';
import JsonLd from '../components/JsonLd';
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
 const {cfg,T,lang,setView,showContactOn,ContactPanel,goToAppA}=app;
 const en=lang==='en';
 const [q,setQ]=useState('');
 // Stage 8: فیلتر «نوع محتوا» (نه دسته‌بندی موضوعی — طبق تصمیم پروژه لغو شده)
 const [typeF,setTypeF]=useState<'all'|'text'|'video'|'audio'|'faq'>('all');
 const [sortUI,setSortUI]=useState('new'); // UI مرتب‌سازی — منطق آن در کد نیست (استاتیک)
 const [openItem,setOpenItem]=useState<EduItem|null>(null);
 const real=(cfg.education?.items||[]).filter((x:any)=>x.active!==false);
 const usingSamples=real.length===0;
 const source:any[]=usingSamples?(EDU_SAMPLES as any[]):real;
 const searched=useMemo(()=>{const t=q.trim().toLowerCase();if(!t)return source;return source.filter((x:any)=>[x.title,x.titleEn,x.description,x.desc,x.body,...(x.keywords||[])].filter(Boolean).join(' ').toLowerCase().includes(t))},[q,source]);
 const filtered=useMemo(()=>typeF==='all'||typeF==='faq'?searched:searched.filter((x:any)=>x.type===typeF),[searched,typeF]);
 const suggestedKeywords=useMemo(()=>{const map=new Map<string,number>();source.forEach((x:any)=>(x.keywords||[]).forEach((kw:string)=>{const k=String(kw).trim().toLowerCase();if(k)map.set(k,(map.get(k)||0)+1)}));return Array.from(map.entries()).sort((a,b)=>b[1]-a[1]).slice(0,cfg.suggestedKeywordsCount||8).map(([k])=>k)},[source,cfg.suggestedKeywordsCount]);
 const faqReal=(en?cfg.faqItemsEn:cfg.faqItems)||[];
 const faqItems=faqReal.length?faqReal.map((x:any)=>({id:String(x.id),question:x.question,answer:x.answer})):FAQ_SAMPLES.map(x=>({id:x.id,question:(en&&x.qEn)?x.qEn:x.q,answer:(en&&x.aEn)?x.aEn:x.a}));
 const related=useMemo(()=>openItem?source.filter((x:any)=>x.id!==openItem.id&&x.type===openItem.type).slice(0,3):[],[openItem,source]);
 const consult=()=>{try{goToAppA&&goToAppA()}catch{}};
 const goBack=()=>{try{if(window.history.length>1){window.history.back();return}}catch{} setView('home')};
 const title=en?'Learning & parent companionship':'آموزش و همراهی والدین';
 const introText=en?(cfg.educationIntroTextEn||''):(cfg.educationIntroText||'');
 const showIntro=cfg.pageContentOrder?.education?.showIntro!==false&&!!introText;
 const contactFirst=cfg.pageContentOrder?.education?.order==='contactFirst';
 const IntroBlock=showIntro?<div style={{marginTop:22,padding:'12px 16px',background:T.soft,border:`1px solid ${T.brd}`,borderRadius:14,fontSize:13,color:T.mut,lineHeight:1.9}}>{introText}</div>:null;
 const ContactBlock=showContactOn('education')?<ContactPanel cfg={cfg} T={T} lang={lang}/>:null;
 const chips:[('all'|'text'|'video'|'audio'|'faq'),string,any][]=[
  ['all',en?'All':'همه',null],
  ['text',en?'Articles':'مقاله‌ها',<TextIcon key="t" size={14}/>],
  ['video',en?'Videos':'ویدیوها',<VideoIcon key="v" size={14}/>],
  ['audio',en?'Podcasts':'پادکست‌ها',<AudioIcon key="a" size={14}/>],
  ['faq',en?'FAQ':'پرسش‌های رایج',<SearchIcon key="f" size={14}/>],
 ];
 return (
  <>
     <JsonLd id="ld-edu-faq" data={JSON.stringify({'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqItems.map((it:any)=>({'@type':'Question',name:it.question,acceptedAnswer:{'@type':'Answer',text:it.answer}}))})} />
   <Helmet><title>{en?'Education | Zeynalikid':'آموزش و همراهی والدین | زینالیکید'}</title><meta name="description" content={en?'Articles, videos and podcasts for parents — growth, nutrition, appetite and focus.':'آرشیو مقاله، ویدیو و پادکست تخصصی برای والدین؛ همراهی در مسیر رشد، اشتها، تغذیه و تمرکز.'}/></Helmet>
   <main className="zke-root" dir={en?'ltr':'rtl'}>
    <div className="zke-container">
     <header className="zke-hero"><div className="zke-hero-inner">
      <button type="button" className="zke-back" onClick={goBack}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transform:en?'none':'scaleX(-1)'}}><path d="M19 12H5"/><path d="m11 6-6 6 6 6"/></svg>{en?'Back':'بازگشت'}</button>
      {cfg.storyHighlights?.highlights?.length?<StoryHighlightsBar highlights={cfg.storyHighlights.highlights} T={T} lang={lang}/>:cfg.storyHighlights?.items?.length?<LegacyStoryHighlightsBar items={cfg.storyHighlights.items} T={T} lang={lang}/>:null}
      <h1 className="zke-title">{en?title:<>آموزش و <em>همراهی</em> والدین</>}</h1>
      <p className="zke-sub">{en?'A calm, specialized archive of articles, videos and podcasts to help parents on the path of growth, appetite, nutrition, focus and everyday parenting — gathered from our consultation experience.':'این بخش آرشیو مقاله‌ها، ویدیوها و پادکست‌های تخصصی ماست برای کمک به والدین در مسیر رشد، اشتها، تغذیه، تمرکز و فرزندپروری؛ برگرفته از تجربهٔ مشاوره‌های زینالیکید، با زبانی آرام و علمی.'}</p>
      <div className="zke-notice"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 11v5"/><path d="M12 7.6h.01"/></svg><span>{en?'Content in this section is for general awareness and does not replace specialized consultation.':'محتوای این بخش برای اطلاع‌رسانی عمومی است و جایگزین مشاورهٔ تخصصی نمی‌شود.'}</span></div>
     </div></header>

     <div className="zke-bar">
      <div className="zke-searchrow">
       <div className="zke-search"><SearchIcon size={16}/><input value={q} onChange={e=>setQ(e.target.value)} placeholder={en?'Search articles, videos, podcasts…':'جستجو در مقاله‌ها، ویدیوها و پادکست‌ها…'} aria-label={en?'Search education content':'جستجوی محتوای آموزشی'}/></div>
       <select className="zke-sort" value={sortUI} onChange={e=>setSortUI(e.target.value)} title={en?'Sorting (preview)':'مرتب‌سازی (نمایشی)'} aria-label={en?'Sort':'مرتب‌سازی'}>
        <option value="new">{en?'Newest':'جدیدترین'}</option>
        <option value="seen">{en?'Most viewed':'پربازدیدترین'}</option>
       </select>
      </div>
      <div className="zke-chips" role="tablist" aria-label={en?'Content type filter':'فیلتر نوع محتوا'}>
       {chips.map(([id,label,icon])=><button key={id} type="button" role="tab" aria-selected={typeF===id} className={`zke-chip ${typeF===id?'on':''}`} onClick={()=>setTypeF(id)}>{icon}{label}</button>)}
      </div>
      {!q&&suggestedKeywords.length>0&&<div className="zke-kw">{suggestedKeywords.slice(0,4).map((kw:string)=><button key={kw} type="button" onClick={()=>setQ(kw)}>{kw}</button>)}</div>}
     </div>

     {typeF==='faq'?(
      <section aria-label={en?'Frequently asked questions':'پرسش‌های رایج'}>
       <SmartFAQ items={faqItems} lang={lang} onConsult={consult} q={q} onQ={setQ}/>
      </section>
     ):(
      <>
       {q&&<p style={{fontSize:11.5,color:'var(--zk-text-muted)',margin:'0 0 12px'}}>{en?`${filtered.length} result(s) for "${q}"`:`${filtered.length.toLocaleString('fa-IR')} نتیجه برای «${q}»`}</p>}
       {filtered.length?(
        <div className="zke-grid">{filtered.map((it:any)=><EduCard key={it.id} item={it as EduItem} lang={lang} onOpen={(x)=>setOpenItem(x as EduItem)}/>)}</div>
       ):(
        <div className="zke-empty">
         <SearchIcon size={26}/>
         <p>{en?'No matching content found.':'محتوایی مطابق جستجوی شما پیدا نشد.'}</p>
         <small>{en?'Try other words, or ask your question in a consultation.':'عبارت دیگری را امتحان کنید یا پرسش خود را در مشاوره مطرح کنید.'}</small>
         <button type="button" className="zke-pillbtn" onClick={()=>{setQ('');setTypeF('all')}}>{en?'Clear filters':'حذف فیلترها'}</button>
        </div>
       )}
       {usingSamples&&<p className="zke-sample-note">{en?'A few sample items are shown for preview; real content will be loaded from the admin panel.':'چند محتوای نمونه برای پیش‌نمایش نمایش داده می‌شود؛ محتوای اصلی از پنل مدیریت بارگذاری خواهد شد.'}</p>}
      </>
     )}

     {cfg.servicesVisibility?.trainings!==false&&<div style={{marginTop:26}}><h3 style={{color:T.ttl,fontSize:15,margin:'0 0 10px',fontWeight:800}}>{en?'Our Services':'خدمات ما'}</h3><ServicesSection T={T} lang={lang} publicText={(k:string,fb?:string)=>en?(cfg.translations?.en?.[k]||fb||k):(cfg.translations?.fa?.[k]||fb||k)} mode={cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list'} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></div>}
     {contactFirst?<>{ContactBlock}{IntroBlock}</>:<>{IntroBlock}{ContactBlock}</>}
    </div>
    {openItem&&<ArticleModal item={openItem} related={related} lang={lang} onClose={()=>setOpenItem(null)} onOpen={(x)=>setOpenItem(x as EduItem)} onConsult={consult}/>}
   </main>
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

