import { useMemo, useState } from 'react';
import { SearchIcon, ChatIcon } from '../Icons';

interface FAQItem { id: string; question: string; answer: string; }

/**
 * FAQ هوشمند — Stage 8
 * جستجوی زندهٔ محلی (بدون Supabase) + آکاردیون انیمیشنی + empty state با CTA مشاوره.
 * بدون فیلتر دسته‌بندی (طبق تصمیم پروژه).
 */
export default function SmartFAQ({ items, lang, onConsult, q, onQ }: { items: FAQItem[]; lang: string; onConsult: () => void; q: string; onQ: (v: string) => void }) {
  const en = lang === 'en';
  const [open, setOpen] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return items;
    return items.filter(x => (x.question + ' ' + x.answer).toLowerCase().includes(t));
  }, [q, items]);

  return (
    <div>
      <div className="zke-search" style={{ marginBottom: 12 }}>
        <SearchIcon size={16} />
        <input
          value={q}
          onChange={e => onQ(e.target.value)}
          placeholder={en ? 'Search frequently asked questions…' : 'در پرسش‌های رایج جستجو کنید…'}
          aria-label={en ? 'Search FAQ' : 'جستجوی پرسش‌های رایج'}
        />
      </div>

      {filtered.length ? (
        <div className="zke-faq">
          {filtered.map(item => {
            const isOpen = open === item.id;
            return (
              <section key={item.id} className={`zke-faq-item ${isOpen ? 'open' : ''}`}>
                <button type="button" className="zke-faq-q" aria-expanded={isOpen} onClick={() => setOpen(isOpen ? null : item.id)}>
                  <span>{item.question}</span>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9.5 6 6 6-6" /></svg>
                </button>
                {isOpen && (
                  <div className="zke-faq-a">
                    {item.answer}
                    <div className="zke-cta" style={{ marginTop: 12 }}>
                      <p>{en ? 'If you need an answer tailored to your child, ask it in a free consultation.' : 'اگر پاسخ دقیق‌تری متناسب با فرزند خودتان لازم دارید، همین پرسش را در مشاوره مطرح کنید.'}</p>
                      <button type="button" className="zke-pillbtn" onClick={onConsult}>{en ? 'Ask in consultation' : 'پرسش در مشاوره'}</button>
                    </div>
                  </div>
                )}
              </section>
            );
          })}
        </div>
      ) : (
        <div className="zke-empty">
          <ChatIcon size={26} />
          <p>{en ? 'No answer was found.' : 'پاسخی پیدا نشد.'}</p>
          <small>{en ? 'You can ask your question directly through a free consultation.' : 'می‌توانید سؤال خود را از طریق مشاورهٔ رایگان بپرسید؛ تیم همراهی زینالیکید پاسخ می‌دهد.'}</small>
          <button type="button" className="zke-pillbtn" onClick={onConsult}>{en ? 'Free consultation' : 'مشاورهٔ رایگان'}</button>
        </div>
      )}
    </div>
  );
}
