/**
 * TrustBoxNew — باکس جملات اعتمادساز جدید (Random Trust Sentences)
 *
 * ویژگی‌ها:
 * - نمایش تصادفی جملات با اولویت‌بندی
 * - انیمیشن فید نرم هر ۸ ثانیه
 * - هماهنگ با دیزاین‌های مختلف (Wellness, KidLearn, NavyStack, Classic)
 * - بدون نشانگر تعداد و غیرقابل سوایپ
 * - اندازه فونت پویا بر اساس طول کاراکتر
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { getTrustTitleSize, getTrustDescSize } from '../utils/trustFontSize';

interface TrustSentence {
  id: string;
  title: string;
  description: string;
  priority: number;
  tabs: string[];
  active: boolean;
}

interface TrustBoxNewProps {
  sentences: TrustSentence[];
  interval: number;
  T: any;
  design?: string;
}

export default function TrustBoxNew({ sentences, interval, T, design }: TrustBoxNewProps) {
  const [current, setCurrent] = useState<TrustSentence | null>(null);
  const [visible, setVisible] = useState(true);
  const [isInitialized, setIsInitialized] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const previousIds = useRef<string[]>([]);

  // فیلتر جملات فعال
  const activeSentences = sentences.filter(s => s.active !== false);

  // اولویت‌بندی
  const prioritized = [...activeSentences].sort((a, b) => b.priority - a.priority);

  // انتخاب تصادفی با وزن اولویت و جلوگیری از تکرار
  const getRandomSentence = useCallback((excludeId?: string): TrustSentence | null => {
    if (prioritized.length === 0) return null;

    let available = excludeId ? prioritized.filter(s => s.id !== excludeId) : [...prioritized];
    if (available.length === 0) available = [...prioritized];

    // ریست حافظه تکرار
    if (previousIds.current.length >= Math.min(prioritized.length, 5)) {
      previousIds.current = [];
    }

    // اولویت جملات دیده نشده
    const unseen = available.filter(s => !previousIds.current.includes(s.id));
    const pool = unseen.length > 0 ? unseen : available;

    // انتخاب با وزن اولویت
    const totalPriority = pool.reduce((sum, s) => sum + s.priority, 0);
    let random = Math.random() * totalPriority;
    let selected = pool[0];
    for (const s of pool) {
      random -= s.priority;
      if (random <= 0) {
        selected = s;
        break;
      }
    }

    previousIds.current.push(selected.id);
    return selected;
  }, [prioritized]);

  // تغییر جمله
  const changeSentence = useCallback(() => {
    setVisible(false);
    setTimeout(() => {
      const next = getRandomSentence(current?.id);
      if (next) {
        setCurrent(next);
        setVisible(true);
      } else {
        setVisible(true); // fallback
      }
    }, 350);
  }, [current?.id, getRandomSentence]);

  // مقداردهی اولیه و تایمر
  useEffect(() => {
    if (activeSentences.length === 0 || isInitialized) return;

    const initial = getRandomSentence();
    if (initial) {
      setCurrent(initial);
      setIsInitialized(true);
    }
  }, [activeSentences.length, getRandomSentence, isInitialized]);

  useEffect(() => {
    if (!current || activeSentences.length === 0) return;

    timerRef.current = setInterval(changeSentence, interval * 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [current?.id, activeSentences.length, interval, changeSentence]);

  if (!current || activeSentences.length === 0) return null;

  // اندازه فونت پویا — استفاده از توابع کمکی
  const titleSize = getTrustTitleSize(current.title);
  const descSize = getTrustDescSize(current.description);

  // تشخیص دیزاین
  const isNavyStack = design === 'navystack';
  const isClassic = design === 'classic';
  const isKidLearn = design === 'kidlearn';

  const boxBg = isNavyStack ? '#111638' : (isClassic ? T.card : '#FFFFFF');
  const boxBorder = isNavyStack ? '1px solid #1E2756' : `1px solid ${T.brd || '#DFE1E5'}`;
  const boxShadow = isNavyStack
    ? '0 4px 12px rgba(0,0,0,0.2)'
    : '0 4px 20px rgba(0,0,0,0.06)';
  const boxRadius = isNavyStack ? 8 : 16;
  const titleColor = isNavyStack ? '#E2E8F0' : T.ttl || T.txt || '#1F2937';
  const descColor = isNavyStack ? '#94A3B8' : T.mut || '#6B7280';
  const borderSubtle = isNavyStack ? 'rgba(0,212,255,0.08)' : 'rgba(122,18,212,0.04)';

  return (
    <div
      className="trust-box-new"
      style={{
        background: boxBg,
        border: boxBorder,
        borderRadius: boxRadius,
        boxShadow: boxShadow,
        height: 200,
        minHeight: 200,
        maxHeight: 200,
        width: '100%',
        maxWidth: 800,
        margin: '0 auto',
        padding: '1rem 1.5rem',
        display: 'flex',
        flexDirection: 'column' as const,
        justifyContent: 'center',
        alignItems: 'center',
        textAlign: 'center' as const,
        overflow: 'hidden',
        position: 'relative' as const,
        transition: 'background 0.3s ease, border-color 0.3s ease, box-shadow 0.3s ease',
      }}
    >
      {/* نوار تزئینی بالا */}
      {!isNavyStack && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 4,
            background: isKidLearn
              ? 'linear-gradient(90deg, #EF4444, #3B82F6)'
              : 'linear-gradient(90deg, #7A12D4, #DF1A6F)',
            borderRadius: `${boxRadius}px ${boxRadius}px 0 0`,
          }}
        />
      )}
      {isNavyStack && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: 3,
            background: 'linear-gradient(90deg, #00D4FF, #7C3AED)',
            borderRadius: `${boxRadius}px ${boxRadius}px 0 0`,
          }}
        />
      )}

      {/* محتوای متحرک */}
      <div
        style={{
          opacity: visible ? 1 : 0,
          transform: visible ? 'translateY(0)' : 'translateY(8px)',
          transition: 'opacity 0.35s ease, transform 0.35s ease',
          width: '100%',
          maxWidth: '90%',
        }}
      >
        {/* عنوان */}
        <h3
          style={{
            fontSize: `${titleSize}px`,
            fontWeight: 700,
            color: titleColor,
            margin: '0 0 8px',
            lineHeight: 1.4,
          }}
        >
          {current.title}
        </h3>

        {/* توضیحات */}
        <p
          style={{
            fontSize: `${descSize}px`,
            color: descColor,
            lineHeight: 1.6,
            fontWeight: 400,
            margin: 0,
            maxWidth: '100%',
          }}
        >
          {current.description}
        </p>
      </div>
    </div>
  );
}
