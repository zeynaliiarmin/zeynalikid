import type {CSSProperties,ReactNode} from 'react';
import {Helmet} from 'react-helmet-async';
import {Link} from 'react-router-dom';
import {useAppContext} from '../app/AppContext';
import './not-found-page.css';

type Shortcut={
 title:string;
 aria:string;
 href:string;
 tone:string;
 icon:ReactNode;
};
type NotFoundVars=CSSProperties&Record<`--nf-${string}`,string>;

function Memphis404Artwork(){
 return <div className="zk-nf-art" role="img" aria-label="خطای ۴۰۴">
  <svg viewBox="0 0 400 170" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">
   <defs>
    <filter id="neu-4-shadow" x="-20%" y="-20%" width="140%" height="140%">
     <feDropShadow dx="4" dy="6" stdDeviation="5" floodColor="var(--nf-art-shadow)" floodOpacity="0.75"/>
     <feDropShadow dx="-3" dy="-3" stdDeviation="3" floodColor="var(--nf-art-highlight)" floodOpacity="0.95"/>
    </filter>
    <filter id="donut-shadow" x="-20%" y="-20%" width="140%" height="140%">
     <feDropShadow dx="3" dy="7" stdDeviation="6" floodColor="var(--nf-art-shadow)" floodOpacity="0.6"/>
    </filter>
    <mask id="donut-hole-mask">
     <rect width="400" height="170" fill="white"/>
     <circle cx="200" cy="85" r="26" fill="black"/>
    </mask>
   </defs>

   <path d="M 40 38 Q 50 25, 62 38 T 84 38 T 106 38" fill="none" stroke="var(--nf-yellow)" strokeWidth="4.5" strokeLinecap="round"/>
   <g transform="translate(305, 22) rotate(12) scale(0.85)">
    <path d="M 0 15 L 42 0 L 24 32 L 18 18 Z" fill="var(--nf-warm)"/>
    <path d="M 18 18 L 42 0 L 24 32 Z" fill="var(--nf-accent)"/>
    <path d="M -25 30 Q -10 14, 0 16" fill="none" stroke="var(--nf-blue)" strokeWidth="2.2" strokeDasharray="3.5 3.5" strokeLinecap="round"/>
   </g>
   <g transform="translate(48, 105)">
    <circle cx="18" cy="18" r="16" fill="var(--nf-violet)"/>
    <path d="M 3 13 Q 18 17 33 13" stroke="var(--nf-art-highlight)" strokeWidth="2.5" fill="none"/>
    <path d="M 3 22 Q 18 26 33 22" stroke="var(--nf-art-highlight)" strokeWidth="2.5" fill="none"/>
   </g>
   <polygon points="325,120 345,150 305,150" fill="var(--nf-green)"/>
   <circle cx="346" cy="112" r="3.5" fill="var(--nf-warm)"/>

   <text x="92" y="122" fontFamily="sans-serif" fontSize="115" fontWeight="900" fill="var(--nf-four)" stroke="var(--nf-four-stroke)" strokeWidth="2.5" filter="url(#neu-4-shadow)" textAnchor="middle">4</text>

   <g mask="url(#donut-hole-mask)" filter="url(#donut-shadow)">
    <path d="M 200 85 L 145 85 A 55 55 0 0 1 200 30 Z" fill="var(--nf-accent)"/>
    <path d="M 200 85 L 200 30 A 55 55 0 0 1 255 85 Z" fill="var(--nf-orange)"/>
    <path d="M 200 85 L 255 85 A 55 55 0 0 1 200 140 Z" fill="var(--nf-yellow)"/>
    <path d="M 200 85 L 200 140 A 55 55 0 0 1 145 85 Z" fill="var(--nf-warm)"/>
    <circle cx="168" cy="112" r="3" fill="var(--nf-art-highlight)"/>
    <circle cx="184" cy="126" r="2.5" fill="var(--nf-art-highlight)"/>
    <line x1="218" y1="46" x2="234" y2="62" stroke="var(--nf-art-highlight)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85"/>
    <line x1="228" y1="62" x2="244" y2="78" stroke="var(--nf-art-highlight)" strokeWidth="2.8" strokeLinecap="round" opacity="0.85"/>
    <circle cx="174" cy="60" r="2.8" fill="var(--nf-green-soft)"/>
   </g>
   <circle cx="200" cy="85" r="26" fill="none" stroke="var(--nf-donut-inner)" strokeWidth="2"/>
   <circle cx="200" cy="85" r="55" fill="none" stroke="var(--nf-donut-outer)" strokeWidth="2"/>

   <text x="308" y="122" fontFamily="sans-serif" fontSize="115" fontWeight="900" fill="var(--nf-four)" stroke="var(--nf-four-stroke)" strokeWidth="2.5" filter="url(#neu-4-shadow)" textAnchor="middle">4</text>
  </svg>
 </div>;
}

