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
  const { cfg, T, lang, courseTab, setCourseTab, publicText, APP_A_URL, Footer, showContactOn, ContactPanel, chooseDest } = app;
  const location = useLocation();

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [filter, setFilter] = useState<string>('all');

  const activeTab = cfg.courseTabs?.find((t: any) => t.id === courseTab) || cfg.courseTabs?.[0];
  const allCourses = (activeTab?.courses || []).filter((c: any) => c.active !== false).map((c: any) => ({ ...c, tabId: activeTab?.id }));

  // پشتیبانی از باز شدن مستقیم دوره هنگام انتخاب از صفحه اصلی (HomePage)
  useEffect(() => {
    if (location.state?.courseId) {
      const found = allCourses.find((c: any) => c.id === location.state.courseId);
      if (found) {
        setSelectedCourse(found);
      }
    }
  }, [location.state?.courseId]);

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

  const openDetail = (course: any) => {
    setSelectedCourse(course);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };

  const closeDetail = () => setSelectedCourse(null);

  // ════════════════════════════════════════════════════════════════════════
  // نمایش دوره به صورت «یک صفحه جداگانه» (Separate Page) به جای پاپ‌آپ
  // ════════════════════════════════════════════════════════════════════════
  if (selectedCourse) {
    return (
      <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
        <Helmet>
          <title>{(lang === 'en' ? (selectedCourse.titleEn || selectedCourse.title) : selectedCourse.title)} | {lang === 'en' ? 'Zeynalikid' : 'زینالیکید'}</title>
        </Helmet>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '16px 14px 80px' }}>
          <CourseDetailView
            course={selectedCourse}
            T={T}
            lang={lang}
            countries={cfg.countryCodes}
            onClose={closeDetail}
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
          <Footer cfg={cfg} T={T} lang={lang} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <JsonLd id="ld-courses" data={JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:lang==='en'?'Zeynalikid growth & nutrition courses':'دوره‌های رشد و تغذیه زینالیکید',itemListElement:(cfg.courseTabs||[]).flatMap((t:any)=>(t.courses||[]).filter((c:any)=>c.active!==false).map((c:any,i:number)=>({'@type':'Course',name:lang==='en'?(c.titleEn||c.title):c.title,description:lang==='en'?(c.descEn||c.desc):c.desc,provider:{'@type':'Organization',name:'زینالیکید',url:'https://zeynalikid.vercel.app/'}})))})} />
      <Helmet>
        <title>{lang === 'en' ? 'Courses | Zeynalikid' : 'دوره‌های تخصصی | زینالیکید'}</title>
      </Helmet>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px 80px' }}>
        {/* Header */}
        <div style={{ paddingTop: 18, paddingBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: lang === 'fa' ? 'flex-end' : 'flex-start', marginBottom: 4 }}>
            <button onClick={() => window.history.back()} style={{ minHeight: 44, background: 'transparent', border: 0, color: 'var(--zk-primary)', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
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
            filteredCourses.map((cr: any) => (
              <CourseCard
                key={cr.id}
                course={cr}
                size="normal"
                showStock
                showDiscount
                onCourseClick={openDetail}
                T={T}
                lang={lang}
              />
            ))
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'stretch' }}>
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
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12, alignItems: 'stretch' }}>
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
        <Footer cfg={cfg} T={T} lang={lang} />
      </div>
    </div>
  );
}
