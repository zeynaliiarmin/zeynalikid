// کارت نمایش یک آیتم رسانه‌ای (ویدیو / ویس / عکس / متن) — استفاده در تجربه والدین و آموزش‌ها
import { useEffect, useState } from 'react';
import { VideoIcon, AudioIcon, PhotoIcon, TextIcon, PhoneIcon } from './Icons';
import CollapsibleCardText from './CollapsibleCardText';
import { Highlights } from './MediaHighlights';
import { extractDirectMediaUrl, normalizeMediaInput } from '../utils/mediaInput';
import { extractAparatHash, videoAutoThumb } from '../utils/mediaPlacement';

export function mediaThumb(type:string){
  // بازگشت SVG به‌جای ایموجی — برای سازگاری قدیمی یک رشته خالی برمی‌گردانیم و در رندر آیکون SVG استفاده می‌کنیم
  return '';
}

function ThumbIcon({type, size=44, color}:{type:string, size?:number, color:string}){
  if(type==='audio') return <AudioIcon size={size} color={color} />;
  if(type==='image') return <PhotoIcon size={size} color={color} />;
  if(type==='text') return <TextIcon size={size} color={color} />;
  return <VideoIcon size={size} color={color} />;
}

// اصلاح ۷: نمایش شماره تماس به‌صورت ماسک‌شده، مثلاً 0914xxxx437 یا 0919xxxx290
const digitsOnly=(v:any)=>String(v??'').replace(/[۰-۹]/g,d=>'۰۱۲۳۴۵۶۷۸۹'.indexOf(d).toString()).replace(/[٠-٩]/g,d=>'٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString()).replace(/\D/g,'');
export const maskPhone=(v?:string)=>{
  const d=digitsOnly(v);
  if(d.length<7)return '';
  const head=d.slice(0,4);
  const tail=d.slice(-3);
  return `${head}xxxx${tail}`;
};

// اصلاح ۱+۳ (مرحله ۳): اگر آیتم دارای کد دستی (manualCode) باشد، همان کد دقیقاً همان‌طور که وارد شده رندر می‌شود
// (پشتیبانی از هر نوع کد: لینک ساده، iframe کامل، اسکریپت amp و غیره) — بدون توجه به پلتفرم انتخاب‌شده یا وضعیت VPN.
// اگر manualCode خالی باشد، رفتار قبلی (انتخاب خودکار بر اساس VPN از یوتیوب/آپارات) حفظ می‌شود.
export function pickMediaUrl(item: any, vpnOn: boolean): string {  
  // خواندن از تمام فرمت‌های ممکن (قدیمی + جدید)  
  const yt = item?.youtubeUrl  
    || item?.youtubeCode  
    || item?.platforms?.youtube  
    || '';  
  const ap = item?.aparatUrl  
    || item?.aparatCode  
    || item?.platforms?.aparat  
    || item?.url  
    || '';  
  
  const mode=String(item?.displayMode||'auto');
  if(mode==='youtube'||mode==='external')return yt||ap;
  if(mode==='aparat'||mode==='internal')return ap||yt;
  if (vpnOn) return yt || ap;  
  return ap || yt;  
}  
  
export function pickImageUrl(item: any, vpnOn: boolean): string {  
  const ext = item?.externalCode  
    || item?.platforms?.externalImage  
    || item?.imageUrl  
    || '';  
  const int = item?.internalCode  
    || item?.platforms?.internalImage  
    || item?.imageUrl  
    || item?.url  
    || '';  
  const mode=String(item?.displayMode||'auto');
  if(mode==='external')return ext||int;
  if(mode==='internal')return int||ext;
  if (vpnOn) return ext || int;  
  return int || ext;  
}  
  
export function pickAudioUrl(item: any, vpnOn: boolean): string {  
  const ext = item?.externalCode  
    || item?.platforms?.externalAudio  
    || item?.audioUrl  
    || '';  
  const int = item?.internalCode  
    || item?.platforms?.internalAudio  
    || item?.audioUrl  
    || item?.url  
    || '';  
  const mode=String(item?.displayMode||'auto');
  if(mode==='external')return ext||int;
  if(mode==='internal')return int||ext;
  if (vpnOn) return ext || int;  
  return int || ext;  
}

// کدهای iframe گاهی از پیام‌رسان/ویرایشگر به‌صورت &lt;iframe ...&gt; یا داخل پرانتز ذخیره می‌شوند.
// قبل از تشخیص HTML آن‌ها را به فرم واقعی برمی‌گردانیم تا هیچ‌وقت کل کد به‌عنوان src یک iframe استفاده نشود.
export function normalizeEmbedCode(code:any):string{
  let normalized=normalizeMediaInput(code);
  if(normalized.startsWith('(')&&normalized.endsWith(')')){
    const inner=normalized.slice(1,-1).trim();
    if(/^<\s*[a-zA-Z!]/.test(inner))normalized=inner;
  }
  return normalized;
}
export const isHtmlEmbedCode=(code:any)=>/^<\s*[a-zA-Z!]/.test(normalizeEmbedCode(code));
export type MediaEmbedProvider = 'aparat' | 'youtube' | 'vimeo' | 'dailymotion' | 'soundcloud' | 'twitch' | 'google-drive' | 'other';

/**
 * Only known player hosts receive the browser capabilities their own controls need.
 * Unknown HTTPS embeds remain sandboxed more tightly: they can run their player,
 * but cannot claim a same-origin identity, open popups, submit forms, or navigate
 * the parent page. A provider can be added here deliberately after verification.
 */
export function mediaEmbedProvider(src: unknown): MediaEmbedProvider {
  let host = '';
  try { host = new URL(String(src || '')).hostname.toLowerCase().replace(/^www\./, ''); } catch { return 'other'; }
  if (host === 'aparat.com' || host.endsWith('.aparat.com')) return 'aparat';
  if (host === 'youtube.com' || host.endsWith('.youtube.com') || host === 'youtu.be') return 'youtube';
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) return 'vimeo';
  if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com')) return 'dailymotion';
  if (host === 'soundcloud.com' || host.endsWith('.soundcloud.com')) return 'soundcloud';
  if (host === 'twitch.tv' || host.endsWith('.twitch.tv')) return 'twitch';
  if (host === 'drive.google.com' || host.endsWith('.drive.google.com')) return 'google-drive';
  return 'other';
}

