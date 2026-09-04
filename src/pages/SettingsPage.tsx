import { useAppContext } from '../app/AppContext';
import React, { useState, useEffect } from 'react';
import { normalizeDesignId } from '../utils/colorMode';
import PublicBackButton from '../components/PublicBackButton';

export default function SettingsPage(){
 const app=useAppContext();
  const { T, S, css, lang, setLang, setView, publicText } = app;

  const currentDesign = (() => {
    try {
      const ls = localStorage.getItem('zk_design_system');
      if (ls) return normalizeDesignId(ls, 'wellness');
    } catch {}
    return 'wellness';
  })();
  const [designSys, setDesignSys] = useState<string>(currentDesign);

  const [blendTheme, setBlendTheme] = useState<string>(() => {
    try {
      const th = localStorage.getItem('zk_theme');
      if (th && ['light', 'cream', 'ocean', 'dark', 'motherly-trust', 'blend'].includes(th)) return th;
    } catch {}
    return 'blend';
  });

  const [notifications, setNotifications] = useState(true);
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    try {
      const savedNotif = localStorage.getItem('zk_notifications');
      if (savedNotif !== null) setNotifications(savedNotif === 'true');
    } catch {}
  }, []);

  const handleDesignChange = (d: string) => {
    setDesignSys(d);
    try { localStorage.setItem('zk_design_system', d); } catch {}
    setFeedback(lang === 'en' ? 'Design system updated' : 'دیزاین‌سیستم به‌روزرسانی شد');
    setTimeout(() => { setFeedback(''); window.location.reload(); }, 600);
  };

  const handleBlendThemeChange = (th: string) => {
    setBlendTheme(th);
    try { localStorage.setItem('zk_theme', th); } catch {}
    setFeedback(lang === 'en' ? 'Theme updated' : 'تم به‌روزرسانی شد');
    setTimeout(() => { setFeedback(''); window.location.reload(); }, 600);
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

  const btnRad = T.btnRadius || 14;
  const cardRad = T.cardRadius || 16;

  return (
    <div style={S.page}>
      <style>{css}</style>
      <div dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ ...S.card, maxWidth: 460 }}>
        <div className="zk-public-title-row" style={{ marginBottom: 16 }}><PublicBackButton lang={lang === 'en' ? 'en' : 'fa'} onBack={() => setView('home')} /><h1 style={{ flex: 1, minWidth: 0, fontSize: 18, fontWeight: 800, color: T.ttl, margin: 0 }}>{lang === 'en' ? 'Settings' : 'تنظیمات'}</h1></div>

        {/* Language */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>{lang === 'en' ? 'Language' : 'زبان'}</div>
          <div style={{ display: 'flex', gap: 8 }}>
            {['fa', 'en'].map(l => (
              <button
                key={l}
                onClick={() => setLang(l as 'fa' | 'en')}
                style={{
                  flex: 1, padding: '11px 14px', borderRadius: btnRad,
                  background: lang === l ? T.acc : T.card,
                  color: lang === l ? 'var(--zk-text-inverse, #fff)' : T.txt,
                  border: `1px solid ${lang === l ? T.acc : T.brd}`,
                  fontWeight: 700, minHeight: 48, cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {l === 'fa' ? '🇮🇷 فارسی' : '🇬🇧 English'}
              </button>
            ))}
          </div>
        </div>

        {/* Design System Switcher */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>
            {lang === 'en' ? 'Design System' : 'دیزاین‌سیستم'}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { id: 'wellness', label: 'Wellness (عمومی)' },
              { id: 'kidlearn', label: 'KidLearn (آموزش)' },
              { id: 'classic', label: 'Classic (کلاسیک)' },
              { id: 'blend', label: 'Blend (ترکیبی - ۶ تم)' }
            ].map(d => (
              <button
                key={d.id}
                onClick={() => handleDesignChange(d.id)}
                style={{
                  padding: '11px 10px', borderRadius: btnRad,
                  background: designSys === d.id ? `${T.acc}15` : T.card,
                  border: `2px solid ${designSys === d.id ? T.acc : T.brd}`,
                  color: designSys === d.id ? T.accText : T.txt,
                  fontWeight: 700, minHeight: 48, cursor: 'pointer',
                  fontFamily: 'inherit'
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>

        {/* Theme Switcher */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>
            {lang === 'en' ? 'Theme' : 'تم'}
          </div>
          {['wellness', 'kidlearn'].includes(designSys) ? (
            <div style={{ padding: '12px 14px', borderRadius: cardRad, background: T.soft, border: `1px solid ${T.brd}`, color: T.ttl, fontWeight: 700, fontSize: 13, textAlign: 'center' }}>
              {lang === 'en' 
                ? `Theme: ${designSys.charAt(0).toUpperCase() + designSys.slice(1)} — Fixed`
                : `تم: ${designSys.charAt(0).toUpperCase() + designSys.slice(1)} — ثابت`
              }
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { id: 'light', label: lang === 'en' ? 'Light' : 'روشن' },
                { id: 'cream', label: lang === 'en' ? 'Cream' : 'کرم گرم' },
                { id: 'ocean', label: lang === 'en' ? 'Ocean' : 'اقیانوسی' },
                { id: 'dark', label: lang === 'en' ? 'Dark' : 'تاریک' },
                { id: 'motherly-trust', label: lang === 'en' ? 'Motherly Trust' : 'مادرانه-اعتمادساز' },
                { id: 'blend', label: lang === 'en' ? 'Blend' : 'ترکیبی' }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => handleBlendThemeChange(t.id)}
                  style={{
                    padding: '11px 10px', borderRadius: btnRad,
                    background: blendTheme === t.id ? `${T.acc}15` : T.card,
                    border: `2px solid ${blendTheme === t.id ? T.acc : T.brd}`,
                    color: blendTheme === t.id ? T.accText : T.txt,
                    fontWeight: 700, minHeight: 48, cursor: 'pointer',
                    fontFamily: 'inherit'
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Notifications — real local toggle with feedback */}
        <div style={{ marginBottom: 18 }}>
          <div style={{ fontSize: 13, color: T.mut, marginBottom: 6, fontWeight: 700 }}>{lang === 'en' ? 'Notifications' : 'اعلان‌ها'}</div>
          <button
            onClick={handleNotificationsToggle}
            style={{
              width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '13px 16px', borderRadius: cardRad, background: T.card, border: `1px solid ${T.brd}`,
              minHeight: 52, cursor: 'pointer', fontFamily: 'inherit'
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
            { label: lang === 'en' ? 'Terms & Privacy' : 'قوانین و حریم خصوصی', view: 'privacy' },
          ].map((l, i) => (
            <button key={i} onClick={() => setView(l.view)} style={{
              padding: '12px 14px', borderRadius: btnRad, background: T.card, border: `1px solid ${T.brd}`,
              textAlign: 'right', fontSize: 14, fontWeight: 600, minHeight: 48, cursor: 'pointer',
              fontFamily: 'inherit'
            }}>
              {l.label} <svg className="zk-ic-dir" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={T.acc} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m13 6 6 6-6 6"/></svg>
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}
