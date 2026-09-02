// «برنامه‌ها و اطلاعات پرونده» → فایل PDF با چیدمان (رندر DOM؛ فارسی کاملاً سالم، بدون وابستگی سرور)
// HTMLِ ساختاری → html2canvas (فونت‌های واقعی صفحه) → jsPDF چندصفحه‌ای A4.
import { whoRef } from './whoGrowth';

export type PdfFormRow = { label: string; value: string };
export type PdfUsage = { instructions?: string; rows?: { name: string; lines: string[] }[] };
export type PdfReports = { followUps?: { step: number; state: string }[]; corrective?: PdfFormRow[] };
type PdfOpts = { title?: string; code?: string; meal?: string; sport?: string; userNotes?: string; form?: PdfFormRow[]; usage?: PdfUsage; reports?: PdfReports };

const esc = (s: string) => String(s || '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

function sectionHtml(emoji: string, title: string, body: string): string {
  const t = String(body || '').trim();
  if (!t) return '';
  const rows = t.split(/\r?\n/).map((ln) => {
    const s = ln.trim();
    if (!s) return '<div style="height:7px"></div>';
    if (/^[-—–_=]{3,}$/.test(s)) return '<div style="height:2px;background:#ede9fe;margin:9px 0;border-radius:2px"></div>';
    if (/^(🍽|🏃|🎽|🚫|🌳|🎯)/.test(s)) return `<div style="font-weight:900;font-size:16px;color:#5b21b6;margin-top:4px">${esc(s)}</div>`;
    if (/^(🥣|🍲|🌙|🍏|📅|⏱|🎯)/.test(s) || (/[:：]$/.test(s) && s.length <= 34 && !s.startsWith('•') && !s.startsWith('-')))
      return `<div style="font-weight:800;font-size:14.5px;margin-top:6px">${esc(s)}</div>`;
    if (/^(•|-)\s/.test(s)) return `<div style="padding-inline-start:14px;font-size:13.5px">${esc(s)}</div>`;
    return `<div style="font-size:13.5px">${esc(s)}</div>`;
  }).join('');
  return `<div style="margin-top:16px"><div style="display:flex;align-items:center;gap:8px;border-bottom:3px solid #ede9fe;padding-bottom:7px"><span style="font-size:18px;font-weight:900;color:#4c1d95">${emoji}</span><span style="font-size:15.5px;font-weight:900">${esc(title)}</span></div><div style="padding-top:8px">${rows}</div></div>`;
}

const SEC_OPEN = (emoji: string, title: string) => `<div style="margin-top:16px"><div style="display:flex;align-items:center;gap:8px;border-bottom:3px solid #ede9fe;padding-bottom:7px"><span style="font-size:18px;font-weight:900;color:#4c1d95">${emoji}</span><span style="font-size:15.5px;font-weight:900">${esc(title)}</span></div>`;

function tableHtml(rows: PdfFormRow[] | undefined): string {
  const list = (rows || []).filter((r) => r && String(r.value || '').trim());
  if (!list.length) return '';
  const trs = list.map((r, i) => `<tr><td style="padding:5px 10px;background:${i % 2 ? '#faf9ff' : '#f3f0ff'};font-weight:800;font-size:12.5px;color:#4c3d84;white-space:nowrap;border-inline-end:1px solid #ede9fe">${esc(r.label)}</td><td style="padding:5px 10px;font-size:13px">${esc(String(r.value).trim())}</td></tr>`).join('');
  return `<table style="width:100%;border-collapse:collapse;border:1px solid #ede9fe;border-radius:10px;overflow:hidden">${trs}</table>`;
}

const numOf = (v: string | undefined) => { const m = String(v || '').replace(/[۰-۹]/g, (d) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(d))).match(/\d+(?:[.,]\d+)?/); return m ? parseFloat(m[0].replace(',', '.')) : NaN; };

