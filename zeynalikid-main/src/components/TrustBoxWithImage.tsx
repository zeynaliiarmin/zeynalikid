import React from 'react';

interface TrustBoxWithImageProps {
  text: string;
  imageUrl: string;
  imageAlt: string;
  imagePosition?: 'left' | 'right' | 'top' | 'bottom';
  T: any;
}

const TrustBoxWithImage: React.FC<TrustBoxWithImageProps> = ({
  text,
  imageUrl,
  imageAlt,
  imagePosition = 'left',
  T,
}) => {
  const isHorizontal = imagePosition === 'left' || imagePosition === 'right';
  const flexDirection = imagePosition === 'left' ? 'row' : imagePosition === 'right' ? 'row-reverse' : 'column';

  // Stage 1: Warm trust styling + correct asset
  return (
    <div
      className="zk-trust-box trust-box-with-image"
      style={{
        display: 'flex',
        flexDirection,
        alignItems: 'center',
        gap: '18px',
        background: 'var(--zk-surface)',
        borderRadius: '22px',
        padding: '18px',
        boxShadow: 'var(--zk-shadow-light)',
        border: '1px solid var(--zk-border)',
      }}
    >
      <div className="trust-image" style={{ flex: isHorizontal ? '0 0 42%' : '1', minWidth: isHorizontal ? 118 : undefined }}>
        <img
          src={imageUrl || '/images/asset13c-trust-parent-care.webp'}
          alt={imageAlt || 'مادر و کودک'}
          loading="lazy"
          style={{
            width: '100%',
            height: 'auto',
            borderRadius: '18px',
            objectFit: 'cover',
            aspectRatio: isHorizontal ? '4 / 3' : '16 / 9',
            boxShadow: 'var(--zk-shadow-medium)',
          }}
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('asset13c-trust-parent-care')) {
              target.src = '/images/asset13c-trust-parent-care.webp';
            }
          }}
        />
      </div>
      <div className="trust-text" style={{ flex: 1 }}>
        <p
          style={{
            fontSize: 'clamp(14px, 2.1vw, 16.5px)',
            lineHeight: 1.65,
            fontWeight: 600,
            color: 'var(--zk-text)',
            margin: 0,
          }}
        >
          {text}
        </p>
      </div>
    </div>
  );
};

export default TrustBoxWithImage;