import React, { useState, useEffect } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import JsonLd from '../components/JsonLd';
import CourseCard from '../components/CourseCard';
import CourseDetailView from '../components/CourseDetailView';
import TrustBoxNew from '../components/TrustBoxNew';
import MediaCard from '../components/MediaCard';
import useMediaVpn from '../hooks/useMediaVpn';
import { getMediaItemsForDestinations, type MediaDestination } from '../utils/mediaPlacement';

function CourseTabBanner({ tab, lang }: { tab: any; lang: 'fa' | 'en' }) {
  const [failed, setFailed] = useState(false);
  useEffect(() => { setFailed(false); }, [tab?.image]);

  if (!tab?.image || tab.showImage === false || failed) return null;

  return (
    <section
      aria-label={lang === 'en' ? `Image for ${tab.titleEn || tab.title}` : `تصویر تب ${tab.title}`}
      style={{
        marginBottom: 18,
        borderRadius: 20,
        overflow: 'hidden',
        border: '1px solid var(--zk-border)',
        boxShadow: 'var(--zk-shadow-light)',
        background: 'var(--zk-surface)',
      }}
    >
      <img
        src={tab.image}
        alt={lang === 'en' ? (tab.titleEn || tab.title) : tab.title}
        loading="lazy"
        onError={() => setFailed(true)}
        style={{
          display: 'block',
          width: '100%',
          aspectRatio: tab.aspectRatio || '16 / 9',
          objectFit: 'cover',
          objectPosition: tab.objectPosition || 'center',
        }}
      />
    </section>
  );
}

