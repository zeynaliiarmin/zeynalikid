import type {DynamicRecord} from '../app/AppContext';

interface PrivacyConsentProps {
 accepted:boolean;
 attempted:boolean;
 lang:'fa'|'en';
 T:DynamicRecord;
 textFa:string;
 textEn:string;
 onChange:(accepted:boolean)=>void;
 onOpenPrivacy:()=>void;
}

export default function PrivacyConsent({accepted,attempted,lang,T,textFa,textEn,onChange,onOpenPrivacy}:PrivacyConsentProps){
 const invalid=attempted&&!accepted;
 return <label data-testid="privacy-consent" aria-invalid={invalid} style={{display:'flex',alignItems:'flex-start',gap:9,margin:'14px 0 8px',padding:'9px 10px',border:`${invalid?2:1}px solid ${invalid?T.err:'transparent'}`,borderRadius:12,background:invalid?`${T.err}0d`:'transparent',fontSize:11.5,lineHeight:1.65,color:invalid?T.err:T.mut,cursor:'pointer',boxSizing:'border-box',transition:'border-color .2s ease, background .2s ease, color .2s ease'}}>
  <input type="checkbox" checked={accepted} onChange={event=>onChange(event.target.checked)} style={{marginTop:2,accentColor:T.acc,width:17,height:17,flex:'0 0 auto'}}/>
  <span style={{display:'block',minWidth:0,whiteSpace:'normal',lineHeight:1.65,margin:0,padding:0}}>
   <span>{lang==='en'?textEn:textFa}</span>{' '}
   <button type="button" onClick={event=>{event.preventDefault();event.stopPropagation();onOpenPrivacy()}} style={{display:'inline',verticalAlign:'baseline',border:0,background:'transparent',padding:0,margin:0,color:T.accText,fontFamily:'inherit',fontSize:'inherit',lineHeight:'inherit',fontWeight:800,cursor:'pointer'}}>{lang==='en'?'Privacy notice':'متن حریم خصوصی'}</button>
   {invalid&&<strong role="alert" style={{display:'block',marginTop:5,fontSize:11,lineHeight:1.55,color:T.err}}>{lang==='en'?'To continue, confirm this option if you agree.':'برای ادامه، در صورت موافقت این گزینه را فعال کنید.'}</strong>}
  </span>
 </label>;
}
