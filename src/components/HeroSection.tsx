import React from 'react';
import { useNavigate } from 'react-router-dom';
import SwapCta from './SwapCta';

interface HeroSectionProps {
  title: string;
  subtitle: string;
  imageUrl: string;
  imageAlt: string;
  imageAspect?: string;
  imagePosition?: string;
  ctaText?: string;
  ctaLink?: string;
  onCtaClick?: () => void;
  secondaryCtaText?: string;
  secondaryCtaLink?: string;
  onSecondaryClick?: () => void;
  T: any;
  lang: 'fa' | 'en';
  animateCoursesCta?: boolean;
  animateConsultCta?: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({title,subtitle,imageUrl,imageAlt,imageAspect,imagePosition,ctaText,ctaLink,onCtaClick,secondaryCtaText,secondaryCtaLink,onSecondaryClick,T,lang,animateCoursesCta,animateConsultCta}) => {
  const navigate = useNavigate();
  const go=(link?:string)=>{if(onCtaClick){onCtaClick();return}if(!link)return;if(link.startsWith('/'))navigate(link);else window.location.href=link};
  const goSecondary=()=>{if(onSecondaryClick){onSecondaryClick();return}if(!secondaryCtaLink)return;if(secondaryCtaLink.startsWith('/'))navigate(secondaryCtaLink);else window.location.href=secondaryCtaLink};
  const isRtl=lang==='fa';

  // تصویر انتخاب‌شده در پنل مدیریت باید بدون وابستگی به نام فایل نمایش داده شود.
  // asset13c فقط تصویر پیش‌فرض و fallback خطای بارگذاری است.
  const defaultHeroImage = '/images/asset13c-hero-mother-child.webp';
  const heroImageSrc = String(imageUrl || '').trim() || defaultHeroImage;

  return (
    <section 
      className="zk-hero zk-home-hero" 
      dir={isRtl?'rtl':'ltr'} 
      style={{
        position: 'relative',
        display:'flex',
        flexDirection: isRtl ? 'row-reverse' : 'row',
        alignItems:'center',
        gap: '18px',
        padding: '20px 16px',
        background: 'var(--zk-surface)',
        borderRadius: '24px',
        boxShadow: 'var(--zk-shadow-light)',
        border: '1px solid var(--zk-border)',
        marginBottom: '20px',
        overflow: 'hidden',
        minHeight: 'auto'
      }}
    >
      {/* Subtle decorative soft shape (very minimal) */}
      <div aria-hidden="true" style={{
        position:'absolute', top:'-20%', right: isRtl ? 'auto' : '-15%', left: isRtl ? '-15%' : 'auto',
        width:'160px', height:'160px', borderRadius:'50%',
        background: 'linear-gradient(135deg, #0F766E15, #0EA5E910)',
        filter: 'blur(38px)', zIndex: 0, pointerEvents:'none'
      }} />

      <div className="hero-content" style={{
        flex:1, minWidth:0, 
        textAlign: isRtl ? 'right' : 'left', 
        zIndex:1, position:'relative'
      }}>
        <div style={{
          display:'inline-flex', alignItems:'center', gap:6,
          fontSize:11, fontWeight:700, color:'var(--zk-primary)',
          background:'var(--zk-primary-light)', padding:'3px 11px', borderRadius:999,
          marginBottom:'9px', letterSpacing:'.2px'
        }}>
          {isRtl ? 'همراهی والدین' : 'For Parents'}
        </div>

        <h1 style={{
          fontSize:'clamp(1.55rem, 6.8vw, 2.1rem)',
          fontWeight:800, color:'var(--zk-text)',
          lineHeight:1.3, margin:'0 0 10px', letterSpacing:'-0.015em'
        }}>{title}</h1>

        <p style={{
          fontSize:'clamp(0.95rem, 3.6vw, 1.05rem)',
          color:'var(--zk-text-muted)', lineHeight:1.65, margin:'0 0 18px'
        }}>{subtitle}</p>

        <div style={{display:'flex', flexWrap:'wrap', gap:'9px', alignItems:'center'}}>
          {ctaText && (
            <SwapCta
              variant="consult"
              labelA={ctaText}
              labelB={isRtl ? 'همین حالا شروع کن' : 'Start right now'}
              onClick={()=>go(ctaLink)}
              pulse={!!animateConsultCta}
              glow={!animateConsultCta}
              style={animateConsultCta ? {
                minHeight:52, padding:'13px 28px', fontSize:15,
              } : (animateCoursesCta ? {minHeight:40, padding:'9px 16px', fontSize:12.5} : {minHeight:48, padding:'13px 26px', fontSize:15})}
            />
          )}
          {secondaryCtaText && (
            <button
              type="button"
              onClick={goSecondary}
              className="zk-btn zk-btn-secondary"
              style={animateCoursesCta ? {
                minHeight:54, padding:'14px 26px', fontSize:15, fontWeight:800,
                border:'2px solid var(--zk-primary)',
                animation:'zk-hero-pulse 1.6s ease-in-out infinite',
                WebkitAnimation:'zk-hero-pulse 1.6s ease-in-out infinite',
                transform:'scale(1.05)',
              } : {minHeight:48, padding:'13px 22px', fontSize:14}}
            >
              {secondaryCtaText}
            </button>
          )}
        </div>

        {/* Social proof micro */}
        <div style={{marginTop:'13px', fontSize:'11px', color:'var(--zk-text-subtle)', display:'flex', alignItems:'center', gap:6}}>
          <div style={{display:'flex', gap:'-3px'}}>
            {[1,2,3].map(i=><div key={i} style={{width:15,height:15,background:'#0F766E22',borderRadius:'50%',border:'1px solid #fff'}} />)}
          </div>
          <span>{isRtl ? 'بیش از ۱۰٬۰۰۰ مادر همراه' : 'Trusted by 10k+ parents'}</span>
        </div>
      </div>

      <div className="hero-image" style={{
        flex:'0 0 38%', maxWidth: '238px', minWidth:'108px', 
        order: isRtl ? 0 : 1, position:'relative', zIndex:1
      }}>
        <img 
          src={heroImageSrc} 
          alt={imageAlt || (isRtl ? 'مادر و کودک' : 'Mother and child')} 
          loading="eager" 
          fetchPriority="high" 
          style={{
            display:'block', width:'100%', height:'auto', 
            borderRadius:'20px', objectFit:'cover', 
            aspectRatio: imageAspect || '1.05 / 1', objectPosition: imagePosition || 'center',
            boxShadow: 'var(--zk-shadow-medium)'
          }} 
          onError={(e) => {
            const target = e.currentTarget;
            if (!target.src.includes('asset13c-hero-mother-child')) {
              target.src = '/images/asset13c-hero-mother-child.webp';
            }
          }}
        />
      </div>

      <style>{`
        @media (max-width: 480px) {
          .zk-home-hero { 
            flex-direction: column !important; 
            align-items: stretch !important; 
            padding: 18px 14px !important; 
            gap: 16px !important;
          }
          .zk-home-hero .hero-image { 
            order: 0 !important; 
            max-width: 100% !important; 
            width: 100% !important; 
          }
          .zk-home-hero .hero-image img { 
            aspect-ratio: 16 / 9.8 !important; 
            border-radius: 18px !important;
          }
          .zk-home-hero .hero-content { 
            text-align: center !important; 
          }
          .zk-home-hero .hero-content > div { 
            justify-content: center; 
          }
        }
        @media (max-width: 360px) {
          .zk-home-hero .hero-image img { aspect-ratio: 16/10 !important; }
        }
      `}</style>
    </section>
  );
};
export default HeroSection;
