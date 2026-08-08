import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Link } from 'react-router-dom';
import InstallPrompt from '../components/InstallPrompt';
import { ConsultIcon, CoursesIcon, VideoIcon, LicensesIcon, ContactIcon } from '../components/Icons';
import ServicesSection from '../components/ServicesSection';
import AskQuestionForm from '../components/AskQuestionForm';
import DailyTipBar from '../components/DailyTipBar';
import { submitUserQuestion } from '../lib/supabase';
import FeaturedCourses from '../components/FeaturedCourses';
import TaggedCoursesSection from '../components/TaggedCoursesSection';
import HeroSection from '../components/HeroSection';
import TrustBoxWithImage from '../components/TrustBoxWithImage';
import TrustBoxNew from '../components/TrustBoxNew';
import ProductCard from '../components/ProductCard';

export default function HomePage({app}:{app:any}){
 const {cfg,T,css,lang,setView,APP_A_URL,publicText,Footer,showContactOn,ContactPanel}=app;
 const isRtl=lang==='fa';
 const servicesMode=(cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list') as 'list'|'carousel';
 const shortcutsBase:Record<string,{icon:React.ReactNode;title:string;desc:string;to?:string;fn?:()=>void}>={
  consult:{icon:<ConsultIcon size={24} color={T.acc}/>,title:lang==='en'?'Request consultation':'ثبت درخواست مشاوره',desc:lang==='en'?'A clear first step for your child':'قدم اول برای شناخت بهتر شرایط فرزند',fn:()=>{window.location.href=APP_A_URL}},
  courses:{icon:<CoursesIcon size={24} color={T.acc}/>,title:publicText('menuCourses','معرفی دوره‌ها'),desc:lang==='en'?'View available courses':'مشاهده و ثبت‌نام دوره‌ها',to:'/courses'},
  experience:{icon:<VideoIcon size={24} color={T.acc}/>,title:lang==='en'?"Parents' experience":'تجربه والدین',desc:lang==='en'?'Stories and answers for parents':'تجربه‌ها و پاسخ‌های والدین',to:'/experience'},
  licenses:{icon:<LicensesIcon size={24} color={T.acc}/>,title:publicText('menuLicenses','مجوزها'),desc:lang==='en'?'Documents and information':'اطلاعات و مستندات مجموعه',to:'/licenses'},
  contact:{icon:<ContactIcon size={24} color={T.acc}/>,title:publicText('menuContact','ارتباط با ما'),desc:lang==='en'?'Contact the support team':'ارتباط با تیم پشتیبانی',to:'/contact'},
 };
 const homeLayout=(cfg.homeLayout&&cfg.homeLayout.length?cfg.homeLayout:[{id:'consult',show:true},{id:'courses',show:true},{id:'experience',show:true},{id:'licenses',show:true},{id:'contact',show:true}]);
 const shortcuts=homeLayout.filter((x:any)=>x.show!==false&&shortcutsBase[x.id]).map((x:any)=>shortcutsBase[x.id]);
 const heroImage=cfg.images?.hero||{}; const trustBoxImage=cfg.images?.trustBox||{};
 const allCourses:any[]=[];(cfg.courseTabs||[]).forEach((tab:any)=>(tab.courses||[]).forEach((c:any)=>{if(c.active!==false)allCourses.push({...c,tabId:tab.id})}));
 const fc=cfg.featuredCourses||{}; const featuredCourseIds=Array.isArray(fc.courseIds)?fc.courseIds:[];
 const selectedCourses=featuredCourseIds.length>0?allCourses.filter(c=>featuredCourseIds.includes(c.id)):allCourses.slice(0,3); const heroId=fc.heroCourseId||selectedCourses[0]?.id;
 return <main className="zk-home-page" dir={isRtl?'rtl':'ltr'} style={{...app.S?.page,paddingBottom:92,flexDirection:'column',alignItems:'center',background:T.bg,color:T.txt,overflowX:'hidden'}}>
  <Helmet><title>زینالیکید | مشاوره رشد قد و تغذیه کودک و نوجوان</title><meta name="description" content="مشاوره و آموزش والدین درباره رشد، تغذیه، اشتها، قد، وزن و تمرکز کودک و نوجوان."/><meta name="keywords" content="رشد قد کودک, تغذیه کودک, بی‌اشتهایی کودک, بدغذایی, مشاوره رشد کودک"/><meta property="og:title" content="زینالیکید | رشد و تغذیه کودک و نوجوان"/><meta property="og:description" content="مسیر آرام‌تر و آگاهانه‌تر برای همراهی با رشد و تغذیه فرزند شما"/></Helmet>
  <style>{css}{` .zk-home-page{width:100%;}.zk-home-container{width:100%;max-width:680px;margin-inline:auto;padding-inline:16px}.zk-home-section{width:100%;margin-top:26px}.zk-home-section-title{font-size:20px;color:var(--zk-text-primary);margin:0 0 12px;font-weight:800}.zk-home-section-heading{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:12px}.zk-home-section-link{color:var(--zk-action-primary);font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}@media(min-width:481px){.zk-home-container{padding-inline:20px}}`}</style>
  <div className="zk-home-container" style={{paddingTop:8}}>
   <section className="zk-home-specialist-note" style={{display:'flex',flexDirection:isRtl?'row-reverse':'row',alignItems:'center',gap:14,marginBottom:14,padding:'14px 16px',background:'var(--zk-surface)',border:'1px solid var(--zk-border)',borderRadius:'20px',boxShadow:'var(--zk-shadow-light)'}}>
    {cfg.showSpecialistPhoto&&<img src={'/images/specialist/specialist-about.webp'} alt={cfg.specialistName||'آرمین زینالی'} style={{width:62,height:62,objectFit:'cover',borderRadius:'50%',border:'2px solid var(--zk-primary-light)',flexShrink:0}}/>}
    <div style={{minWidth:0,textAlign:isRtl?'right':'left'}}><strong style={{display:'block',fontSize:14.5,color:'var(--zk-text)',fontWeight:700,lineHeight:1.5}}>{(cfg.siteTitle||'زینالیکید')+' — '+(lang==='en'?(cfg.specialistTitleEn||'Child Growth & Nutrition Specialist'):(cfg.specialistTitle||'کارشناس رشد و تغذیه کودک و نوجوان'))}</strong><span style={{fontSize:12,color:'var(--zk-text-muted)',lineHeight:1.6}}>{lang==='en'?'A calmer, evidence-based path for your child’s growth' : 'مسیر آرام و مبتنی بر شواهد برای رشد فرزند شما'}</span></div>
   </section>

   {heroImage.enabled!==false&&<HeroSection title={lang==='en'?(cfg.heroTitleEn||cfg.heroTitle||'A clearer path for your child’s growth'):(cfg.heroTitle||'مسیر روشن‌تری برای رشد فرزند شما')} subtitle={lang==='en'?(cfg.heroSubtitleEn||cfg.heroSubtitle||'Understand growth, nutrition and daily needs with calm, expert guidance.'):(cfg.heroSubtitle||'با شناخت بهتر رشد، تغذیه و نیازهای روزانه، آگاهانه‌تر کنار فرزندتان باشید.')} imageUrl={heroImage.url||'/images/hero-default.webp'} imageAlt={heroImage.alt||'کودک شاد و سالم'} ctaText={lang==='en'?'Request consultation':'ثبت درخواست مشاوره'} ctaLink={APP_A_URL} secondaryCtaText={lang==='en'?'View courses':'مشاهده دوره‌ها'} secondaryCtaLink="/courses" T={T} lang={lang}/>}

   {trustBoxImage.enabled!==false&&(cfg.trustBoxes?.sentences?.health?.length>0 || cfg.trustMessages?.health?.length>0)&&<section className="zk-home-section" style={{marginTop:0}}><TrustBoxWithImage text={lang==='en' ? (cfg.trustBoxes?.sentences?.health?.[0]?.titleEn || cfg.trustBoxes?.sentences?.health?.[0]?.title || cfg.trustMessages.health[0]?.title || '') : (cfg.trustBoxes?.sentences?.health?.[0]?.title || cfg.trustMessages.health[0]?.title || '')} imageUrl={'/images/asset13c-trust-parent-care.webp'} imageAlt={trustBoxImage.alt||'مادر و کودک'} imagePosition={isRtl?'right':'left'} T={T}/></section>}

   {shortcuts.length>0&&<section className="zk-home-section" aria-label={lang==='en'?'Quick access':'دسترسی سریع'}><div className="zk-home-section-heading"><h2 className="zk-home-section-title" style={{margin:0}}>{lang==='en'?'Quick access':'دسترسی سریع'}</h2></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{shortcuts.map((item:any,i:number)=>{const Comp:any=item.to?Link:'button';const props=item.to?{to:item.to}:{onClick:item.fn,type:'button'};const wide=shortcuts.length%2===1&&i===shortcuts.length-1;return <Comp key={item.title} {...props} style={{gridColumn:wide?'1/-1':undefined,display:'flex',alignItems:'center',gap:10,minHeight:78,padding:'11px 12px',background:T.card,border:`1px solid ${T.brd}`,borderRadius:16,boxShadow:T.neuOut,color:T.txt,textDecoration:'none',fontFamily:'inherit',textAlign:isRtl?'right':'left',cursor:'pointer'}}><span style={{display:'flex',alignItems:'center',justifyContent:'center',width:42,height:42,borderRadius:12,background:T.soft,flexShrink:0}}>{item.icon}</span><span style={{minWidth:0}}><strong style={{display:'block',fontSize:12.5,lineHeight:1.6}}>{item.title}</strong><small style={{display:'block',fontSize:10.5,color:T.mut,lineHeight:1.6}}>{item.desc}</small></span></Comp>})}</div></section>}

   {cfg.trustBoxes?.enabled!==false&&cfg.trustBoxes?.home?.enabled!==false&&<section className="zk-home-section"><TrustBoxNew sentences={cfg.trustBoxes?.sentences?.health||[]} interval={cfg.trustBoxes?.home?.interval||cfg.trustBoxes?.defaultInterval||8} T={T} design="classic" lang={lang}/></section>}

   {fc.enabled!==false&&selectedCourses.length>0&&<section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{lang==='en'?(fc.titleEn||'Featured courses'):(fc.title||'دوره‌های منتخب')}</h2><Link className="zk-home-section-link" to="/courses">{lang==='en'?'View all':'مشاهده همه'}</Link></div><FeaturedCourses courses={selectedCourses} heroCourseId={heroId} title="" T={T} lang={lang} showStock={fc.showStock!==false} showDiscount={fc.showDiscount!==false}/></section>}

   {/* Stage 3: Featured Products — mobile horizontal swipe (exact pattern as FeaturedCourses) */}
   {(cfg.products?.showSection ?? true) && ((cfg.products?.list || cfg.products?.items)?.length > 0) && (
     <section className="zk-home-section">
       <div className="zk-home-section-heading">
         <h2 className="zk-home-section-title">{lang==='en' ? 'Featured Products & Plans' : 'محصولات و برنامه‌های منتخب'}</h2>
         <Link className="zk-home-section-link" to="/products">{lang==='en'?'View all':'مشاهده همه'}</Link>
       </div>

       {/* Desktop grid */}
       <div className="featured-products-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
         {(cfg.products?.list || cfg.products?.items || []).slice(0, 3).map((p: any) => (
           <ProductCard key={p.id} product={p} size="normal" T={T} lang={lang} onProductClick={() => window.location.href = '/products'} />
         ))}
       </div>

       {/* Mobile horizontal swipe — full FeaturedCourses-style (82% width + snap) */}
       <div className="featured-products-mobile" style={{ display: 'none' }}>
         <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
           {(cfg.products?.list || cfg.products?.items || []).slice(0, 4).map((p: any) => (
             <div key={p.id} style={{ flex: '0 0 82%', scrollSnapAlign: 'start', minWidth: 260 }}>
               <ProductCard product={p} size="normal" T={T} lang={lang} onProductClick={() => window.location.href = '/products'} />
             </div>
           ))}
         </div>
       </div>

       <style>{}</style>
     </section>
   )}

   {cfg.servicesVisibility?.home!==false&&<section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{publicText('ourServicesTitle','خدمات ما')}</h2></div><ServicesSection T={T} lang={lang} publicText={publicText} mode={servicesMode} listItems={cfg.listSettings?.items||[]} carouselSettings={cfg.carouselSettings||{columns:2,autoScrollInterval:8,autoScrollEnabled:true,pauseOnSwipe:3,columnsData:[]}}/></section>}

   {/* Stage 1: 5 Main Topic Cards (Growth / Appetite / Nutrition / Focus / Parenting) — New dedicated grid */}
   <section className="zk-home-section" style={{marginTop: '26px'}}>
     <div className="zk-home-section-heading">
       <h2 className="zk-home-section-title">{lang==='en' ? 'Core Areas' : 'حوزه‌های اصلی'}</h2>
     </div>
     <div style={{display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(148px, 1fr))', gap:'12px'}}>
       {[
         {key:'growth', title: lang==='en'?'Growth & Height':'رشد قد و وزن', img:'/images/asset13c-topic-growth.webp', desc: lang==='en'?'Evidence-based tracking':'پیگیری مبتنی بر شواهد'},
         {key:'appetite', title: lang==='en'?'Appetite & Nutrition':'اشتها و تغذیه', img:'/images/asset13c-topic-appetite.webp', desc: lang==='en'?'Personalized plans':'برنامه‌های شخصی'},
         {key:'focus', title: lang==='en'?'Focus & Mind':'تمرکز و ذهن', img:'/images/asset13c-topic-focus.webp', desc: lang==='en'?'Daily support':'حمایت روزانه'},
         {key:'parenting', title: lang==='en'?'Parenting Guidance':'راهنمای والدین', img:'/images/asset13c-trust-parent-care.webp', desc: lang==='en'?'Expert accompaniment':'همراهی تخصصی'},
         {key:'nutrition', title: lang==='en'?'Personalized Plans':'برنامه‌های شخصی', img:'/images/product-personalized-plan.webp', desc: lang==='en'?'Tailored for your child':'متناسب با فرزند شما'}
       ].map((t,i)=>(
         <div key={i} className="zk-card" style={{padding:'14px 12px', borderRadius:'20px', textAlign:'center', display:'flex', flexDirection:'column', gap:'6px'}}>
           <img src={t.img} alt={t.title} style={{width:'100%', height:96, objectFit:'cover', borderRadius:14, marginBottom:4}} onError={(e:any)=>{e.currentTarget.src='/images/asset13c-topic-growth.webp'}} />
           <div style={{fontSize:13.5, fontWeight:700, color:'var(--zk-text)', lineHeight:1.3}}>{t.title}</div>
           <div style={{fontSize:11, color:'var(--zk-text-muted)', lineHeight:1.4}}>{t.desc}</div>
         </div>
       ))}
     </div>
   </section>

   {cfg.taggedCourses?.enabled!==false&&<section className="zk-home-section"><TaggedCoursesSection courses={(cfg.courseTabs||[]).flatMap((tab:any)=>(tab.courses||[]).map((c:any)=>({...c,tabId:tab.id})))} title={cfg.taggedCourses?.title||'پرفروش‌ترین دوره‌ها'} titleEn={cfg.taggedCourses?.titleEn||'Popular courses'} tags={cfg.taggedCourses?.tags||['پرفروش','پرطرفدار','محبوب']} maxCourses={cfg.taggedCourses?.maxCourses||6} lang={lang} T={T}/></section>}

   <section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{lang==='en'?'For parents':'برای والدین'}</h2><Link className="zk-home-section-link" to="/education">{lang==='en'?'Explore education':'مشاهده آموزش‌ها'}</Link></div><div style={{padding:'15px 16px',borderRadius:16,background:'var(--zk-surface-muted)',border:'1px solid var(--zk-border)',color:'var(--zk-text)',fontSize:13,lineHeight:1.9}}>{lang==='en'?'Articles, videos and podcasts to answer parents’ questions about growth, nutrition, appetite and focus.':'مقاله‌ها، ویدیوها و پادکست‌هایی برای پاسخ به پرسش‌های والدین درباره رشد، تغذیه، اشتها و تمرکز.'}</div></section>

   {/* Stage 1: Testimonials / Parent experiences — clean, minimal, no emoji */}
   <section className="zk-home-section">
     <div className="zk-home-section-heading">
       <h2 className="zk-home-section-title">{lang==='en' ? 'Parents’ experience' : 'تجربه والدین'}</h2>
     </div>
     <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(260px,1fr))',gap:'12px'}}>
       {[
         {quote: lang==='en' ? 'The guidance was calm and practical. My son’s appetite improved noticeably.' : 'راهنمایی آرام و کاربردی بود. اشتهای پسرم به طور محسوس بهتر شد.', parent: lang==='en' ? 'Mother of 5-year-old' : 'مادر پسر ۵ ساله'},
         {quote: lang==='en' ? 'We finally have a clear path for height tracking without stress.' : 'بالاخره مسیر روشنی برای پیگیری قد بدون استرس داریم.', parent: lang==='en' ? 'Mother of 9-year-old' : 'مادر دختر ۹ ساله'}
       ].map((t,i) => (
         <div key={i} className="zk-card" style={{padding:'16px 15px', borderRadius:18}}>
           <p style={{fontSize:13.5, lineHeight:1.65, color:'var(--zk-text)', margin:'0 0 10px'}}>“{t.quote}”</p>
           <div style={{fontSize:11.5, color:'var(--zk-text-muted)', fontWeight:600}}>{t.parent}</div>
         </div>
       ))}
     </div>
   </section>

   {cfg.pageContentOrder?.home?.order==='contactFirst'
    ? <>{showContactOn('home')&&<section className="zk-home-section"><ContactPanel cfg={cfg} T={T} lang={lang}/></section>}{cfg.pageContentOrder?.home?.showIntro!==false&&<FAQSection app={app}/>}</>
    : <>{cfg.pageContentOrder?.home?.showIntro!==false&&<FAQSection app={app}/>} {showContactOn('home')&&<section className="zk-home-section"><ContactPanel cfg={cfg} T={T} lang={lang}/></section>}</>}
   <Footer cfg={cfg} T={T} lang={lang} setView={setView}/>
   <InstallPrompt lang={lang}/>
  </div>
 </main>;
}

function FAQSection({app}:{app:any}){
 const {cfg,T,lang,setView}=app; const [openIndex,setOpenIndex]=useState<number|null>(null); const [askOpen,setAskOpen]=useState(false); const items=(lang==='fa'?cfg.faqItems:cfg.faqItemsEn)||[]; if(cfg.faqDisplay?.home?.show===false||!items.length)return null; const maxItems=cfg.faqDisplay?.home?.maxItems||4; const shown=items.slice(0,maxItems);
 return <section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{lang==='fa'?'سوالات متداول':'Frequently asked questions'}</h2><Link className="zk-home-section-link" to="/faq">{lang==='fa'?'همه سوالات':'All questions'}</Link></div><div style={{display:'flex',flexDirection:'column',gap:8}}>{shown.map((item:any,index:number)=><div key={item.id||index} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden'}}><button type="button" onClick={()=>setOpenIndex(openIndex===index?null:index)} aria-expanded={openIndex===index} style={{width:'100%',minHeight:52,padding:'12px 14px',background:'transparent',border:0,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit',fontSize:13,fontWeight:700,color:T.txt,textAlign:'start'}}><span style={{minWidth:0}}>{item.question}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginInlineStart:10,transition:'transform .2s ease',transform:openIndex===index?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg></button>{openIndex===index&&<div style={{padding:'0 14px 14px',fontSize:12.5,color:T.mut,lineHeight:1.9,borderTop:`1px solid ${T.brd}`,paddingTop:10}}>{item.answer}</div>}</div>)}</div>{cfg.faqDisplay?.home?.viewAllLink!==false&&items.length>maxItems&&<button type="button" onClick={()=>setView('faq')} style={{display:'block',margin:'12px auto 0',minHeight:44,padding:'9px 18px',borderRadius:12,border:`1px solid ${T.brd}`,background:T.soft,color:T.acc,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>{lang==='fa'?'مشاهده همه سوالات':'View all questions'}</button>}<div style={{display:'flex',justifyContent:'center',marginTop:14}}><button type="button" onClick={()=>setAskOpen(true)} style={{minHeight:44,padding:'10px 20px',borderRadius:T.btnRadius||12,background:T.soft,color:T.acc,border:`1px solid ${T.brd}`,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:8}}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>{lang==='fa'?'سوال دارید؟ بپرسید':'Have a question? Ask us'}</span></button></div><DailyTipBar cfg={cfg} T={T} lang={lang} />
{askOpen&&<AskQuestionForm T={T} lang={lang} pageSource="home" countries={cfg.countryCodes} onClose={()=>setAskOpen(false)} onSubmit={async(q,v,phone)=>{await submitUserQuestion(q,v,'home',phone);}}/>}</section>;
}
