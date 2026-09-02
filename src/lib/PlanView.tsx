// نمایش «برنامه‌ها» با چارت‌بندی: عنوان‌ها بولد، جداکننده‌ها خط‌چین، بولت‌ها تورفتگی — رنگ از محیط می‌گیرد.
import type { CSSProperties } from 'react';

export function PlanView({ text, fallback, small }: { text?: string; fallback?: string; small?: boolean }) {
  const raw = String(text || '').trim();
  if (!raw) return <>{fallback || ''}</>;
  const fs = small ? 11.5 : 12.5;
  const rows = raw.split(/\r?\n/);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, fontSize: fs, lineHeight: 2 }}>
      {rows.map((ln, i) => {
        const s = ln.trim();
        if (!s) return <div key={i} style={{ height: 5 }} />;
        if (/^[-—–_=]{3,}$/.test(s)) return <div key={i} style={{ height: 1, margin: '7px 0', background: 'rgba(124,92,220,.28)' }} />;
        const st: CSSProperties = {};
        if (/^(🍽|🏃|🌳)/.test(s)) { st.fontWeight = 900; st.fontSize = fs + 1.5; if (i) st.marginTop = 6; }
        else if (/^(🥣|🍲|🌙|🍏|🚫|🎽|📅|⏱|🎯)/.test(s) || (/[:：]$/.test(s) && s.length <= 32 && !s.startsWith('•') && !s.startsWith('-'))) st.fontWeight = 800;
        else if (/^(•|-)\s/.test(s)) st.paddingInlineStart = 12;
        return <div key={i} style={st}>{s}</div>;
      })}
    </div>
  );
}
