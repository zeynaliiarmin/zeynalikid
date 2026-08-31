import React from 'react';

interface EnrollmentStepperProps {
  step: number;
  lang: 'fa' | 'en';
  T: any;
}

export default function EnrollmentStepper({ step, lang, T }: EnrollmentStepperProps) {
  const isFa = lang === 'fa';
  const labels = isFa
    ? ['دوره', 'کودک', 'ارسال', 'پرداخت', 'تأیید']
    : ['Course', 'Child', 'Shipping', 'Payment', 'Confirm'];

  const fullLabels = isFa
    ? ['انتخاب دوره', 'اطلاعات فرزند', 'اطلاعات ارسال', 'پرداخت امن', 'تأیید نهایی']
    : ['Course Selection', 'Child Information', 'Shipping Details', 'Secure Payment', 'Final Confirmation'];

  const totalSteps = 5;
  const currentStep = Math.min(totalSteps, Math.max(1, step));
  // فاصله مرکز دایره ۱ (در ۱۰٪) تا مرکز دایره ۵ (در ۹۰٪) دقیقاً ۸۰٪ کل عرض است
  const progressPercent = ((currentStep - 1) / (totalSteps - 1)) * 80;

  return (
    <div
      className="zk-enrollment-stepper"
      style={{
        marginBottom: 20,
        flexShrink: 0,
        width: '100%',
        boxSizing: 'border-box',
        padding: '10px 6px 14px',
        background: T.card,
        borderRadius: T.cardRadius || 20,
        boxShadow: T.shadowLight || T.neuOut,
        border: `1px solid ${T.brd}`,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          padding: '0 4px',
        }}
      >
        {/* ریل زمینه خاکستری اتصال‌دهنده از مرکز دایره اول تا مرکز دایره آخر */}
        <div
          style={{
            position: 'absolute',
            top: 15,
            left: '10%',
            right: '10%',
            height: 3.5,
            background: T.inp || '#E5E7EB',
            borderRadius: 4,
            zIndex: 1,
          }}
        />

        {/* لاین پیشرفت فعال و پرشده پویا */}
        <div
          style={{
            position: 'absolute',
            top: 15,
            [isFa ? 'right' : 'left']: '10%',
            width: `${progressPercent}%`,
            height: 3.5,
            background: T.grad || T.acc,
            borderRadius: 4,
            zIndex: 2,
            transition: 'width 0.45s cubic-bezier(0.4, 0, 0.2, 1)',
          }}
        />

        {labels.map((shortLabel, i) => {
          const num = i + 1;
          const isDone = num < currentStep;
          const isActive = num === currentStep;

          return (
            <div
              key={i}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                flex: 1,
                position: 'relative',
                zIndex: 3,
              }}
            >
              {/* Step circle */}
              <div
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13.5,
                  fontWeight: 800,
                  background: isDone || isActive ? (T.grad || T.acc) : (T.card || '#fff'),
                  color: isDone || isActive ? '#fff' : (T.mut || '#6B7280'),
                  boxShadow:
                    isDone || isActive
                      ? '0 4px 12px rgba(15, 118, 110, 0.25)'
                      : T.neuOut,
                  border: isDone || isActive ? 'none' : `2px solid ${T.brd}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                }}
              >
                {isDone ? (
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="#fff"
                    strokeWidth="3.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                ) : (
                  num
                )}
              </div>

              {/* Label */}
              <div
                style={{
                  marginTop: 6,
                  textAlign: 'center',
                  maxWidth: 68,
                }}
              >
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: isActive ? 800 : 600,
                    color: isActive ? T.accText : isDone ? T.ttl : T.mut,
                    lineHeight: 1.2,
                    transition: 'all .3s ease',
                  }}
                >
                  {shortLabel}
                </div>
                <div
                  style={{
                    fontSize: 9,
                    color: T.mut,
                    marginTop: 1.5,
                    opacity: 1,
                    fontWeight: 600,
                    lineHeight: 1.15,
                  }}
                >
                  {fullLabels[i].split(' ').slice(-1)[0]}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
