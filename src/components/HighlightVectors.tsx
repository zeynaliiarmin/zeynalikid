/* آیکون‌های برداری کاور هایلایت — طراحی‌شده با همان زبان خطی سایت (stroke، بدون هیچ متن/حرفی).
   هر بردار برای هر هایلایتی (موجود یا ساخته‌شده در آینده) قابل انتخاب است. */
export type HlVector = { id: string; label: string; paths: string[] };

export const HIGHLIGHT_VECTORS: HlVector[] = [
  { id: 'heart', label: 'رضایت', paths: ['M12 20.2S4.6 15.5 2.9 11.3C1.6 8.1 3.7 5 6.7 5c2 0 3.5 1.1 4.3 2.5l1 1.7 1-1.7C13.8 6.1 15.3 5 17.3 5c3 0 5.1 3.1 3.8 6.3-1.7 4.2-9.1 8.9-9.1 8.9z'] },
  { id: 'bulb', label: 'دانستنی', paths: ['M12 3.2a6 6 0 0 1 3.7 10.7c-.8.6-1.2 1.5-1.2 2.4h-5c0-.9-.4-1.8-1.2-2.4A6 6 0 0 1 12 3.2z', 'M9.8 19.4h4.4M10.6 21.6h2.8'] },
  { id: 'apple', label: 'تغذیه', paths: ['M12 8.4C10.9 6.4 7.9 5.7 6.2 7.3 4.2 9.1 4.5 13.3 6.5 16.6 7.9 18.9 9.5 20.6 11.1 20.6c.4 0 .6-.2 .9-.2s.5.2.9.2c1.6 0 3.2-1.7 4.6-4 2-3.3 2.3-7.5.3-9.3-1.7-1.6-4.7-.9-5.8 1.1z', 'M12 8.4c0-2.1 1.1-3.6 3.2-4.2-.2 2.2-1.2 3.7-3.2 4.2z'] },
  { id: 'height', label: 'رشد قد', paths: ['M12 4.2v11.4m0 0-4.4-4.4M12 15.6l4.4-4.4', 'M5 20.6h14M16.8 4.8l3.4 3.4-3.4 3.4'] },
  { id: 'plate', label: 'بی‌اشتهایی', paths: ['M11.5 5.6a5.9 5.9 0 1 0 0 11.8 5.9 5.9 0 0 0 0-11.8z', 'M11.5 8.6a2.9 2.9 0 1 0 0 5.8 2.9 2.9 0 0 0 0-5.8z', 'M3.6 4.4v3.9a2 2 0 0 0 4 0V4.4M5.6 10.3v9.3', 'M20 4.4c-1.5 1.3-2.2 3.6-2.2 5.9 0 1.4.7 2.2 1.6 2.5v6.8'] },
  { id: 'bell', label: 'مهم', paths: ['M18.2 15.4V10.6a6.2 6.2 0 0 0-12.4 0v4.8L3.8 18.4h16.4l-2-3z', 'M10.4 21.2a2.2 2.2 0 0 0 3.2 0'] },
  { id: 'shield', label: 'مجوزها', paths: ['M12 3.2 19 6v5.6c0 4.4-2.9 7.2-7 8.8-4.1-1.6-7-4.4-7-8.8V6l7-2.8z', 'M9 11.8l2.3 2.3 4.2-4.4'] },
  { id: 'send', label: 'ارسالی‌ها', paths: ['M21.4 2.6 2.6 9.8l7.5 3.1 3.1 7.5 8.2-17.8z', 'M10.1 12.9 21.4 2.6'] },
  { id: 'star', label: 'رضایت‌ها', paths: ['M12 3.8l2.4 4.9 5.4.8-3.9 3.8.9 5.4-4.8-2.5-4.8 2.5.9-5.4-3.9-3.8 5.4-.8L12 3.8z'] },
  { id: 'wallet', label: 'هزینه‌ها', paths: ['M3.6 7.4v9.6a2.2 2.2 0 0 0 2.2 2.2h12.4a2.2 2.2 0 0 0 2.2-2.2v-6.4a2.2 2.2 0 0 0-2.2-2.2H5.8a2.2 2.2 0 0 1-2.2-2.2c0-.5.3-.9.6-1.2l8.9-.1c1 0 1.8.8 1.8 1.8v1.1', 'M15.4 13.2h.02'] },
  { id: 'box', label: 'محصولات ما', paths: ['M12 3.2l8 4.4v9L12 21l-8-4.4v-9l8-4.4z', 'M4 7.6l8 4.4 8-4.4M12 12v9'] },
  { id: 'play', label: 'رضایت‌های تصویری', paths: ['M4.4 5h15.2a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H4.4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2z', 'M10.2 9.1v5.8l4.8-2.9-4.8-2.9z'] },
  { id: 'deposit', label: 'واریزی', paths: ['M3.2 8.2c0-1.5 1.2-2.6 2.6-2.6h12.4c1.5 0 2.6 1.2 2.6 2.6v7.6c0 1.5-1.2 2.6-2.6 2.6H5.8a2.6 2.6 0 0 1-2.6-2.6V8.2z', 'M12 10.4v5.2m0 0-2-2m2 2 2-2'] },
  { id: 'contrast', label: 'نتایج قبل و بعد', paths: ['M12 3.4a8.6 8.6 0 1 0 0 17.2 8.6 8.6 0 0 0 0-17.2z', 'M12 3.4v17.2', 'M14.6 8h2.6M14 11.2h3.6M14.6 14.4h2.2'] },
  { id: 'qa', label: 'سوال‌های شما', paths: ['M12 3.4C6.7 3.4 2.4 6.7 2.4 10.8c0 2.2 1.2 4.2 3 5.5v3.9l3.4-1.8c1 .2 2 .3 3.2.3 5.3 0 9.6-3.3 9.6-7.9S17.3 3.4 12 3.4z', 'M8.2 10.8h.02M12 10.8h.02M15.8 10.8h.02'] },
];

export function highlightVectorById(id?: string): HlVector | undefined {
  return id ? HIGHLIGHT_VECTORS.find((v) => v.id === id) : undefined;
}

export function HighlightVectorGlyph({ id, size = 26, color, strokeWidth = 1.7 }: { id?: string; size?: number; color?: string; strokeWidth?: number }) {
  const v = highlightVectorById(id);
  if (!v) return null;
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color || 'currentColor'} strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {v.paths.map((d, i) => <path key={i} d={d} />)}
    </svg>
  );
}
