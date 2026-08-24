import { Helmet } from 'react-helmet-async';

export default function NotFoundPage({app}:{app:any}){
 const {cfg,T,S,css,lang,setView}=app;const en=lang==='en';const brand=cfg?.siteTitle||(en?'Website':'سایت');
 return <main style={S.page} aria-labelledby="not-found-title"><Helmet><title>{en?`Page not found | ${brand}`:`صفحه پیدا نشد | ${brand}`}</title><meta name="robots" content="noindex, nofollow"/></Helmet><style>{css}</style><section style={{...S.card,maxWidth:520,marginTop:28,textAlign:'center'}}><div aria-hidden="true" style={{fontSize:44,fontWeight:900,color:T.acc,lineHeight:1}}>404</div><h1 id="not-found-title" style={{color:T.ttl,fontSize:22,margin:'12px 0 8px'}}>{en?'Page not found':'صفحه موردنظر پیدا نشد'}</h1><p style={{color:T.mut,fontSize:13.5,lineHeight:2,margin:'0 0 18px'}}>{en?'The address may be incorrect or the page may have moved.':'ممکن است آدرس اشتباه باشد یا صفحه به مسیر دیگری منتقل شده باشد.'}</p><button type="button" style={S.btn} onClick={()=>setView('home')}>{en?'Back to home':'بازگشت به صفحه اصلی'}</button></section></main>;
}
