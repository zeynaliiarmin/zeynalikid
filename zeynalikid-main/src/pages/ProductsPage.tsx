import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Navigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../components/JsonLd';
import ProductCard from '../components/ProductCard';
import ProductDetailView from '../components/ProductDetailView';

export default function ProductsPage({ app }: { app: any }) {
  const { cfg, T, lang, APP_A_URL, Footer, showContactOn, ContactPanel } = app;

  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [filter, setFilter] = useState<'all' | 'personalized' | 'supplement' | 'education' | 'bundle'>('all');

  const showSection = cfg.products?.showSection ?? cfg.showProductsSection ?? cfg.showProductsPage ?? true;
  const rawProducts: any[] = (cfg.products?.list || cfg.products?.items || []).filter((p: any) => p.isVisible !== false && p.active !== false);

  // Filters (coordinated with Stage 2 chip style but varied palette)
  const filters = [
    { id: 'all', label: lang === 'en' ? 'All' : 'همه محصولات' },
    { id: 'personalized', label: lang === 'en' ? 'Personalized' : 'برنامه شخصی‌سازی‌شده' },
    { id: 'supplement', label: lang === 'en' ? 'Supplements' : 'مکمل‌های تخصصی' },
    { id: 'education', label: lang === 'en' ? 'Education' : 'منابع آموزشی' },
    { id: 'bundle', label: lang === 'en' ? 'Bundles' : 'باندل‌های همراهی' },
  ];

  const filteredProducts = rawProducts.filter((p: any) => {
    if (filter === 'all') return true;
    const cat = (p.category || p.name || p.title || '').toLowerCase();
    if (filter === 'personalized') return cat.includes('personal') || cat.includes('برنامه');
    if (filter === 'supplement') return cat.includes('supplement') || cat.includes('مکمل');
    if (filter === 'education') return cat.includes('education') || cat.includes('منبع') || cat.includes('آموزشی');
    if (filter === 'bundle') return cat.includes('bundle') || cat.includes('باندل');
    return true;
  });

  const goConsult = () => {
    window.location.href = APP_A_URL;
  };

  // رفع باگ دکمه برگشت گوشی/مرورگر: جزئیات محصول inline نمایش داده می‌شود؛ با push یک entry در
  // history، دکمه back گوشی جزئیات را می‌بندد و به فهرست برمی‌گردد (به‌جای پریدن به هوم).
  const detailPushedRef = React.useRef(false);
  React.useEffect(() => {
    const onPop = () => {
      if (detailPushedRef.current) {
        detailPushedRef.current = false;
        setSelectedProduct(null);
      }
    };
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const openDetail = (product: any) => {
    if (!detailPushedRef.current) {
      try { window.history.pushState({ zkProductDetail: true, from: window.location.pathname }, ''); } catch {}
      detailPushedRef.current = true;
    }
    setSelectedProduct(product);
    try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch {}
  };

  const closeDetail = () => {
    if (detailPushedRef.current) {
      detailPushedRef.current = false;
      try { window.history.back(); } catch {}
    }
    setSelectedProduct(null);
  };
  if (!showSection) {
    // Phase 8: به‌جای نمایش پیام «غیرفعال است»، مستقیماً به صفحهٔ اصلی هدایت می‌شود
    return <Navigate to="/" replace />;
  }

  return (
    <div style={{ background: 'var(--zk-bg)', minHeight: '100dvh', overflowX: 'hidden' }}>
      <JsonLd id="ld-products" data={JSON.stringify({'@context':'https://schema.org','@type':'ItemList',name:lang==='en'?'Zeynalikid products':'محصولات زینالیکید',itemListElement:((cfg.products?.list)||[]).filter((p:any)=>p.isVisible!==false).map((p:any)=>({'@type':'Product',name:lang==='en'?(p.titleEn||p.title):p.title,description:p.description||'',brand:{'@type':'Brand',name:'زینالیکید'}}))})} />
      <Helmet>
        
        <title>{lang === 'en' ? 'Products & Plans | Zeynalikid' : 'برنامه‌ها و محصولات | زینالیکید'}</title>
      </Helmet>

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px 100px' }}>
        {/* Warm header with soft blob */}
        <div style={{ paddingTop: 18, paddingBottom: 8, position: 'relative' }}>
          <div style={{
            position: 'absolute', top: -10, left: -20, width: 160, height: 160,
            background: 'radial-gradient(circle, #CCFBF1 0%, transparent 70%)',
            borderRadius: '999px', opacity: 0.35, pointerEvents: 'none'
          }} />

          <button onClick={() => window.history.back()} style={{ minHeight: 44, background: 'transparent', border: 0, color: 'var(--zk-primary)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 6 }}>
            {lang === 'en' ? 'Back' : 'بازگشت'}
          </button>

          <h1 style={{ fontSize: 23, fontWeight: 800, margin: '10px 0 6px', color: 'var(--zk-text)' }}>
            {lang === 'en' ? 'Programs & Products for You' : 'برنامه‌ها و محصولات همراه شما'}
          </h1>

          <p style={{ color: 'var(--zk-text-muted)', fontSize: 13.5, lineHeight: 1.65, maxWidth: 520 }}>
            {lang === 'en'
              ? 'Zeynalikid products and plans are thoughtful companions on your child’s growth journey — never a replacement for personalized professional guidance.'
              : 'محصولات و برنامه‌های زینالیکید همراهان اندیشمند در مسیر رشد فرزند شما هستند — نه جایگزین مشاوره تخصصی.'}
          </p>

          <p style={{ fontSize: 12.5, color: 'var(--zk-primary)', marginTop: 4 }}>
            {lang === 'en' ? 'We recommend starting with a free consultation to choose the best option.' : 'برای انتخاب بهترین گزینه، پیشنهاد می‌کنیم ابتدا مشاوره رایگان را تکمیل کنید.'}
            <button onClick={goConsult} style={{ marginInlineStart: 8, background: 'transparent', border: 0, color: 'var(--zk-primary)', fontWeight: 700, fontSize: 12.5, textDecoration: 'underline' }}>
              {lang === 'en' ? 'Start consultation' : 'شروع مشاوره'}
            </button>
          </p>
        </div>

        {/* Horizontal scrollable filters */}
        <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 8, margin: '12px 0 14px', scrollSnapType: 'x mandatory' }}>
          {filters.map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id as any)}
              style={{
                minHeight: 46,
                padding: '0 17px',
                borderRadius: 999,
                border: filter === f.id ? '1px solid var(--zk-primary)' : '1px solid var(--zk-border)',
                background: filter === f.id ? 'var(--zk-primary-light)' : 'var(--zk-surface)',
                color: filter === f.id ? 'var(--zk-primary)' : 'var(--zk-text)',
                fontWeight: 700,
                fontSize: 12.5,
                whiteSpace: 'nowrap',
                flexShrink: 0,
                scrollSnapAlign: 'start',
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* Result count */}
        <div style={{ fontSize: 12.5, color: 'var(--zk-text-muted)', marginBottom: 10 }}>
          {filteredProducts.length} {lang === 'en' ? 'products' : 'محصول'}
        </div>

        {/* Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
          {filteredProducts.length > 0 ? (
            filteredProducts.map((p: any) => (
              <ProductCard
                key={p.id}
                product={p}
                size="normal"
                onProductClick={openDetail}
                T={T}
                lang={lang}
              />
            ))
          ) : (
            <div style={{ padding: 42, textAlign: 'center', background: 'var(--zk-surface)', borderRadius: 20, border: '1px solid var(--zk-border)' }}>
              <div style={{ fontSize: 15, color: 'var(--zk-text-muted)', marginBottom: 12 }}>
                {lang === 'en' ? 'No products match this filter.' : 'محصولی با این فیلتر پیدا نشد.'}
              </div>
              <button onClick={() => setFilter('all')} style={{ minHeight: 42, padding: '0 18px', borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', border: 0, fontWeight: 700 }}>
                {lang === 'en' ? 'Show all products' : 'نمایش همه محصولات'}
              </button>
            </div>
          )}
        </div>

        {/* Related / CTA at bottom */}
        {filteredProducts.length > 0 && (
          <div style={{ marginTop: 36, padding: '20px 18px', background: 'var(--zk-surface)', borderRadius: 22, border: '1px solid var(--zk-border)' }}>
            <div style={{ fontWeight: 700, fontSize: 14.5, marginBottom: 8 }}>{lang === 'en' ? 'Not sure which one is right?' : 'نمی‌دانی کدام مناسب‌تر است؟'}</div>
            <p style={{ fontSize: 13, color: 'var(--zk-text-muted)', marginBottom: 14 }}>{lang === 'en' ? 'Start with a free consultation to get a personalized recommendation.' : 'با یک مشاوره رایگان، بهترین گزینه را برای فرزندتان پیدا کنید.'}</p>
            <button onClick={goConsult} style={{ width: '100%', minHeight: 48, borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', fontWeight: 700, fontSize: 14 }}>
              {lang === 'en' ? 'Request free consultation' : 'درخواست مشاوره رایگان'}
            </button>
          </div>
        )}
      </div>

      {/* Product Detail Modal (full-screen mobile, same pattern as courses) — از طریق Portal تا روی هدر قرار گیرد */}
      {selectedProduct && createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.65)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0 }} onClick={closeDetail}>
          <div style={{ width: '100%', maxWidth: '100%', height: '100dvh', background: 'var(--zk-surface)', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <ProductDetailView
              product={selectedProduct}
              T={T}
              lang={lang}
              countries={cfg.countryCodes}
              onClose={closeDetail}
              onAddToCart={() => {
                closeDetail();
                app.setView('courses');
              }}
              onConsult={goConsult}
            />
          </div>
        </div>,
        document.body,
      )}

      <div style={{ maxWidth: 1080, margin: '0 auto', padding: '0 14px' }}>
        {showContactOn('products') && <ContactPanel cfg={cfg} T={T} lang={lang} />}
        <Footer cfg={cfg} T={T} lang={lang} />
      </div>
    </div>
  );
}
