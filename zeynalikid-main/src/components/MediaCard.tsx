// کارت نمایش یک آیتم رسانه‌ای (ویدیو / ویس / عکس / متن) — استفاده در تجربه والدین و آموزش‌ها
import { useState } from 'react';
import { VideoIcon, AudioIcon, PhotoIcon, TextIcon, PhoneIcon } from './Icons';

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
function decodeHtmlEntities(value:string):string{
  const decodeOnce=(input:string)=>input.replace(/&(#x[0-9a-f]+|#\d+|lt|gt|quot|apos|#39|amp|nbsp);/gi,(_,entity:string)=>{
    const key=String(entity).toLowerCase();
    if(key==='lt')return '<'; if(key==='gt')return '>'; if(key==='quot')return '"';
    if(key==='apos'||key==='#39')return "'"; if(key==='amp')return '&'; if(key==='nbsp')return ' ';
    if(key.startsWith('#x'))return String.fromCodePoint(parseInt(key.slice(2),16));
    if(key.startsWith('#'))return String.fromCodePoint(parseInt(key.slice(1),10));
    return _;
  });
  let out=String(value||'');
  for(let i=0;i<3;i++){const next=decodeOnce(out);if(next===out)break;out=next;}
  return out;
}
export function normalizeEmbedCode(code:any):string{
  let normalized=decodeHtmlEntities(String(code||'')).replace(/^\uFEFF/,'').trim();
  if(normalized.startsWith('(')&&normalized.endsWith(')')){
    const inner=normalized.slice(1,-1).trim();
    if(/^<\s*[a-zA-Z!]/.test(inner))normalized=inner;
  }
  return normalized;
}
export const isHtmlEmbedCode=(code:any)=>/^<\s*[a-zA-Z!]/.test(normalizeEmbedCode(code));

// رندر محتوای دستی: اگر رشته با تگ HTML شروع شود (iframe/style/div/script و...) با innerHTML رندر می‌شود؛
// در غیر این صورت (فقط یک URL ساده) بر اساس نوع آیتم به تگ مناسب تبدیل می‌شود.
export function ManualEmbed({code,type='video',minHeight}:{code:string,type?:'video'|'audio'|'image',minHeight?:number}){
  const normalized=normalizeEmbedCode(code);
  if(isHtmlEmbedCode(normalized))return <div data-manual-embed="html" style={{width:'100%',minHeight:minHeight||(type==='audio'?64:210),overflow:'hidden'}} dangerouslySetInnerHTML={{__html:normalized}}/>;
  if(type==='audio')return <audio controls preload="none" src={normalized} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/>;
  if(type==='image')return <img src={normalized} alt="" style={{width:'100%',height:minHeight||210,objectFit:'cover',display:'block'}} draggable={false}/>;
  return <div style={{position:'relative',width:'100%',paddingTop:'56.25%',background:'#000'}}><iframe src={normalized} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media" referrerPolicy="no-referrer" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>;
}

// اصلاح ۱۶: بهبود نمایش عنوان/توضیحات — فونت بزرگ‌تر، سه‌نقطه، دکمه «بیشتر» رنگی
function MediaCardInfo({item,type,masked,T,secure=true}:{item:any,type:string,masked:string,T:any,secure?:boolean}){
 const [expanded,setExpanded]=useState(false);
 const desc=String(item.description||'');
 const isLong=desc.length>80&&type!=='text';
 return <div style={{padding:'10px 12px',userSelect:secure?'none':undefined}}>
  {item.title&&<b style={{display:'block',fontSize:14,color:T.ttl,marginBottom:3,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.title}</b>}
  {desc&&type!=='text'&&<div style={{fontSize:12,color:T.mut,lineHeight:1.8,...(!expanded&&isLong?{display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical' as any,overflow:'hidden',textOverflow:'ellipsis'}:{})}}>{desc}</div>}
  {isLong&&<button onClick={()=>setExpanded(v=>!v)} style={{border:0,background:'transparent',color:T.acc,cursor:'pointer',fontFamily:'inherit',fontSize:11,fontWeight:700,padding:'2px 0',marginTop:2,display:'flex',alignItems:'center',gap:4}}>{expanded?'کمتر':'بیشتر...'}<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{transition:'transform .3s ease',transform:expanded?'rotate(180deg)':'rotate(0deg)'}}><polyline points="6 9 12 15 18 9"/></svg></button>}
  {masked&&<div dir="ltr" style={{marginTop:6,display:'flex',alignItems:'center',gap:5,fontSize:11,color:T.acc,fontFamily:'monospace,-apple-system,"Courier New"'}}><PhoneIcon size={12} color={T.acc}/> {masked}</div>}
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
 return <div data-media-card="true" data-media-id={String(item?.id||'')} data-media-type={type} style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column'}}>
  {type==='video'&&(hasManual
   ?<ManualEmbed code={manualCode} type="video"/>
   :(playing
    ?<div style={{position:'relative',width:'100%',paddingTop:'56.25%',background:'#000'}}><iframe src={url} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media" referrerPolicy="no-referrer" title={item.title||'video'} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>
    :<button onClick={()=>setPlaying(true)} style={{position:'relative',width:'100%',paddingTop:'56.25%',background:T.soft,border:0,cursor:'pointer'}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} draggable={false}/>:<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><ThumbIcon type={type} size={44} color={T.acc} /></span>}<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{width:52,height:52,borderRadius:'50%',background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,paddingInlineStart:4}}><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.5v13l11-6.5-11-6.5z"/></svg></span></span></button>))}
  {type==='audio'&&<div style={{padding:'14px 12px 4px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:T.soft}}>{hasManual?<ManualEmbed code={manualCode} type="audio" minHeight={64}/>:<>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover'}} draggable={false}/>:<AudioIcon size={36} color={T.acc} />}<audio controls preload="none" src={url} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/></>}</div>}
  {type==='image'&&(hasManual?<ManualEmbed code={manualCode} type="image" minHeight={210}/>:<img src={url} alt={item.title||''} loading="lazy" style={{width:'100%',height:210,objectFit:'cover',display:'block',background:'#000',pointerEvents:'none'}} {...imgRestrict} />)}
  {type==='text'&&<div style={{padding:'14px 12px 0',fontSize:12.5,color:T.txt,lineHeight:2,whiteSpace:'pre-wrap',userSelect:secure?'none':undefined}}> {item.body||item.description||''}</div>}
  {/* اصلاح ۱۶: فونت عنوان/توضیحات بزرگ‌تر + سه‌نقطه + دکمه «بیشتر» */}
  <MediaCardInfo item={item} type={type} masked={masked} T={T} secure={secure} />
 </div>
}

