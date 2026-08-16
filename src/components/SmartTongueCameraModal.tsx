import React, { useState, useRef, useEffect, useCallback } from 'react';

interface Props {
  onCapture: (file: File) => void;
  onClose: () => void;
  T: any;
  lang: 'fa' | 'en';
}

export default function SmartTongueCameraModal({ onCapture, onClose, T, lang }: Props) {
  const isFa = lang === 'fa';
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasCamera, setHasCamera] = useState<boolean | null>(null);
  const [capturing, setCapturing] = useState(false);
  const [flash, setFlash] = useState(false);

  // راه‌اندازی استریم دوربین زنده
  const startCamera = useCallback(async (mode: 'environment' | 'user') => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setHasCamera(false);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(() => {});
      }
      setHasCamera(true);
    } catch (err) {
      console.warn('Smart camera init fallback:', err);
      // تلاش مجدد با هر دوربینی که در دسترس است
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          videoRef.current.play().catch(() => {});
        }
        setHasCamera(true);
      } catch {
        setHasCamera(false);
      }
    }
  }, []);

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode, startCamera]);

  const toggleCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takePhoto = () => {
    if (!videoRef.current || capturing) return;
    setCapturing(true);
    setFlash(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // در حالت سلفی تصویر را معکوس کن تا طبیعی باشد
      if (facingMode === 'user') {
        ctx.translate(canvas.width, 0);
        ctx.scale(-1, 1);
      }

      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            const file = new File([blob], `tongue-smart-${Date.now()}.webp`, {
              type: 'image/webp',
              lastModified: Date.now(),
            });
            onCapture(file);
            onClose();
          }
          setCapturing(false);
        },
        'image/webp',
        0.88
      );
    } catch (e) {
      console.error('Capture error:', e);
      setCapturing(false);
    } finally {
      setTimeout(() => setFlash(false), 250);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(0,0,0,0.92)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 'calc(14px + env(safe-area-inset-top, 0px)) 16px calc(20px + env(safe-area-inset-bottom, 0px))',
        animation: 'fade .25s ease both',
        color: '#fff',
      }}
    >
      {/* هدر بالا و دکمه بستن */}
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 10,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 10px #10b981',
            }}
          />
          <span style={{ fontSize: 14, fontWeight: 800 }}>
            {isFa ? 'دوربین هوشمند ارزیابی زبان' : 'Smart Tongue Camera'}
          </span>
        </div>

        <button
          type="button"
          onClick={onClose}
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.2)',
            border: 0,
            color: '#fff',
            fontSize: 20,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>

      {/* فریم زنده دوربین با طرح هوشمند زبان */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          maxWidth: 420,
          aspectRatio: '3/4',
          borderRadius: 24,
          overflow: 'hidden',
          background: '#0a0a0a',
          boxShadow: '0 12px 40px rgba(0,0,0,0.6)',
          border: '2px solid rgba(255,255,255,0.15)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {hasCamera === false ? (
          <div style={{ textAlign: 'center', padding: 24 }}>
            <div style={{ fontSize: 36, marginBottom: 10 }}>📸</div>
            <p style={{ fontSize: 13, lineHeight: 1.8, color: '#fca5a5', margin: '0 0 14px' }}>
              {isFa
                ? 'دسترسی به دوربین زنده در این مرورگر مقدور نشد. می‌توانید از دکمه عکاسی مستقیم سیستم‌عامل استفاده نمایید.'
                : 'Direct camera access not available. Use system capture instead.'}
            </p>
            <label
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 6,
                padding: '10px 18px',
                borderRadius: 14,
                background: T.grad || '#0F766E',
                color: '#fff',
                fontSize: 13,
                fontWeight: 800,
                cursor: 'pointer',
              }}
            >
              <input
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    onCapture(f);
                    onClose();
                  }
                }}
              />
              <span>{isFa ? '📸 باز کردن دوربین دستگاه' : 'Open Device Camera'}</span>
            </label>
          </div>
        ) : (
          <>
            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
              }}
            />

            {/* فلش شاتر */}
            {flash && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  background: '#fff',
                  opacity: 0.9,
                  transition: 'opacity .25s ease',
                  zIndex: 20,
                }}
              />
            )}

            {/* فریم و طرح گرافیکی هوشمند زبان انسان (Tongue Guide Outline) */}
            <svg
              viewBox="0 0 300 400"
              style={{
                position: 'absolute',
                inset: 0,
                width: '100%',
                height: '100%',
                pointerEvents: 'none',
                zIndex: 5,
              }}
            >
              {/* پس‌زمینه نیمه‌محو دور فریم */}
              <defs>
                <mask id="tongueHoleMask">
                  <rect width="300" height="400" fill="white" />
                  {/* حفره تخم‌مرغی/منحنی زبان */}
                  <path
                    d="M 150,60 C 195,60 230,110 230,190 C 230,280 195,340 150,340 C 105,340 70,280 70,190 C 70,110 105,60 150,60 Z"
                    fill="black"
                  />
                </mask>
              </defs>

              <rect width="300" height="400" fill="rgba(0,0,0,0.35)" mask="url(#tongueHoleMask)" />

              {/* خط‌چین راهنمای کادر زبان با رنگ فیروزه‌ای ملایم */}
              <path
                d="M 150,60 C 195,60 230,110 230,190 C 230,280 195,340 150,340 C 105,340 70,280 70,190 C 70,110 105,60 150,60 Z"
                fill="none"
                stroke="#14B8A6"
                strokeWidth="3.5"
                strokeDasharray="8 6"
                strokeLinecap="round"
              />

              {/* شیار میانی زبان برای تراز دقیق */}
              <line
                x1="150"
                y1="100"
                x2="150"
                y2="280"
                stroke="rgba(20,184,166,0.5)"
                strokeWidth="2"
                strokeDasharray="4 4"
              />

              {/* گوشه‌های کادر فوکوس */}
              <path d="M 60,80 L 60,60 L 80,60" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" />
              <path d="M 240,80 L 240,60 L 220,60" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" />
              <path d="M 60,320 L 60,340 L 80,340" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" />
              <path d="M 240,320 L 240,340 L 220,340" fill="none" stroke="#0EA5E9" strokeWidth="3" strokeLinecap="round" />
            </svg>

            {/* برچسب راهنمای بالای کادر */}
            <div
              style={{
                position: 'absolute',
                top: 14,
                background: 'rgba(0,0,0,0.65)',
                backdropFilter: 'blur(4px)',
                padding: '6px 14px',
                borderRadius: 20,
                fontSize: 12,
                fontWeight: 700,
                color: '#2dd4bf',
                zIndex: 6,
                border: '1px solid rgba(45,212,191,0.3)',
                textAlign: 'center',
                maxWidth: '90%',
              }}
            >
              {isFa ? '👅 زبان کودک را درون کادر تنظیم کنید' : 'Align child tongue inside outline'}
            </div>
          </>
        )}
      </div>

      {/* نوار پایینی و دکمه شاتر عکاسی */}
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-around',
          marginTop: 14,
          zIndex: 10,
        }}
      >
        {/* دکمه چرخش دوربین (پشت / جلو) */}
        <button
          type="button"
          onClick={toggleCamera}
          title={isFa ? 'چرخش دوربین' : 'Flip Camera'}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 20,
          }}
        >
          🔄
        </button>

        {/* دکمه شاتر عکاسی بزرگ */}
        <button
          type="button"
          onClick={takePhoto}
          disabled={capturing || hasCamera === false}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: '#fff',
            border: '5px solid #14B8A6',
            boxShadow: '0 0 25px rgba(20,184,166,0.6)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            outline: 'none',
            transition: 'transform .15s ease',
          }}
          onMouseDown={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(0.92)')}
          onMouseUp={(e) => ((e.currentTarget as HTMLElement).style.transform = 'scale(1)')}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: '50%',
              background: '#0F766E',
            }}
          />
        </button>

        {/* دکمه بستن */}
        <button
          type="button"
          onClick={onClose}
          style={{
            width: 46,
            height: 46,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.15)',
            border: '1px solid rgba(255,255,255,0.3)',
            color: '#fff',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 16,
            fontWeight: 800,
          }}
        >
          {isFa ? 'لغو' : 'Cancel'}
        </button>
      </div>
    </div>
  );
}
