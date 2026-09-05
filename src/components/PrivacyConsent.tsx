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
 * Markup is intentionally flat: one <label>, one inline text span containing
 * the sentence and the privacy link with no extra block wrappers. The link is
 * kept inline (not nowrap, not a block) so the browser wraps it naturally
 * together with the surrounding words on narrow screens.
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
        lineHeight:1.7,
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
      <span
        style={{
          display:'inline',
          whiteSpace:'normal',
          wordBreak:'break-word',
          overflowWrap:'anywhere',
          lineHeight:1.7,
        }}
      >
        {text}{' '}
        <button
          type="button"
          onClick={event=>{event.preventDefault();event.stopPropagation();onOpenPrivacy()}}
          style={{
            display:'inline',
            whiteSpace:'normal',
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
            textDecoration:'underline',
            textUnderlineOffset:2,
          }}
        >{linkLabel}</button>
        {invalid && (
          <span
            role="alert"
            style={{
              display:'block',
              marginTop:6,
              fontSize:11,
              lineHeight:1.7,
              color:T.err,
              fontWeight:700,
            }}
          >{errorMsg}</span>
        )}
      </span>
    </label>
  );
}
