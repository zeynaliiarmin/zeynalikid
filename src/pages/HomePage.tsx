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
 const {cfg,T,css,lang,setView,APP_A_URL,publicText,Footer,showContactOn,ContactPanel,referralConsultant,referralTarget,view,consultPulse,startConsult}=app;
 const isRtl=lang==='fa';
 // انیمیشن دکمه «مشاهده دوره‌ها» تا وقتی کاربر وارد روند ثبت‌نام دوره نشده فعال می‌ماند.
 const inCourseFlow = ['child-info','course-shipping','course-payment','course-confirm','course-done'].includes(view);
 const animateCta = !!referralConsultant && !inCourseFlow;
 // وقتی لینک ارجاع حاوی پسوند تب/دوره است، برچسب CTA و مقصد آن را تنظیم می‌کنیم
 const referralTab = referralTarget?.tabCode ? (app.findTabByCode?.(cfg.courseTabs||[], referralTarget.tabCode) || null) : null;
 const isDirectCourse = referralTab && typeof referralTarget?.courseIndex === 'number';
 const directCourseName = (() => {
   if (!isDirectCourse || !referralTab) return '';
   const courses = (referralTab.courses||[]).filter((c:any)=>c.active!==false);
   const target = courses[(referralTarget.courseIndex as number)-1];
   return lang==='en' ? (target?.titleEn||target?.title||referralTab.title) : (target?.title||referralTab.title);
 })();
 const coursesCtaLabel = isDirectCourse
   ? (lang==='en' ? `View & enroll in ${directCourseName}` : `مشاهده و ثبت ${directCourseName}`)
   : referralTab
   ? (lang==='en' ? `View ${referralTab.titleEn||referralTab.title} courses` : `مشاهده دوره‌های ${referralTab.title}`)
   : (lang==='en' ? 'View courses' : 'مشاهده دوره‌ها');
 const coursesCtaTo = '/courses';
 const onCoursesCta = () => {
   // آپدیت لینک ارجاع: رفتن به صفحه معرفی دوره‌ها؛ تب/اسکرول/برجسته‌سازی دوره بر اساس referralTarget در CoursesPage انجام می‌شود.
   setView('courses');
 };
 // پیام شناور زرد برای لینک پایه (فقط کد مشاور)
 const showBaseTip = !!referralConsultant && !referralTab;
 const servicesMode=(cfg.servicesDisplayMode?.home==='carousel'?'carousel':'list') as 'list'|'carousel';
 const shortcutsBase:Record<string,{icon:React.ReactNode;title:string;desc:string;to?:string;fn?:()=>void}>={
  consult:{icon:<ConsultIcon size={24} color={T.acc}/>,title:lang==='en'?'Request consultation':'ثبت درخواست مشاوره',desc:lang==='en'?'A clear first step for your child':'قدم اول برای شناخت بهتر شرایط فرزند',fn:()=>startConsult?.()},
  courses:{icon:<CoursesIcon size={24} color={T.acc}/>,title:referralTab?(isDirectCourse?coursesCtaLabel:`مشاهده دوره‌های ${referralTab.title}`):publicText('menuCourses','معرفی دوره‌ها'),desc:lang==='en'?'View available courses':'مشاهده و ثبت‌نام دوره‌ها',to:referralTab?undefined:'/courses',fn:referralTab?onCoursesCta:undefined},
  experience:{icon:<VideoIcon size={24} color={T.acc}/>,title:lang==='en'?"Parents' experience":'تجربه والدین',desc:lang==='en'?'Stories and answers for parents':'تجربه‌ها و پاسخ‌های والدین',to:'/experience'},
  licenses:{icon:<LicensesIcon size={24} color={T.acc}/>,title:publicText('menuLicenses','مجوزها'),desc:lang==='en'?'Documents and information':'اطلاعات و مستندات مجموعه',to:'/licenses'},
  contact:{icon:<ContactIcon size={24} color={T.acc}/>,title:publicText('menuContact','ارتباط با ما'),desc:lang==='en'?'Contact the support team':'ارتباط با تیم پشتیبانی',to:'/contact'},
 };
 const homeLayout=(cfg.homeLayout&&cfg.homeLayout.length?cfg.homeLayout:[{id:'consult',show:true},{id:'courses',show:true},{id:'experience',show:true},{id:'licenses',show:true},{id:'contact',show:true}]);
 // Phase 8: اگر صفحهٔ مجوزها غیرفعال باشد، میانبر آن در صفحهٔ اصلی هم نمایش داده نشود (داده‌ها حذف نمی‌شوند)
 const showLicensesPage=(cfg.showLicensesPage ?? cfg.menuVisibility?.licenses ?? true)!==false;
 const shortcuts=homeLayout.filter((x:any)=>x.show!==false&&shortcutsBase[x.id]&&(x.id!=='licenses'||showLicensesPage)).map((x:any)=>shortcutsBase[x.id]);
 const heroImage=cfg.images?.hero||{}; const trustBoxImage=cfg.images?.trustBox||{};
 const allCourses:any[]=[];(cfg.courseTabs||[]).forEach((tab:any)=>(tab.courses||[]).forEach((c:any)=>{if(c.active!==false)allCourses.push({...c,tabId:tab.id})}));
 const fc=cfg.featuredCourses||{}; const featuredCourseIds=Array.isArray(fc.courseIds)?fc.courseIds:[];
 const selectedCourses=featuredCourseIds.length>0?allCourses.filter(c=>featuredCourseIds.includes(c.id)):allCourses.slice(0,3); const heroId=fc.heroCourseId||selectedCourses[0]?.id;
 const productsCfg=cfg.products||{};
 const showProductsPage=(productsCfg.showSection ?? cfg.showProductsSection ?? cfg.showProductsPage ?? true)!==false;
 const showFeaturedProducts=(productsCfg.homeFeatured?.enabled ?? productsCfg.showSection ?? cfg.showProductsSection ?? cfg.showProductsPage ?? true)!==false;
 const featuredProducts=(productsCfg.list||productsCfg.items||[])
  .filter((product:any)=>product.isVisible!==false&&product.active!==false&&product.showOnHome!==false)
  .sort((a:any,b:any)=>(a.order||0)-(b.order||0));
 return <main className="zk-home-page" dir={isRtl?'rtl':'ltr'} style={{...app.S?.page,paddingBottom:92,flexDirection:'column',alignItems:'center',background:T.bg,color:T.txt,overflowX:'hidden'}}>
  <Helmet><title>فرزند من | مشاوره رشد قد و تغذیه کودک و نوجوان</title><meta name="description" content="مشاوره و آموزش والدین درباره رشد، تغذیه، اشتها، قد، وزن و تمرکز کودک و نوجوان."/><meta name="keywords" content="رشد قد کودک, تغذیه کودک, بی‌اشتهایی کودک, بدغذایی, مشاوره رشد کودک"/><meta property="og:title" content="فرزند من | رشد و تغذیه کودک و نوجوان"/><meta property="og:description" content="مسیر آرام‌تر و آگاهانه‌تر برای همراهی با رشد و تغذیه فرزند شما"/></Helmet>
  <style>{css}{` .zk-home-page{width:100%;}.zk-home-container{width:100%;max-width:680px;margin-inline:auto;padding-inline:16px}.zk-home-section{width:100%;margin-top:26px}.zk-home-section-title{font-size:20px;color:var(--zk-text-primary);margin:0 0 12px;font-weight:800}.zk-home-section-heading{display:flex;align-items:end;justify-content:space-between;gap:10px;margin-bottom:12px}.zk-home-section-link{color:var(--zk-action-primary);font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap}@media(min-width:481px){.zk-home-container{padding-inline:20px}}`}</style>
  <div className="zk-home-container" style={{paddingTop:8}}>
   {/* در حالت لینک ارجاع، کادر متخصص پیش‌فرض پنهان و فقط کارت مشاور ارجاع‌دهنده نمایش داده می‌شود */}
   {!referralConsultant && (
   <section className="zk-home-specialist-note" style={{display:'flex',flexDirection:isRtl?'row-reverse':'row',alignItems:'center',gap:14,marginBottom:14,padding:'14px 16px',background:'var(--zk-surface)',border:'1px solid var(--zk-border)',borderRadius:'20px',boxShadow:'var(--zk-shadow-light)'}}>
    {cfg.showSpecialistPhoto!==false&&cfg.images?.homeAvatar?.enabled!==false&&<img src={(()=>{const raw=String(cfg.images?.homeAvatar?.url||'/images/specialist/specialist-about.webp').trim(); const ok=raw.startsWith('/images/')||/^https:\/\//i.test(raw); return ok?raw:'/images/specialist/specialist-about.webp';})()} alt={cfg.specialistName||'امیر افرادی'} style={{width:62,height:62,objectFit:'cover',objectPosition:'center 18%',borderRadius:'50%',border:'2px solid var(--zk-primary-light)',flexShrink:0}}/>}
    <div style={{minWidth:0,textAlign:isRtl?'right':'left'}}><strong style={{display:'block',fontSize:14.5,color:'var(--zk-text)',fontWeight:700,lineHeight:1.5}}>{(cfg.siteTitle||'فرزند من')+' — '+(lang==='en'?(cfg.specialistTitleEn||'Child Growth & Nutrition Specialist'):(cfg.specialistTitle||'کارشناس رشد و تغذیه کودک و نوجوان'))}</strong><span style={{fontSize:12,color:'var(--zk-text-muted)',lineHeight:1.6}}>{lang==='en'?'A calmer, evidence-based path for your child’s growth' : 'مسیر آرام و مبتنی بر شواهد برای رشد فرزند شما'}</span></div>
   </section>
   )}

   {/* کارت مشاور ارجاع‌دهنده (وقتی مخاطب با لینک اختصاصی مشاور وارد شده) */}
   {referralConsultant && (
     <section className="zk-home-referral" style={{display:'flex',flexDirection:'row',alignItems:'center',gap:14,marginBottom:14,padding:'14px 16px',background:'#FFF7ED',border:'1px solid #FED7AA',borderRadius:'20px',boxShadow:'var(--zk-shadow-light)',animation:'fadeSlide .6s ease both'}}>
       {referralConsultant.showPhoto!==false && (referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl) ? (
         <img src={referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl} alt={isRtl?referralConsultant.name:referralConsultant.nameEn||referralConsultant.name} style={{width:64,height:64,objectFit:'cover',objectPosition:'center 18%',borderRadius:'50%',border:'2px solid #FB923C',flexShrink:0}} />
       ) : null}
       <div style={{minWidth:0,textAlign:isRtl?'right':'left'}}>
         <span style={{display:'inline-block',fontSize:10.5,fontWeight:800,color:'#C2410C',marginBottom:3}}>{lang==='en'?'You are advised by':'شما توسط این مشاور مشاوره شده‌اید'}</span>
         <strong style={{display:'block',fontSize:15,color:'var(--zk-text)',fontWeight:800,lineHeight:1.4}}>{isRtl?referralConsultant.name:(referralConsultant.nameEn||referralConsultant.name)}</strong>
         {(isRtl?referralConsultant.title:(referralConsultant.titleEn||referralConsultant.title))?<span style={{display:'block',fontSize:12,color:'var(--zk-text-muted)',lineHeight:1.5,marginTop:2}}>{isRtl?referralConsultant.title:(referralConsultant.titleEn||referralConsultant.title)}</span>:null}
         {(isRtl?referralConsultant.introText||referralConsultant.desc:(referralConsultant.introTextEn||referralConsultant.descEn||referralConsultant.introText||referralConsultant.desc))?<span style={{display:'block',fontSize:12.5,color:'var(--zk-text-muted)',lineHeight:1.8,marginTop:6}}>{(isRtl?referralConsultant.introText||referralConsultant.desc:(referralConsultant.introTextEn||referralConsultant.descEn||referralConsultant.introText||referralConsultant.desc))}</span>:null}
       </div>
     </section>
   )}

   {!referralConsultant && heroImage.enabled!==false&&<HeroSection title={lang==='en'?(cfg.heroTitleEn||cfg.heroTitle||'A clearer path for your child’s growth'):(cfg.heroTitle||'مسیر روشن‌تری برای رشد فرزند شما')} subtitle={lang==='en'?(cfg.heroSubtitleEn||cfg.heroSubtitle||'Understand growth, nutrition and daily needs with calm, expert guidance.'):(cfg.heroSubtitle||'با شناخت بهتر رشد، تغذیه و نیازهای روزانه، آگاهانه‌تر کنار فرزندتان باشید.')} imageUrl={heroImage.url||'/images/asset13c-hero-mother-child.webp'} imageAlt={heroImage.alt||'کودک شاد و سالم'} imageAspect={heroImage.aspectRatio} imagePosition={heroImage.objectPosition} ctaText={lang==='en'?'Request consultation':'ثبت درخواست مشاوره'} ctaLink="/form" onCtaClick={()=>startConsult?.()} secondaryCtaText={coursesCtaLabel} secondaryCtaLink={coursesCtaTo||undefined} onSecondaryClick={coursesCtaTo?undefined:onCoursesCta} T={T} lang={lang} animateCoursesCta={animateCta} animateConsultCta={!!consultPulse}/>}

   {/* وقتی لینک ارجاع پایه است، یک باکس شناور زرد برای راهنمایی والد نمایش می‌دهیم */}
   {showBaseTip && (
     <section style={{marginBottom:16,padding:'14px 16px',background:'#FEF9C3',border:'1.5px solid #FACC15',borderRadius:18,boxShadow:'0 8px 24px rgba(250,204,21,0.18)',fontSize:13.5,lineHeight:1.9,color:'#713F12',fontWeight:700}}>
       <div style={{marginBottom:10}}>
         {(cfg.referral?.texts?.homeBase || (lang==='en'
           ? 'Dear parent, to improve your child’s condition, tap on a topic such as Height growth, Poor appetite, or Mind & focus to compare courses and choose the best one.'
           : 'والد عزیز، برای بهبود و درمان مشکل فرزندتان روی یکی از بخش‌های رشد قد، بی‌اشتهایی یا هوش و ذهن ضربه بزنید تا دوره‌ها را باهم مقایسه کنید و بهترین انتخاب را داشته باشید.'))}
       </div>
       <button type="button" onClick={onCoursesCta} style={{width:'100%',minHeight:52,padding:'12px 18px',borderRadius:999,background:'var(--zk-primary)',color:'#fff',border:0,fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:'inherit',animation:'zk-hero-pulse 1.6s ease-in-out infinite'}}>
         {lang==='en' ? 'View & browse courses' : 'مشاهده و معرفی دوره‌ها'}
       </button>
     </section>
   )}

   {/* وقتی لینک ارجاع روی یک تب خاص است، CTA برجسته برای آن تب */}
   {referralTab && !isDirectCourse && (
     <section style={{marginBottom:16,padding:'14px 16px',background:'#FEF9C3',border:'1.5px solid #FACC15',borderRadius:18,boxShadow:'0 8px 24px rgba(250,204,21,0.18)'}}>
       <div style={{fontSize:13,lineHeight:1.9,color:'#713F12',fontWeight:700,marginBottom:10}}>
         {(cfg.referral?.texts?.homeTab || (lang==='en'
           ? `Tap the button below to compare ${referralTab.titleEn||referralTab.title} courses side by side and pick the best match for your child.`
           : `با زدن دکمهٔ زیر می‌توانید دوره‌های ${referralTab.title} را با هم مقایسه کنید و بهترین گزینه را برای فرزندتان انتخاب کنید.`))}
       </div>
       <button type="button" onClick={onCoursesCta} style={{width:'100%',minHeight:52,padding:'12px 18px',borderRadius:999,background:'var(--zk-primary)',color:'#fff',border:0,fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:'inherit',animation:'zk-hero-pulse 1.6s ease-in-out infinite'}}>
         {coursesCtaLabel}
       </button>
     </section>
   )}

   {/* وقتی لینک ارجاع مستقیم به یک دوره است */}
   {isDirectCourse && referralTab && (() => {
     const courses = (referralTab.courses||[]).filter((c:any)=>c.active!==false);
     const target = courses[(referralTarget.courseIndex as number)-1];
     const cname = lang==='en' ? (target?.titleEn||target?.title||referralTab.title) : (target?.title||referralTab.title);
     return (
       <section style={{marginBottom:16,padding:'14px 16px',background:'#FEF9C3',border:'1.5px solid #FACC15',borderRadius:18,boxShadow:'0 8px 24px rgba(250,204,21,0.18)'}}>
         <div style={{fontSize:13,lineHeight:1.9,color:'#713F12',fontWeight:700,marginBottom:10}}>
           {(cfg.referral?.texts?.homeCourse || (lang==='en'
             ? `Tap the button below to see the details and register "${cname}".`
             : `با زدن دکمهٔ زیر می‌توانید جزئیات «${cname}» را ببینید و همان دوره را ثبت کنید.`))}
         </div>
         <button type="button" onClick={onCoursesCta} style={{width:'100%',minHeight:54,padding:'12px 18px',borderRadius:999,background:'var(--zk-primary)',color:'#fff',border:0,fontWeight:800,fontSize:15,cursor:'pointer',fontFamily:'inherit',animation:'zk-hero-pulse 1.6s ease-in-out infinite'}}>
           {coursesCtaLabel}
         </button>
       </section>
     );
   })()}

   {trustBoxImage.enabled!==false&&(cfg.trustBoxes?.sentences?.health?.length>0 || cfg.trustMessages?.health?.length>0)&&<section className="zk-home-section" style={{marginTop:0}}><TrustBoxWithImage text={lang==='en' ? (cfg.trustBoxes?.sentences?.health?.[0]?.titleEn || cfg.trustBoxes?.sentences?.health?.[0]?.title || cfg.trustMessages.health[0]?.title || '') : (cfg.trustBoxes?.sentences?.health?.[0]?.title || cfg.trustMessages.health[0]?.title || '')} imageUrl={trustBoxImage.url || '/images/asset13c-trust-parent-care.webp'} imageAlt={trustBoxImage.alt||'مادر و کودک'} imagePosition={isRtl?'right':'left'} imageAspect={trustBoxImage.aspectRatio} imageObjectPosition={trustBoxImage.objectPosition} T={T}/></section>}

   {shortcuts.length>0&&<section className="zk-home-section" aria-label={lang==='en'?'Quick access':'دسترسی سریع'}><div className="zk-home-section-heading"><h2 className="zk-home-section-title" style={{margin:0}}>{lang==='en'?'Quick access':'دسترسی سریع'}</h2></div><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:10}}>{shortcuts.map((item:any,i:number)=>{const Comp:any=item.to?Link:'button';const props=item.to?{to:item.to}:{onClick:item.fn,type:'button'};const wide=shortcuts.length%2===1&&i===shortcuts.length-1;const pulseItem=!!consultPulse&&item.title===(lang==='en'?'Request consultation':'ثبت درخواست مشاوره');return <Comp key={item.title} {...props} style={{gridColumn:wide?'1/-1':undefined,display:'flex',alignItems:'center',gap:10,minHeight:78,padding:'11px 12px',background:T.card,border:`1px solid ${T.brd}`,borderRadius:16,boxShadow:T.neuOut,color:T.txt,textDecoration:'none',fontFamily:'inherit',textAlign:isRtl?'right':'left',cursor:'pointer',animation:pulseItem?'zk-hero-pulse 1.6s ease-in-out infinite':undefined}}><span style={{display:'flex',alignItems:'center',justifyContent:'center',width:42,height:42,borderRadius:12,background:T.soft,flexShrink:0}}>{item.icon}</span><span style={{minWidth:0}}><strong style={{display:'block',fontSize:12.5,lineHeight:1.6}}>{item.title}</strong><small style={{display:'block',fontSize:10.5,color:T.mut,lineHeight:1.6}}>{item.desc}</small></span></Comp>})}</div></section>}

   {cfg.trustBoxes?.enabled!==false&&cfg.trustBoxes?.home?.enabled!==false&&<section className="zk-home-section"><TrustBoxNew sentences={cfg.trustBoxes?.sentences?.health||[]} interval={cfg.trustBoxes?.home?.interval||cfg.trustBoxes?.defaultInterval||8} T={T} design="classic" lang={lang}/></section>}

   {fc.enabled!==false&&selectedCourses.length>0&&<section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{lang==='en'?(fc.titleEn||'Featured courses'):(fc.title||'دوره‌های منتخب')}</h2><Link className="zk-home-section-link" to="/courses">{lang==='en'?'View all':'مشاهده همه'}</Link></div><FeaturedCourses courses={selectedCourses} heroCourseId={heroId} title="" T={T} lang={lang} showStock={fc.showStock!==false} showDiscount={fc.showDiscount!==false}/></section>}

   {/* محصولات منتخب خانه: نمایش کل بخش، انتخاب موارد و عکس مستقل هر مورد از پنل محصولات کنترل می‌شود. */}
   {showFeaturedProducts && featuredProducts.length>0 && (
     <section className="zk-home-section" data-home-section="featured-products">
       <div className="zk-home-section-heading">
         <h2 className="zk-home-section-title">{lang==='en' ? 'Featured Products & Plans' : 'محصولات و برنامه‌های منتخب'}</h2>
         {showProductsPage&&<Link className="zk-home-section-link" to="/products">{lang==='en'?'View all':'مشاهده همه'}</Link>}
       </div>

       {/* Desktop grid */}
       <div className="featured-products-desktop" style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
         {featuredProducts.map((p:any)=>(
           <ProductCard key={p.id} product={p} size="normal" imageVariant="home" T={T} lang={lang} onProductClick={()=>{window.location.href=showProductsPage?'/products':'/form'}} />
         ))}
       </div>

       {/* Mobile horizontal swipe — تمام مواردی که ادمین برای خانه انتخاب کرده است */}
       <div className="featured-products-mobile" style={{ display: 'none' }}>
         <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12, scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}>
           {featuredProducts.map((p:any)=>(
             <div key={p.id} style={{ flex: '0 0 82%', scrollSnapAlign: 'start', minWidth: 260 }}>
               <ProductCard product={p} size="normal" imageVariant="home" T={T} lang={lang} onProductClick={()=>{window.location.href=showProductsPage?'/products':'/form'}} />
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
   <Footer cfg={cfg} T={T} lang={lang} setView={setView} referralConsultant={referralConsultant} requestConsult={()=>app.requestConsult?.()} onStartConsult={()=>app.startConsult?.()} />
   <InstallPrompt lang={lang}/>
  </div>
 </main>;
}

function FAQSection({app}:{app:any}){
 const {cfg,T,lang,setView}=app; const [openIndex,setOpenIndex]=useState<number|null>(null); const [askOpen,setAskOpen]=useState(false); const items=((lang==='fa'?cfg.faqItems:cfg.faqItemsEn)||[]).filter((item:any)=>!Array.isArray(item.placements)||item.placements.includes('home')); if(cfg.faqDisplay?.home?.show===false||!items.length)return null; const maxItems=cfg.faqDisplay?.home?.maxItems||4; const shown=items.slice(0,maxItems);
 return <section className="zk-home-section"><div className="zk-home-section-heading"><h2 className="zk-home-section-title">{lang==='fa'?'سوالات متداول':'Frequently asked questions'}</h2><Link className="zk-home-section-link" to="/faq">{lang==='fa'?'همه سوالات':'All questions'}</Link></div><div style={{display:'flex',flexDirection:'column',gap:8}}>{shown.map((item:any,index:number)=><div key={item.id||index} style={{background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden'}}><button type="button" onClick={()=>setOpenIndex(openIndex===index?null:index)} aria-expanded={openIndex===index} style={{width:'100%',minHeight:52,padding:'12px 14px',background:'transparent',border:0,cursor:'pointer',display:'flex',justifyContent:'space-between',alignItems:'center',fontFamily:'inherit',fontSize:13,fontWeight:700,color:T.txt,textAlign:'start'}}><span style={{minWidth:0}}>{item.question}</span><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{flexShrink:0,marginInlineStart:10,transition:'transform .2s ease',transform:openIndex===index?'rotate(180deg)':'none'}}><polyline points="6 9 12 15 18 9"/></svg></button>{openIndex===index&&<div style={{padding:'0 14px 14px',fontSize:12.5,color:T.mut,lineHeight:1.9,borderTop:`1px solid ${T.brd}`,paddingTop:10}}>{item.answerTitle?<div style={{fontWeight:800,color:T.acc,fontSize:12,marginBottom:5}}>{item.answerTitle}</div>:null}{item.answer}</div>}</div>)}</div>{cfg.faqDisplay?.home?.viewAllLink!==false&&items.length>maxItems&&<button type="button" onClick={()=>setView('faq')} style={{display:'block',margin:'12px auto 0',minHeight:44,padding:'9px 18px',borderRadius:12,border:`1px solid ${T.brd}`,background:T.soft,color:T.acc,cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700}}>{lang==='fa'?'مشاهده همه سوالات':'View all questions'}</button>}<div style={{display:'flex',justifyContent:'center',marginTop:14}}><button type="button" onClick={()=>setAskOpen(true)} style={{minHeight:44,padding:'10px 20px',borderRadius:T.btnRadius||12,background:T.soft,color:T.acc,border:`1px solid ${T.brd}`,fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',display:'inline-flex',alignItems:'center',gap:8}}><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg><span>{lang==='fa'?'سوال دارید؟ بپرسید':'Have a question? Ask us'}</span></button></div><DailyTipBar cfg={cfg} T={T} lang={lang} />
{askOpen&&<AskQuestionForm T={T} lang={lang} pageSource="home" countries={cfg.countryCodes} onClose={()=>setAskOpen(false)} onSubmit={async(q,v,phone)=>{await submitUserQuestion(q,v,'home',phone);}}/>}</section>;
}
