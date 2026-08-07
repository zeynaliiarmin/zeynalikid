import React from 'react';

export interface DailyTipBarProps {
  cfg: any;
  T: any;
  lang: 'fa' | 'en';
}

export default function DailyTipBar({ cfg, T, lang }: DailyTipBarProps) {
  const tips = cfg?.dailyTips || [];
  if (!tips.length) return null;

  const tipIndex = Math.floor(Date.now() / 86400000) % tips.length;
  const tip = tips[tipIndex];
  if (!tip) return null;

  const text = lang === 'en' ? tip.en || tip.fa : tip.fa;
  const isFa = lang === 'fa';

  return (
    <div
      style={{
        background: `${T.acc}0D`,
        [isFa ? 'borderRight' : 'borderLeft']: `3px solid ${T.acc}`,
        borderRadius: 12,
        padding: '12px 16px',
        fontSize: 13,
        lineHeight: 1.9,
        color: T.txt,
        fontFamily: "'Vazirmatn', Tahoma, Arial, sans-serif",
        margin: '18px 0',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
        <svg
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke={T.acc}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M9 18h6M10 22h4M12 2a7 7 0 0 0-4 12.7V17h8v-2.3A7 7 0 0 0 12 2z" />
        </svg>
        <strong style={{ fontSize: 13, color: T.ttl, fontWeight: 800 }}>
          {isFa ? 'نکته روزانه' : 'Daily Tip'}
        </strong>
      </div>
      <div style={{ fontSize: 13, color: T.txt }}>{text}</div>
    </div>
  );
}
