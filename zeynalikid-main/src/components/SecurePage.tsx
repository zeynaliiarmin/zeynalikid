import { ReactNode, useEffect, useState } from 'react';

type SecurePageProps = {
  children: ReactNode;
  pageTitle: string;
  T: any;
  // اصلاح ۱ (مرحله ۵): پیام هشدار سفارشی — در صورت عدم ارسال، متن پیش‌فرض قبلی استفاده می‌شود
  warningMessage?: string;
};

export default function SecurePage({ children, pageTitle, T, warningMessage }: SecurePageProps) {
  const msg = warningMessage || `گرفتن اسکرین‌شات از صفحه ${pageTitle} ممنوع است.`;
  // اصلاح ۱: نمایش هشدار هم با کلیک و هم با هاور (نگه‌داشتن) روی نوار زرد پایین صفحه
  const [showWarnBadge, setShowWarnBadge] = useState(false);
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => {
      e.preventDefault();
      alert(msg);
    };
    const handleCopy = (e: ClipboardEvent) => { e.preventDefault(); alert(`کپی از صفحه ${pageTitle} مجاز نیست.`); };
    const handleCut = (e: ClipboardEvent) => e.preventDefault();
    const handleKeyDown = (e: KeyboardEvent) => {
      // جلوگیری از PrintScreen, Ctrl+S, Ctrl+P, Ctrl+U, F12
      if (
        e.key === 'PrintScreen' ||
        (e.ctrlKey && ['s','p','u','c'].includes(e.key.toLowerCase())) ||
        e.key === 'F12'
      ) {
        e.preventDefault();
        alert(`ذخیره / پرینت از صفحه ${pageTitle} ممنوع است.`);
      }
    };
    const handleVisibilityChange = () => {
      if (document.hidden) {
        // هشدار اسکرین‌شات
        try { console.warn(`Screenshot warning: ${pageTitle}`); } catch {}
        // alert مکرر آزاردهنده است، فقط یک بار در session
        const key = `zkid_ss_warn_${pageTitle}`;
        try {
          if (!sessionStorage.getItem(key)) {
            sessionStorage.setItem(key, '1');
            // نمایش غیربلاکینگ
            setTimeout(()=>alert(msg), 300);
          }
        } catch {}
      }
    };
    const handleSelectStart = (e: Event) => e.preventDefault();
    const handleDragStart = (e: DragEvent) => e.preventDefault();

    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);

    return () => {
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
    };
  }, [pageTitle, msg]);

  return (
    <div
      style={{
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
      }}
      onContextMenu={e=>e.preventDefault()}
    >
      <style>{`
        .zk-secure * {
          -webkit-user-select: none !important;
          -moz-user-select: none !important;
          -ms-user-select: none !important;
          user-select: none !important;
          -webkit-touch-callout: none !important;
        }
        .zk-secure img {
          -webkit-user-drag: none;
          pointer-events: none;
        }
        @media print {
          body * { display: none !important; }
        }
      `}</style>
      <div className="zk-secure">
        {children}
      </div>
      {/* اصلاح ۱ (مرحله ۵): نوار هشدار پایین صفحه اکنون با کلیک یا هاور (mouseenter) هم پیام کامل هشدار را نمایش می‌دهد */}
      <div
        onClick={()=>{setShowWarnBadge(true); try{alert(msg)}catch{}}}
        onMouseEnter={()=>setShowWarnBadge(true)}
        onMouseLeave={()=>setShowWarnBadge(false)}
        title={msg}
        style={{
        position:'fixed', bottom:8, left:8,
        background:`${T?.warn||'#ca8a04'}18`,
        color:T?.warn||'#ca8a04',
        border:`1px solid ${T?.warn||'#ca8a04'}`,
        borderRadius:8, padding:'6px 10px',
        fontSize:11, zIndex:9999, pointerEvents:'auto',
        opacity: showWarnBadge?1:0.9,
        cursor:'pointer',
        maxWidth: showWarnBadge?'min(320px, 80vw)':'auto',
        transition:'all .25s ease',
        lineHeight:1.7
      }}>
         {pageTitle} – محافظت‌شده{showWarnBadge&&<span style={{display:'block',marginTop:4,fontWeight:700}}>{msg}</span>}
      </div>
    </div>
  );
}

