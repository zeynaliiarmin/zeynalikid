import React, { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../components/JsonLd';
import CourseCard from '../components/CourseCard';
import CourseDetailView from '../components/CourseDetailView';

// Simplified CoursesPage with Stage 2 redesign
export default function CoursesPage({ app }: { app: any }) {
  const { cfg, T, lang, courseTab, setCourseTab, publicText, APP_A_URL, Footer, showContactOn, ContactPanel } = app;

  const [selectedCourse, setSelectedCourse] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'growth' | 'appetite' | 'nutrition' | 'focus' | 'parenting' | 'discount'>('all');

  const activeTab = cfg.courseTabs?.find((t: any) => t.id === courseTab) || cfg.courseTabs?.[0];
  const allCourses = (activeTab?.courses || []).filter((c: any) => c.active !== false);

  // Filter chips (KidLearn-inspired but branded)
  const filters = [
    { id: 'all', label: lang === 'en' ? 'All' : 'همه' },
    { id: 'growth', label: lang === 'en' ? 'Growth' : 'رشد قد' },
    { id: 'appetite', label: lang === 'en' ? 'Appetite' : 'اشتها' },
    { id: 'nutrition', label: lang === 'en' ? 'Nutrition' : 'تغذیه' },
    { id: 'focus', label: lang === 'en' ? 'Focus' : 'تمرکز' },
    { id: 'parenting', label: lang === 'en' ? 'Parenting' : 'والدین' },
    { id: 'discount', label: lang === 'en' ? 'Discounted' : 'تخفیف‌دار' },
  ];

  const filteredCourses = allCourses.filter((c: any) => {
    if (filter === 'all') return true;
    if (filter === 'discount') return !!c.discountedPrice;
    const title = (c.title || '').toLowerCase();
    if (filter === 'growth') return title.includes('قد') || title.includes('رشد');
    if (filter === 'appetite') return title.includes('اشتها') || title.includes('بدغذا');
    if (filter === 'nutrition') return title.includes('تغذیه') || title.includes('برنامه');
    if (filter === 'focus') return title.includes('تمرکز') || title.includes('ذهن');
    if (filter === 'parenting') return title.includes('والد') || title.includes('همراهی');
    return true;
  });

  const goConsult = () => {
    window.location.href = APP_A_URL;
  };

  const openDetail = (course: any) => {
    setSelectedCourse(course);
  };

  const closeDetail = () => setSelectedCourse(null);

  return (
    <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <JsonLd id="ld-courses" data={JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:lang==='en'?'Zeynalikid growth & nutrition courses':'دوره‌های رشد و تغذیه زینالیکید',itemListElement:(cfg.courseTabs||[]).flatMap((t:any)=>(t.courses||[]).filter((c:any)=>c.active!==false).map((c:any,i:number)=>({'@type':'Course',name:lang==='en'?(c.titleEn||c.title):c.title,description:lang==='en'?(c.descEn||c.desc):c.desc,provider:{'@type':'Organization',name:'زینالیکید',url:'https://zeynalikid.vercel.app/'}})))})} />
      <Helmet>
        
        <title>{lang === 'en' ? 'Courses | Zeynalikid' : 'دوره‌های تخصصی | زینالیکید'}</title>
      </Helmet>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px 80px' }}>
        {/* Header */}
        <div style={{ paddingTop: 18, paddingBottom: 12 }}>
          <button onClick={() => window.history.back()} style={{ minHeight: 44, background: 'transparent', border: 0, color: 'var(--zk-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {lang === 'en' ? 'Back' : 'بازگشت'}
          </button>
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
              onClick={() => setFilter(f.id as any)}
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

      {/* Course Detail Modal — Full-screen on mobile (per verification) */}
      {selectedCourse && (
        <div 
          style={{ 
            position: 'fixed', 
            inset: 0, 
            background: 'rgba(15,23,42,0.65)', 
            zIndex: 9999, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center',
            padding: '0',
          }} 
          onClick={closeDetail}
        >
          <div 
            style={{ 
              width: '100%', 
              maxWidth: '100%', 
              height: '100dvh', 
              background: 'var(--zk-surface)', 
              overflowY: 'auto',
              position: 'relative',
            }} 
            onClick={e => e.stopPropagation()}
          >
            <CourseDetailView
              course={selectedCourse}
              T={T}
              lang={lang}
              onClose={closeDetail}
              onRegister={() => {
                closeDetail();
                // preserve existing registration flow
                window.location.href = `${APP_A_URL}/courses`;
              }}
              onConsult={goConsult}
            />
          </div>
        </div>
      )}

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px' }}>
        {showContactOn('courses') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
        <Footer cfg={cfg} T={T} lang={lang} />
      </div>
    </div>
  );
}
