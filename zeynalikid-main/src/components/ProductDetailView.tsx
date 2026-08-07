import React, { useState, useRef, useEffect } from 'react';

interface Product {
  id: string;
  name?: string;
  title?: string;
  description?: string;
  desc?: string;
  price?: string;
  priceNum?: number;
  discountedPrice?: number;
  image?: string;
  imageUrl?: string;
  category?: string;
  features?: string[];
  duration?: string;
  weight?: string;
}

interface Props {
  product: Product;
  T: any;
  lang: 'fa' | 'en';
  onClose?: () => void;
  onAddToCart?: () => void;
  onConsult?: () => void;
}

export default function ProductDetailView({ product, T, lang, onClose, onAddToCart, onConsult }: Props) {
  const [activeTab, setActiveTab] = useState<'intro' | 'specs' | 'reviews' | 'faq'>('intro');
  const isFa = lang === 'fa';

  const name = isFa ? (product.name || product.title || '') : (product.title || product.name || '');
  const desc = isFa ? (product.description || product.desc || '') : (product.desc || product.description || '');

  const priceNum = product.priceNum || Number(String(product.price || '').replace(/[^0-9]/g, '')) || 0;
  const discounted = product.discountedPrice || 0;
  const hasDiscount = discounted > 0 && priceNum > discounted;

  const tabBarRef = useRef<HTMLDivElement>(null);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});

  useEffect(() => {
    const activeBtn = tabRefs.current[activeTab];
    const container = tabBarRef.current;
    if (activeBtn && container) {
      const containerRect = container.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      const scrollLeft = activeBtn.offsetLeft - (containerRect.width / 2) + (btnRect.width / 2);
      container.scrollTo({ left: Math.max(0, scrollLeft), behavior: 'smooth' });
    }
  }, [activeTab]);

  const features = product.features?.length
    ? product.features
    : [
        isFa ? 'دوره شخصی‌سازی‌شده بر اساس طبع کودک' : 'Personalized plan based on child’s temperament',
        isFa ? 'پشتیبانی ۷ روزه پس از ثبت دوره' : '7-day support after enrollment',
        isFa ? 'راهنمای کامل استفاده و پیگیری' : 'Complete usage guide and follow-up',
        isFa ? 'محصولات با کیفیت بالا و ایمن' : 'High-quality and safe ingredients',
        isFa ? 'مناسب سنین ۲ تا ۱۷ سال' : 'Suitable for ages 2-17',
      ];

  const reviews = [
    { name: isFa ? 'مادر مهسا' : 'Mahsa’s mom', rating: 5, text: isFa ? 'کیفیت عالی و توضیحات کامل بود.' : 'Excellent quality and clear instructions.' },
    { name: isFa ? 'پدر علی' : 'Ali’s dad', rating: 4, text: isFa ? 'خیلی به ما کمک کرد.' : 'Helped us a lot.' },
  ];

  const imgSrc = product.image || product.imageUrl || '/images/product-personalized-plan.webp';

  return (
    <div style={{ background: 'var(--zk-surface)', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--zk-border)', boxShadow: 'var(--zk-shadow-medium)' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 210, background: 'linear-gradient(145deg, #F8F4EF, #FDF8F3)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
        <img
          src={imgSrc}
          alt={name}
          style={{ maxWidth: '78%', maxHeight: '158px', width: 'auto', height: 'auto', objectFit: 'contain' }}
          onError={(e: any) => { e.currentTarget.src = '/images/product-personalized-plan.webp'; }}
        />

        {/* Top actions — correct RTL: back in top-right (RTL), top-left (LTR) */}
        <div style={{ position: 'absolute', top: 12, left: 12, zIndex: 10 }}>
          {/* Back button */}
          <button 
            onClick={onClose} 
            style={{ 
              background: 'rgba(255,255,255,0.95)', 
              border: 0, 
              borderRadius: 999, 
              width: 36, 
              height: 36, 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer'
            }}
          >
            <svg 
              width="16" 
              height="16" 
              viewBox="0 0 24 24" 
              fill="none" 
              stroke="#111" 
              strokeWidth="3"
              style={{ transform: isFa ? 'scaleX(-1)' : 'none' }}
            >
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>

          
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 999, background: '#0EA5E9', color: '#fff', fontWeight: 700 }}>{product.category || (isFa ? 'دوره شخصی‌سازی‌شده' : 'Personalized Plan')}</span>
          {product.duration && <span style={{ fontSize: 11, color: 'var(--zk-text-muted)' }}>{product.duration}</span>}
        </div>

        <h1 style={{ fontSize: 20, fontWeight: 800, margin: '2px 0 8px' }}>{name}</h1>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {hasDiscount ? (
            <>
              <span style={{ fontSize: 19, fontWeight: 800, color: 'var(--zk-primary)' }}>{discounted.toLocaleString()} {isFa ? 'تومان' : 'T'}</span>
              <span style={{ textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: 13 }}>{priceNum.toLocaleString()}</span>
            </>
          ) : (
            <span style={{ fontSize: 18, fontWeight: 800, color: 'var(--zk-primary)' }}>{product.price || '—'}</span>
          )}
        </div>
      </div>

      {/* Swipeable Tabs */}
      <div
        ref={tabBarRef}
        style={{ display: 'flex', borderBottom: '1px solid var(--zk-border)', paddingInline: 4, overflowX: 'auto', scrollSnapType: 'x mandatory', WebkitOverflowScrolling: 'touch' }}
      >
        {(['intro', 'specs', 'reviews', 'faq'] as const).map(tab => (
          <button
            key={tab}
            ref={el => { tabRefs.current[tab] = el; }}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: '12px 18px',
              fontWeight: activeTab === tab ? 800 : 500,
              color: activeTab === tab ? 'var(--zk-primary)' : 'var(--zk-text-muted)',
              borderTop: 'none',
              borderLeft: 'none',
              borderRight: 'none',
              borderBottom: activeTab === tab ? '3px solid var(--zk-primary)' : '3px solid transparent',
              background: 'transparent',
              whiteSpace: 'nowrap',
              fontSize: 13.5,
              minHeight: 46,
              scrollSnapAlign: 'center',
              flexShrink: 0,
            }}
          >
            {tab === 'intro' && (isFa ? 'معرفی' : 'Intro')}
            {tab === 'specs' && (isFa ? 'مشخصات' : 'Specs')}
            {tab === 'reviews' && (isFa ? 'نظرات' : 'Reviews')}
            {tab === 'faq' && (isFa ? 'سوالات متداول' : 'FAQ')}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={{ padding: '16px 16px 20px' }}>
        {activeTab === 'intro' && (
          <>
            <p style={{ fontSize: 13.5, lineHeight: 1.7, color: 'var(--zk-text)' }}>{desc || (isFa ? 'این محصول همراهی تخصصی برای والدین است تا برنامه‌های تغذیه و رشد را به شکلی ساده و علمی دنبال کنند.' : 'This product provides calm, expert support for parents following personalized nutrition and growth plans.')}</p>

            {/* Features */}
            <div style={{ marginTop: 16 }}>
              <div style={{ fontWeight: 700, marginBottom: 7, fontSize: 13.5 }}>{isFa ? 'ویژگی‌ها / چه چیزی دریافت می‌کنید' : 'What you receive'}</div>
              <div style={{ display: 'grid', gap: 7 }}>
                {features.slice(0, 6).map((f, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 9, fontSize: 13 }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--zk-primary)" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* About the program */}
            <div style={{ marginTop: 18, padding: '14px 16px', background: 'var(--zk-surface-muted)', borderRadius: 16, fontSize: 13, lineHeight: 1.6 }}>
              {isFa ? 'این دوره شخصی‌سازی‌شده با بررسی شرایط فرزند شما طراحی می‌شود و شامل راهنمایی‌های دقیق تغذیه‌ای و پیگیری است.' : 'This personalized plan is designed based on your child’s profile and includes detailed nutrition guidance and follow-up.'}
            </div>

            {/* Gentle warning */}
            <div style={{ marginTop: 14, padding: '12px 15px', background: '#FEF3C7', border: '1px solid #F59E0B33', borderRadius: 14, fontSize: 12.5, lineHeight: 1.55, color: '#713F12' }}>
              {isFa ? 'نکته مهم: معرفی این محصول جایگزین مشاوره نمی‌باشد و تهیه این محصول جایگزین دوره مربوطه نیست. این محصول صرفاً یکی از محصولات ما برای معرفی می‌باشد، لطفاً برای اطلاعات بیشتر در مورد دوره‌ها با ضربه زدن روی گزینه «مشاوره رایگان» درخواست مشاوره ثبت کنید.' : 'Important: This product presentation is not a substitute for consultation, and obtaining it does not replace the corresponding course. This is simply one of our products showcased for informational purposes. For more details about our courses, please tap "Free consult" to request a consultation.'}
            </div>
          </>
        )}

        {activeTab === 'specs' && (
          <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--zk-border)' }}>
              <span>{isFa ? 'نوع محصول' : 'Type'}</span><span>{product.category || (isFa ? 'دوره شخصی‌سازی‌شده' : 'Personalized Plan')}</span>
            </div>
            {product.weight && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{isFa ? 'وزن / حجم' : 'Weight / Size'}</span><span>{product.weight}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{isFa ? 'پشتیبانی' : 'Support'}</span><span>{isFa ? '۷ روزه' : '7 days'}</span></div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
            {reviews.map((r, i) => (
              <div key={i} style={{ background: 'var(--zk-surface-muted)', padding: 13, borderRadius: 13 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                  <span style={{ fontWeight: 700 }}>{r.name}</span>
                  <span style={{ color: '#F59E0B' }}>{''.repeat(r.rating)}</span>
                </div>
                <p style={{ margin: 0, fontSize: 13, color: 'var(--zk-text-muted)' }}>{r.text}</p>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'faq' && (
          <div style={{ fontSize: 13.5, color: 'var(--zk-text-muted)' }}>
            {isFa ? 'سوالات متداول این محصول در بخش پرسش‌های متداول سایت موجود است.' : 'Product FAQs are available on the main FAQ page.'}
          </div>
        )}
      </div>

      {/* Sticky CTA — safe-area */}
      <div style={{ position: 'sticky', bottom: 0, background: 'rgba(253,248,243,0.96)', borderTop: '1px solid var(--zk-border)', padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', display: 'flex', gap: 10, zIndex: 10 }}>
        <button onClick={onConsult} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface)', fontWeight: 700, fontSize: 13.5 }}>
          {isFa ? 'مشاوره رایگان' : 'Free consult'}
        </button>
        <button onClick={onAddToCart} style={{ flex: 1, minHeight: 46, borderRadius: 999, background: 'var(--zk-primary)', color: '#fff', fontWeight: 700, fontSize: 13.5 }}>
          {isFa ? 'معرفی دوره‌ها' : 'View courses'}
        </button>
      </div>
    </div>
  );
}
