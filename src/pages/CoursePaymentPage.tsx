import { useAppContext } from '../app/AppContext';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import useExitGuard from '../hooks/useExitGuard';
import { reportError } from '../utils/errorLog';
import { triggerErrorAlert } from '../utils/errorAlertBus';
import { PaymentService,isGatewayProductionReady } from '../services/payment/PaymentService';
import { defaultSettings } from '../config/defaultSettings';
import { loadCheckoutPaymentDetails, peekCachedPaymentDetails, type PaymentDetails } from '../lib/checkoutSession';
import TurnstileGate from '../components/TurnstileGate';
import { PAYMENT_APP_LAUNCHER_ENABLED, TURNSTILE_SITE_KEY } from '../config/project';
import { paymentShareText, resolvePaymentLaunchInfo, type CopiedPaymentInfo } from '../utils/paymentLauncher';

const bankPal:Record<string,any>={blue:['#0b74e5','#eaf6ff'],sky:['#dff3ff','#0e7490'],yellow:['#facc15','#422006'],red:['#ef4444','#fff1f2'],black:['#111827','#f9fafb'],green:['#16a34a','#ecfdf5'],gray:['#64748b','#f8fafc'],brown:['#b08968','#fff7ed']};

export function CryptoLogo({id,color,size=22}:{id:string,color?:string,size?:number}){
 const c=color||{usdt:'#26A17B',btc:'#F7931A',eth:'#627EEA',doge:'#C2A633',ltc:'#BFBBBB'}[id]||'#888';
 if(id==='usdt')return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/><path fill="#fff" d="M17.9 17.4v-.002c-.11.008-.68.042-1.95.042-1.015 0-1.73-.03-1.98-.042v.003c-3.9-.172-6.81-.85-6.81-1.663s2.91-1.492 6.81-1.667v2.656c.255.018.985.061 1.997.061 1.215 0 1.823-.05 1.933-.06v-2.655c3.893.174 6.795.852 6.795 1.664s-2.902 1.49-6.795 1.663m0-3.606v-2.376h5.432V7.8H8.686v3.618h5.432v2.375c-4.414.203-7.734 1.078-7.734 2.126s3.32 1.922 7.734 2.126v7.615h3.933v-7.617c4.406-.203 7.719-1.077 7.719-2.124s-3.313-1.92-7.72-2.124"/></svg>;
 if(id==='btc')return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/><path fill="#fff" d="M22.5 14.1c.3-2.1-1.3-3.2-3.5-4l.7-2.8-1.7-.4-.7 2.7c-.45-.11-.91-.22-1.37-.32l.7-2.75-1.7-.43-.7 2.8c-.37-.085-.73-.168-1.09-.256l.002-.009-2.36-.59-.455 1.83s1.27.29 1.24.31c.69.173.816.63.795.995l-.8 3.2c.048.012.11.03.178.057l-.18-.045-1.12 4.48c-.085.21-.3.525-.784.405.017.025-1.24-.31-1.24-.31l-.85 1.96 2.23.556c.414.104.82.213 1.22.315l-.71 2.85 1.71.426.7-2.8c.466.126.92.243 1.36.354l-.7 2.79 1.71.426.71-2.84c2.91.55 5.1.33 6.02-2.3.74-2.12-.037-3.35-1.57-4.15 1.12-.257 1.96-.99 2.18-2.5zm-3.9 5.46c-.526 2.12-4.1.973-5.25.686l.94-3.76c1.16.29 4.86.86 4.31 3.07zm.53-5.49c-.48 1.93-3.45.95-4.42.71l.85-3.41c.97.24 4.07.69 3.57 2.7z"/></svg>;
 if(id==='eth')return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/><g fill="#fff" fillRule="nonzero"><path fillOpacity=".6" d="M16.5 4v8.87l7.5 3.35z"/><path d="M16.5 4L9 16.22l7.5-3.35z"/><path fillOpacity=".6" d="M16.5 21.97v6.03L24 17.62z"/><path d="M16.5 28v-6.03L9 17.62z"/><path fillOpacity=".2" d="M16.5 20.57l7.5-4.35-7.5-3.34z"/><path fillOpacity=".6" d="M9 16.22l7.5 4.35v-7.69z"/></g></svg>;
 if(id==='doge')return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/><path fill="#fff" d="M13.25 11.85h2.95c1.03 0 3.96.19 3.96 4.16 0 4.08-3.14 4.14-4.17 4.14h-2.74v-3.24h1.94v-1.86h-1.94zm-2.65-2.1v4.3H9v1.86h1.6v6.34h5.66c1.75 0 6.34-.53 6.34-6.34 0-5.6-4.36-6.16-6.14-6.16z"/></svg>;
 if(id==='ltc')return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/><path fill="#fff" d="M10.4 19.2l-1.06 4.13 8.85.01 1.6-.01.71-2.72h-6.98l1.02-3.97 2.05-.8.53-2.05-2.04.8L17 8.5h-2.89l-1.85 7.16-1.6.63-.55 2.1z"/></svg>;
 return <svg width={size} height={size} viewBox="0 0 32 32" style={{flexShrink:0}}><circle cx="16" cy="16" r="16" fill={c}/></svg>;
}

