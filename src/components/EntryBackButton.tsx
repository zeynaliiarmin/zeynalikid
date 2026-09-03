import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

type EntryBackButtonProps = { lang: 'fa' | 'en' };

/** In-flow public-page back action — never floating or overlaid on page content. */
export default function EntryBackButton({ lang }: EntryBackButtonProps) {
  const navigate = useNavigate();
  const label = lang === 'en' ? 'Back' : 'بازگشت';
  const goBack = useCallback(() => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/');
  }, [navigate]);

  return (
    <div className="zp-entry-backrow">
      <button type="button" className="zp-entry-back" data-testid="public-entry-back" aria-label={label} title={label} onClick={goBack}>
        <span className="zp-entry-back-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false"><path d="M19 12H5" /><path d="m12 5-7 7 7 7" /></svg>
        </span>
        <span>{label}</span>
      </button>
    </div>
  );
}
