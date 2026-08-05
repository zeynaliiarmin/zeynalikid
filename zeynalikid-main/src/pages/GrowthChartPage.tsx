import React from 'react';
import GrowthChart from '../components/GrowthChart';

export default function GrowthChartPage({ app }: { app: any }) {
  const { T, S, css, lang, setView } = app;

  // Demo data (in real use would come from profile / submissions)
  const demoData = [
    { age: 0, height: 50, weight: 3.4 },
    { age: 3, height: 61, weight: 6.2 },
    { age: 6, height: 68, weight: 8.1 },
    { age: 12, height: 76, weight: 10.4 },
    { age: 18, height: 82, weight: 11.7 },
  ];

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, maxWidth: 520 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <button onClick={() => setView('profile')} style={{ ...S.btnGhost, padding: '8px 14px', minHeight: 40 }}>← {lang === 'en' ? 'Back' : 'بازگشت'}</button>
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ttl }}>{lang === 'en' ? 'Growth Tracking' : 'پیگیری رشد'}</div>
        </div>

        <GrowthChart T={T} lang={lang} data={demoData} childName="آرمین" />

        <div style={{ marginTop: 16, fontSize: 12, color: T.mut, lineHeight: 1.6 }}>
          {lang === 'en' 
            ? 'Data is compared to WHO child growth standards. This is for awareness only.'
            : 'داده‌ها بر اساس استانداردهای رشد کودک WHO مقایسه می‌شوند. این فقط برای آگاهی است.'}
        </div>
      </div>
    </div>
  );
}
