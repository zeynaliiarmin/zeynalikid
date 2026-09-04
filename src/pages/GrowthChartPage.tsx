import { useAppContext } from '../app/AppContext';
import React from 'react';
import GrowthChart from '../components/GrowthChart';
import PublicBackButton from '../components/PublicBackButton';

export default function GrowthChartPage(){
 const app=useAppContext();
  const { T, S, css, lang, course, fd } = app;

  const childAge = +(course?.childInfo?.age || fd?.age || 2);
  const childHeight = +(course?.childInfo?.height || fd?.height || 50);
  const childWeight = +(course?.childInfo?.weight || fd?.weight || 3.5);
  const childName = course?.childInfo?.pName || fd?.pName || (lang === 'en' ? 'Your child' : 'فرزند شما');

  // Real or dynamic data based on current child profile
  const userGrowthData = [
    { age: 0, height: 50, weight: 3.5 },
    { age: childAge, height: childHeight, weight: childWeight },
  ];

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, maxWidth: 520 }}>
        <div className="zk-public-title-row" dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ marginBottom: 12 }}>
          <PublicBackButton lang={lang === 'en' ? 'en' : 'fa'} fallback="/profile" />
          <h1 style={{ flex: 1, minWidth: 0, margin: 0, fontSize: 17, fontWeight: 800, color: T.ttl }}>{lang === 'en' ? 'Growth Tracking' : 'پیگیری رشد'}</h1>
        </div>

        <GrowthChart T={T} lang={lang} data={userGrowthData} childName={childName} />

        <div style={{ marginTop: 16, fontSize: 12, color: T.mut, lineHeight: 1.6 }}>
          {lang === 'en' 
            ? 'Data is compared to WHO child growth standards. This is for awareness only.'
            : 'داده‌ها بر اساس استانداردهای رشد کودک WHO مقایسه می‌شوند. این فقط برای آگاهی است.'}
        </div>
      </div>
    </div>
  );
}
