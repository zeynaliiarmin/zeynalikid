import { useAppContext } from '../app/AppContext';
import { Helmet } from 'react-helmet-async';
import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PublicBackButton from '../components/PublicBackButton';

export default function PrivacyPage(){
 const app=useAppContext();
 const navigate=useNavigate();
 const {cfg,T,S,css,lang,setView}=app;
 const returnTo=(()=>{try{const value=sessionStorage.getItem('zk_privacy_return_to')||'';return ['/consultation','/form','/child-info'].includes(value)?value:''}catch{return ''}})();
 const goBack=()=>{if(returnTo){try{sessionStorage.removeItem('zk_privacy_return_to')}catch{};navigate(returnTo)}else setView('home')};
 useEffect(()=>{
  if(!returnTo)return;
  const onPop=()=>{try{sessionStorage.removeItem('zk_privacy_return_to')}catch{};navigate(returnTo,{replace:true})};
  window.addEventListener('popstate',onPop);
  return()=>window.removeEventListener('popstate',onPop);
 },[navigate,returnTo]);
 const en=lang==='en';
 const brand=String(cfg?.browserTitle||cfg?.siteTitle||(en?'Website':'سایت')).replace(/[“”"]/g,'').trim();
 const sections=en?[
  ['Data we receive','Contact details, consultation answers, child growth and nutrition information, optional voice/photo attachments, delivery details and payment receipts.'],
  ['Why we use it','To provide the requested consultation or course, follow up an order, deliver files, prevent abuse and resolve technical errors.'],
  ['Guide assistant processing','To generate an answer, the sanitized question and relevant parts of the approved site knowledge are sent to Mistral AI. Do not enter phone numbers, credentials or private medical details in the assistant.'],
  ['Access and security','Sensitive records and private files are available only through controlled server functions and short-lived links. Administrative access is session-protected and audited.'],
  ['Retention','Records are retained only while needed to provide the service, follow up requests and meet legal or accounting obligations. Technical error logs are automatically removed after 15 days.'],
  ['Your choices','Optional attachments do not have to be sent unless the form clearly marks them as required. You may request access, correction or deletion through the contact channels published on this website.'],
  ['Important health notice','Website content is educational and does not replace examination, diagnosis or urgent medical care.'],
 ]:[
  ['اطلاعاتی که دریافت می‌شود','اطلاعات تماس، پاسخ‌های فرم مشاوره، داده‌های رشد و تغذیه کودک، فایل‌های اختیاری صوتی یا تصویری، اطلاعات ارسال و رسید پرداخت.'],
  ['هدف استفاده','ارائه مشاوره یا دوره درخواستی، پیگیری سفارش، تحویل فایل‌ها، جلوگیری از سوءاستفاده و بررسی خطاهای فنی.'],
  ['پردازش دستیار راهنما','برای تولید پاسخ، متن پاک‌سازی‌شده سؤال و بخش‌های مرتبط از دانش تأییدشده سایت به Mistral AI ارسال می‌شود. شماره تماس، اطلاعات ورود یا جزئیات پزشکی خصوصی را در دستیار وارد نکنید.'],
  ['دسترسی و امنیت','پرونده‌ها و فایل‌های خصوصی فقط از مسیرهای کنترل‌شده سرور و لینک‌های کوتاه‌مدت در دسترس‌اند. دسترسی مدیریت با نشست امن و ثبت رویدادهای امنیتی محافظت می‌شود.'],
  ['مدت نگهداری','اطلاعات فقط تا زمانی نگهداری می‌شود که برای ارائه خدمت، پیگیری درخواست و الزامات قانونی یا مالی لازم باشد. لاگ‌های خطای فنی پس از ۱۵ روز به‌صورت خودکار پاک می‌شوند.'],
  ['حقوق و انتخاب شما','ارسال فایل‌های اختیاری الزامی نیست، مگر آنکه فرم آن را صریحاً ضروری اعلام کند. درخواست مشاهده، اصلاح یا حذف داده از راه‌های تماس رسمی منتشرشده در سایت قابل ارسال است.'],
  ['تذکر سلامت','محتوای سایت آموزشی است و جایگزین معاینه، تشخیص پزشک یا مراجعه فوری پزشکی نیست.'],
 ];
 return <main dir={en?'ltr':'rtl'} style={S.page} aria-labelledby="privacy-title">
  <Helmet><title>{en?`Privacy | ${brand}`:`حریم خصوصی | ${brand}`}</title><meta name="description" content={en?'How personal and child-related information is used and protected.':'نحوه استفاده و حفاظت از اطلاعات والد و کودک.'}/><meta name="robots" content="index, follow"/></Helmet>
  <style>{css}</style>
  <article style={{...S.card,maxWidth:760,marginTop:18}}>
   <div className="zk-public-title-row" style={{margin:'0 0 8px'}}><PublicBackButton lang={en?'en':'fa'} onBack={goBack}/><h1 id="privacy-title" style={{color:T.ttl,fontSize:24,margin:0}}>{en?'Privacy and data protection':'حریم خصوصی و حفاظت از داده‌ها'}</h1></div>
   <p style={{color:T.mut,fontSize:12.5,lineHeight:1.9,margin:'0 0 18px'}}>{en?'Last reviewed: 26 August 2026':'تاریخ آخرین بازبینی: ۴ شهریور ۱۴۰۵'}</p>
   {sections.map(([title,text])=><section key={title} style={{marginBottom:18}}><h2 style={{fontSize:16,color:T.ttl,margin:'0 0 6px'}}>{title}</h2><p style={{fontSize:13.5,color:T.txt,lineHeight:2,margin:0}}>{text}</p></section>)}
  </article>
 </main>;
}
