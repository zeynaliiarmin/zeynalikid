import React from 'react';

interface GrowthChartProps {
  T: any;
  lang: 'fa' | 'en';
  data?: Array<{ age: number; height?: number; weight?: number }>;
  childName?: string;
}

// WHO percentiles (simplified standard values for illustration — ages in months, values in cm/kg)
// These are approximate standard WHO values for boys/girls average for visual demo.
const WHO = {
  height: {
    P3:  [45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100],
    P15: [47, 52, 57, 62, 67, 72, 77, 82, 87, 92, 97, 102],
    P50: [50, 55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105],
    P85: [53, 58, 63, 68, 73, 78, 83, 88, 93, 98, 103, 108],
    P97: [55, 60, 65, 70, 75, 80, 85, 90, 95, 100, 105, 110],
  },
  weight: {
    P3:  [2.5, 4, 5.5, 7, 8, 9, 10, 11, 12, 13, 14, 15],
    P15: [3, 4.5, 6, 7.5, 8.8, 10, 11, 12, 13, 14, 15, 16],
    P50: [3.5, 5.5, 7, 8.5, 10, 11.5, 12.5, 14, 15, 16, 17, 18],
    P85: [4.2, 6.5, 8, 9.5, 11, 12.5, 14, 15.5, 17, 18, 19, 20],
    P97: [4.8, 7, 9, 10.5, 12, 13.5, 15, 16.5, 18, 19.5, 21, 22],
  }
};

const AGES = [0, 1, 2, 3, 4, 6, 8, 10, 12, 15, 18, 24]; // months

