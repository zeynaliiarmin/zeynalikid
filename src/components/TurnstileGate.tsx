import { useEffect, useRef, useState } from 'react';
import type { DynamicRecord } from '../app/AppContext';

const TURNSTILE_SCRIPT='https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

type TurnstileApi={
 render:(container:HTMLElement,options:Record<string,unknown>)=>string;
 remove:(widgetId:string)=>void;
};

declare global {
 interface Window {turnstile?:TurnstileApi;}
}

let scriptPromise:Promise<void>|null=null;
function loadTurnstile():Promise<void>{
 if(typeof window==='undefined')return Promise.reject(new Error('Turnstile requires a browser.'));
 if(window.turnstile)return Promise.resolve();
 if(scriptPromise)return scriptPromise;
 scriptPromise=new Promise((resolve,reject)=>{
  const existing=document.querySelector<HTMLScriptElement>(`script[src="${TURNSTILE_SCRIPT}"]`);
  const script=existing||document.createElement('script');
  const onLoad=()=>window.turnstile?resolve():reject(new Error('Turnstile API unavailable.'));
  const onError=()=>{scriptPromise=null;reject(new Error('Turnstile script failed to load.'))};
  script.addEventListener('load',onLoad,{once:true});
  script.addEventListener('error',onError,{once:true});
  if(!existing){script.src=TURNSTILE_SCRIPT;script.async=true;script.defer=true;document.head.appendChild(script)}
 });
 return scriptPromise;
}

interface TurnstileGateProps {
 siteKey:string;
 lang:'fa'|'en';
 T:DynamicRecord;
 includeCrypto:boolean;
 onVerify:(token:string)=>void;
 onReset:()=>void;
 /** 'payment' = قفل اطلاعات پرداخت (پیش‌فرض) | 'auth' = صفحه ورود و ثبت‌نام پنل کاربر */
 variant?:'payment'|'auth';
}

const PAYMENT_VERIFY_ACTION = { action:'payment_details' } as const;

export default function TurnstileGate({siteKey,lang,T,includeCrypto,onVerify,onReset,variant='payment'}:TurnstileGateProps){
 const containerRef=useRef<HTMLDivElement|null>(null);
 const [state,setState]=useState<'loading'|'ready'|'verified'|'error'>('loading');
 useEffect(()=>{
  let disposed=false;let widgetId='';
  setState('loading');onReset();
  loadTurnstile().then(()=>{
   if(disposed||!containerRef.current||!window.turnstile)return;
   widgetId=window.turnstile.render(containerRef.current,{
    sitekey:siteKey,
    ...(variant==='auth'?{action:'portal_auth'}:PAYMENT_VERIFY_ACTION),
    theme:'auto',
    language:lang==='fa'?'fa':'en',
    size:'flexible',
    retry:'auto',
    'refresh-expired':'auto',
    callback:(token:unknown)=>{if(disposed||typeof token!=='string')return;setState('verified');onVerify(token)},
    'expired-callback':()=>{if(disposed)return;setState('ready');onReset()},
    'timeout-callback':()=>{if(disposed)return;setState('ready');onReset()},
    'error-callback':()=>{if(disposed)return;setState('error');onReset();return true},
   });
   setState('ready');
  }).catch(()=>{if(!disposed)setState('error')});
  return()=>{disposed=true;if(widgetId&&window.turnstile){try{window.turnstile.remove(widgetId)}catch{}}};
 },[siteKey,lang,onVerify,onReset]);
 const isAuth=variant==='auth';
 return <div data-testid={isAuth?'auth-captcha-gate':'payment-captcha-gate'} style={{border:`1px solid ${T.brd}`,borderRadius:14,padding:'14px 12px',background:T.soft,margin:'10px 0 12px',textAlign:'center'}}>
  <div style={{fontSize:13,fontWeight:800,color:T.txt,marginBottom:5}}>{isAuth?(lang==='en'?"To continue securely, confirm you're not a robot":'برای ادامه امن، تأیید کنید ربات نیستید'):(lang==='en'?"For secure payment, confirm you're not a robot":'برای پرداخت امن، تأیید کنید ربات نیستید')}</div>
  <p style={{fontSize:11.5,color:T.mut,lineHeight:1.8,margin:'0 0 10px'}}>{isAuth?(lang==='en'?'Complete the check to continue.':'برای ادامه، بررسی امنیتی زیر را تکمیل کنید.'):(lang==='en'?(includeCrypto?'Complete the check to view bank or crypto payment details.':'Complete the check to view bank payment details.'):(includeCrypto?'برای مشاهده اطلاعات بانکی یا پرداخت رمزارزی، بررسی امنیتی زیر را تکمیل کنید.':'برای مشاهده اطلاعات بانکی، بررسی امنیتی زیر را تکمیل کنید.'))}</p>
  <div ref={containerRef} style={{width:'100%',minHeight:65,display:'flex',justifyContent:'center',alignItems:'center'}}/>
  <div role={state==='error'?'alert':'status'} style={{fontSize:10.5,marginTop:7,color:state==='error'?T.err:state==='verified'?T.ok:T.mut,fontWeight:state==='verified'?800:500}}>
   {state==='loading'?(lang==='en'?'Loading security check…':'در حال بارگذاری بررسی امنیتی…'):state==='verified'?(isAuth?(lang==='en'?'Verified — you can continue.':'تأیید شد؛ می‌توانید ادامه دهید.'):(lang==='en'?'Verified — loading payment details…':'تأیید شد؛ در حال دریافت اطلاعات پرداخت…')):state==='error'?(lang==='en'?'The security check did not load. Check your connection and refresh this page.':'بررسی امنیتی بارگذاری نشد. اتصال اینترنت را بررسی و صفحه را تازه‌سازی کنید.'):(isAuth?(lang==='en'?'Please complete this step first.':'لطفاً این مرحله را انجام دهید.'):(lang==='en'?'Your payment details remain hidden until verification.':'اطلاعات پرداخت تا زمان تأیید مخفی می‌ماند.'))}
  </div>
 </div>;
}
