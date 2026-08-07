import React from 'react';

interface EnrollmentStepperProps {
  step: number;
  lang: 'fa' | 'en';
  T: any;
}

export default function EnrollmentStepper({ step, lang, T }: EnrollmentStepperProps) {
  const labels = lang === 'en' 
    ? ['Course', 'Child', 'Shipping', 'Payment', 'Confirm'] 
    : ['دوره', 'کودک', 'ارسال', 'پرداخت', 'تأیید'];
  
  const fullLabels = lang === 'en' 
    ? ['Course Selection', 'Child Information', 'Shipping Details', 'Secure Payment', 'Final Confirmation'] 
    : ['انتخاب دوره', 'اطلاعات فرزند', 'اطلاعات ارسال', 'پرداخت امن', 'تأیید نهایی'];

  return (
    <div style={{ 
      marginBottom: 20, 
      padding: '8px 4px 12px', 
      background: T.card,
      borderRadius: T.cardRadius || 20,
      boxShadow: T.shadowLight || T.neuOut,
      border: `1px solid ${T.brd}`
    }}>
      <div style={{ 
        display: 'flex', 
        alignItems: 'flex-end', 
        justifyContent: 'space-between', 
        gap: 2,
        position: 'relative',
        padding: '0 8px'
      }}>
        {labels.map((shortLabel, i) => {
          const num = i + 1;
          const isDone = num < step;
          const isActive = num === step;
          const isFuture = num > step;

          return (
            <div key={i} style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              alignItems: 'center', 
              flex: 1, 
              position: 'relative',
              zIndex: 2 
            }}>
              {/* Progress line */}
              {i > 0 && (
                <div 
                  style={{
                    position: 'absolute',
                    top: 16,
                    [lang === 'fa' ? 'right' : 'left']: '50%',
                    width: 'calc(100% - 32px)',
                    height: 3,
                    background: isDone ? T.grad : T.inp,
                    borderRadius: 3,
                    zIndex: 0,
                    transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)'
                  }} 
                />
              )}

              {/* Step circle */}
              <div 
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 14,
                  fontWeight: 800,
                  background: isDone || isActive ? T.grad : T.card,
                  color: isDone || isActive ? '#fff' : T.mut,
                  boxShadow: isDone || isActive 
                    ? '0 4px 12px rgba(15, 118, 110, 0.25)' 
                    : T.neuOut,
                  border: isDone || isActive ? 'none' : `2px solid ${T.brd}`,
                  transition: 'all 0.35s cubic-bezier(0.4, 0, 0.2, 1)',
                  position: 'relative',
                  zIndex: 2
                }}
              >
                {isDone ? (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6L9 17l-5-5"/>
                  </svg>
                ) : (
                  num
                )}
              </div>

              {/* Label */}
              <div style={{
                marginTop: 6,
                textAlign: 'center',
                maxWidth: 66
              }}>
                <div style={{
                  fontSize: 9.5,
                  fontWeight: isActive ? 800 : 600,
                  color: isActive ? T.acc : isDone ? T.ttl : T.mut,
                  lineHeight: 1.15,
                  transition: 'all .3s ease'
                }}>
                  {shortLabel}
                </div>
                <div style={{
                  fontSize: 8.5,
                  color: T.mut,
                  marginTop: 1,
                  opacity: isActive ? 0.9 : 0.65,
                  lineHeight: 1.1
                }}>
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
