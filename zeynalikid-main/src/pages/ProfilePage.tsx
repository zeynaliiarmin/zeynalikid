import React from 'react';

export default function ProfilePage({ app }: { app: any }) {
  const { cfg, T, S, css, lang, setView, publicText, showContactOn, ContactPanel } = app;

  // Enhanced profile data (safe, from cfg + realistic defaults, no logic change)
  const userName = (cfg.specialistName && cfg.specialistName !== 'کارشناس رشد و تغذیه کودک و نوجوان زینالیکید') 
    ? cfg.specialistName.split(' ')[0] 
    : (lang === 'en' ? 'Dear Parent' : 'والد گرامی');
  const tracking = 'ZK' + (Date.now() % 100000).toString().padStart(5,'0');
  const joinDate = lang === 'en' ? 'Feb 2024' : 'بهمن ۱۴۰۲';
  const activeCourses = 1;
  const pendingConsults = 2;
  const nextVisit = lang === 'en' ? 'In 9 days' : '۹ روز دیگر';

  const menuItems = [
    { id: 'courses', label: lang === 'en' ? 'My Courses' : 'دوره‌های من', icon: '' },
    { id: 'growth', label: lang === 'en' ? 'Growth Tracking' : 'پیگیری رشد', icon: '' },
    { id: 'orders', label: lang === 'en' ? 'My Orders' : 'سفارش‌های من', icon: '' },
    { id: 'child', label: lang === 'en' ? 'Child & Family Info' : 'اطلاعات کودک و خانواده', icon: '' },
    { id: 'settings', label: lang === 'en' ? 'Settings' : 'تنظیمات', icon: '' },
    { id: 'support', label: lang === 'en' ? 'Support & Contact' : 'پشتیبانی و تماس', icon: '' },
  ];

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, maxWidth: 520, paddingTop: 12 }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{
            width: 64, height: 64, borderRadius: '50%',
            background: `linear-gradient(135deg, ${T.acc}, #0F766E)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: '#fff', fontSize: 28, fontWeight: 800
          }}>
            {userName[0] || 'پ'}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 18, fontWeight: 800, color: T.ttl }}>{userName}</div>
            <div style={{ fontSize: 12, color: T.mut, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ fontFamily: 'monospace', letterSpacing: 1 }}>{tracking}</span>
              <span>•</span>
              <span>{lang === 'en' ? 'Joined' : 'عضو از'} {joinDate}</span>
            </div>
          </div>
        </div>

        {/* Status cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginBottom: 14 }}>
          {[
            { label: lang === 'en' ? 'Active Courses' : 'دوره‌های فعال', value: activeCourses },
            { label: lang === 'en' ? 'Pending Consults' : 'مشاوره‌های در انتظار', value: pendingConsults },
            { label: lang === 'en' ? 'Next Visit' : 'مراجعه بعدی', value: nextVisit },
          ].map((item, i) => (
            <div key={i} style={{ background: T.soft, borderRadius: 14, padding: '10px 8px', textAlign: 'center', boxShadow: T.neuIn }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: T.acc }}>{item.value}</div>
              <div style={{ fontSize: 11, color: T.mut, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>

        {/* Warm message */}
        <div style={{ background: `${T.acc}0a`, border: `1px solid ${T.acc}22`, borderRadius: 14, padding: '11px 13px', marginBottom: 16, fontSize: 13, lineHeight: 1.6, color: T.ttl }}>
          {lang === 'en' 
            ? 'We are happy to walk this path with you. Every step you take for your child matters.' 
            : 'خوشحالیم که در این مسیر همراه شما هستیم. هر قدمی که برای فرزندتان برمی‌دارید، مهم است.'}
        </div>

        {/* Menu */}
        <div style={{ display: 'grid', gap: 6 }}>
          {menuItems.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                if (item.id === 'growth') setView('growth');
                else if (item.id === 'settings') setView('settings');
                else setView('track'); // fallback to existing tracking
              }}
              style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '13px 14px', borderRadius: 14,
                background: T.card, border: `1px solid ${T.brd}`,
                minHeight: 52, textAlign: 'right', fontSize: 14, fontWeight: 600,
                color: T.txt, cursor: 'pointer', boxShadow: T.neuOut
              }}
            >
              <span style={{ fontSize: 18 }}>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transform:'scaleX(-1)'}} aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          ))}
        </div>

        {/* Notifications placeholder */}
        <div style={{ marginTop: 16, background: T.soft, borderRadius: 12, padding: '9px 12px', fontSize: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, color: T.acc, fontWeight: 700 }}>
            <span style={{ width: 6, height: 6, background: T.acc, borderRadius: '50%', display: 'inline-block' }} />
            {lang === 'en' ? 'You have 1 new message from your specialist' : '۱ پیام جدید از کارشناس دارید'}
          </div>
        </div>

        {showContactOn('profile') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
      </div>
    </div>
  );
}
