import { useState, useMemo } from 'react';
import { Helmet } from 'react-helmet-async';
import JsonLd from '../components/JsonLd';
import ServicesSection from '../components/ServicesSection';
import AskQuestionForm from '../components/AskQuestionForm';
import { submitUserQuestion } from '../lib/supabase';

type FAQItem = { id: string; question: string; answer: string };

export default function FAQPage({ app }: { app: any }) {
  const { cfg, T, S, css, lang, setView, showContactOn, ContactPanel } = app;
  const items: FAQItem[] = (lang === 'fa' ? cfg.faqItems : cfg.faqItemsEn) || [];
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [askOpen, setAskOpen] = useState(false);
  const [query, setQuery] = useState('');

  const toggle = (index: number) => setOpenIndex(openIndex === index ? null : index);

  // فیلتر کردن سؤالات بر اساس کلمه کلیدی در سؤال یا پاسخ
  const filteredItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (item) =>
        (item.question && item.question.toLowerCase().includes(q)) ||
        (item.answer && item.answer.toLowerCase().includes(q))
    );
  }, [items, query]);

  return (
    <main className="zk-faq-page" dir={lang === 'fa' ? 'rtl' : 'ltr'} style={{ ...S.page, overflowX: 'hidden' }}>
      <JsonLd
        id="ld-faq"
        data={JSON.stringify({
          '@context': 'https://schema.org',
          '@type': 'FAQPage',
          mainEntity: items.map((it: any) => ({
            '@type': 'Question',
            name: it.question,
            acceptedAnswer: { '@type': 'Answer', text: it.answer },
          })),
        })}
      />
      <Helmet>
        <title>{lang === 'fa' ? 'سوالات متداول | زینالیکید' : 'FAQ | Zeynalikid'}</title>
        <meta
          name="description"
          content={
            lang === 'fa'
              ? 'پاسخ به سوالات متداول درباره رشد قد، بی‌اشتهایی، بدغذایی، تقویت هوش و سلامت کودکان'
              : 'Answers to frequently asked questions about child growth, nutrition and health'
          }
        />
        <meta name="robots" content="index, follow" />
      </Helmet>
      <style>{css}{`
        .zk-faq-page { overflow-x: hidden }
        .zk-faq-container { width: 100%; max-width: 760px; margin-inline: auto }
        .zk-faq-item { transition: border-color .2s ease, box-shadow .2s ease }
        .zk-faq-question { min-height: 52px }
        @media (max-width: 480px) {
          .zk-faq-container { padding: 18px 14px !important }
          .zk-faq-question { font-size: 14px !important; padding-inline: 12px !important }
        }
      `}</style>
      <div className="zk-faq-container" style={{ ...S.card, maxWidth: 760 }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10, marginBottom: 18 }}>
          <h1 style={{ color: T.ttl, fontSize: 'clamp(20px,5vw,28px)', lineHeight: 1.45, margin: 0, fontWeight: 800 }}>
            {lang === 'fa' ? 'سوالات متداول' : 'Frequently asked questions'}
          </h1>
          <button
            type="button"
            onClick={() => {
              try {
                if (window.history.length > 1) {
                  window.history.back();
                  return;
                }
              } catch {}
              setView('home');
            }}
            style={{
              minHeight: 44,
              padding: '8px 12px',
              borderRadius: 12,
              border: `1px solid ${T.brd}`,
              background: T.soft,
              color: T.acc,
              cursor: 'pointer',
              fontFamily: 'inherit',
              fontSize: 13,
              whiteSpace: 'nowrap',
            }}
          >
            {lang === 'en' ? 'Back' : 'بازگشت'}
          </button>
        </header>

        {/* ─── Stage 11: نوار جستجوی سؤالات بالای صفحه ─── */}
        <div style={{ position: 'relative', marginBottom: 20 }}>
          <input
            type="search"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpenIndex(null);
            }}
            placeholder={
              lang === 'fa'
                ? 'جستجوی سؤال یا موضوع (مثلاً قد، اشتها، خواب...)'
                : 'Search questions (e.g. growth, appetite, sleep...)'
            }
            style={{
              width: '100%',
              minHeight: 48,
              padding: '12px 14px',
              paddingInlineStart: 42,
              paddingInlineEnd: query ? 38 : 14,
              background: T.inp,
              border: `1px solid ${T.brd}`,
              borderRadius: T.inputRadius || 14,
              color: T.txt,
              fontSize: 14.5,
              outline: 'none',
              boxShadow: T.neuIn,
              transition: 'border-color .2s ease, box-shadow .2s ease',
              fontFamily: 'inherit',
              boxSizing: 'border-box',
            }}
          />
          {/* آیکون ذره‌بین */}
          <span
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              [lang === 'fa' ? 'right' : 'left']: 14,
              color: T.mut,
              display: 'flex',
              alignItems: 'center',
              pointerEvents: 'none',
            }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
          </span>
          {/* دکمه پاک کردن جستجو */}
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label={lang === 'fa' ? 'پاک کردن' : 'Clear'}
              style={{
                position: 'absolute',
                top: '50%',
                transform: 'translateY(-50%)',
                [lang === 'fa' ? 'left' : 'right']: 10,
                width: 28,
                height: 28,
                borderRadius: '50%',
                border: 0,
                background: T.soft,
                color: T.mut,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 18,
                fontFamily: 'inherit',
                padding: 0,
              }}
            >
              ×
            </button>
          )}
        </div>

        {/* ─── نمایش سؤالات فیلترشده یا پیام عدم یافتن نتیجه ─── */}
        {filteredItems.length ? (
          <>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {filteredItems.map((item, index) => (
                <section
                  key={item.id || index}
                  className="zk-faq-item"
                  style={{
                    background: T.card,
                    border: `1px solid ${T.brd}`,
                    borderRadius: 14,
                    overflow: 'hidden',
                    boxShadow: openIndex === index ? T.neuOut : 'none',
                  }}
                >
                  <button
                    type="button"
                    aria-expanded={openIndex === index}
                    onClick={() => toggle(index)}
                    className="zk-faq-question"
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      background: openIndex === index ? T.soft : 'transparent',
                      border: 0,
                      cursor: 'pointer',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      fontFamily: 'inherit',
                      fontSize: 15,
                      fontWeight: 700,
                      color: T.txt,
                      textAlign: 'start',
                    }}
                  >
                    <span style={{ minWidth: 0, overflowWrap: 'anywhere' }}>{item.question}</span>
                    <svg
                      width="17"
                      height="17"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke={T.acc}
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      style={{
                        flexShrink: 0,
                        marginInlineStart: 10,
                        transition: 'transform .2s ease',
                        transform: openIndex === index ? 'rotate(180deg)' : 'none',
                      }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {openIndex === index && (
                    <div
                      style={{
                        padding: '12px 14px 15px',
                        fontSize: 14,
                        color: T.mut,
                        lineHeight: 2,
                        borderTop: `1px solid ${T.brd}`,
                        whiteSpace: 'pre-wrap',
                      }}
                    >
                      {item.answer}
                    </div>
                  )}
                </section>
              ))}
            </div>

            {/* ─── دکمه «سوال دارم؟» در انتهای لیست سؤالات متداول ─── */}
            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 24, marginBottom: 12 }}>
              <button
                type="button"
                onClick={() => setAskOpen(true)}
                style={{
                  minHeight: 46,
                  padding: '11px 24px',
                  borderRadius: T.btnRadius || 14,
                  background: T.soft,
                  color: T.acc,
                  border: `1px solid ${T.brd}`,
                  fontSize: 13.5,
                  fontWeight: 800,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: 8,
                  boxShadow: T.neuOut,
                  transition: 'all 0.2s ease',
                }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
                <span>{lang === 'en' ? 'Have a question? Ask us' : 'سوال دارم؟'}</span>
              </button>
            </div>
          </>
        ) : (
          /* ─── پیام عدم یافتن نتیجه جستجو همراه با دکمه و تضمین محرمانگی ─── */
          <div
            style={{
              textAlign: 'center',
              background: T.soft,
              border: `1px solid ${T.brd}`,
              borderRadius: 18,
              padding: '28px 20px',
              margin: '12px 0 24px',
              boxShadow: T.neuIn,
            }}
          >
            <div
              style={{
                width: 54,
                height: 54,
                borderRadius: '50%',
                background: `${T.acc}15`,
                color: T.acc,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 14px',
              }}
            >
              <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <p
              style={{
                fontSize: 13.5,
                color: T.txt,
                lineHeight: 1.9,
                margin: '0 auto 18px',
                maxWidth: 540,
              }}
            >
              {lang === 'fa'
                ? 'سؤال یا پاسخ مورد نظر یافت نشد. می‌توانید با ضربه زدن بر روی دکمه «سوال دارم؟» پرسش خود را مطرح کنید؛ شاید این دغدغهٔ بسیاری از والدین باشد. سؤال شما پس از بررسی، به‌صورت کاملاً محرمانه و بدون ذکر نام یا شماره تماس در این صفحه درج خواهد شد تا راهنمای سایر مادران نیز باشد.'
                : 'No matching question found. You can tap "Have a question?" to ask yours—it might be what many other parents are wondering too. After review, your question will be published anonymously and confidentially without your name or phone number to guide other parents as well.'}
            </p>
            <button
              type="button"
              onClick={() => setAskOpen(true)}
              style={{
                minHeight: 46,
                padding: '11px 26px',
                borderRadius: T.btnRadius || 14,
                background: T.grad || T.acc,
                color: '#fff',
                border: 0,
                fontSize: 14,
                fontWeight: 800,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                boxShadow: `0 6px 18px ${T.acc}33`,
              }}
            >
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
              <span>{lang === 'en' ? 'Have a question? Ask us' : 'سوال دارم؟'}</span>
            </button>
          </div>
        )}

        {cfg.servicesVisibility?.faq !== false && (
          <section style={{ marginTop: 22 }}>
            <h2 style={{ color: T.ttl, fontSize: 16, margin: '0 0 10px', fontWeight: 800 }}>
              {lang === 'en' ? 'Our services' : 'خدمات ما'}
            </h2>
            <ServicesSection
              T={T}
              lang={lang}
              publicText={(k: string, fb?: string) => (lang === 'en' ? cfg.translations?.en?.[k] || fb || k : cfg.translations?.fa?.[k] || fb || k)}
              mode={cfg.servicesDisplayMode?.home === 'carousel' ? 'carousel' : 'list'}
              listItems={cfg.listSettings?.items || []}
              carouselSettings={cfg.carouselSettings || { columns: 2, autoScrollInterval: 8, autoScrollEnabled: true, pauseOnSwipe: 3, columnsData: [] }}
            />
          </section>
        )}

        {showContactOn('faq') && (
          <section style={{ marginTop: 18 }}>
            <ContactPanel cfg={cfg} T={T} lang={lang} />
          </section>
        )}

        {askOpen && (
          <AskQuestionForm
            T={T}
            lang={lang}
            pageSource="faq"
            countries={cfg.countryCodes}
            onClose={() => setAskOpen(false)}
            onSubmit={async (q, v, phone) => {
              await submitUserQuestion(q, v, 'faq', phone);
            }}
          />
        )}
      </div>
    </main>
  );
}
