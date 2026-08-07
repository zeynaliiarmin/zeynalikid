import React, { useEffect } from 'react';
import useVoiceRecorder from '../hooks/useVoiceRecorder';

export interface VoiceRecorderProps {
  T: any;
  lang: 'fa' | 'en';
  onRecorded: (blob: Blob) => void;
  onRemoved: () => void;
  maxDuration?: number;
}

function formatTime(secs: number): string {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  const ms = m < 10 ? `0${m}` : `${m}`;
  const ss = s < 10 ? `0${s}` : `${s}`;
  return `${ms}:${ss}`;
}

const MicIcon = ({ color = 'currentColor', size = 20 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
    <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
    <line x1="12" y1="19" x2="12" y2="22"/>
  </svg>
);

const StopIcon = ({ color = 'currentColor', size = 18 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <rect x="6" y="6" width="12" height="12" rx="2" fill={color} />
  </svg>
);

const TrashIcon = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M3 6h18"/>
    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
  </svg>
);

const RefreshIcon = ({ color = 'currentColor', size = 16 }: { color?: string; size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M23 4v6h-6"/>
    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
  </svg>
);

/**
 * Stage 11 — Compact & Intelligent 3-State VoiceRecorder (Redesign)
 * ۱. حالت Idle: دکمه Pill قرمز مینیمال با ارتفاع ثابت ۳۴px
 * ۲. حالت Recording: دکمه ۳۴px فشرده با نقطه چشمک‌زن، تایمر و دکمه Stop وکتوری (بدون ایموجی و بدون افزایش ارتفاع)
 * ۳. حالت Recorded: کارت اختصاصی تمام‌عرض پخش صدا در خط زیرین برچسب با دکمه‌های وکتوری حذف و ضبط مجدد (بدون در هم چپیدن)
 */
export default function VoiceRecorder({
  T,
  lang,
  onRecorded,
  onRemoved,
  maxDuration = 90,
}: VoiceRecorderProps) {
  const {
    state,
    startRecording,
    stopRecording,
    resetRecording,
    duration,
    audioBlob,
    audioUrl,
    error,
    maxDuration: maxDur,
  } = useVoiceRecorder(maxDuration);

  useEffect(() => {
    if (state === 'recorded' && audioBlob) {
      onRecorded(audioBlob);
    }
  }, [state, audioBlob, onRecorded]);

  const handleRemove = () => {
    resetRecording();
    onRemoved();
  };

  const isFa = lang === 'fa';

  return (
    <div
      style={{
        display: state === 'recorded' ? 'block' : 'inline-flex',
        width: state === 'recorded' ? '100%' : 'auto',
        alignItems: 'center',
        boxSizing: 'border-box',
      }}
    >
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            height: 34,
            padding: '0 12px',
            borderRadius: 9999,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#DC2626',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 12,
            fontWeight: 800,
            transition: 'all 0.2s ease',
            whiteSpace: 'nowrap',
            boxShadow: '0 2px 8px rgba(239, 68, 68, 0.12)',
            margin: 0,
          }}
        >
          <span
            style={{
              width: 20,
              height: 20,
              borderRadius: '50%',
              background: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MicIcon color="#fff" size={12} />
          </span>
          <span>{isFa ? 'ضبط یادداشت صوتی (اختیاری)' : 'Record voice note (optional)'}</span>
        </button>
      )}

      {state === 'recording' && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 10,
            minHeight: 34,
            height: 34,
            padding: '0 10px 0 6px',
            borderRadius: 9999,
            background: 'rgba(239, 68, 68, 0.12)',
            border: '1px solid #EF4444',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)',
            boxSizing: 'border-box',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: '#DC2626',
                display: 'inline-block',
                animation: 'pulse 1.2s infinite',
              }}
            />
            <span
              style={{
                fontFamily: 'monospace,-apple-system,"Courier New"',
                fontSize: 13,
                fontWeight: 800,
                color: '#DC2626',
              }}
              dir="ltr"
            >
              {formatTime(duration)}
            </span>
          </div>
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 5,
              minHeight: 26,
              height: 26,
              padding: '0 10px',
              borderRadius: 9999,
              border: 0,
              background: '#DC2626',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: 800,
              margin: 0,
            }}
          >
            <StopIcon color="#fff" size={11} />
            <span>{isFa ? 'توقف' : 'Stop'}</span>
          </button>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div
          style={{
            width: '100%',
            marginTop: 8,
            marginBottom: 8,
            padding: '12px 14px',
            borderRadius: 14,
            background: 'var(--zk-surface, #fff)',
            border: '1px solid rgba(220, 38, 38, 0.3)',
            boxShadow: '0 4px 14px rgba(220, 38, 38, 0.08)',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
            boxSizing: 'border-box',
          }}
        >
          {/* سطر اول: پلیر صدا با عرض راحت و استاندارد */}
          <div style={{ width: '100%' }}>
            <audio controls src={audioUrl} style={{ width: '100%', height: 38, display: 'block' }} />
          </div>

          {/* سطر دوم: عنوان ضبط شده و دکمه‌های حذف و ضبط مجدد با وکتور SVG */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              flexWrap: 'wrap',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#DC2626',
                  display: 'inline-block',
                }}
              />
              <span style={{ fontSize: 12, color: '#DC2626', fontWeight: 800 }}>
                {isFa ? 'یادداشت صوتی ضبط شد' : 'Voice note recorded'}
              </span>
              <span
                style={{
                  fontSize: 11,
                  color: 'var(--zk-text-muted, #64748B)',
                  fontFamily: 'monospace,-apple-system,"Courier New"',
                }}
                dir="ltr"
              >
                ({formatTime(duration)})
              </span>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <button
                type="button"
                onClick={handleRemove}
                title={isFa ? 'حذف' : 'Delete'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 30,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(220, 38, 38, 0.3)',
                  background: 'rgba(220, 38, 38, 0.08)',
                  color: '#DC2626',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11.5,
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  margin: 0,
                }}
              >
                <TrashIcon color="#DC2626" size={13} />
                <span>{isFa ? 'حذف' : 'Delete'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  resetRecording();
                  startRecording();
                }}
                title={isFa ? 'ضبط مجدد' : 'Re-record'}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 5,
                  minHeight: 30,
                  height: 30,
                  padding: '0 10px',
                  borderRadius: 8,
                  border: '1px solid rgba(15, 118, 110, 0.3)',
                  background: 'rgba(15, 118, 110, 0.08)',
                  color: '#0F766E',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  fontSize: 11.5,
                  fontWeight: 700,
                  transition: 'all 0.2s ease',
                  margin: 0,
                }}
              >
                <RefreshIcon color="#0F766E" size={13} />
                <span>{isFa ? 'ضبط مجدد' : 'Re-record'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            height: 34,
            padding: '0 10px',
            borderRadius: 9999,
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid #DC2626',
            color: '#DC2626',
            fontSize: 11.5,
            fontWeight: 700,
            boxSizing: 'border-box',
          }}
        >
          <span>{error || (isFa ? 'خطا در ضبط' : 'Error')}</span>
          <button
            type="button"
            onClick={resetRecording}
            style={{
              minHeight: 24,
              height: 24,
              padding: '0 8px',
              borderRadius: 9999,
              border: 0,
              background: '#DC2626',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 800,
              fontFamily: 'inherit',
              margin: 0,
            }}
          >
            {isFa ? 'تلاش مجدد' : 'Retry'}
          </button>
        </div>
      )}
    </div>
  );
}
