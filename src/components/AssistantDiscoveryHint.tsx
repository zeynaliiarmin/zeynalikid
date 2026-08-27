import {useEffect,useRef,useState} from 'react';
import {PROJECT_CODE} from '../config/project';

type HintKind='initial'|'five'|'nine';
const textFor=(kind:HintKind,en:boolean)=>{
 if(en){
  if(kind==='initial')return {title:'We are here to guide you',text:'Have a question? Open the site guide for a quicker path.'};
  if(kind==='five')return {title:'Need a little guidance?',text:'The site guide can help you find the right section.'};
  return {title:'Looking for something specific?',text:'Ask the guide and reach the relevant section faster.'};
 }
 if(kind==='initial')return {title:'همراه شما هستیم',text:'اگر سؤالی دارید، راهنمای سایت در دسترس شماست.'};
 if(kind==='five')return {title:'راهنمایی لازم دارید؟',text:'برای پیدا کردن مسیر درست، از راهنمای سایت کمک بگیرید.'};
 return {title:'دنبال بخش خاصی هستید؟',text:'سؤال خود را بپرسید تا سریع‌تر به بخش مرتبط برسید.'};
};
export default function AssistantDiscoveryHint({lang,onOpen}:{lang:'fa'|'en';onOpen:()=>void}){
 const [kind,setKind]=useState<HintKind|null>(null),[leaving,setLeaving]=useState(false);const elapsed=useRef(0),last=useRef(Date.now());
 const prefix=`${PROJECT_CODE}_assistant_discovery_`;
 const dismiss=()=>{if(!kind)return;setLeaving(true);setTimeout(()=>{setKind(null);setLeaving(false)},220)};
 useEffect(()=>{
  try{elapsed.current=Number(sessionStorage.getItem(prefix+'elapsed')||0)}catch{}
  last.current=Date.now();
  let initialTimer=0;
  try{if(localStorage.getItem(prefix+'initial')!=='1'){initialTimer=window.setTimeout(()=>{setKind('initial');localStorage.setItem(prefix+'initial','1')},1100)}}catch{}
  const tick=window.setInterval(()=>{
   const now=Date.now();if(document.visibilityState==='visible')elapsed.current+=Math.max(0,now-last.current);last.current=now;
   try{sessionStorage.setItem(prefix+'elapsed',String(elapsed.current));const five=sessionStorage.getItem(prefix+'five')==='1',nine=sessionStorage.getItem(prefix+'nine')==='1';if(elapsed.current>=540000&&!nine){sessionStorage.setItem(prefix+'nine','1');setKind('nine')}else if(elapsed.current>=300000&&!five){sessionStorage.setItem(prefix+'five','1');setKind('five')}}catch{}
  },1000);
  const visibility=()=>{last.current=Date.now()};document.addEventListener('visibilitychange',visibility);
  return()=>{clearInterval(tick);clearTimeout(initialTimer);document.removeEventListener('visibilitychange',visibility);try{sessionStorage.setItem(prefix+'elapsed',String(elapsed.current))}catch{}};
 },[prefix]);
 useEffect(()=>{if(!kind)return;const hide=()=>dismiss(),autoHide=window.setTimeout(hide,5000);window.addEventListener('scroll',hide,{passive:true,once:true});document.addEventListener('pointerdown',hide,{passive:true,once:true,capture:true});return()=>{clearTimeout(autoHide);window.removeEventListener('scroll',hide);document.removeEventListener('pointerdown',hide,true)}},[kind]);
 if(!kind)return null;const copy=textFor(kind,lang==='en');
 return <button type="button" className={`zka-discovery ${leaving?'is-leaving':''}`} onClick={onOpen} aria-label={`${copy.title}. ${copy.text}`}>
  <svg viewBox="0 0 420 112" preserveAspectRatio="none" aria-hidden="true"><path d="M24 25H63c13 0 20-4 25-16 7-17 21-28 39-33 7-2 11 3 7 9-8 13-18 21-18 32 0 6 4 8 13 8h267c13 0 22 10 22 23v38c0 13-9 22-22 22H24C11 108 2 99 2 86V47C2 34 11 25 24 25Z"/></svg>
  <span><b>{copy.title}</b><small>{copy.text}</small></span>
 </button>;
}
