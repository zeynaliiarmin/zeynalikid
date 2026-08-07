import React, { useState } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { uploadVoiceNote } from '../lib/supabase';

export interface AskQuestionFormProps {
  T: any;
  lang: 'fa' | 'en';
  onSubmit: (question: string, voiceNoteUrl?: string) => Promise<void>;
  onClose: () => void;
  pageSource?: string;
}

export default function AskQuestionForm({
  T,
  lang,
  onSubmit,
  onClose,
  pageSource,
}: AskQuestionFormProps) {
  const [question, setQuestion] = useState('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isFa = lang === 'fa';
  const charCount = question.length;
  const isValid = question.trim().length >= 5;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid || loading) return;

    setLoading(true);
    try {
      let voiceUrl = '';
      if (voiceBlob) {
        const u = await uploadVoiceNote(voiceBlob);
        if (u) voiceUrl = u;
      }
      await onSubmit(question.trim(), voiceUrl);
      setSuccess(true);
    } catch (err) {
      console.error('Ask question submit fail:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onMouseDown={(e) => {
        if (e.currentTarget === e.target) onClose();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9500,
        background: 'rgba(15, 30, 45, 0.55)',
        backdropFilter: 'blur(4px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fade .3s ease both',
        fontFamily: "'Vazirmatn','Tahoma',Arial,sans-serif",
        direction: isFa ? 'rtl' : 'ltr',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 480,
          background: T.pop || T.card || '#fff',
          border: `1px solid ${T.brd}`,
          borderRadius: T.cardRadius || 20,
          padding: 'clamp(16px, 4vw, 24px)',
          boxShadow: T.shadowStrong || '0 24px 60px rgba(0,0,0,.22)',
          animation: 'modalIn .3s ease both',
          position: 'relative',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 16,
            borderBottom: `1px solid ${T.brd}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ttl }}>
            {isFa ? 'سؤال دارید؟ بپرسید' : 'Ask a Question'}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={isFa ? 'بستن' : 'Close'}
            style={{
              width: 36,
              height: 36,
              borderRadius: T.btnRadius || 12,
              border: `1px solid ${T.brd}`,
              background: T.soft || 'transparent',
              color: T.acc || T.txt,
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              lineHeight: 1,
              fontFamily: 'inherit',
            }}
          >
            ×
          </button>
        </div>

        {success ? (
          <div style={{ textAlign: 'center', padding: '16px 8px' }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: '50%',
                background: '#10b98118',
                color: '#10b981',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                border: '2px solid #10b98155',
              }}
            >
              <svg
                width="32"
                height="32"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#10b981"
                strokeWidth="2.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </div>
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ttl, marginBottom: 8 }}>
              {isFa ? 'سؤال شما ثبت شد! به‌زودی پاسخ می‌دهیم.' : 'Your question has been submitted! We will answer soon.'}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 18,
                width: '100%',
                minHeight: 48,
                padding: '12px 24px',
                borderRadius: T.btnRadius || 14,
                border: 0,
                background: T.grad || T.acc,
                color: '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {isFa ? 'بستن' : 'Close'}
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                <label style={{ fontSize: 13, color: T.mut, fontWeight: 700 }}>
                  {isFa ? 'متن سؤال' : 'Your Question'}
                </label>
                <VoiceRecorder
                  T={T}
                  lang={lang}
                  maxDuration={60}
                  onRecorded={(blob) => setVoiceBlob(blob)}
                  onRemoved={() => setVoiceBlob(null)}
                />
              </div>
              <textarea
                rows={4}
                maxLength={500}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={isFa ? 'سؤال خود را اینجا بنویسید...' : 'Type your question here...'}
                style={{
                  width: '100%',
                  minHeight: 110,
                  padding: '12px 14px',
                  background: T.inp,
                  border: `1px solid ${T.brd}`,
                  borderRadius: T.inputRadius || 12,
                  color: T.txt,
                  fontSize: 15,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: T.mut }} dir="ltr">
                  {charCount}/500
                </span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isValid || loading}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '14px 28px',
                borderRadius: T.btnRadius || 14,
                border: 0,
                background: !isValid || loading ? T.brd : T.grad || T.acc,
                color: !isValid || loading ? T.mut : '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: !isValid || loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
                transition: 'all .25s ease',
              }}
            >
              {loading && (
                <span
                  style={{
                    width: 16,
                    height: 16,
                    border: '2px solid rgba(255,255,255,.4)',
                    borderTopColor: '#fff',
                    borderRadius: '50%',
                    display: 'inline-block',
                    animation: 'spin 1s linear infinite',
                  }}
                />
              )}
              <span>
                {loading
                  ? isFa
                    ? 'در حال ارسال...'
                    : 'Submitting...'
                  : isFa
                  ? 'ارسال سؤال'
                  : 'Submit Question'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
