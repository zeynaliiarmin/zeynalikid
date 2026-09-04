import React from 'react';
import ReviewSection from './ReviewSection';
import StickyAnchorNav, { detailSectionStyle, detailSectionTitleStyle } from './StickyAnchorNav';
import PublicBackButton from './PublicBackButton';

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
  countries?: any[];
}

export default function ProductDetailView({ product, T, lang, onClose, onAddToCart, onConsult, countries }: Props) {
  const isFa = lang === 'fa';

  const name = isFa ? (product.name || product.title || '') : (product.title || product.name || '');
  const desc = isFa ? (product.description || product.desc || '') : (product.desc || product.description || '');

  const priceNum = product.priceNum || Number(String(product.price || '').replace(/[^0-9]/g, '')) || 0;
  const discounted = product.discountedPrice || 0;
  const hasDiscount = discounted > 0 && priceNum > discounted;

  // Product details are shown in a full-screen scrolling modal. The shared
  // navigation automatically discovers that scroll container.
  const navTopOffset = 0;
  const anchorItems = [
    { id: 'product-detail-intro', label: isFa ? 'معرفی' : 'Intro' },
    { id: 'product-detail-specs', label: isFa ? 'مشخصات' : 'Specifications' },
    { id: 'product-detail-reviews', label: isFa ? 'نظرات' : 'Reviews' },
    { id: 'product-detail-faq', label: isFa ? 'پرسش‌های متداول' : 'FAQ' },
  ];

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

  const imgSrc = product.image || product.imageUrl || '/images/products/product-personalized-plan.webp';

  return (
    <div style={{ background: 'var(--zk-surface)', borderRadius: 22, overflow: 'hidden', border: '1px solid var(--zk-border)', boxShadow: 'var(--zk-shadow-medium)' }}>
      {/* Hero */}
      <div style={{ position: 'relative', height: 210, background: 'linear-gradient(145deg, var(--zk-surface-muted), var(--zk-bg))', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '18px' }}>
        <img
          src={imgSrc}
          alt={name}
          style={{ maxWidth: '78%', maxHeight: '158px', width: 'auto', height: 'auto', objectFit: 'contain', objectPosition: (product as any).objectPosition || 'center' }}
          onError={(e: any) => { e.currentTarget.src = '/images/products/product-personalized-plan.webp'; }}
        />

      </div>

      {/* Info */}
      <div style={{ padding: '16px 16px 8px' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, padding: '2px 9px', borderRadius: 999, background: '#0369A1', color: '#fff', fontWeight: 700 }}>{product.category || (isFa ? 'دوره شخصی‌سازی‌شده' : 'Personalized Plan')}</span>
          {product.duration && <span style={{ fontSize: 11, color: 'var(--zk-text-muted)' }}>{product.duration}</span>}
        </div>

        <div className="zk-public-title-row" dir={isFa ? 'rtl' : 'ltr'} style={{ margin: '2px 0 8px' }}>
          <PublicBackButton lang={isFa ? 'fa' : 'en'} onBack={onClose} fallback="/products" testId="public-product-detail-back" />
          <h1 style={{ fontSize: 20, fontWeight: 800, margin: 0 }}>{name}</h1>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          {hasDiscount ? (
            <>
              <span style={{ fontSize: 19, fontWeight: 800, color:'var(--zk-primary-text)' }}>{discounted.toLocaleString()} {isFa ? 'تومان' : 'T'}</span>
              <span style={{ textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: 13 }}>{priceNum.toLocaleString()}</span>
            </>
          ) : product.price ? (
            <span style={{ fontSize: 18, fontWeight: 800, color:'var(--zk-primary-text)' }}>{product.price} {isFa ? 'تومان' : 'T'}</span>
          ) : null}
        </div>
      </div>

      <StickyAnchorNav
        items={anchorItems}
        topOffset={navTopOffset}
        maxWidth="100%"
        zIndex={10020}
        lang={lang}
        ariaLabel={isFa ? 'بخش‌های صفحه جزئیات محصول' : 'Product detail sections'}
      />

      {/* همهٔ محتوا در یک جریان پیوسته؛ ناوبری فقط پس از رسیدن کاربر به این محدوده ظاهر می‌شود. */}
      <div style={{ padding: '0 16px 24px' }}>
        <section id="product-detail-intro" data-detail-section style={{ ...detailSectionStyle(navTopOffset), borderTop: 0 }}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'معرفی محصول' : 'Product introduction'}</h2>
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
            <div style={{ marginTop: 14, padding: '12px 15px', background: 'color-mix(in srgb, var(--zk-warning) 10%, var(--zk-surface))', border: '1px solid color-mix(in srgb, var(--zk-warning) 40%, var(--zk-border))', borderRadius: 14, fontSize: 12.5, lineHeight: 1.55, color: 'var(--zk-warning)' }}>
              {isFa ? 'نکته مهم: معرفی این محصول جایگزین مشاوره نمی‌باشد و تهیه این محصول جایگزین دوره مربوطه نیست. این محصول صرفاً یکی از محصولات ما برای معرفی می‌باشد، لطفاً برای اطلاعات بیشتر در مورد دوره‌ها با ضربه زدن روی گزینه «مشاوره رایگان» درخواست مشاوره ثبت کنید.' : 'Important: This product presentation is not a substitute for consultation, and obtaining it does not replace the corresponding course. This is simply one of our products showcased for informational purposes. For more details about our courses, please tap "Free consult" to request a consultation.'}
            </div>
        </section>

        <section id="product-detail-specs" data-detail-section style={detailSectionStyle(navTopOffset)}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'مشخصات' : 'Specifications'}</h2>
          <div style={{ display: 'grid', gap: 10, fontSize: 13.5 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: 6, borderBottom: '1px solid var(--zk-border)' }}>
              <span>{isFa ? 'نوع محصول' : 'Type'}</span><span>{product.category || (isFa ? 'دوره شخصی‌سازی‌شده' : 'Personalized Plan')}</span>
            </div>
            {product.weight && <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{isFa ? 'وزن / حجم' : 'Weight / Size'}</span><span>{product.weight}</span></div>}
            <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>{isFa ? 'پشتیبانی' : 'Support'}</span><span>{isFa ? '۷ روزه' : '7 days'}</span></div>
          </div>
        </section>

        <section id="product-detail-reviews" data-detail-section style={detailSectionStyle(navTopOffset)}>
          <ReviewSection
            T={{ ...T, btnRadius: 14, cardRadius: 18, inputRadius: 12 }}
            lang={isFa ? 'fa' : 'en'}
            courseId={product?.id || ''}
            placement="product_detail"
            countries={countries}
          />
        </section>

        <section id="product-detail-faq" data-detail-section style={detailSectionStyle(navTopOffset)}>
          <h2 style={detailSectionTitleStyle}>{isFa ? 'پرسش‌های متداول' : 'Frequently asked questions'}</h2>
          <div style={{ fontSize: 13.5, color: 'var(--zk-text-muted)' }}>
            {isFa ? 'پرسش‌های متداول این محصول در بخش پرسش‌های متداول سایت موجود است.' : 'Product FAQs are available on the main FAQ page.'}
          </div>
        </section>
      </div>

      {/* Sticky CTA — safe-area (اگر محصول قیمت ندارد، به‌جای فروش فقط «مشاوره رایگان» نمایش داده می‌شود) */}
      <div style={{ position: 'sticky', bottom: 0, background: T.hdr || T.card, borderTop: '1px solid var(--zk-border)', padding: '10px 16px calc(10px + env(safe-area-inset-bottom, 0px))', display: 'flex', gap: 10, zIndex: 10 }}>
        {hasDiscount || product.price ? (
          <>
            <button onClick={onConsult} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface)', fontWeight: 700, fontSize: 13.5 }}>
              {isFa ? 'مشاوره رایگان' : 'Free consult'}
            </button>
            <button onClick={onAddToCart} style={{ flex: 1, minHeight: 46, borderRadius: 999, background: 'var(--zk-primary)', color: 'var(--zk-text-inverse, #fff)', fontWeight: 700, fontSize: 13.5 }}>
              {isFa ? 'معرفی دوره‌ها' : 'View courses'}
            </button>
          </>
        ) : (
          <button onClick={onConsult} style={{ flex: 1, minHeight: 46, borderRadius: 999, border: '1px solid var(--zk-border)', background: 'var(--zk-surface)', fontWeight: 700, fontSize: 13.5 }}>
            {isFa ? 'برای اطلاعات بیشتر، مشاوره رایگان' : 'Free consult for more info'}
          </button>
        )}
      </div>
    </div>
  );
}