export default function GrowthChart({ T, lang, data = [], childName = '' }: GrowthChartProps) {
  const [mode, setMode] = React.useState<'height' | 'weight' | 'bmi'>('height');

  const chartData = mode === 'height' ? WHO.height : WHO.weight;
  const yLabel = mode === 'height' ? (lang === 'en' ? 'Height (cm)' : 'قد (سانتی‌متر)') : (lang === 'en' ? 'Weight (kg)' : 'وزن (کیلوگرم)');
  const xLabel = lang === 'en' ? 'Age (months)' : 'سن (ماه)';

  // Simple SVG line chart
  const width = 320;
  const height = 180;
  const padding = { top: 20, right: 10, bottom: 30, left: 35 };

  const maxY = Math.max(...Object.values(chartData).flat()) * 1.1;
  const minY = Math.min(...Object.values(chartData).flat()) * 0.9;

  const scaleX = (i: number) => padding.left + (i / (AGES.length - 1)) * (width - padding.left - padding.right);
  const scaleY = (val: number) => padding.top + (1 - (val - minY) / (maxY - minY)) * (height - padding.top - padding.bottom);

  const percentiles = ['P3', 'P15', 'P50', 'P85', 'P97'] as const;
  const colors = ['#cbd5e1', '#94a3b8', '#64748b', '#94a3b8', '#cbd5e1'];

  // Sample user points (use real data if provided, else demo)
  const userPoints = data.length > 0 ? data : [
    { age: 0, height: 50, weight: 3.5 },
    { age: 6, height: 68, weight: 8 },
    { age: 12, height: 76, weight: 10.5 },
    { age: 18, height: 82, weight: 11.8 },
  ];

  return (
    <div style={{ background: T.card, border: `1px solid ${T.brd}`, borderRadius: 18, padding: 14, boxShadow: T.neuOut }}>
      {/* Tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 10 }}>
        {(['height', 'weight', 'bmi'] as const).map(m => (
          <button
            key={m}
            onClick={() => setMode(m)}
            style={{
              flex: 1,
              padding: '8px 10px',
              borderRadius: 999,
              border: mode === m ? `2px solid ${T.acc}` : `1px solid ${T.brd}`,
              background: mode === m ? `${T.acc}10` : T.card,
              color: mode === m ? T.accText : T.mut,
              fontSize: 12,
              fontWeight: 700,
              minHeight: 40
            }}
          >
            {m === 'height' ? (lang === 'en' ? 'Height by Age' : 'قد بر حسب سن') : m === 'weight' ? (lang === 'en' ? 'Weight by Age' : 'وزن بر حسب سن') : (lang === 'en' ? 'BMI (soon)' : 'شاخص توده بدنی (به‌زودی)')}
          </button>
        ))}
      </div>

      {/* Chart */}
      <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} style={{ overflow: 'visible' }}>
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((p, i) => {
          const y = padding.top + p * (height - padding.top - padding.bottom);
          return <line key={i} x1={padding.left} y1={y} x2={width - padding.right} y2={y} stroke={T.brd} strokeWidth="1" />;
        })}

        {/* Percentile curves */}
        {percentiles.map((p, idx) => {
          const points = chartData[p].map((val, i) => `${scaleX(i)},${scaleY(val)}`).join(' ');
          return (
            <polyline
              key={p}
              points={points}
              fill="none"
              stroke={colors[idx]}
              strokeWidth={p === 'P50' ? 2.5 : 1.5}
              strokeDasharray={p === 'P50' ? '0' : '3 2'}
            />
          );
        })}

        {/* User data line + points */}
        {userPoints.length > 1 && (
          <polyline
            points={userPoints.map((d, i) => {
              const val = mode === 'height' ? (d.height || 0) : (d.weight || 0);
              const ageIndex = Math.min(Math.floor(d.age / 2), AGES.length - 1);
              return `${scaleX(ageIndex)},${scaleY(val)}`;
            }).join(' ')}
            fill="none"
            stroke={T.acc}
            strokeWidth="3"
            strokeLinecap="round"
          />
        )}

        {userPoints.map((d, i) => {
          const val = mode === 'height' ? (d.height || 0) : (d.weight || 0);
          const ageIndex = Math.min(Math.floor(d.age / 2), AGES.length - 1);
          return (
            <g key={i}>
              <circle cx={scaleX(ageIndex)} cy={scaleY(val)} r="5" fill={T.acc} stroke="#fff" strokeWidth="2" />
              <text x={scaleX(ageIndex)} y={scaleY(val) - 10} fontSize="9" fill={T.txt} textAnchor="middle">
                {val}
              </text>
            </g>
          );
        })}

        {/* Axes labels */}
        <text x={width / 2} y={height - 6} fontSize="10" fill={T.mut} textAnchor="middle">{xLabel}</text>
        <text x={12} y={height / 2} fontSize="10" fill={T.mut} transform={`rotate(-90 12 ${height / 2})`} textAnchor="middle">{yLabel}</text>
      </svg>

      {/* Legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginTop: 6, fontSize: 10 }}>
        {percentiles.map((p, i) => (
          <span key={p} style={{ display: 'flex', alignItems: 'center', gap: 4, color: T.mut }}>
            <span style={{ width: 12, height: 2, background: colors[i], display: 'inline-block' }} />
            {p}
          </span>
        ))}
        <span style={{ display: 'flex', alignItems: 'center', gap: 4, color:T.accText, fontWeight: 700 }}>
          <span style={{ width: 12, height: 2, background: T.acc, display: 'inline-block' }} />
          {lang === 'en' ? 'Your child' : 'فرزند شما'}
        </span>
      </div>

      {/* Responsible disclaimer */}
      <div style={{ fontSize: 10, color: T.mut, marginTop: 10, padding: '6px 8px', background: T.soft, borderRadius: 8, lineHeight: 1.4 }}>
        {lang === 'en' 
          ? 'This chart is for visual comparison only based on WHO standards and your provided data. It does not replace professional medical advice or diagnosis.'
          : 'این نمودار صرفاً برای مقایسه بصری بر اساس استانداردهای WHO و داده‌های شما است و جایگزین تشخیص یا مشاوره پزشکی متخصص نیست.'}
      </div>
    </div>
  );
}