export default function CoursePaymentPage(){
 const app=useAppContext();
 const {cfg,T,S,css,lang,setView,course,setCourse,publicText,showContactOn,Stepper,ContactPanel,MiniIcon,finalizeCourseRegistration,deleteStoredImage,uploadReceiptWithProgress,referralConsultant}=app;
 const siteBrand=String(cfg.browserTitle||cfg.siteTitle||'سامانه رشد کودک').replace(/[“”"]/g,'').trim();
 type PaymentDetailsState=PaymentDetails&{loading:boolean;unlocked:boolean;error?:string};
 const courseId=String(course?.selected?.id||'');
 const referralCode=String(referralConsultant?.referralCode||'');
 const captchaScope=`${courseId}:${referralCode.toLowerCase()}`;
 // در حالت «پنل کاربر» بررسی امنیتی روی همان صفحهٔ ورود/ثبت‌نام انجام می‌شود، نه این‌جا
 const captchaMovedToPortal=String((cfg as any)?.entryMode||'track')==='user';
 const [captchaProof,setCaptchaProof]=useState<{token:string;scope:string}|null>(null);
 const [captchaAttempt,setCaptchaAttempt]=useState(0);
 const [paymentDetails,setPaymentDetails]=useState<PaymentDetailsState>({banks:[],wallets:[],loading:false,unlocked:false,error:''});
 const resetCaptcha=useCallback(()=>setCaptchaProof(null),[]);
 const acceptCaptcha=useCallback((token:string)=>setCaptchaProof({token,scope:captchaScope}),[captchaScope]);
 useEffect(()=>{const controller=new AbortController();if(!courseId||(!captchaMovedToPortal&&!(captchaProof&&captchaProof.scope===captchaScope))){setPaymentDetails(current=>current.unlocked||current.loading?{banks:[],wallets:[],loading:false,unlocked:false,error:''}:current);return()=>controller.abort();}const cached=peekCachedPaymentDetails(courseId);setPaymentDetails(cached?{...cached,loading:false,unlocked:true,error:''}:{banks:[],wallets:[],loading:true,unlocked:false,error:''});loadCheckoutPaymentDetails(courseId,referralCode,captchaMovedToPortal?'':(captchaProof?captchaProof.token:''),controller.signal).then(data=>setPaymentDetails({...data,loading:false,unlocked:true,error:''})).catch(error=>{if(error?.name!=='AbortError'){setPaymentDetails({banks:[],wallets:[],loading:false,unlocked:false,error:String(error?.message||'اطلاعات پرداخت در دسترس نیست')});setCaptchaProof(null)}});return()=>controller.abort()},[courseId,referralCode,captchaScope,captchaProof,captchaMovedToPortal]);
 // بازگشت امن: اگر مستقیماً به این صفحه آمده و course انتخاب نشده، به فهرست دوره‌ها برگردد (به‌جای صفحه سفید)
 useEffect(()=>{
   if(!course?.selected){
     try{ setView('courses'); }catch{}
   }
 },[]);
 if(!course?.selected){
   return <div style={{padding:24,textAlign:'center',color:T?.mut||'#666',fontFamily:'Vazirmatn,Tahoma,Arial,sans-serif'}}>{lang==='en'?'No course selected. Redirecting…':'دوره‌ای انتخاب نشده است. در حال انتقال…'}</div>;
 }
 const banks=(paymentDetails.banks||[]).filter((b:any)=>b&&b.active!==false&&(b.card||b.iban)).sort((a:any,b:any)=>(a.order||0)-(b.order||0));const chosen=banks.find((b:any)=>b.id===course.payment?.bankId)||banks[0];const [copied,setCopied]=useState<any>({});const [lastCopiedPayment,setLastCopiedPayment]=useState<CopiedPaymentInfo|null>(null);const [toast,setToast]=useState('');
 const pay = course.payment || {};
 const isDirty = Boolean(pay.receipt || pay.receiptText);
 useExitGuard(isDirty, lang === 'fa' ? 'اطلاعات واردشده ذخیره نشده است. آیا مطمئنید؟' : 'You have unsaved changes. Are you sure?'); const receiptTextRef=useRef<HTMLTextAreaElement|null>(null);
 // اصلاح ۳۰ (مرحله ۷): نوار پیشرفت واقعی هنگام آپلود فیش واریزی
 const [receiptProgress,setReceiptProgress]=useState<number|null>(null);
 // ─── درگاه پرداخت امن ───
 const [gatewayProcessing,setGatewayProcessing]=useState(false);
 const paymentConfig=cfg.paymentConfig||(defaultSettings as any).paymentConfig||{gateways:[],defaultCurrency:'IRR',callbackUrl:''};
 const handleGatewayPayment=async(gatewayId?:string)=>{
  if(gatewayProcessing||!paymentDetails.unlocked)return;
  setGatewayProcessing(true);
  try{
   const paymentService=new PaymentService(paymentConfig);
   const amount=course.selected?.price?parseInt(String(course.selected.price).replace(/[^0-9]/g,''))||0:0;
   const gw=gatewayId||paymentService.getActiveGateway();
   const result=await paymentService.createPaymentForGateway(gw,amount,{
    orderId:`ORDER_${Date.now()}`,
    description:`پرداخت دوره ${course.selected?.title||'آموزشی'}`,
    userName:course.form?.receiver||'',
    userPhone:course.form?.phone||'',
    callbackUrl:paymentConfig.callbackUrl||`${window.location.origin}/course-payment/verify`,
    courseId:course.selected?.id||'',
   });
   sessionStorage.setItem('pending_payment',JSON.stringify({
    transactionId:result.transactionId,
    gateway:result.gateway,
    courseId:course.selected?.id||'',
    amount,
    createdAt:new Date().toISOString(),
   }));
   if(result.paymentUrl){window.location.href=result.paymentUrl}
  }catch(error:any){
   console.error('Gateway payment error:',error);
   reportError('payment_gateway', 'Gateway payment error', String(error?.message||error));triggerErrorAlert('registration');
   setToast(error?.message||'خطا در اتصال به درگاه پرداخت. لطفاً مجدداً تلاش کنید.');
   setTimeout(()=>setToast(''),5000);
  }finally{
   setGatewayProcessing(false);
  }
 };
 const cryptoWallets=(paymentDetails.wallets||[]).filter((w:any)=>w&&w.active!==false&&w.address);
 const cryptoMode=paymentDetails.cryptoVisibility||cfg.cryptoVisibility||'intl';const cryptoVisible=cryptoMode!=='off'&&cryptoWallets.length>0&&(cryptoMode==='all'||course.dest==='intl');const captchaIncludesCrypto=course.dest==='intl'||cfg.cryptoVisibility==='all';
 const [cryptoId,setCryptoId]=useState('usdt');
 const crypto=cryptoWallets.find((w:any)=>w.id===cryptoId)||cryptoWallets[0];
 useEffect(()=>{if(!course.payment?.bankId&&chosen)setCourse((c:any)=>({...c,payment:{...(c.payment||{}),bankId:chosen.id}}))},[chosen?.id]);
 const fallbackCopy=(value:string)=>{const ta=document.createElement('textarea');ta.value=value;ta.setAttribute('readonly','');ta.style.position='fixed';ta.style.top='-1000px';ta.style.opacity='0';document.body.appendChild(ta);ta.focus();ta.select();const ok=document.execCommand('copy');document.body.removeChild(ta);if(!ok)throw new Error('copy failed')};
 const copy=async(key:string,value:string,msg:string)=>{try{try{if(navigator.clipboard?.writeText)await navigator.clipboard.writeText(value);else fallbackCopy(value)}catch{fallbackCopy(value)}const kind:CopiedPaymentInfo['kind']=key.includes('iban')?'iban':key.startsWith('crypto-')?'crypto':'card';setLastCopiedPayment({kind,value,label:lang==='en'?(kind==='iban'?'IBAN':kind==='crypto'?'Crypto wallet address':'Card number'):(kind==='iban'?'شماره شبا':kind==='crypto'?'آدرس کیف پول':'شماره کارت')});setCopied((c:any)=>({...c,[key]:true}));setToast(msg);setTimeout(()=>{setCopied((c:any)=>({...c,[key]:false}));setToast('')},3000)}catch{setToast('کپی انجام نشد؛ لطفاً شماره را دستی کپی کنید');setTimeout(()=>setToast(''),3000)}};
 const openPaymentAppChooser=async()=>{
  const firstBank=banks[0];const resolution=resolvePaymentLaunchInfo(lastCopiedPayment,String(firstBank?.card||''),lang==='en'?`${String(firstBank?.name||'Default bank')} card number`:`شماره کارت ${String(firstBank?.name||'پیش‌فرض')}`);let copiedDefault=false;let asyncCopy:Promise<void>|null=null;
  if(resolution.shouldCopyDefault&&resolution.info){try{fallbackCopy(resolution.info.value);copiedDefault=true;setLastCopiedPayment(resolution.info)}catch{if(navigator.clipboard?.writeText){asyncCopy=navigator.clipboard.writeText(resolution.info.value).then(()=>{copiedDefault=true;setLastCopiedPayment(resolution.info)})}}}
  let sharePromise:Promise<void>|null=null;
  try{if(navigator.share){
   const shareText=paymentShareText(resolution.info,lang);const shareTitle=lang==='en'?'Choose a payment application':'انتخاب برنامه پرداخت';
   sharePromise=navigator.share({title:shareTitle,text:shareText});
  }}catch{}
  if(asyncCopy){try{await asyncCopy}catch{}}
  if(sharePromise){try{await sharePromise;setToast(copiedDefault?(lang==='en'?'Default card copied; choose a payment application.':'شماره کارت پیش‌فرض کپی شد؛ برنامه پرداخت را انتخاب کنید.'):(lang==='en'?'Your previously copied payment information was preserved.':'اطلاعاتی که قبلاً کپی کرده‌اید بدون تغییر حفظ شد.'))}catch(error){if((error as Error)?.name!=='AbortError')setToast(lang==='en'?'The application chooser could not be opened.':'امکان بازکردن فهرست برنامه‌ها وجود نداشت.');else if(copiedDefault)setToast(lang==='en'?'Default card copied.':'شماره کارت پیش‌فرض کپی شد.')}}else setToast(copiedDefault?(lang==='en'?'Default card copied; open your banking app.':'شماره کارت پیش‌فرض کپی شد؛ همراه‌بانک را باز کنید.'):(lastCopiedPayment?(lang==='en'?'Your copied payment information was preserved; open your payment app.':'اطلاعات کپی‌شده شما تغییر نکرد؛ برنامه پرداخت را باز کنید.'):(lang==='en'?'Open your preferred payment application.':'برنامه پرداخت دلخواه را باز کنید.')));
  setTimeout(()=>setToast(''),4500);
 };
 const [payBusy,setPayBusy]=useState(false);
 const submitPayment=async()=>{if(payBusy)return;if(!paymentDetails.unlocked){setToast(lang==='en'?'Complete the security check first.':'ابتدا بررسی امنیتی را تکمیل کنید.');setTimeout(()=>setToast(''),3500);return}const pay=course.payment||{};const receiptText=receiptTextRef.current?.value||pay.receiptText||''; if(!pay.receipt&&!String(receiptText).trim()){setToast('لطفاً فیش واریزی را آپلود کنید یا متن پیامک را وارد کنید.');setTimeout(()=>setToast(''),3000);return}setPayBusy(true);try{await finalizeCourseRegistration({...pay,bankId:chosen?.id||pay.bankId,receiptText,receiptMethod:pay.receipt?'image':String(receiptText).trim()?'text':null})}catch(e:any){console.error('finalize failed',e);reportError('payment_finalize','finalize failed',String(e?.message||e));triggerErrorAlert('registration');setToast(lang==='en'?'An error occurred while submitting your information. Please contact support.':'خطایی در ثبت اطلاعات رخ داده است. لطفاً با پشتیبانی تماس بگیرید.');setTimeout(()=>setToast(''),6000)}finally{setPayBusy(false)}};
 const formatCard=(v:any)=>String(v||'').replace(/\s+/g,'').replace(/(.{4})/g,'$1 ').trim(); const formatIban=(v:any)=>{let s=String(v||'').replace(/\s+/g,''); const ir=/^IR/i.test(s); s=s.replace(/^IR/i,''); const d=s.replace(/[^0-9]/g,''); return (ir?'IR ':'')+d.replace(/([0-9]{2})([0-9]{4})([0-9]{4})([0-9]{4})([0-9]{4})([0-9]{4})([0-9]{2})/, '$1 $2 $3 $4 $5 $6 $7').trim();};
 // اصلاح ۶: رنگ کارت بانکی اکنون از b.color (مقدار انتخاب‌شده در پنل مدیریت — ShippingBankEditor) خوانده می‌شود؛
 // نام بانک دیگر برای تشخیص رنگ استفاده نمی‌شود تا با تغییر رنگ در تنظیمات، صفحه پرداخت هم‌زمان به‌روزرسانی شود.
 const brand=(b:any)=>bankPal[b.color]?.[0]||T.acc;
 {/* اصلاح ۱۷: فقط تیک سبز پس از کپی، بدون متن «کپی شد» */}
 function CopyMini({copied,onClick}:any){return <button onClick={onClick} title="کپی" style={{width:26,height:26,borderRadius:8,display:'flex',alignItems:'center',justifyContent:'center',cursor:'pointer',background:copied?T.ok:T.inp || T.card,color:copied?'var(--zk-text-inverse, #fff)':T.txt,fontSize:13,transition:'all .65s',flexShrink:0}}>{copied?'':'⧉'}</button>}
 const payCss=`body{overflow-x:hidden}button{-webkit-appearance:none;appearance:none}::-webkit-input-placeholder{color:#999}:-moz-placeholder{color:#999}::-moz-placeholder{color:#999}:-ms-input-placeholder{color:#999} *{-webkit-tap-highlight-color:transparent}div[style*="cursor:pointer"]{-webkit-tap-highlight-color:transparent !important;outline:none !important}div[style*="cursor:pointer"]:active,div[style*="cursor:pointer"]:focus{outline:none !important;box-shadow:inherit !important}`;
 return <div dir={lang==='en'?'ltr':'rtl'} style={{...S.page,minHeight:'100dvh',overflowX:'hidden',padding:'max(6px, env(safe-area-inset-top, 0px)) max(6px, env(safe-area-inset-right, 0px)) max(6px, env(safe-area-inset-bottom, 0px)) max(6px, env(safe-area-inset-left, 0px))',fontFamily:"'Vazirmatn','Tahoma',Arial,sans-serif"}}><Helmet><title>{`ثبت‌نام دوره | ${siteBrand}`}</title><meta name="description" content="تکمیل ثبت‌نام دوره تخصصی رشد و تغذیه کودکان و نوجوانان" /><meta name="robots" content="noindex, follow" /></Helmet><style>{css}{payCss}</style>{/* اصلاح ۷: افزایش padding کلی کارت و overflow:auto همیشگی تا با کارت‌های بانکی بزرگ‌تر، محتوا بدون بریدگی و با اسکرول داخلی متوازن نمایش داده شود */}<div style={{...S.card,maxWidth:390,height:'calc(100dvh - 12px)',overflowY:'auto',overflowX:'hidden',padding:10,borderRadius:18,display:'flex',flexDirection:'column',lineHeight:1.3,gap:2}}><Stepper step={4}/>
{/* Stage 5: Realistic trust banner (no exaggerated claims) */}
<div style={{background:`${T.soft}`, border:`1px solid ${T.brd}`, borderRadius:14, padding:"10px 13px", marginBottom:12, display:"flex", gap:9, alignItems:"center"}}>
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
  <div style={{fontSize:12.5, color:T.ttl, lineHeight:1.35}}>{lang==="en" ? "Your information is protected by SSL encryption. Payments are processed through official secure banking gateways." : "اطلاعات شما توسط پروتکل امنیتی SSL محافظت می‌شود و پرداخت از طریق درگاه‌های رسمی بانکی انجام می‌شود."}</div>
</div><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}><h2 style={{color:T.ttl,fontSize:16,margin:0,flex:'1 1 0%'}}>{publicText('paymentTitle','اطلاعات حساب‌های مقصد')}</h2><button onClick={()=>setView('course-shipping')} style={{padding:'7px 12px',borderRadius:10,border:'none',background:T.card,color:T.accText,cursor:'pointer',fontFamily:'inherit',fontSize:12,boxShadow:T.neuOut}}>{publicText('backBtn','بازگشت')}</button></div>{!paymentDetails.unlocked&&<>{!paymentDetails.error&&!captchaMovedToPortal&&<TurnstileGate key={`${captchaScope}:${captchaAttempt}`} siteKey={TURNSTILE_SITE_KEY} lang={lang} T={T} includeCrypto={captchaIncludesCrypto} onVerify={acceptCaptcha} onReset={resetCaptcha}/>} {paymentDetails.loading&&<div role="status" style={{padding:8,borderRadius:10,background:T.soft,color:T.mut,fontSize:12,marginBottom:8}}>{lang==='en'?'Verifying and loading secure payment details…':'در حال اعتبارسنجی و دریافت امن اطلاعات پرداخت…'}</div>}{paymentDetails.error&&<div role="alert" style={{padding:10,borderRadius:10,background:`${T.err}12`,color:T.err,fontSize:12,marginBottom:8,lineHeight:1.8}}>{paymentDetails.error}<button type="button" onClick={()=>{setPaymentDetails({banks:[],wallets:[],loading:false,unlocked:false,error:''});setCaptchaAttempt(value=>value+1)}} style={{display:'block',margin:'8px auto 0',padding:'7px 16px',border:`1px solid ${T.err}`,borderRadius:999,background:T.card,color:T.err,fontFamily:'inherit',fontWeight:800,cursor:'pointer'}}>{lang==='en'?'Try security check again':'تلاش دوباره برای بررسی امنیتی'}</button></div>}</>}{paymentDetails.unlocked&&<>{PAYMENT_APP_LAUNCHER_ENABLED&&(banks.length>0||cryptoWallets.length>0)&&<button type="button" data-testid="payment-app-launcher" onClick={openPaymentAppChooser} style={{...S.btn,position:'sticky',top:4,zIndex:8,marginBottom:10,minHeight:52,display:'flex',alignItems:'center',justifyContent:'center',boxShadow:T.shadowMedium||T.neuOut,fontSize:14,fontWeight:800}}>{lang==='en'?'Choose a payment application':'انتخاب برنامه پرداخت'}</button>}{/* ─── درگاه‌های پرداخت فعال (مرحله ۷) ─── */}{(paymentConfig.gateways||[]).filter((g:any)=>g.enabled&&isGatewayProductionReady(g.id)).length>0&&<div style={{marginBottom:8}}><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:8}}><div style={{width:28,height:28,borderRadius:'50%',background:`${T.acc}12`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,flexShrink:0}}><MiniIcon type="card" T={T}/></div><b style={{fontSize:13,fontWeight:800,color:T.txt}}>{lang==='en'?'Secure Payment Gateways':'درگاه‌های پرداخت امن'}</b></div>{(()=>{const enabled=(paymentConfig.gateways||[]).filter((g:any)=>g.enabled&&isGatewayProductionReady(g.id));const icons:Record<string,string>={zarinpal:'card',idpay:'card',payping:'card',blubank:'card',stripe:'card',paypal:'card',crypto:'card'};return <div style={{display:'flex',flexDirection:'column',gap:6}}>{enabled.map((gw:any)=>{const processing=gatewayProcessing===gw.id;return <button key={gw.id} onClick={(e:any)=>{e.stopPropagation();setGatewayProcessing(gw.id);handleGatewayPayment(gw.id)}} disabled={!!gatewayProcessing} style={{display:'flex',alignItems:'center',gap:10,width:'100%',padding:'11px 14px',borderRadius:12,border:`1px solid ${T.acc}33`,background:processing?`${T.acc}15`:T.card,boxShadow:processing?T.neuIn:T.neuOut,cursor:gatewayProcessing?'wait':'pointer',fontFamily:'inherit',textAlign:'inherit',transition:'all .25s ease',opacity:gatewayProcessing&&!processing?0.5:1}}><span style={{width:28,height:28,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}><MiniIcon type={icons[gw.id]||'card'} T={T}/></span><div style={{flex:1,minWidth:0,textAlign:'inherit'}}><b style={{display:'block',fontSize:12.5,fontWeight:800,color:T.txt,lineHeight:1.5}}>{gw.label||gw.id}</b><span style={{fontSize:10,color:T.mut,lineHeight:1.5}}>{processing?(lang==='en'?'Connecting...':'در حال اتصال...'):(lang==='en'?'Tap to pay':'برای پرداخت کلیک کنید')}</span></div><span style={{width:24,height:24,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>{processing?<span aria-hidden="true" style={{width:14,height:14,border:`2px solid ${T.acc}55`,borderTopColor:T.acc,borderRadius:'50%',display:'block',animation:'spin 1s linear infinite'}}/>:<MiniIcon type="course" T={T}/>}</span></button>})}<div style={{fontSize:10.5, color:T.mut, textAlign:'center', marginTop:4}}>{lang==='en' ? 'By clicking, you will be redirected to the secure banking gateway.' : 'با کلیک، به درگاه بانکی امن منتقل می‌شوید.'}</div></div>})()}</div>}{cryptoVisible&&crypto&&<div style={{border:`1px solid ${crypto.color||T.brd}55`,background:`${crypto.color||T.acc}14`,borderRadius:12,padding:8,marginBottom:6,flex:'0 0 auto',transition:'all .65s'}}><label style={{...S.lbl,fontSize:13,margin:'0 0 6px',color:crypto.color||T.ttl,fontWeight:800}}>{lang==='en'?'International crypto payment':'پرداخت بین‌المللی با رمزارز'}</label><div style={{display:'flex',gap:5,flexWrap:'wrap',marginBottom:7}}>{cryptoWallets.map((w:any)=>{const sel=w.id===crypto.id;return <button key={w.id} onClick={()=>setCryptoId(w.id)} style={{display:'flex',alignItems:'center',gap:5,padding:'5px 8px',borderRadius:18,border:`1px solid ${sel?(w.color||T.acc):T.brd}`,background:sel?`${w.color||T.acc}22`:T.inp,color:sel?(w.color==='#BFBBBB'?T.txt:w.color)||T.acc:T.mut,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:800,transition:'all .65s'}}><CryptoLogo id={w.id} color={w.color} size={16}/><span dir="ltr">{w.symbol||w.id.toUpperCase()}</span></button>})}</div><div style={{display:'flex',alignItems:'center',gap:6,marginBottom:5}}><CryptoLogo id={crypto.id} color={crypto.color} size={20}/><b style={{fontSize:12,color:T.txt}} dir="ltr">{crypto.name} ({crypto.symbol||crypto.id.toUpperCase()})</b><span style={{fontSize:10,color:T.mut,marginInlineStart:'auto',whiteSpace:'nowrap'}}>{lang==='en'?'Network':'شبکه'}: <b dir="ltr" style={{color:crypto.color==='#BFBBBB'?T.txt:crypto.color}}>{crypto.network||'—'}</b></span></div><div style={{display:'flex',alignItems:'center',gap:6,background:T.inp,border:`1px solid ${T.brd}`,borderRadius:9,padding:'5px 7px'}}><span style={{fontSize:10,color:T.mut,whiteSpace:'nowrap'}}>{lang==='en'?'Address':'آدرس'}</span><b dir="ltr" onClick={(e:any)=>{e.stopPropagation();copy(`crypto-${crypto.id}`,crypto.address,lang==='en'?`${crypto.symbol||crypto.id.toUpperCase()} wallet address copied`:`آدرس کیف پول ${crypto.symbol||crypto.id.toUpperCase()} کپی شد`)}} title={lang==='en'?'Click to copy':'برای کپی کلیک کنید'} style={{fontFamily:'monospace,-apple-system,"Courier New"',fontSize:10.5,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:'1 1 0%',cursor:'pointer'}}>{crypto.address}</b><CopyMini copied={!!copied[`crypto-${crypto.id}`]} onClick={(e:any)=>{e.stopPropagation();copy(`crypto-${crypto.id}`,crypto.address,lang==='en'?`${crypto.symbol||crypto.id.toUpperCase()} wallet address copied`:`آدرس کیف پول ${crypto.symbol||crypto.id.toUpperCase()} کپی شد`)}}/></div><div style={{fontSize:9.5,color:T.mut,marginTop:5,lineHeight:1.6}}>{lang==='en'?`Send only ${crypto.symbol||''} on the ${crypto.network||''} network to this address.`:`فقط ${crypto.symbol||''} را از طریق شبکه ${crypto.network||''} به این آدرس ارسال کنید.`}</div></div>}{paymentDetails.loading?<div role="status" style={{padding:8,borderRadius:10,background:T.soft,color:T.mut,fontSize:12}}>{lang==='en'?'Loading secure payment details…':'در حال دریافت امن اطلاعات پرداخت…'}</div>:paymentDetails.error?<div role="alert" style={{padding:8,borderRadius:10,background:`${T.err}12`,color:T.err,fontSize:12}}>{lang==='en'?'Payment details are temporarily unavailable. Please go back and try again.':paymentDetails.error}</div>:!banks.length&&!cryptoVisible?<div style={{padding:8,borderRadius:10,background:`${T.err}12`,color:T.err,fontSize:12}}>{lang==='en'?'No active complete bank account is available.':'حساب بانکی فعال و کامل ثبت نشده است.'}</div>:null}{/* اصلاح ۷: فضای بیشتر، گوشه‌های گردتر، سایه نئومورفیک (neuOut برای عادی / neuIn برای انتخاب‌شده)، نام بانک برجسته‌تر و شماره کارت/شبا در دو ردیف جداگانه با فاصله مناسب */}<div data-testid="payment-destinations" style={{display:'flex',flexDirection:'column',gap:8,flex:'0 0 auto'}}>{banks.map((b:any,i:number)=>{const color=brand(b);const selected=pay.bankId===b.id;return <div key={b.id} onClick={()=>setCourse({...course,payment:{...pay,bankId:b.id}})} style={{position:'relative',padding:'12px 14px',borderRadius:14,background:selected?`${color}10`:T.card,boxShadow:selected?T.neuIn:T.neuOut,cursor:'pointer',transition:'all .25s ease',userSelect:'none',WebkitUserSelect:'none',WebkitTapHighlightColor:'transparent'}}><span style={{position:'absolute',left:0,top:10,bottom:10,width:4,borderRadius:4,background:color}}/><div style={{display:'flex',alignItems:'center',gap:7,minHeight:22,marginBottom:8}}><span style={{width:8,height:8,borderRadius:'50%',background:color,flexShrink:0}}/><b style={{fontSize:14.5,fontWeight:800,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:'1 1 0%'}}>{b.name}{b.holder?<span style={{color,fontWeight:800}}> - {b.holder}</span>:null}</b>{i===0&&<span style={{fontSize:9.5,color:color,border:`1px solid ${color}55`,borderRadius:10,padding:'2px 6px',whiteSpace:'nowrap',fontWeight:700}}>پیش‌فرض</span>}</div><div style={{display:'flex',alignItems:'center',gap:6,paddingInlineStart:15,minHeight:22,marginBottom:5}}><span style={{fontSize:10.5,color:T.mut,whiteSpace:'nowrap',minWidth:36}}>{lang==='en'?'Card':'کارت'}</span><b dir="ltr" onClick={(e:any)=>{e.stopPropagation();copy(`${b.id}-card`,b.card,`شماره کارت ${b.name} کپی شد`)}} title={lang==='en'?'Click to copy':'برای کپی کلیک کنید'} style={{fontFamily:'monospace,-apple-system,"Courier New"',fontSize:13,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:'1 1 0%',cursor:'pointer',letterSpacing:'.3px',userSelect:'text',WebkitUserSelect:'text',borderRadius:6,padding:'2px 4px'}}>{formatCard(b.card)}</b><CopyMini copied={!!copied[`${b.id}-card`]} onClick={(e:any)=>{e.stopPropagation();copy(`${b.id}-card`,b.card,`شماره کارت ${b.name} کپی شد`)}}/></div><div style={{display:'flex',alignItems:'center',gap:6,paddingInlineStart:15,minHeight:22}}><span style={{fontSize:10.5,color:T.mut,whiteSpace:'nowrap',minWidth:36}}>شبا</span><b dir="ltr" onClick={(e:any)=>{e.stopPropagation();copy(`${b.id}-iban`,b.iban,`شماره شبا ${b.name} کپی شد`)}} title={lang==='en'?'Click to copy':'برای کپی کلیک کنید'} style={{fontFamily:'monospace,-apple-system,"Courier New"',fontSize:12,color:T.txt,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis',flex:'1 1 0%',cursor:'pointer',letterSpacing:'.3px',userSelect:'text',WebkitUserSelect:'text',borderRadius:6,padding:'2px 4px'}}>{formatIban(b.iban)}</b><CopyMini copied={!!copied[`${b.id}-iban`]} onClick={(e:any)=>{e.stopPropagation();copy(`${b.id}-iban`,b.iban,`شماره شبا ${b.name} کپی شد`)}}/></div></div>})}</div>{/* اصلاح ۳۰: بخش ارتباط با ما از روند پرداخت حذف شد */}</>}{/* Stage 5: Order Summary Card (calm, clear, no urgency) */}
<div style={{background:T.card, border:`1px solid ${T.brd}`, borderRadius:16, padding:14, marginBottom:14, boxShadow:T.neuOut}}>
  <div style={{fontSize:12, color:T.mut, marginBottom:6}}>{lang==='en'?'Order Summary':'خلاصه سفارش'}</div>
  <div style={{display:'flex', justifyContent:'space-between', fontSize:14, marginBottom:4}}>
    <span>{lang==='en'?'Course':'دوره'}</span>
    <b>{course.selected?.title || '—'}</b>
  </div>
  <div style={{display:'flex', justifyContent:'space-between', fontSize:13, color:T.mut}}>
    <span>{lang==='en'?'Shipping':'ارسال'}</span>
    <span>{course.dest ? (course.dest==='intl' ? 'بین‌المللی' : 'داخل ایران') : '—'}</span>
  </div>
  <div style={{height:1, background:T.brd, margin:'8px 0'}} />
  <div style={{display:'flex', justifyContent:'space-between', fontWeight:800, fontSize:15}}>
    <span>{lang==='en'?'Total':'جمع کل'}</span>
    <span style={{color:T.accText}}>{course.selected?.price || '—'} {cfg.currencyUnit}</span>
  </div>
</div>

<div style={{marginTop:6,display:'flex',flexDirection:'column',gap:6}}>
  <label style={{...S.lbl,fontSize:13,margin:0,color:T.ttl}}>{publicText('receiptTitle','ارسال فیش واریزی')}</label>
  
  <div style={{border:`1.5px dashed ${T.brd}`,borderRadius:14,padding:12,background:T.inp,boxShadow:T.neuIn}}>
    <div style={{fontSize:11,color:T.mut,lineHeight:1.6,marginBottom:10}}>
      {publicText('receiptHint','فرمت JPG, PNG, WEBP, HEIC – حداکثر حجم ۵ مگابایت')}
    </div>

    {/* دکمه‌های دوگانه: عکاسی با دوربین و انتخاب از گالری */}
    <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:8}}>
      {/* دکمه دوربین */}
      <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,background:T.grad||T.acc||'#0F766E',color:'#fff',fontSize:12.5,fontWeight:800,cursor:'pointer',whiteSpace:'nowrap',boxShadow:'0 3px 10px rgba(15,118,110,0.25)'}}>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          style={{display:'none'}}
          onChange={async e=>{
            const f=e.target.files?.[0];
            if(!f)return;
            if(f.size>5*1024*1024){
              setToast('حجم عکس بیشتر از ۵ مگابایت است. لطفاً عکس را کوچک‌تر کنید.');
              setTimeout(()=>setToast(''),4000);
              e.currentTarget.value='';
              return;
            }
            setReceiptProgress(0);
            try{
              const url=await uploadReceiptWithProgress(f,pay.receipt,(p:number)=>setReceiptProgress(p));
              setCourse({...course,payment:{...pay,receipt:url,receiptText:'',receiptMethod:'image'}});
              setToast('عکس فیش با موفقیت ثبت شد');
              setTimeout(()=>setToast(''),2500);
            }catch(err:any){
              reportError('receipt_upload', 'Receipt upload failed', String(err?.message||err));triggerErrorAlert('receipt');
              setToast(err?.message||'آپلود انجام نشد');
              setTimeout(()=>setToast(''),3500);
            }finally{
              setTimeout(()=>setReceiptProgress(null),400);
            }
          }}
        />
        <span>📸</span>
        <span>{lang==='en'?'Camera':'عکس با دوربین'}</span>
      </label>

      {/* دکمه گالری / فایل‌ها */}
      <label style={{display:'inline-flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:12,background:T.card||'#fff',color:T.txt||'#1F2937',border:`1px solid ${T.brd||'#E5E0D8'}`,fontSize:12.5,fontWeight:700,cursor:'pointer',whiteSpace:'nowrap',boxShadow:T.neuOut}}>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
          style={{display:'none'}}
          onChange={async e=>{
            const f=e.target.files?.[0];
            if(!f)return;
            if(f.size>5*1024*1024){
              setToast('حجم عکس بیشتر از ۵ مگابایت است. لطفاً عکس را کوچک‌تر کنید.');
              setTimeout(()=>setToast(''),4000);
              e.currentTarget.value='';
              return;
            }
            setReceiptProgress(0);
            try{
              const url=await uploadReceiptWithProgress(f,pay.receipt,(p:number)=>setReceiptProgress(p));
              setCourse({...course,payment:{...pay,receipt:url,receiptText:'',receiptMethod:'image'}});
              setToast('عکس فیش با موفقیت ثبت شد');
              setTimeout(()=>setToast(''),2500);
            }catch(err:any){
              reportError('receipt_upload', 'Receipt upload failed', String(err?.message||err));
              setToast(err?.message||'آپلود انجام نشد');
              setTimeout(()=>setToast(''),3500);
            }finally{
              setTimeout(()=>setReceiptProgress(null),400);
            }
          }}
        />
        <span>🖼️</span>
        <span>{lang==='en'?'Gallery / Files':'انتخاب از گالری'}</span>
      </label>
    </div>

    <div style={{fontSize:11,color:pay.receipt?T.ok:T.mut,fontWeight:pay.receipt?800:500}}>
      {pay.receipt ? '✓ عکس فیش ثبت شده است' : publicText('noFileSelected','هیچ فایلی انتخاب نشده')}
    </div>
    
    <div style={{fontSize:10.5,color:T.mut,marginTop:3}}>
      {lang === 'fa' ? 'عکس به‌صورت بهینه (WebP) ذخیره می‌شود' : 'Image will be optimized as WebP'}
    </div>
  </div>

  {/* اصلاح ۳۰ (مرحله ۷): نوار پیشرفت نئومورفیک هنگام آپلود فیش */}
  {receiptProgress!==null&&(
    <div style={{marginTop:2}}>
      <div style={{height:7,borderRadius:6,background:T.inp,boxShadow:T.neuIn,overflow:'hidden'}}>
        <div style={{height:'100%',width:`${receiptProgress}%`,borderRadius:6,background:T.grad,transition:'width .2s ease'}}/>
      </div>
      <div style={{fontSize:9.5,color:T.accText,marginTop:3,textAlign:'center',fontWeight:700}}>
        {publicText('uploadProgress',`در حال آپلود... ${receiptProgress}%`).replace('{percent}',String(receiptProgress))}
      </div>
    </div>
  )}

  {pay.receipt&&(
    <div style={{display:'flex',alignItems:'center',gap:6,fontSize:11,color:T.ok,fontWeight:800}}>
      <span>✓ {publicText('receiptImageDone','عکس فیش ثبت شده است')}</span>
      <button
        onClick={async()=>{
          await deleteStoredImage(pay.receipt);
          setCourse({...course,payment:{...pay,receipt:'',receiptMethod:pay.receiptText?'text':null}});
        }}
        style={{padding:'3px 7px',borderRadius:7,border:`1px solid ${T.err}`,color:T.err,background:`${T.err}10`,fontSize:11,cursor:'pointer'}}
      >
        حذف
      </button>
    </div>
  )}

  <div style={{fontSize:10,color:T.mut,lineHeight:1.3,marginTop:4}}>
    {publicText('receiptTextHint','اگر امکان آپلود عکس فیش را ندارید، متن پیامک واریز را در کادر زیر کپی-پیست کنید.')}
  </div>

  <textarea
    ref={receiptTextRef}
    rows={2}
    style={{...S.ta,minHeight:52,height:52,lineHeight:1.3,padding:6,resize:'none',opacity:pay.receipt?.length?0.58:1}}
    defaultValue={pay.receiptText||''}
    disabled={!!pay.receipt}
    onBlur={e=>setCourse({...course,payment:{...pay,receiptText:e.target.value,receiptMethod:e.target.value.trim()?'text':pay.receipt?'image':null}})}
    placeholder={publicText('receiptSmsPlaceholder','متن پیامک واریزی را اینجا وارد کنید...')}
  />

  {pay.receiptText?.trim()&&(
    <div style={{fontSize:11,color:T.ok,fontWeight:800}}>
      ✓ {publicText('receiptTextDone','متن پیامک واریز ثبت شده است')}
    </div>
  )}
</div>{/* Stage 5: Large, calm, pill payment CTA with reassurance */}
<style>{"@keyframes zspin{to{transform:rotate(360deg)}}"}</style>
<button 
  style={{...S.btn, width:'100%', marginTop:16, marginBottom:8, padding:'16px', minHeight:56, fontSize:16, flexShrink:0, borderRadius:9999, opacity:payBusy?.72:1, cursor:payBusy?'wait':'pointer'}} 
  onClick={()=>{void submitPayment()}} disabled={payBusy}
 aria-busy={payBusy}
>
  {payBusy ? <span style={{display:'inline-flex',alignItems:'center',gap:8,verticalAlign:'middle'}}><i style={{width:14,height:14,border:'2px solid currentColor',borderTopColor:'transparent',borderRadius:'50%',display:'inline-block',animation:'zspin .7s linear infinite'}} />{lang==='en'?'Submitting…':'در حال ثبت…'}</span> : (lang==='en' ? 'Initial Registration' : 'ثبت‌نام اولیه')}
</button>
</div>{toast&&<div style={{position:'fixed',bottom:18,left:'50%',transform:'translateX(-50%)',zIndex:9999,background:T.pop,border:`1px solid ${toast.includes('نشد')||toast.includes('لطفاً')||toast.includes('بیشتر')?T.err:T.ok}`,color:toast.includes('نشد')||toast.includes('لطفاً')||toast.includes('بیشتر')?T.err:T.ok,borderRadius:12,padding:'10px 16px',fontSize:13,fontWeight:800,boxShadow:'0 14px 35px rgba(0,0,0,.25)',animation:'fadeSlide .65s ease both'}}>{toast}</div>}</div>
}
