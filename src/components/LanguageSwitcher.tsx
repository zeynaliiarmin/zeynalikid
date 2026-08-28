import { useEffect, useRef, useState } from 'react';

type Props = { lang:'fa'|'en'; setLang:(l:'fa'|'en')=>void; T:any; glass?: boolean };

// Language state, localStorage key and cross-project synchronization are unchanged.
export default function LanguageSwitcher({ lang, setLang, T, glass }: Props) {
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
  const glassDark=T.id==='dark'||T.id==='navystack';
  const btnStyle:any = glass
    ? (glassDark
      ? {height:42,minWidth:50,padding:'0 12px',border:'1px solid rgba(255,255,255,.35)',borderRadius:999,background:'rgba(255,255,255,.12)',color:'#fff',cursor:'pointer',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'}
      : {height:42,minWidth:50,padding:'0 12px',border:`1px solid ${T.brd}`,borderRadius:999,background:T.card,color:T.txt,cursor:'pointer',fontSize:13,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',fontFamily:'inherit'})
    : {height:48,minWidth:48,padding:'0 10px',border:`1px solid ${T.brd}`,borderRadius:12,background:T.card,color:T.txt,cursor:'pointer',fontSize:13,fontWeight:800,opacity:open?1:.92,transition:'all .2s ease',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:open?T.neuIn:T.neuOut,fontFamily:'inherit'};
  const menuStyle:any = glass
    ? (glassDark
      ? {position:'absolute',top:'calc(100% + 8px)',insetInlineEnd:0,minWidth:160,background:'rgba(15,23,42,.92)',backdropFilter:'blur(18px)',WebkitBackdropFilter:'blur(18px)',border:'1px solid rgba(255,255,255,.18)',borderRadius:14,boxShadow:'0 18px 45px rgba(0,0,0,.4)',padding:6,animation:'fadeSlide .2s ease both'}
      : {position:'absolute',top:'calc(100% + 8px)',insetInlineEnd:0,minWidth:160,background:T.pop,border:`1px solid ${T.brd}`,borderRadius:14,boxShadow:T.neuOut,padding:6,animation:'fadeSlide .2s ease both'})
    : {position:'absolute',top:'calc(100% + 8px)',insetInlineStart:0,minWidth:144,background:T.pop,border:`1px solid ${T.brd}`,borderRadius:14,boxShadow:'0 18px 45px rgba(15,38,60,.18)',padding:6,animation:'fadeSlide .2s ease both'};
  const itemStyle=(active:boolean):any => glass
    ? (glassDark
      ? {width:'100%',minHeight:44,display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',padding:'9px 10px',border:0,borderRadius:10,background:active?'rgba(255,255,255,.14)':'transparent',color:active?'#fff':'rgba(255,255,255,.8)',cursor:'pointer',fontSize:14,fontFamily:'inherit',textAlign:'start'}
      : {width:'100%',minHeight:44,display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',padding:'9px 10px',border:0,borderRadius:10,background:active?T.soft:'transparent',color:active?T.acc:T.txt,cursor:'pointer',fontSize:14,fontFamily:'inherit',textAlign:'start'})
    : {width:'100%',minHeight:44,display:'flex',gap:8,alignItems:'center',justifyContent:'space-between',padding:'9px 10px',border:0,borderRadius:10,background:active?T.soft:'transparent',color:active?T.acc:T.txt,cursor:'pointer',fontSize:14,fontFamily:'inherit',textAlign:'start'};
  return <div ref={ref} style={{position:'relative',zIndex:50}}>
    <button type="button" aria-label={lang==='fa'?'تغییر زبان':'Change language'} aria-expanded={open} onClick={()=>setOpen(v=>!v)} style={btnStyle}>{lang==='fa'?'فا':'EN'}</button>
    {open&&<div role="menu" style={menuStyle}>
      {[['fa','🇮🇷 فارسی'],['en','🇬🇧 English']].map((x:any)=><button type="button" role="menuitem" key={x[0]} onClick={()=>changeLang(x[0])} style={itemStyle(lang===x[0])}><span>{x[1]}</span><b dir="ltr" style={{fontSize:12}}>{x[0]==='fa'?'FA':'EN'}</b></button>)}
    </div>}
  </div>
}
