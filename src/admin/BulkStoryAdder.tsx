// کامپوننت «افزودن دسته‌جمعی استوری» — در ماژول مستقل (خارج از بدنهٔ AdminPanel)
// ⚠️ تعریف این کامپوننت داخل بدنهٔ AdminPanel باعث می‌شد با هر رندر مجدد پنل، هویت
// کامپوننت عوض شود و React آن را unmount/remount کند → متن تایپ/کپی‌شده پاک می‌شد.
// به همین دلیل اینجا در سطح ماژول تعریف شده تا هویت آن بین رندرها پایدار بماند.
//
// متن فیلدها به‌صورت کنترل‌شده از والد (سطح AdminPanel) می‌آید تا دکمهٔ «ذخیره هایلایت‌ها»
// بتواند متن باقی‌مانده را به اسلایدهای تکی تبدیل کند.
import { useState } from 'react';
import { extractImageLinkList } from '../utils/mediaInput';

export default function BulkStoryAdder({ T, S, AdminBtn, internalText, externalText, onInternalChange, onExternalChange, onBuild }: {
  T: any; S: any; AdminBtn: () => any;
  internalText: string; externalText: string;
  onInternalChange: (v: string) => void; onExternalChange: (v: string) => void;
  onBuild: (internalLinks: string[], externalLinks: string[]) => void;
}) {
  const [note, setNote] = useState('');
  const [err, setErr] = useState('');
  const add = () => {
   const intLinks = extractImageLinkList(internalText);
   const extLinks = extractImageLinkList(externalText);
   if (!intLinks.length && !extLinks.length) { setErr('هیچ لینک معتبری پیدا نشد. لینک‌ها باید با https:// شروع شوند.'); setNote(''); return; }
   const count = Math.max(intLinks.length, extLinks.length);
   onBuild(intLinks, extLinks);
   setErr('');
   setNote(`${count} اسلاید ساخته شد. با «ذخیره هایلایت‌ها» در بخش استوری‌ها ذخیره می‌شوند.`);
   window.setTimeout(() => setNote(''), 4000);
  };
  return (
   <details style={{ marginTop: 10, border: `1px dashed ${T.acc || '#0f766e'}55`, borderRadius: 10, padding: 8, background: T.card }}>
    <summary style={{ cursor: 'pointer', fontWeight: 800, fontSize: 12, color:T.accText }}>+ افزودن دسته‌جمعی استوری‌ها (کپی همه لینک‌ها یک‌جا)</summary>
    <div style={{ marginTop: 10 }}>
     <p style={{ fontSize: 10.5, color: T.mut, lineHeight: 1.8, margin: '0 0 8px' }}>
      همه لینک‌ها یا کدهای HTML را اینجا بچسبانید؛ هر لینک/کد، یک اسلاید استوری می‌شود. لینک‌ها می‌توانند با خط جدید، کاما یا فاصله جدا شده باشند؛ تگ <span dir="ltr">&lt;img src="…"&gt;</span> هم پذیرفته می‌شود. اگر فقط یکی از دو فیلد را پر کنید، همان لینک برای هر دو حالت (VPN روشن/خاموش) استفاده می‌شود؛ اگر هر دو را پر کنید، به‌ترتیب خط‌به‌خط با هم جفت می‌شوند. بعد از زدن «ذخیره هایلایت‌ها»، اسلایدها در بخش «استوری‌ها» به‌صورت تکی ساخته و قابل ویرایش/جابه‌جایی می‌شوند.
     </p>
     <label style={S.lbl}>لینک‌های داخلی — VPN خاموش</label>
     <textarea dir="ltr" rows={7} value={internalText} onChange={(e) => onInternalChange(e.target.value)} style={{ ...S.ta, fontFamily: 'monospace', fontSize: 11.5, marginBottom: 8, minHeight: 90 }} placeholder={"https://i.imageupload.app/2aa856227ada888997f3.jpeg\nhttps://i.imageupload.app/xxx.jpeg"} />
     <label style={S.lbl}>لینک‌های خارجی — VPN روشن (اختیاری)</label>
     <textarea dir="ltr" rows={7} value={externalText} onChange={(e) => onExternalChange(e.target.value)} style={{ ...S.ta, fontFamily: 'monospace', fontSize: 11.5, marginBottom: 8, minHeight: 90 }} placeholder={"https://cdn.imgurl.ir/uploads/a.webp\nhttps://cdn.imgurl.ir/uploads/b.webp"} />
     <button type="button" style={AdminBtn()} onClick={add}>ساخت اسلایدها (پیش‌نمایش)</button>
     {err && <div style={{ fontSize: 11, color: T.err, marginTop: 6 }}>{err}</div>}
     {note && <div style={{ fontSize: 11, color: T.ok, marginTop: 6, fontWeight: 800 }}>{note}</div>}
    </div>
   </details>
  );
}
