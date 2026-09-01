// highlightVectors — کتابخانهٔ کاورهای برداریِ هایلایت‌های صفحهٔ اول
// ۱۵ طرح کاملاً هندسی، بدون هیچ متنی (نه فارسی، نه انگلیسی)؛ برای هر هایلایت (حتی تازه‌ساخته‌شده) قابل انتخاب است.
// ارزش پوشش در تنظیمات به شکل «vec:<id>» ذخیره می‌شود و همان‌جا در CoverImage رندر می‌گردد.
import React from 'react';

type Vec = { id: string; name: string; bg: string; node: React.ReactNode };

const g = (id: string, from: string, to: string) => (
  <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stopColor={from} />
    <stop offset="1" stopColor={to} />
  </linearGradient>
);

export const HIGHLIGHT_VECTORS: Vec[] = [
  { id: 'star', name: 'ستاره', bg: 'url(#zv-star-bg)', node: (<>{g('zv-star-bg', '#7C3AED', '#4C1D95')}<circle cx="78" cy="22" r="2.5" fill="#FDE68A" /><circle cx="20" cy="74" r="2" fill="#EDE9FE" opacity=".8" /><path d="M50 20l8.9 18.1 20 2.9-14.5 14 3.4 20L50 65.4 32.2 75l3.4-20-14.5-14 20-2.9z" fill="url(#zv-star-f)" />{g('zv-star-f', '#FDE68A', '#F59E0B')}</>) },
  { id: 'heart', name: 'قلب', bg: 'url(#zv-heart-bg)', node: (<>{g('zv-heart-bg', '#FDA4AF', '#F43F5E')}<path d="M50 74C30 60 18 48 18 36a13 13 0 0 1 26-6 13 13 0 0 1 26 6c0 12-12 24-20 38z" fill="#FFF1F2" /><circle cx="42" cy="38" r="4" fill="#FDA4AF" opacity=".7" /></>) },
  { id: 'balloon', name: 'بادکنک', bg: 'url(#zv-bal-bg)', node: (<>{g('zv-bal-bg', '#38BDF8', '#0369A1')}<path d="M36 20a14 16 0 1 1 0 32 14 16 0 0 1 0-32z" fill="#FDE68A" /><path d="M36 52l-3 6h6z" fill="#F59E0B" /><path d="M36 58c4 6-6 10 0 18" stroke="#E2E8F0" strokeWidth="1.6" fill="none" /><path d="M64 30a12 14 0 1 1 0 28 12 14 0 0 1 0-28z" fill="#F9A8D4" /><path d="M64 58l-2.6 5h5.2z" fill="#EC4899" /><path d="M64 63c3 5-5 8 0 15" stroke="#E2E8F0" strokeWidth="1.4" fill="none" /></>) },
  { id: 'teddy', name: 'خرس', bg: 'url(#zv-ted-bg)', node: (<>{g('zv-ted-bg', '#FCD34D', '#D97706')}<circle cx="30" cy="30" r="11" fill="#92400E" /><circle cx="70" cy="30" r="11" fill="#92400E" /><circle cx="30" cy="30" r="5.5" fill="#FBBF24" /><circle cx="70" cy="30" r="5.5" fill="#FBBF24" /><circle cx="50" cy="54" r="26" fill="#B45309" /><ellipse cx="50" cy="64" rx="12" ry="9" fill="#FDE68A" /><circle cx="41" cy="48" r="3.4" fill="#451A03" /><circle cx="59" cy="48" r="3.4" fill="#451A03" /><ellipse cx="50" cy="60" rx="4" ry="3" fill="#451A03" /><path d="M50 63v3M44 70c2 2 10 2 12 0" stroke="#451A03" strokeWidth="1.8" fill="none" strokeLinecap="round" /></>) },
  { id: 'blocks', name: 'مکعب', bg: 'url(#zv-blk-bg)', node: (<>{g('zv-blk-bg', '#6EE7B7', '#047857')}<rect x="14" y="52" width="26" height="26" rx="6" fill="#F9FAFB" /><circle cx="27" cy="65" r="7" fill="#34D399" /><rect x="46" y="52" width="26" height="26" rx="6" fill="#FBBF24" /><path d="M59 58l7 12H52z" fill="#92400E" /><rect x="30" y="22" width="26" height="26" rx="6" fill="#F87171" /><rect x="38" y="30" width="10" height="10" rx="2.5" fill="#7F1D1D" /></>) },
  { id: 'crayon', name: 'مداد‌رنگی', bg: 'url(#zv-cra-bg)', node: (<>{g('zv-cra-bg', '#FDBA74', '#EA580C')}<g transform="rotate(-40 50 50)"><path d="M42 20h16v8l6 8-6 8v30H42V44l-6-8 6-8z" fill="#FEF3C7" /><path d="M42 28l6 8-6 8z" fill="#FB923C" /><rect x="42" y="40" width="16" height="7" fill="#F97316" /><rect x="42" y="58" width="16" height="7" fill="#F97316" /><path d="M64 28l6 8-6 8z" fill="#0EA5E9" /><rect x="64" y="40" width="14" height="7" fill="#F97316" transform="translate(-2 0)" /><rect x="64" y="20" width="14" height="8" rx="2" fill="#38BDF8" /><rect x="64" y="58" width="14" height="8" rx="2" fill="#38BDF8" /></g></>) },
  { id: 'book', name: 'کتاب', bg: 'url(#zv-bok-bg)', node: (<>{g('zv-bok-bg', '#93C5FD', '#1D4ED8')}<path d="M50 30c-8-6-18-6-26-3v42c8-3 18-3 26 3z" fill="#EFF6FF" /><path d="M50 30c8-6 18-6 26-3v42c-8-3-18-3-26 3z" fill="#DBEAFE" /><path d="M50 30v42" stroke="#1E40AF" strokeWidth="2.5" /><path d="M32 40h10M32 48h10M58 40h10M58 48h10" stroke="#93C5FD" strokeWidth="2" strokeLinecap="round" /></>) },
  { id: 'leaf', name: 'برگ', bg: 'url(#zv-lef-bg)', node: (<>{g('zv-lef-bg', '#86EFAC', '#166534')}<path d="M62 22C40 26 28 40 28 58c0 10 6 18 6 18s2-16 12-24c8-6 14-8 16-30z" fill="#DCFCE7" /><path d="M62 22c8 18 2 40-14 50-10 6-14 4-14 4s14-6 20-18c5-10 6-22 8-36z" fill="#4ADE80" /><path d="M34 76c10-26 22-40 34-48" stroke="#14532D" strokeWidth="2.2" fill="none" strokeLinecap="round" /></>) },
  { id: 'moon', name: 'ماه', bg: 'url(#zv-moo-bg)', node: (<>{g('zv-moo-bg', '#312E81', '#0F172A')}<path d="M62 22a30 30 0 1 0 16 46A26 26 0 0 1 62 22z" fill="#FDE68A" /><path d="M26 28l2.2 4.6L33 35l-4.8 2.4L26 42l-2.2-4.6L19 35l4.8-2.4z" fill="#C7D2FE" /><circle cx="42" cy="18" r="1.8" fill="#E0E7FF" /><circle cx="56" cy="78" r="1.6" fill="#E0E7FF" opacity=".8" /></>) },
  { id: 'rocket', name: 'موشک', bg: 'url(#zv-rok-bg)', node: (<>{g('zv-rok-bg', '#818CF8', '#312E81')}<path d="M50 16c10 8 14 20 14 32l-6 12H42l-6-12c0-12 4-24 14-32z" fill="#F8FAFC" /><circle cx="50" cy="40" r="6.5" fill="#38BDF8" /><path d="M36 48l-10 14 12-4zM64 48l10 14-12-4z" fill="#F87171" /><path d="M44 62c2 8 4 12 6 18 2-6 4-10 6-18z" fill="#FBBF24" /></>) },
  { id: 'sun', name: 'خورشید', bg: 'url(#zv-sun-bg)', node: (<>{g('zv-sun-bg', '#FEF08A', '#F59E0B')}<circle cx="50" cy="50" r="18" fill="#FFFBEB" /><g stroke="#FFFBEB" strokeWidth="4.5" strokeLinecap="round"><path d="M50 20v-8M50 88v-8M20 50h-8M88 50h-8M29 29l-6-6M77 77l-6 6M71 29l6-6M23 77l6 6" /></g><circle cx="50" cy="50" r="8" fill="#FDE68A" /></>) },
  { id: 'cloud', name: 'ابر', bg: 'url(#zv-clo-bg)', node: (<>{g('zv-clo-bg', '#BAE6FD', '#0284C7')}<path d="M30 52a12 12 0 0 1 2-23 16 16 0 0 1 31 4 10 10 0 0 1-2 19z" fill="#F0F9FF" /><g stroke="#38BDF8" strokeWidth="3.4" strokeLinecap="round"><path d="M36 60l-4 10M50 60l-4 10M64 60l-4 10" /></g></>) },
  { id: 'bike', name: 'دوچرخه', bg: 'url(#zv-bik-bg)', node: (<>{g('zv-bik-bg', '#FDBA74', '#9A3412')}<circle cx="27" cy="62" r="15" stroke="#FFF7ED" strokeWidth="4" fill="none" /><circle cx="73" cy="62" r="15" stroke="#FFF7ED" strokeWidth="4" fill="none" /><path d="M27 62l14-22h14l6 22M50 40l10 22M41 40l6 22" stroke="#FDBA74" strokeWidth="3.4" fill="none" strokeLinejoin="round" /><path d="M55 38h10M58 32l6 6" stroke="#FFF7ED" strokeWidth="3" strokeLinecap="round" fill="none" /></>) },
  { id: 'kite', name: 'بادبزنک', bg: 'url(#zv-kit-bg)', node: (<>{g('zv-kit-bg', '#5EEAD4', '#0F766E')}<path d="M52 16L78 44 52 72 30 44z" fill="#FDE68A" /><path d="M52 16v56M30 44h48" stroke="#F97316" strokeWidth="2.6" /><path d="M52 72c-6 8 6 10 0 20" stroke="#E2E8F0" strokeWidth="2.2" fill="none" strokeLinecap="round" /><path d="M49 80l6-3M52 86l6 4" stroke="#F97316" strokeWidth="2.4" strokeLinecap="round" /></>) },
  { id: 'paw', name: 'ردِ پنجه', bg: 'url(#zv-paw-bg)', node: (<>{g('zv-paw-bg', '#FDE68A', '#B45309')}<ellipse cx="50" cy="62" rx="17" ry="13" fill="#FFFBEB" /><circle cx="26" cy="42" r="7" fill="#FFFBEB" /><circle cx="42" cy="30" r="7.5" fill="#FFFBEB" /><circle cx="60" cy="30" r="7.5" fill="#FFFBEB" /><circle cx="75" cy="43" r="7" fill="#FFFBEB" /></>) },
];

