// تشخیص خودکار مدت‌زمان واقعی فایل صوتی/تصویری مستقیم (بدون ذخیره در دیتابیس).
// برای ویدیوهای iframe (یوتیوب/آپارات) مرورگر امکان خواندن مدت را ندارد → null برمی‌گردد
// و از مدت ثبت‌شدهٔ ادمین (فیلد minutes) استفاده می‌شود.
import { useEffect, useState } from 'react';
import { extractDirectMediaUrl } from '../utils/mediaInput';

export default function useMediaDuration(item: any): number | null {
  const [seconds, setSeconds] = useState<number | null>(null);
  const type = item?.type;
  const code = item?.manualCode || item?.url || '';
  useEffect(() => {
    let alive = true;
    setSeconds(null);
    if (type !== 'audio' && type !== 'video') return;
    const kind = type === 'audio' ? 'audio' : 'video';
    const url = extractDirectMediaUrl(code, kind);
    if (!url) return;
    // فقط فایل‌های مستقیم رسانه‌ای (نه صفحهٔ iframe یوتیوب/آپارات) قابل تشخیص هستند
    const isDirectMedia = /\.(mp3|wav|ogg|oga|m4a|aac|opus|mp4|webm|ogv|mov|m4v)([?#].*)?$/i.test(url)
      || /<\s*(audio|video|source)\b/i.test(code);
    if (!isDirectMedia) return;
    const el = document.createElement(kind) as HTMLMediaElement;
    el.preload = 'metadata';
    const onMeta = () => {
      if (alive && Number.isFinite(el.duration) && el.duration > 0) setSeconds(el.duration);
    };
    el.addEventListener('loadedmetadata', onMeta);
    el.addEventListener('error', () => {});
    el.src = url;
    return () => {
      alive = false;
      el.removeAttribute('src');
      try { el.load(); } catch { /* ignore */ }
    };
  }, [type, code]);
  return seconds;
}
