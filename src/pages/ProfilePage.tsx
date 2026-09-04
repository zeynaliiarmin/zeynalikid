import { useAppContext } from '../app/AppContext';
import React from 'react';
import { Helmet } from 'react-helmet-async';
import PublicBackButton from '../components/PublicBackButton';

/**
 * The project has no authenticated public-user account yet. This page therefore
 * must not invent profile/order data. It provides an honest gateway to the
 * secure tracking flow until a real customer identity model is implemented.
 */
export default function ProfilePage(){
 const app=useAppContext();
  const { cfg, T, S, css, lang, setView, showContactOn, ContactPanel } = app;
  const en = lang === 'en';
  const brand=String(cfg.browserTitle||cfg.siteTitle||(en?'Child Growth':'سامانه رشد کودک')).replace(/[“”"]/g,'').trim();

  return (
    <main style={S.page} aria-labelledby="profile-page-title">
      <Helmet>
        <title>{en ? `My records | ${brand}` : `پرونده من | ${brand}`}</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <style>{css}</style>
      <section dir={en ? 'ltr' : 'rtl'} style={{ ...S.card, maxWidth: 560, marginTop: 18 }}>
        <div className="zk-public-title-row" dir={en ? 'ltr' : 'rtl'} style={{ marginBottom: 14 }}>
          <PublicBackButton lang={en ? 'en' : 'fa'} onBack={() => setView('home')} />
          <h1 id="profile-page-title" style={{ flex: 1, minWidth: 0, margin: 0, color: T.ttl, fontSize: 22, textAlign: 'start' }}>
            {en ? 'View your real records' : 'مشاهده پرونده‌های واقعی شما'}
          </h1>
        </div>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: T.soft, color:T.accText, fontSize: 28 }} aria-hidden="true">⌕</div>
        <p style={{ margin: '0 auto 18px', maxWidth: 430, color: T.mut, fontSize: 13.5, lineHeight: 2, textAlign: 'center' }}>
          {en
            ? 'For privacy, records are shown only after entering the tracking code and the full phone number used at registration.'
            : 'برای حفظ حریم خصوصی، اطلاعات فقط بعد از واردکردن کد پیگیری و شماره تماس کاملِ زمان ثبت نمایش داده می‌شود.'}
        </p>
        <button type="button" style={S.btn} onClick={() => setView('track')}>
          {en ? 'Open secure tracking' : 'ورود به پیگیری امن'}
        </button>
        {showContactOn?.('profile') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
      </section>
    </main>
  );
}
