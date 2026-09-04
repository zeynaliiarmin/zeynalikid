import { type CSSProperties, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppContext } from '../app/AppContext';
import './public-back-button.css';

type PublicBackButtonProps = {
  lang: 'fa' | 'en';
  /** Use this for an in-page sheet or a flow that has a deliberate destination. */
  onBack?: () => void;
  /** Safe route when the visitor opened this public page directly. */
  fallback?: string;
  className?: string;
  testId?: string;
  label?: string;
};

/**
 * Shared option-2 return control for public UI.
 *
 * It remains in normal document flow. In a shared title row, the title stays at
 * the inline start while this control occupies the opposite edge: left in Persian
 * and right in English. The label stays nearest to the title; the round arrow is
 * on the outer edge and points outward. Its colours use the active public palette.
 */
export default function PublicBackButton({
  lang,
  onBack,
  fallback = '/',
  className = '',
  testId = 'public-back',
  label,
}: PublicBackButtonProps) {
  const navigate = useNavigate();
  const { T } = useAppContext();
  const text = label || (lang === 'en' ? 'Back' : 'بازگشت');
  const visualTokens: Record<string, string> = {};
  if (T?.acc) visualTokens['--zk-public-back-accent'] = String(T.acc);
  if (T?.accText) visualTokens['--zk-public-back-text'] = String(T.accText);
  if (T?.card) visualTokens['--zk-public-back-surface'] = String(T.card);
  if (T?.brd) visualTokens['--zk-public-back-border'] = String(T.brd);
  if (T?.btnfg) visualTokens['--zk-public-back-on-accent'] = String(T.btnfg);
  const goBack = useCallback(() => {
    if (onBack) {
      onBack();
      return;
    }
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate(fallback);
  }, [fallback, navigate, onBack]);

  return (
    <button
      type="button"
      className={`zk-public-back ${className}`.trim()}
      data-testid={testId}
      data-direction={lang === 'fa' ? 'rtl' : 'ltr'}
      dir={lang === 'fa' ? 'rtl' : 'ltr'}
      aria-label={text}
      title={text}
      style={visualTokens as CSSProperties}
      onClick={(event) => { event.stopPropagation(); goBack(); }}
    >
      <span className="zk-public-back__label">{text}</span>
      <span className="zk-public-back__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M5 12h14" /><path d="m12 5 7 7-7 7" /></svg>
      </span>
    </button>
  );
}
