// کامپوننت «افزودن دسته‌جمعی استوری» — در ماژول مستقل (خارج از بدنهٔ AdminPanel)
// ⚠️ تعریف این کامپوننت داخل بدنهٔ AdminPanel باعث می‌شد با هر رندر مجدد پنل، هویت
// کامپوننت عوض شود و React آن را unmount/remount کند → متن تایپ/کپی‌شده پاک می‌شد.
// به همین دلیل اینجا در سطح ماژول تعریف شده تا هویت آن بین رندرها پایدار بماند.
import { useState } from 'react';
import { extractImageLinkList } from '../utils/mediaInput';

export default function BulkStoryAdder({ T, S, AdminBtn, onAdd }: { T: any; S: any; AdminBtn: () => any; onAdd: (internalLinks: string[], externalLinks: string[]) => void }) {
  const [internalText, setInternalText] = useState('');
  const [externalText, setExternalText] = useState('');
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const add = () => {
   const intLinks = extractImageLinkList(internalText);
   const extLinks = extractImageLinkList(externalText);
   if (!intLinks.length && !extLinks.length) { setErr('هیچ لینک معتبری پیدا نشد. لینک‌ها باید با https:// شروع شوند.'); setNote(''); return; }
   const count = Math.max(intLinks.length, extLinks.length);
   onAdd(intLinks, extLinks);
   setErr('');
   setNote(`${count} استوری ساخته شد.`);
   setInternalText(''); setExternalText('');
   window.setTimeout(() => setNote(''), 4000);
  };
  return (
   <details style={{ marginTop: 10, border: `1px dashed ${T.acc || '#0f766e'}55`, borderRadius: 10, padding: 8, background: T.card }}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12, color: T.acc }}>+ افزودن دسته‌جمعی استوری‌ها (کپی همه لینک‌ها یک‌جا)</summary>
    <div style={{ marginTop: 10 }}>
     <p style={{ fontSize: 10.5, color: T.mut, lineHeight: 1.8, margin: '0 0 8px' }}>
      همه لینک‌ها را اینجا بچسبانید؛ هر لینک یک استوری می‌شود. لینک‌ها می‌توانند با خط جدید، کاما یا فاصله جدا شده باشند؛ تگ <span dir="ltr">&lt;img src="…"&gt;</span> هم پذیرفته می‌شود. اگر فقط یکی از دو فیلد را پر کنید، همان لینک برای هر دو حالت (VPN روشن/خاموش) استفاده می‌شود؛ اگر هر دو را پر کنید، به‌ترتیب خط‌به‌خط با هم جفت می‌شوند.
     </p>
     <label style={S.lbl}>لینک‌های داخلی — VPN خاموش</label>
     <textarea dir="ltr" rows={7} value={internalText} onChange={(e) => setInternalText(e.target.value)} style={{ ...S.ta, fontFamily: 'monospace', fontSize: 11.5, marginBottom: 8, minHeight: 90 }} placeholder={"https://i.imageupload.app/2aa856227ada888997f3.jpeg\nhttps://i.imageupload.app/xxx.jpeg"} />
     <label style={S.lbl}>لینک‌های خارجی — VPN روشن (اختیاری)</label>
     <textarea dir="ltr" rows={7} value={externalText} onChange={(e) => setExternalText(e.target.value)} style={{ ...S.ta, fontFamily: 'monospace', fontSize: 11.5, marginBottom: 8, minHeight: 90 }} placeholder={"https://cdn.imgurl.ir/uploads/a.webp\nhttps://cdn.imgurl.ir/uploads/b.webp"} />
     <button type="button" style={AdminBtn()} onClick={add}>ساخت استوری‌ها</button>
     {err && <div style={{ fontSize: 11, color: T.err, marginTop: 6 }}>{err}</div>}
     {note && <div style={{ fontSize: 11, color: T.ok, marginTop: 6, fontWeight: 800 }}>{note}</div>}
    </div>
   </details>
  );
}
