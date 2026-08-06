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
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <div style={{ marginTop: 8, marginBottom: 4, width: '100%', boxSizing: 'border-box' }}>
      {state === 'idle' && (
        <button
          type="button"
          onClick={startRecording}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            minHeight: 34,
            padding: '5px 12px',
            borderRadius: 999,
            background: 'rgba(239, 68, 68, 0.08)',
            border: '1px solid rgba(239, 68, 68, 0.35)',
            color: '#DC2626',
            cursor: 'pointer',
            fontFamily: 'inherit',
            fontSize: 13,
            fontWeight: 700,
            transition: 'all .2s ease',
          }}
        >
          <span
            style={{
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#EF4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            <MicIcon color="#fff" size={13} />
          </span>
          <span>{isFa ? 'ضبط یادداشت صوتی (اختیاری)' : 'Record voice note (optional)'}</span>
        </button>
      )}

      {state === 'recording' && (
        <div
          style={{
            padding: 12,
            borderRadius: T.cardRadius || 16,
            background: T.card,
            border: `1px solid ${T.err}55`,
            boxShadow: T.neuOut,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  background: T.err,
                  display: 'inline-block',
                  animation: 'pulse 1.5s infinite',
                }}
              />
              <span
                style={{
                  fontFamily: 'monospace,-apple-system,"Courier New"',
                  fontSize: 15,
                  fontWeight: 800,
                  color: T.err,
                }}
                dir="ltr"
              >
                {formatTime(duration)}
              </span>
              <span style={{ fontSize: 11, color: T.mut }} dir="ltr">
                / {formatTime(maxDur)}
              </span>
            </div>

            <button
              type="button"
              onClick={stopRecording}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
                borderRadius: T.btnRadius || 14,
                border: 0,
                background: T.err,
                color: '#fff',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 13,
                fontWeight: 800,
              }}
            >
              <StopIcon color="#fff" size={14} />
              <span>{isFa ? 'توقف' : 'Stop'}</span>
            </button>
          </div>

          <div
            style={{
              width: '100%',
              height: 4,
              borderRadius: 4,
              background: T.soft,
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progressPct}%`,
                background: T.err,
                transition: 'width .15s linear',
              }}
            />
          </div>
        </div>
      )}

      {state === 'recorded' && audioUrl && (
        <div
          style={{
            padding: 12,
            borderRadius: T.cardRadius || 16,
            background: T.card,
            border: `1px solid ${T.brd}`,
            boxShadow: T.neuOut,
          }}
        >
          <div style={{ fontSize: 12, color: T.mut, marginBottom: 4, fontWeight: 700 }}>
            {isFa ? 'یادداشت صوتی ضبط‌شده:' : 'Recorded voice note:'}
          </div>
          <audio controls src={audioUrl} style={{ width: '100%', marginTop: 4, marginBottom: 8 }} />

          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <button
              type="button"
              onClick={handleRemove}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: T.btnRadius || 12,
                border: `1px solid ${T.err}44`,
                background: `${T.err}10`,
                color: T.err,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <TrashIcon color={T.err} size={14} />
              <span>{isFa ? 'حذف' : 'Delete'}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                resetRecording();
                startRecording();
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '6px 12px',
                borderRadius: T.btnRadius || 12,
                border: `1px solid ${T.acc}44`,
                background: `${T.acc}12`,
                color: T.acc,
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontSize: 12,
                fontWeight: 700,
              }}
            >
              <RefreshIcon color={T.acc} size={14} />
              <span>{isFa ? 'ضبط مجدد' : 'Re-record'}</span>
            </button>
          </div>
        </div>
      )}

      {state === 'error' && (
        <div
          style={{
            padding: 12,
            borderRadius: T.cardRadius || 16,
            background: `${T.err}12`,
            border: `1px solid ${T.err}33`,
            color: T.err,
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
          }}
        >
          <span>{error || (isFa ? 'ضبط صدا پشتیبانی نمی‌شود' : 'Voice recording not supported')}</span>
          <button
            type="button"
            onClick={resetRecording}
            style={{
              padding: '6px 12px',
              borderRadius: T.btnRadius || 10,
              border: 0,
              background: T.card,
              color: T.err,
              cursor: 'pointer',
              fontSize: 12,
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
