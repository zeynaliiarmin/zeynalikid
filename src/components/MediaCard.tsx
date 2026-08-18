// کارت نمایش یک آیتم رسانه‌ای (ویدیو / ویس / عکس / متن) — استفاده در تجربه والدین و آموزش‌ها
import { useEffect, useState } from 'react';
import { VideoIcon, AudioIcon, PhotoIcon, TextIcon, PhoneIcon } from './Icons';
import CollapsibleCardText from './CollapsibleCardText';
import { Highlights } from './MediaHighlights';
import { extractDirectMediaUrl, normalizeMediaInput } from '../utils/mediaInput';

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

// هیچ HTML یا اسکریپت ورودی مستقیماً اجرا نمی‌شود. از کدهای iframe/video فقط src امن
// http(s) استخراج و در عنصر محدود خودمان رندر می‌شود؛ بنابراین کد آپارات/یوتیوب قدیمی
// همچنان پخش می‌شود ولی style/script/handlerهای همراه آن وارد DOM نمی‌شوند.
export function ManualEmbed({code,type='video',minHeight}:{code:string,type?:'video'|'audio'|'image',minHeight?:number}){
  const normalized=normalizeEmbedCode(code);
  // اگر لینک تصویر (مثل ImgURL) از کار بیفتد/منقضی شود، به‌جای باکس سیاه، یک placeholder ملایم نشان می‌دهیم.
  const [imgFailed,setImgFailed]=useState(false);
  useEffect(()=>{setImgFailed(false)},[code]);
  if(type==='image'){
    const safeSrc=extractDirectMediaUrl(normalized,'image');
    if(!safeSrc)return null;
    if(imgFailed)return <div data-manual-embed="image-fallback" style={{width:'100%',aspectRatio:'16 / 9',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:6,background:'#0b0b0b',color:'#9ca3af',fontSize:12}}><PhotoIcon size={26} color="#6b7280"/><span>تصویر در دسترس نیست</span></div>;
    // نمایش کامل عکس بدون برش — صرف‌نظر از ابعاد اصلی؛ هر عکسی با هر ابعادی کامل دیده می‌شود.
    return <img data-manual-embed="image" src={safeSrc} alt="" referrerPolicy="no-referrer" onError={()=>setImgFailed(true)} style={{width:'100%',height:'auto',maxHeight:600,objectFit:'contain',display:'block',background:'#000'}} draggable={false}/>;
  }
  if(type==='audio'){
    const safeSrc=extractDirectMediaUrl(normalized,'audio');
    return safeSrc?<audio data-manual-embed="audio" controls preload="none" src={safeSrc} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/>:null;
  }
  const safeSrc=extractDirectMediaUrl(normalized,'video');
  if(!safeSrc)return null;
  const isDirectVideo=/<\s*(?:video|source)\b/i.test(normalized)||/\.(?:mp4|webm|ogv|mov)(?:[?#].*)?$/i.test(safeSrc);
  if(isDirectVideo)return <video data-manual-embed="video" controls preload="metadata" src={safeSrc} controlsList="nodownload noplaybackrate" style={{width:'100%',minHeight:minHeight||210,aspectRatio:'16 / 9',objectFit:'contain',display:'block',background:'#000'}}/>;
  return <div data-manual-embed="iframe" style={{position:'relative',width:'100%',paddingTop:'56.25%',minHeight:minHeight||undefined,background:'#000'}}><iframe src={safeSrc} title="Embedded media" frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerPolicy="no-referrer" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>;
}

// همهٔ کارت‌ها در حالت بسته عنوان یک‌خطی و دقیقاً دو خط توضیح دارند؛ متن بلند با «بیشتر…» باز می‌شود.
function MediaCardInfo({item,type,masked,T,secure=true,lang}:{item:any,type:string,masked:string,T:any,secure?:boolean,lang:string}){
 const desc=String(type==='text'?(item.body||item.description||''):(item.description||''));
 return <div style={{padding:'10px 12px 12px',userSelect:secure?'none':undefined,display:'flex',flexDirection:'column',flex:1}}>
  <b style={{display:'block',height:25.2,fontSize:14,lineHeight:1.8,color:T.ttl,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title||'\u00a0'}</b>
  <CollapsibleCardText
    text={desc}
    color={T.mut}
    accentColor={T.acc}
    background={T.badge||T.card||'var(--zk-surface)'}
    fontSize={12}
    lineHeight={1.8}
    lines={2}
    moreLabel={lang==='en'?'More…':'بیشتر…'}
    lessLabel={lang==='en'?'Less':'کمتر'}
    direction={lang==='en'?'ltr':'rtl'}
  />
  <Highlights highlights={item?.highlights} style={{ margin: '8px 0 0' }} />
  <div dir="ltr" aria-hidden={!masked} style={{height:20,marginTop:6,display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.acc,fontFamily:'monospace,-apple-system,"Courier New"',visibility:masked?'visible':'hidden'}}><PhoneIcon size={12} color={T.acc}/> {masked||'0000xxxx000'}</div>
 </div>
}

export default function MediaCard({item,T,lang,vpnOn=false,secure=true}:{item:any,T:any,lang:string,vpnOn?:boolean,secure?:boolean}){
 const [playing,setPlaying]=useState(false);
 const type=item.type||'video';
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
 let manualCode = normalizedManual;

 // کد HTML باید حتی وقتی فقط «آپارات» یا فقط یک پلتفرم پر شده است مستقیماً رندر شود.
 // قبلاً شرطِ اشتباهِ «هر دو پلتفرم پر باشند» باعث می‌شد کل <style>…<iframe> به src تبدیل و ویدیو خراب شود.
 const hasDualPlatform = (type === 'video' && !!ytCode && !!apCode)
   || (type === 'image' && !!extImg && !!intImg)
   || (type === 'audio' && !!extAud && !!intAud);
 if(!hasManual && (isHtmlEmbedCode(normalizedSelected) || hasDualPlatform)){
   hasManual=true;
   manualCode=normalizedSelected;
 }

 const url = normalizedSelected;

 const masked=maskPhone(item.phone);
 const imgRestrict = secure ? { draggable: false, onContextMenu: (e: React.MouseEvent) => e.preventDefault() } : {};
 return <div data-media-card="true" data-media-id={String(item?.id||'')} data-media-type={type} style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column',height:'100%',minWidth:0}}>
  {type==='video'&&(hasManual
   ?<ManualEmbed code={manualCode} type="video"/>
   :(playing
    ?<div style={{position:'relative',width:'100%',paddingTop:'56.25%',background:'#000'}}><iframe src={url} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media" referrerPolicy="no-referrer" title={item.title||'video'} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>
    :<button onClick={()=>setPlaying(true)} style={{position:'relative',width:'100%',paddingTop:'56.25%',background:T.soft,border:0,cursor:'pointer'}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} draggable={false}/>:<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><ThumbIcon type={type} size={44} color={T.acc} /></span>}<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{width:52,height:52,borderRadius:'50%',background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,paddingInlineStart:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg></span></span></button>))}
  {type==='audio'&&<div style={{aspectRatio:'16 / 9',padding:'14px 12px',display:'flex',flexDirection:'column',justifyContent:'center',alignItems:'center',gap:8,background:T.soft}}>{hasManual?<ManualEmbed code={manualCode} type="audio" minHeight={64}/>:<>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover'}} draggable={false}/>:<AudioIcon size={36} color={T.acc} />}<audio controls preload="none" src={url} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/></>}</div>}
  {type==='image'&&(hasManual?<ManualEmbed code={manualCode} type="image"/>:<img src={extractDirectMediaUrl(url,'image')||url} alt={item.title||''} loading="lazy" referrerPolicy="no-referrer" style={{width:'100%',height:'auto',maxHeight:600,objectFit:'contain',display:'block',background:'#000',pointerEvents:'none'}} {...imgRestrict} />)}
  {type==='text'&&<div aria-hidden="true" style={{aspectRatio:'16 / 9',display:'flex',alignItems:'center',justifyContent:'center',background:T.soft,color:T.acc}}><TextIcon size={44} color={T.acc}/></div>}
  <MediaCardInfo item={item} type={type} masked={masked} T={T} secure={secure} lang={lang} />
 </div>
}

