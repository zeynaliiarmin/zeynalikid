import React, { useMemo, useState, useEffect } from 'react';
import { SearchIcon, ChatIcon } from '../Icons';
import { fetchUserQuestions, submitUserQuestion, UserQuestion } from '../../lib/supabase';
import AskQuestionForm from '../AskQuestionForm';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  isCommunity?: boolean;
}

export default function SmartFAQ({
  items,
  lang,
  onConsult,
  q,
  onQ,
}: {
  items: FAQItem[];
  lang: string;
  onConsult: () => void;
  q: string;
  onQ: (v: string) => void;
}) {
  const en = lang === 'en';
  const [open, setOpen] = useState<string | null>(null);
  const [communityFaqs, setCommunityFaqs] = useState<FAQItem[]>([]);
  const [askModalOpen, setAskModalOpen] = useState(false);

  useEffect(() => {
    let active = true;
    const loadCommunity = async () => {
      try {
        const list = await fetchUserQuestions('answered');
        if (!active) return;
        const mapped: FAQItem[] = (list || []).map((uq: UserQuestion) => ({
          id: `uq-${uq.id}`,
          question: en ? uq.question_en || uq.question : uq.question,
          answer: en ? uq.answer_en || uq.answer || '' : uq.answer || '',
          isCommunity: true,
        }));
        setCommunityFaqs(mapped);
      } catch (e) {
        console.error('Failed fetching community faqs:', e);
      }
    };
    loadCommunity();
    return () => {
      active = false;
    };
  }, [en]);

  const mergedItems = useMemo(() => {
    const seen = new Set<string>();
    const result: FAQItem[] = [];
    for (const it of [...items, ...communityFaqs]) {
      const key = it.question.trim().toLowerCase();
      if (key && !seen.has(key)) {
        seen.add(key);
        result.push(it);
      }
    }
    return result;
  }, [items, communityFaqs]);

  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return mergedItems;
    return mergedItems.filter((x) => (x.question + ' ' + x.answer).toLowerCase().includes(t));
  }, [q, mergedItems]);

  const highlightText = (text: string, kw: string) => {
    if (!kw.trim()) return text;
    const regex = new RegExp(`(${kw.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, idx) =>
      regex.test(part) ? (
        <span
          key={idx}
          style={{
            background: 'rgba(23, 105, 194, 0.15)',
            color: 'var(--zk-primary)',
            borderRadius: 3,
            padding: '0 2px',
          }}
        >
          {part}
        </span>
      ) : (
        part
      )
    );
  };

  return (
    <div>
      <div className="zke-search" style={{ marginBottom: 12 }}>
        <SearchIcon size={16} />
        <input
          value={q}
          onChange={(e) => onQ(e.target.value)}
          placeholder={en ? 'Search frequently asked questions…' : 'در پرسش‌های رایج جستجو کنید…'}
          aria-label={en ? 'Search FAQ' : 'جستجوی پرسش‌های رایج'}
        />
      </div>

      {q.trim() && (
        <div style={{ fontSize: 12, color: 'var(--zk-text-muted)', marginBottom: 10 }}>
          {en
            ? `${filtered.length} result(s) of ${mergedItems.length} questions`
            : `${filtered.length} نتیجه از ${mergedItems.length} سوال`}
        </div>
      )}

      {filtered.length ? (
        <div className="zke-faq">
          {filtered.map((item) => {
            const isOpen = open === item.id;
            return (
              <section key={item.id} className={`zke-faq-item ${isOpen ? 'open' : ''}`}>
                <button
                  type="button"
                  className="zke-faq-q"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : item.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    width: '100%',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, textAlign: 'start' }}>
                    <span>{highlightText(item.question, q)}</span>
                    {item.isCommunity && (
                      <span
                        style={{
                          fontSize: 10,
                          color: 'var(--zk-text-muted)',
                          fontStyle: 'italic',
                          background: 'rgba(15,23,42,0.05)',
                          padding: '2px 6px',
                          borderRadius: 6,
                        }}
                      >
                        {en ? 'Community question' : 'سوال کاربران'}
                      </span>
                    )}
                  </div>
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    style={{
                      transform: isOpen ? 'rotate(180deg)' : 'none',
                      transition: 'transform 0.28s ease',
                      flexShrink: 0,
                    }}
                  >
                    <path d="m6 9.5 6 6 6-6" />
                  </svg>
                </button>
                <div
                  className="zke-faq-a"
                  style={{
                    maxHeight: isOpen ? 800 : 0,
                    opacity: isOpen ? 1 : 0,
                    overflow: 'hidden',
                    transition: 'max-height 0.3s ease, opacity 0.2s ease',
                    paddingTop: isOpen ? 12 : 0,
                    paddingBottom: isOpen ? 12 : 0,
                  }}
                >
                  {highlightText(item.answer, q)}
                  <div className="zke-cta" style={{ marginTop: 12 }}>
                    <p>
                      {en
                        ? 'If you need an answer tailored to your child, ask it in a free consultation.'
                        : 'اگر پاسخ دقیق‌تری متناسب با فرزند خودتان لازم دارید، همین پرسش را در مشاوره مطرح کنید.'}
                    </p>
                    <button type="button" className="zke-pillbtn" onClick={onConsult}>
                      {en ? 'Ask in consultation' : 'پرسش در مشاوره'}
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      ) : (
        <div className="zke-empty" style={{ padding: '36px 16px', textAlign: 'center' }}>
          <ChatIcon size={34} />
          <p style={{ fontSize: 16, fontWeight: 800, margin: '8px 0 4px' }}>
            {en ? 'No answer was found.' : 'پاسخی پیدا نشد.'}
          </p>
          <small style={{ display: 'block', marginBottom: 16, color: 'var(--zk-text-muted)' }}>
            {en
              ? 'You can ask your question directly or consult with our specialists.'
              : 'می‌توانید سؤال خود را بپرسید یا با مشاوران ما در ارتباط باشید.'}
          </small>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              type="button"
              className="zke-pillbtn"
              onClick={() => setAskModalOpen(true)}
              style={{ background: 'var(--zk-primary)', color: '#fff' }}
            >
              {en ? 'Ask a question?' : 'سوال دارم؟'}
            </button>
            <button
              type="button"
              className="zke-pillbtn"
              onClick={onConsult}
              style={{ background: 'var(--zk-surface-raised)', color: 'var(--zk-primary)', border: '1px solid var(--zk-border)' }}
            >
              {en ? 'Contact consultant' : 'تماس با مشاور'}
            </button>
          </div>
        </div>
      )}

      {askModalOpen && (
        <AskQuestionForm
          T={{
            cardRadius: 18,
            btnRadius: 12,
            inputRadius: 10,
            ttl: 'var(--zk-primary)',
            acc: 'var(--zk-primary)',
            card: '#fff',
            inp: '#f8f9fa',
            brd: '#dfe1e5',
            mut: '#6B7280',
            txt: '#111827',
            soft: '#ebf5ff',
          }}
          lang={lang as 'fa' | 'en'}
          pageSource="education"
          onClose={() => setAskModalOpen(false)}
          onSubmit={async (question, voiceUrl, phone) => {
            await submitUserQuestion(question, voiceUrl, 'education', phone);
          }}
        />
      )}
    </div>
  );
}
