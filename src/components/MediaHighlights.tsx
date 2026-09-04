// کامپوننت مشترک برای:
//  ۱) رندر «هایلایت‌های رنگی» (جملات جلب‌توجه) که در پنل مدیریت برای هر محتوا تعریف می‌شود.
//  ۲) رندر «متن‌فرمت‌شده» (بولد/ایتالیک/زیرخط/لینک) از توضیحات/متن کامل.
// بدون استفاده از dangerouslySetInnerHTML برای امنیت؛ فقط با پارس ساده متن و ساخت عناصر React.

import React from 'react';

export type HighlightItem = { id?: string; text?: string; color?: string };

// رنگ‌های پاستیلی به‌همراه رنگِ تیره مناسب برای خوانایی داخل هایلایت
const HIGHLIGHT_TEXT_COLORS: Record<string, string> = {
  '#DCFCE7': '#14532D', // سبز ملایم
  '#FEF9C3': '#713F12', // زرد ملایم
  '#FFE4E6': '#9F1239', // صورتی ملایم
  '#DBEAFE': '#1E3A8A', // آبی ملایم
  '#FFEDD5': '#7C2D12', // نارنجی ملایم
  '#F3E8FF': '#581C87', // بنفش ملایم
  '#CCFBF1': '#134E4A', // فیروزه‌ای ملایم
  '#E2E8F0': '#1E293B', // خاکستری ملایم
};

export function highlightTextColor(color?: string): string {
  return (color && HIGHLIGHT_TEXT_COLORS[color]) || '#14532D';
}

// رندر هایلایت‌های یک آیتم (آرایه highlights)
export function Highlights({ highlights, style }: { highlights?: HighlightItem[] | null; style?: React.CSSProperties }) {
  const list = (highlights || []).filter((h) => String(h?.text || '').trim());
  if (!list.length) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, margin: '10px 0', ...style }}>
      {list.map((h, i) => {
        const bg = h.color || '#DCFCE7';
        return (
          <div
            key={h.id || i}
            style={{
              background: bg,
              borderInlineStart: `4px solid ${highlightTextColor(bg)}`,
              borderRadius: 12,
              padding: '11px 14px',
              fontSize: 13.5,
              fontWeight: 700,
              lineHeight: 1.9,
              color: highlightTextColor(bg),
            }}
          >
            {h.text}
          </div>
        );
      })}
    </div>
  );
}

// ── متن‌فرمت‌شده (بولد/ایتالیک/زیرخط/لینک) ──────────────────────────
// نشانه‌ها:
//   **متن**  → بولد
//   *متن*    → ایتالیک
//   __متن__  → زیرخط
//   [متن](https://...) → لینک
function parseInline(text: string, keyPrefix: string, fontSize?: number): React.ReactNode[] {
  const nodes: React.ReactNode[] = [];
  // ابتدا لینک‌ها را جدا کنیم تا نشانه‌های داخلشان دوباره پارس نشوند
  const linkRe = /\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g;
  let lastIndex = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  const segments: { type: 'link' | 'text'; text: string; href?: string }[] = [];
  while ((m = linkRe.exec(text)) !== null) {
    if (m.index > lastIndex) segments.push({ type: 'text', text: text.slice(lastIndex, m.index) });
    segments.push({ type: 'link', text: m[1], href: m[2] });
    lastIndex = m.index + m[0].length;
  }
  if (lastIndex < text.length) segments.push({ type: 'text', text: text.slice(lastIndex) });
  if (!segments.length) segments.push({ type: 'text', text });

  for (const seg of segments) {
    if (seg.type === 'link') {
      nodes.push(
        <a key={`${keyPrefix}-l${k++}`} href={seg.href} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--zk-primary, #0F766E)', textDecoration: 'underline', fontWeight: 700 }}>
          {seg.text}
        </a>,
      );
      continue;
    }
    // پارس بولد/ایتالیک/زیرخط در متن
    let rest = seg.text;
    let idx = 0;
    const inlineRe = /\*\*([^*]+)\*\*|\*([^*]+)\*|__([^_]+)__/g;
    let mm: RegExpExecArray | null;
    while ((mm = inlineRe.exec(rest)) !== null) {
      if (mm.index > idx) nodes.push(<React.Fragment key={`${keyPrefix}-t${k++}`}>{rest.slice(idx, mm.index)}</React.Fragment>);
      const style: React.CSSProperties = {};
      if (mm[1] !== undefined) style.fontWeight = 800;
      if (mm[2] !== undefined) style.fontStyle = 'italic';
      if (mm[3] !== undefined) style.textDecoration = 'underline';
      nodes.push(
        <strong key={`${keyPrefix}-s${k++}`} style={style}>{mm[1] ?? mm[2] ?? mm[3]}</strong>,
      );
      idx = mm.index + mm[0].length;
    }
    if (idx < rest.length) nodes.push(<React.Fragment key={`${keyPrefix}-r${k++}`}>{rest.slice(idx)}</React.Fragment>);
  }
  return nodes;
}

// رندر متن چندسطری با پشتیبانی از هایلایت داخلی [*...*] در انتهای هر پاراگراف
export function RichText({ text, textEn, lang, fontSize }: { text?: string; textEn?: string; lang?: string; fontSize?: number }) {
  const en = lang === 'en';
  const value = String(en ? (textEn || text) : (text || ''));
  if (!value.trim()) return null;
  const paragraphs = value.split(/\n+/).filter(Boolean);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {paragraphs.map((p, i) => (
        <p key={i} style={{ fontSize: fontSize || 13.5, lineHeight: 1.85, margin: 0, color: 'var(--zk-text-muted)', whiteSpace: 'pre-wrap' }}>
          {parseInline(p, `p${i}`, fontSize)}
        </p>
      ))}
    </div>
  );
}