const VECTOR_BY_ID: Record<string, Vec> = {};
for (const v of HIGHLIGHT_VECTORS) VECTOR_BY_ID[v.id] = v;

export function isVectorCoverUrl(u: unknown): boolean {
  return /^vec:[a-z0-9][a-z0-9-]*$/i.test(String(u || '').trim());
}
export function vectorIdFrom(u: unknown): string {
  return isVectorCoverUrl(u) ? String(u).trim().slice(4).toLowerCase() : '';
}

/** کاور برداری — همه‌جا تمام‌کادر (slice) تا مثل عکس، دایره/مربع را پر کند */
export default function ZkVectorCover({ id, style }: { id: string; style?: React.CSSProperties }) {
  const v = VECTOR_BY_ID[String(id || '').toLowerCase()];
  return (
    <div style={{ width: '100%', height: '100%', overflow: 'hidden', background: '#EDE9FE', position: 'relative', ...style }}>
      {v ? (
        <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" style={{ display: 'block' }} aria-hidden="true" focusable="false">
          <rect width="100" height="100" fill={v.bg} />
          {v.node}
        </svg>
      ) : (
        <svg viewBox="0 0 100 100" width="100%" height="100%" style={{ display: 'block' }} aria-hidden="true" focusable="false">
          <defs><linearGradient id="zv-fallback" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#A78BFA" /><stop offset="1" stopColor="#4C1D95" /></linearGradient></defs>
          <rect width="100" height="100" fill="url(#zv-fallback)" />
          <path d="M50 20l8.9 18.1 20 2.9-14.5 14 3.4 20L50 65.4 32.2 75l3.4-20-14.5-14 20-2.9z" fill="#FDE68A" />
        </svg>
      )}
    </div>
  );
}