export function mediaFrameSandbox(src: unknown): string {
  switch (mediaEmbedProvider(src)) {
    // The verified video/player hosts need their real origin and storage for their
    // own native play controls. They remain cross-origin from this site and receive
    // no forms, top navigation, downloads, or popup permission.
    case 'aparat':
    case 'youtube':
    case 'vimeo':
    case 'dailymotion':
    case 'soundcloud':
    case 'twitch':
    case 'google-drive':
      return 'allow-scripts allow-same-origin allow-presentation';
    default:
      return 'allow-scripts allow-presentation';
  }
}

/**
 * A pasted platform page/link is not necessarily embeddable. Convert known video
 * pages to their official player URL while keeping copied iframe URLs unchanged.
 */
export function normalizeVideoEmbedUrl(code:any):string{
  const safeSrc=extractDirectMediaUrl(normalizeEmbedCode(code),'video');
  if(!safeSrc)return '';
  const aparatHash=extractAparatHash(safeSrc);
  if(aparatHash&&!/\/video\/video\/embed\/videohash\//i.test(safeSrc)){
    return `https://www.aparat.com/video/video/embed/videohash/${aparatHash}/vt/frame`;
  }
  const youtube=safeSrc.match(/(?:youtube\.com\/(?:watch\?(?:[^#"'\s]*&)?v=|shorts\/|v\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/i);
  if(youtube?.[1])return `https://www.youtube.com/embed/${youtube[1]}`;
  return safeSrc;
}

// هیچ HTML یا اسکریپت ورودی مستقیماً اجرا نمی‌شود. از کدهای iframe/video فقط src امن
// http(s) استخراج و در عنصر محدود خودمان رندر می‌شود؛ بنابراین کد آپارات/یوتیوب قدیمی
// همچنان پخش می‌شود ولی style/script/handlerهای همراه آن وارد DOM نمی‌شوند.
export function ManualEmbed({code,type='video',minHeight,lang='fa'}:{code:string,type?:'video'|'audio'|'image',minHeight?:number,lang?:string}){
  const normalized=normalizeEmbedCode(code);
  // اگر لینک تصویر (مثل ImgURL) از کار بیفتد/منقضی شود، به‌جای باکس سیاه، یک placeholder ملایم نشان می‌دهیم.
  const [imgFailed,setImgFailed]=useState(false);
  useEffect(()=>{setImgFailed(false)},[code]);
  if(type==='image'){
    const safeSrc=extractDirectMediaUrl(normalized,'image');
    if(!safeSrc)return null;
    if(imgFailed)return <div data-manual-embed="image-fallback" style={{width:'100%',aspectRatio:'16 / 9',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,background:'#0b0b0b',color:'#9ca3af',fontSize:12}}><PhotoIcon size={26} color="#6b7280"/><span>تصویر در دسترس نیست</span></div>;
    // نمایش کامل عکس بدون برش — صرف‌نظر از ابعاد اصلی؛ هر عکسی با هر ابعادی کامل دیده می‌شود.
    return <img data-manual-embed="image" src={safeSrc} loading="lazy" decoding="async" alt="" referrerPolicy="no-referrer" onError={()=>setImgFailed(true)} style={{width:'100%',height:'auto',maxHeight:600,objectFit:'contain',display:'block',background:'#000'}} draggable={false}/>;
  }
  if(type==='audio'){
    const safeSrc=extractDirectMediaUrl(normalized,'audio');
    return safeSrc?<audio data-manual-embed="audio" controls preload="none" src={safeSrc} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/>:null;
  }
  const safeSrc=normalizeVideoEmbedUrl(normalized);
  if(!safeSrc)return null;
  const isDirectVideo=/<\s*(?:video|source)\b/i.test(normalized)||/\.(?:mp4|webm|ogv|mov)(?:[?#].*)?$/i.test(safeSrc);
  if(isDirectVideo)return <video data-manual-embed="video" controls preload="metadata" src={safeSrc} controlsList="nodownload noplaybackrate" style={{width:'100%',minHeight:minHeight||210,aspectRatio:'16 / 9',objectFit:'contain',display:'block',background:'#000',borderRadius:14,overflow:'hidden'}}/>;
  // پخش فقط با کنترلِ خودِ پلتفرم آغاز می‌شود. قابلیت‌های sandbox بر اساس ارائه‌دهنده
  // محدود شده‌اند؛ src همچنان از کد ورودی پاک‌سازی‌شده استخراج می‌شود و iframe از سند سایت جدا می‌ماند.
  return <div data-manual-embed="iframe" style={{position:'relative',width:'100%',paddingTop:'56.25%',minHeight:minHeight||undefined,background:'#000',borderRadius:14,overflow:'hidden'}}><iframe src={safeSrc} title="Embedded media" frameBorder="0" sandbox={mediaFrameSandbox(safeSrc)} allowFullScreen allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>;
}

// همهٔ کارت‌ها در حالت بسته عنوان یک‌خطی و دقیقاً دو خط توضیح دارند؛ متن بلند با «بیشتر…» باز می‌شود.
function MediaCardInfo({item,type,masked,T,secure=true,lang,expanded=false,onMore}:{item:any,type:string,masked:string,T:any,secure?:boolean,lang:string,expanded?:boolean,onMore?:()=>void}){
 const desc=String(type==='text'?(item.body||item.description||''):(item.description||''));
 return <div style={{padding:'10px 12px 12px',userSelect:secure?'none':undefined,display:'flex',flexDirection:'column',flex:1}}>
  <b style={{display:'block',minHeight:25.2,fontSize:14,lineHeight:1.8,color:'var(--zk-text,#334155)',marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title||'\u00a0'}</b>
  {expanded ? (
   <div style={{fontSize:12,lineHeight:1.9,color:'var(--zk-text,#334155)',whiteSpace:'pre-wrap',overflowWrap:'break-word'}}>{desc}</div>
  ) : (
   <CollapsibleCardText
    text={desc}
    color="var(--zk-text,#334155)"
    accentColor="var(--zk-action-primary,#0B5D56)"
    background={T.badge||T.card||'var(--zk-surface)'}
    fontSize={12}
    lineHeight={1.8}
    lines={2}
    moreLabel={lang==='en'?'More…':'بیشتر…'}
    lessLabel={lang==='en'?'Less':'کمتر'}
    direction={lang==='en'?'ltr':'rtl'}
    onMore={onMore}
   />
  )}
  <Highlights highlights={item?.highlights} style={{ margin: '8px 0 0' }} />
  <div dir="ltr" aria-hidden={!masked} style={{height:20,marginTop:6,display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.accText,fontFamily:'monospace,-apple-system,"Courier New"',visibility:masked?'visible':'hidden'}}><PhoneIcon size={12} color={T.accText}/> {masked||'0000xxxx000'}</div>
 </div>
}

export default function MediaCard({item,T,lang,vpnOn=false,secure=true,expanded=false,onMore,onOpen}:{item:any,T:any,lang:string,vpnOn?:boolean,secure?:boolean,expanded?:boolean,onMore?:()=>void,onOpen?:()=>void}){
 const type=(item.type==='article')?'text':(item.type||'video');
 const ytCode = item?.youtubeUrl || item?.youtubeCode || item?.platforms?.youtube || '';
 const apCode = item?.aparatUrl || item?.aparatCode || item?.platforms?.aparat || '';
 const extImg = item?.externalCode || item?.platforms?.externalImage || '';
 const intImg = item?.internalCode || item?.platforms?.internalImage || '';
 const extAud = item?.externalCode || item?.platforms?.externalAudio || '';
 const intAud = item?.internalCode || item?.platforms?.internalAudio || '';

 const selectedCode = type === 'image'
   ? pickImageUrl(item, vpnOn)
   : type === 'audio'
   ? pickAudioUrl(item, vpnOn)
   : pickMediaUrl(item, vpnOn);
 const normalizedManual = normalizeEmbedCode(item?.manualCode || '');
 const normalizedSelected = normalizeEmbedCode(selectedCode);
 let hasManual = !!normalizedManual;
 let mediaCode = normalizedManual || normalizedSelected;

 // کد HTML باید حتی وقتی فقط «آپارات» یا فقط یک پلتفرم پر شده است قابل‌استفاده باشد.
 const hasDualPlatform = (type === 'video' && !!ytCode && !!apCode)
   || (type === 'image' && !!extImg && !!intImg)
   || (type === 'audio' && !!extAud && !!intAud);
 if(!hasManual && (isHtmlEmbedCode(normalizedSelected) || hasDualPlatform)){
   hasManual=true;
   mediaCode=normalizedSelected;
 }

 const apHash = type==='video' ? extractAparatHash(mediaCode) : '';
 let thumbFn = '';
 if (apHash) { try { const base = (import.meta.env.VITE_SUPABASE_URL as string || '').replace(/\/+$/, ''); if (base) thumbFn = `${base}/functions/v1/aparat-thumb?uid=${encodeURIComponent(apHash)}`; } catch { thumbFn = ''; } }
 const suppliedCover=extractDirectMediaUrl(item?.thumbnail || item?.cover,'image');
 const autoCover=type==='video'?(thumbFn||videoAutoThumb(mediaCode)):'';
 const [coverStage, setCoverStage] = useState(0);
 const coverSrc = coverStage===0 ? (suppliedCover || autoCover) : coverStage===1 ? autoCover : '';
 const masked=maskPhone(item.phone);
 const openDetails=onOpen||onMore;
 const label=`${lang==='en'?'Open details':'مشاهده جزئیات'}${item?.title?`: ${item.title}`:''}`;
 const useFallbackCover=()=>setCoverStage((stage)=>stage===0&&suppliedCover&&autoCover?1:2);
 const imagePreview=type==='image'?(coverSrc||extractDirectMediaUrl(mediaCode,'image')):coverSrc;
 const preview=<>{imagePreview?<img src={imagePreview} alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:type==='image'?'contain':'cover',display:'block',background:'#000'}} draggable={false} onError={useFallbackCover}/>:<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><ThumbIcon type={type} size={44} color={T.acc}/></span>}</>;
 const previewBox=<div data-media-card-preview="true" style={{position:'relative',width:'100%',aspectRatio:'16 / 9',background:T.soft,overflow:'hidden'}}>{preview}</div>;
 const handleCardClick=(event:React.MouseEvent<HTMLDivElement>)=>{
   if(expanded||!openDetails)return;
   const target=event.target as HTMLElement;
   if(target.closest('button,a,input,select,textarea,label'))return;
   openDetails();
 };
 const handleCardKey=(event:React.KeyboardEvent<HTMLDivElement>)=>{
   if(expanded||!openDetails||(event.key!=='Enter'&&event.key!==' '))return;
   event.preventDefault();
   openDetails();
 };
 return <div data-media-card="true" data-media-id={String(item?.id||'')} data-media-type={type} onClick={handleCardClick} onKeyDown={handleCardKey} tabIndex={!expanded&&openDetails?0:undefined} style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column',height:'100%',minWidth:0,cursor:!expanded&&openDetails?'pointer':undefined}}>
  {!expanded && (openDetails?<button type="button" data-media-card-cover="true" aria-label={label} onClick={openDetails} style={{display:'block',position:'relative',width:'100%',padding:0,border:0,background:'transparent',cursor:'pointer'}}>{previewBox}</button>:previewBox)}
  {expanded&&type==='video'&&(mediaCode?<ManualEmbed code={mediaCode} type="video" lang={lang}/>:previewBox)}
  {expanded&&type==='audio'&&(mediaCode?<div style={{padding:'14px 12px',background:T.soft}}><ManualEmbed code={mediaCode} type="audio" minHeight={64} lang={lang}/></div>:previewBox)}
  {expanded&&type==='image'&&(mediaCode?<ManualEmbed code={mediaCode} type="image" lang={lang}/>:previewBox)}
  {expanded&&type==='text'&&<div aria-hidden="true" style={{aspectRatio:'16 / 9',display:'flex',alignItems:'center',justifyContent:'center',background:T.soft,color:T.accText}}><TextIcon size={44} color={T.acc}/></div>}
  <MediaCardInfo item={item} type={type} masked={masked} T={T} secure={secure} lang={lang} expanded={expanded} onMore={onMore} />
 </div>
}
