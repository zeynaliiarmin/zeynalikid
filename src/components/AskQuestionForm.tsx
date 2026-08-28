import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import VoiceRecorder from './VoiceRecorder';
import { uploadVoiceNote } from '../lib/supabase';
import { defaultCountries } from '../config/defaultSettings';
import { validPhone, fullPhone, p2e, getCountryFlag } from '../utils/phone';

export interface AskQuestionFormProps {
  T: any;
  lang: 'fa' | 'en';
  onSubmit: (question: string, voiceNoteUrl?: string, phone?: string) => Promise<void>;
  onClose: () => void;
  pageSource?: string;
  countries?: any[];
}

const phoneExamples: Record<string, string> = {
  '+98': '09123456789',
  '+1': '2125550123',
  '+44': '07700900000',
  '+49': '030123456',
  '+46': '0701234567',
  '+41': '0791234567',
  '+47': '41234567',
  '+33': '0612345678',
  '+61': '0412345678',
  '+971': '0501234567',
  '+90': '05321234567',
  '+31': '0612345678',
  '+91': '9876543210',
  '+93': '0701234567',
  '+': 'Enter phone number',
};

const phonePlaceholder = (code: string, lang: 'fa' | 'en') =>
  phoneExamples[code] || (lang === 'en' ? 'Enter phone number' : 'شماره تماس');

