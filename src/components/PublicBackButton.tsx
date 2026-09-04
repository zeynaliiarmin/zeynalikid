import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
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
 * It deliberately lives in normal document flow. Its parent decides the title row;
 * the inherited `dir` puts it on the right in Persian and on the left in English.
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
  const text = label || (lang === 'en' ? 'Back' : 'بازگشت');
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
      aria-label={text}
      title={text}
      onClick={(event) => { event.stopPropagation(); goBack(); }}
    >
      <span className="zk-public-back__icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" focusable="false"><path d="M19 12H5" /><path d="m12 5-7 7 7 7" /></svg>
      </span>
      <span>{text}</span>
    </button>
  );
}