const shortcuts:Shortcut[]=[
 {title:'درخواست مشاوره',aria:'رفتن به درخواست مشاوره',href:'/consultation',tone:'pink',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>},
 {title:'معرفی دوره‌ها',aria:'رفتن به معرفی دوره‌ها',href:'/courses',tone:'blue',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="2" width="14" height="20" rx="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>},
 {title:'تجربه والدین',aria:'رفتن به تجربه والدین',href:'/experience',tone:'yellow',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>},
 {title:'مجوزها و نمادها',aria:'رفتن به مجوزها و نمادها',href:'/licenses',tone:'violet',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/></svg>},
 {title:'مقالات آموزشی',aria:'رفتن به مقالات آموزشی',href:'/education',tone:'green',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>},
 {title:'ارتباط با ما و پشتیبانی',aria:'رفتن به ارتباط با ما و پشتیبانی',href:'/contact',tone:'orange',icon:<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg>},
];

function HomeIcon(){
 return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;
}

export default function NotFoundPage(){
 const {T}=useAppContext();
 const themeId=String(T.id||'wellness');
 const dark=themeId==='dark'||themeId==='admin-dark';
 const surface=String(T.pop||T.card||(dark?'#111827':'#ffffff'));
 const text=String(T.txt||(dark?'#f1f5f9':'#312E55'));
 const accent=String(T.acc||'#7A12D4');
 const vars:NotFoundVars={
  '--nf-page-bg':String(T.bg||(dark?'#0f1722':'#faf5ff')),
  '--nf-surface':surface,
  '--nf-control':String(T.card||surface),
  '--nf-text':text,
  '--nf-muted':String(T.mut||(dark?'#94a3b8':'#64748b')),
  '--nf-border':String(T.brd||(dark?'#334155':'#f1f5f9')),
  '--nf-accent':accent,
  '--nf-warm':String(T.err||'#EE776E'),
  '--nf-blue':String(T.secondary||T.primaryHover||'#0284C7'),
  '--nf-yellow':String(T.tertiary||'#FACC15'),
  '--nf-green':String(T.success||T.green||T.ok||'#059669'),
  '--nf-green-soft':dark?'#6ee7b7':'#A7F3D0',
  '--nf-violet':String(T.purple||T.brandPurple||accent),
  '--nf-orange':String(T.warn||'#EA580C'),
  '--nf-gradient':String(T.grad||'linear-gradient(90deg,#6b21a8 0%,#db2777 100%)'),
  '--nf-card-shadow':dark?'0 20px 28px -6px rgba(0,0,0,.48),0 8px 12px -7px rgba(0,0,0,.38)':'0 20px 25px -5px color-mix(in srgb,var(--nf-accent) 7%,transparent),0 8px 10px -6px rgba(15,23,42,.06)',
  '--nf-control-shadow':dark?'0 1px 2px rgba(0,0,0,.34),0 4px 12px rgba(0,0,0,.22)':'0 1px 2px rgba(15,23,42,.07),0 4px 10px rgba(15,23,42,.035)',
  '--nf-art-shadow':dark?'#020617':'#cbd5e1',
  '--nf-art-highlight':dark?'#cbd5e1':'#ffffff',
  '--nf-four':dark?`color-mix(in srgb,${surface} 76%,${text})`:'#F8FAFC',
  '--nf-four-stroke':String(T.brd||(dark?'#475569':'#CBD5E1')),
  '--nf-donut-inner':dark?'rgba(255,255,255,.24)':'rgba(0,0,0,.18)',
  '--nf-donut-outer':dark?'rgba(255,255,255,.28)':'rgba(255,255,255,.45)',
 };
 return <div className="zk-nf-page" dir="rtl" style={vars} data-nf-theme={themeId} data-nf-mode={dark?'dark':'light'}>
  <Helmet><title>صفحه پیدا نشد | زینالیکید</title><meta name="robots" content="noindex, nofollow"/></Helmet>
  <main className="zk-nf-shell" aria-labelledby="not-found-title">
   <header className="zk-nf-top">
    <Link className="zk-nf-home-icon zk-nf-control" to="/" aria-label="خانه"><HomeIcon/></Link>
    <div className="zk-nf-brand"><span>زینالیکید</span><span className="zk-nf-brand-mark" aria-hidden="true"/></div>
   </header>

   <Memphis404Artwork/>

   <div className="zk-nf-copy">
    <h1 id="not-found-title" aria-label="عه ! اینجا کجاست؟"><span className="zk-nf-exclaim">عه !</span><span className="zk-nf-question">اینجا کجاست؟</span></h1>
    <p><span>صفحه‌ای که دنبالش بودی، پیدا نشد.</span><br/><span>مسیر درست را از بین گزینه‌های زیر پیدا کن!</span></p>
   </div>

   <nav className="zk-nf-shortcuts" aria-label="دسترسی سریع">
    {shortcuts.map(item=><Link key={item.title} className={`zk-nf-shortcut zk-nf-control zk-nf-tone-${item.tone}`} to={item.href} aria-label={item.aria}><strong>{item.title}</strong><span className="zk-nf-shortcut-icon">{item.icon}</span></Link>)}
   </nav>

   <footer className="zk-nf-footer">
    <Link className="zk-nf-primary zk-nf-control" to="/"><strong>بازگشت به صفحه اصلی</strong><HomeIcon/></Link>
   </footer>
  </main>
 </div>;
}
