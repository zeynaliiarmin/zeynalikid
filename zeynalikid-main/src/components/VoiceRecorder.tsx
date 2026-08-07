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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
 * Stage 11 — Compact VoiceRecorder (Redesign)
 * به‌صورت دکمه Pill قرمز ثابت (#DC2626 / #EF4444) که بدون تغییر در تم‌ها روبروی برچسب فیلد قرار می‌گیرد.
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
  const progressPct = Math.min(100, Math.max(0, (duration / maxDur) * 100));

  return (
    <div style={{ display: 'inline-flex', alignItems: 'center', boxSizing: 'border-box' }}>
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            minHeight: 34,
            padding: '5px 12px',
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
            padding: '6px 12px',
            borderRadius: 9999,
            background: 'rgba(239, 68, 68, 0.1)',
            border: '1px solid #EF4444',
            boxShadow: '0 2px 10px rgba(239, 68, 68, 0.2)',
          }}
        >
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
          <button
            type="button"
            onClick={stopRecording}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 4,
              padding: '4px 10px',
              borderRadius: 9999,
              border: 0,
              background: '#DC2626',
              color: '#fff',
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 11.5,
              fontWeight: 800,
            }}
          >
            <StopIcon color="#fff" size={12} />
            <span>{isFa ? 'توقف' : 'Stop'}</span>
          </button>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '4px 10px',
            borderRadius: 9999,
            background: T.card || '#fff',
            border: '1px solid #DC2626',
            boxShadow: '0 2px 8px rgba(220, 38, 38, 0.15)',
          }}
        >
          <span style={{ fontSize: 11, color: '#DC2626', fontWeight: 700 }}>
            {isFa ? 'صدا ضبط شد' : 'Recorded'}
          </span>
          <audio controls src={audioUrl} style={{ height: 26, width: 140 }} />
          <button
            type="button"
            onClick={handleRemove}
            title={isFa ? 'حذف' : 'Delete'}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(220, 38, 38, 0.12)',
              color: '#DC2626',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <TrashIcon color="#DC2626" size={13} />
          </button>
          <button
            type="button"
            onClick={() => {
              resetRecording();
              startRecording();
            }}
            title={isFa ? 'ضبط مجدد' : 'Re-record'}
            style={{
              width: 24,
              height: 24,
              borderRadius: '50%',
              border: 'none',
              background: 'rgba(15, 118, 110, 0.12)',
              color: '#0F766E',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              padding: 0,
            }}
          >
            <RefreshIcon color="#0F766E" size={13} />
          </button>
        </div>
      )}

      {state === 'error' && (
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 6,
            padding: '4px 10px',
            borderRadius: 9999,
            background: 'rgba(220, 38, 38, 0.12)',
            border: '1px solid #DC2626',
            color: '#DC2626',
            fontSize: 11.5,
            fontWeight: 700,
          }}
        >
          <span>{error || (isFa ? 'خطا در ضبط' : 'Error')}</span>
          <button
            type="button"
            onClick={resetRecording}
            style={{
              padding: '2px 8px',
              borderRadius: 9999,
              border: 0,
              background: '#DC2626',
              color: '#fff',
              cursor: 'pointer',
              fontSize: 11,
              fontWeight: 800,
            }}
          >
            {isFa ? 'تلاش مجدد' : 'Retry'}
          </button>
        </div>
      )}
    </div>
  );
}
