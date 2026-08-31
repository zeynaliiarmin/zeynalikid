// CountryCodePicker — منوی انتخاب کد کشور (پاپ‌آپ)
// یک پیاده‌سازی مشترک که هم در فرم مشاوره و هم در پنل کاربر / صفحهٔ پیگیری استفاده می‌شود
// تا ظاهر و رفتار هر دو دقیقاً یکسان باشد (کپی‌شده از همان کامپوننت فرم مشاوره).
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { getCountryFlag } from '../utils/phone';

type Lang = 'fa' | 'en';

function labelCountryFn(c: any, l: Lang) { return `${getCountryFlag(c)} ${l === 'en' ? (c.nameEn || c.name) : c.name} ${c.code}`; }
function shortCountryFn(c: any) { return `${getCountryFlag(c)} ${c.code}`; }

function Popup({ open, onClose, trigger, children, width, T }: any) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [place, setPlace] = useState<'top' | 'bottom'>('bottom');
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose() };
    const calc = () => { const r = ref.current?.getBoundingClientRect(); if (r) { const below = window.innerHeight - r.bottom; setPlace(below < window.innerHeight * .38 && r.top > below ? 'top' : 'bottom') } };
    calc(); document.addEventListener('mousedown', h); window.addEventListener('resize', calc); window.addEventListener('scroll', calc, true);
    return () => { document.removeEventListener('mousedown', h); window.removeEventListener('resize', calc); window.removeEventListener('scroll', calc, true) };
  }, [open, onClose]);
  return <div ref={ref} style={{ position: 'relative' }}>{trigger}{open && <div style={{ position: 'absolute', top: place === 'bottom' ? 'calc(100% + 6px)' : 'auto', bottom: place === 'top' ? 'calc(100% + 6px)' : 'auto', left: 0, right: 'auto', zIndex: 3000, width: width || 260, maxWidth: 'min(33vw, calc(100vw - 34px))', minWidth: 180, maxHeight: '40vh', overflowY: 'auto', overflowX: 'hidden', background: T.pop, border: `1px solid ${T.brd}`, borderRadius: 16, boxShadow: '0 18px 48px rgba(0,0,0,.16)', padding: 8, animation: 'fadeSlide .3s ease both' }}>{children}</div>}</div>;
}

export const CountryCodePopup = memo(function CountryCodePopup({ value, onChange, small = true, T, countries, lang, flat = false }: any) {
  const [open, setOpen] = useState(false);
  const choose = useCallback((v: string) => { onChange(v); setOpen(false); }, [onChange]);
  return <Popup open={open} onClose={() => setOpen(false)} T={T} width={'33vw'} trigger={<button type="button" onClick={() => setOpen(v => !v)} style={{ height: flat ? 40 : 44, minWidth: flat ? 'auto' : (small ? 68 : 120), padding: flat ? '0 2px' : '0 8px', background: 'transparent', border: 0, boxShadow: 'none', borderRadius: 10, color: T.acc, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit', fontWeight: 700, whiteSpace: 'nowrap', order: -1 }}>{shortCountryFn((countries || []).find((x: any) => x.code === value) || (countries || [])[0])}</button>}>{(countries || []).map((c: any) => <button key={c.id || c.code} onClick={() => choose(c.code)} style={{ display: 'block', width: '100%', padding: '9px 10px', background: value === c.code ? T.soft : 'transparent', border: 0, borderRadius: 9, color: value === c.code ? T.acc : T.txt, cursor: 'pointer', textAlign: 'right', fontFamily: 'inherit', fontSize: 13 }}>{labelCountryFn(c, lang as Lang)}</button>)}</Popup>;
});

export default CountryCodePopup;