function CountrySelect({
  value,
  onChange,
  countries,
  T,
  lang,
}: {
  value: string;
  onChange: (v: string) => void;
  countries: any[];
  T: any;
  lang: 'fa' | 'en';
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const activeCountry =
    (countries || []).find((x: any) => x.code === value) ||
    (countries || [])[0] || { code: '+98', flag: '🇮🇷', name: 'ایران', nameEn: 'Iran' };

  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [open]);

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        style={{
          height: 48,
          minWidth: 78,
          padding: '0 8px',
          background: T.inp || '#fff',
          border: `1px solid ${T.brd || '#E5E0D8'}`,
          borderRadius: T.inputRadius || 12,
          color: T.acc || '#0F766E',
          cursor: 'pointer',
          fontSize: 13.5,
          fontFamily: 'inherit',
          fontWeight: 700,
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 5,
        }}
      >
        <span style={{ fontSize: 16 }}>{getCountryFlag(activeCountry)}</span>
        <span dir="ltr">{activeCountry.code}</span>
        <span style={{ fontSize: 10, opacity: 0.6 }}>▾</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            left: 0,
            right: 'auto',
            zIndex: 4000,
            width: 220,
            maxHeight: 220,
            overflowY: 'auto',
            overflowX: 'hidden',
            background: T.pop || T.card || '#fff',
            border: `1px solid ${T.brd || '#E5E0D8'}`,
            borderRadius: 14,
            boxShadow: '0 16px 40px rgba(0,0,0,.16)',
            padding: 6,
            animation: 'fadeSlide .25s ease both',
          }}
        >
          {(countries || []).map((c: any) => (
            <button
              key={c.id || c.code}
              type="button"
              onClick={() => {
                onChange(c.code);
                setOpen(false);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                padding: '8px 10px',
                background: value === c.code ? (T.soft || '#CCFBF1') : 'transparent',
                border: 0,
                borderRadius: 9,
                color: value === c.code ? (T.acc || '#0F766E') : (T.txt || '#1F2937'),
                cursor: 'pointer',
                textAlign: 'right',
                fontFamily: 'inherit',
                fontSize: 13,
                gap: 6,
              }}
            >
              <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span>{getCountryFlag(c)}</span>
                <span>{lang === 'en' ? (c.nameEn || c.name) : c.name}</span>
              </span>
              <span dir="ltr" style={{ fontSize: 12, opacity: 0.75 }}>
                {c.code}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AskQuestionForm({
  T,
  lang,
  onSubmit,
  onClose,
  pageSource,
  countries = defaultCountries,
}: AskQuestionFormProps) {
  const [phoneCc, setPhoneCc] = useState('+98');
  const [phone, setPhone] = useState('');
  const [question, setQuestion] = useState('');
  const [voiceBlob, setVoiceBlob] = useState<Blob | null>(null);
  // FIX: Stabilize VoiceRecorder callbacks (همان باگ ConsultationPage)
  const handleVoiceRecorded = useCallback((blob: Blob) => setVoiceBlob(blob), []);
  const handleVoiceRemoved = useCallback(() => setVoiceBlob(null), []);
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [savedPhone, setSavedPhone] = useState('');

  const isFa = lang === 'fa';
  const charCount = question.length;

  const activeCountry = useMemo(() => {
    return (
      (countries || []).find((x: any) => x.code === phoneCc) ||
      (countries || [])[0] || { code: '+98', flag: '🇮🇷', name: 'ایران', regex: '^(0?9)\\d{9}$' }
    );
  }, [countries, phoneCc]);

  const isPhoneValid = useMemo(() => {
    return validPhone(phone, activeCountry);
  }, [phone, activeCountry]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneTouched(true);

    if (!isPhoneValid || loading) {
      return;
    }

    setLoading(true);
    try {
      let voiceUrl = '';
      if (voiceBlob) {
        const u = await uploadVoiceNote(voiceBlob);
        if (u) voiceUrl = u;
      }
      const fullPhoneNumber = fullPhone(phoneCc, phone);
      setSavedPhone(fullPhoneNumber);
      await onSubmit(question.trim(), voiceUrl, fullPhoneNumber);
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
          maxHeight: '92vh',
          overflowY: 'auto',
          background: T.pop || T.card || '#fff',
          border: `1px solid ${T.brd || '#E5E0D8'}`,
          borderRadius: T.cardRadius || 20,
          padding: 'clamp(16px, 4vw, 24px)',
          boxShadow: T.shadowStrong || '0 24px 60px rgba(0,0,0,.22)',
          animation: 'modalIn .3s ease both',
          position: 'relative',
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: 14,
            borderBottom: `1px solid ${T.brd || '#E5E0D8'}`,
            paddingBottom: 12,
          }}
        >
          <div style={{ fontSize: 17, fontWeight: 800, color: T.ttl || T.acc || '#0F766E' }}>
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
              border: `1px solid ${T.brd || '#E5E0D8'}`,
              background: T.soft || 'transparent',
              color: T.acc || T.txt || '#0F766E',
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
                background: `${T.ok}18`,
                color: T.ok,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
                border: `2px solid ${T.ok}55`,
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
            <div style={{ fontSize: 16, fontWeight: 800, color: T.ttl || '#0F766E', marginBottom: 8 }}>
              {isFa ? 'اطلاعات و سؤال شما با موفقیت ثبت شد!' : 'Your request has been submitted successfully!'}
            </div>
            <p style={{ fontSize: 13, color: T.mut || '#4B5563', lineHeight: 1.8, margin: '0 0 16px' }}>
              {isFa
                ? `کارشناسان ما به‌زودی با شماره ${savedPhone || 'شما'} جهت پاسخگویی و راهنمایی تماس خواهند گرفت.`
                : `Our specialists will contact you shortly at ${savedPhone || 'your phone number'} to provide guidance.`}
            </p>
            <button
              type="button"
              onClick={onClose}
              style={{
                marginTop: 8,
                width: '100%',
                minHeight: 48,
                padding: '12px 24px',
                borderRadius: T.btnRadius || 14,
                border: 0,
                background: T.grad || T.acc || '#0F766E',
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
            {/* Informational Guidance Notice */}
            <div
              style={{
                background: T.soft || '#CCFBF1',
                borderRadius: 12,
                padding: '10px 12px',
                fontSize: 12.5,
                lineHeight: 1.8,
                color: T.txt || '#1F2937',
                marginBottom: 16,
              }}
            >
              {isFa
                ? 'شماره تماس خود را وارد فرمایید تا کارشناسان ما پاسخ سؤال شما را به‌صورت تلفنی ارائه دهند. نوشتن متن سؤال یا ارسال ویس اختیاری است.'
                : 'Please enter your phone number so our specialists can call you. Writing a question or recording voice is optional.'}
            </div>

            {/* Phone Number Field (REQUIRED) */}
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontSize: 13,
                  color: T.mut || '#4B5563',
                  fontWeight: 700,
                  marginBottom: 6,
                }}
              >
                <span>{isFa ? 'شماره تماس (جهت تماس و پاسخ کارشناس)' : 'Phone Number (Required)'}</span>
                <span style={{ color: 'var(--zk-error, #DC2626)' }}>*</span>
              </label>

              <div style={{ display: 'flex', gap: 6, alignItems: 'stretch', direction: 'ltr' }}>
                <CountrySelect
                  value={phoneCc}
                  onChange={(v: string) => setPhoneCc(v)}
                  countries={countries}
                  T={T}
                  lang={lang}
                />
                <input
                  dir="ltr"
                  type="tel"
                  inputMode="numeric"
                  value={phone}
                  onChange={(e) => {
                    const cleaned = p2e(e.target.value).replace(/[^0-9]/g, '');
                    setPhone(cleaned);
                    if (!phoneTouched) setPhoneTouched(true);
                  }}
                  placeholder={phonePlaceholder(phoneCc, lang)}
                  style={{
                    flex: 1,
                    width: '100%',
                    padding: '12px 14px',
                    background: T.inp || '#fff',
                    border: `1px solid ${phoneTouched && !isPhoneValid ? '#DC2626' : (T.brd || '#E5E0D8')}`,
                    borderRadius: T.inputRadius || 12,
                    color: T.txt || '#1F2937',
                    fontSize: 15,
                    outline: 'none',
                    boxSizing: 'border-box',
                    fontFamily: 'inherit',
                  }}
                />
              </div>

              {phoneTouched && !isPhoneValid && (
                <div style={{ fontSize: 11.5, color: 'var(--zk-error, #DC2626)', marginTop: 4, fontWeight: 600 }}>
                  {isFa
                    ? 'لطفاً یک شماره تماس معتبر برای کشور انتخاب‌شده وارد فرمایید'
                    : 'Please enter a valid phone number for the selected country'}
                </div>
              )}
            </div>

            {/* Question Text Field (OPTIONAL) */}
            <div style={{ marginBottom: 18 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 6,
                  marginBottom: 6,
                }}
              >
                <label style={{ fontSize: 13, color: T.mut || '#4B5563', fontWeight: 700 }}>
                  {isFa ? 'متن سؤال (اختیاری)' : 'Question Text (Optional)'}
                </label>
                <VoiceRecorder
                  T={T}
                  lang={lang}
                  maxDuration={90}
                  onRecorded={handleVoiceRecorded}
                  onRemoved={handleVoiceRemoved}
                />
              </div>

              <textarea
                rows={3}
                maxLength={500}
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                placeholder={
                  isFa
                    ? 'سؤال خود را اینجا بنویسید (در صورت تمایل، می‌توانید خالی بگذارید تا تلفنی صحبت کنیم)...'
                    : 'Type your question here (optional; leave blank if you prefer phone consultation)...'
                }
                style={{
                  width: '100%',
                  minHeight: 95,
                  padding: '12px 14px',
                  background: T.inp || '#fff',
                  border: `1px solid ${T.brd || '#E5E0D8'}`,
                  borderRadius: T.inputRadius || 12,
                  color: T.txt || '#1F2937',
                  fontSize: 14.5,
                  outline: 'none',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit',
                  resize: 'vertical',
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: T.mut || '#4B5563' }}>
                  {isFa ? 'یا بدون نوشتن، دکمه ارسال را بزنید' : 'Or submit directly for phone consultation'}
                </span>
                <span style={{ fontSize: 11, color: T.mut || '#4B5563' }} dir="ltr">
                  {charCount}/500
                </span>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={!isPhoneValid || loading}
              style={{
                width: '100%',
                minHeight: 48,
                padding: '14px 28px',
                borderRadius: T.btnRadius || 14,
                border: 0,
                background: !isPhoneValid || loading ? (T.brd || '#E5E0D8') : (T.grad || T.acc || '#0F766E'),
                color: !isPhoneValid || loading ? (T.mut || '#9CA3AF') : '#fff',
                fontSize: 15,
                fontWeight: 800,
                cursor: !isPhoneValid || loading ? 'not-allowed' : 'pointer',
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
                  ? 'ارسال سؤال و درخواست تماس'
                  : 'Submit Question & Request Call'}
              </span>
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
