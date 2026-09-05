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

/**
 * Privacy consent checkbox.
 *
 * Minimal flat markup: one <label> flex row, one inline text block, no nested
 * <span>/<div> wrappers that can create unexpected line boxes on mobile wrap.
 * The privacy link is intentionally placed on its own line below the main
 * sentence so browsers do not produce an awkward orphan/gap when the long bold
 * link wraps at narrow widths.
 */
export default function PrivacyConsent({accepted,attempted,lang,T,textFa,textEn,onChange,onOpenPrivacy}:PrivacyConsentProps){
  const invalid = attempted && !accepted;
  const text = lang==='en' ? textEn : textFa;
  const linkLabel = lang==='en' ? 'Privacy notice' : 'متن حریم خصوصی';
  const errorMsg = lang==='en'
    ? 'To continue, confirm this option if you agree.'
    : 'برای ادامه، در صورت موافقت این گزینه را فعال کنید.';
  return (
    <label
      data-testid="privacy-consent"
      aria-invalid={invalid}
      dir={lang==='fa' ? 'rtl' : 'ltr'}
      style={{
        display:'flex',
        alignItems:'flex-start',
        gap:10,
        margin:'14px 0 8px',
        padding:'10px 10px',
        border:`${invalid?2:1}px solid ${invalid?T.err:'transparent'}`,
        borderRadius:12,
        background:invalid?`${T.err}0d`:'transparent',
        fontSize:12,
        lineHeight:1.8,
        color:invalid?T.err:T.mut,
        cursor:'pointer',
        boxSizing:'border-box',
      }}
    >
      <input
        type="checkbox"
        checked={accepted}
        onChange={event=>onChange(event.target.checked)}
        style={{
          marginTop:4,
          accentColor:T.acc,
          width:18,
          height:18,
          flex:'0 0 18px',
        }}
      />
      <span style={{flex:1,minWidth:0}}>
        <span style={{display:'inline',whiteSpace:'normal',wordBreak:'normal'}}>{text}</span>
        <span style={{display:'block',marginTop:4}}>
          <button
            type="button"
            onClick={event=>{event.preventDefault();event.stopPropagation();onOpenPrivacy()}}
            style={{
              display:'inline',
              background:'transparent',
              border:0,
              padding:0,
              margin:0,
              color:T.accText,
              fontFamily:'inherit',
              fontSize:'inherit',
              lineHeight:'inherit',
              fontWeight:800,
              cursor:'pointer',
            }}
          >{linkLabel}</button>
        </span>
        {invalid && (
          <span role="alert" style={{display:'block',marginTop:6,fontSize:11,lineHeight:1.7,color:T.err,fontWeight:700}}>
            {errorMsg}
          </span>
        )}
      </span>
    </label>
  );
}
