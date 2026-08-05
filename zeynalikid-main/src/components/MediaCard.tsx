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
export function pickMediaUrl(item:any, vpnOn:boolean){
  const yt=item?.youtubeUrl||'';
  const ap=item?.aparatUrl||item?.url||'';
  if(vpnOn) return yt||ap;
  return ap||yt;
}

// رندر محتوای دستی: اگر رشته با تگ HTML شروع شود (iframe/script/div/...و غیره) با dangerouslySetInnerHTML رندر می‌شود،
// در غیر این صورت (فقط یک URL ساده) بر اساس نوع آیتم (video/audio/image) به تگ مناسب تبدیل می‌شود.
export function ManualEmbed({code,type='video',minHeight}:{code:string,type?:'video'|'audio'|'image',minHeight?:number}){
  const trimmed=String(code||'').trim();
  const looksLikeHtml=/^<\s*[a-zA-Z]/.test(trimmed);
  if(looksLikeHtml)return <div style={{width:'100%',minHeight:minHeight||(type==='audio'?64:210),overflow:'hidden'}} dangerouslySetInnerHTML={{__html:trimmed}}/>;
  if(type==='audio')return <audio controls preload="none" src={trimmed} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/>;
  if(type==='image')return <img src={trimmed} alt="" style={{width:'100%',height:minHeight||210,objectFit:'cover',display:'block'}} draggable={false}/>;
  return <div style={{position:'relative',width:'100%',paddingTop:'56.25%',background:'#000'}}><iframe src={trimmed} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media" referrerPolicy="no-referrer" style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>;
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
 const hasManual=!!String(item?.manualCode||'').trim();
 const url=pickMediaUrl(item,vpnOn);
 const masked=maskPhone(item.phone);
 const imgRestrict = secure ? { draggable: false, onContextMenu: (e: React.MouseEvent) => e.preventDefault() } : {};
 return <div style={{background:T.badge,border:`1px solid ${T.brd}`,borderRadius:14,overflow:'hidden',display:'flex',flexDirection:'column'}}>
  {type==='video'&&(hasManual
   ?<ManualEmbed code={item.manualCode} type="video"/>
   :(playing
    ?<div style={{position:'relative',width:'100%',paddingTop:'56.25%',background:'#000'}}><iframe src={url} frameBorder="0" sandbox="allow-scripts allow-same-origin allow-presentation" allowFullScreen allow="autoplay; fullscreen; encrypted-media" referrerPolicy="no-referrer" title={item.title||'video'} style={{position:'absolute',inset:0,width:'100%',height:'100%',border:0,display:'block'}}/></div>
    :<button onClick={()=>setPlaying(true)} style={{position:'relative',width:'100%',paddingTop:'56.25%',background:T.soft,border:0,cursor:'pointer'}}>{item.thumbnail?<img src={item.thumbnail} alt="" style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover'}} draggable={false}/>:<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><ThumbIcon type={type} size={44} color={T.acc} /></span>}<span style={{position:'absolute',inset:0,display:'flex',alignItems:'center',justifyContent:'center'}}><span style={{width:52,height:52,borderRadius:'50%',background:'rgba(0,0,0,.55)',display:'flex',alignItems:'center',justifyContent:'center',color:'#fff',fontSize:20,paddingInlineStart:4}}>▶</span></span></button>))}
  {type==='audio'&&<div style={{padding:'14px 12px 4px',display:'flex',flexDirection:'column',alignItems:'center',gap:8,background:T.soft}}>{hasManual?<ManualEmbed code={item.manualCode} type="audio" minHeight={64}/>:<>{item.thumbnail?<img src={item.thumbnail} alt="" style={{width:64,height:64,borderRadius:'50%',objectFit:'cover'}} draggable={false}/>:<AudioIcon size={36} color={T.acc} />}<audio controls preload="none" src={url} controlsList="nodownload noplaybackrate" style={{width:'100%'}}/></>}</div>}
  {type==='image'&&(hasManual?<ManualEmbed code={item.manualCode} type="image" minHeight={210}/>:<img src={url} alt={item.title||''} loading="lazy" style={{width:'100%',height:210,objectFit:'cover',display:'block',background:'#000',pointerEvents:'none'}} {...imgRestrict} />)}
  {type==='text'&&<div style={{padding:'14px 12px 0',fontSize:12.5,color:T.txt,lineHeight:2,whiteSpace:'pre-wrap',userSelect:secure?'none':undefined}}> {item.body||item.description||''}</div>}
  {/* اصلاح ۱۶: فونت عنوان/توضیحات بزرگ‌تر + سه‌نقطه + دکمه «بیشتر» */}
  <MediaCardInfo item={item} type={type} masked={masked} T={T} secure={secure} />
 </div>
}

