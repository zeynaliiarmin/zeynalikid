// «برنامه‌ها» → فایل PDF با چارت‌بندی (رندر DOM؛ فارسی کاملاً سالم، بدون وابستگی سرور)
// HTMLِ ساختاری → html2canvas (فونت‌های واقعی صفحه) → jsPDF چندصفحه‌ای A4.
type PdfOpts = { title?: string; code?: string; meal?: string; sport?: string; userNotes?: string };

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function sectionHtml(emoji: string, title: string, body: string): string {
  const t = String(body || '').trim();
  if (!t) return '';
  const rows = t.split(/\r?\n/).map((ln) => {
    const s = ln.trim();
    if (!s) return '<div style="height:7px"></div>';
    if (/^[-—–_=]{3,}$/.test(s)) return '<div style="height:2px;background:#ede9fe;margin:9px 0;border-radius:2px"></div>';
    if (/^(🍽|🏃|🎽|🚫)/.test(s)) return `<div style="font-weight:900;font-size:16px;color:#5b21b6;margin-top:4px">${esc(s)}</div>`;
    if (/^(🥣|🍲|🌙|🍏|📅|⏱)/.test(s) || (/[:：]$/.test(s) && s.length <= 34 && !s.startsWith('•') && !s.startsWith('-')))
      return `<div style="font-weight:800;font-size:14.5px;margin-top:6px">${esc(s)}</div>`;
    if (/^(•|-)\s/.test(s)) return `<div style="padding-inline-start:14px;font-size:13.5px">${esc(s)}</div>`;
    return `<div style="font-size:13.5px">${esc(s)}</div>`;
  }).join('');
  return `<div style="margin-top:16px"><div style="display:flex;align-items:center;gap:8px;border-bottom:3px solid #ede9fe;padding-bottom:7px"><span style="font-size:18px;font-weight:900;color:#4c1d95">${emoji} ${esc(title)}</span></div><div style="white-space:normal;padding:8px 2px 0;line-height:2.05">${rows}</div></div>`;
}

export async function downloadPlanPdf(o: PdfOpts): Promise<void> {
  const meal = String(o.meal || '').trim();
  const sport = String(o.sport || '').trim();
  const notes = String(o.userNotes || '').trim();
  if (!meal && !sport && !notes) { alert('محتوایی برای ساخت فایل ثبت نشده است'); return; }
  const html2canvasMod = await import('html2canvas');
  const { jsPDF } = await import('jspdf');
  const W = 794; // A4 در ۹۶dpi
  const el = document.createElement('div');
  el.setAttribute('dir', 'rtl');
  el.setAttribute('lang', 'fa');
  Object.assign(el.style, {
    position: 'fixed', left: '-10000px', top: '0', width: W + 'px', boxSizing: 'border-box',
    background: '#ffffff', color: '#221f2e', padding: '40px 44px 48px', fontFamily: 'inherit',
  } as Partial<CSSStyleDeclaration>);
  el.innerHTML = `<div style="display:flex;align-items:baseline;justify-content:space-between;gap:10px;flex-wrap:wrap">`
    + `<span style="font-size:21px;font-weight:900">${esc(o.title || 'برنامه‌ها')}</span>`
    + `<span style="font-size:11.5px;color:#7a7a86">${esc([o.code, new Date().toLocaleDateString('fa-IR')].filter(Boolean).join(' · '))}</span></div>`
    + sectionHtml('🍽', 'برنامه خوراکی', meal)
    + sectionHtml('🏃', 'برنامه ورزشی', sport)
    + sectionHtml('📝', 'نکات کارشناس', notes);
  document.body.appendChild(el);
  try {
    const canvas = await html2canvasMod.default(el, { scale: 2, backgroundColor: '#ffffff', logging: false });
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
    const imgW = 210;
    const imgH = (canvas.height * imgW) / canvas.width;
    const pageH = 297;
    const data = canvas.toDataURL('image/jpeg', 0.94);
    let rendered = pageH;
    pdf.addImage(data, 'JPEG', 0, 0, imgW, imgH);
    while (rendered < imgH - 1) {
      rendered += pageH;
      pdf.addPage();
      pdf.addImage(data, 'JPEG', 0, pageH - rendered, imgW, imgH);
    }
    pdf.save(`برنامه‌ها${o.code ? '-' + String(o.code).replace(/[\\/:*?"<>|\s]/g, '-') : ''}.pdf`);
  } finally {
    el.remove();
  }
}
