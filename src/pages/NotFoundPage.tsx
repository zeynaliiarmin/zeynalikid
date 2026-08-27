import {Helmet} from 'react-helmet-async';
import type {CSSProperties,ReactNode} from 'react';
import {useAppContext} from '../app/AppContext';
import {ConsultIcon,CoursesIcon,VideoIcon,LicensesIcon,EducationIcon,ContactIcon,HomeIcon} from '../components/Icons';
import './not-found-page.css';

type Shortcut={title:string;aria:string;icon:ReactNode;tone:string;run:()=>void};
type NotFoundVars=CSSProperties&Record<`--nf-${string}`,string>;

function ArrowBackIcon(){return <svg aria-hidden="true" viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5"/><path d="m11 18-6-6 6-6"/></svg>}
function MemphisArtwork(){return <div className="zk-nf-art" aria-hidden="true">
 <svg className="zk-nf-decor" viewBox="0 0 760 270" preserveAspectRatio="xMidYMid meet">
  <g className="zk-nf-dot-grid" fill="var(--nf-pop-2)">{Array.from({length:20},(_,index)=><circle key={index} cx={66+(index%5)*13} cy={155+Math.floor(index/5)*13} r="2.6"/>)}</g>
  <path className="zk-nf-squiggle" d="M78 70c14-24 28 24 42 0s28 24 42 0 28 24 42 0" fill="none" stroke="var(--nf-pop-3)" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round"/>
  <g className="zk-nf-plane-wrap">
   <path className="zk-nf-flight" d="M550 122c39-55 103-48 115-4 9 33-21 51-50 35-20-11-16-39 9-53" fill="none" stroke="var(--nf-pop-2)" strokeWidth="3" strokeDasharray="7 9" strokeLinecap="round"/>
   <g className="zk-nf-plane" transform="translate(624 69) rotate(-12)"><path d="M0 28 70 0 45 48 27 31Z" fill="var(--nf-pop-1)"/><path d="m27 31 43-31-35 37-8 22Z" fill="var(--nf-pop-2)"/><path d="m27 31 18 17-10-11L70 0Z" fill="var(--nf-surface)" opacity=".72"/></g>
  </g>
  <g className="zk-nf-striped-ball" transform="translate(104 205) rotate(-14)"><circle r="34" fill="var(--nf-pop-5)"/><path d="M-31-12C-12-24 12-24 31-12M-34 2C-12-10 12-10 34 2M-29 17C-9 6 12 6 29 17" fill="none" stroke="var(--nf-surface)" strokeWidth="8" opacity=".66"/></g>
  <path className="zk-nf-triangle" d="m674 205 22 38-44-1Z" fill="var(--nf-pop-4)"/>
  <circle className="zk-nf-small-ring" cx="579" cy="219" r="13" fill="none" stroke="var(--nf-pop-1)" strokeWidth="6"/>
 </svg>
 <div className="zk-nf-code" dir="ltr"><span className="zk-nf-four">4</span><span className="zk-nf-zero"><span/></span><span className="zk-nf-four">4</span></div>
 </div>}

export default function NotFoundPage(){
 const {cfg,T,lang,setView,requestConsult}=useAppContext(),en=lang==='en';
 const brand=String(cfg?.browserTitle||cfg?.siteTitle||(en?'Website':'سایت')).replace(/[“”"]/g,'').trim();
 const dark=['dark','ocean','navystack','navystack-dark'].includes(String(T.id||''));
 const vars:NotFoundVars={
  '--nf-page-bg':String(T.bg||'#f6f3fb'),'--nf-surface':String(T.card||'#fff'),'--nf-soft':String(T.soft||'#f1eafb'),'--nf-text':String(T.txt||'#251b32'),'--nf-muted':String(T.mut||'#74677f'),'--nf-accent':String(T.acc||'#7c3aed'),'--nf-title':String(T.ttl||T.acc||'#7c3aed'),'--nf-border':String(T.brd||'rgba(124,58,237,.14)'),'--nf-gradient':String(T.grad||'linear-gradient(135deg,#7c3aed,#ec4899)'),'--nf-neu-out':String(T.neuOut||'6px 6px 16px rgba(80,60,110,.14),-6px -6px 16px rgba(255,255,255,.85)'),'--nf-neu-in':String(T.neuIn||'inset 4px 4px 8px rgba(80,60,110,.13),inset -4px -4px 8px rgba(255,255,255,.8)'),'--nf-shadow-hi':dark?'rgba(255,255,255,.055)':'rgba(255,255,255,.9)','--nf-shadow-lo':dark?'rgba(0,0,0,.46)':'color-mix(in srgb, var(--nf-accent) 16%, transparent)','--nf-pop-1':dark?'#f472b6':'color-mix(in srgb, var(--nf-accent) 38%, #f472b6)','--nf-pop-2':String(T.secondary||T.primaryHover||'#38bdf8'),'--nf-pop-3':String(T.tertiary||T.warn||'#facc15'),'--nf-pop-4':String(T.ok||T.success||'#34d399'),'--nf-pop-5':String(T.purple||T.brandPurple||T.acc||'#8b5cf6')
 };
 const iconColor='currentColor';
 const shortcuts:Shortcut[]=[
  {title:en?'Consultation':'درخواست مشاوره',aria:en?'Request a consultation':'رفتن به ثبت درخواست مشاوره',icon:<ConsultIcon size={20} color={iconColor}/>,tone:'pink',run:()=>requestConsult?.()},
  {title:en?'Courses':'معرفی دوره‌ها',aria:en?'View courses':'رفتن به معرفی دوره‌ها',icon:<CoursesIcon size={20} color={iconColor}/>,tone:'blue',run:()=>setView('courses')},
  {title:en?"Parents' stories":'تجربه والدین',aria:en?"View parents' stories":'رفتن به تجربه والدین',icon:<VideoIcon size={20} color={iconColor}/>,tone:'yellow',run:()=>setView('experience')},
  {title:en?'Licenses and badges':'مجوزها و نمادها',aria:en?'View licenses and trust badges':'رفتن به مجوزها و نمادها',icon:<LicensesIcon size={20} color={iconColor}/>,tone:'violet',run:()=>setView('licenses')},
  {title:en?'Educational articles':'مقالات آموزشی',aria:en?'View educational articles':'رفتن به مقالات آموزشی',icon:<EducationIcon size={20} color={iconColor}/>,tone:'green',run:()=>setView('education')},
  {title:en?'Contact and support':'ارتباط با ما و پشتیبانی',aria:en?'Contact support':'رفتن به ارتباط با ما و پشتیبانی',icon:<ContactIcon size={20} color={iconColor}/>,tone:'orange',run:()=>setView('contact')},
 ];
 return <main className="zk-nf-page" style={vars} aria-labelledby="not-found-title" dir={en?'ltr':'rtl'}>
  <Helmet><title>{en?`Page not found | ${brand}`:`صفحه پیدا نشد | ${brand}`}</title><meta name="robots" content="noindex, nofollow"/></Helmet>
  <section className="zk-nf-shell">
   <header className="zk-nf-top"><div className="zk-nf-brand"><span className="zk-nf-brand-mark"/><span>{brand}</span></div><button className="zk-nf-home-icon" type="button" onClick={()=>setView('home')} aria-label={en?'Back to home':'بازگشت به صفحه اصلی'}><HomeIcon size={19} color="currentColor"/></button></header>
   <MemphisArtwork/>
   <div className="zk-nf-copy"><h1 id="not-found-title">{en?<>Well, where are we<span>!</span></>:<>عه<span>!</span> اینجا کجاست؟</>}</h1><p>{en?<>The page you were looking for could not be found.<br/>Choose the right path from the options below.</>:<>صفحه‌ای که دنبالش بودی، پیدا نشد. مسیر درست را از بین گزینه‌های زیر پیدا کن!</>}</p></div>
   <nav className="zk-nf-shortcuts" aria-label={en?'Quick access':'دسترسی سریع'}>{shortcuts.map(item=><button key={item.title} className={`zk-nf-shortcut zk-nf-tone-${item.tone}`} type="button" onClick={item.run} aria-label={item.aria}><span className="zk-nf-shortcut-icon">{item.icon}</span><strong>{item.title}</strong><ArrowBackIcon/></button>)}</nav>
   <button className="zk-nf-primary" type="button" onClick={()=>setView('home')}><HomeIcon size={20} color="currentColor"/><strong>{en?'Back to home':'بازگشت به صفحه اصلی'}</strong><ArrowBackIcon/></button>
  </section>
 </main>;
}
