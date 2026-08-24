import type { ReactNode } from 'react';

type SecurePageProps={children:ReactNode;pageTitle:string;T:any;warningMessage?:string};

/**
 * A respectful privacy notice, not fake DRM. Browser key blocking and disabled
 * selection cannot prevent screenshots, but they do harm accessibility and mobile UX.
 */
export default function SecurePage({children,pageTitle,T,warningMessage}:SecurePageProps){
 const message=warningMessage||`محتوای صفحه ${pageTitle} با رضایت صاحبان محتوا منتشر شده است؛ لطفاً حریم خصوصی آن‌ها را رعایت کنید.`;
 return <div style={{position:'relative'}}><div>{children}</div><aside role="note" style={{margin:'14px auto 0',maxWidth:760,padding:'10px 12px',borderRadius:12,background:T?.soft||'#FEF3C7',border:`1px solid ${T?.brd||'#F59E0B55'}`,color:T?.txt||'#713F12',fontSize:11.5,lineHeight:1.8,textAlign:'center'}}>{message}</aside></div>;
}
