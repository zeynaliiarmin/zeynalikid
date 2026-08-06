// Shared mobile-first header for the consultation app.
import LanguageSwitcher from './LanguageSwitcher';

type Lang = 'fa' | 'en';

type Props = { T:any; lang:Lang; setLang:(l:Lang)=>void };

export default function Header({T,lang,setLang}:Props){
 return <header dir="ltr" style={{position:'fixed',top:0,left:0,right:0,zIndex:1200,background:T.hdr,backdropFilter:'blur(14px) saturate(135%)',WebkitBackdropFilter:'blur(14px) saturate(135%)',borderBottom:`1px solid ${T.brd}`,boxShadow:'0 4px 18px rgba(15,38,60,.07)',padding:'calc(8px + env(safe-area-inset-top, 0px)) max(16px, env(safe-area-inset-right, 0px)) 8px max(16px, env(safe-area-inset-left, 0px))',display:'flex',alignItems:'center',justifyContent:'space-between',minHeight:64,height:'calc(64px + env(safe-area-inset-top, 0px))',boxSizing:'border-box'}}>
  <LanguageSwitcher lang={lang} setLang={setLang} T={T}/>
  <div aria-label="Zeynalikid" style={{fontSize:'clamp(16px, 4.5vw, 20px)',fontWeight:800,color:T.ttl,letterSpacing:'1px',userSelect:'none',fontFamily:"'Vazirmatn',Tahoma,sans-serif",whiteSpace:'nowrap'}}>Zeynalikid</div>
  <div aria-hidden="true" style={{width:48,height:48,flexShrink:0}}/>
 </header>
}
