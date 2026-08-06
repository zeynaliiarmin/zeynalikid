import { useEffect, useMemo } from 'react';

/**
 * Stage 9 — تزریق JSON-LD اسکیمای ساختاریافته در head
 * (react-helmet-async تگ script را رندر نمی‌کند؛ این کامپوننت امن و بدون تغییر منطق است)
 */
export default function JsonLd({ id, data }: { id: string; data: any }) {
  const json = useMemo(() => (typeof data === 'string' ? data : JSON.stringify(data)), [data]);
  useEffect(() => {
    let tag = document.getElementById(id) as HTMLScriptElement | null;
    if (!tag) {
      tag = document.createElement('script');
      tag.type = 'application/ld+json';
      tag.id = id;
      document.head.appendChild(tag);
    }
    tag.textContent = json;
    return () => { document.getElementById(id)?.remove(); };
  }, [id, json]);
  return null;
}
