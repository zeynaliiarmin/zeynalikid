import React from 'react';
import { Helmet } from 'react-helmet-async';

/**
 * The project has no authenticated public-user account yet. This page therefore
 * must not invent profile/order data. It provides an honest gateway to the
 * secure tracking flow until a real customer identity model is implemented.
 */
export default function ProfilePage({ app }: { app: any }) {
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
      <section style={{ ...S.card, maxWidth: 560, marginTop: 18 }}>
        <div style={{ width: 64, height: 64, borderRadius: 20, margin: '0 auto 14px', display: 'grid', placeItems: 'center', background: T.soft, color: T.acc, fontSize: 28 }} aria-hidden="true">⌕</div>
        <h1 id="profile-page-title" style={{ margin: '0 0 8px', color: T.ttl, fontSize: 22, textAlign: 'center' }}>
          {en ? 'View your real records' : 'مشاهده پرونده‌های واقعی شما'}
        </h1>
        <p style={{ margin: '0 auto 18px', maxWidth: 430, color: T.mut, fontSize: 13.5, lineHeight: 2, textAlign: 'center' }}>
          {en
            ? 'For privacy, records are shown only after entering the tracking code and the full phone number used at registration.'
            : 'برای حفظ حریم خصوصی، اطلاعات فقط بعد از واردکردن کد پیگیری و شماره تماس کاملِ زمان ثبت نمایش داده می‌شود.'}
        </p>
        <button type="button" style={S.btn} onClick={() => setView('track')}>
          {en ? 'Open secure tracking' : 'ورود به پیگیری امن'}
        </button>
        <button type="button" style={{ ...S.btnGhost, marginTop: 10 }} onClick={() => setView('home')}>
          {en ? 'Back to home' : 'بازگشت به صفحه اصلی'}
        </button>
        {showContactOn?.('profile') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
      </section>
    </main>
  );
}
