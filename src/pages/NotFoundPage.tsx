import {useEffect, type ReactNode} from 'react';
import {Helmet} from 'react-helmet-async';
import {useAppContext} from '../app/AppContext';
import {ConsultIcon,CoursesIcon,VideoIcon,LicensesIcon,EducationIcon,ContactIcon,HomeIcon} from '../components/Icons';
import './not-found-page.css';

type Shortcut={title:string;aria:string;icon:ReactNode;tone:string;run:()=>void};

function Memphis404Artwork(){
 return <div className="zk-nf-art" role="img" aria-label="خطای ۴۰۴">
  <svg viewBox="0 0 400 170" width="100%" height="150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
   <defs>
    <filter id="neu-4-shadow" x="-20%" y="-20%" width="140%" height="140%">
     <feDropShadow dx="5" dy="6" stdDeviation="5" floodColor="#b4d4cb" floodOpacity="0.85"/>
     <feDropShadow dx="-4" dy="-4" stdDeviation="4" floodColor="#ffffff" floodOpacity="0.95"/>
    </filter>
    <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
     <feDropShadow dx="4" dy="7" stdDeviation="7" floodColor="#9cbdb5" floodOpacity="0.75"/>
    </filter>
    <mask id="donut-hole-mask">
     <rect width="400" height="170" fill="white"/>
     <circle cx="200" cy="85" r="26" fill="black"/>
    </mask>
   </defs>
   <path d="M 40 38 Q 50 25, 62 38 T 84 38 T 106 38" fill="none" stroke="#FBBF24" strokeWidth="4.5" strokeLinecap="round"/>
   <g transform="translate(305, 22) rotate(12) scale(0.85)">
    <path d="M 0 15 L 42 0 L 24 32 L 18 18 Z" fill="#F472B6"/>
    <path d="M 18 18 L 42 0 L 24 32 Z" fill="#EC4899"/>
    <path d="M -25 30 Q -10 14, 0 16" fill="none" stroke="#818CF8" strokeWidth="2.2" strokeDasharray="3.5 3.5" strokeLinecap="round"/>
   </g>
   <g transform="translate(48, 105)">
    <circle cx="18" cy="18" r="16" fill="#8B5CF6"/>
    <path d="M 3 13 Q 18 17 33 13" stroke="#EDE9FE" strokeWidth="2.5" fill="none"/>
    <path d="M 3 22 Q 18 26 33 22" stroke="#EDE9FE" strokeWidth="2.5" fill="none"/>
   </g>
   <polygon points="325,120 345,150 305,150" fill="#10B981"/>
   <circle cx="346" cy="112" r="3.5" fill="#EC4899"/>
   <text x="92" y="122" fontFamily="system-ui, sans-serif" fontSize="115" fontWeight="900" fill="#D9ECE7" stroke="#A7CEC4" strokeWidth="2.5" filter="url(#neu-4-shadow)" textAnchor="middle">4</text>
   <g mask="url(#donut-hole-mask)" filter="url(#donut-shadow)">
    <path d="M 200 85 L 145 85 A 55 55 0 0 1 200 30 Z" fill="#0D9488"/>
    <path d="M 200 85 L 200 30 A 55 55 0 0 1 255 85 Z" fill="#FB923C"/>
    <path d="M 200 85 L 255 85 A 55 55 0 0 1 200 140 Z" fill="#FACC15"/>
    <path d="M 200 85 L 200 140 A 55 55 0 0 1 145 85 Z" fill="#EC4899"/>
    <circle cx="168" cy="112" r="3" fill="#FFFFFF"/>
    <circle cx="184" cy="126" r="2.5" fill="#FFFFFF"/>
    <line x1="218" y1="46" x2="234" y2="62" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.85"/>
    <line x1="228" y1="62" x2="244" y2="78" stroke="#FFFFFF" strokeWidth="2.8" strokeLinecap="round" opacity="0.85"/>
    <circle cx="174" cy="60" r="2.8" fill="#A7F3D0"/>
   </g>
   <circle cx="200" cy="85" r="26" fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth="2"/>
   <circle cx="200" cy="85" r="55" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth="2"/>
   <text x="308" y="122" fontFamily="system-ui, sans-serif" fontSize="115" fontWeight="900" fill="#D9ECE7" stroke="#A7CEC4" strokeWidth="2.5" filter="url(#neu-4-shadow)" textAnchor="middle">4</text>
  </svg>
 </div>;
}

export default function NotFoundPage(){
 const {setView,requestConsult}=useAppContext();
 useEffect(()=>{
  const html=document.documentElement,body=document.body;
  html.classList.add('zk-nf-locked');body.classList.add('zk-nf-locked');
  return()=>{html.classList.remove('zk-nf-locked');body.classList.remove('zk-nf-locked')};
 },[]);
 const shortcuts:Shortcut[]=[
  {title:'درخواست مشاوره',aria:'رفتن به ثبت درخواست مشاوره',icon:<ConsultIcon size={18} color="currentColor"/>,tone:'pink',run:()=>requestConsult?.()},
  {title:'معرفی دوره‌ها',aria:'رفتن به معرفی دوره‌ها',icon:<CoursesIcon size={18} color="currentColor"/>,tone:'blue',run:()=>setView('courses')},
  {title:'تجربه والدین',aria:'رفتن به تجربه والدین',icon:<VideoIcon size={18} color="currentColor"/>,tone:'yellow',run:()=>setView('experience')},
  {title:'مجوزها و نمادها',aria:'رفتن به مجوزها و نمادها',icon:<LicensesIcon size={18} color="currentColor"/>,tone:'violet',run:()=>setView('licenses')},
  {title:'مقالات آموزشی',aria:'رفتن به مقالات آموزشی',icon:<EducationIcon size={18} color="currentColor"/>,tone:'green',run:()=>setView('education')},
  {title:'ارتباط و پشتیبانی',aria:'رفتن به ارتباط و پشتیبانی',icon:<ContactIcon size={18} color="currentColor"/>,tone:'orange',run:()=>setView('contact')},
 ];
 const goHome=()=>setView('home');
 return <main className="zk-nf-page" aria-labelledby="not-found-title" dir="rtl">
  <Helmet><title>صفحه پیدا نشد | زینالیکید</title><meta name="robots" content="noindex, nofollow"/></Helmet>
  <section className="zk-nf-shell">
   <header className="zk-nf-top">
    <div className="zk-nf-brand"><span>زینالیکید</span><span className="zk-nf-brand-mark" aria-hidden="true"/></div>
    <button className="zk-nf-home-icon" type="button" onClick={goHome} aria-label="صفحه اصلی"><HomeIcon size={20} color="currentColor"/></button>
   </header>
   <Memphis404Artwork/>
   <div className="zk-nf-copy">
    <h1 id="not-found-title"><span>عه</span><b>!</b>{' '}<span>اینجا کجاست؟</span></h1>
    <p><span>صفحه‌ای که دنبالش بودی، پیدا نشد.</span><br/><span>مسیر درست را از بین گزینه‌های زیر پیدا کن!</span></p>
   </div>
   <nav className="zk-nf-shortcuts" aria-label="دسترسی سریع">
    {shortcuts.map(item=><button key={item.title} className={`zk-nf-shortcut zk-nf-tone-${item.tone}`} type="button" onClick={item.run} aria-label={item.aria}><strong>{item.title}</strong><span className="zk-nf-shortcut-icon">{item.icon}</span></button>)}
   </nav>
   <button className="zk-nf-primary" type="button" onClick={goHome}><HomeIcon size={18} color="currentColor"/><strong>بازگشت به صفحه اصلی</strong></button>
  </section>
 </main>;
}