function growthChartHtml(form: PdfFormRow[] | undefined): string {
  const get = (kw: RegExp) => { const r = (form || []).find((x) => kw.test(x.label)); return r ? r.value : ''; };
  const age = numOf(get(/سن/)); const h = numOf(get(/قد/)); const w = numOf(get(/وزن/));
  const sex = /دختر|girl/i.test(get(/جنسیت/)) ? 'girl' : /پسر|boy/i.test(get(/جنسیت/)) ? 'boy' : 'unknown';
  if (!Number.isFinite(age) || (!Number.isFinite(h) && !Number.isFinite(w))) return '';
  const ref = whoRef(age, sex); if (!ref) return '';
  const bar = (label: string, val: number, rv: number, unit: string) => {
    if (!Number.isFinite(val)) return '';
    const max = Math.max(val, rv) * 1.12 || 1;
    const wpct = Math.min(100, (val / max) * 100), rpct = Math.min(100, (rv / max) * 100);
    const delta = Math.round((val - rv) * 10) / 10;
    const col = delta >= 0 ? '#15803d' : delta > -2 ? '#b45309' : '#b91c1c';
    const dl = delta >= 0 ? `+${delta}` : String(delta);
    return `<div style="margin:8px 0 12px"><div style="display:flex;justify-content:space-between;font-size:12.5px;font-weight:800"><span>${esc(label)}</span><span style="color:${col}">${val} ${unit} · نسبت به میانگین سن: ${dl}</span></div>`
      + `<div style="height:15px;background:#f3f0ff;border-radius:8px;margin-top:4px;position:relative"><div style="position:absolute;inset:0 auto 0 0${''};width:${wpct}%;background:linear-gradient(90deg,#7c3aed,#a78bfa);border-radius:8px"></div></div>`
      + `<div style="height:9px;background:#eef2ff;border-radius:6px;margin-top:3px;position:relative"><div style="position:absolute;inset:0 auto 0 0;width:${rpct}%;background:#c4b5fd;border-radius:6px"></div><span style="position:absolute;top:-2px;left:calc(${rpct}% + 5px);font-size:9.5px;color:#6d5aa8;white-space:nowrap">میانگین ${rv}</span></div></div>`;
  };
  const body = bar('قد کودک', h, ref.h, 'سانتی‌متر') + bar('وزن کودک', w, ref.w, 'کیلوگرم');
  if (!body) return '';
  return SEC_OPEN('📈', 'نمودار رشد در برابر میانگین سنی (WHO)') + `<div style="padding-top:6px">${body}</div></div>`;
}

function usageHtml(u: PdfUsage | undefined): string {
  if (!u) return '';
  const rows = (u.rows || []).filter((r) => r && (r.lines || []).length);
  const instr = String(u.instructions || '').trim();
  if (!rows.length && !instr) return '';
  const inner = rows.map((r) => `<div style="margin-bottom:7px"><div style="font-weight:900;font-size:13.5px">${esc(r.name)}</div>${(r.lines || []).map((ln) => `<div style="font-size:13px;padding-inline-start:10px">${esc(ln)}</div>`).join('')}</div>`).join('')
    + (instr ? `<div style="font-size:13px;white-space:pre-wrap;background:#f8f7ff;border:1px solid #ede9fe;border-radius:10px;padding:8px 10px;margin-top:4px">${esc(instr)}</div>` : '');
  return SEC_OPEN('💊', 'طریقهٔ مصرف محصولات') + `<div style="padding-top:8px">${inner}</div></div>`;
}

function reportsHtml(r: PdfReports | undefined): string {
  if (!r) return '';
  const fu = (r.followUps || []).filter(Boolean);
  const co = (r.corrective || []).filter((x) => x && String(x.value || '').trim());
  if (!fu.length && !co.length) return '';
  const inner = (fu.length ? fu.map((f) => `<div style="font-size:13px;margin-bottom:3px">• مرحلهٔ ${f.step}: <b>${esc(f.state)}</b></div>`).join('') : '')
    + (co.length ? `<div style="margin-top:6px">${tableHtml(co)}</div>` : '');
  return SEC_OPEN('📊', 'گزارش‌ها و پیگیری‌ها') + `<div style="padding-top:8px">${inner}</div></div>`;
}

export async function downloadPlanPdf(o: PdfOpts): Promise<void> {
  const meal = String(o.meal || '').trim();
  const sport = String(o.sport || '').trim();
  const notes = String(o.userNotes || '').trim();
  const form = (o.form || []).filter((r) => r && String(r.value || '').trim());
  if (!meal && !sport && !notes && !form.length) { alert('محتوایی برای ساخت فایل ثبت نشده است'); return; }
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
    + usageHtml(o.usage)
    + sectionHtml('🍽', 'برنامه خوراکی', meal)
    + sectionHtml(sport.startsWith('🌳') ? '🌳' : '🏃', sport.startsWith('🌳') ? 'فعالیت روزانه (زیر ۶ سال)' : 'برنامه ورزشی', sport)
    + (form.length ? SEC_OPEN('📋', 'اطلاعات ثبت‌شده') + `<div style="padding-top:8px">${tableHtml(form)}</div></div>` : '')
    + growthChartHtml(o.form)
    + reportsHtml(o.reports)
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
    pdf.save(`${form.length || o.usage || o.reports ? 'اطلاعات' : 'برنامه‌ها'}${o.code ? '-' + String(o.code).replace(/[\\/:*?"<>|\s]/g, '-') : ''}.pdf`);
  } finally {
    el.remove();
  }
}
