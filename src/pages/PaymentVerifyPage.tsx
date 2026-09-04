import { useAppContext } from '../app/AppContext';
/**
 * PaymentVerifyPage — صفحه تأیید پرداخت
 *
 * پس از بازگشت کاربر از درگاه پرداخت، تراکنش تأیید و نتیجه نمایش داده می‌شود.
 * مسیر: /course-payment/verify?authority=...&status=OK|NOK
 */

import { useEffect, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { PaymentService } from '../services/payment/PaymentService';
import { readJson } from '../utils/storage';
import PublicBackButton from '../components/PublicBackButton';

const SK = { settings: 'zkid_settings_v2' };

type VerifyStatus = 'loading' | 'success' | 'failed' | 'canceled';

export default function PaymentVerifyPage(){
 const app=useAppContext();
  const { T, S, css, lang, setView } = app;
  const [status, setStatus] = useState<VerifyStatus>('loading');
  const [message, setMessage] = useState('');
  const [refId, setRefId] = useState('');

  useEffect(() => {
    const verifyPayment = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const authority = params.get('Authority') || params.get('authority') || params.get('id') || '';
        const statusParam = params.get('Status') || params.get('status') || '';

        // اگر کاربر از درگاه انصراف داد
        if (statusParam === 'NOK' || statusParam === 'canceled') {
          setStatus('canceled');
          setMessage(
            lang === 'en'
              ? 'Payment was canceled by the user.'
              : 'پرداخت توسط کاربر لغو شد.'
          );
          return;
        }

        if (!authority) {
          setStatus('failed');
          setMessage(
            lang === 'en'
              ? 'Transaction information was not found.'
              : 'اطلاعات تراکنش یافت نشد.'
          );
          return;
        }

        // دریافت تنظیمات از localStorage
        const savedCfg: any = readJson(SK.settings, {});
        const paymentConfig = savedCfg?.paymentConfig || {
          gateways: [],
          defaultCurrency: 'IRR',
          callbackUrl: '',
        };

        const paymentService = new PaymentService(paymentConfig);

        // دریافت gatewayId از sessionStorage
        const pendingData = sessionStorage.getItem('pending_payment');
        let gatewayId = '';
        if (pendingData) {
          try {
            const parsed = JSON.parse(pendingData);
            gatewayId = parsed.gateway || '';
          } catch {}
        }

        // تأیید تراکنش با درگاه مشخص
        const result = gatewayId
          ? await paymentService.verifyPaymentForGateway(gatewayId, authority)
          : await paymentService.verifyPayment(authority);

        if (result.status === 'success') {
          setStatus('success');
          setRefId(result.refId || '');
          setMessage(
            lang === 'en'
              ? 'Your payment was successful.'
              : 'پرداخت شما با موفقیت انجام شد.'
          );

          // ذخیره اطلاعات تراکنش تأییدشده و نهایی‌سازی سفارش در دیتابیس
          if (pendingData) {
            try {
              const parsed = JSON.parse(pendingData);
              sessionStorage.setItem('last_payment_verified', JSON.stringify({
                ...parsed,
                refId: result.refId,
                verifiedAt: new Date().toISOString(),
              }));

              if (app?.finalizeCourseRegistration) {
                app.finalizeCourseRegistration({
                  bankId: `gateway_${gatewayId || 'online'}`,
                  receipt: '',
                  receiptText: `پرداخت آنلاین موفق از طریق درگاه ${gatewayId || 'شتاب'} - کد رهگیری تراکنش: ${result.refId || '—'}`,
                  receiptMethod: 'gateway',
                  gateway: gatewayId,
                  refId: result.refId,
                });
              }

              sessionStorage.removeItem('pending_payment');
            } catch {
              // ignore parse errors
            }
          }
        } else if (result.status === 'pending') {
          setStatus('loading');
          setMessage(
            lang === 'en'
              ? 'Payment is being processed. Please wait...'
              : 'پرداخت در حال پردازش است. لطفاً صبر کنید...'
          );
          // بعد از ۵ ثانیه مجدداً بررسی
          setTimeout(() => verifyPayment(), 5000);
        } else {
          setStatus('failed');
          setMessage(
            lang === 'en'
              ? 'Payment was not successful. Please try again.'
              : 'پرداخت ناموفق بود. لطفاً مجدداً تلاش کنید.'
          );
        }
      } catch (error: any) {
        console.error('Payment verification error:', error);
        setStatus('failed');
        setMessage(
          lang === 'en'
            ? 'Error verifying payment. Please contact support.'
            : 'خطا در تأیید پرداخت. لطفاً با پشتیبانی تماس بگیرید.'
        );
      }
    };

    verifyPayment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusColors: Record<VerifyStatus, string> = {
    loading: T.acc,
    success: T.ok,
    failed: T.err,
    canceled: T.warn,
  };

  const StatusGlyph = ({ kind }: { kind: VerifyStatus }) => {
    const paths: Record<VerifyStatus, string> = {
      loading: 'M12 2v4m0 12v4M4.93 4.93l2.83 2.83m8.48 8.48l2.83 2.83M2 12h4m12 0h4M4.93 19.07l2.83-2.83m8.48-8.48l2.83-2.83',
      success: 'M20 6 9 17l-5-5',
      failed: 'M6 6l12 12M18 6 6 18',
      canceled: 'M6 6h12v12H6z',
    };
    return <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[kind]}/></svg>;
  };

  const statusTitles: Record<VerifyStatus, string> = {
    loading: lang === 'en' ? 'Processing...' : 'در حال پردازش...',
    success: lang === 'en' ? 'Payment Successful' : 'پرداخت موفق',
    failed: lang === 'en' ? 'Payment Failed' : 'پرداخت ناموفق',
    canceled: lang === 'en' ? 'Payment Canceled' : 'پرداخت لغو شد',
  };

  const canReturnToPayment = status === 'failed' || status === 'canceled';

  return (
    <div dir={lang === 'en' ? 'ltr' : 'rtl'} style={{ ...S.page, flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
      <Helmet>
        <title>{lang === 'en' ? 'Payment Verification' : 'تأیید پرداخت'} | زینالیکید</title>
        <meta name="robots" content="noindex, follow" />
      </Helmet>
      <style>{css}</style>

      <div style={{
        ...S.card,
        maxWidth: 420,
        textAlign: 'center',
        padding: '32px 24px',
      }}>
        {/* آیکون وضعیت */}
        <div style={{
          width: 72,
          height: 72,
          borderRadius: '50%',
          background: `${statusColors[status]}15`,
          border: `2px solid ${statusColors[status]}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 32,
          margin: '0 auto 16px',
          animation: status === 'loading' ? 'pulse 2s infinite' : 'none',
        }}>
          <StatusGlyph kind={status} />
        </div>

        {/* عنوان و بازگشت در یک ردیف طبیعی؛ هنگام پردازش، خروجی برای جلوگیری از قطع تأیید نمایش داده نمی‌شود. */}
        <div className="zk-public-title-row" style={{ margin: '0 0 8px', textAlign: 'start' }}>
          {canReturnToPayment && <PublicBackButton lang={lang} onBack={() => setView('course-payment')} fallback="/courses" testId="public-payment-verify-back" />}
          <h1 style={{
            color: statusColors[status],
            fontSize: 18,
            fontWeight: 800,
            margin: 0,
          }}>
            {statusTitles[status]}
          </h1>
        </div>

        {/* پیام */}
        <p style={{
          color: T.mut,
          fontSize: 13,
          lineHeight: 1.9,
          margin: '0 0 16px',
        }}>
          {message}
        </p>

        {/* شناسه مرجع */}
        {refId && status === 'success' && (
          <div style={{
            background: `${T.ok}10`,
            border: `1px solid ${T.ok}33`,
            borderRadius: 12,
            padding: '10px 14px',
            marginBottom: 16,
          }}>
            <div style={{ fontSize: 11, color: T.mut, marginBottom: 4 }}>
              {lang === 'en' ? 'Reference ID:' : 'شناسه مرجع:'}
            </div>
            <b dir="ltr" style={{
              fontFamily: 'monospace,-apple-system,"Courier New"',
              fontSize: 15,
              color: T.ok,
              letterSpacing: '1px',
            }}>
              {refId}
            </b>
          </div>
        )}

        {/* دکمه‌ها */}
        {status === 'success' && (
          <button
            onClick={() => setView('course-done')}
            style={{
              ...S.btn,
              width: '100%',
              padding: '14px',
              fontSize: 15,
            }}
          >
            {lang === 'en' ? 'Continue to confirmation' : 'ادامه به صفحه تأیید'}
          </button>
        )}

        {canReturnToPayment && (
          <div style={{ marginTop: 8 }}>
            <button
              onClick={() => setView('home')}
              style={{
                ...S.btnGhost,
                width: '100%',
                padding: '12px',
              }}
            >
              {lang === 'en' ? 'Home' : 'صفحه اصلی'}
            </button>
          </div>
        )}

        {status === 'loading' && (
          <div style={{ fontSize: 12, color: T.mut, marginTop: 8 }}>
            {lang === 'en' ? 'Please do not close this page.' : 'لطفاً این صفحه را نبندید.'}
          </div>
        )}
      </div>
    </div>
  );
}
