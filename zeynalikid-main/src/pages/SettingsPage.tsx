import React, { useState, useEffect } from 'react';

export default function SettingsPage({ app }: { app: any }) {
  const { T, S, css, lang, setLang, setView, publicText } = app;

  // Stage 6: Real working theme switch (local + localStorage + CSS data-theme)
  const [theme, setTheme] = useState<'light' | 'dark' | 'auto'>('light');
  const [notifications, setNotifications] = useState(true);
  const [feedback, setFeedback] = useState('');

  // Load saved preferences on mount
  useEffect(() => {
    try {
      const savedTheme = localStorage.getItem('zk_theme') as 'light' | 'dark' | 'auto' | null;
      const savedNotif = localStorage.getItem('zk_notifications');
      if (savedTheme) setTheme(savedTheme);
      if (savedNotif !== null) setNotifications(savedNotif === 'true');

      // Apply immediately
      applyTheme(savedTheme || 'light');
    } catch {}
  }, []);

  const applyTheme = (t: 'light' | 'dark' | 'auto') => {
    let final = t;
    if (t === 'auto') {
      const hour = new Date().getHours();
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      final = (hour >= 20 || hour < 7 || prefersDark) ? 'dark' : 'light';
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', final);

    // Minimal maternal dark overrides (soft, warm, low brightness)
    if (final === 'dark') {
      root.style.setProperty('--zk-bg', '#0F1722');
      root.style.setProperty('--zk-surface', '#172231');
      root.style.setProperty('--zk-text', '#E2E8F0');
      root.style.setProperty('--zk-text-muted', '#94A3B8');
      root.style.setProperty('--zk-border', 'rgba(148,163,184,0.2)');
      root.style.setProperty('--zk-primary', '#4BA8D8');
    } else {
      // Reset to default (light/cream family)
      root.style.removeProperty('--zk-bg');
      root.style.removeProperty('--zk-surface');
      root.style.removeProperty('--zk-text');
      root.style.removeProperty('--zk-text-muted');
      root.style.removeProperty('--zk-border');
      root.style.removeProperty('--zk-primary');
    }
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'auto') => {
    setTheme(newTheme);
    try { localStorage.setItem('zk_theme', newTheme); } catch {}
    applyTheme(newTheme);
    setFeedback(lang === 'en' ? 'Theme updated' : 'تم به‌روزرسانی شد');
    setTimeout(() => setFeedback(''), 1400);
  };

  const handleNotificationsToggle = () => {
    const next = !notifications;
    setNotifications(next);
    try { localStorage.setItem('zk_notifications', String(next)); } catch {}
    setFeedback(next 
      ? (lang === 'en' ? 'Notifications enabled' : 'اعلان‌ها فعال شد') 
      : (lang === 'en' ? 'Notifications disabled' : 'اعلان‌ها غیرفعال شد')
    );
    setTimeout(() => setFeedback(''), 1400);
  };

  const themes: { id: 'light' | 'dark' | 'auto'; label: string }[] = [
    { id: 'light', label: lang === 'en' ? 'Light' : 'روشن' },
    { id: 'dark', label: lang === 'en' ? 'Night (Maternal)' : 'شب (مادرانه)' },
    { id: 'auto', label: lang === 'en' ? 'Auto' : 'خودکار' },
  ];

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div style={{ ...S.card, maxWidth: 460 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: T.ttl, marginBottom: 16 }}>{lang === 'en' ? 'Settings' : 'تنظیمات'}</div>

        {/* Language */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>{lang === 'en' ? 'Language' : 'زبان'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['fa', 'en'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l as 'fa' | 'en')}
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: 999,
                  background: lang === l ? T.acc : T.card,
                  color: lang === l ? '#fff' : T.txt,
                  border: `1px solid ${lang === l ? T.acc : T.brd}`,
                  fontWeight: 700, minHeight: 48
                }}
              >
                {l === 'fa' ? 'فارسی' : 'English'}
              </button>
            ))}
          </div>
        </div>

        {/* Theme — now fully functional (light / maternal dark / auto) */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>{lang === 'en' ? 'Theme' : 'تم'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {themes.map(t => (
              <button
                key={t.id}
                onClick={() => handleThemeChange(t.id)}
                style={{
                  flex: 1, padding: '11px 10px', borderRadius: 14,
                  background: theme === t.id ? `${T.acc}12` : T.card,
                  border: `2px solid ${theme === t.id ? T.acc : T.brd}`,
                  color: theme === t.id ? T.acc : T.txt,
                  fontWeight: 700, minHeight: 48
                }}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Notifications — real local toggle with feedback */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>{lang === 'en' ? 'Notifications' : 'اعلان‌ها'}</div>
          <button
            onClick={handleNotificationsToggle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', borderRadius: 16, background: T.card, border: `1px solid ${T.brd}`,
              minHeight: 52
            }}
          >
            <span>{lang === 'en' ? 'Follow-up & Reminder Notifications' : 'اعلان‌های پیگیری و یادآوری'}</span>
            <div style={{
              width: 48, height: 26, borderRadius: 999, background: notifications ? T.acc : T.inp,
              position: 'relative', transition: 'all .2s'
            }}>
              <div style={{
                position: 'absolute', top: 3, left: notifications ? 24 : 3,
                width: 20, height: 20, background: '#fff', borderRadius: '50%',
                boxShadow: '0 1px 3px rgba(0,0,0,.2)', transition: 'all .2s'
              }} />
            </div>
          </button>
        </div>

        {feedback && (
          <div style={{ fontSize:12, color:T.ok, textAlign:'center', marginBottom:8 }}>{feedback}</div>
        )}

        {/* Links */}
        <div style={{ display: 'grid', gap: 6, marginBottom: 16 }}>
          {[
            { label: lang === 'en' ? 'About Zeynalikid' : 'درباره زینالیکید', view: 'about' },
            { label: lang === 'en' ? 'Contact & Support' : 'تماس و پشتیبانی', view: 'contact' },
            { label: lang === 'en' ? 'Terms & Privacy' : 'قوانین و حریم خصوصی', view: 'licenses' },
          ].map((l, i) => (
            <button key={i} onClick={() => setView(l.view)} style={{
              padding: '12px 14px', borderRadius: 14, background: T.card, border: `1px solid ${T.brd}`,
              textAlign: 'right', fontSize: 14, fontWeight: 600, minHeight: 48
            }}>
              {l.label} <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" style={{transform:'scaleX(-1)'}} aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          ))}
        </div>

        <button onClick={() => setView('home')} style={{ ...S.btnGhost, width: '100%' }}>
          {lang === 'en' ? 'Back to Home' : 'بازگشت به خانه'}
        </button>
      </div>
    </div>
  );
}