/** کاشیِ کوچک انتخاب‌گر (پنل ادمین) — همان طرح، تمام‌کادر */
export function ZkVectorTile({ id, size = 44, selected, onClick, title }: { id: string; size?: number; selected?: boolean; onClick?: () => void; title?: string }) {
  const v = VECTOR_BY_ID[String(id || '').toLowerCase()];
  return (
    <button type="button" title={title || v?.name || id} onClick={onClick}
      style={{ width: size, height: size, borderRadius: Math.round(size * 0.28), overflow: 'hidden', padding: 0, cursor: 'pointer', display: 'block', border: selected ? '2px solid #7C3AED' : '1px solid rgba(0,0,0,.12)', boxShadow: selected ? '0 0 0 2px rgba(124,58,237,.25)' : 'none', background: '#EDE9FE' }}>
      <svg viewBox="0 0 100 100" width={size} height={size} preserveAspectRatio="xMidYMid slice" style={{ display: 'block' }} aria-hidden="true" focusable="false">
        {v ? (<><rect width="100" height="100" fill={v.bg} />{v.node}</>) : (<><rect width="100" height="100" fill="#A78BFA" /><path d="M50 20l8.9 18.1 20 2.9-14.5 14 3.4 20L50 65.4 32.2 75l3.4-20-14.5-14 20-2.9z" fill="#FDE68A" /></>)}
      </svg>
    </button>
  );
}
