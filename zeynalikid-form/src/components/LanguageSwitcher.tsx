import { useEffect, useRef, useState } from 'react';

type Props = { lang:'fa'|'en'; setLang:(l:'fa'|'en')=>void; T:any };

// Language state, localStorage key and cross-project synchronization are unchanged.
export default function LanguageSwitcher({ lang, setLang, T }: Props) {
  const [open,setOpen]=useState(false); const ref=useRef<HTMLDivElement|null>(null);
  useEffect(()=>{ const h=(e:MouseEvent)=>{ if(ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }; document.addEventListener('mousedown',h); return()=>document.removeEventListener('mousedown',h);},[]);
  useEffect(()=>{
    const onStorage=(e:StorageEvent)=>{
      if(e.key==='zkid_lang'&&e.newValue){
        try{const v=JSON.parse(e.newValue);if(v==='fa'||v==='en')setLang(v)}catch{if(e.newValue==='fa'||e.newValue==='en')setLang(e.newValue as 'fa'|'en')}
      }
    };
    window.addEventListener('storage',onStorage);
    return()=>window.removeEventListener('storage',onStorage);
  },[setLang]);
  const changeLang=(l:'fa'|'en')=>{setLang(l);try{localStorage.setItem('zkid_lang',JSON.stringify(l))}catch{}setOpen(false)};
  return <div ref={ref} style={{position:'relative',zIndex:50}}>
    <button type="button" aria-label={lang==='fa'?'تغییر زبان':'Change language'} aria-expanded={open} onClick={()=>setOpen(v=>!v)} style={{height:48,minWidth:48,padding:'0 10px',border:`1px solid ${T.brd}`,borderRadius:12,background:T.card,color:T.txt,cursor:'pointer',fontSize:13,fontWeight:800,opacity:open?1:.92,transition:'all .2s ease',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:open?T.neuIn:T.neuOut,fontFamily:'inherit'}}>{lang==='fa'?'فا':'EN'}</button>
    {open&&<div role="menu" style={{position:'absolute',top:'calc(100% + 8px)',insetInlineStart:0,minWidth:144,background:T.pop,border:`1px solid ${T.brd}`,borderRadius:14,boxShadow:'0 18px 45px rgba(15,38,60,.18)',padding:6,animation:'fadeSlide .2s ease both'}}>
      {[['fa','فارسی'],['en','English']].map((x:any)=><button type="button" role="menuitem" key={x[0]} onClick={()=>changeLang(x[0])} style={{width:'100%',minHeight:44,display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',padding:'9px 10px',border:0,borderRadius:10,background:lang===x[0]?T.soft:'transparent',color:lang===x[0]?T.acc:T.txt,cursor:'pointer',fontSize:14,fontFamily:'inherit',textAlign:'start'}}><span>{x[1]}</span><b dir="ltr" style={{fontSize:12}}>{x[0]==='fa'?'FA':'EN'}</b></button>)}
    </div>}
  </div>
}
