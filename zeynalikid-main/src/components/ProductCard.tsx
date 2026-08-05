import React, { useState } from 'react';

interface ProductType {
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
  tags?: string[];
  features?: string[];
  isVisible?: boolean;
  active?: boolean;
  stock?: number;
}

interface ProductCardProps {
  product: ProductType;
  size?: 'normal' | 'small' | 'hero';
  onProductClick?: (product: ProductType) => void;
  onAddToWishlist?: (product: ProductType) => void;
  T?: any;
  lang?: 'fa' | 'en';
}

const FALLBACK_PRODUCT = '/images/product-personalized-plan.webp';

const getCategoryBadge = (cat: string | undefined, lang: 'fa' | 'en') => {
  const c = (cat || '').toLowerCase();
  if (c.includes('personal') || c.includes('برنامه')) return { label: lang === 'en' ? 'Personalized Plan' : 'برنامه شخصی‌سازی‌شده', color: '#0EA5E9' };
  if (c.includes('supplement') || c.includes('مکمل')) return { label: lang === 'en' ? 'Supplement' : 'مکمل تخصصی', color: '#0F766E' };
  if (c.includes('education') || c.includes('منبع')) return { label: lang === 'en' ? 'Educational' : 'منبع آموزشی', color: '#14B8A6' };
  if (c.includes('bundle') || c.includes('باندل')) return { label: lang === 'en' ? 'Bundle' : 'باندل همراهی', color: '#F59E0B' };
  return { label: lang === 'en' ? 'Product' : 'محصول', color: '#0F766E' };
};

export default function ProductCard({
  product,
  size = 'normal',
  onProductClick,
  onAddToWishlist,
  T,
  lang = 'fa'
}: ProductCardProps) {
  const isFa = lang === 'fa';
  const name = isFa ? (product.name || product.title || '') : (product.title || product.name || '');
  const desc = isFa ? (product.description || product.desc || '') : (product.desc || product.description || '');

  const priceNum = product.priceNum || Number(String(product.price || '').replace(/[^0-9]/g, '')) || 0;
  const discounted = product.discountedPrice || 0;
  const hasDiscount = discounted > 0 && priceNum > discounted;

  const badge = getCategoryBadge(product.category, lang);

  const imgSrc = product.image || product.imageUrl || FALLBACK_PRODUCT;

  const handleClick = () => onProductClick?.(product);

  // Stage 6 fix: local wishlist heart with animation (will connect in Stage 10)
  const [isWish, setIsWish] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  const handleWishlist = (e: React.MouseEvent) => {
    e.stopPropagation();
    const next = !isWish;
    setIsWish(next);
    setIsAnimating(true);
    setTimeout(() => setIsAnimating(false), 220);
    onAddToWishlist?.(product);
  };

  const isSmall = size === 'small';

  return (
    <article
      onClick={handleClick}
      style={{
        background: 'var(--zk-surface)',
        border: '1px solid var(--zk-border)',
        borderRadius: '22px',
        overflow: 'hidden',
        boxShadow: 'var(--zk-shadow-light)',
        cursor: 'pointer',
        transition: 'all 200ms ease',
        display: isSmall ? 'flex' : 'block',
        minWidth: 0,
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--zk-shadow-medium)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.transform = 'none';
        (e.currentTarget as HTMLElement).style.boxShadow = 'var(--zk-shadow-light)';
      }}
    >
      {/* Image area - 1:1 or 4:5, object-contain on soft bg */}
      <div
        style={{
          position: 'relative',
          height: isSmall ? '92px' : '168px',
          background: 'linear-gradient(145deg, #F8F4EF, #FDF8F3)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '14px',
          overflow: 'hidden',
        }}
      >
        <img
          src={imgSrc}
          alt={name}
          loading="lazy"
          style={{
            maxWidth: '82%',
            maxHeight: isSmall ? '68px' : '124px',
            width: 'auto',
            height: 'auto',
            objectFit: 'contain',
            display: 'block',
          }}
          onError={(e: any) => {
            if (e.currentTarget.src !== FALLBACK_PRODUCT) {
              e.currentTarget.src = FALLBACK_PRODUCT;
            }
          }}
        />

        {/* Top badge */}
        <div style={{ position: 'absolute', top: 10, left: 10, right: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <span
            style={{
              background: badge.color,
              color: '#fff',
              fontSize: '10px',
              fontWeight: 700,
              padding: '2px 9px',
              borderRadius: '999px',
              whiteSpace: 'nowrap',
            }}
          >
            {badge.label}
          </span>

          {hasDiscount && (
            <span
              style={{
                background: '#F59E0B',
                color: '#fff',
                fontSize: '9.5px',
                fontWeight: 700,
                padding: '1px 7px',
                borderRadius: '999px',
              }}
            >
              {Math.round(((priceNum - discounted) / priceNum) * 100)}% تخفیف
            </span>
          )}
        </div>

        {/* Wishlist heart — Stage 6: local animated heart (outline to filled warm pink on click) */}
        <button
          onClick={handleWishlist}
          style={{
            position: 'absolute',
            bottom: 10,
            right: 10,
            width: 34,
            height: 34,
            borderRadius: '999px',
            background: 'rgba(255,255,255,0.95)',
            border: '1px solid var(--zk-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            zIndex: 2,
            transition: 'transform 220ms ease',
            transform: isAnimating ? 'scale(1.2)' : 'scale(1)',
          }}
          aria-label="افزودن به علاقه‌مندی‌ها"
        >
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill={isWish ? '#E07A8A' : 'none'} 
            stroke={isWish ? '#E07A8A' : '#0F766E'} 
            strokeWidth="2.2" 
            strokeLinecap="round" 
            strokeLinejoin="round"
          >
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
          </svg>
        </button>
      </div>

      {/* Body */}
      <div style={{ padding: isSmall ? '9px 11px' : '13px 14px 15px' }}>
        <h3 style={{
          fontSize: isSmall ? '13px' : '15px',
          fontWeight: 800,
          color: 'var(--zk-text)',
          margin: '0 0 5px',
          lineHeight: 1.3,
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical' as any,
          overflow: 'hidden',
        }}>
          {name}
        </h3>

        {desc && !isSmall && (
          <p style={{
            fontSize: '12px',
            color: 'var(--zk-text-muted)',
            lineHeight: 1.5,
            margin: '0 0 8px',
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical' as any,
            overflow: 'hidden',
          }}>
            {desc}
          </p>
        )}

        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 8 }}>
          {hasDiscount ? (
            <>
              <span style={{ color: 'var(--zk-primary)', fontWeight: 800, fontSize: isSmall ? '13px' : '15px' }}>
                {discounted.toLocaleString()} {isFa ? 'تومان' : 'T'}
              </span>
              <span style={{ textDecoration: 'line-through', color: 'var(--zk-text-muted)', fontSize: isSmall ? '11px' : '12px' }}>
                {priceNum.toLocaleString()}
              </span>
            </>
          ) : product.price ? (
            <span style={{ color: 'var(--zk-primary)', fontWeight: 800, fontSize: isSmall ? '13px' : '15px' }}>
              {product.price} {isFa ? 'تومان' : 'T'}
            </span>
          ) : null}
        </div>

        {/* CTA pill */}
        {!isSmall && (
          <div style={{
            background: 'var(--zk-primary)',
            color: '#fff',
            fontSize: '13px',
            fontWeight: 700,
            padding: '9px 16px',
            borderRadius: '999px',
            textAlign: 'center',
            minHeight: 42,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {isFa ? 'مشاهده و خرید' : 'View & Buy'}
          </div>
        )}
      </div>
    </article>
  );
}