// Simplified CoursesPage with Stage 2 redesign + Stage 11 UX improvements
export default function CoursesPage({ app }: { app: any }) {
  const { cfg, T, lang, courseTab, setCourseTab, publicText, APP_A_URL, Footer, showContactOn, ContactPanel, chooseDest, referralTarget, findTabByCode, referralConsultant, requestConsult, startConsult } = app;
  const location = useLocation();

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  // اگر از طریق لینک ارجاع با تعیین تب آمده، همان تب به‌صورت پیش‌فرض باز شود
  const initialFilter = (() => {
    if (referralTarget?.tabCode && findTabByCode) {
      const t = findTabByCode(cfg.courseTabs||[], referralTarget.tabCode);
      if (t) return t.id;
    }
    return 'all';
  })();
  const [filter, setFilter] = useState<string>(initialFilter);
  // ردیابی ورود به جزئیات دوره برای دکمه back گوشی (در پایین هم استفاده می‌شود)
  const detailPushedRef = React.useRef(false);

  const activeTab = cfg.courseTabs?.find((t: any) => t.id === courseTab) || cfg.courseTabs?.[0];
  const allCourses = (activeTab?.courses || []).filter((c: any) => c.active !== false).map((c: any) => ({ ...c, tabId: activeTab?.id }));

  // پشتیبانی از باز شدن مستقیم دوره هنگام انتخاب از صفحه اصلی (HomePage)
  // با push کردن یک entry در history، دکمه back گوشی جزئیات را می‌بندد و به فهرست برمی‌گردد.
  useEffect(() => {
    if (location.state?.courseId) {
      const found = allCourses.find((c: any) => c.id === location.state.courseId);
      if (found) {
        if (!detailPushedRef.current) {
          try { window.history.pushState({ zkCourseDetail: true, from: '/courses' }, ''); } catch {}
          detailPushedRef.current = true;
        }
        setSelectedCourse(found);
      }
    }
  }, [location.state?.courseId]);

  // همگام‌سازی فیلتر با courseTab از app (برای لینک ارجاق با تعیین تب)
  useEffect(() => {
    if (referralTarget?.tabCode && findTabByCode) {
      const t = findTabByCode(cfg.courseTabs||[], referralTarget.tabCode);
      if (t && filter !== t.id) setFilter(t.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralTarget?.raw]);

  // هماهنگی کامل فیلترهای دوره با پنل مدیریت (cfg.courseTabs) و حذف تب تخفیف‌دار در نبود دوره تخفیف‌دار
  const allAvailableCourses = (cfg.courseTabs || []).flatMap((t: any) =>
    (t.courses || []).filter((c: any) => c.active !== false).map((c: any) => ({ ...c, tabId: t.id }))
  );
  const hasDiscountCourse = allAvailableCourses.some(
    (c: any) => Number(c.discountedPrice) > 0
  );

  const dynamicTabs = (cfg.courseTabs || [])
    .filter((t: any) => t.active !== false)
    .map((t: any) => ({
      id: t.id,
      label: lang === 'en' ? (t.titleEn || t.title) : t.title,
    }));

  const filters = [
    { id: 'all', label: lang === 'en' ? 'All' : 'همه' },
    ...dynamicTabs,
    ...(hasDiscountCourse ? [{ id: 'discount', label: lang === 'en' ? 'Discounted' : 'تخفیف‌دار' }] : []),
  ];

  const filteredCourses = allAvailableCourses.filter((c: any) => {
    if (filter === 'all') return true;
    if (filter === 'discount') return Number(c.discountedPrice) > 0;
    return c.tabId === filter;
  });
  const bannerTab = filter === 'all' || filter === 'discount'
    ? null
    : (cfg.courseTabs || []).find((tab: any) => tab.id === filter);
  const mediaDestinations: MediaDestination[] = filter === 'height' || filter === 'appetite' || filter === 'mind'
    ? [filter]
    : ['height', 'appetite', 'mind'];
  const placedMediaItems = getMediaItemsForDestinations(cfg, mediaDestinations);
  const parentExperienceMedia = placedMediaItems.filter((item: any) => item._mediaSource === 'experience' || (item.categories || []).some((category: string) => category === 'experience' || category === 'parent-experience'));
  const educationalMedia = placedMediaItems.filter((item: any) => !parentExperienceMedia.includes(item));
  const mediaVpnOn = useMediaVpn(cfg);

  const goConsult = () => {
    window.location.href = APP_A_URL;
  };

  // رفع باگ دکمه برگشت گوشی/مرورگر: جزئیات دوره به‌صورت inline (بدون تغییر URL) نمایش داده می‌شود.
  // با push کردن یک entry در history، دکمه back خود گوشی/مرورگر به‌درستی جزئیات را می‌بندد و به
  // فهرست دوره‌ها برمی‌گردد (به‌جای پریدن به صفحه هوم).
  const openDetail = (course: any) => {
    if (!detailPushedRef.current) {
      try { window.history.pushState({ zkCourseDetail: true, from: window.location.pathname }, ''); } catch {}
      detailPushedRef.current = true;
    }
    setSelectedCourse(course);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };

  const closeDetail = () => {
    if (detailPushedRef.current) {
      detailPushedRef.current = false;
      try { window.history.back(); } catch {}
    }
    setSelectedCourse(null);
  };

  // ─── آپدیت لینک ارجاع: دوره هدف (برای اسکرول + دکمه برجسته «مشاهده جزئیات و ثبت») ───
  const referralTargetCourse = (() => {
    if (!referralTarget?.tabCode || typeof referralTarget.courseIndex !== 'number') return null;
    const t = findTabByCode ? findTabByCode(cfg.courseTabs || [], referralTarget.tabCode) : null;
    if (!t) return null;
    const courses = (t.courses || []).filter((c: any) => c.active !== false);
    return courses[referralTarget.courseIndex - 1] || null;
  })();
  const [didScroll, setDidScroll] = useState(false);
  React.useEffect(() => {
    if (referralTargetCourse && !didScroll) {
      const t = setTimeout(() => {
        const el = document.getElementById(`zk-ref-course-${referralTargetCourse.id}`);
        if (el) { try { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); } catch {} }
        setDidScroll(true);
      }, 350);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referralTargetCourse?.id, didScroll]);

  // وقتی کاربر دکمه back گوشی/مرورگر را می‌زند، history.pop باعث می‌شود جزئیات بسته شود.
  // اگر صفحهٔ «مشاهده همه نظرات» باز باشد، آن را به عهدهٔ ReviewSection می‌گذاریم تا فقط آن بسته شود.
  React.useEffect(() => {
    const onPop = () => {
      let reviewsOverlayOpen = false;
      try { reviewsOverlayOpen = !!(window as any).__zkReviewsOverlayOpen; } catch {}
      if (reviewsOverlayOpen) return;
      if (detailPushedRef.current) {
        detailPushedRef.current = false;
        setSelectedCourse(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // ════════════════════════════════════════════════════════════════════════
  // نمایش دوره به صورت «یک صفحه جداگانه» (Separate Page) به جای پاپ‌آپ
  // ════════════════════════════════════════════════════════════════════════
  if (selectedCourse) {
    return (
      <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
        <Helmet>
          <title>{(lang === 'en' ? (selectedCourse.titleEn || selectedCourse.title) : selectedCourse.title)} | {lang === 'en' ? 'Farzandman' : 'فرزند من'}</title>
        </Helmet>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 14px 80px' }}>
          <CourseDetailView
            course={selectedCourse}
            T={T}
            lang={lang}
            countries={cfg.countryCodes}
            onClose={closeDetail}
            educationalMedia={educationalMedia}
            parentExperienceMedia={parentExperienceMedia}
            mediaVpnOn={mediaVpnOn}
            hasReferral={!!app.referralConsultant}
            referralConsultant={app.referralConsultant}
            onRegister={() => {
              // نمایش کادر انتخاب مقصد ارسال (ایران / خارج از کشور / بازگشت)
              if (app.setShipModal) {
                app.setShipModal(selectedCourse);
              } else if (chooseDest) {
                chooseDest('iran', selectedCourse);
              } else {
                app.setView('child-info');
              }
            }}
            onConsult={goConsult}
          />
        </div>
        <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px' }}>
          <Footer cfg={cfg} T={T} lang={lang} referralConsultant={referralConsultant} requestConsult={requestConsult} onStartConsult={startConsult} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <JsonLd id="ld-courses" data={JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:lang==='en'?'Farzandman growth & nutrition courses':'دوره‌های رشد و تغذیه فرزند من',itemListElement:(cfg.courseTabs||[]).flatMap((t:any)=>(t.courses||[]).filter((c:any)=>c.active!==false).map((c:any,i:number)=>({'@type':'Course',name:lang==='en'?(c.titleEn||c.title):c.title,description:lang==='en'?(c.descEn||c.desc):c.desc,provider:{'@type':'Organization',name:'فرزند من',url:'https://farzandman.vercel.app/'}})))})} />
      <Helmet>
        <title>{lang === 'en' ? 'Courses | Farzandman' : 'دوره‌های تخصصی | فرزند من'}</title>
      </Helmet>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px 80px' }}>
        {/* Header */}
        <div style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: lang === 'fa' ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
            <button onClick={() => { if (referralConsultant || referralTarget?.raw) { app.goHome?.(); } else { window.history.back(); } }} style={{ minHeight: 44, background: 'transparent', border: 0, color: 'var(--zk-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
              {lang === 'en' ? 'Back' : 'بازگشت'}
            </button>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, margin: '8px 0 4px', color: 'var(--zk-text)' }}>
            {lang === 'en' ? 'Specialized Courses' : 'دوره‌های تخصصی رشد و تغذیه'}
          </h1>
          <p style={{ color: 'var(--zk-text-muted)', fontSize: 13.5, lineHeight: 1.6 }}>
            {lang === 'en' ? 'Evidence-based programs for your child’s growth, appetite and focus — with full parental support.' : 'برنامه‌های مبتنی بر شواهد برای رشد، اشتها و تمرکز فرزند شما — با پشتیبانی کامل والدین.'}
          </p>
        </div>

        {/* کارت معرفی مشاور ارجاع‌دهنده — وقتی مخاطب با لینک اختصاصی مشاور آمده */}
        {referralConsultant && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16, padding: '14px 16px', background: '#FFF7ED', border: '1px solid #FED7AA', borderRadius: 20, boxShadow: 'var(--zk-shadow-light)', animation: 'fadeSlide .5s ease both' }}>
            {referralConsultant.showPhoto !== false && (referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl) ? (
              <img src={referralConsultant.photoUrl || referralConsultant.aboutPhotoUrl} alt={lang === 'fa' ? referralConsultant.name : (referralConsultant.nameEn || referralConsultant.name)} style={{ width: 64, height: 64, objectFit: 'cover', objectPosition: 'center 18%', borderRadius: '50%', border: '2px solid #FB923C', flexShrink: 0 }} />
            ) : null}
            <div style={{ minWidth: 0 }}>
              <span style={{ display: 'inline-block', fontSize: 10.5, fontWeight: 800, color: '#C2410C', marginBottom: 3 }}>{lang === 'en' ? 'You are advised by' : 'شما توسط این مشاور مشاوره شده‌اید'}</span>
              <strong style={{ display: 'block', fontSize: 15, color: 'var(--zk-text)', fontWeight: 800, lineHeight: 1.4 }}>{lang === 'fa' ? referralConsultant.name : (referralConsultant.nameEn || referralConsultant.name)}</strong>
              {(lang === 'fa' ? referralConsultant.title : (referralConsultant.titleEn || referralConsultant.title)) ? <span style={{ display: 'block', fontSize: 12, color: 'var(--zk-text-muted)', lineHeight: 1.5, marginTop: 2 }}>{lang === 'fa' ? referralConsultant.title : (referralConsultant.titleEn || referralConsultant.title)}</span> : null}
              {(lang === 'fa' ? (referralConsultant.introText || referralConsultant.desc) : (referralConsultant.introTextEn || referralConsultant.descEn || referralConsultant.introText || referralConsultant.desc)) ? <span style={{ display: 'block', fontSize: 12.5, color: 'var(--zk-text-muted)', lineHeight: 1.8, marginTop: 6 }}>{lang === 'fa' ? (referralConsultant.introText || referralConsultant.desc) : (referralConsultant.introTextEn || referralConsultant.descEn || referralConsultant.introText || referralConsultant.desc)}</span> : null}
            </div>
          </div>
        )}

        {/* پیام شناور زرد برای لینک ارجاع با تعیین تب */}
        {referralTarget?.tabCode && (() => {
          const t = findTabByCode ? findTabByCode(cfg.courseTabs||[], referralTarget.tabCode) : null;
          if (!t) return null;
          const tabName = lang==='en' ? (t.titleEn||t.title) : t.title;
          const isDir = typeof referralTarget?.courseIndex === 'number';
          return (
            <div style={{marginBottom:14,padding:'12px 14px',background:'#FEF9C3',border:'1.5px solid #FACC15',borderRadius:14,fontSize:13,lineHeight:1.9,color:'#713F12',fontWeight:700}}>
              {isDir
                ? (cfg.referral?.texts?.coursesCourse || (lang==='en'
                    ? `Tap “View details & enroll” on the highlighted course to register this course.`
                    : `با زدن دکمهٔ «مشاهده جزئیات و ثبت» روی دورهٔ مشخص‌شده می‌توانید همان دوره را ثبت کنید.`))
                : (cfg.referral?.texts?.coursesTab || (lang==='en'
                    ? `Tap “View course” on each card to compare ${tabName} courses and choose the best match for your child.`
                    : `با زدن دکمه مشاهده دوره در هر کارت می‌توانید دوره‌های ${tabName} را مقایسه کنید و انتخاب بهتری داشته باشید.`))}
            </div>
          );
        })()}

        {/* Filter chips — horizontal scrollable */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 10, marginBottom: 16, scrollSnapType: 'x mandatory' }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => {
                setFilter(f.id);
                if (f.id !== 'all' && f.id !== 'discount') setCourseTab(f.id);
              }}
              style={{
                minHeight: 46,
                padding: '0 18px',
                borderRadius: 999,
                border: filter === f.id ? '1px solid var(--zk-primary)' : '1px solid var(--zk-border)',
                background: filter === f.id ? 'var(--zk-primary-light)' : 'var(--zk-surface)',
                color: filter === f.id ? 'var(--zk-primary)' : 'var(--zk-text)',
                fontWeight: 700,
                fontSize: 13,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                scrollSnapAlign: 'start',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Results count */}
        <div style={{ fontSize: 12.5, color: 'var(--zk-text-muted)', marginBottom: 10 }}>
          {filteredCourses.length} {lang === 'en' ? 'courses' : 'دوره'}
        </div>

        {/* کادر جملات اعتمادساز تب فعال دوره — هوشمند و چندتبی (همگام با پنل ادمین) */}
        {(() => {
          const currentTabId = filter === 'all' || filter === 'discount' ? 'health' : filter;
          const tabTrustSettings = cfg.trustBoxes?.tabs?.[currentTabId] || {};
          // جمع‌آوری تمام جملات از همه دسته‌ها و فیلتر بر اساس tabs شامل currentTabId (پشتیبانی از جملات چندتبی)
          const sentencesMap = cfg.trustBoxes?.sentences || {};
          const flatAll: any[] = Object.entries(sentencesMap).flatMap(([originKey, arr]: any) =>
            (Array.isArray(arr) ? arr : []).map((s: any) => ({ ...s, _origin: originKey }))
          );
          let tabSentences: any[] = flatAll.filter((s: any) => {
            if (s.active === false) return false;
            const tabs: string[] = Array.isArray(s.tabs) && s.tabs.length ? s.tabs : [s._origin];
            return tabs.includes(currentTabId);
          });
          // fallback سازگار: اگر برای health هیچ جمله تگ‌دار نبود، از sentences.health استفاده کن
          if (!tabSentences.length && currentTabId === 'health') {
            tabSentences = (sentencesMap.health || []).filter((s: any) => s.active !== false);
          }
          if (cfg.trustBoxes?.enabled === false || tabTrustSettings.enabled === false || !tabSentences.length) {
            return null;
          }
          return (
            <div style={{ marginBottom: 18 }}>
              <TrustBoxNew
                sentences={tabSentences}
                interval={tabTrustSettings.interval || cfg.trustBoxes?.defaultInterval || 8}
                T={T}
                design="classic"
                lang={lang}
              />
            </div>
          );
        })()}

        {/* تصویر مستقل تب انتخاب‌شده؛ در حالت «همه» و «تخفیف‌دار» بنر واحدی وجود ندارد. */}
        {bannerTab && <CourseTabBanner tab={bannerTab} lang={lang} />}

        {/* Grid: 1-col mobile, 2 tablet, 3 desktop */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr',
          gap: 14,
        }}>
          {filteredCourses.length > 0 ? (
            filteredCourses.map((cr: any) => {
              const isTarget = !!referralTargetCourse && referralTargetCourse.id === cr.id;
              const ctaL = isTarget
                ? (lang === 'en' ? `View details & enroll in ${cr.titleEn || cr.title}` : `مشاهده جزئیات و ثبت ${cr.title}`)
                : undefined;
              return (
                <div key={cr.id} id={isTarget ? `zk-ref-course-${cr.id}` : undefined} style={isTarget ? { scrollMarginTop: 20 } : undefined}>
                  {isTarget && (
                    <div style={{ marginBottom: 12, padding: '12px 14px', background: '#FEF9C3', border: '1.5px solid #FACC15', borderRadius: 14, fontSize: 12.5, lineHeight: 1.9, color: '#713F12', fontWeight: 700 }}>
                      {lang === 'en'
                        ? 'Tap the highlighted button to view details and enroll in this course.'
                        : `با زدن دکمهٔ «مشاهده جزئیات و ثبت ${cr.title}» می‌توانید جزئیات و ثبت‌نام این دوره را ببینید.`}
                    </div>
                  )}
                  <CourseCard
                    key={cr.id}
                    course={cr}
                    size="normal"
                    showStock
                    showDiscount
                    onCourseClick={openDetail}
                    T={T}
                    lang={lang}
                    ctaLabel={ctaL}
                    ctaPulse={isTarget}
                  />
                </div>
              );
            })
          ) : (
            <div style={{ padding: 40, textAlign: 'center', background: 'var(--zk-surface)', borderRadius: 18, border: '1px solid var(--zk-border)' }}>
              <div style={{ fontSize: 15, color: 'var(--zk-text-muted)' }}>{lang === 'en' ? 'No courses match your filter.' : 'دوره‌ای با این فیلتر پیدا نشد.'}</div>
              <button onClick={() => setFilter('all')} style={{ marginTop: 12, minHeight: 42, padding: '0 18px', borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', border: 0, fontWeight: 700 }}>
                {lang === 'en' ? 'Show all courses' : 'نمایش همه دوره‌ها'}
              </button>
            </div>
          )}
        </div>

        {/* محتوای متصل به دوره‌ها، بعد از فهرست دوره و قبل از «دوره‌های مشابه»؛ تجربه والدین و آموزش‌ها عمداً جدا هستند. */}
        {parentExperienceMedia.length > 0 && (
          <section data-course-media-group="experience" aria-label={lang === 'en' ? 'Related parent experiences' : 'تجربه و رضایت والدین مرتبط'} style={{ marginTop: 28, marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, color: 'var(--zk-text)', margin: '0 0 10px', fontWeight: 800 }}>
              {lang === 'en' ? 'Related parent experiences' : 'تجربه و رضایت والدین مرتبط'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'flex-start' }}>
              {parentExperienceMedia.map((item: any, index: number) => (
                <MediaCard key={`${item._mediaSource || 'experience'}:${item.id || index}`} item={{ ...item, description: item.descriptionCourses || item.description }} T={T} lang={lang} vpnOn={mediaVpnOn} secure />
              ))}
            </div>
          </section>
        )}
        {educationalMedia.length > 0 && (
          <section data-course-media-group="education" aria-label={lang === 'en' ? 'Related educational media' : 'محتوای آموزشی مرتبط'} style={{ marginTop: parentExperienceMedia.length ? 0 : 28, marginBottom: 22 }}>
            <h2 style={{ fontSize: 16, color: 'var(--zk-text)', margin: '0 0 10px', fontWeight: 800 }}>
              {lang === 'en' ? 'Related educational media' : 'محتوای آموزشی مرتبط'}
            </h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'flex-start' }}>
              {educationalMedia.map((item: any, index: number) => (
                <MediaCard key={`${item._mediaSource || 'education'}:${item.id || index}`} item={{ ...item, description: item.descriptionCourses || item.description }} T={T} lang={lang} vpnOn={mediaVpnOn} secure />
              ))}
            </div>
          </section>
        )}

        {/* Featured / Related horizontal on mobile */}
        {filteredCourses.length > 0 && (
          <div style={{ marginTop: 32 }}>
            <div style={{ fontWeight: 700, marginBottom: 10, fontSize: 14 }}>{lang === 'en' ? 'You may also like' : 'دوره‌های مشابه'}</div>
            <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 12 }}>
              {filteredCourses.slice(0, 4).map((c: any) => (
                <div key={c.id} style={{ flex: '0 0 260px' }}>
                  <CourseCard course={c} size="normal" T={T} lang={lang} onCourseClick={openDetail} />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px' }}>
        {showContactOn('courses') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
        <Footer cfg={cfg} T={T} lang={lang} referralConsultant={referralConsultant} requestConsult={requestConsult} onStartConsult={startConsult} />
      </div>
    </div>
  );
}
