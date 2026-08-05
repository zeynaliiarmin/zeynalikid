// Shared mobile-first header — Stage 1: Warm Trust tokens, sticky on scroll.
import LanguageSwitcher from './LanguageSwitcher';

type Lang = 'fa' | 'en';

type Props = { T:any; lang:Lang; setLang:(l:Lang)=>void };

export default function Header({T,lang,setLang}:Props){
 return (
  <header 
    dir="ltr" 
    style={{
      position:'fixed', top:0, left:0, right:0, zIndex:1200,
      background: 'rgba(253,248,243,0.94)',
      backdropFilter:'blur(18px) saturate(160%)',
      WebkitBackdropFilter:'blur(18px) saturate(160%)',
      borderBottom: '1px solid var(--zk-border)',
      boxShadow: '0 3px 12px rgba(15,23,42,0.06)',
      padding: 'calc(6px + var(--zk-safe-top, 0px)) max(14px, env(safe-area-inset-right, 0px)) 6px max(14px, env(safe-area-inset-left, 0px))',
      display:'flex', alignItems:'center', justifyContent:'space-between',
      minHeight: 60, height: 'calc(60px + var(--zk-safe-top, 0px))',
      boxSizing:'border-box', fontFamily: 'var(--zk-font)'
    }}
  >
    <div style={{display:'flex', alignItems:'center', gap:10}}>
      <LanguageSwitcher lang={lang} setLang={setLang} T={T}/>
    </div>

    <div 
      aria-label="Zeynalikid" 
      style={{
        fontSize:'clamp(17px, 4.2vw, 21px)', 
        fontWeight:800, 
        color:'var(--zk-primary)', 
        letterSpacing:'0.3px',
        userSelect:'none',
        fontFamily:"'Vazirmatn', Tahoma, sans-serif",
        whiteSpace:'nowrap'
      }}
    >
      Zeynalikid
    </div>

    <div aria-hidden="true" style={{width:44, height:44, flexShrink:0}} />
  </header>
 );
}
