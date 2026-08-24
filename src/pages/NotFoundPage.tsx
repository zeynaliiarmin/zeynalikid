import { useAppContext } from '../app/AppContext';
import { Helmet } from 'react-helmet-async';
import { ConsultIcon,CoursesIcon,VideoIcon,LicensesIcon,ContactIcon } from '../components/Icons';

export default function NotFoundPage(){
 const app=useAppContext();
 const {cfg,T,S,css,lang,setView,requestConsult}=app;const en=lang==='en';
 const brand=String(cfg?.browserTitle||cfg?.siteTitle||(en?'Website':'سایت')).replace(/[“”"]/g,'').trim();
 const all:any={
  consult:{title:en?'Request consultation':'ثبت درخواست مشاوره',desc:en?'Start a consultation request':'شروع فرم مشاوره',icon:<ConsultIcon size={22} color={T.acc}/>,run:()=>requestConsult?.()},
  courses:{title:en?'Courses':'معرفی دوره‌ها',desc:en?'View available courses':'مشاهده و ثبت‌نام دوره‌ها',icon:<CoursesIcon size={22} color={T.acc}/>,run:()=>setView('courses')},
  experience:{title:en?"Parents' experience":'تجربه والدین',desc:en?'Published parent experiences':'تجربه‌های منتشرشده والدین',icon:<VideoIcon size={22} color={T.acc}/>,run:()=>setView('experience')},
  licenses:{title:en?'Licenses':'مجوزها',desc:en?'Certificates and information':'مجوزها و اطلاعات مجموعه',icon:<LicensesIcon size={22} color={T.acc}/>,run:()=>setView('licenses')},
  contact:{title:en?'Contact us':'ارتباط با ما',desc:en?'Contact the support team':'ارتباط با تیم پشتیبانی',icon:<ContactIcon size={22} color={T.acc}/>,run:()=>setView('contact')},
 };
 const layout=Array.isArray(cfg?.homeLayout)&&cfg.homeLayout.length?cfg.homeLayout:[{id:'consult',show:true},{id:'courses',show:true},{id:'experience',show:true},{id:'licenses',show:true},{id:'contact',show:true}];
 const items=layout.filter((x:any)=>x?.show!==false&&all[x?.id]&&(x.id!=='licenses'||(cfg.showLicensesPage??cfg.menuVisibility?.licenses??true)!==false)).map((x:any)=>all[x.id]);
 return <main style={S.page} aria-labelledby="not-found-title">
  <Helmet><title>{en?`Page not found | ${brand}`:`صفحه پیدا نشد | ${brand}`}</title><meta name="robots" content="noindex, nofollow"/></Helmet><style>{css}</style>
  <section style={{...S.card,maxWidth:620,marginTop:28,textAlign:'center'}}>
   <div aria-hidden="true" style={{fontSize:44,fontWeight:900,color:T.acc,lineHeight:1}}>404</div>
   <h1 id="not-found-title" style={{color:T.ttl,fontSize:22,margin:'12px 0 8px'}}>{en?'Page not found':'صفحه موردنظر پیدا نشد'}</h1>
   <p style={{color:T.mut,fontSize:13.5,lineHeight:2,margin:'0 0 18px'}}>{en?'The address may be incorrect or the page may have moved.':'ممکن است آدرس اشتباه باشد یا صفحه به مسیر دیگری منتقل شده باشد.'}</p>
   {items.length>0&&<div style={{margin:'4px 0 18px',textAlign:en?'left':'right'}}><h2 style={{fontSize:16,color:T.ttl,margin:'0 0 10px'}}>{en?'Quick access':'دسترسی سریع'}</h2><div style={{display:'grid',gridTemplateColumns:'repeat(2,minmax(0,1fr))',gap:9}}>{items.map((item:any,index:number)=><button key={item.title} type="button" onClick={item.run} style={{gridColumn:items.length%2===1&&index===items.length-1?'1/-1':undefined,display:'flex',alignItems:'center',gap:9,minHeight:68,padding:'10px 11px',background:T.card,border:`1px solid ${T.brd}`,borderRadius:14,boxShadow:T.neuOut,color:T.txt,fontFamily:'inherit',textAlign:en?'left':'right',cursor:'pointer'}}><span style={{display:'grid',placeItems:'center',width:38,height:38,borderRadius:11,background:T.soft,flexShrink:0}}>{item.icon}</span><span style={{minWidth:0}}><strong style={{display:'block',fontSize:12.5,lineHeight:1.5}}>{item.title}</strong><small style={{display:'block',fontSize:10.5,color:T.mut,lineHeight:1.5}}>{item.desc}</small></span></button>)}</div></div>}
   <button type="button" style={S.btn} onClick={()=>setView('home')}>{en?'Back to home':'بازگشت به صفحه اصلی'}</button>
  </section>
 </main>;
}
